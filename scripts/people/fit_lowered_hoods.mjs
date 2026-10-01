// Pose-corrective tailoring for the existing Donitz lowered hood. No cloth
// simulation at runtime: a folded bind shape plus one fitted bend target.
// The packer applies this automatically. For an existing, unfitted cast:
//   node scripts/people/fit_lowered_hoods.mjs INPUT.glb OUTPUT.glb [tasks.glb]
// Use the same optional glTF-Transform / meshoptimizer tools as the packer.
import { NodeIO, Accessor } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import * as THREE from '../../lib/three/three.module.js';
import { pathToFileURL } from 'node:url';
import { loweredHoodBlend } from '../../src/world/people/garmentPose.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const smooth = v => { const t = clamp(v, 0, 1); return t * t * (3 - 2 * t); };
const xyz = [], weights = [], joints = [];
const point = new THREE.Vector3();

function skinMatrices(skin) {
  const inverse = skin.getInverseBindMatrices().getArray();
  return skin.listJoints().map((j, i) => new THREE.Matrix4().fromArray(j.getWorldMatrix())
    .multiply(new THREE.Matrix4().fromArray(inverse, i * 16)));
}
function weightedMatrix(prim, vertex, matrices) {
  prim.getAttribute('JOINTS_0').getElement(vertex, joints);
  prim.getAttribute('WEIGHTS_0').getElement(vertex, weights);
  const out = new THREE.Matrix4(); out.elements.fill(0);
  for (let k = 0; k < 4; k++) if (weights[k]) {
    const m = matrices[joints[k]].elements;
    for (let c = 0; c < 16; c++) out.elements[c] += m[c] * weights[k];
  }
  return out;
}
function surface(node, matrices) {
  const meshes = [];
  for (const p of node.getMesh().listPrimitives()) {
    const a = p.getAttribute('POSITION'), pos = new Float32Array(a.getCount() * 3);
    for (let v = 0; v < a.getCount(); v++) {
      a.getElement(v, xyz); point.fromArray(xyz).applyMatrix4(weightedMatrix(p, v, matrices)).toArray(pos, v * 3);
    }
    const g = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(new THREE.BufferAttribute(p.getIndices().getArray(), 1));
    g.computeBoundingSphere();
    meshes.push(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })));
  }
  const ray = new THREE.Raycaster(), origin = new THREE.Vector3(), inward = new THREE.Vector3();
  return {
    hit(p, normal) {
      origin.copy(p).addScaledVector(normal, .45); inward.copy(normal).negate();
      ray.set(origin, inward); ray.near = 0; ray.far = .8;
      return ray.intersectObjects(meshes, false)[0]?.point;
    },
    dispose() { for (const m of meshes) { m.geometry.dispose(); m.material.dispose(); } },
  };
}
function normals(positions, indices) {
  const g = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setIndex(new THREE.BufferAttribute(indices, 1)); g.computeVertexNormals();
  const result = g.attributes.normal.array.slice(); g.dispose(); return result;
}
function setPose(skin, animation, seconds) {
  const bones = new Map(skin.listJoints().map(n => [n.getName(), n]));
  const saved = new Map([...bones.values()].map(n => [n, [n.getTranslation(), n.getRotation(), n.getScale()]]));
  for (const ch of animation.listChannels()) {
    const bone = bones.get(ch.getTargetNode().getName().replace(/^.*__/, ''));
    if (!bone) continue;
    const s = ch.getSampler(), times = s.getInput().getArray(), values = s.getOutput();
    if (s.getInterpolation() !== 'LINEAR' && s.getInterpolation() !== 'STEP') throw new Error('Unsupported task interpolation');
    let i = 0; while (i + 1 < times.length && times[i + 1] <= seconds) i++;
    const j = Math.min(i + 1, times.length - 1), a = [], b = [];
    values.getElement(i, a); values.getElement(j, b);
    const t = s.getInterpolation() === 'STEP' || i === j ? 0 : clamp((seconds - times[i]) / (times[j] - times[i]), 0, 1);
    const path = ch.getTargetPath();
    if (path === 'rotation') bone.setRotation(new THREE.Quaternion().fromArray(a).slerp(new THREE.Quaternion().fromArray(b), t).toArray());
    else if (path === 'translation') bone.setTranslation(a.map((v, k) => v + (b[k] - v) * t));
    else if (path === 'scale') bone.setScale(a.map((v, k) => v + (b[k] - v) * t));
  }
  return () => { for (const [n, [t, q, s]] of saved) n.setTranslation(t).setRotation(q).setScale(s); };
}

