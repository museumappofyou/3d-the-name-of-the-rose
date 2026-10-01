// The abbey's pigs: "Pig" by BojanBabic (@bokadigimon), CC BY 4.0, from the
// Objaverse mirror of Sketchfab (6d78fe9cec03483ba6d3e4ff30dc6265; the
// Sketchfab page is gone, the licence is in the file's asset.extras). A
// modern Large White with a 52-joint 3ds Max Biped skin and one 10 s clip.
// This script
//   - drops the Sketchfab wrapper nodes, the four unused UV sets and the
//     tangents, welds and simplifies the skinned mesh (weights kept);
//   - lengthens the lower legs a little in the bind pose (forearm and front
//     cannon, rear gaskin and cannon), for the leggier medieval animal, and
//     re-binds the joints below;
//   - makes two clips from the source clip, measured, not guessed: 'Idle' is
//     the whole 10 s loop (looks about, lowers the head to sniff, looks up);
//     'Root' is the head-down stretch at frames 121–183 (5.04–7.63 s), the
//     one sub-range whose ends match (pose-distance search over the key
//     bones), with its last half-second blended into the frames before its
//     start so it loops without a jump. Where the head is low the neck is
//     pitched a little further so the snout still reaches the ground on the
//     longer legs;
//   - scales to metres with the withers at SHOULDER m (the runtime varies it
//     per animal), centres the pig on the origin, facing +z, and puts the
//     lowest vertex over both clips at y = 0;
//   - names the head and neck joints 'Head' and 'Neck' (the runtime nods
//     them before a grunt) and the material 'pig.skin' (its coat is set in
//     web/src/world/animals.js);
//   - keeps the 1K colour and normal maps (JPEG), the occlusion/roughness map
//     at 512, metalness off; meshopt-packs, positions left unquantized so the
//     runtime can read bind-pose metres for the coat.
//   node scripts/models/pack_pig.mjs [SRC.glb]
// (npm dependencies as in scripts/people/pack_people.mjs, plus sharp)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, prune, resample, reorder, quantize, weld, simplify, textureCompress } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'node:fs';

const SRC = process.argv[2] || '.local/animals/src/pig_candidates/objaverse_pig_bokadigimon/model.glb';
const OUT = 'shared/assets/models/animal_pig.glb';
const SHOULDER = 0.65;      // withers height, metres, before the per-animal scale
const TRIS = 14000;         // simplification target
const LEG = 0.06;           // added lower-leg length, source metres (front and rear alike)
const FPS = 24, ROOT = [121, 183], BLEND = 0.5;

await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(SRC);
const R = doc.getRoot();

