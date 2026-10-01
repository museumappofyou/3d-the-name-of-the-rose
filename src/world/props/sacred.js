import * as THREE from 'three';
import { box, cyl, lathe, merge, place, TAU, clean } from '../../core/kit.js';
import * as C from './cloth.js';

// Church plate and furniture of the treasury, altar and choir: a house-
// shaped reliquary (chasse) with its cresting and cabochons, chalices and a
// ciborium, an arm reliquary, the emerald jewel box, iron-bound chests,
// credence tables under cloths, and the carved choir stall.

export function chalice(s = 1) {
  return lathe([[0, 0], [0.07, 0], [0.075, 0.01], [0.03, 0.03], [0.012, 0.06], [0.022, 0.08], [0.012, 0.1], [0.012, 0.12], [0.05, 0.14], [0.058, 0.2], [0.054, 0.2], [0.045, 0.15], [0, 0.14]].map(([a, b]) => [a * s, b * s]), 20);
}
export function ciborium(s = 1) {
  return lathe([[0, 0], [0.06, 0], [0.02, 0.04], [0.015, 0.09], [0.06, 0.12], [0.065, 0.17], [0.06, 0.18], [0.02, 0.24], [0.012, 0.3], [0, 0.31]].map(([a, b]) => [a * s, b * s]), 18);
}
// a house-shaped reliquary: box, pitched lid, a cresting along the ridge,
// set with stones (returns { gold, stones })
export function chasse(w = 0.42, d = 0.2, h = 0.22) {
  const roof = new THREE.BufferGeometry();
  const r = h * 0.55, hw = w / 2 + 0.01, hd = d / 2 + 0.015;
  const P = [[-hw, 0, -hd], [hw, 0, -hd], [hw, r, 0], [-hw, r, 0], [-hw, 0, hd], [hw, 0, hd]];
  const tri = [0, 2, 1, 0, 3, 2, 4, 5, 2, 4, 2, 3, 0, 4, 3, 1, 2, 5];
  roof.setAttribute('position', new THREE.Float32BufferAttribute(tri.flatMap(i => P[i]), 3)); roof.computeVertexNormals();
  roof.translate(0, h, 0);
  const cresting = [];
  for (let k = 0; k <= 8; k++) cresting.push(box(0.012, 0.035 + (k % 2) * 0.02, 0.012, { x: -w / 2 + k * w / 8, y: h + r }));
  const gold = merge([box(w, h, d, {}), box(w + 0.03, 0.02, d + 0.03, {}), clean(roof), ...cresting, ...[-1, 1].flatMap(sx => [-1, 1].map(sz => box(0.025, 0.04, 0.025, { x: sx * (w / 2 - 0.01), y: -0.04, z: sz * (d / 2 - 0.01) })))]);
  const stones = [];
  for (let k = 0; k < 5; k++) for (const sz of [-1, 1]) { const g = new THREE.SphereGeometry(0.012, 8, 6); g.scale(1, 1.2, 0.5); g.translate(-w / 2 + 0.06 + k * (w - 0.12) / 4, h * 0.55, sz * (d / 2 + 0.004)); stones.push(clean(g)); }
  return { gold, stones: merge(stones) };
}
// the arm reliquary: a sleeved forearm raised in blessing
export function armReliquary(s = 1) {
  const sleeve = lathe([[0, 0], [0.07, 0], [0.075, 0.03], [0.05, 0.06], [0.045, 0.3], [0.05, 0.33], [0.04, 0.34], [0, 0.34]], 16);
  const hand = new THREE.BoxGeometry(0.06, 0.1, 0.03, 2, 3, 1); hand.translate(0, 0.39, 0);
  const fingers = [0, 1].map(k => box(0.014, 0.06, 0.016, { x: -0.012 + k * 0.024, y: 0.44 }));
  const g = merge([sleeve, clean(hand), ...fingers]); g.scale(s, s, s);
  return g;
}
// the jewel box "inlaid with emeralds and quartz" (returns { wood, gold, green, quartz })
export function jewelBox() {
  const wood = merge([box(0.36, 0.14, 0.24, {}), box(0.37, 0.05, 0.25, { y: 0.14 })]);
  const gold = merge([0.02, 0.12].map(y => box(0.365, 0.012, 0.245, { y })));
  const gem = (x, y, z, r) => { const g = new THREE.SphereGeometry(r, 8, 6); g.scale(1, 1, 0.5); g.translate(x, y, z); return clean(g); };
  const green = merge([-0.12, -0.04, 0.04, 0.12].map(x => gem(x, 0.075, 0.121, 0.016)));
  const quartz = merge([-0.08, 0, 0.08].map(x => { const g = gem(x, 0.19, 0, 0.018); g.rotateX(-Math.PI / 2); g.translate(0, 0.19 + 0.0, 0); return g; }));
  return { wood, gold, green, quartz };
}
// an iron-bound chest of boards, lid raised on its hinges
export function chest(w = 1.1, d = 0.55, h = 0.52, { open = 0 } = {}) {
  const body = merge([box(w, h, d, {}), box(w + 0.04, 0.05, d + 0.04, { y: 0 })]);
  const lid = merge([box(w + 0.03, 0.07, d + 0.03, {})]);
  lid.translate(0, 0, d / 2 + 0.015); lid.rotateX(-open); lid.translate(0, h, -d / 2 - 0.015);
  const straps = merge([-0.3, 0.3].map(k => box(0.05, h + 0.02, d + 0.03, { x: k * w })));
  const lstr = merge([-0.3, 0.3].map(k => box(0.05, 0.08, d + 0.05, { x: k * w })));
  lstr.translate(0, 0, d / 2 + 0.02); lstr.rotateX(-open); lstr.translate(0, h - 0.005, -d / 2 - 0.02);
  const lock = box(0.1, 0.12, 0.02, { y: h - 0.14, z: d / 2 + 0.012 });
  return { wood: merge([body, lid]), iron: merge([straps, lstr, lock]) };
}
// a credence table under a falling cloth
export function credence(w = 1.3, d = 0.65, h = 0.9) {
  const legs = merge([[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => box(0.07, h, 0.07, { x: sx * (w / 2 - 0.08), z: sz * (d / 2 - 0.08) })));
  const top = box(w, 0.05, d, { y: h - 0.05 });
  const cloth = C.drape(w, d, h + 0.002, { hang: 0.5, seed: Math.round(w * 97), rumple: 0.4, foot: true, head: true, floor: 0.12 });
  return { wood: merge([legs, top]), cloth };
}
// a choir stall of the monks: a raised seat with a hinged misericord, high
// panelled back, arm-rests with carved knobs, the canopy rail above; the
// desk (bookrest) of the row in front is built separately.
// Local: seat faces +z, width 0.62, origin on the floor at the seat centre.
export function stallRow(n, { w = 0.62, back = 2.3, platform = 0.25 } = {}) {
  const parts = [], carv = [];
  const L = n * w;
  parts.push(box(L + 0.1, platform, 1.1, { z: 0 }));                          // room for standing boots before the seat
  parts.push(box(L + 0.1, back, 0.06, { y: platform, z: -0.47 }));               // panelled back
  // canopy rail over a high back. On a low back (the lower choir row) the
  // rail is the bookboard of the row behind, so it lies behind the panel
  // (local z -0.70..-0.50): at z -0.5..-0.1 it hung over the row's own
  // seats at 1.15 m and met the seated monks' necks and forearms (placement
  // audit, pass 3). Seats, heights and the upper row are unchanged.
  if (back > 1.5) parts.push(box(L + 0.2, 0.1, 0.4, { y: platform + back, z: -0.3 }));
  else parts.push(box(L + 0.1, 0.05, 0.2, { y: platform + back, z: -0.6 }));
  for (let i = 0; i < n; i++) {
    const cx = -L / 2 + (i + 0.5) * w;
    parts.push(box(w - 0.06, 0.04, 0.42, { x: cx, y: platform + 0.44, z: -0.2 }));   // seat
    parts.push(box(w - 0.1, 0.1, 0.05, { x: cx, y: platform + 0.36, z: 0.0 }));       // misericord ledge
    parts.push(box(w - 0.08, 0.36, 0.035, { x: cx, y: platform, z: 0.0 }));          // front below the seat
    // panel mouldings on the back
    carv.push(box(w - 0.14, 0.02, 0.02, { x: cx, y: platform + 1.1, z: -0.43 }), box(w - 0.14, 0.02, 0.02, { x: cx, y: platform + 1.9, z: -0.43 }));
    carv.push(box(0.02, 0.8, 0.02, { x: cx - w / 2 + 0.07, y: platform + 1.1, z: -0.43 }), box(0.02, 0.8, 0.02, { x: cx + w / 2 - 0.07, y: platform + 1.1, z: -0.43 }));
  }
  // the high backs are carved with an arcade, one round arch on colonettes
  // over each monk, and the canopy rail with a cresting of little arches
  if (back > 1.5) for (let i = 0; i < n; i++) {
    const cx = -L / 2 + (i + 0.5) * w, ar = w / 2 - 0.07;
    for (const sx of [-1, 1]) {
      carv.push(cyl(0.018, 0.018, 0.62, 8, { x: cx + sx * ar, y: platform + 1.12, z: -0.42 }));
      carv.push(box(0.05, 0.035, 0.04, { x: cx + sx * ar, y: platform + 1.1, z: -0.42 }), box(0.05, 0.035, 0.04, { x: cx + sx * ar, y: platform + 1.73, z: -0.42 }));
    }
    const t = clean(new THREE.TorusGeometry(ar, 0.02, 5, 14, Math.PI)); t.translate(cx, platform + 1.765, -0.42); carv.push(t);
    const t2 = clean(new THREE.TorusGeometry(0.06, 0.012, 4, 10, Math.PI)); t2.translate(cx, platform + back + 0.1, -0.1); carv.push(t2);
    carv.push(clean(new THREE.SphereGeometry(0.025, 6, 4)).translate(cx - w / 2, platform + back + 0.12, -0.1));
  }
  // the carved cheeks closing each row, rising in a scroll
  for (const sx of [-1, 1]) {
    const ch = Math.min(back, 0.76);
    parts.push(box(0.07, ch, 0.62, { x: sx * (L / 2 + 0.04), y: platform, z: -0.18 }));
    const sc = clean(new THREE.TorusGeometry(0.13, 0.035, 6, 14, Math.PI * 1.4)); sc.rotateY(Math.PI / 2); sc.translate(sx * (L / 2 + 0.04), platform + ch, 0.0); carv.push(sc);
  }
  for (let i = 0; i <= n; i++) {
    const x = -L / 2 + i * w;
    // An armrest is above the seat, below a seated shoulder. The old 1.05 m
    // panel reached through the elbows of coherent adult bodies in every
    // stall; 0.76 m leaves the forearms resting above the carved divider.
    parts.push(box(0.07, 0.76, 0.48, { x, y: platform, z: -0.22 }));
    const knob = new THREE.SphereGeometry(0.055, 10, 8); knob.scale(1, 1.3, 1); knob.translate(x, platform + 0.81, 0.0); carv.push(clean(knob));
    carv.push(cyl(0.03, 0.04, 0.05, 8, { x, y: platform + 0.76, z: -0.22 }));
  }
  return { wood: merge(parts), carving: merge(carv), L };
}
// the kneeling desk before a row of stalls: sloping bookboard on panels
export function stallDesk(L, { h = 1.0 } = {}) {
  const top = box(L, 0.035, 0.34, {}); top.rotateX(-0.3); top.translate(0, h, 0);
  return merge([box(L, h - 0.05, 0.05, { z: 0.14 }), top, box(L, 0.08, 0.3, { y: 0.18, z: -0.05 })]);
}

// =====================================================================
// THE CARVING OF THE WEST PORTAL (First Day, Sext; Adso's vision)
// Real high relief, not a painted height field. Every builder returns a
// Carving: geometry sorted by paint, in a local frame facing +z (toward the
// beholder) with the base at y = 0. Paints: 'stone', 'white' (the elders'
// white robes), 'gold' (crowns, thrones, cups, haloes), 'purple' (the
// Seated One's tunic), 'green' (the emerald rainbow), 'sea' (the sea of
// crystal), 'dark' (the cavities of mouths and eyes, the vices' demons).
// =====================================================================
const V3 = THREE.Vector3;
function rnd(seed) { let s = (seed * 9301 + 49297) >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

export class Carving {
  constructor() { this.m = new Map(); }
  add(paint, g) { if (!this.m.has(paint)) this.m.set(paint, []); this.m.get(paint).push(g); return g; }
  // append another carving, placed (x, y, z, rx, ry, rz, sx, sy, sz)
  put(c, o = {}) { for (const [k, list] of c.m) for (const g of list) this.add(k, place(g, o)); return this; }
  apply(m4) { for (const list of this.m.values()) for (const g of list) g.applyMatrix4(m4); return this; }
  scale(sx, sy, sz) { return this.apply(new THREE.Matrix4().makeScale(sx, sy, sz)); }
  // merged geometry per paint, mapped to the batch's material keys
  emit(batch, keys, opts = {}) { for (const [k, list] of this.m) if (keys[k]) batch.add(keys[k], merge(list), opts); }
  tris() { let n = 0; for (const list of this.m.values()) for (const g of list) n += (g.index ? g.index.count : g.attributes.position.count) / 3; return n; }
}
// rotate a geometry about a pivot
function about(g, p, { rx = 0, ry = 0, rz = 0 } = {}) {
  const m = new THREE.Matrix4().makeTranslation(-p[0], -p[1], -p[2]);
  m.premultiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')));
  m.premultiply(new THREE.Matrix4().makeTranslation(p[0], p[1], p[2]));
  return g.applyMatrix4(m);
}
// a rounded limb from a to b (cylinder with ball ends)
function limb(a, b, r0, r1 = r0, seg = 7) {
  const A = new V3(...a), B = new V3(...b), d = B.clone().sub(A), L = d.length();
  const g = cyl(r1, r0, L, seg, {});
  const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), d.normalize());
  g.applyQuaternion(q); g.translate(A.x, A.y, A.z);
  const e = clean(new THREE.SphereGeometry(r1, seg, 5)); e.translate(B.x, B.y, B.z);
  return merge([g, e]);
}
function ball(r, x, y, z, sx = 1, sy = 1, sz = 1, ws = 10, hs = 8) {
  const g = clean(new THREE.SphereGeometry(r, ws, hs)); g.scale(sx, sy, sz); g.translate(x, y, z); return g;
}
// a tube along a curve whose radius runs from r0 to r1
export function taperTube(pts, r0, r1, { seg = 18, rad = 7, closed = false } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new V3(...p)), closed);
  const g = new THREE.TubeGeometry(curve, seg, 1, rad, closed);
  const p = g.attributes.position, per = rad + 1;
  for (let i = 0; i < p.count; i++) {
    const j = Math.floor(i / per), t = j / seg, c = curve.getPointAt(t), k = r0 + (r1 - r0) * t;
    p.setXYZ(i, c.x + (p.getX(i) - c.x) * k, c.y + (p.getY(i) - c.y) * k, c.z + (p.getZ(i) - c.z) * k);
  }
  g.computeVertexNormals();
  return clean(g);
}
// radial folds on a lathe (a robe falling in pleats), strongest at the hem
function pleat(g, n, amp, h, seed = 0) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const a = Math.atan2(p.getZ(i), p.getX(i)), y = p.getY(i);
    const k = 1 + Math.sin(a * n + seed + y * 3) * amp * (1 - 0.6 * y / h);
    p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k);
  }
  g.computeVertexNormals(); return g;
}
function crownOf(c, r, x, y, z, h) {
  c.add('gold', cyl(r, r * 0.92, h, 14, { x, y, z }, true));
  for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * 0.55; c.add('gold', ball(h * 0.45, x + Math.sin(a + Math.PI / 2) * r, y + h * 1.15, z + Math.cos(a + Math.PI / 2) * r, 1, 1.4, 1, 6, 4)); }
}
function viol(s) {
  const g = new Carving();
  g.add('gold', ball(1, 0, 0, 0, 0.06 * s, 0.1 * s, 0.025 * s, 12, 8));
  g.add('gold', box(0.022 * s, 0.13 * s, 0.018 * s, { y: 0.08 * s }));
  g.add('gold', ball(0.02 * s, 0, 0.22 * s, 0, 1, 1.3, 0.8, 6, 5));
  return g;
}
function cup(s) {
  const g = new Carving();
  g.add('gold', lathe([[0, 0], [0.035 * s, 0], [0.01 * s, 0.02 * s], [0.008 * s, 0.05 * s], [0.045 * s, 0.07 * s], [0.05 * s, 0.11 * s], [0, 0.1 * s]], 12));
  return g;
}
function bookBlock(s, sealed = false) {
  const g = new Carving();
  g.add('gold', box(0.13 * s, 0.17 * s, 0.035 * s, {}));
  if (sealed) for (const y of [0.05, 0.12]) g.add('dark', ball(0.012 * s, 0.066 * s, y * s, 0, 1, 1, 0.6, 6, 4));
  return g;
}

