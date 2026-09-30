import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { boxUV, clean, merge, place, TAU } from '../../core/kit.js';

// Sculpted props: organic forms made once from dense meshes displaced by
// noise and shaping fields, so weathered stones, skulls and bones read as
// carved or grown shapes rather than boxes and spheres. Every function
// returns a non-indexed geometry with smooth normals and metre UVs, ready
// for the builders' Batch (kit.js).

// --- noise -------------------------------------------------------------------
function hash3(x, y, z, s) {
  let h = (Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 2147483647) ^ Math.imul(s | 0, 1274126177)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function noise3(x, y, z, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const u = x - xi, v = y - yi, w = z - zi;
  const f = t => t * t * (3 - 2 * t), fu = f(u), fv = f(v), fw = f(w);
  let r = 0;
  for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) for (let dz = 0; dz < 2; dz++) {
    r += hash3(xi + dx, yi + dy, zi + dz, s) * (dx ? fu : 1 - fu) * (dy ? fv : 1 - fv) * (dz ? fw : 1 - fw);
  }
  return r * 2 - 1;
}
export function fbm3(x, y, z, s = 0, oct = 4) {
  let a = 0.5, t = 0, f = 1;
  for (let i = 0; i < oct; i++) { t += a * noise3(x * f, y * f, z * f, s + i * 17); f *= 2.03; a *= 0.5; }
  return t;
}
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

// displace an indexed geometry vertex by vertex, then smooth normals
export function sculpt(geo, fn, uvScale = 1) {
  let g = geo;
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g, 1e-5);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); fn(v); p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals();
  return boxUV(g, uvScale);
}

// --- stones --------------------------------------------------------------------
// A weathered block: rounded arrises, a soft uneven face, bites out of the
// edges, and a top cut to shape ('round', 'gable', 'flat', 'cross').
export function stone(w, h, d, { seed = 1, top = 'round', wear = 1, chips = 3, lean = 0 } = {}) {
  const r = rng(seed);
  const seg = Math.min(4, Math.max(2, Math.round(Math.max(w, h, d) / 0.3)));
  const base = new RoundedBoxGeometry(w, h, d, seg, Math.min(d * 0.45, 0.03 + 0.03 * wear));
  const bites = Array.from({ length: chips }, () => ({ x: (r() - 0.5) * w, y: (0.2 + r() * 0.8) * h - h / 2, z: (r() < 0.5 ? -1 : 1) * d / 2, s: (0.03 + r() * 0.05) * (0.6 + wear * 0.6) }));
  return sculpt(base, q => {
    // head of the stone
    const yt = q.y + h / 2;
    if (top === 'round') { const k = Math.min(1, Math.abs(q.x) / (w / 2)); const cap = h - (w / 2) * (1 - Math.sqrt(Math.max(0, 1 - k * k))) * 0.55; if (yt > h - w * 0.3) q.y = Math.min(q.y, cap - h / 2); }
    else if (top === 'gable') { const cap = h - Math.abs(q.x) / (w / 2) * w * 0.28; q.y = Math.min(q.y, cap - h / 2); }
    // weathering: a soft uneven surface, stronger with age
    const n = fbm3(q.x * 7, q.y * 7, q.z * 7, seed, 4) * 0.012 * wear + fbm3(q.x * 30, q.y * 30, q.z * 30, seed + 3, 2) * 0.003 * wear;
    const len = Math.hypot(q.x / w, q.y / h, q.z / d) || 1;
    q.x += (q.x / w / len) * n * 1.6; q.z += (q.z / d / len) * n * 3; q.y += (q.y / h / len) * n;
    for (const b of bites) {
      const dd = Math.hypot(q.x - b.x, q.y - b.y, (q.z - b.z) * 1.5);
      if (dd < b.s) { const k = 1 - dd / b.s; q.z -= Math.sign(q.z || 1) * k * k * b.s * 0.5; }
    }
    // a lean, from ground frost
    q.x += q.y * lean;
  }, 1).translate(0, h / 2, 0);
}
// A clipped box hedge from a to b (plan points), footed at y0: rounded
// shoulders, a lumpy top where the shears missed, sides that bulge and
// thin, gaps near the ground where the stems show
export function hedgeRun(a, b, y0, h, w, { seed = 1 } = {}) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const base = new RoundedBoxGeometry(L + w * 0.3, h, w, 3, Math.min(w * 0.42, h * 0.4));
  const segs = new THREE.BoxGeometry(L + w * 0.3, h, w, Math.max(3, Math.round(L / 0.2)), 4, 3);
  void base;
  const g = sculpt(segs, q => {
    const yt = (q.y + h / 2) / h;                         // 0 foot .. 1 top
    // round the top shoulders
    const side = Math.abs(q.z) / (w / 2);
    if (yt > 0.6) { const k = (yt - 0.6) / 0.4; q.z *= 1 - 0.28 * k * k; q.y -= 0.08 * h * k * side * side; }
    // lumps, stronger on the top and the upper sides; thinner at the foot
    const n = fbm3(q.x * 3.2, q.y * 3.2, q.z * 3.2, seed, 3), fine = fbm3(q.x * 11, q.y * 11, q.z * 11, seed + 5, 2);
    const out = 0.035 * n + 0.012 * fine;
    q.z += Math.sign(q.z || 1) * out * (0.5 + 0.5 * yt) - Math.sign(q.z || 1) * 0.04 * (1 - Math.min(1, yt / 0.25));
    q.y += (yt > 0.9 ? 0.05 * n + 0.015 * fine : 0);
    // a slight wander of height along the run
    q.y += 0.04 * fbm3(q.x * 0.6, 0, 0, seed + 9, 2) * yt;
  }, 1).translate(0, h / 2, 0);
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  return place(g, { x: (a[0] + b[0]) / 2, y: y0, z: (a[1] + b[1]) / 2, ry: -ang });
}