// ---------------------------------------------------------------- maths --
// 4×4 column-major, quaternions [x, y, z, w]
const M = {
  mul(a, b) { const o = new Float64Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; },
  compose(t, q, s) {
    const [x, y, z, w] = q, x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
    return Float64Array.of((1 - (yy + zz)) * s[0], (xy + wz) * s[0], (xz - wy) * s[0], 0, (xy - wz) * s[1], (1 - (xx + zz)) * s[1], (yz + wx) * s[1], 0,
      (xz + wy) * s[2], (yz - wx) * s[2], (1 - (xx + yy)) * s[2], 0, t[0], t[1], t[2], 1);
  },
  inv(a) {
    const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = a;
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    const d = 1 / (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06);
    return Float64Array.of((a11 * b11 - a12 * b10 + a13 * b09) * d, (a02 * b10 - a01 * b11 - a03 * b09) * d, (a31 * b05 - a32 * b04 + a33 * b03) * d, (a22 * b04 - a21 * b05 - a23 * b03) * d,
      (a12 * b08 - a10 * b11 - a13 * b07) * d, (a00 * b11 - a02 * b08 + a03 * b07) * d, (a32 * b02 - a30 * b05 - a33 * b01) * d, (a20 * b05 - a22 * b02 + a23 * b01) * d,
      (a10 * b10 - a11 * b08 + a13 * b06) * d, (a01 * b08 - a00 * b10 - a03 * b06) * d, (a30 * b04 - a31 * b02 + a33 * b00) * d, (a21 * b02 - a20 * b04 - a23 * b00) * d,
      (a11 * b07 - a10 * b09 - a12 * b06) * d, (a00 * b09 - a01 * b07 + a02 * b06) * d, (a31 * b01 - a30 * b03 - a32 * b00) * d, (a20 * b03 - a21 * b01 + a22 * b00) * d);
  },
  point(m, v) { return [m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12], m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13], m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14]]; },
  dir(m, v) { return [m[0] * v[0] + m[4] * v[1] + m[8] * v[2], m[1] * v[0] + m[5] * v[1] + m[9] * v[2], m[2] * v[0] + m[6] * v[1] + m[10] * v[2]]; },
  trans(t) { return M.compose(t, [0, 0, 0, 1], [1, 1, 1]); },
};
const Q = {
  mul(a, b) { return [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]]; },
  conj(a) { return [-a[0], -a[1], -a[2], a[3]]; },
  axis(ax, ang) { const s = Math.sin(ang / 2); return [ax[0] * s, ax[1] * s, ax[2] * s, Math.cos(ang / 2)]; },
  slerp(a, b, t) {
    let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3], bb = b;
    if (d < 0) { d = -d; bb = b.map(v => -v); }
    let k0 = 1 - t, k1 = t;
    if (d < 0.9995) { const th = Math.acos(d), s = Math.sin(th); k0 = Math.sin((1 - t) * th) / s; k1 = Math.sin(t * th) / s; }
    const o = [0, 1, 2, 3].map(i => a[i] * k0 + bb[i] * k1), l = Math.hypot(...o);
    return o.map(v => v / l);
  },
  // rotation part of a matrix without scale
  fromMat(m) {
    const sx = Math.hypot(m[0], m[1], m[2]), sy = Math.hypot(m[4], m[5], m[6]), sz = Math.hypot(m[8], m[9], m[10]);
    const a = m[0] / sx, b = m[4] / sy, c = m[8] / sz, d = m[1] / sx, e = m[5] / sy, f = m[9] / sz, g = m[2] / sx, h = m[6] / sy, i = m[10] / sz;
    const tr = a + e + i; let x, y, z, w;
    if (tr > 0) { const s = 0.5 / Math.sqrt(tr + 1); w = 0.25 / s; x = (h - f) * s; y = (c - g) * s; z = (d - b) * s; }
    else if (a > e && a > i) { const s = 2 * Math.sqrt(1 + a - e - i); w = (h - f) / s; x = 0.25 * s; y = (b + d) / s; z = (c + g) / s; }
    else if (e > i) { const s = 2 * Math.sqrt(1 + e - a - i); w = (c - g) / s; x = (b + d) / s; y = 0.25 * s; z = (f + h) / s; }
    else { const s = 2 * Math.sqrt(1 + i - a - e); w = (d - b) / s; x = (c + g) / s; y = (f + h) / s; z = 0.25 * s; }
    return [x, y, z, w];
  },
};
const smooth = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

// ------------------------------------------------------------ structure --
const skin = R.listSkins()[0], joints = skin.listJoints();
const meshNode = R.listNodes().find(n => n.getMesh() && n.getSkin());
const prim = meshNode.getMesh().listPrimitives()[0];
const rootJoint = skin.getSkeleton() || joints[0];
const holder = rootJoint.getParentNode();                 // the node that carries the Sketchfab offsets
const scene = R.listScenes()[0];
const arm = doc.createNode('Pig').setMatrix(Array.from(holder.getWorldMatrix()));
holder.removeChild(rootJoint); arm.addChild(rootJoint);
meshNode.getParentNode()?.removeChild(meshNode);
for (const n of scene.listChildren()) scene.removeChild(n);
scene.addChild(arm); scene.addChild(meshNode.setName('pig').setTranslation([0, 0, 0]).setRotation([0, 0, 0, 1]).setScale([1, 1, 1]));
for (const n of R.listNodes()) if (n !== arm && n !== meshNode && !joints.includes(n)) n.dispose();
// only the first UV set is textured
for (const s of prim.listSemantics()) if (/^TEXCOORD_[1-9]$|^TANGENT$/.test(s)) prim.setAttribute(s, null);
const name = n => n.getName().replace(/_\d+$/, '');
for (const j of joints) j.setName(name(j));
R.listNodes().find(n => n.getName() === 'head').setName('Head');
R.listNodes().find(n => n.getName() === 'neck').setName('Neck');
const J = Object.fromEntries(joints.map(j => [j.getName(), j]));
const mat = R.listMaterials()[0].setName('pig.skin').setMetallicFactor(0).setRoughnessFactor(1);