// A seated figure on a small throne: an elder (white robe, gold crown, viol
// or cup, head turned towards the Seated One) or the Seated One himself.
//   s — height from the feet to the top of the head
//   turn — head turn (rad, +: towards +x); lean — torso lean (rad)
//   hands: 'hold' (attribute before the chest), 'play' (viol on the knee,
//   bowing), 'bless' (right hand raised, left on the knee with the book)
export function seatedFigure(s, { robe = 'white', crown = true, halo = null, attr = 'viol', hands = 'hold', turn = 0, lean = 0, seed = 1, throne = 'gold' } = {}) {
  const c = new Carving(), r = rnd(seed);
  // throne: seat block, cushion, low back, footstool
  c.add(throne, box(0.5 * s, 0.38 * s, 0.3 * s, { z: -0.08 * s }));
  c.add(throne, box(0.54 * s, 0.04 * s, 0.34 * s, { y: 0.38 * s, z: -0.07 * s }));
  c.add(throne, box(0.5 * s, 0.34 * s, 0.05 * s, { y: 0.42 * s, z: -0.22 * s }));
  for (const sx of [-1, 1]) c.add(throne, ball(0.04 * s, sx * 0.25 * s, 0.8 * s, -0.22 * s, 1, 1, 1, 6, 5));
  c.add(throne, box(0.42 * s, 0.05 * s, 0.16 * s, { z: 0.2 * s }));
  // lower robe falling from the knees in pleats over the feet
  const hemY = 0.46 * s;
  const skirt = lathe([[0, 0.02 * s], [0.19 * s, 0.03 * s], [0.2 * s, 0.07 * s], [0.17 * s, 0.24 * s], [0.155 * s, 0.4 * s], [0.14 * s, hemY], [0, hemY + 0.01 * s]], 18);
  pleat(skirt, 7 + Math.floor(r() * 3), 0.1, hemY, seed);
  skirt.scale(1, 1, 0.7); skirt.translate(0, 0, 0.16 * s);
  c.add(robe, skirt);
  for (const sx of [-1, 1]) c.add('stone', ball(0.035 * s, sx * 0.07 * s, 0.05 * s, 0.34 * s, 1, 0.6, 1.6, 7, 5));   // the feet
  // thighs and lap
  c.add(robe, ball(1, 0, 0.47 * s, 0.06 * s, 0.18 * s, 0.075 * s, 0.22 * s, 14, 8));
  // torso, turned a little and leaning in the dance
  const waist = [0, 0.48 * s, -0.02 * s];
  const torso = lathe([[0.135 * s, 0], [0.145 * s, 0.1 * s], [0.15 * s, 0.22 * s], [0.13 * s, 0.3 * s], [0.06 * s, 0.35 * s], [0, 0.36 * s]], 16);
  pleat(torso, 5, 0.05, 0.36 * s, seed + 2); torso.scale(1, 1, 0.62); torso.translate(0, waist[1], -0.02 * s);
  const upper = new Carving();
  upper.add(robe, torso);
  // head, hair, beard parted in two, crown or halo
  const hy = 0.89 * s, hr = 0.085 * s;
  const head = new Carving();
  head.add('stone', ball(hr, 0, hy, 0.01 * s, 0.92, 1.08, 0.9, 12, 10));
  head.add('stone', ball(hr * 1.02, 0, hy + 0.012 * s, -0.012 * s, 1, 1, 0.9, 10, 7));   // hair falling behind
  for (const sx of [-1, 1]) head.add('stone', taperTube([[sx * 0.02 * s, hy - 0.05 * s, 0.06 * s], [sx * 0.035 * s, hy - 0.11 * s, 0.07 * s], [sx * 0.025 * s, hy - 0.2 * s, 0.05 * s]], 0.032 * s, 0.006 * s, { seg: 6, rad: 6 }));
  head.add('dark', ball(0.011 * s, -0.03 * s, hy + 0.005 * s, 0.083 * s, 1, 0.7, 0.4, 5, 4));
  head.add('dark', ball(0.011 * s, 0.03 * s, hy + 0.005 * s, 0.083 * s, 1, 0.7, 0.4, 5, 4));
  if (crown) crownOf(head, hr * 0.95, 0, hy + 0.06 * s, 0, 0.045 * s);
  if (halo) {
    head.add('gold', cyl(0.17 * s, 0.17 * s, 0.02 * s, 24, { y: hy + 0.03 * s, z: -0.075 * s, rx: Math.PI / 2 }));
    if (halo === 'cross') for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0]]) head.add('gold', box(0.05 * s, 0.05 * s, 0.03 * s, { x: dx * 0.13 * s, y: hy + 0.03 * s + dy * 0.13 * s - 0.025 * s, z: -0.06 * s }));
  }
  for (const list of head.m.values()) for (const g of list) about(g, [0, hy - 0.1 * s, 0], { ry: turn, rz: -turn * 0.25 });
  upper.put(head);
  // arms and hands
  const sh = [0.14 * s, 0.8 * s, -0.01 * s];
  const arm = (a, e, h) => { upper.add(robe, limb(a, e, 0.045 * s, 0.04 * s)); upper.add(robe, limb(e, h, 0.04 * s, 0.03 * s)); upper.add('stone', ball(0.03 * s, h[0], h[1], h[2], 0.8, 1.1, 0.6, 7, 5)); };
  if (hands === 'bless') {
    // the right hand raised (the figure's right is -x), the left on the knee holding the sealed book
    arm([-sh[0], sh[1], sh[2]], [-0.23 * s, 0.64 * s, 0.05 * s], [-0.22 * s, 0.9 * s, 0.1 * s]);
    upper.add('stone', box(0.018 * s, 0.07 * s, 0.03 * s, { x: -0.235 * s, y: 0.93 * s, z: 0.1 * s }));
    upper.add('stone', box(0.018 * s, 0.075 * s, 0.03 * s, { x: -0.212 * s, y: 0.935 * s, z: 0.1 * s }));
    arm([sh[0], sh[1], sh[2]], [0.2 * s, 0.6 * s, 0.08 * s], [0.12 * s, 0.53 * s, 0.24 * s]);
    upper.put(bookBlock(s, true), { x: 0.12 * s, y: 0.52 * s, z: 0.28 * s, rx: -0.2 });
  } else if (hands === 'play') {
    upper.put(viol(s), { x: 0.02 * s, y: 0.5 * s, z: 0.2 * s, rz: 0.35 });
    arm([-sh[0], sh[1], sh[2]], [-0.16 * s, 0.6 * s, 0.12 * s], [0.0 * s, 0.62 * s, 0.24 * s]);
    arm([sh[0], sh[1], sh[2]], [0.2 * s, 0.62 * s, 0.1 * s], [0.12 * s, 0.72 * s, 0.22 * s]);
    upper.add('gold', limb([-0.12 * s, 0.55 * s, 0.26 * s], [0.14 * s, 0.7 * s, 0.26 * s], 0.006 * s));   // the bow
  } else {
    const hold = [0, 0.66 * s, 0.17 * s];
    arm([-sh[0], sh[1], sh[2]], [-0.19 * s, 0.63 * s, 0.07 * s], [-0.045 * s, hold[1], hold[2]]);
    arm([sh[0], sh[1], sh[2]], [0.19 * s, 0.63 * s, 0.07 * s], [0.045 * s, hold[1] + 0.01 * s, hold[2]]);
    if (attr === 'viol') upper.put(viol(s), { x: 0, y: 0.55 * s, z: 0.2 * s, rz: 0.15 * (r() - 0.5) });
    else if (attr === 'cup') upper.put(cup(s), { x: 0, y: 0.63 * s, z: 0.2 * s });
  }
  for (const list of upper.m.values()) for (const g of list) about(g, waist, { rz: lean, rx: -0.05 });
  c.put(upper);
  return c;
}

