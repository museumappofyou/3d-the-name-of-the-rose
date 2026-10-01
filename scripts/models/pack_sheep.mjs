// The abbey's sheep and lambs: "Sheep" by hendrikReyneke, CC BY 4.0, from
// the Objaverse mirror of Sketchfab (67abff7459f34afca11e3effab62c761; the
// licence is also in the file's asset.extras). A realistic, polled, thin-
// legged domestic sheep: one static 4,372-triangle mesh with a 1K fleece map
// and normal map, head up. This script
//   - bakes the Sketchfab node transforms, drops the second UV set and the
//     tangents;
//   - scales to metres with the withers (the top line over the forelegs) at
//     SHOULDER m (the runtime varies it per animal and makes lambs from it),
//     centres the sheep on the origin, facing +z, hooves at y = 0;
//   - gives it a small skeleton, every bone unrotated (x across, y up, z to
//     the muzzle): Body; Neck at the base of the neck, Neck2 half way, Head at
//     the poll; Ear_L, Ear_R; Tail. The neck and head are weighted by how far
//     along the neck a vertex lies, ears and tail by their own regions, the
//     rest (barrel, legs) stays with Body, so the hooves never move;
//   - bakes two calm loops at 24 fps: 'Idle' (12 s: looks about, one sniff
//     towards the ground, ear flicks, a tail swish) and 'Graze' (10 s: muzzle
//     in the bedding, nibbling, sweeping a little from side to side). The
//     grazing depth is solved, not guessed: the neck pitch is found by
//     bisection so the lowest muzzle vertex over the clip rests just above
//     the ground;
//   - names the material 'sheep.fleece' (its coats are set in
//     src/world/animals.js); keeps both maps at 1K as JPEG; meshopt-packs,
//     positions unquantized so the runtime can read bind-pose metres.
//   node scripts/models/pack_sheep.mjs [SRC.glb]
// (npm dependencies as in pack_pig.mjs)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, prune, reorder, quantize, textureCompress } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'node:fs';

const SRC = process.argv[2] || '.local/animals/src/sheep_candidates/67abff7459f34afca11e3effab62c761.glb';
const OUT = 'assets/models/animal_sheep.glb';
const SHOULDER = 0.65;       // withers, metres, before the per-animal scale
const FPS = 24, MUZZLE_CLEAR = 0.012;

await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(SRC);
const R = doc.getRoot();

// ---------------------------------------------------------------- maths --
const Q = {
  mul(a, b) { return [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]]; },
  euler(x, y, z) {   // yaw (y), then pitch (x), then roll (z), in the bone's frame
    const h = a => [Math.sin(a / 2), Math.cos(a / 2)];
    const [sy, cy] = h(y), [sx, cx] = h(x), [sz, cz] = h(z);
    return Q.mul(Q.mul([0, sy, 0, cy], [sx, 0, 0, cx]), [0, 0, sz, cz]);
  },
  rot(q, v) {   // rotate vector v by unit quaternion q
    const [x, y, z, w] = q, [vx, vy, vz] = v;
    const tx = 2 * (y * vz - z * vy), ty = 2 * (z * vx - x * vz), tz = 2 * (x * vy - y * vx);
    return [vx + w * tx + y * tz - z * ty, vy + w * ty + z * tx - x * tz, vz + w * tz + x * ty - y * tx];
  },
};
const smooth = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
// a smooth bump from a to b (0 outside, 1 in the middle)
const bump = (t, a, b) => t <= a || t >= b ? 0 : Math.sin(Math.PI * (t - a) / (b - a)) ** 2;

