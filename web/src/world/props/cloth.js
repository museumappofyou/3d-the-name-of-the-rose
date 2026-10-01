import * as THREE from 'three';
import { sculpt, fbm3, noise3, rng } from './sculpt.js';
import { lathe, merge, cyl, box, place, TAU, clean } from '../../core/kit.js';

// Cloth, vessels and small household things with real form: sheets that
// lie over a mattress and fall at its sides, rumpled blankets, heavy
// curtains hung in folds from a pole, stave tubs, jugs with handles,
// flasks and bowls. Geometry only; builders choose the materials.

// A sheet or blanket laid over a w x l block whose top is at `top`, hanging
// `hang` over each side and ending `floor` above the ground; rumpled.
export function drape(w, l, top, { hang = 0.2, seed = 1, rumple = 1, foot = true, head = false, floor = 0.02 } = {}) {
  const W = w + 2 * hang, L = l + (foot ? hang : 0) + (head ? hang : 0);
  const g = new THREE.PlaneGeometry(W, L, Math.max(8, Math.round(W / 0.05)), Math.max(12, Math.round(L / 0.06)));
  g.rotateX(-Math.PI / 2);
  const z0 = head ? -l / 2 - hang : -l / 2, shiftZ = (z0 + (foot ? l / 2 + hang : l / 2)) / 2;
  g.translate(0, 0, shiftZ);
  return sculpt(g, q => {
    // distance beyond the edge of the block in x and z
    const ex = Math.max(0, Math.abs(q.x) - w / 2), ez = Math.max(0, q.z - l / 2) + Math.max(0, -l / 2 - q.z);
    const over = Math.hypot(ex, ez);
    const n = fbm3(q.x * 5, q.z * 5, 0, seed, 3), fine = fbm3(q.x * 14, q.z * 14, 1, seed, 2);
    if (over <= 0) {
      q.y = top + (0.012 + 0.02 * n + 0.006 * fine) * rumple;
    } else {
      // the cloth rounds the edge and falls, with vertical folds
      const round = Math.min(over, 0.03);
      const fall = Math.min(top - floor, (over - round) * 1.08);
      q.y = top + 0.01 - round * 0.6 - fall;
      // folds: two wavelengths, irregular in phase and depth, deepening as
      // the cloth falls (a hem hangs in soft flutes, not a pleated skirt)
      const along = ex > ez ? q.z : q.x;
      const fold = (Math.sin(along * 17 + n * 4) * 0.6 + Math.sin(along * 7.3 + fine * 3 + seed) * 0.4) * (0.01 + 0.02 * (0.5 + 0.5 * n)) * Math.min(1, fall / 0.08) * (0.6 + Math.min(1, fall / 0.4)) * Math.max(0.5, rumple);
      // push out along the direction away from the block (rounded at the corners)
      const out = Math.min(over, 0.035) + fold, dx = Math.sign(q.x) * ex / over, dz = Math.sign(q.z) * ez / over;
      if (ex > 0) q.x = Math.sign(q.x) * w / 2 + dx * out;
      if (ez > 0) q.z = (q.z > 0 ? l / 2 : -l / 2) + dz * out;
    }
  }, 1);
}
// a folded-back blanket: thicker, lumpy, lying across part of the bed
export function blanket(w, l, top, { seed = 3, hang = 0.12 } = {}) {
  const g = drape(w, l, top + 0.02, { hang, seed, rumple: 2.2, foot: true });
  return g;
}
export function pillow(w = 0.55, l = 0.34, h = 0.1, { seed = 5 } = {}) {
  const g = new THREE.SphereGeometry(1, 16, 10);
  return sculpt(g, q => {
    const n = fbm3(q.x * 2, q.y * 2, q.z * 2, seed, 2);
    q.x *= w / 2 * (1 - 0.15 * q.y * q.y); q.z *= l / 2; q.y *= h / 2 * (1 + 0.25 * n);
    // squared-off corners of a stuffed sack
    const k = Math.abs(q.x) / (w / 2) + Math.abs(q.z) / (l / 2);
    if (k > 1.25) q.y *= 0.6;
    q.y += h / 2;
  }, 2);
}
// a straw mattress: a lumpy sack, flatter than it is wide
export function mattress(w, l, h, { seed = 7 } = {}) {
  const g = new THREE.BoxGeometry(w, h, l, 8, 2, 16);
  return sculpt(g, q => {
    const ux = q.x / (w / 2), uz = q.z / (l / 2), uy = q.y / (h / 2);
    const edge = Math.max(Math.abs(ux), Math.abs(uz));
    const n = fbm3(q.x * 4, q.z * 4, 0, seed, 3);
    if (uy > 0) q.y = h / 2 * (0.6 + 0.4 * (1 - Math.pow(edge, 6))) + n * 0.02;
    q.x *= 1 - 0.06 * Math.abs(uy); q.z *= 1 - 0.03 * Math.abs(uy);
    q.y += h / 2;
  }, 1.5);
}
// a heavy curtain hung from a pole, in soft vertical folds, the hem uneven
export function curtain(w, h, { seed = 11, folds = null, depth = 0.06, gather = 1 } = {}) {
  const nf = folds ?? Math.max(3, Math.round(w / 0.32));
  const g = new THREE.PlaneGeometry(w, h, Math.max(24, nf * 8), 16);
  g.translate(0, h / 2, 0);
  const r = rng(seed), ph = r() * 6;
  const out = sculpt(g, q => {
    // folds of uneven width, deeper toward the hem, the cloth hanging a
    // little askew where it was last pushed aside
    const t = q.x / w * nf * TAU + ph + 1.6 * fbm3(q.x * 1.3, 0, 0, seed + 5, 2);
    const down = 1 - q.y / h;
    const amp = depth * (0.6 + 0.7 * down) * gather * (0.7 + 0.6 * (0.5 + 0.5 * noise3(q.x * 2.2, 0, 0, seed + 9)));
    q.z += Math.sin(t) * amp + fbm3(q.x * 3, q.y * 2, 0, seed, 2) * 0.03 * down;
    q.x += Math.cos(t) * amp * 0.25;
    if (q.y < 0.05) q.y += (noise3(q.x * 6, 0, 0, seed) * 0.5 + 0.5) * 0.06;
  }, 1);
  return out;
}
export function pole(w, r = 0.025) { const g = cyl(r, r, w, 8, {}); g.rotateZ(Math.PI / 2); return g; }
// clothes thrown down in a heap on the floor: a low lumpy mound creased
// into folds, one sleeve or hem trailing out at the edge
export function heap(w = 0.7, l = 0.55, h = 0.16, { seed = 13 } = {}) {
  const g = new THREE.PlaneGeometry(w * 1.5, l * 1.5, 26, 22);
  g.rotateX(-Math.PI / 2);
  const r = rng(seed), ta = r() * TAU;
  return sculpt(g, q => {
    const u = q.x / (w * 0.75), v = q.z / (l * 0.75);
    // a trailing lobe (the sleeve) out along one direction
    const a = Math.atan2(v, u), lobe = Math.pow(Math.max(0, Math.cos(a - ta)), 6) * 0.45;
    const d = Math.hypot(u, v) / (1 + lobe + 0.18 * fbm3(Math.cos(a) * 2, Math.sin(a) * 2, 0, seed, 2));
    const body = d < 1 ? Math.pow(1 - d * d, 0.8) : 0;
    const crease = Math.abs(Math.sin(q.x * 17 + fbm3(q.x * 3, q.z * 3, 0, seed + 2, 2) * 5)) * 0.25 + fbm3(q.x * 9, q.z * 9, 4, seed, 3) * 0.3;
    q.y = 0.004 + h * body * (0.7 + crease) * (1 - lobe * 0.6);
  }, 1);
}
// a garment (cowl, scapular or towel) hung by its middle from a peg: the
// cloth gathered to a point at the top and falling in folds, open at the hem
export function hanging(w = 0.5, h = 1.1, { seed = 17, depth = 0.05 } = {}) {
  const g = new THREE.PlaneGeometry(w, h, 12, 12);
  g.translate(0, -h / 2, 0);
  return sculpt(g, q => {
    const t = Math.min(1, Math.max(0, -q.y / h));   // 0 at the peg, 1 at the hem
    const pinch = 0.5 + 0.5 * Math.pow(t, 0.35);   // gathered where it hangs over the peg
    q.x *= pinch;
    q.z += Math.sin(q.x / Math.max(pinch, 0.2) * 13 + seed) * depth * t + fbm3(q.x * 4, q.y * 3, 0, seed, 2) * 0.03 * t + 0.02 * Math.pow(t, 0.4);
    if (t > 0.95) q.y -= (noise3(q.x * 8, 0, 0, seed) * 0.5 + 0.5) * 0.04;
  }, 1);
}