// the mandorla, the emerald rainbow and the sea of crystal round the throne
export function mandorla(a, b) {
  const c = new Carving();
  const t = new THREE.TorusGeometry(1, 0.045, 6, 56); t.scale(a, b, 1); c.add('green', clean(t));
  const t2 = new THREE.TorusGeometry(1, 0.025, 5, 56); t2.scale(a * 0.9, b * 0.92, 0.8); c.add('gold', clean(t2));
  return c;
}
export function crystalSea(w, h) {
  const c = new Carving();
  const pts = []; for (let i = 0; i <= 40; i++) pts.push([-w / 2 + i * w / 40, h * 0.5 + Math.sin(i * 1.3) * h * 0.25, 0.02]);
  c.add('sea', box(w, h, 0.05, {}));
  c.add('sea', taperTube(pts, 0.022, 0.022, { seg: 80, rad: 5 }));
  return c;
}

// wings of stiff feathers in rows, spread from a shoulder point
function wing(c, paint, root, dir, len, up = 0.9) {
  for (let k = 0; k < 6; k++) {
    const a = up - k * 0.22, L = len * (1 - k * 0.1);
    const tip = [root[0] + dir * Math.cos(a) * L, root[1] + Math.sin(a) * L, root[2] - 0.02];
    c.add(paint, taperTube([root, [(root[0] + tip[0]) / 2, (root[1] + tip[1]) / 2 + 0.02 * len, root[2]], tip], 0.05 * len, 0.012 * len, { seg: 6, rad: 5 }));
  }
}
// the four living creatures (Apoc. 4), winged and haloed, each with a book:
// the man, the eagle, and at the feet of the throne the bull and the lion,
// bodies turned away from the throne, heads turned back towards it
//   dir — +1 when the throne is on the creature's +x side
export function creature(kind, s, dir = 1) {
  const c = new Carving();
  const halo = (x, y, r) => c.add('gold', cyl(r, r, 0.015, 20, { x, y, z: -0.06 * s, rx: Math.PI / 2 }));
  if (kind === 'man') {
    // an angel-like man, half-length on a cloud band, holding the book
    c.add('white', pleat(lathe([[0.2 * s, 0], [0.19 * s, 0.25 * s], [0.14 * s, 0.5 * s], [0.07 * s, 0.56 * s], [0, 0.57 * s]], 14), 6, 0.06, 0.57 * s).scale(1, 1, 0.55));
    c.add('stone', ball(0.08 * s, 0, 0.66 * s, 0.01 * s, 0.9, 1.1, 0.85));
    halo(0, 0.68 * s, 0.14 * s);
    wing(c, 'stone', [dir * -0.1 * s, 0.5 * s, -0.04 * s], -dir, 0.42 * s);
    wing(c, 'stone', [dir * 0.1 * s, 0.5 * s, -0.04 * s], dir, 0.3 * s, 1.2);
    c.put(bookBlock(s * 1.2), { x: dir * 0.06 * s, y: 0.3 * s, z: 0.12 * s, ry: dir * 0.4 });
    c.add('white', limb([-0.12 * s, 0.48 * s, 0], [-0.04 * s, 0.36 * s, 0.14 * s], 0.035 * s));
    c.add('white', limb([0.12 * s, 0.48 * s, 0], [0.12 * s, 0.34 * s, 0.14 * s], 0.035 * s));
  } else if (kind === 'eagle') {
    // sharp beak, feathers set like armour, strong talons
    c.add('stone', ball(1, 0, 0.3 * s, 0.02 * s, 0.13 * s, 0.22 * s, 0.1 * s, 12, 10));
    c.add('stone', ball(0.075 * s, dir * 0.07 * s, 0.56 * s, 0.03 * s, 1, 0.9, 0.9));
    c.add('stone', taperTube([[dir * 0.12 * s, 0.57 * s, 0.05 * s], [dir * 0.2 * s, 0.54 * s, 0.05 * s], [dir * 0.22 * s, 0.5 * s, 0.05 * s]], 0.03 * s, 0.004 * s, { seg: 5, rad: 5 }));
    c.add('dark', ball(0.012 * s, dir * 0.1 * s, 0.58 * s, 0.09 * s, 1, 1, 0.5, 5, 4));
    for (let k = 0; k < 5; k++) c.add('stone', ball(0.05 * s, (k % 2 - 0.5) * 0.08 * s, (0.12 + k * 0.07) * s, 0.09 * s, 1, 0.5, 0.35, 6, 4));   // feather scales
    wing(c, 'stone', [-0.08 * s, 0.4 * s, -0.03 * s], -1, 0.45 * s);
    wing(c, 'stone', [0.08 * s, 0.4 * s, -0.03 * s], 1, 0.45 * s);
    halo(dir * 0.06 * s, 0.58 * s, 0.13 * s);
    c.put(bookBlock(s * 1.1), { x: 0, y: 0.02 * s, z: 0.1 * s });
    for (const sx of [-1, 1]) c.add('stone', limb([sx * 0.05 * s, 0.14 * s, 0.03 * s], [sx * 0.06 * s, 0.03 * s, 0.1 * s], 0.02 * s, 0.012 * s, 5));
  } else {
    // bull or lion, lying with the book between its paws; the body goes
    // away from the throne (-dir), the head turns back towards it
    const lion = kind === 'lion';
    const bx = -dir * 0.22 * s;
    c.add('stone', taperTube([[dir * 0.1 * s, 0.26 * s, 0.03 * s], [0, 0.24 * s, 0.05 * s], [bx, 0.22 * s, 0.04 * s], [bx - dir * 0.12 * s, 0.24 * s, 0.03 * s]], 0.12 * s, 0.09 * s, { seg: 10, rad: 9 }));
    // the head, turned back
    const hx = dir * 0.2 * s, hy = 0.4 * s;
    c.add('stone', ball(0.085 * s, hx, hy, 0.07 * s, 1, 1, 0.9));
    c.add('stone', ball(0.055 * s, hx + dir * 0.07 * s, hy - 0.03 * s, 0.1 * s, 1.1, 0.8, 0.8, 8, 6));   // muzzle
    c.add('dark', ball(0.03 * s, hx + dir * 0.11 * s, hy - 0.05 * s, 0.12 * s, 1, 0.5, 0.5, 6, 4));     // open jaws
    c.add('stone', limb([dir * 0.08 * s, 0.3 * s, 0.04 * s], [hx, hy, 0.06 * s], 0.06 * s, 0.055 * s));
    if (lion) for (let k = 0; k < 9; k++) { const a = k / 9 * TAU; c.add('stone', ball(0.035 * s, hx + Math.cos(a) * 0.08 * s, hy + Math.sin(a) * 0.08 * s, 0.03 * s, 1, 1, 0.7, 6, 4)); }
    else for (const sx of [-1, 1]) c.add('stone', taperTube([[hx + sx * 0.05 * s, hy + 0.06 * s, 0.05 * s], [hx + sx * 0.1 * s, hy + 0.11 * s, 0.05 * s], [hx + sx * 0.09 * s, hy + 0.17 * s, 0.05 * s]], 0.02 * s, 0.005 * s, { seg: 5, rad: 5 }));
    // legs folded under, the forefeet holding the book
    for (const [lx, fz] of [[dir * 0.05 * s, 0.13], [bx, 0.1], [bx - dir * 0.1 * s, 0.08]]) c.add('stone', limb([lx, 0.18 * s, 0.05 * s], [lx + dir * 0.06 * s, 0.04 * s, fz * s], 0.035 * s, 0.03 * s, 6));
    c.put(bookBlock(s * 1.15), { x: dir * 0.2 * s, y: 0.02 * s, z: 0.15 * s, ry: -dir * 0.3 });
    // the serpent tail coiling up in rings, flaming at the tip
    const tx = bx - dir * 0.2 * s;
    c.add('stone', taperTube([[tx + dir * 0.06 * s, 0.24 * s, 0.02 * s], [tx - dir * 0.05 * s, 0.34 * s, 0.03 * s], [tx + dir * 0.02 * s, 0.46 * s, 0.03 * s], [tx - dir * 0.05 * s, 0.56 * s, 0.03 * s], [tx - dir * 0.02 * s, 0.66 * s, 0.03 * s]], 0.03 * s, 0.006 * s, { seg: 16, rad: 5 }));
    wing(c, 'stone', [bx * 0.4, 0.34 * s, -0.03 * s], -dir, 0.4 * s, 1.35);
    halo(hx, hy + 0.02 * s, 0.13 * s);
  }
  return c;
}