// ------------------------------------------------------ bake, metres --
const meshNode = R.listNodes().find(n => n.getMesh());
const prim = meshNode.getMesh().listPrimitives()[0];
for (const s of prim.listSemantics()) if (/^TEXCOORD_[1-9]$|^TANGENT$/.test(s)) prim.setAttribute(s, null);
const Wm = meshNode.getWorldMatrix();
const Pa = prim.getAttribute('POSITION'), Na = prim.getAttribute('NORMAL'), n = Pa.getCount();
const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), e = [0, 0, 0];
for (let i = 0; i < n; i++) {
  Pa.getElement(i, e);
  for (let k = 0; k < 3; k++) pos[i * 3 + k] = Wm[k] * e[0] + Wm[4 + k] * e[1] + Wm[8 + k] * e[2] + Wm[12 + k];
  Na.getElement(i, e);   // (the transform is a uniform scale and rotations)
  const v = [0, 1, 2].map(k => Wm[k] * e[0] + Wm[4 + k] * e[1] + Wm[8 + k] * e[2]), l = Math.hypot(...v);
  for (let k = 0; k < 3; k++) nor[i * 3 + k] = v[k] / l;
}
const bb = () => { const a = [1e9, 1e9, 1e9], b = [-1e9, -1e9, -1e9]; for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { a[k] = Math.min(a[k], pos[i * 3 + k]); b[k] = Math.max(b[k], pos[i * 3 + k]); } return [a, b]; };
{
  const [a, b] = bb(), L = b[2] - a[2], H = b[1] - a[1];
  // the forelegs: the low vertices in the front half; the withers: the top
  // line over them
  let z0 = 1e9, z1 = -1e9;
  for (let i = 0; i < n; i++) if (pos[i * 3 + 1] < a[1] + 0.08 * H && pos[i * 3 + 2] > a[2] + 0.5 * L) { z0 = Math.min(z0, pos[i * 3 + 2]); z1 = Math.max(z1, pos[i * 3 + 2]); }
  const zl = (z0 + z1) / 2; let wy = -1e9;
  for (let i = 0; i < n; i++) if (Math.abs(pos[i * 3 + 2] - zl) < 0.05 * L && Math.abs(pos[i * 3]) < 0.1 * (b[0] - a[0])) wy = Math.max(wy, pos[i * 3 + 1]);
  const k = SHOULDER / (wy - a[1]), cx = (a[0] + b[0]) / 2, cz = (a[2] + b[2]) / 2;
  for (let i = 0; i < n; i++) { pos[i * 3] = (pos[i * 3] - cx) * k; pos[i * 3 + 1] = (pos[i * 3 + 1] - a[1]) * k; pos[i * 3 + 2] = (pos[i * 3 + 2] - cz) * k; }
  console.log('scale', k.toFixed(3), 'forelegs at z', ((zl - cz) * k).toFixed(3));
}
const [A, B] = bb(), L = B[2] - A[2], H = B[1] - A[1];
console.log('metres: length', L.toFixed(3), 'height (poll)', H.toFixed(3), 'width', (B[0] - A[0]).toFixed(3));
Pa.setArray(pos); Na.setArray(nor);
meshNode.setName('sheep').setMatrix([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
const scene = R.listScenes()[0];
for (const c of scene.listChildren()) scene.removeChild(c);
meshNode.getParentNode()?.removeChild(meshNode);
scene.addChild(meshNode);
for (const nd of R.listNodes()) if (nd !== meshNode) nd.dispose();

// ------------------------------------------------------------ skeleton --
// positions as fractions of the length (from the tail) and height, read off
// the mesh's profile: barrel 0.31–0.89 of the height, forelegs at 0.58–0.67
// of the length, the neck rising from 0.71, the poll at 0.83, ears 0.83
const at = (zf, yf, x = 0) => [x, A[1] + yf * H, A[2] + zf * L];
const BONES = {
  Body: { p: at(0.45, 0.62) },
  Neck: { p: at(0.665, 0.627), parent: 'Body' },
  Neck2: { p: at(0.76, 0.777), parent: 'Neck' },
  Head: { p: at(0.83, 0.88), parent: 'Neck2' },
  Ear_L: { p: at(0.835, 0.93, 0.055), parent: 'Head' },
  Ear_R: { p: at(0.835, 0.93, -0.055), parent: 'Head' },
  Tail: { p: at(0.1, 0.74), parent: 'Body' },
};
const names = Object.keys(BONES);
// weights: by the distance in front of the neck's root, a plane slanting
// from the front of the withers down to the front of the brisket (0 there,
// 1 at the poll), so that withers, chest and forelegs stay with the body;
// the neck turns about a joint behind that plane, low in the chest, as a
// sheep's does when it grazes
const r0 = at(0.675, 0.9), r1 = at(0.76, 0.41), rn = [0, r1[2] - r0[2], -(r1[1] - r0[1])], rl = Math.hypot(...rn); rn.forEach((v, i) => rn[i] = v / rl);
const tOf = v => ((v[1] - r0[1]) * rn[1] + (v[2] - r0[2]) * rn[2]);
const nl = tOf(BONES.Head.p);
const W = new Float32Array(n * names.length);
let earN = 0, tailN = 0;
for (let i = 0; i < n; i++) {
  const v = [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
  const t = tOf(v) / nl;
  const head = smooth((t - 0.85) / 0.3), onNeck = smooth((t + 0.05) / 0.35), n2 = Math.max(0, smooth((t - 0.35) / 0.45) - head);
  const w = { Body: 1 - onNeck, Neck: Math.max(0, onNeck - n2 - head), Neck2: n2, Head: head, Ear_L: 0, Ear_R: 0, Tail: 0 };
  // ears: out past the side of the skull, at the poll
  const ear = smooth((Math.abs(v[0]) - 0.07) / 0.035) * smooth((v[1] - (A[1] + 0.84 * H)) / 0.04) * (t > 0.7 ? 1 : 0);
  if (ear > 0) { const k = v[0] > 0 ? 'Ear_L' : 'Ear_R'; w[k] = ear * w.Head; w.Head *= 1 - ear; earN++; }
  // tail: the stub behind the rump, above the hocks
  const tail = smooth((A[2] + 0.085 * L - v[2]) / (0.035 * L)) * smooth((v[1] - (A[1] + 0.55 * H)) / (0.05 * H));
  if (tail > 0) { w.Tail = tail * w.Body; w.Body *= 1 - tail; tailN++; }
  names.forEach((k, j) => W[i * names.length + j] = w[k]);
}
console.log('ear vertices', earN, 'tail vertices', tailN);
// four strongest influences per vertex
const J4 = new Uint16Array(n * 4), W4 = new Float32Array(n * 4);
for (let i = 0; i < n; i++) {
  const row = names.map((_, j) => [j, W[i * names.length + j]]).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const s = row.reduce((a, r) => a + r[1], 0);
  row.forEach(([j, w], k) => { J4[i * 4 + k] = j; W4[i * 4 + k] = w / s; });
}
const buf = R.listBuffers()[0];
prim.setAttribute('JOINTS_0', doc.createAccessor().setType('VEC4').setArray(J4).setBuffer(buf));
prim.setAttribute('WEIGHTS_0', doc.createAccessor().setType('VEC4').setArray(W4).setBuffer(buf));
const node = {};
for (const k of names) {
  const b = BONES[k], pp = b.parent ? BONES[b.parent].p : [0, 0, 0];
  node[k] = doc.createNode(k).setTranslation(b.p.map((v, i) => v - pp[i]));
  (b.parent ? node[b.parent] : scene).addChild(node[k]);
}
const ibm = new Float32Array(names.length * 16);
names.forEach((k, j) => { const p = BONES[k].p; ibm.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -p[0], -p[1], -p[2], 1], j * 16); });
const skin = doc.createSkin('sheep').setSkeleton(node.Body).setInverseBindMatrices(doc.createAccessor().setType('MAT4').setArray(ibm).setBuffer(buf));
for (const k of names) skin.addJoint(node[k]);
meshNode.setSkin(skin);

// ---------------------------------------------------------- evaluation --
// every bone unrotated at rest: world = parent world × (t, q); skinned
// v = Σ w · R_world (v − p_bind) + p_world
function world(qs) {
  const Wd = {};
  for (const k of names) {
    const b = BONES[k], q = qs[k] || [0, 0, 0, 1];
    if (!b.parent) { Wd[k] = { q, p: b.p }; continue; }
    const P = Wd[b.parent], off = b.p.map((v, i) => v - BONES[b.parent].p[i]), r = Q.rot(P.q, off);
    Wd[k] = { q: Q.mul(P.q, q), p: P.p.map((v, i) => v + r[i]) };
  }
  return Wd;
}
function skinned(qs, pick) {
  const Wd = world(qs); let lo = 1e9;
  for (let i = 0; i < n; i++) {
    if (pick && !pick(i)) continue;
    let y = 0;
    for (let k = 0; k < 4; k++) {
      const w = W4[i * 4 + k]; if (!w) continue;
      const nm = names[J4[i * 4 + k]], b = Wd[nm], d = [0, 1, 2].map(c => pos[i * 3 + c] - BONES[nm].p[c]);
      y += w * (Q.rot(b.q, d)[1] + b.p[1]);
    }
    lo = Math.min(lo, y);
  }
  return lo;
}
const isHead = i => names[J4[i * 4]] === 'Head' || names[J4[i * 4]] === 'Neck2';
const isHoof = i => pos[i * 3 + 1] < 0.03;

// ---------------------------------------------------------------- clips --
// pose(t) -> { bone: quaternion }; pitch > 0 lowers the head (about +x).
// To graze a sheep stretches its neck forward and down from the root and
// turns the head back up against it: the neck's two segments end at about
// −35° and −50°, the face at −75°, the muzzle in front of the forefeet
// (G: the neck's root pitch; the other joints follow in proportion)
const earFlick = (t, t0) => 0.55 * bump(t, t0, t0 + 0.35);
const idle = t => {
  const T = 12, w = 2 * Math.PI / T;
  const sniff = bump(t, 6.4, 9.2);                          // one look at the ground
  const yaw = 0.26 * Math.sin(w * t) + 0.08 * Math.sin(2 * w * t + 1.1);
  return {
    Neck: Q.euler(0.05 * Math.sin(w * t + 0.7) + 0.75 * sniff, yaw * 0.55, 0.03 * Math.sin(2 * w * t)),
    Neck2: Q.euler(0.2 * sniff, yaw * 0.25, 0),
    Head: Q.euler(0.07 * Math.sin(3 * w * t) - 0.3 * sniff, yaw * 0.2, 0.05 * Math.sin(w * t + 2.0)),
    Ear_L: Q.euler(0, 0, earFlick(t, 2.1) + earFlick(t, 9.8)), Ear_R: Q.euler(0, 0, -earFlick(t, 5.3)),
    Tail: Q.euler(0, 0.45 * Math.sin(Math.PI * 4 * (t - 4)) * bump(t, 4, 5), 0),
  };
};
const graze = G => t => {
  const T = 10, w = 2 * Math.PI / T;
  const nib = Math.max(0, Math.sin(4 * w * t)) ** 2;           // a bite, four times a loop
  const yaw = 0.2 * Math.sin(w * t) + 0.05 * Math.sin(3 * w * t);
  return {
    Neck: Q.euler(G + 0.03 * Math.sin(2 * w * t), yaw * 0.6, 0),
    Neck2: Q.euler(0.17 * G, yaw * 0.25, 0),
    Head: Q.euler(-0.64 * G + 0.08 * nib, yaw * 0.15, 0.04 * Math.sin(w * t)),
    Ear_L: Q.euler(0, 0, earFlick(t, 3.3)), Ear_R: Q.euler(0, 0, -earFlick(t, 7.7)),
    Tail: Q.euler(0, 0.4 * Math.sin(Math.PI * 4 * (t - 6)) * bump(t, 6, 7), 0),
  };
};
const lowest = (fn, T, pick) => { let lo = 1e9; for (let f = 0; f <= T * FPS; f++) lo = Math.min(lo, skinned(fn(f / FPS), pick)); return lo; };
// the grazing depth: the lowest muzzle vertex over the loop just above ground
let ga = 0.6, gb = 1.8;
for (let it = 0; it < 18; it++) { const g = (ga + gb) / 2; if (lowest(graze(g), 10, isHead) > MUZZLE_CLEAR) ga = g; else gb = g; }
const G = ga;
console.log('grazing: neck root', (G * 180 / Math.PI).toFixed(0) + '°, mid-neck', (G * 0.17 * 180 / Math.PI).toFixed(0) + '°, head', (-G * 0.64 * 180 / Math.PI).toFixed(0) + '°');
const CLIPS = { Idle: [idle, 12], Graze: [graze(G), 10] };
for (const [nm, [fn, T]] of Object.entries(CLIPS))
  console.log(nm, T + ' s: lowest vertex', lowest(fn, T).toFixed(4), 'm, hooves', lowest(fn, T, isHoof).toFixed(4), 'm, muzzle', lowest(fn, T, isHead).toFixed(4), 'm');

for (const [nm, [fn, T]] of Object.entries(CLIPS)) {
  const a = doc.createAnimation(nm), frames = T * FPS;
  const times = new Float32Array(frames + 1).map((_, f) => f / FPS);
  const input = doc.createAccessor().setType('SCALAR').setArray(times).setBuffer(buf);
  for (const k of names) {
    if (k === 'Body') continue;
    const out = new Float32Array((frames + 1) * 4);
    for (let f = 0; f <= frames; f++) out.set(fn(f % frames / FPS)[k], f * 4);   // last key = first: a seamless loop
    const s = doc.createAnimationSampler().setInterpolation('LINEAR').setInput(input).setOutput(doc.createAccessor().setType('VEC4').setArray(out).setBuffer(buf));
    a.addSampler(s).addChannel(doc.createAnimationChannel().setTargetNode(node[k]).setTargetPath('rotation').setSampler(s));
  }
}
// rest pose: the first frame of Idle
for (const [k, q] of Object.entries(idle(0))) node[k].setRotation(q);

// ------------------------------------------------------ material, pack --
R.listMaterials()[0].setName('sheep.fleece').setMetallicFactor(0).setRoughnessFactor(1);
await doc.transform(
  textureCompress({ encoder: sharp, targetFormat: 'jpeg', quality: 86, resize: [1024, 1024], slots: /^baseColorTexture$/ }),
  textureCompress({ encoder: sharp, targetFormat: 'jpeg', quality: 90, resize: [1024, 1024], slots: /^normalTexture$/ }),
  dedup(), prune(), reorder({ encoder: MeshoptEncoder, target: 'size' }),
  quantize({ pattern: /^(TEXCOORD_0|JOINTS_0|WEIGHTS_0)$/ }),
);
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
R.getAsset().extras = { ...R.getAsset().extras, derivative: 'The Abbey (gulun_adı): metric, skeleton and two baked clips added; coat set at runtime' };
await io.write(OUT, doc);
console.log(OUT, fs.statSync(OUT).size, 'bytes', prim.getIndices().getCount() / 3, 'tris', n, 'verts',
  R.listAnimations().map(a => a.getName()).join(', '), R.listTextures().map(t => t.getMimeType() + ' ' + t.getSize().join('×') + ' ' + t.getImage().byteLength).join(', '));
