// Normalized per-person GLB derivatives for the Godot phase-1 proof.
//
//   node scripts/migration/normalize_people.mjs [--people alinardo,monk_a,...] [--png]
//
// Input (unchanged): shared/assets/models/people/cast.glb, tasks.glb, cast.json.
// Output: native/assets/characters/<id>/<id>.glb and
//         shared/data/manifests/people_derivatives.json
//
// Godot 4.7.2 refuses the originals: EXT_meshopt_compression and
// KHR_mesh_quantization are *required* extensions it does not implement
// (docs/evidence/phase1/import/direct_import_original_cast_tasks.log).
// The transformation is deliberately minimal and loss-free for skinning:
//   * meshopt buffers are decoded (bit-exact decode of the stored data);
//   * POSITION / NORMAL / TANGENT / TEXCOORD are dequantized to float32
//     (normalized-integer semantics are preserved exactly: v = q / (2^n-1));
//   * JOINTS_0 / WEIGHTS_0 / COLOR_0 keep their original core-legal integer
//     encodings: weights are NOT re-quantized or renormalized;
//   * every other person is removed; the shared 53-joint skin, all nine
//     garment/body parts, both hoods and the hood_down `bendDrape` morph stay;
//   * the person's body-fitted task clips from tasks.glb (`<id>:<clip>`, node
//     targets `<id>__<bone>`) are bound to that person's own joints by name.
//     Keyframes, interpolation and durations are copied unchanged. Clip names
//     drop the `<id>:` prefix because Godot forbids ':' in animation names;
//     the mapping is recorded in the manifest.
//   * EXT_texture_webp is kept unless --png is given (Godot imports WebP).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dequantize, prune } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';
import { Matrix3, Matrix4, Vector3 } from '../../web/lib/three/three.core.js';
import sharp from 'sharp';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const SRC = path.join(ROOT, 'shared/assets/models/people');
const OUT = path.join(ROOT, 'native/assets/characters');
const MANIFEST = path.join(ROOT, 'shared/data/manifests/people_derivatives.json');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const PEOPLE = arg('--people', 'alinardo').split(',').filter(Boolean);
const PNG = process.argv.includes('--png');
const MASTER = path.join(ROOT, '.local/mh/cast-round3.glb');   // retained round-three cast (ignored master)

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const meta = JSON.parse(fs.readFileSync(path.join(SRC, 'cast.json'), 'utf8'));
const tasksDoc = await io.read(path.join(SRC, 'tasks.glb'));
const taskAnims = tasksDoc.getRoot().listAnimations();
const master = fs.existsSync(MASTER) ? { doc: await io.read(MASTER), sha256: sha(MASTER) } : null;

const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : { people: {} };
Object.assign(manifest, {
  schema_version: 1,
  generator: 'scripts/migration/normalize_people.mjs',
  tool_versions: { '@gltf-transform/core': '4.5.1', meshoptimizer: '1.3.0', sharp: '0.35.5', node: process.version },
  sources: Object.fromEntries(['cast.glb', 'tasks.glb', 'cast.json'].map(f => [`shared/assets/models/people/${f}`, sha(path.join(SRC, f))])),
  coordinate_convention: 'metres, +X east, +Y up, +Z south (glTF/Godot); character model front is +Z (Godot MODEL_FRONT), identical to the browser slot ry convention',
  licence_note: 'Body/garment components keep the credits in docs/ASSETS.md, shared/provenance/reconstruction-decisions.json and shared/assets/credits.json (CC0 MakeHuman/MPFB, CC BY boots/apron where used). Motion sources per those documents.',
});
manifest.people ||= {};