// a band of interlaced vines with leaves along a path (the "flowers and
// leaves of all the plants of the gardens of earth and heaven")
export function vineBand(pts, w, { seed = 3, leaves = 1 } = {}) {
  const c = new Carving(), r = rnd(seed);
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new V3(...p)));
  const L = curve.getLength(), n = Math.max(8, Math.round(L / (w * 1.4)));
  for (const ph of [0, Math.PI]) {
    const wave = [];
    for (let i = 0; i <= n * 4; i++) {
      const t = i / (n * 4), p = curve.getPointAt(t), tg = curve.getTangentAt(t), nr = new V3(-tg.y, tg.x, 0).normalize();
      const o = Math.sin(t * n * TAU + ph) * w * 0.35;
      wave.push([p.x + nr.x * o, p.y + nr.y * o, p.z + 0.02 + Math.cos(t * n * TAU + ph) * w * 0.12]);
    }
    c.add('stone', taperTube(wave, w * 0.09, w * 0.09, { seg: n * 8, rad: 5 }));
  }
  for (let i = 0; i < n * leaves; i++) {
    const t = (i + 0.5) / (n * leaves), p = curve.getPointAt(t), tg = curve.getTangentAt(t), nr = new V3(-tg.y, tg.x, 0).normalize();
    const side = i % 2 ? 1 : -1, o = side * w * 0.3;
    const lf = clean(new THREE.SphereGeometry(w * 0.22, 7, 5)); lf.scale(1, 0.5, 0.35);
    lf.rotateZ(Math.atan2(tg.y, tg.x) + side * 0.7 + (r() - 0.5) * 0.5);
    lf.translate(p.x + nr.x * o, p.y + nr.y * o, p.z + 0.05);
    c.add(i % 5 === 0 ? 'green' : 'stone', lf);
  }
  return c;
}