// weld, then simplify the bind-pose mesh; meshoptimizer keeps UV seams and
// carries the surviving vertices' skin weights
await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: TRIS / (prim.getIndices().getCount() / 3), error: 0.004, lockBorder: false }));

// ------------------------------------------------------------ the clips --
const src = R.listAnimations()[0];
// a clip is a list of tracks { node, path, times, values, size }
const tracks = src.listChannels().map(c => {
  const s = c.getSampler();
  if (s.getInterpolation() !== 'LINEAR') throw new Error('expected linear keys');
  return { node: c.getTargetNode(), path: c.getTargetPath(), times: Array.from(s.getInput().getArray()), values: Array.from(s.getOutput().getArray()), size: c.getTargetPath() === 'rotation' ? 4 : 3 };
});
const at = (tr, t) => {
  const T = tr.times, n = tr.size, V = tr.values;
  if (t <= T[0]) return V.slice(0, n);
  if (t >= T[T.length - 1]) return V.slice((T.length - 1) * n, T.length * n);
  let lo = 0, hi = T.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T[m] <= t) lo = m; else hi = m; }
  const f = (t - T[lo]) / (T[hi] - T[lo]), a = V.slice(lo * n, lo * n + n), b = V.slice(hi * n, hi * n + n);
  return n === 4 ? Q.slerp(a, b, f) : a.map((v, i) => v + (b[i] - v) * f);
};
const mix = (tr, a, b, f) => tr.size === 4 ? Q.slerp(a, b, f) : a.map((v, i) => v + (b[i] - v) * f);
const resampled = (tr, times, fn) => ({ ...tr, times: times.map((t, i) => t - times[0]), values: times.flatMap((t, i) => fn(t, i)) });
const idle = tracks.map(tr => ({ ...tr }));
const t0 = ROOT[0] / FPS, t1 = ROOT[1] / FPS, L = t1 - t0;
const rootTimes = Array.from({ length: ROOT[1] - ROOT[0] + 1 }, (_, k) => (ROOT[0] + k) / FPS);
const root = tracks.map(tr => resampled(tr, rootTimes, t => {
  const v = at(tr, t);
  return t > t1 - BLEND ? mix(tr, v, at(tr, t - L), smooth((t - (t1 - BLEND)) / BLEND)) : v;
}));
const CLIPS = { Idle: idle, Root: root };