// --- vessels (profiles in metres, revolved) --------------------------------
// a stave tub of the baths: tapered wall of thick boards, two iron hoops
export function tub(r = 0.72, h = 0.75) {
  const wall = lathe([[0, 0], [r * 0.92, 0], [r, h * 0.05], [r * 1.08, h], [r * 1.03, h], [r * 0.96, h * 0.1], [0, h * 0.1]], 32);
  // staves: a slight ribbing of the outer face
  const p = wall.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), rr = Math.hypot(x, z);
    if (rr > r * 0.9) { const k = 1 + 0.008 * Math.cos(a * 22 * 2); p.setX(i, x * k); p.setZ(i, z * k); }
  }
  wall.computeVertexNormals();
  const hoops = merge([h * 0.22, h * 0.78].map(y => cyl(r * (1.0 + y / h * 0.08) + 0.012, r * (1.0 + y / h * 0.08) + 0.012, 0.045, 32, { y }, true)));
  return { wall, hoops, waterY: h * 0.72, waterR: r * 0.98 };
}
// a vat of earthenware: broad shoulder, thick rolled rim, inner wall
export function vat(r = 0.85, h = 1.6) {
  const out = [[0, 0], [r * 0.52, 0], [r * 0.82, h * 0.22], [r, h * 0.52], [r * 0.95, h * 0.78], [r * 0.72, h * 0.93], [r * 0.7, h * 0.97], [r * 0.76, h * 0.99], [r * 0.78, h * 1.02], [r * 0.72, h * 1.045], [r * 0.64, h * 1.03], [r * 0.62, h * 0.97], [r * 0.66, h * 0.9], [r * 0.86, h * 0.72], [r * 0.9, h * 0.5], [r * 0.74, h * 0.25], [r * 0.45, h * 0.08], [0, h * 0.08]];
  const g = lathe(out, 40);
  // a hand-thrown irregularity
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x);
    const k = 1 + 0.018 * Math.sin(a * 3 + y * 2) + 0.01 * noise3(Math.cos(a) * 3, y * 4, Math.sin(a) * 3, 9);
    p.setX(i, x * k); p.setZ(i, z * k);
  }
  g.computeVertexNormals();
  return g;
}
export function jug(s = 1, { handle = true } = {}) {
  const prof = [[0, 0], [0.06, 0], [0.08, 0.02], [0.1, 0.08], [0.105, 0.13], [0.085, 0.19], [0.05, 0.23], [0.045, 0.26], [0.055, 0.29], [0.05, 0.3], [0.04, 0.28], [0.035, 0.2], [0, 0.2]].map(([a, b]) => [a * s, b * s]);
  const parts = [lathe(prof, 16)];
  if (handle) {
    const t = new THREE.TorusGeometry(0.06 * s, 0.011 * s, 6, 12, Math.PI * 1.1);
    t.rotateY(Math.PI / 2); t.rotateX(-0.2); t.translate(0, 0.21 * s, -0.085 * s);
    parts.push(clean(t));
  }
  return merge(parts);
}
export function flask(s = 1) {
  return lathe([[0, 0], [0.05, 0], [0.075, 0.03], [0.08, 0.07], [0.06, 0.11], [0.022, 0.14], [0.018, 0.22], [0.024, 0.23], [0, 0.23]].map(([a, b]) => [a * s, b * s]), 14);
}
export function albarello(s = 1) {
  return lathe([[0, 0], [0.06, 0], [0.065, 0.02], [0.055, 0.05], [0.052, 0.15], [0.062, 0.19], [0.05, 0.21], [0.052, 0.225], [0, 0.225]].map(([a, b]) => [a * s, b * s]), 14);
}
export function bowl(r = 0.1, h = 0.05) {
  return lathe([[0, 0], [r * 0.5, 0], [r * 0.85, h * 0.4], [r, h], [r * 0.93, h], [r * 0.78, h * 0.45], [r * 0.4, h * 0.2], [0, h * 0.2]], 18);
}
export function bucket(r = 0.17, h = 0.3) {
  const w = lathe([[0, 0], [r * 0.9, 0], [r, h], [r * 0.93, h], [r * 0.84, h * 0.08], [0, h * 0.08]], 18);
  const hoops = merge([0.25, 0.8].map(t => cyl(r * (0.9 + 0.1 * t) + 0.006, r * (0.9 + 0.1 * t) + 0.006, 0.02, 18, { y: h * t }, true)));
  const t = new THREE.TorusGeometry(r, 0.006, 4, 16, Math.PI); t.translate(0, h, 0); t.rotateY(0.3);
  return { wood: w, iron: merge([hoops, clean(t)]) };
}
// a pestle-and-mortar of stone
export function mortar(s = 1) {
  const m = lathe([[0, 0], [0.09, 0], [0.1, 0.1], [0.085, 0.1], [0.06, 0.03], [0, 0.03]].map(([a, b]) => [a * s, b * s]), 16);
  const p = cyl(0.015 * s, 0.022 * s, 0.18 * s, 8, {}); p.rotateZ(0.5); p.translate(0.03 * s, 0.08 * s, 0);
  return merge([m, p]);
}

export { place, box };