export function fitLoweredHoods(doc, tasks) {
  const root = doc.getRoot(), buffer = root.listBuffers()[0], rows = [];
  const vec = (name, array) => doc.createAccessor(name).setType(Accessor.Type.VEC3).setArray(array).setBuffer(buffer);
  for (const node of root.listNodes().filter(n => n.getName().endsWith('.hood_down'))) {
    const person = node.getName().slice(0, -10), skin = node.getSkin();
    if (node.getMesh().listPrimitives().some(p => p.listTargets().length)) throw new Error('Already fitted: ' + person);
    const habit = root.listNodes().find(n => n.getName() === person + '.habit');
    const task = tasks.getRoot().listAnimations().find(a => a.getName() === person + ':tend');
    if (!habit || !task) throw new Error('Missing robe/tend clip: ' + person);
    const identity = new THREE.Matrix4().elements, world = node.getWorldMatrix();
    if (world.some((v, i) => Math.abs(v - identity[i]) > 1e-5)) throw new Error('Expected shared identity mesh space');
    const bones = skin.listJoints(), neck = bones.find(n => n.getName() === 'neck_01');
    const anchor = neck.getWorldMatrix()[13] - .025, restMatrices = skinMatrices(skin);
    const back = new THREE.Vector3(0, 0, -1), restSurface = surface(habit, restMatrices);
    let count = 0, largestRestMove = 0, largestBendMove = 0, projected = 0;
    const parts = [];
    for (const prim of node.getMesh().listPrimitives()) {
      const old = prim.getAttribute('POSITION'), n = old.getCount(), pos = new Float32Array(n * 3), free = [];
      // A lowered hood attaches to the upper back/shoulders. Looking at the
      // visitor must not drag its loose pocket up with the head or neck.
      const wi = new Uint16Array(n * 4), ww = new Float32Array(n * 4), chest = bones.findIndex(b => b.getName() === 'spine_03');
      for (let v = 0; v < n; v++) {
        old.getElement(v, xyz); const original = new THREE.Vector3().fromArray(xyz).applyMatrix4(weightedMatrix(prim, v, restMatrices));
        prim.getAttribute('JOINTS_0').getElement(v, joints); prim.getAttribute('WEIGHTS_0').getElement(v, weights);
        const merge = new Map();
        for (let k = 0; k < 4; k++) {
          const name = bones[joints[k]].getName(), j = /^(head|neck_01)$/.test(name) ? chest : joints[k];
          merge.set(j, (merge.get(j) || 0) + weights[k]);
        }
        const entries = [...merge].sort((a, b) => b[1] - a[1]);
        const total = entries.reduce((s, e) => s + e[1], 0);
        for (let k = 0; k < 4; k++) { wi[v * 4 + k] = entries[k]?.[0] ?? chest; ww[v * 4 + k] = (entries[k]?.[1] || 0) / total; }
        // Roll the high, head-shaped opening into the collar. The pocket
        // below it follows the existing cloth, retaining its textured folds.
        const folded = original.clone();
        if (folded.y > anchor) folded.y = anchor + (folded.y - anchor) * .3;
        const hit = restSurface.hit(folded, back);
        if (hit) {
          const gap = clamp(folded.clone().sub(hit).dot(back), .016, .048);
          folded.copy(hit).addScaledVector(back, gap);
        }
        free[v] = smooth((anchor + .01 - folded.y) / .12);
        largestRestMove = Math.max(largestRestMove, folded.distanceTo(original));
        // New weights have the same bind pose. Express the tailored world
        // point in that shared skin's vertex space, not a guessed mesh scale.
        folded.applyMatrix4(weightedMatrix(prim, v, restMatrices).invert()).toArray(pos, v * 3);
      }
      prim.setAttribute('JOINTS_0', doc.createAccessor(person + ':hoodJoints').setType(Accessor.Type.VEC4).setArray(wi).setBuffer(buffer));
      prim.setAttribute('WEIGHTS_0', doc.createAccessor(person + ':hoodWeights').setType(Accessor.Type.VEC4).setArray(ww).setBuffer(buffer));
      // Solve again after replacing weights so a rest point is exact even
      // if a source export had slightly different inverse-bind roundoff.
      prim.setAttribute('POSITION', vec(person + ':foldedHood', pos));
      prim.setAttribute('NORMAL', vec(person + ':foldedHoodNormal', normals(pos, prim.getIndices().getArray())));
      parts.push({ prim, pos, free }); count += n;
    }
    restSurface.dispose();
    const restore = setPose(skin, task, 3.0), posed = skinMatrices(skin), bendSurface = surface(habit, posed);
    // The robe's normal rotates with the chest, while gravity presses the
    // loose pocket onto the back. Fit against the actual authored deep bend.
    const chestIndex = bones.findIndex(b => b.getName() === 'spine_03');
    const delta = posed[chestIndex].clone().multiply(restMatrices[chestIndex].clone().invert());
    const normal = back.clone().transformDirection(delta);
    for (const { prim, pos, free } of parts) {
      const targetPos = pos.slice();
      for (let v = 0; v < free.length; v++) {
        if (!free[v]) continue;
        const m = weightedMatrix(prim, v, posed), p = new THREE.Vector3().fromArray(pos, v * 3).applyMatrix4(m), hit = bendSurface.hit(p, normal);
        if (!hit) continue;
        const gap = .018 + .012 * (1 - free[v]);
        const target = p.clone().lerp(hit.addScaledVector(normal, gap), free[v]);
        largestBendMove = Math.max(largestBendMove, p.distanceTo(target)); projected++;
        target.applyMatrix4(m.invert()).toArray(targetPos, v * 3);
      }
      const targetNormal = normals(targetPos, prim.getIndices().getArray()), baseNormal = prim.getAttribute('NORMAL').getArray();
      const positions = targetPos.map((v, i) => v - pos[i]), ns = targetNormal.map((v, i) => v - baseNormal[i]);
      prim.addTarget(doc.createPrimitiveTarget('bendDrape').setAttribute('POSITION', vec(person + ':bendDrape', positions)).setAttribute('NORMAL', vec(person + ':bendDrapeNormal', ns)));
    }
    bendSurface.dispose(); restore();
    node.getMesh().setWeights([0]).setExtras({ ...node.getMesh().getExtras(), targetNames: ['bendDrape'], loweredHoodFit: 1 });
    rows.push({ person, vertices: count, fittedBendVertices: projected, largestRestMoveMetres: largestRestMove, largestBendMoveMetres: largestBendMove });
  }
  return rows;
}