// ------------------------------------------------------ rig evaluation --
const nodes = [];
(function walk(n, p) { const i = nodes.length; nodes.push({ n, p }); for (const c of n.listChildren()) walk(c, i); })(arm, -1);
const jointIdx = joints.map(j => nodes.findIndex(e => e.n === j));
const readIBM = () => joints.map((_, i) => Float64Array.from(skin.getInverseBindMatrices().getElement(i, [])));
const geo = () => {
  const P = prim.getAttribute('POSITION'), Jn = prim.getAttribute('JOINTS_0'), W = prim.getAttribute('WEIGHTS_0'), n = P.getCount();
  const pos = new Float64Array(n * 3), ji = new Uint16Array(n * 4), jw = new Float64Array(n * 4), e3 = [0, 0, 0], e4 = [0, 0, 0, 0];
  for (let i = 0; i < n; i++) { pos.set(P.getElement(i, e3), i * 3); ji.set(Jn.getElement(i, e4), i * 4); jw.set(W.getElement(i, e4), i * 4); }
  return { n, pos, ji, jw };
};
// world matrices of every node for a clip at time t (tracks override rest)
function pose(clip, t) {
  const local = nodes.map(({ n }) => ({ t: n.getTranslation(), r: n.getRotation(), s: n.getScale() }));
  if (clip) for (const tr of clip) { const i = nodes.findIndex(e => e.n === tr.node); if (i >= 0) local[i][tr.path[0]] = at(tr, t); }
  const W = [];
  nodes.forEach(({ n, p }, i) => { const m = n === arm ? Float64Array.from(arm.getMatrix()) : M.compose(local[i].t, local[i].r, local[i].s); W[i] = p < 0 ? m : M.mul(W[p], m); });
  return W;
}
function skinned(G, IBM, W) {
  const JM = joints.map((_, j) => M.mul(W[jointIdx[j]], IBM[j]));
  const out = new Float64Array(G.n * 3);
  for (let i = 0; i < G.n; i++) {
    const v = [G.pos[i * 3], G.pos[i * 3 + 1], G.pos[i * 3 + 2]]; let x = 0, y = 0, z = 0;
    for (let k = 0; k < 4; k++) { const w = G.jw[i * 4 + k]; if (!w) continue; const p = M.point(JM[G.ji[i * 4 + k]], v); x += w * p[0]; y += w * p[1]; z += w * p[2]; }
    out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
  }
  return out;
}
const sub = names => { const s = new Set(); const add = n => { s.add(n); n.listChildren().forEach(add); }; names.forEach(k => add(J[k])); return s; };
const HEADSET = sub(['Head']), HOOVES = new Set(['Bip001 L Finger0', 'Bip001 R Finger0', 'Bip001 L Toe0', 'Bip001 R Toe0'].map(k => J[k]));
const dominant = (G, i) => { let b = 0; for (let k = 1; k < 4; k++) if (G.jw[i * 4 + k] > G.jw[i * 4 + b]) b = k; return joints[G.ji[i * 4 + b]]; };

// ---------------------------------------------------- longer lower legs --
// Each segment [upper joint, lower joint, share of LEG]: vertices of that
// leg are moved along the segment's bind-pose axis in proportion to how far
// down it they lie, the joints below move with them, and the joints'
// inverse bind matrices and local offsets (rest and keys) follow.
if (LEG > 0) {
  const IBM = readIBM(), G = geo(), B = IBM.map(M.inv);
  const bind = j => { const m = B[joints.indexOf(J[j])]; return [m[12], m[13], m[14]]; };
  const LEGS = [
    { chain: ['UpperArm', 'Forearm', 'Hand', 'Finger0'], segs: [['Forearm', 'Hand', 0.6], ['Hand', 'Finger0', 0.4]] },
    { chain: ['Thigh', 'Calf', 'HorseLink', 'Foot', 'Toe0'], segs: [['Calf', 'HorseLink', 0.45], ['HorseLink', 'Foot', 0.55]] },
  ];
  const disp = new Float64Array(G.n * 3), jd = new Map();
  for (const side of ['L', 'R']) for (const leg of LEGS) {
    const nm = k => `Bip001 ${side} ${k}`;
    const chainIdx = new Set(leg.chain.map(k => joints.indexOf(J[nm(k)])));
    const segs = leg.segs.map(([a, b, f]) => { const pa = bind(nm(a)), pb = bind(nm(b)); const d = pb.map((v, i) => v - pa[i]), l = Math.hypot(...d); return { pa, u: d.map(v => v / l), l, add: LEG * f }; });
    const along = p => { const o = [0, 0, 0]; for (const s of segs) { const t = Math.min(1, Math.max(0, ((p[0] - s.pa[0]) * s.u[0] + (p[1] - s.pa[1]) * s.u[1] + (p[2] - s.pa[2]) * s.u[2]) / s.l)); for (let i = 0; i < 3; i++) o[i] += s.add * t * s.u[i]; } return o; };
    for (let i = 0; i < G.n; i++) {
      let w = 0; for (let k = 0; k < 4; k++) if (chainIdx.has(G.ji[i * 4 + k])) w += G.jw[i * 4 + k];
      if (!w) continue;
      const d = along([G.pos[i * 3], G.pos[i * 3 + 1], G.pos[i * 3 + 2]]);
      for (let k = 0; k < 3; k++) disp[i * 3 + k] += w * d[k];
    }
    // every joint below the first segment's top (children included) moves rigidly
    for (const k of leg.chain.slice(1)) jd.set(J[nm(k)], along(bind(nm(k))));
    const tip = J[nm(leg.chain[leg.chain.length - 1])];
    for (const c of tip.listChildren()) jd.set(c, jd.get(tip));
  }
  const P = prim.getAttribute('POSITION'), arr = P.getArray();
  for (let i = 0; i < G.n; i++) for (let k = 0; k < 3; k++) arr[i * 3 + k] += disp[i * 3 + k];
  P.setArray(arr);
  const ibmA = skin.getInverseBindMatrices();
  for (const [j, d] of jd) {
    const ji = joints.indexOf(j); if (ji < 0) continue;
    ibmA.setElement(ji, Array.from(M.mul(IBM[ji], M.trans(d.map(v => -v)))));
    // the local offset from the parent, in the parent's bind frame
    const p = j.getParentNode(), pi = joints.indexOf(p), dp = jd.get(p) || [0, 0, 0];
    const dl = M.dir(M.inv(B[pi]), d.map((v, i) => v - dp[i]));
    const bump = v => v.map((x, i) => x + dl[i]);
    j.setTranslation(bump(j.getTranslation()));
    for (const clip of Object.values(CLIPS)) for (const tr of clip) if (tr.node === j && tr.path === 'translation')
      for (let k = 0; k < tr.times.length; k++) { const v = bump(tr.values.slice(k * 3, k * 3 + 3)); tr.values.splice(k * 3, 3, ...v); }
  }
}