// A grain sack of coarse sacking: a rounded box body settling wider at the
// base under its load, the shoulders slumped, the mouth gathered and tied
// (or folded over), creases where the cloth is slack. `fill` 0.6..1.
// Local: base on y = 0, width along x, depth along z.
export function sack(seed = 1, { w = 0.5, d = 0.36, h = 0.72, fill = 0.9, tied = true } = {}) {
  const r = rng(seed);
  const g = new THREE.BoxGeometry(w, h, d, 5, 8, 4);
  const lean = (r() - 0.5) * 0.12, twist = (r() - 0.5) * 0.35;
  return sculpt(g, q => {
    const t = (q.y + h / 2) / h;                               // 0 base .. 1 mouth
    // round the box: superellipse cross-section, the corners taken in
    const ax = q.x / (w / 2), az = q.z / (d / 2), m = Math.max(Math.abs(ax), Math.abs(az));
    const round = m > 0 ? Math.pow(Math.pow(Math.abs(ax), 3.2) + Math.pow(Math.abs(az), 3.2), 1 / 3.2) / m : 1;
    let k = 1 / Math.max(0.6, round);
    // the load: fuller low down, slumped shoulders, a neck gathered at the top
    const belly = 1 + 0.12 * Math.sin(Math.PI * Math.min(1, t / 0.75)) * fill - 0.06 * (1 - fill);
    const neck = t > 0.78 ? 1 - (tied ? 0.72 : 0.35) * Math.pow((t - 0.78) / 0.22, 1.3) : 1;
    k *= belly * neck * (1 + 0.06 * (1 - t));
    // slack cloth: creases, stronger toward the top of a part-filled sack
    const n = fbm3(q.x * 9, q.y * 7, q.z * 9, seed, 3);
    const crease = 0.02 * n * (0.4 + (1 - fill) * 1.4 + t);
    q.x = q.x * k + Math.sign(q.x || 1) * crease; q.z = q.z * k + Math.sign(q.z || 1) * crease;
    // the top settles: height lost with the fill, the mouth flopping over
    q.y = (q.y + h / 2) * (0.82 + 0.18 * fill) - (t > 0.85 ? 0.03 * (1 - fill) * Math.sin(q.x * 9) : 0);
    // flattened on the floor where the weight sits
    if (t < 0.08) { q.y = Math.max(0, q.y - 0.01); const s = 1 + 0.08 * (1 - t / 0.08); q.x *= s; q.z *= s; }
    // a lean and a slight twist
    const c = Math.cos(twist * t), sn = Math.sin(twist * t), x0 = q.x;
    q.x = x0 * c - q.z * sn + lean * q.y; q.z = x0 * sn + q.z * c;
  }, 2.2);
}