for (const id of PEOPLE) {
  if (!meta.people[id]) throw new Error('unknown person ' + id);
  const doc = await io.read(path.join(SRC, 'cast.glb'));
  const root = doc.getRoot(), scene = root.listScenes()[0];
  const person = scene.listChildren().find(n => n.getName() === id);
  if (!person) throw new Error('no node ' + id);
  for (const n of scene.listChildren()) if (n !== person) disposeTree(n);
  // nodes by canonical name inside this person
  const byName = new Map();
  person.traverse(n => byName.set(n.getName(), n));
  const buffer = root.listBuffers()[0];
  const clips = [];
  for (const a of taskAnims.filter(a => a.getName().startsWith(id + ':'))) {
    const clip = a.getName().slice(id.length + 1);
    const out = doc.createAnimation(clip);
    let dur = 0, bound = 0, missing = [];
    const samplers = new Map();
    for (const ch of a.listChannels()) {
      const src = ch.getTargetNode().getName().replace(new RegExp('^' + id + '__'), '');
      const node = byName.get(src);
      if (!node) { missing.push(src); continue; }
      const s = ch.getSampler();
      let ns = samplers.get(s);
      if (!ns) {
        const inp = doc.createAccessor().setType('SCALAR').setArray(new Float32Array(s.getInput().getArray())).setBuffer(buffer);
        const o = s.getOutput();
        const outA = doc.createAccessor().setType(o.getType()).setArray(o.getArray().slice()).setNormalized(o.getNormalized()).setBuffer(buffer);
        ns = doc.createAnimationSampler().setInput(inp).setOutput(outA).setInterpolation(s.getInterpolation());
        out.addSampler(ns); samplers.set(s, ns);
        dur = Math.max(dur, s.getInput().getMax([0])[0]);
      }
      out.addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath(ch.getTargetPath()).setSampler(ns));
      bound++;
    }
    if (missing.length) throw new Error(`${a.getName()}: unbound targets ${missing.join(',')}`);
    out.setExtras({ source_clip: a.getName(), source_file: 'shared/assets/models/people/tasks.glb' });
    clips.push({ id: a.getName(), godot_name: clip, duration_s: +dur.toFixed(6), channels: bound });
  }
  // keep integer joints/weights/colours exactly; float the attributes that
  // core glTF (without KHR_mesh_quantization) requires as float
  await doc.transform(dequantize({ pattern: /^(POSITION|NORMAL|TANGENT|TEXCOORD_\d+)$/ }), prune({ keepAttributes: true, keepLeaves: true }));
  const restored = restoreNormals(doc, person);
  for (const e of root.listExtensionsUsed()) if (/meshopt|quantization/i.test(e.extensionName)) e.dispose();
  if (PNG) {
    for (const t of root.listTextures()) if (t.getMimeType() === 'image/webp') {
      t.setImage(new Uint8Array(await sharp(Buffer.from(t.getImage())).png().toBuffer())).setMimeType('image/png');
      if (t.getURI()) t.setURI(t.getURI().replace(/\.webp$/, '.png'));
    }
    for (const e of root.listExtensionsUsed()) if (e.extensionName === 'EXT_texture_webp') e.dispose();
  }
  // census for the manifest / import checks
  const skins = root.listSkins();
  const parts = [], morphs = {};
  let tris = 0;
  person.traverse(n => {
    const m = n.getMesh(); if (!m) return;
    const part = n.getName().split('.').pop();
    for (const p of m.listPrimitives()) {
      tris += (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3;
      const enc = Object.fromEntries(p.listSemantics().map(s => [s, `${p.getAttribute(s).getComponentType()}${p.getAttribute(s).getNormalized() ? 'n' : ''}`]));
      parts.push({ node: n.getName(), part, material: p.getMaterial()?.getName() ?? null, skin: n.getSkin()?.getName() ?? null, encodings: enc });
      const names = m.getExtras()?.targetNames;
      if (p.listTargets().length) morphs[part] = names || p.listTargets().map((_, i) => 'target' + i);
    }
  });
  const dir = path.join(OUT, id);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, id + '.glb');
  await io.write(file, doc);
  manifest.people[id] = {
    asset_id: 'character:' + id,
    output: path.relative(ROOT, file),
    output_sha256: sha(file),
    output_bytes: fs.statSync(file).size,
    height_m: meta.people[id].height, pelvis_m: meta.people[id].pelvis, head_m: meta.people[id].head,
    joints: skins.map(s => ({ skin: s.getName(), joints: s.listJoints().length })),
    skins_count: skins.length,
    parts, morph_targets: morphs, triangles: tris,
    clips,
    textures: root.listTextures().map(t => ({ name: t.getName(), mime: t.getMimeType(), size: t.getSize() })),
    extensions_used: root.listExtensionsUsed().map(e => e.extensionName),
    transformations: ['meshopt decode', 'dequantize POSITION/NORMAL/TANGENT/TEXCOORD to float32', 'retain integer JOINTS/WEIGHTS/COLOR',
      `restore authored NORMAL on ${restored.length} part(s) from the round-three master (see normal_restoration)`, `bind ${clips.length} fitted task clips by joint name`, PNG ? 'WebP -> PNG (lossless re-encode of decoded pixels)' : 'WebP kept (EXT_texture_webp)'],
    normal_restoration: restored,
    note: meta.people[id].note || null,
  };
  console.log(id, 'tris', tris, 'parts', parts.length, 'skins', skins.length, 'joints', skins[0]?.listJoints().length, 'clips', clips.map(c => c.godot_name).join(','), 'morphs', JSON.stringify(morphs), 'bytes', manifest.people[id].output_bytes);
}
fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');