// one pair of the crossed lions on the trumeau: raised like arches, hind
// feet planted, claws on the partner's back, manes curling like serpents,
// mouths open in a growl (h — height of the pair)
export function lionPair(h, w) {
  const c = new Carving();
  for (const s of [-1, 1]) {
    const z0 = s > 0 ? 0.06 : 0.02;
    const hip = [s * w * 0.42, h * 0.3, z0], chest = [-s * w * 0.3, h * 0.72, z0 + 0.03];
    c.add('stone', taperTube([hip, [s * w * 0.15, h * 0.48, z0 + 0.06], [-s * w * 0.12, h * 0.64, z0 + 0.06], chest], 0.09 * h, 0.1 * h, { seg: 12, rad: 8 }));
    // hind legs on the ground
    for (const dz of [-0.03, 0.03]) c.add('stone', limb(hip, [s * w * 0.46, 0.02 * h, z0 + dz], 0.045 * h, 0.03 * h, 6));
    // forepaws on the other lion's back
    for (const dz of [-0.02, 0.04]) c.add('stone', limb(chest, [s * w * 0.1, h * 0.55, z0 + 0.1 + dz], 0.04 * h, 0.03 * h, 6));
    // head with its mane and open jaws, looking out
    const hd = [-s * w * 0.4, h * 0.86, z0 + 0.05];
    c.add('stone', ball(0.085 * h, ...hd, 1, 1, 0.9));
    c.add('stone', ball(0.05 * h, hd[0] - s * 0.05 * h, hd[1] - 0.03 * h, hd[2] + 0.06 * h, 1, 0.8, 1));
    c.add('dark', ball(0.03 * h, hd[0] - s * 0.07 * h, hd[1] - 0.06 * h, hd[2] + 0.08 * h, 1, 0.6, 0.6, 6, 4));
    for (let k = 0; k < 7; k++) { const a = k / 7 * TAU; c.add('stone', taperTube([[hd[0] + Math.cos(a) * 0.06 * h, hd[1] + Math.sin(a) * 0.06 * h, hd[2]], [hd[0] + Math.cos(a + 0.5) * 0.11 * h, hd[1] + Math.sin(a + 0.5) * 0.11 * h, hd[2] - 0.01], [hd[0] + Math.cos(a + 1) * 0.13 * h, hd[1] + Math.sin(a + 1) * 0.13 * h, hd[2] - 0.02]], 0.028 * h, 0.006 * h, { seg: 5, rad: 4 })); }
    // tail
    c.add('stone', taperTube([hip, [s * w * 0.55, h * 0.2, z0], [s * w * 0.35, h * 0.08, z0 + 0.04], [s * w * 0.2, h * 0.16, z0 + 0.05]], 0.02 * h, 0.008 * h, { seg: 8, rad: 4 }));
  }
  // the vine net binding them to the column
  c.add('stone', taperTube([[-w * 0.5, h * 0.1, 0.04], [0, h * 0.5, 0.14], [w * 0.5, h * 0.92, 0.04]], 0.012 * h, 0.012 * h, { seg: 10, rad: 4 }));
  c.add('stone', taperTube([[w * 0.5, h * 0.1, 0.04], [0, h * 0.5, 0.15], [-w * 0.5, h * 0.92, 0.04]], 0.012 * h, 0.012 * h, { seg: 10, rad: 4 }));
  return c;
}