// A bunch of herbs hung to dry, head down: the stems gathered in a tie at
// the top, splaying and drooping, their shrivelled leaves in clumps along
// them. Returns { stems, leaves, tie } (hang point at y = 0, hanging down).
export function herbBundle(seed = 1, { n = 9, L = 0.42 } = {}) {
  const r = rng(seed), stems = [], leaves = [];
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, spread = 0.05 + r() * 0.12, len = L * (0.75 + r() * 0.4);
    const tip = new THREE.Vector3(Math.cos(a) * spread, -len, Math.sin(a) * spread);
    const st = new THREE.CylinderGeometry(0.0035, 0.005, len, 4, 1, true);
    st.translate(0, -len / 2, 0);
    const dir = tip.clone().normalize(), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    st.applyQuaternion(q); stems.push(st);
    for (let k = 0; k < 4; k++) {
      const t = 0.3 + k * 0.18 + r() * 0.08, p = tip.clone().multiplyScalar(t);
      const lf = new THREE.IcosahedronGeometry(0.018 + r() * 0.02, 0);
      lf.scale(1.4, 0.7 + r() * 0.8, 1.1); lf.rotateY(r() * TAU); lf.rotateZ((r() - 0.5) * 1.2);
      lf.translate(p.x + (r() - 0.5) * 0.02, p.y, p.z + (r() - 0.5) * 0.02); leaves.push(lf);
    }
  }
  const tie = new THREE.CylinderGeometry(0.018, 0.02, 0.035, 6); tie.translate(0, -0.03, 0);
  return { stems: merge(stems), leaves: merge(leaves), tie };
}

// a rough stone cross, as cut by the abbey's masons
export function stoneCross(h, { seed = 1, wear = 0.5 } = {}) {
  const r = rng(seed);
  const t = 0.1 + r() * 0.04, arm = 0.42 + r() * 0.14, ay = h * (0.62 + r() * 0.08);
  const shaft = stone(t * 1.3, h, t, { seed, top: 'flat', wear, chips: 1 });
  const bar = stone(arm, t * 1.1, t * 0.95, { seed: seed + 9, top: 'flat', wear, chips: 1 });
  bar.translate(0, ay - t * 0.55, 0);
  return merge([shaft, bar]);
}
// two riven beams lashed together
export function woodCross(h, { seed = 1 } = {}) {
  const r = rng(seed);
  const mk = (len, s) => {
    const g = new THREE.BoxGeometry(0.075, len, 0.06, 1, Math.max(2, Math.round(len / 0.1)), 1);
    return sculpt(g, q => { q.x += fbm3(0, q.y * 3, 0, s) * 0.012; q.z += fbm3(q.y * 4, 0, 0, s + 1) * 0.008; }, 1);
  };
  const shaft = mk(h, seed).translate(0, h / 2, 0);
  const bar = mk(0.5 + r() * 0.12, seed + 5); bar.rotateZ(Math.PI / 2 + (r() - 0.5) * 0.08); bar.translate(0, h * 0.72, 0.035);
  return merge([shaft, bar]);
}
// a flat grave slab, cracked and sunk at one end
export function slab(w, l, t, { seed = 1, wear = 1, tilt = 0.03 } = {}) {
  const g = stone(w, t, l, { seed, top: 'flat', wear, chips: 4 });
  g.rotateX(tilt);
  return g;
}
// the low loaf of a grave: flat-topped, lumpy with clods, its edge sinking
// under the surrounding ground so no seam shows
export function mound(w, l, h, { seed = 1, res = h < 0.05 ? 0.45 : 1 } = {}) {
  const g = new THREE.PlaneGeometry(1, 1, Math.max(4, Math.round(10 * res)), Math.max(6, Math.round(20 * res)));
  g.rotateX(-Math.PI / 2);
  return sculpt(g, q => {
    const u = q.x * 2, v = q.z * 2;   // -1..1
    const e = Math.pow(Math.abs(u), 2.4) + Math.pow(Math.abs(v), 4);
    const body = e < 1 ? Math.pow(1 - e, 0.45) : 0;
    const clod = fbm3(q.x * 9, q.z * 9, 0, seed, 3) * 0.35 + fbm3(q.x * 26, q.z * 26, 3, seed, 2) * 0.12;
    q.y = h * body * (0.85 + clod) - 0.05 * (1 - body);
    q.x *= w * 1.12; q.z *= l * 1.08;
  }, 1);
}

