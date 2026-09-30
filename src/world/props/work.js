import * as THREE from 'three';
import { box, cyl, lathe, merge, place, TAU, clean } from '../../core/kit.js';
import { sculpt, fbm3, stone } from './sculpt.js';
import * as C from './cloth.js';

// Workshop things: the smith's forge and its bellows, the anvil on its
// stump, tongs and hammers, the quench trough, a grindstone, bar iron, and
// the two-wheeled cart of the yard. Each function adds to a Batch at (x, y, z)
// turned by ry; local +z faces the room.

const rot = (x, z, ry) => [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
const at = (g, x, y, z, ry = 0) => place(g, { x, y, z, ry });

// an anvil of the old kind: waisted body, a square face, a horn at one end
export function anvilGeo() {
  const body = new THREE.BoxGeometry(0.46, 0.3, 0.16, 8, 4, 2);
  const g = sculpt(body, q => {
    const t = q.y / 0.15;                  // -1 foot .. 1 face
    const waist = 1 - 0.35 * Math.exp(-t * t * 2.5);
    q.z *= waist; if (t < 0) q.x *= 0.8 + 0.2 * (1 + t);
    // the horn: the +x end draws out to a point
    if (q.x > 0.12 && t > 0.1) { const k = (q.x - 0.12) / 0.11; q.x += k * 0.12; q.z *= 1 - 0.7 * k; q.y -= k * 0.03 * (t - 0.1); }
  }, 4);
  g.translate(0, 0.15, 0);
  return merge([g, box(0.3, 0.06, 0.24, { y: -0.04 })]);
}
export function anvil(b, x, y, z, ry = 0) {
  // the stump, split and banded
  const st = cyl(0.3, 0.34, 0.55, 14, {}); b.add('bark', at(st, x, y, z, ry));
  b.add('beam', at(cyl(0.29, 0.29, 0.01, 14, { y: 0.55 }), x, y, z, ry), { collide: false });
  b.add('iron', at(anvilGeo().translate(0, 0.59, 0), x, y, z, ry));
}
// hammer, tongs, a swage and a punch hung or laid on a board
export function toolRack(b, x, y, z, ry = 0) {
  b.add('woodDark', at(box(1.4, 0.18, 0.04, { y: 1.4 }), x, y, z, ry), { collide: false });
  const iron = [], wood = [];
  for (let k = 0; k < 6; k++) {
    const tx = -0.55 + k * 0.22;
    if (k % 2) { // tongs: two jaws, hinged
      for (const s of [-1, 1]) { const j = box(0.014, 0.55, 0.014, { x: tx + s * 0.018, y: 0.9 }); j.rotateZ(s * 0.05); iron.push(j); }
      iron.push(box(0.06, 0.05, 0.02, { x: tx, y: 1.42 }));
    } else { // hammer hung by its head
      iron.push(box(0.12 - k * 0.01, 0.05, 0.05, { x: tx, y: 1.45 }));
      wood.push(cyl(0.013, 0.015, 0.36, 6, { x: tx, y: 1.08 }));
    }
  }
  b.add('iron', at(merge(iron), x, y, z + 0.03, ry), { collide: false });
  b.add('wood', at(merge(wood), x, y, z + 0.03, ry), { collide: false });
}
// the forge: a waist-high hearth of stone with a bed of coal and a glowing
// heart, a hood and flue, the tuyere on the side, the great bellows behind
export function forge(b, x, y, z, ry, emit, { w = 1.8 } = {}) {
  const hearth = stone(w, 0.78, 1.2, { seed: 901, top: 'flat', wear: 0.8, chips: 3 });
  b.add('rubbleIn', at(hearth, x, y, z, ry));
  b.add('p.coal', at(place(C.drape(w - 0.3, 0.9, 0.8, { hang: 0.02, seed: 902, rumple: 3, floor: 0.7 }), {}), x, y, z, ry), { collide: false });
  b.add('p.glow', at(place(sculpt(new THREE.SphereGeometry(0.22, 12, 8, 0, TAU, 0, Math.PI / 2), q => { q.y *= 0.35; q.x *= 1.3; }, 1), { y: 0.8 }), x, y, z, ry), { collide: false, shadow: false });
  // hood on corbels and the flue
  const hood = new THREE.CylinderGeometry(0.3, w * 0.62, 1.6, 4, 1, true); hood.rotateY(Math.PI / 4); hood.scale(1, 1, 0.75); hood.translate(0, 2.6, -0.1);
  b.add('rubbleIn', at(merge([clean(hood), box(0.5, 2.2, 0.5, { y: 3.4, z: -0.25 }), box(0.2, 0.9, 0.9, { x: -w / 2 + 0.1, y: 0.78 }), box(0.2, 0.9, 0.9, { x: w / 2 - 0.1, y: 0.78 })]), x, y, z, ry), { collide: false });
  // the bellows: two boards and a leather body, a nozzle to the tuyere, a
  // rocking pole to work them
  const [bx, bz] = rot(w / 2 + 0.75, -0.2, ry);
  const bel = C.pillow(1.1, 0.6, 0.34, { seed: 903 }); bel.scale(1, 1, 1);
  b.add('p.leatherBlack', place(bel, { x: x + bx, y: y + 0.72, z: z + bz, ry: ry + 0.12, rz: -0.12 }), { collide: false });
  b.add('woodDark', place(merge([box(1.15, 0.035, 0.62, { y: 0.34 }), box(1.1, 0.035, 0.58, {}), box(0.5, 0.05, 0.05, { x: -0.8, y: 0.17 })]), { x: x + bx, y: y + 0.72, z: z + bz, ry: ry + 0.12, rz: -0.12 }), { collide: false });
  b.add('woodDark', place(merge([box(0.08, 0.75, 0.08, { x: 0.45, z: 0.25 }), box(0.08, 0.75, 0.08, { x: -0.45, z: -0.25 }), box(0.08, 0.75, 0.08, { x: 0.45, z: -0.25 }), box(0.08, 0.75, 0.08, { x: -0.45, z: 0.25 })]), { x: x + bx, y, z: z + bz, ry }));
  const pole = cyl(0.03, 0.035, 2.4, 6, {}); pole.rotateZ(Math.PI / 2 - 0.35);
  b.add('wood', place(pole, { x: x + bx, y: y + 1.6, z: z + bz, ry }), { collide: false });
  b.add('iron', place(cyl(0.04, 0.02, 0.5, 6, {}).rotateZ(Math.PI / 2), { x: x + rot(w / 2 + 0.05, -0.2, ry)[0], y: y + 0.82, z: z + rot(w / 2 + 0.05, -0.2, ry)[1], ry }), { collide: false });
  const [fx, fz] = rot(0, 0.9, ry);
  emit?.({ x: x + fx, y: y + 1.1, z: z + fz, color: 0xff7a34, intensity: 7, distance: 10, flicker: 0.35 });
}
// stone quench trough with water
export function trough(b, x, y, z, ry = 0, l = 1.2) {
  b.add('rubbleIn', at(merge([box(l, 0.55, 0.08, { z: 0.26 }), box(l, 0.55, 0.08, { z: -0.26 }), box(0.08, 0.55, 0.6, { x: l / 2 - 0.04 }), box(0.08, 0.55, 0.6, { x: -l / 2 + 0.04 }), box(l, 0.1, 0.6, {})]), x, y, z, ry));
  b.add('p.water', at(box(l - 0.14, 0.01, 0.44, { y: 0.45 }), x, y, z, ry), { collide: false, shadow: false });
}
// bar iron and a few blanks leaning in a corner
export function barIron(b, x, y, z, ry = 0) {
  const g = [];
  for (let k = 0; k < 9; k++) { const bar = box(0.035, 1.6 + (k % 3) * 0.3, 0.035, {}); bar.rotateZ(0.16 + (k % 4) * 0.03); bar.translate(k * 0.05, 0, (k % 2) * 0.04); g.push(bar); }
  b.add('p.ironRust', at(merge(g), x, y, z, ry), { collide: false });
}
export function grindstone(b, x, y, z, ry = 0) {
  const w = cyl(0.42, 0.42, 0.12, 22, {}); w.rotateX(Math.PI / 2); w.translate(0, 0.72, 0);
  b.add('ashlar', at(w, x, y, z, ry), { collide: false });
  b.add('woodDark', at(merge([box(0.08, 0.72, 0.08, { x: -0.1, z: 0.2 }), box(0.08, 0.72, 0.08, { x: 0.1, z: 0.2 }), box(0.08, 0.72, 0.08, { x: -0.1, z: -0.2 }), box(0.08, 0.72, 0.08, { x: 0.1, z: -0.2 }), box(0.05, 0.05, 0.62, { y: 0.72 })]), x, y, z, ry));
  b.add('wood', at(merge([box(0.03, 0.03, 0.72, { y: 0.72 }), box(0.03, 0.22, 0.03, { y: 0.62, z: 0.36 })]), x, y, z, ry), { collide: false });
}
// a two-wheeled cart: plank bed with side rails, shafts resting on the
// ground, spoked wheels on an axle
let WHEEL = null;
function wheel() {
  if (WHEEL) return WHEEL;
  const rim = new THREE.TorusGeometry(0.6, 0.045, 6, 28); const hub = cyl(0.1, 0.1, 0.26, 10, {}); hub.rotateX(Math.PI / 2); hub.translate(0, -0.13, 0);
  hub.rotateX(0); const parts = [clean(rim), hub];
  for (let k = 0; k < 10; k++) { const sp = box(0.035, 0.52, 0.035, { y: 0.07 }); sp.rotateZ(k * TAU / 10); parts.push(sp); }
  WHEEL = merge(parts);
  return WHEEL;
}
export function cart(b, x, y, z, ry = 0, { tilt = 0.18 } = {}) {
  const bed = [box(2.2, 0.06, 1.2, {}), ...[-0.62, 0.62].map(s => box(2.2, 0.36, 0.05, { z: s })), box(0.05, 0.36, 1.2, { x: -1.1 }), box(0.05, 0.36, 1.2, { x: 1.1 })];
  for (let k = 0; k < 7; k++) bed.push(box(0.04, 0.4, 0.04, { x: -1.0 + k * 0.33, z: 0.64 }), box(0.04, 0.4, 0.04, { x: -1.0 + k * 0.33, z: -0.64 }));
  const shafts = [-0.45, 0.45].map(s => box(2.4, 0.08, 0.08, { x: 2.1, z: s }));
  const g = merge([...bed, ...shafts]);
  // rests on its axle and the tips of its shafts
  g.rotateZ(-tilt); g.translate(0, 0.62, 0);
  b.add('beamExt', at(g, x, y, z, ry));
  for (const s of [-0.72, 0.72]) {
    const wg = wheel().clone(); if (s < 0) wg.rotateY(Math.PI); wg.translate(0, 0.6, s);
    b.add('woodDark', at(wg, x, y, z, ry));
  }
  b.add('iron', at(merge([-0.72, 0.72].map(s => { const r = new THREE.TorusGeometry(0.62, 0.012, 4, 28); r.translate(0, 0.6, s); return clean(r); })), x, y, z, ry), { collide: false });
}