// a jamb prophet: long, bony and old, the body bent as in a dance step,
// hands raised with the fingers spread like wings, the beard and hair
// blown by a prophetic wind, the long robe falling in waves and scrolls
//   attr — 'keys' (Peter), 'book' (Paul), 'scroll' (Jeremiah, Isaiah)
export function prophet(h, { attr = 'scroll', seed = 1, mirror = 1 } = {}) {
  const c = new Carving(), r = rnd(seed), m = mirror;
  const robe = lathe([[0, 0.03 * h], [0.15 * h * 0.62, 0.03 * h], [0.14 * h * 0.62, 0.2 * h], [0.12 * h * 0.62, 0.45 * h], [0.11 * h * 0.62, 0.65 * h], [0.09 * h * 0.62, 0.78 * h], [0.04 * h, 0.84 * h], [0, 0.85 * h]], 16);
  pleat(robe, 9, 0.09, 0.85 * h, seed);
  // the S of the dance: the hips swing one way, the shoulders the other
  const p = robe.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / h; p.setX(i, p.getX(i) + m * Math.sin(y * Math.PI * 1.4) * 0.045 * h); }
  robe.computeVertexNormals(); robe.scale(1, 1, 0.75);
  c.add('stone', robe);
  // crossed legs and pointed feet at the hem
  c.add('stone', limb([m * -0.02 * h, 0.2 * h, 0.02 * h], [m * 0.05 * h, 0.02 * h, 0.07 * h], 0.022 * h, 0.018 * h, 6));
  c.add('stone', limb([m * 0.03 * h, 0.2 * h, 0.0], [m * -0.05 * h, 0.02 * h, 0.06 * h], 0.022 * h, 0.018 * h, 6));
  // head, blown hair and a long beard in wavy strands
  const hd = [m * -0.02 * h, 0.9 * h, 0.01 * h];
  c.add('stone', ball(0.055 * h, ...hd, 0.9, 1.15, 0.9));
  for (let k = 0; k < 5; k++) c.add('stone', taperTube([[hd[0] + (k - 2) * 0.012 * h, hd[1] - 0.045 * h, hd[2] + 0.04 * h], [hd[0] + (k - 2) * 0.016 * h + m * 0.03 * h, hd[1] - 0.12 * h, hd[2] + 0.05 * h], [hd[0] + (k - 2) * 0.02 * h + m * 0.07 * h, hd[1] - 0.2 * h + r() * 0.03 * h, hd[2] + 0.04 * h]], 0.011 * h, 0.003 * h, { seg: 6, rad: 4 }));
  for (let k = 0; k < 4; k++) c.add('stone', taperTube([[hd[0] - m * 0.03 * h, hd[1] + (k - 1.5) * 0.02 * h, hd[2] - 0.02 * h], [hd[0] - m * 0.09 * h, hd[1] + (k - 1.5) * 0.03 * h + 0.02 * h, hd[2] - 0.03 * h]], 0.012 * h, 0.003 * h, { seg: 4, rad: 4 }));
  // one hand raised, long fingers spread like wings; the other with the attribute
  const sh = [m * 0.08 * h, 0.78 * h, 0];
  const el = [m * 0.12 * h, 0.7 * h, 0.05 * h], hn = [m * 0.1 * h, 0.86 * h, 0.08 * h];
  c.add('stone', limb(sh, el, 0.022 * h, 0.018 * h, 6)); c.add('stone', limb(el, hn, 0.018 * h, 0.014 * h, 6));
  for (let k = 0; k < 4; k++) { const a = 1.2 + (k - 1.5) * 0.28; c.add('stone', limb(hn, [hn[0] + m * Math.cos(a) * 0.07 * h, hn[1] + Math.sin(a) * 0.07 * h, hn[2] + 0.01 * h], 0.005 * h, 0.003 * h, 4)); }
  const sh2 = [m * -0.08 * h, 0.77 * h, 0], el2 = [m * -0.11 * h, 0.62 * h, 0.05 * h], hn2 = [m * -0.03 * h, 0.58 * h, 0.1 * h];
  c.add('stone', limb(sh2, el2, 0.022 * h, 0.018 * h, 6)); c.add('stone', limb(el2, hn2, 0.018 * h, 0.014 * h, 6));
  if (attr === 'keys') for (const dy of [0, 0.03]) { c.add('gold', limb([hn2[0], hn2[1] + dy * h, hn2[2]], [hn2[0], hn2[1] - 0.13 * h + dy * h, hn2[2] + 0.02 * h], 0.006 * h, 0.006 * h, 4)); c.add('gold', box(0.03 * h, 0.02 * h, 0.006 * h, { x: hn2[0] + 0.012 * h, y: hn2[1] - 0.14 * h + dy * h, z: hn2[2] + 0.02 * h })); }
  else if (attr === 'book') c.put(bookBlock(h * 0.9), { x: hn2[0], y: hn2[1] - 0.09 * h, z: hn2[2] + 0.02 * h, ry: 0.3 * m });
  else c.add('stone', taperTube([[hn2[0], hn2[1], hn2[2] + 0.02 * h], [hn2[0] - m * 0.04 * h, hn2[1] - 0.15 * h, hn2[2] + 0.05 * h], [hn2[0] + m * 0.02 * h, hn2[1] - 0.32 * h, hn2[2] + 0.05 * h], [hn2[0] - m * 0.03 * h, hn2[1] - 0.45 * h, hn2[2] + 0.04 * h]], 0.012 * h, 0.012 * h, { seg: 14, rad: 5 }));
  return c;
}