// The shipped cast.glb lost its normals on every part that the shared-skin
// pass (scripts/people/shared_skins.mjs, fourth implementation pass) moved
// into the person's canonical bind space: gltf-transform 4.5.1
// applyNormalMatrix writes normalized-integer normals back through
// decodeNormalizedInt instead of encodeNormalizedInt, so each component
// truncates to 0 and the meshopt octahedral filter stores (0,0,0) as +Z.
// Only the canonical part (boots) and the refitted hood_down survived.
// The browser shades those parts with the same constant +Z normal.
//
// The authored normals are recovered here, never invented: the retained
// round-three master (.local/mh/cast-round3.glb, FOURTH_IMPLEMENTATION_PASS.md)
// has the same vertices in the same order in the part's own bind space. The
// bind correction C = IBM_shipped^-1 * IBM_master is the constant matrix the
// shared-skin pass applied; positions must agree index by index and the
// normals are carried across by the normal matrix C^-T. A part is touched
// only if its stored normals carry the defect's signature.
function restoreNormals(doc, person) {
  const out = [];
  let masterNodes = null;
  person.traverse(node => {
    const mesh = node.getMesh(); if (!mesh) return;
    for (const prim of mesh.listPrimitives()) {
      const N = prim.getAttribute('NORMAL'), P = prim.getAttribute('POSITION');
      if (!N) continue;
      const n = N.getCount(), e = [];
      let plusZ = 0;
      for (let i = 0; i < n; i++) { N.getElement(i, e); if (e[0] === 0 && e[1] === 0 && Math.abs(e[2] - 1) < 1e-6) plusZ++; }
      if (plusZ / n < 0.99) continue;
      if (prim.listTargets().some(t => t.getAttribute('NORMAL'))) throw new Error(node.getName() + ': morph normals with a defective base');
      if (!masterNodes) {
        if (!master) throw new Error(`${node.getName()}: degenerate normals and no round-three master at ${path.relative(ROOT, MASTER)}`);
        masterNodes = new Map(master.doc.getRoot().listNodes().filter(m => m.getMesh()).map(m => [m.getName(), m]));
      }
      const src = masterNodes.get(node.getName());
      const sp = src?.getMesh().listPrimitives()[0];
      if (!sp || sp.getAttribute('POSITION').getCount() !== n) throw new Error(node.getName() + ': no index-aligned master part');
      const si = sp.getIndices().getArray(), di = prim.getIndices().getArray();
      if (si.length !== di.length || si.some((v, i) => v !== di[i])) throw new Error(node.getName() + ': master topology differs');
      // constant bind correction, checked over every joint
      const shipped = node.getSkin().getInverseBindMatrices(), authored = src.getSkin().getInverseBindMatrices();
      const C = new Matrix4().fromArray(shipped.getElement(0, [])).invert().multiply(new Matrix4().fromArray(authored.getElement(0, [])));
      let bindResidual = 0;
      for (let j = 0; j < shipped.getCount(); j++) {
        const fitted = new Matrix4().fromArray(shipped.getElement(j, [])).multiply(C).elements, m = authored.getElement(j, []);
        for (let k = 0; k < 16; k++) bindResidual = Math.max(bindResidual, Math.abs(fitted[k] - m[k]));
      }
      if (bindResidual > 1e-5) throw new Error(node.getName() + ': nonconstant bind correction ' + bindResidual);
      const NM = new Matrix3().getNormalMatrix(C);
      const MP = sp.getAttribute('POSITION'), MN = sp.getAttribute('NORMAL');
      const normals = new Float32Array(n * 3), v = new Vector3(), w = new Vector3();
      let posResidual = 0;
      for (let i = 0; i < n; i++) {
        v.fromArray(MP.getElement(i, [])).applyMatrix4(C);
        posResidual = Math.max(posResidual, v.distanceTo(w.fromArray(P.getElement(i, []))));
        w.fromArray(MN.getElement(i, [])).applyMatrix3(NM).normalize().toArray(normals, i * 3);
      }
      if (posResidual > 2e-3) throw new Error(`${node.getName()}: master positions disagree by ${posResidual} m`);
      prim.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(normals).setBuffer(N.getBuffer()));
      N.listParents().length <= 1 && N.dispose();
      out.push({ node: node.getName(), vertices: n, defective_plus_z_share: +(plusZ / n).toFixed(4), master: path.relative(ROOT, MASTER), master_sha256: master.sha256,
        bind_correction_residual: +bindResidual.toExponential(3), max_position_residual_m: +posResidual.toExponential(3) });
    }
  });
  return out;
}

function disposeTree(n) {
  for (const c of n.listChildren()) disposeTree(c);
  n.getMesh()?.dispose(); n.getSkin()?.dispose(); n.dispose();
}