// ------------------------------------------- the snout on the ground --
// With the body higher, pitch the neck further where the head is low (by the
// source nose height), found by bisection so the lowest snout vertex of the
// sniffing clip is back at the lowest hoof.
function neckPitch(clip, gain) {
  // the extra pitch turns the neck about the pig's lateral (x) axis, taken
  // into the neck's local frame through its parent's rotation at each key
  const tr = clip.find(t => t.node === J.Neck && t.path === 'rotation');
  const ni = nodes.findIndex(e => e.n === J['nose_02']), pi = nodes.findIndex(e => e.n === J.Neck.getParentNode());
  const base = tr.values.slice();
  const lowOf = clip._low || (clip._low = tr.times.map(t => { const W = pose(clip, t); return W[ni][13]; }));
  const par = clip._par || (clip._par = tr.times.map(t => Q.fromMat(pose(clip, t)[pi])));
  for (let k = 0; k < tr.times.length; k++) {
    const w = smooth((clip._hi - lowOf[k]) / (clip._hi - clip._lo));
    const qp = par[k], qx = Q.axis([1, 0, 0], gain * w);
    const q = Q.mul(Q.mul(Q.conj(qp), Q.mul(qx, qp)), base.slice(k * 4, k * 4 + 4));
    tr.values.splice(k * 4, 4, ...q);
  }
  return () => tr.values.splice(0, base.length, ...base);
}