// the vices beside the door, "under the deep arches, in the spaces between
// the slender columns": small scenes of about s metres, one per kind
//   'lust'  — the lustful woman, toads biting her flesh, coupled with a
//             pot-bellied satyr with griffin-hair legs
//   'miser' — the miser rigid on his bed; a demon tears his soul, in the
//             shape of a child, from his mouth
//   'pride' — the proud man with a demon on his shoulders, claws in his eyes
//   'beasts'— two monsters tearing each other, a goat-headed thing, serpents
export function viceScene(kind, s, seed = 1) {
  const c = new Carving(), r = rnd(seed);
  const man = (x, y, z, h, { lean = 0, paint = 'stone' } = {}) => {
    const g = new Carving();
    g.add(paint, pleat(lathe([[0, 0], [0.11 * h, 0], [0.1 * h, 0.4 * h], [0.08 * h, 0.75 * h], [0.03 * h, 0.82 * h], [0, 0.83 * h]], 12), 6, 0.06, 0.83 * h).scale(1, 1, 0.65));
    g.add('stone', ball(0.07 * h, 0, 0.9 * h, 0, 0.9, 1.1, 0.9, 9, 7));
    for (const list of g.m.values()) for (const q of list) about(q, [0, 0, 0], { rz: lean });
    c.put(g, { x, y, z });
  };
  const demon = (x, y, z, h, { flip = 1 } = {}) => {
    const d = new Carving();
    d.add('dark', taperTube([[0, 0.1 * h, 0], [flip * 0.03 * h, 0.4 * h, 0.02 * h], [0, 0.7 * h, 0.02 * h]], 0.07 * h, 0.05 * h, { seg: 6, rad: 6 }));
    d.add('dark', ball(0.07 * h, 0, 0.78 * h, 0.02 * h, 1, 1, 0.9, 8, 6));
    for (const sx of [-1, 1]) { d.add('dark', taperTube([[sx * 0.04 * h, 0.84 * h, 0], [sx * 0.07 * h, 0.95 * h, 0], [sx * 0.05 * h, 1.02 * h, 0]], 0.018 * h, 0.003 * h, { seg: 4, rad: 4 })); }
    for (const sx of [-1, 1]) d.add('dark', limb([sx * 0.04 * h, 0.12 * h, 0], [sx * 0.08 * h, 0, 0.02 * h], 0.02 * h, 0.012 * h, 5));
    wing(d, 'dark', [0, 0.6 * h, -0.02 * h], -flip, 0.35 * h, 1.1);
    c.put(d, { x, y, z });
    return d;
  };
  if (kind === 'lust') {
    man(-0.12 * s, 0, 0.02, 0.85 * s, { lean: 0.08 });
    for (const [dx, dy] of [[-0.05, 0.62], [0.05, 0.6], [0.02, 0.35]]) c.add('green', ball(0.045 * s, -0.12 * s + dx * s, dy * s, 0.08 * s, 1.3, 0.7, 0.8, 7, 5));   // toads
    demon(0.14 * s, 0, 0.02, 0.8 * s, { flip: -1 });
    c.add('dark', ball(0.09 * s, 0.14 * s, 0.35 * s, 0.07 * s, 1.1, 1, 0.8, 8, 6));   // the satyr's swollen belly
    for (const sx of [-1, 1]) c.add('stone', taperTube([[-0.12 * s, 0.1 * s, 0.05 * s], [sx * 0.2 * s, 0.05 * s, 0.07 * s], [sx * 0.24 * s, 0.14 * s, 0.07 * s]], 0.015 * s, 0.004 * s, { seg: 6, rad: 4 }));   // serpents
  } else if (kind === 'miser') {
    // the bed between columns, the dead man stiff on it
    c.add('stone', box(0.7 * s, 0.08 * s, 0.2 * s, { y: 0.22 * s }));
    for (const sx of [-1, 1]) c.add('stone', cyl(0.02 * s, 0.02 * s, 0.4 * s, 6, { x: sx * 0.33 * s, y: 0.0 }));
    c.add('stone', taperTube([[-0.3 * s, 0.33 * s, 0.03 * s], [0.25 * s, 0.33 * s, 0.03 * s]], 0.06 * s, 0.05 * s, { seg: 4, rad: 7 }));
    c.add('stone', ball(0.06 * s, -0.33 * s, 0.37 * s, 0.03 * s));
    c.add('white', ball(0.035 * s, -0.33 * s, 0.5 * s, 0.07 * s, 0.8, 1.2, 0.8, 7, 5));   // the soul, a child, drawn out of the mouth
    demon(-0.22 * s, 0.3 * s, 0.03, 0.55 * s);
    demon(0.2 * s, 0.3 * s, 0.03, 0.5 * s, { flip: -1 });
    c.add('gold', box(0.1 * s, 0.07 * s, 0.07 * s, { x: 0.15 * s, y: 0.3 * s, z: 0.06 * s }));   // his money bag
  } else if (kind === 'pride') {
    man(0, 0, 0.02, 0.8 * s);
    const d = demon(0, 0.62 * s, 0.06, 0.45 * s);
    for (const sx of [-1, 1]) c.add('dark', limb([sx * 0.04 * s, 0.9 * s, 0.07], [sx * 0.03 * s, 0.73 * s, 0.1], 0.012 * s, 0.006 * s, 4));
  } else {
    // two beasts face to face in a hideous struggle, among serpents and flames
    for (const sx of [-1, 1]) {
      c.add('stone', taperTube([[sx * 0.3 * s, 0.12 * s, 0.02], [sx * 0.18 * s, 0.3 * s, 0.05], [sx * 0.06 * s, 0.5 * s, 0.05]], 0.08 * s, 0.07 * s, { seg: 8, rad: 7 }));
      c.add('stone', ball(0.08 * s, sx * 0.04 * s, 0.6 * s, 0.07, 1, 0.9, 0.9));
      c.add('dark', ball(0.03 * s, sx * 0.0, 0.58 * s, 0.13, 1, 0.6, 0.5, 6, 4));
      for (const dz of [0, 0.04]) c.add('stone', limb([sx * 0.25 * s, 0.14 * s, 0.03 + dz], [sx * 0.3 * s, 0, 0.05 + dz], 0.025 * s, 0.018 * s, 5));
      c.add('stone', limb([sx * 0.1 * s, 0.45 * s, 0.07], [-sx * 0.05 * s, 0.4 * s, 0.12], 0.022 * s, 0.014 * s, 5));
    }
    for (let k = 0; k < 5; k++) c.add('dark', taperTube([[(k - 2) * 0.1 * s, 0.75 * s, 0.02], [(k - 2) * 0.1 * s + 0.03 * s, 0.85 * s, 0.03], [(k - 2) * 0.1 * s - 0.02 * s, 0.95 * s, 0.02]], 0.03 * s, 0.004 * s, { seg: 5, rad: 4 }));   // flames
  }
  return c;
}

// a grotesque on a capital: a beast's or monster's head under the abacus
export function grotesque(s, seed = 1) {
  const c = new Carving(), r = rnd(seed), k = Math.floor(r() * 3);
  c.add('stone', ball(0.5 * s, 0, 0, 0, 1, 0.9, 0.8, 9, 7));
  c.add('dark', ball(0.16 * s, 0, -0.18 * s, 0.38 * s, 1.3, 0.6, 0.5, 6, 4));
  for (const sx of [-1, 1]) {
    c.add('dark', ball(0.07 * s, sx * 0.17 * s, 0.1 * s, 0.4 * s, 1, 0.8, 0.5, 5, 4));
    if (k === 0) c.add('stone', taperTube([[sx * 0.25 * s, 0.25 * s, 0], [sx * 0.45 * s, 0.5 * s, 0], [sx * 0.4 * s, 0.7 * s, 0]], 0.08 * s, 0.01 * s, { seg: 5, rad: 4 }));   // horns
    else if (k === 1) c.add('stone', ball(0.14 * s, sx * 0.4 * s, 0.25 * s, 0, 0.5, 1.2, 0.4, 6, 4));   // ears
  }
  c.add('stone', ball(0.2 * s, 0, -0.05 * s, 0.35 * s, 1, 0.8, 0.8, 7, 5));   // snout
  return c;
}