// straw strewn on a floor: a flat patch, slightly raised off the boards;
// the 'p.strew' texture thins raggedly to nothing toward its edge, so the
// strands fade into bare boards instead of ending on a polygon outline
export function strew(w, l) {
  const g = new THREE.PlaneGeometry(w, l, 1, 1);
  g.rotateX(-Math.PI / 2);
  return g.translate(0, 0.012, 0);
}

// --- bones -------------------------------------------------------------------
// A human skull without its jaw, facing +z, about 19 x 14 x 13 cm: a dense
// sphere shaped by fields — the long vault of the cranium, flat face,
// deep orbits, the nasal aperture, cheek bones, temporal hollows, the
// upper row of teeth, the flat base on which the pyramids of the ossuary
// rest. Variation per seed (proportions, wear).
let SKULL_BASE = null;
function field(dir, c, sx, sy) {
  // gaussian influence of a spot on the unit sphere (elliptical)
  const dx = (dir.x - c[0]) / sx, dy = (dir.y - c[1]) / sy, dz = (dir.z - c[2]) / Math.max(sx, sy);
  return Math.exp(-(dx * dx + dy * dy + dz * dz));
}
export function skull({ seed = 1, detail = 1 } = {}) {
  const r = rng(seed);
  const ws = detail > 0.5 ? 22 : 12, hs = detail > 0.5 ? 16 : 9;
  const g = new THREE.SphereGeometry(1, ws, hs);
  const L = 0.095 * (0.94 + r() * 0.1), W = 0.07 * (0.93 + r() * 0.12), H = 0.072 * (0.94 + r() * 0.1);
  const wear = r();
  const d = new THREE.Vector3();
  return sculpt(g, q => {
    d.copy(q).normalize();
    let rad = 1;
    // orbits, nasal aperture: carved in
    rad -= 0.55 * (field(d, [0.36, 0.02, 0.9], 0.19, 0.16) + field(d, [-0.36, 0.02, 0.9], 0.19, 0.16));
    rad -= 0.34 * field(d, [0, -0.28, 0.95], 0.09, 0.16);
    // cheek bones and the brow ridge: raised
    rad += 0.12 * (field(d, [0.72, -0.25, 0.62], 0.2, 0.14) + field(d, [-0.72, -0.25, 0.62], 0.2, 0.14));
    rad += 0.05 * field(d, [0, 0.22, 0.95], 0.55, 0.08);
    // temples hollowed
    rad -= 0.09 * (field(d, [0.95, -0.05, 0.2], 0.25, 0.28) + field(d, [-0.95, -0.05, 0.2], 0.25, 0.28));
    // the upper jaw pushed forward, with its teeth
    const jaw = field(d, [0, -0.62, 0.78], 0.38, 0.14);
    rad += 0.1 * jaw;
    if (d.y < -0.48 && d.y > -0.72 && d.z > 0.35) rad += jaw * 0.05 * Math.abs(Math.sin(Math.atan2(d.x, d.z) * 12));
    // the face is flatter than the vault, the back of the head fuller
    let x = d.x * W * rad, y = d.y * H * rad, z = d.z * L * rad;
    // the face narrows below the cheekbones; the vault rises and runs back
    if (d.y < -0.2 && d.z > 0) x *= 1 - 0.28 * Math.min(1, (-d.y - 0.2) * 1.6) * d.z;
    if (d.y > 0.1) y *= 1.08;
    if (d.z > 0.2) z *= 1 - 0.18 * (d.z - 0.2);
    if (d.z < -0.2) y += 0.012 * (-d.z - 0.2);
    // the base
    if (y < -H * 0.62) y = -H * 0.62 - (y + H * 0.62) * 0.15;
    const n = fbm3(x * 60, y * 60, z * 60, seed, 3) * 0.0022 * (0.6 + wear);
    x += d.x * n; y += d.y * n; z += d.z * n;
    q.set(x, y + H * 0.62, z);
  }, 6);
}
// the dark inside of orbits and nose, placed behind the carved openings
export function skullShadows() {
  const parts = [];
  // squarish orbits and the pear-shaped nasal aperture, set just inside the bone
  for (const s of [-1, 1]) { const e = new THREE.SphereGeometry(0.02, 8, 6); e.scale(1.15, 0.9, 0.55); e.rotateZ(s * 0.25); e.translate(s * 0.025, 0.046, 0.058); parts.push(e); }
  const n = new THREE.SphereGeometry(0.011, 6, 4); n.scale(0.8, 1.7, 0.6); n.translate(0, 0.022, 0.066); parts.push(n);
  return merge(parts);
}
// a long bone (femur-like), lying along +x, ~len m, knobbed ends
export function longBone(len = 0.44, { seed = 1 } = {}) {
  const r = rng(seed);
  const shaft = 0.012 + r() * 0.004, knob = shaft * (2.2 + r() * 0.5);
  // knobbed ends (head, condyles) on a slightly bowed shaft
  const end = [[0.003, 0], [knob * 0.8, 0.006], [knob, 0.024], [knob * 0.72, 0.048], [shaft * 1.15, 0.09]];
  const prof = [...end.map(([a, b]) => [a, b]), [shaft * 0.95, len / 2], ...end.slice().reverse().map(([a, b]) => [a * (0.9 + r() * 0.1), len - b])]
    .map(([a, b]) => new THREE.Vector2(a, b));
  const g = new THREE.LatheGeometry(prof, 6);
  const out = sculpt(g, q => {
    // the head and condyles: the ends swell to one side
    const t = q.y / len;
    if (t < 0.1 || t > 0.9) { q.x *= 1.3; }
    q.x += fbm3(q.y * 20, 0, 0, seed) * 0.002; q.z += Math.sin(t * Math.PI) * 0.01;
  }, 6);
  out.rotateZ(-Math.PI / 2);
  return out;
}
// small bones of hands and feet
export function smallBone(len = 0.04, { seed = 1 } = {}) {
  const r = rng(seed), rr = 0.004 + r() * 0.002;
  const prof = [[0.001, 0], [rr * 1.6, 0.004], [rr, len * 0.3], [rr, len * 0.7], [rr * 1.5, len - 0.004], [0.001, len]].map(([a, b]) => new THREE.Vector2(a, b));
  const g = clean(new THREE.LatheGeometry(prof, 4));
  g.rotateZ(-Math.PI / 2);
  return g;
}

export { place };