// ------------------------------------------------------------ measuring --
function measure(label) {
  const IBM = readIBM(), G = geo();
  const stat = {};
  for (const [nm, clip] of Object.entries(CLIPS)) {
    const T = clip[0].times, dur = T[T.length - 1];
    let hoof = 1e9, snout = 1e9, lo = 1e9, top = -1e9, wSum = 0, wN = 0, wMin = 1e9, wMax = -1e9;
    const frames = Math.round(dur * FPS);
    for (let f = 0; f <= frames; f++) {
      const W = pose(clip, f / FPS), P = skinned(G, IBM, W);
      // withers: the top line over the shoulder blades
      const cl = W[nodes.findIndex(e => e.n === J['Bip001 L Clavicle'])], cr = W[nodes.findIndex(e => e.n === J['Bip001 R Clavicle'])];
      const ua = W[nodes.findIndex(e => e.n === J['Bip001 L UpperArm'])];
      const zw = (cl[14] + cr[14]) / 2 * 0.5 + ua[14] * 0.5, xw = (cl[12] + cr[12]) / 2;
      const zspan = Math.abs(cl[14] - ua[14]) * 0.6 + 0.02;
      let wt = -1e9;
      for (let i = 0; i < G.n; i++) {
        const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
        lo = Math.min(lo, y); top = Math.max(top, y);
        const d = dominant(G, i);
        if (HOOVES.has(d)) hoof = Math.min(hoof, y);
        if (HEADSET.has(d)) snout = Math.min(snout, y);
        if (Math.abs(z - zw) < zspan && Math.abs(x - xw) < 0.06 && !HEADSET.has(d)) wt = Math.max(wt, y);
      }
      wSum += wt; wN++; wMin = Math.min(wMin, wt); wMax = Math.max(wMax, wt);
    }
    stat[nm] = { hoof, snout, lo, top, withers: wSum / wN, wMin, wMax };
  }
  if (label) console.log(label, Object.entries(stat).map(([k, s]) => `${k}: lowest ${s.lo.toFixed(4)} hooves ${s.hoof.toFixed(4)} snout ${s.snout.toFixed(4)} withers ${s.withers.toFixed(3)} (${s.wMin.toFixed(3)}–${s.wMax.toFixed(3)}) top ${s.top.toFixed(3)}`).join('\n  '));
  return stat;
}

// how well the Root range closes before its blend (key bones, source metres)
{
  const key = ['nose_02', 'Head', 'Ear_L_Bone002', 'Ear_R_Bone002', 'Bone008', 'Bip001 L Finger0', 'Bip001 R Finger0'].map(k => nodes.findIndex(e => e.n === J[k]));
  const A = pose(CLIPS.Idle, t0), B = pose(CLIPS.Idle, t1);
  console.log('Root', t0.toFixed(2), '–', t1.toFixed(2), 's: ends differ by', (Math.max(...key.map(i => Math.hypot(A[i][12] - B[i][12], A[i][13] - B[i][13], A[i][14] - B[i][14]))) * 100).toFixed(1), 'cm before the blend');
}

// neck compensation, solved on the source-scale rig
{
  const nose = J['nose_02'];
  const noseY = clip => { const ni = nodes.findIndex(e => e.n === nose); const tr = clip.find(t => t.node === J.Neck && t.path === 'rotation'); return tr.times.map(t => pose(clip, t)[ni][13]); };
  const ys = noseY(CLIPS.Idle);
  const hi = Math.max(...ys), lo = Math.min(...ys);
  // full extra pitch at the lowest head, none above the middle of its range
  for (const c of Object.values(CLIPS)) { c._hi = lo + (hi - lo) * 0.5; c._lo = lo; }
  const s0 = measure();
  const target = Math.max(s0.Idle.hoof, s0.Root.hoof) + 0.004;   // just above the hooves' ground
  let a = 0, b = 0.5;   // a positive pitch about +x lowers the snout
  for (let it = 0; it < 14; it++) {
    const g = (a + b) / 2;
    const u1 = neckPitch(CLIPS.Root, g), u2 = neckPitch(CLIPS.Idle, g);
    const s = measure();
    u1(); u2();
    if (Math.min(s.Root.snout, s.Idle.snout) > target) a = g; else b = g;
  }
  const g = a;
  neckPitch(CLIPS.Root, g); neckPitch(CLIPS.Idle, g);
  console.log('neck pitch where the head is low:', (g * 180 / Math.PI).toFixed(1), '°');
}