// the great bronze tripod "twice a man's height" with its single lamp
// (Second Day, Matins): three legs curving out to lion's paws, a collar,
// a knop, and the wide bowl of oil
export function greatTripod(h = 3.4) {
  const legs = [], paws = [];
  for (let i = 0; i < 3; i++) {
    const a = i * TAU / 3, ca = Math.cos(a), sa = Math.sin(a);
    legs.push(taperTube([[ca * 0.1, h * 0.86, sa * 0.1], [ca * 0.2, h * 0.55, sa * 0.2], [ca * 0.34, h * 0.2, sa * 0.34], [ca * 0.5, 0.12, sa * 0.5]], 0.045, 0.055, { seg: 16, rad: 8 }));
    paws.push(clean(new THREE.SphereGeometry(0.1, 10, 6, 0, TAU, 0, Math.PI / 2)).translate(ca * 0.52, 0, sa * 0.52));
    for (let t = -1; t <= 1; t++) paws.push(clean(new THREE.SphereGeometry(0.035, 6, 4)).translate(ca * 0.6 - sa * t * 0.05, 0.02, sa * 0.6 + ca * t * 0.05));
    // a scroll where the leg meets the collar
    legs.push(taperTube([[ca * 0.2, h * 0.55, sa * 0.2], [ca * 0.3, h * 0.6, sa * 0.3], [ca * 0.27, h * 0.66, sa * 0.27], [ca * 0.21, h * 0.62, sa * 0.21]], 0.02, 0.012, { seg: 8, rad: 5 }));
  }
  const ring = clean(new THREE.TorusGeometry(0.21, 0.025, 6, 24)); ring.rotateX(Math.PI / 2); ring.translate(0, h * 0.55, 0);
  const shaft = lathe([[0, h * 0.5], [0.05, h * 0.5], [0.04, h * 0.7], [0.09, h * 0.74], [0.04, h * 0.78], [0.05, h * 0.86], [0, h * 0.86]], 12);
  const bowl = lathe([[0, h * 0.86], [0.18, h * 0.87], [0.42, h * 0.93], [0.5, h * 0.99], [0.47, h * 1.0], [0.38, h * 0.96], [0, h * 0.94]], 20);
  return { bronze: merge([...legs, ...paws, ring, shaft, bowl]), flameY: h * 1.0 };
}
// a hanging corona of lamps (iron ring, chains, little oil cups)
export function corona(r = 0.9, n = 8, drop = 2.2) {
  const iron = [], cups = [];
  const t = clean(new THREE.TorusGeometry(r, 0.03, 5, 36)); t.rotateX(Math.PI / 2); iron.push(t);
  const t2 = clean(new THREE.TorusGeometry(r, 0.012, 4, 36)); t2.rotateX(Math.PI / 2); t2.translate(0, 0.12, 0); iron.push(t2);
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, x = Math.cos(a) * r, z = Math.sin(a) * r;
    cups.push(lathe([[0, 0], [0.05, 0.005], [0.07, 0.05], [0.06, 0.06], [0, 0.04]], 10, { x, y: 0.03, z }));
    iron.push(box(0.015, 0.15, 0.015, { x, z }));
  }
  for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; iron.push(limb([Math.cos(a) * r, 0.12, Math.sin(a) * r], [0, drop, 0], 0.008, 0.008, 4)); }
  return { iron: merge(iron), cups: merge(cups) };
}

// The whole tympanum (First Day, Sext), true size, for a half-ellipse of
// half-width R and height H above the lintel: the ground and its archivolt
// of vines, the sea of crystal, the Seated One in the mandorla under the
// emerald rainbow, the four living creatures, and the twenty-four elders on
// their little thrones, 7+7, then 3+3, then 2+2, white-robed and crowned,
// with viols or cups of perfume, all turned towards the Seated One; only one
// of them plays.
export function portalTympanum(R, H) {
  const c = new Carving();
  const inside = (x, y, m = 0) => (x / (R - m)) ** 2 + (y / (H - m)) ** 2 < 1;
  // the ground: a half-ellipse slab
  const plate = clean(new THREE.CircleGeometry(1, 64, 0, Math.PI)); plate.scale(R, H, 1);
  c.add('ground', plate);
  // archivolt of vines round the rim
  const rim = []; for (let i = 0; i <= 40; i++) { const a = Math.PI - i / 40 * Math.PI; rim.push([Math.cos(a) * (R - 0.12), Math.sin(a) * (H - 0.1), 0]); }
  c.put(vineBand(rim, 0.17, { seed: 11 }));
  // the sea of crystal at the foot, "flowing under the feet of the Seated One"
  c.put(crystalSea(2 * R - 0.35, 0.1), { y: 0.0, z: 0.0 });
  // the Seated One, his throne on a gilt dais, in the mandorla
  const sY = 0.44, sH = 1.08;
  c.put(mandorla(0.5, 0.68), { y: sY + 0.5, z: 0.02 });
  c.put(seatedFigure(sH, { robe: 'purple', crown: true, halo: 'cross', hands: 'bless', seed: 3 }).scale(1, 1, 0.65), { y: sY, z: 0.04 });
  c.add('gold', box(0.62, 0.08, 0.22, { y: sY - 0.08, z: 0.08 }));
  // the emerald rainbow round the crown
  { const t = clean(new THREE.TorusGeometry(0.24, 0.02, 5, 32, Math.PI)); t.translate(0, sY + sH * 0.93, 0.03); c.add('green', t); }
  // the four living creatures: the man (viewer's left, the Seated One's
  // right) and the eagle above; the bull and the lion at his feet
  c.put(creature('man', 0.62, 1).scale(1, 1, 0.6), { x: -0.8, y: 1.05, z: 0.0 });
  c.put(creature('eagle', 0.62, -1).scale(1, 1, 0.6), { x: 0.8, y: 1.03, z: 0.0 });
  c.put(creature('bull', 0.62, 1).scale(1, 1, 0.6), { x: -0.84, y: 0.5, z: 0.03 });
  c.put(creature('lion', 0.62, -1).scale(1, 1, 0.6), { x: 0.84, y: 0.5, z: 0.03 });
  // the twenty-four elders
  const rows = [[7, 0.11, 0.36, 0.62, 0.228], [3, 0.5, 0.32, 1.3, 0.25], [2, 0.93, 0.29, 1.16, 0.24]];
  let n = 0, placed = 0;
  for (const [cnt, y, s, x0, gap] of rows) for (const side of [-1, 1]) for (let i = 0; i < cnt; i++) {
    const x = side * (x0 + i * gap);
    const d = Math.abs(x);
    const play = n === 9;   // "only one of them was playing"
    const fig = seatedFigure(s, { attr: n % 2 ? 'cup' : 'viol', hands: play ? 'play' : 'hold', turn: -side * (0.35 + 0.15 * Math.sin(n * 1.7)), lean: -side * (0.08 + 0.06 * Math.sin(n * 2.3)), seed: 100 + n });
    fig.scale(1, 1, 0.6);
    if (inside(x + side * 0.12, y + s + 0.02, 0.05)) { c.put(fig, { x, y, z: 0.02 }); placed++; }
    n++;
  }
  if (placed !== 24) console.warn('[portal] elders placed', placed);
  return c;
}