// Independent pose samples, using the shipped fitted joint channels and
// actual triangle surfaces. A ray gap is a bounded contact check, not a
// proof of complete garment self-collision or all furniture contacts.
export function auditLoweredHoods(doc, tasks) {
  const rows = [];
  for (const node of doc.getRoot().listNodes().filter(n => n.getName().endsWith('.hood_down'))) {
    const person = node.getName().slice(0, -10), skin = node.getSkin(), bones = skin.listJoints();
    const chest = bones.find(n => n.getName() === 'spine_03'), neck = bones.find(n => n.getName() === 'neck_01');
    const rest = skinMatrices(skin), cm = chest.getWorldMatrix(), restAngle = Math.atan2(cm[6], cm[5]);
    const habit = doc.getRoot().listNodes().find(n => n.getName() === person + '.habit');
    const row = { person, poses: 0, samples: 0, maximumPenetrationMetres: 0, maximumBackGapMetres: 0, tendHeightAboveNeckMetres: 0, worst: null };
    for (const clip of ['standSleeves', 'write', 'kneelPray', 'kneelBow', 'tend']) for (const phase of [0, .3, .7]) {
      const animation = tasks.getRoot().listAnimations().find(a => a.getName() === person + ':' + clip);
      if (!animation) continue;
      const duration = Math.max(...animation.listSamplers().map(s => s.getInput().getArray().at(-1)));
      const restore = setPose(skin, animation, duration * phase), matrices = skinMatrices(skin);
      const axis = chest.getWorldMatrix(), blend = loweredHoodBlend(Math.atan2(axis[6], axis[5]) - restAngle);
      const ci = bones.indexOf(chest), normal = new THREE.Vector3(0, 0, -1).transformDirection(matrices[ci].clone().multiply(rest[ci].clone().invert()));
      const body = surface(habit, matrices); row.poses++;
      for (const prim of node.getMesh().listPrimitives()) {
        const pos = prim.getAttribute('POSITION'), target = prim.listTargets()[0]?.getAttribute('POSITION');
        for (let v = 0; v < pos.getCount(); v += 11) {
          pos.getElement(v, xyz); const bind = new THREE.Vector3().fromArray(xyz);
          if (target) { target.getElement(v, xyz); bind.addScaledVector(new THREE.Vector3().fromArray(xyz), blend); }
          const p = bind.applyMatrix4(weightedMatrix(prim, v, matrices));
          if (clip === 'tend' && phase === .3) row.tendHeightAboveNeckMetres = Math.max(row.tendHeightAboveNeckMetres, p.y - neck.getWorldMatrix()[13]);
          const hit = body.hit(p, normal); if (!hit) continue;
          const gap = p.sub(hit).dot(normal); row.samples++;
          row.maximumBackGapMetres = Math.max(row.maximumBackGapMetres, gap);
          if (-gap > row.maximumPenetrationMetres) { row.maximumPenetrationMetres = -gap; row.worst = { clip, phase, vertex: v }; }
        }
      }
      body.dispose(); restore();
    }
    rows.push(row);
  }
  return rows;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await MeshoptEncoder.ready; await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
  const input = process.argv[2], output = process.argv[3], taskPath = process.argv[4] || 'assets/models/people/tasks.glb';
  if (!input || !output) throw new Error('Supply input and output paths');
  const [doc, tasks] = await Promise.all([io.read(input), io.read(taskPath)]);
  const rows = fitLoweredHoods(doc, tasks);
  // Keep every existing decoded non-hood attribute exact. Do not run a
  // second quantization/normal filter over the already packed cast.
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  await io.write(output, doc); console.log(JSON.stringify({ input, output, rows }, null, 2));
}