// ---------------------------------------------------- metres, centred --
{
  const s = measure('source (after legs):');
  const ground = Math.min(s.Idle.lo, s.Root.lo);
  const k = SHOULDER / (s.Idle.withers - ground);
  // centre on the rest pose's footprint
  const G = geo(), P = skinned(G, readIBM(), pose(CLIPS.Idle, 0));
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (let i = 0; i < G.n; i++) { x0 = Math.min(x0, P[i * 3]); x1 = Math.max(x1, P[i * 3]); z0 = Math.min(z0, P[i * 3 + 2]); z1 = Math.max(z1, P[i * 3 + 2]); }
  const N = M.mul(M.compose([0, 0, 0], [0, 0, 0, 1], [k, k, k]), M.trans([-(x0 + x1) / 2, -ground, -(z0 + z1) / 2]));
  const Ni = M.inv(N);
  const Pa = prim.getAttribute('POSITION'), arr = Pa.getArray();
  for (let i = 0; i < Pa.getCount(); i++) arr.set(M.point(N, [arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2]]), i * 3);
  Pa.setArray(arr);
  const ibm = skin.getInverseBindMatrices();
  for (let j = 0; j < joints.length; j++) ibm.setElement(j, Array.from(M.mul(Float64Array.from(ibm.getElement(j, [])), Ni)));
  arm.setMatrix(Array.from(M.mul(N, Float64Array.from(arm.getMatrix()))));
  console.log('scale', k.toFixed(4), 'length', ((z1 - z0) * k).toFixed(3), 'm');
}
measure('metres:');

// ------------------------------------------------- write the animations --
// rest pose = the first frame of Idle; tracks that never leave it are dropped
for (const tr of CLIPS.Idle) tr.node[{ translation: 'setTranslation', rotation: 'setRotation', scale: 'setScale' }[tr.path]](tr.values.slice(0, tr.size));
const still = tr => { const r = tr.node[{ translation: 'getTranslation', rotation: 'getRotation', scale: 'getScale' }[tr.path]](); for (let k = 0; k < tr.times.length; k++) for (let i = 0; i < tr.size; i++) if (Math.abs(tr.values[k * tr.size + i] - r[i]) > 1e-5) return false; return true; };
const buf = R.listBuffers()[0];
for (const [nm, clip] of Object.entries(CLIPS)) {
  const a = doc.createAnimation(nm);
  for (const tr of clip) {
    if (still(tr) && CLIPS.Idle.concat(CLIPS.Root).filter(o => o.node === tr.node && o.path === tr.path).every(still)) continue;
    const s = doc.createAnimationSampler().setInterpolation('LINEAR')
      .setInput(doc.createAccessor().setType('SCALAR').setArray(new Float32Array(tr.times)).setBuffer(buf))
      .setOutput(doc.createAccessor().setType(tr.size === 4 ? 'VEC4' : 'VEC3').setArray(new Float32Array(tr.values)).setBuffer(buf));
    a.addSampler(s).addChannel(doc.createAnimationChannel().setTargetNode(tr.node).setTargetPath(tr.path).setSampler(s));
  }
}
for (const c of src.listChannels()) c.dispose();
for (const s of src.listSamplers()) s.dispose();
src.dispose();

// ------------------------------------------------------ textures, pack --
await doc.transform(
  textureCompress({ encoder: sharp, targetFormat: 'jpeg', quality: 86, resize: [1024, 1024], slots: /^(baseColor|normal)Texture$/ }),
  textureCompress({ encoder: sharp, targetFormat: 'jpeg', quality: 88, resize: [512, 512], slots: /^(metallicRoughness|occlusion)Texture$/ }),
  dedup(), prune(), reorder({ encoder: MeshoptEncoder, target: 'size' }),
  quantize({ pattern: /^(TEXCOORD_0|JOINTS_0|WEIGHTS_0)$/ }),
);
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
doc.getRoot().getAsset().extras = { ...doc.getRoot().getAsset().extras, derivative: 'The Abbey (gulun_adı): simplified, longer lower legs, metric, two clips; coat set at runtime' };
await io.write(OUT, doc);
const tris = prim.getIndices().getCount() / 3;
console.log(OUT, fs.statSync(OUT).size, 'bytes', tris, 'tris', prim.getAttribute('POSITION').getCount(), 'verts',
  R.listAnimations().map(a => `${a.getName()} ${a.listChannels().length}ch ${a.listSamplers()[0].getInput().getMax([])[0].toFixed(2)}s`).join(', '),
  R.listTextures().map(t => t.getMimeType() + ' ' + t.getSize().join('×') + ' ' + t.getImage().byteLength).join(', '));
