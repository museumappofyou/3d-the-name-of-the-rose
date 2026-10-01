// Reference bone positions for fitted task clips, computed directly from the
// normalized GLB (independent of any engine importer). The Godot test
// tests/pose_check.gd evaluates the same clips/times through its imported
// Skeleton3D/AnimationPlayer and must agree within tolerance.
//
//   node scripts/migration/pose_reference.mjs alinardo [more ids...]
// -> shared/data/manifests/pose_reference_<id>.json
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const BONES = ['pelvis', 'spine_03', 'head', 'hand_l', 'hand_r', 'foot_l', 'foot_r', 'ball_l', 'ball_r', 'calf_l', 'thigh_r'];

for (const id of process.argv.slice(2).length ? process.argv.slice(2) : ['alinardo']) {
  const file = path.join(ROOT, `native/assets/characters/${id}/${id}.glb`);
  const doc = await io.read(file);
  const root = doc.getRoot();
  const person = root.listScenes()[0].listChildren().find(n => n.getName() === id);
  const out = { schema_version: 1, person: id, source: path.relative(ROOT, file), frame: 'person root (model space, metres)', bones: BONES, clips: {} };
  for (const a of root.listAnimations()) {
    const dur = Math.max(...a.listSamplers().map(s => s.getInput().getMax([0])[0]));
    const times = [1 / 24, Math.round(dur * 12) / 24, Math.round(dur * 18) / 24].map(t => +t.toFixed(6));
    out.clips[a.getName()] = { duration: dur, samples: {} };
    for (const t of times) {
      const local = new Map();
      for (const ch of a.listChannels()) {
        const n = ch.getTargetNode(), s = ch.getSampler();
        const v = sample(s, t);
        const cur = local.get(n) || { t: n.getTranslation(), r: n.getRotation(), s: n.getScale() };
        if (ch.getTargetPath() === 'translation') cur.t = v; else if (ch.getTargetPath() === 'rotation') cur.r = v; else if (ch.getTargetPath() === 'scale') cur.s = v;
        local.set(n, cur);
      }
      const world = new Map();
      const walk = (n, parent) => {
        const L = local.get(n) || { t: n.getTranslation(), r: n.getRotation(), s: n.getScale() };
        const m = mul(parent, compose(L.t, L.r, L.s));
        world.set(n.getName(), m);
        for (const c of n.listChildren()) walk(c, m);
      };
      walk(person, ident());
      out.clips[a.getName()].samples[t] = Object.fromEntries(BONES.map(b => [b, world.get(b).slice(12, 15).map(x => +x.toFixed(5))]));
    }
  }
  const dst = path.join(ROOT, `shared/data/manifests/pose_reference_${id}.json`);
  fs.writeFileSync(dst, JSON.stringify(out, null, 1) + '\n');
  console.log('wrote', path.relative(ROOT, dst), Object.keys(out.clips).length, 'clips');
}

function sample(s, t) {
  const tin = s.getInput().getArray(), o = s.getOutput(), n = o.getElementSize();
  const val = i => Array.from(o.getArray().slice(i * n, i * n + n));
  if (t <= tin[0]) return val(0);
  if (t >= tin[tin.length - 1]) return val(tin.length - 1);
  let i = 0; while (i < tin.length - 1 && tin[i + 1] <= t) i++;
  if (s.getInterpolation() === 'STEP' || i === tin.length - 1) return val(i);
  const u = (t - tin[i]) / (tin[i + 1] - tin[i]), a = val(i), b = val(i + 1);
  if (n === 4) return slerp(a, b, u);
  return a.map((x, k) => x + (b[k] - x) * u);
}
function slerp(a, b, t) {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  if (d < 0) { b = b.map(x => -x); d = -d; }
  if (d > 0.9995) { const r = a.map((x, k) => x + (b[k] - x) * t); const l = Math.hypot(...r); return r.map(x => x / l); }
  const th = Math.acos(d), s = Math.sin(th), wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
  return a.map((x, k) => x * wa + b[k] * wb);
}
function ident() { return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; }
function compose(t, q, s) {
  const [x, y, z, w] = q, x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
  return [(1 - (yy + zz)) * s[0], (xy + wz) * s[0], (xz - wy) * s[0], 0, (xy - wz) * s[1], (1 - (xx + zz)) * s[1], (yz + wx) * s[1], 0, (xz + wy) * s[2], (yz - wx) * s[2], (1 - (xx + yy)) * s[2], 0, t[0], t[1], t[2], 1];
}
function mul(a, b) { // column-major a*b
  const r = new Array(16);
  for (let c = 0; c < 4; c++) for (let rr = 0; rr < 4; rr++) { let v = 0; for (let k = 0; k < 4; k++) v += a[k * 4 + rr] * b[c * 4 + k]; r[c * 4 + rr] = v; }
  return r;
}
