import * as THREE from 'three';
import { box, cyl, sphere, lathe, merge, place, quad, TAU } from '../core/kit.js';
import * as C from './props/cloth.js';
import * as S from './props/sculpt.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { wall as wallGeo } from '../core/kit.js';

// Furnishings. Each builder adds geometry to a Batch at (x,z) with
// rotation ry (radians) and returns useful anchor points.

const rot = (x, z, ry) => [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
function at(g, x, y, z, ry) { return place(g, { x, y, z, ry }); }

// A scriptorium desk: sloping top on a trestle, with a book-rest, an inkhorn
// and a sheet of parchment; bench behind.
export function desk(b, x, y, z, ry, { small = false, rest = true } = {}) {
  const w = small ? 1.0 : 1.35, d = 0.62;
  const parts = [];
  // legs & stretcher
  for (const sx of [-1, 1]) parts.push(box(0.08, 0.95, d * 0.8, { x: sx * (w / 2 - 0.08), y: 0, z: 0 }));
  parts.push(box(w - 0.1, 0.06, 0.06, { y: 0.25, z: 0 }));
  // sloping top
  const top = box(w, 0.045, d, {});
  top.rotateX(0.32); top.translate(0, 0.95, 0.02);
  parts.push(top);
  parts.push(box(w, 0.08, 0.05, { y: 0.87, z: d / 2 - 0.02 })); // lip, flush with the leaf's lower edge
  // shelf beneath, set back so that a seated scribe's knees pass under it
  parts.push(box(w - 0.12, 0.03, d * 0.42, { y: 0.45, z: -0.16 }));
  const g = merge(parts); at(g, x, y, z, ry); b.add('wood', g);
  // bench
  const bench = merge([box(w * 0.9, 0.05, 0.32, { y: 0.45, z: 0 }), box(0.06, 0.45, 0.28, { x: -w * 0.38 }), box(0.06, 0.45, 0.28, { x: w * 0.38 })]);
  // (0.62 behind the desk's centre: close enough that a seated scribe writes
  // with his elbow bent and his back upright; scripts/people/tasks.py 'write')
  const [bx, bz] = rot(0, 0.62, ry);
  at(bench, x + bx, y, z + bz, ry); b.add('woodDark', bench);
  // the work: a leaf of parchment pinned flat by a lead weight, the open
  // exemplar on its rest, the inkhorn set in the desk's edge, a quill (vane
  // and all) and the penknife laid by, a pumice stone
  const T = (g, dx, dy, dz, tilt = 0.32) => { g.rotateX(tilt); g.translate(dx, dy, dz); return at(g, x, y, z, ry); };
  // (the leaf lies centre-right under the writing hand; the exemplar on its
  // rest to the left; the inkhorn at the right edge)
  const PX = w * 0.02, RX = -w * 0.25;
  b.add('p.vellum', T(C.drape(w * 0.42, 0.34, 0.0, { hang: 0.006, seed: Math.round(x * 31 + z * 17), rumple: 0.15, floor: -0.5 }), PX, 1.003, 0.04), { collide: false, shadow: false });
  b.add('iron', T(box(0.05, 0.02, 0.03, {}), PX - w * 0.2, 1.0, -0.08), { collide: false, shadow: false });
  if (rest) {
    const r = merge([box(0.46, 0.3, 0.025, { x: RX, y: 0.99, z: -0.18 }), box(0.46, 0.03, 0.06, { x: RX, y: 0.99, z: -0.14 })]);
    r.rotateX(-0.25); at(r, x, y, z, ry); b.add('woodDark', r, { collide: false });
    // the open codex: two leaves bowed up from the spine, boards beneath
    const leaf = s2 => { const g = C.drape(0.19, 0.27, 0, { hang: 0.004, seed: 3 + s2, rumple: 0.15, floor: -0.5 }); g.rotateZ(s2 * 0.12); g.translate(s2 * 0.1, 0, 0); return g; };
    const book = merge([leaf(-1), leaf(1)]); book.rotateX(Math.PI / 2 - 0.25); book.translate(RX, 1.15, -0.12); at(book, x, y, z, ry);
    b.add('p.vellum', book, { collide: false, shadow: false });
    const boards = box(0.42, 0.29, 0.02, { x: RX, y: 1.0, z: -0.145 }); boards.rotateX(-0.25); at(boards, x, y, z, ry); b.add('p.leather', boards, { collide: false });
  }
  const horn = lathe([[0, 0], [0.028, 0], [0.034, 0.05], [0.03, 0.1], [0.022, 0.12], [0, 0.11]], 10, {}); horn.rotateZ(0.35); horn.translate(w * 0.43, 0.97, 0.2); at(horn, x, y, z, ry);
  b.add('p.boneDark', horn, { collide: false });
  b.add('p.ink', at(cyl(0.02, 0.02, 0.005, 8, { x: w * 0.43 + 0.04, y: 1.08, z: 0.2 }), x, y, z, ry), { collide: false, shadow: false });
  const qs = box(0.004, 0.004, 0.24, {}); const vane = new THREE.BufferGeometry();
  vane.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.02, 0.018, 0, -0.14, 0, 0, -0.22, 0, 0, -0.02, 0, 0, -0.22, -0.01, 0, -0.12], 3)); vane.computeVertexNormals();
  const quill = merge([qs, vane]); quill.rotateX(-0.95); quill.rotateY(0.25); quill.translate(w * 0.4, 1.13, 0.16); at(quill, x, y, z, ry);
  b.add('p.quill', quill, { collide: false, shadow: false });
  b.add('iron', T(merge([box(0.012, 0.003, 0.07, {}), box(0.012, 0.012, 0.08, { z: 0.075 })]), w * 0.33, 1.0, 0.1), { collide: false, shadow: false });
  b.add('ashlar', T(box(0.05, 0.02, 0.035, {}), w * 0.3, 0.99, -0.02), { collide: false, shadow: false });
}

export function table(b, x, y, z, ry, w = 2.2, d = 0.9, h = 0.78, mat = 'wood') {
  const parts = [box(w, 0.07, d, { y: h - 0.07 })];
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) parts.push(box(0.09, h - 0.07, 0.09, { x: sx * (w / 2 - 0.12), z: sz * (d / 2 - 0.12) }));
  if (w > 1.6) parts.push(box(w - 0.3, 0.06, 0.06, { y: 0.18 }));
  const g = merge(parts); at(g, x, y, z, ry); b.add(mat, g);
  return g;
}
export function trestle(b, x, y, z, ry, w = 4, d = 0.85, h = 0.78) {
  const parts = [box(w, 0.08, d, { y: h - 0.08 })];
  for (const s of [-1, 1]) parts.push(box(0.1, h - 0.08, d * 0.8, { x: s * (w / 2 - 0.35) }), box(0.14, 0.08, d * 0.9, { x: s * (w / 2 - 0.35), y: 0 }));
  parts.push(box(w - 0.8, 0.07, 0.07, { y: 0.3 }));
  const g = merge(parts); at(g, x, y, z, ry); b.add('wood', g);
}
export function bench(b, x, y, z, ry, w = 3.5, mat = 'woodDark') {
  const g = merge([box(w, 0.06, 0.32, { y: 0.4 }), box(0.07, 0.4, 0.26, { x: -w / 2 + 0.2 }), box(0.07, 0.4, 0.26, { x: w / 2 - 0.2 }), ...(w > 2.5 ? [box(0.07, 0.4, 0.26, {})] : [])]);
  at(g, x, y, z, ry); b.add(mat, g);
}
export function stool(b, x, y, z) {
  const g = merge([cyl(0.2, 0.2, 0.05, 10, { y: 0.45 }), ...[0, 1, 2].map(i => { const l = box(0.04, 0.46, 0.04, {}); l.rotateZ(0.12); l.translate(Math.cos(i * 2.1) * 0.13, 0, Math.sin(i * 2.1) * 0.13); return l; })]);
  at(g, x, y, z, 0); b.add('woodDark', g);
}
export function chair(b, x, y, z, ry) {
  const g = merge([box(0.46, 0.05, 0.44, { y: 0.46 }), box(0.46, 0.7, 0.05, { y: 0.46, z: -0.2 }),
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => box(0.05, 0.46, 0.05, { x: sx * 0.2, z: sz * 0.19 }))]);
  at(g, x, y, z, ry); b.add('woodDark', g);
}
export function chest(b, x, y, z, ry, w = 1.1) {
  const g = merge([box(w, 0.52, 0.55, {}), box(w + 0.04, 0.08, 0.59, { y: 0.52 })]);
  at(g, x, y, z, ry); b.add('door', g);
  const bands = merge([box(0.05, 0.62, 0.6, { x: -w * 0.3 }), box(0.05, 0.62, 0.6, { x: w * 0.3 })]);
  at(bands, x, y, z, ry); b.add('iron', bands, { collide: false });
}
export function barrel(b, x, y, z, s = 1, lying = false) {
  const prof = [[0, 0], [0.26 * s, 0], [0.3 * s, 0.2 * s], [0.32 * s, 0.4 * s], [0.3 * s, 0.6 * s], [0.26 * s, 0.8 * s], [0, 0.8 * s]];
  const g = lathe(prof, 14);
  if (lying) { g.rotateZ(Math.PI / 2); g.translate(0.4 * s, 0.32 * s, 0); }
  at(g, x, y, z, 0); b.add('woodDark', g);
  const hoops = merge([cyl(0.305 * s, 0.305 * s, 0.04, 14, { y: 0.18 * s }, true), cyl(0.305 * s, 0.305 * s, 0.04, 14, { y: 0.58 * s }, true)]);
  if (lying) { hoops.rotateZ(Math.PI / 2); hoops.translate(0.4 * s, 0.32 * s, 0); }
  at(hoops, x, y, z, 0); b.add('iron', hoops, { collide: false });
}
const POT = { pottery: 'p.earthenware', potteryDark: 'p.earthenDark' };
export function jar(b, x, y, z, s = 1, mat = 'pottery') {
  const prof = [[0, 0], [0.16 * s, 0], [0.3 * s, 0.25 * s], [0.34 * s, 0.5 * s], [0.26 * s, 0.85 * s], [0.14 * s, 0.98 * s], [0.17 * s, 1.02 * s], [0.175 * s, 1.05 * s], [0.13 * s, 1.06 * s], [0.12 * s, 1.0 * s], [0.2 * s, 0.85 * s], [0.26 * s, 0.5 * s], [0, 0.45 * s]];
  const g = lathe(prof, 22); at(g, x, y, z, (x * 3.1) % 6.28); b.add(POT[mat] || mat, g);
}
export function amphoraRow(b, x, y, z, ry, n = 5, s = 0.6) {
  for (let i = 0; i < n; i++) { const [dx, dz] = rot((i - (n - 1) / 2) * s * 0.75, 0, ry); jar(b, x + dx, y, z + dz, s * (0.9 + (i % 3) * 0.08), i % 2 ? 'potteryDark' : 'pottery'); }
}
// Shelves of an apothecary or a store: "shelves, bottles, jugs and jars"
// (OTHER_BUILDINGS: infirmary) — glazed albarelli, jugs with handles, green
// glass flasks, bowls, a mortar, a few bundles of herbs and gaps where a
// thing has been taken down. Uprights and boards of dark wood.
const VESSELS = {};
function vessel(kind, s) {
  const k = kind + s.toFixed(2);
  if (!VESSELS[k]) VESSELS[k] = kind === 'jug' ? C.jug(s) : kind === 'flask' ? C.flask(s) : kind === 'alb' ? C.albarello(s) : kind === 'bowl' ? C.bowl(0.1 * s, 0.05 * s) : kind === 'mortar' ? C.mortar(s) : null;
  return VESSELS[k];
}
const VMAT = { jug: ['p.earthenware', 'p.glazeBrown'], flask: ['p.glass'], alb: ['p.glazeGreen', 'p.glazeBrown', 'p.earthenDark'], bowl: ['p.earthenware', 'p.earthenDark'], mortar: ['aedIn'] };
export function vesselsOn(b, x, y, z, ry, w, seed = 1, { density = 0.8, big = 1 } = {}) {
  let sd = (seed * 2654435761) >>> 0; const r = () => ((sd = (Math.imul(sd, 1664525) + 1013904223) >>> 0) / 4294967296);
  let t = -w / 2 + 0.08;
  while (t < w / 2 - 0.08) {
    const u = r();
    if (u > density) { t += 0.12 + r() * 0.2; continue; }
    const kind = u < 0.25 ? 'alb' : u < 0.45 ? 'jug' : u < 0.62 ? 'flask' : u < 0.72 ? 'bowl' : u < 0.76 ? 'mortar' : 'alb';
    const sc = (kind === 'jug' ? 0.9 + r() * 0.5 : kind === 'alb' ? 0.9 + r() * 0.6 : 0.8 + r() * 0.6) * big;
    const g = vessel(kind, Math.round(sc * 10) / 10);
    const [dx, dz] = rot(t, (r() - 0.5) * 0.08, ry);
    const mats = VMAT[kind];
    b.add(mats[Math.floor(r() * mats.length)], place(g.clone(), { x: x + dx, y, z: z + dz, ry: r() * 6.28 }), { collide: false, shadow: kind !== 'flask' });
    t += 0.1 * sc + 0.06 + r() * 0.05 + (kind === 'bowl' ? 0.05 : 0);
  }
}
export function shelfUnit(b, x, y, z, ry, w = 1.8, h = 2.0, d = 0.4, withJars = true) {
  const parts = [box(0.05, h, d, { x: -w / 2 }), box(0.05, h, d, { x: w / 2 }), box(w, h, 0.02, { z: -d / 2 + 0.01 })];
  const n = 4;
  for (let i = 0; i <= n; i++) parts.push(box(w, 0.035, d, { y: 0.1 + i * (h - 0.15) / n }));
  const g = merge(parts); at(g, x, y, z, ry); b.add('woodDark', g);
  if (withJars) for (let i = 0; i < n; i++) vesselsOn(b, x, y + 0.135 + i * (h - 0.15) / n, z, ry, w, Math.round(x * 13 + z * 7 + i * 31), { density: 0.75 + (i % 2) * 0.1 });
}

// Bookcase flush against a wall; `face` is the direction it faces.
// Uses a spine texture on each shelf.
export function bookcase(b, a, c, y, h = 2.7, d = 0.42, { shelves = 5, variant = 0 } = {}) {
  const L = Math.hypot(c[0] - a[0], c[1] - a[1]);
  if (L < 0.6) return;
  const ang = Math.atan2(c[1] - a[1], c[0] - a[0]);
  const parts = [];
  parts.push(box(0.05, h, d, { x: 0.025 }), box(0.05, h, d, { x: L - 0.025 }), box(L, 0.05, d, { y: h - 0.05 }), box(L, 0.04, 0.02, { y: 0, z: -d / 2 + 0.01 }));
  const nUp = Math.max(1, Math.floor(L / 1.3));
  for (let i = 1; i < nUp; i++) parts.push(box(0.04, h, d, { x: i * L / nUp }));
  for (let i = 0; i < shelves; i++) parts.push(box(L, 0.035, d, { y: 0.08 + i * (h - 0.2) / shelves }));
  parts.push(box(L, h, 0.02, { z: -d / 2 + 0.01 }));
  const g = merge(parts);
  // local frame: x along wall, z points out of wall (+z = into room)
  g.translate(0, 0, d / 2);
  place(g, { x: a[0], y, z: a[1], ry: -ang });
  b.add('woodDark', g);
  // spines: one quad per shelf, slightly recessed
  const spines = [], books3d = [];
  for (let i = 0; i < shelves; i++) {
    const y0 = 0.08 + i * (h - 0.2) / shelves + 0.035, y1 = y0 + (h - 0.2) / shelves - 0.07;
    const off = (variant * 0.37 + i * 0.21) % 1;
    const q = quad([0.05, y0, d - 0.1], [L - 0.05, y0, d - 0.1], [L - 0.05, y1, d - 0.1], [0.05, y1, d - 0.1], off, off + L / 2.4, 0, 1, false);
    spines.push(q);
    // books in the round at the front of the shelf: a pile lying flat, a
    // great codex laid open-edged, one pulled forward
    let sd = (Math.round(a[0] * 97 + a[1] * 31) * 7 + i * 13 + variant) >>> 0; const rr = () => ((sd = (Math.imul(sd, 1664525) + 1013904223) >>> 0) / 4294967296);
    for (let t = 0.2 + rr() * 0.6; t < L - 0.3; t += 0.9 + rr() * 1.3) {
      const kind = rr(), mat = ['p.leather', 'p.leatherRed', 'p.leatherBlack', 'p.vellum'][Math.floor(rr() * 4)];
      if (kind < 0.6) {
        let yy = y0; const n = 2 + Math.floor(rr() * 3);
        for (let k = 0; k < n && yy < y1 - 0.08; k++) { const bw = 0.24 + rr() * 0.12, bd = 0.2 + rr() * 0.1, bh = 0.04 + rr() * 0.05; books3d.push([mat, box(bw, bh, bd, { x: t + (rr() - 0.5) * 0.04, y: yy, z: d - 0.1 - bd / 2 + 0.03, ry: (rr() - 0.5) * 0.15 })]); yy += bh; }
      } else {
        const bw = 0.05 + rr() * 0.06, bh = (y1 - y0) * (0.7 + rr() * 0.25), bd = 0.22 + rr() * 0.08;
        books3d.push([mat, box(bw, bh, bd, { x: t, y: y0, z: d - 0.1 - bd / 2 + 0.06, rz: (rr() - 0.5) * 0.25 })]);
      }
    }
  }
  const sg = merge(spines);
  place(sg, { x: a[0], y, z: a[1], ry: -ang });
  const byMat = {};
  for (const [m, g2] of books3d) (byMat[m] = byMat[m] || []).push(g2);
  for (const m in byMat) b.add(m, place(merge(byMat[m]), { x: a[0], y, z: a[1], ry: -ang }), { collide: false });
  b.add(`p.books.${variant % 4}`, sg, { collide: false });
}

// a bed of coals in a fire's local frame (o: its centre), glowing and dark
function emberBed(b, w, d, o, x, y, z, ry, seed, n = 24) {
  const { hot, dark } = S.embers(w, d, { seed, n });
  hot.translate(o.x, o.y, o.z); at(hot, x, y, z, ry); b.add('p.ember', hot, { collide: false, shadow: false });
  if (dark) { dark.translate(o.x, o.y, o.z); at(dark, x, y, z, ry); b.add('p.coal', dark, { collide: false }); }
}

// "a huge bread oven, mouth open, blazing red": a masonry dome on a
// plinth, the mouth an arched opening in a thick front with a real depth,
// the fire drawn to the back of the floor as glowing embers and a few
// burning logs, the oven door stone leaning beside it, peel and loaves
export function breadOven(b, x, y, z, ry, emit) {
  const dome = sculptDome(1.7, 0.75, 0.92);
  const parts = [box(3.6, 1.0, 3.2, {}), dome];
  // the front: a wall 0.5 thick pierced by the round-headed mouth
  parts.push(wallGeo([-0.75, 1.55], [0.75, 1.55], 1.0, 2.15, 0.55, [{ t: 0.75, w: 0.72, y0: 0.05, y1: 0.4, arch: 'round' }]));
  const g = merge(parts); at(g, x, y, z, ry); b.add('rubbleIn', g);
  // the dark hollow behind the mouth
  const cav = box(1.1, 0.6, 1.6, { y: 1.02, z: 0.45 }); at(cav, x, y, z, ry); b.add('p.coal', cav, { collide: false, shadow: false });
  emberBed(b, 0.8, 0.5, { x: 0, y: 1.0, z: 0.35 }, x, y, z, ry, 41, 18);
  const logs = merge([-0.12, 0.14].map((dx, k) => { const l = cyl(0.06, 0.07, 0.6, 7, {}); l.rotateX(Math.PI / 2); l.rotateY(k ? 0.5 : -0.4); l.translate(dx, 1.1, 0.3); return l; }));
  at(logs, x, y, z, ry); b.add('char', logs, { collide: false });
  const door = box(0.8, 0.62, 0.08, {}); door.rotateX(-0.12); door.rotateY(0.3); door.translate(1.0, 0, 1.9); at(door, x, y, z, ry); b.add('rubbleIn', door);
  const [fx, fz] = rot(0, 2.3, ry);
  emit?.({ x: x + fx, y: y + 1.35, z: z + fz, color: 0xff7a30, intensity: 6, distance: 10, flicker: 0.35 });
  // peel and loaves on a board
  const peel = merge([box(0.05, 0.05, 2.2, { y: 0.9, z: 2.2 }), box(0.4, 0.02, 0.35, { y: 0.9, z: 3.3 })]);
  peel.rotateY(0.3); at(peel, x - 1.2, y, z, ry); b.add('wood', peel, { collide: false });
  const loaves = merge([0, 1, 2, 3, 4, 5].map(k => { const l = sphere(0.13, {}, 10, 6, TAU, Math.PI / 2); l.scale(1, 0.55, 1); l.translate(1.0 + (k % 3) * 0.26, 1.0, 1.05 + Math.floor(k / 3) * 0.28); return l; }));
  at(loaves, x, y, z, ry); b.add('p.bread', loaves, { collide: false });
}
function sculptDome(r, sy, sz) {
  const d = new THREE.SphereGeometry(r, 26, 12, 0, TAU, 0, Math.PI / 2);
  d.deleteAttribute('uv'); d.deleteAttribute('normal');
  const g = mergeVertices(d, 1e-5), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i), n = 1 + 0.03 * Math.sin(X * 5 + Z * 3) * Math.cos(Y * 6) + 0.02 * Math.sin(X * 13 - Y * 9);
    p.setXYZ(i, X * n, Y * sy * n, Z * n);
  }
  g.scale(1, 1, sz); g.translate(0, 1.0, 0); g.computeVertexNormals();
  return g;
}

// open hearth with a hood, cauldrons and a spit ("big boiling pots and
// grills turning")
export function hearth(b, x, y, z, ry, emit, { w = 3.4, hoodTop = 6.6 } = {}) {
  const parts = [box(w, 0.45, 1.8, {}), box(w + 0.4, 0.2, 0.3, { y: 2.3, z: 0.85 })];
  // hood: tapered box
  const hood = new THREE.BufferGeometry().copy(new THREE.CylinderGeometry(0.55, w * 0.62, hoodTop - 2.5, 4, 1, true));
  hood.rotateY(Math.PI / 4); hood.scale(1, 1, 0.7); hood.translate(0, 2.5 + (hoodTop - 2.5) / 2, 0.1);
  parts.push(hood);
  const g = merge(parts); at(g, x, y, z, ry); b.add('rubbleIn', g);
  // the fire: a bed of ash and coals, embers glowing through it, logs
  // burning across firedogs
  const bed = C.drape(1.5, 1.0, 0.47, { hang: 0.05, seed: 17, rumple: 3, floor: 0.45 }); at(bed, x, y, z, ry); b.add('p.coal', bed, { collide: false });
  emberBed(b, 1.2, 0.6, { x: 0, y: 0.49, z: -0.05 }, x, y, z, ry, 43, 30);
  const logs = merge([[-0.25, 0.4], [0.2, -0.5], [0, 0.1]].map(([dx, a2]) => { const l = cyl(0.07, 0.08, 0.95, 8, {}); l.rotateZ(Math.PI / 2); l.rotateY(a2); l.translate(dx, 0.6, 0.05); return l; }));
  at(logs, x, y, z, ry); b.add('char', logs, { collide: false });
  const dogs = merge([-0.55, 0.55].map(dx => merge([box(0.05, 0.3, 0.05, { x: dx, y: 0.45, z: 0.4 }), box(0.04, 0.04, 0.8, { x: dx, y: 0.56, z: 0.0 })])));
  at(dogs, x, y, z, ry); b.add('iron', dogs, { collide: false });
  for (const [dx, s] of [[-0.9, 0.42], [0.7, 0.34]]) {
    const pot = lathe([[0, 0], [s * 0.6, 0], [s, s * 0.4], [s, s * 1.1], [s * 0.9, s * 1.3]], 14, { x: dx, y: 0.75, z: 0.1 });
    at(pot, x, y, z, ry); b.add('iron', pot, { collide: false });
    const chain = box(0.03, 1.4, 0.03, { x: dx, y: 0.75 + s * 1.3, z: 0.1 }); at(chain, x, y, z, ry); b.add('iron', chain, { collide: false });
  }
  const spit = merge([box(w - 0.3, 0.04, 0.04, { y: 1.15, z: 0.6 }), box(0.06, 1.2, 0.06, { x: -(w / 2 - 0.2), z: 0.6 }), box(0.06, 1.2, 0.06, { x: w / 2 - 0.2, z: 0.6 })]);
  at(spit, x, y, z, ry); b.add('iron', spit, { collide: false });
  // a haunch turning on the spit: thick at the rump, narrowing to the shank
  const meat = lathe([[0, 0], [0.1, 0.02], [0.14, 0.1], [0.14, 0.24], [0.1, 0.34], [0.06, 0.42], [0.04, 0.5], [0.035, 0.56], [0, 0.57]], 14, {});
  meat.scale(1, 1, 0.82); meat.rotateZ(Math.PI / 2); meat.translate(0.45, 1.15, 0.6); at(meat, x, y, z, ry); b.add('p.roast', meat, { collide: false });
  const [fx, fz] = rot(0, 1.3, ry);
  emit?.({ x: x + fx, y: y + 1.0, z: z + fz, color: 0xff8a3a, intensity: 10, distance: 14, flicker: 0.45 });
}

// wall fireplace with a projecting hood
export function fireplace(b, x, y, z, ry, emit, { w = 2.6, h = 4.2 } = {}) {
  const parts = [box(w, 0.25, 1.1, { z: 0.35 }), box(0.35, 1.6, 0.9, { x: -w / 2 + 0.17, z: 0.3 }), box(0.35, 1.6, 0.9, { x: w / 2 - 0.17, z: 0.3 }),
    box(w + 0.3, 0.3, 1.0, { y: 1.6, z: 0.32 })];
  const hood = new THREE.BufferGeometry().copy(new THREE.CylinderGeometry(0.4, w * 0.62, h - 1.9, 4, 1, true));
  hood.rotateY(Math.PI / 4); hood.scale(1, 1, 0.45); hood.translate(0, 1.9 + (h - 1.9) / 2, 0.12);
  parts.push(hood);
  const g = merge(parts); at(g, x, y, z, ry); b.add('aedIn', g);
  const logs = merge([cyl(0.09, 0.09, 1.1, 8, {}), cyl(0.08, 0.08, 1.0, 8, {})]);
  logs.rotateZ(Math.PI / 2); logs.translate(0.5, 0.35, 0.35);
  at(logs, x, y, z, ry); b.add('char', logs, { collide: false });
  emberBed(b, 0.9, 0.45, { x: 0.15, y: 0.25, z: 0.35 }, x, y, z, ry, 47, 22);
  const [fx, fz] = rot(0, 1.0, ry);
  emit?.({ x: x + fx, y: y + 0.8, z: z + fz, color: 0xff8438, intensity: 7, distance: 11, flicker: 0.4 });
}

export function candle(b, x, y, z, h = 0.25, emit, strong = 1) {
  b.add('wax', cyl(0.025, 0.028, h, 8, { x, y, z }), { collide: false });
  b.add('flame', sphere(0.02, { x, y: y + h + 0.025, z, sy: 2 }, 6, 4), { collide: false, shadow: false });
  if (emit) emit({ x, y: y + h + 0.1, z, color: 0xffb060, intensity: 0.9 * strong, distance: 5 * strong, flicker: 0.25, small: true });
}
export function candlestick(b, x, y, z, h = 1.2, emit) {
  b.add('bronze', lathe([[0, 0], [0.18, 0], [0.16, 0.05], [0.04, 0.12], [0.03, h - 0.1], [0.08, h - 0.05], [0.09, h], [0, h]], 12, { x, y, z }), { collide: false });
  candle(b, x, y + h, z, 0.3, emit);
}
// the great bronze tripod that burns all night in the church, "two men tall"
export function tripod(b, x, y, z, emit) {
  const parts = [];
  for (let i = 0; i < 3; i++) {
    const a = i * TAU / 3;
    const leg = cyl(0.04, 0.06, 3.2, 8, {}); leg.rotateZ(0.18); leg.rotateY(-a); leg.translate(Math.cos(a) * 0.35, 0, Math.sin(a) * 0.35);
    parts.push(leg);
  }
  parts.push(lathe([[0, 0], [0.5, 0.05], [0.62, 0.25], [0.55, 0.3], [0, 0.2]], 16, { y: 3.1 }));
  const g = merge(parts); at(g, x, y, z, 0); b.add('bronze', g);
  b.add('fire', sphere(0.28, { x, y: y + 3.45, z, sy: 1.4 }, 8, 6), { collide: false, shadow: false });
  emit?.({ x, y: y + 3.7, z, color: 0xffa050, intensity: 14, distance: 26, flicker: 0.3 });
}
export function oilLamp(b, x, y, z, emit, hang = 0) {
  if (hang) b.add('iron', box(0.015, hang, 0.015, { x, y, z }), { collide: false });
  b.add('pottery', lathe([[0, 0], [0.07, 0.01], [0.09, 0.04], [0.03, 0.06], [0, 0.06]], 10, { x, y: y - 0.06, z }), { collide: false });
  b.add('flame', sphere(0.018, { x: x + 0.07, y: y + 0.02, z, sy: 2 }, 6, 4), { collide: false, shadow: false });
  emit?.({ x, y: y + 0.1, z, color: 0xffb060, intensity: 1.4, distance: 7, flicker: 0.25, small: true });
}
export function torch(b, x, y, z, ry, emit) {
  const g = merge([box(0.06, 0.06, 0.4, { z: 0.2 }), cyl(0.04, 0.03, 0.6, 8, { z: 0.42 })]);
  at(g, x, y, z, ry); b.add('iron', g, { collide: false });
  const [dx, dz] = rot(0, 0.42, ry);
  b.add('fire', sphere(0.08, { x: x + dx, y: y + 0.7, z: z + dz, sy: 1.8 }, 6, 4), { collide: false, shadow: false });
  emit?.({ x: x + dx, y: y + 0.85, z: z + dz, color: 0xff9a45, intensity: 5, distance: 11, flicker: 0.4 });
}
export function lectern(b, x, y, z, ry, mat = 'woodDark') {
  const top = box(0.6, 0.04, 0.45, {}); top.rotateX(0.5); top.translate(0, 1.2, 0);
  const g = merge([box(0.3, 0.06, 0.3, {}), box(0.08, 1.1, 0.08, {}), top]);
  at(g, x, y, z, ry); b.add(mat, g);
  const book = box(0.5, 0.05, 0.36, {}); book.rotateX(0.5); book.translate(0, 1.25, 0.01); at(book, x, y, z, ry); b.add('parchment', book, { collide: false });
}
// A bed of pegged boards: posts, side rails and a head board, a straw
// mattress in coarse ticking, then — where the sick lie — a linen sheet
// falling over the sides, a pillow and a rumpled wool blanket; elsewhere a
// blanket alone. A few shared variants, turned and placed.
const BEDS = new Map();
function bedParts(v, linen) {
  const key = v + (linen ? 'L' : 'S');
  if (BEDS.has(key)) return BEDS.get(key);
  const top = 0.3 + 0.15;
  const frame = merge([
    ...[[-0.43, -0.96, 0.78], [0.43, -0.96, 0.78], [-0.43, 0.96, 0.52], [0.43, 0.96, 0.52]].map(([px, pz, h]) => box(0.07, h, 0.07, { x: px, z: pz })),
    box(0.06, 0.14, 1.86, { x: -0.43, y: 0.2 }), box(0.06, 0.14, 1.86, { x: 0.43, y: 0.2 }),
    box(0.8, 0.3, 0.035, { y: 0.34, z: -0.96 }), box(0.8, 0.1, 0.035, { y: 0.26, z: 0.96 }),
    ...[-0.6, -0.2, 0.2, 0.6].map(sz => box(0.84, 0.025, 0.1, { y: 0.28, z: sz })),
  ]);
  const matt = C.mattress(0.8, 1.86, 0.15, { seed: 20 + v }); matt.translate(0, 0.3, 0);
  const parts = { frame, matt };
  if (linen) {
    parts.sheet = C.drape(0.8, 1.86, top + 0.01, { hang: 0.22, seed: 30 + v, rumple: 0.8, foot: true, head: false, floor: 0.3 });
    const pl = C.pillow(0.56, 0.32, 0.1, { seed: 40 + v }); pl.translate(0, top + 0.01, -0.72); parts.pillow = pl;
    const bl = C.blanket(0.8, 1.05 - v * 0.1, top + 0.03, { seed: 50 + v, hang: 0.15 }); bl.translate(0, 0, 0.42 + v * 0.05); parts.blanket = bl;
  } else {
    const bl = C.blanket(0.8, 1.3 - v * 0.12, top, { seed: 60 + v, hang: 0.12 }); bl.translate(0, 0, 0.28 + v * 0.06); parts.blanket = bl;
  }
  BEDS.set(key, parts);
  return parts;
}
export function bed(b, x, y, z, ry, mat = 'straw') {
  const v = Math.abs(Math.round(x * 7 + z * 3)) % 3, linen = mat === 'linen';
  const P = bedParts(v, linen), o = { x, y, z, ry: ry + (v - 1) * 0.02 };
  b.add('woodDark', place(P.frame.clone(), o));
  b.add('p.sacking', place(P.matt.clone(), o), { collide: false });
  if (P.sheet) b.add('p.linen', place(P.sheet.clone(), o), { collide: false, shadow: false });
  if (P.pillow) b.add('p.linenWhite', place(P.pillow.clone(), o), { collide: false });
  b.add(v === 1 ? 'p.blanketGrey' : 'p.blanket', place(P.blanket.clone(), o), { collide: false });
}
export function crucifix(b, x, y, z, ry, s = 0.5) {
  const g = merge([box(0.05 * s, 1.0 * s, 0.03, { y: 0 }), box(0.55 * s, 0.05 * s, 0.03, { y: 0.68 * s })]);
  at(g, x, y, z, ry); b.add('woodDark', g, { collide: false });
}
export function woodpile(b, x, y, z, ry, n = 18) {
  const logs = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / 6), k = i % 6;
    const l = cyl(0.09, 0.09, 1.1, 7, {}); l.rotateX(Math.PI / 2);
    l.translate((k - 2.5) * 0.19 + (row % 2) * 0.09, 0.1 + row * 0.16, 0);
    logs.push(l);
  }
  const g = merge(logs); at(g, x, y, z, ry); b.add('bark', g);
}
// Coarse sacks of grain or flour (props/sculpt.js sack()): slumped against
// one another in a row, a couple laid across the shoulders of the row or
// flopped on the floor, the mouths tied; spilt grain at the foot.
const SACKS = [];
function sackShape(i) {
  if (!SACKS.length) for (let k = 0; k < 6; k++) SACKS.push(S.sack(401 + k, { w: 0.46 + (k % 3) * 0.04, d: 0.33 + (k % 2) * 0.04, h: 0.7 + (k % 3) * 0.06, fill: [0.95, 0.8, 0.9, 0.7, 1, 0.85][k], tied: k !== 3 }));
  return SACKS[i % SACKS.length];
}
export function sacks(b, x, y, z, n = 5) {
  let seed = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280 / 233280);
  const ry0 = rnd() * 0.5 - 0.25, perRow = 4;
  const standing = [], lying = [];
  for (let i = 0; i < n; i++) ((i % 5 === 4 && standing.length >= 2) ? lying : standing).push(i);
  const cos = Math.cos(ry0), sin = Math.sin(ry0);
  const toW = (lx, lz) => [x + lx * cos + lz * sin, z - lx * sin + lz * cos];
  const tops = [];
  standing.forEach((i, k) => {
    const col = k % perRow, row = Math.floor(k / perRow);
    const lx = col * 0.47 - 0.7 + (rnd() - 0.5) * 0.06, lz = row * 0.42 + (rnd() - 0.5) * 0.06;
    const [sx, sz] = toW(lx, lz);
    // leaning a little toward the middle of the row, as sacks settle
    const lean = (col - (perRow - 1) / 2) * -0.05 + (rnd() - 0.5) * 0.06;
    const g = place(sackShape(i + Math.floor(rnd() * 6)).clone(), { x: sx, y, z: sz, ry: ry0 + (rnd() - 0.5) * 0.5, rz: lean, rx: (rnd() - 0.5) * 0.06 });
    b.add('p.grainSack', g, { collide: true, shadow: false });
    tops.push([sx, sz]);
  });
  lying.forEach((i, k) => {
    // across the shoulders of two standing sacks, or on the floor before them
    const on = tops.length >= 2 && k < Math.floor(tops.length / 2);
    const [ax, az] = on ? tops[k * 2] : toW(-0.3 + k * 0.6, -0.55);
    const [bx, bz] = on ? tops[k * 2 + 1] : [ax, az];
    const cx = (ax + bx) / 2, cz = (az + bz) / 2;
    const g = place(sackShape(i + 3).clone(), { x: cx, y: on ? y + 0.52 : y + 0.19, z: cz + (on ? 0 : 0.05), rz: Math.PI / 2 - 0.1, ry: ry0 + (rnd() - 0.5) * 0.4, sy: 0.95, sx: 0.8 });
    b.add('p.grainSack', g, { collide: !on, shadow: false });
  });
  // a little spilt grain at the foot of the pile
  const [gx, gz] = toW(0.1, -0.4);
  b.add('straw', cyl(0.32, 0.45, 0.015, 11, { x: gx, y: y + 0.004, z: gz }), { collide: false, shadow: false });
}
// herbs hung to dry from a rail: bunches head-down on strings, each its own
// size, some fresher and greener, some dry and brown (props/sculpt.js)
export function hangingHerbs(b, x, y, z, ry, n = 6) {
  b.add('beam', box(0.06, 0.06, n * 0.35, { x, y, z, ry }), { collide: false });
  for (let i = 0; i < n; i++) {
    const [dx, dz] = rot(0, (i - (n - 1) / 2) * 0.35 + ((i * 37) % 7 - 3) * 0.015, ry);
    const drop = 0.08 + ((i * 53) % 5) * 0.03, H = S.herbBundle(900 + i, { n: 7 + (i % 4), L: 0.34 + (i % 3) * 0.08 });
    const o = { x: x + dx, y: y - drop, z: z + dz, ry: i * 1.9, rz: ((i * 29) % 5 - 2) * 0.04 };
    b.add('p.twine', box(0.004, drop, 0.004, { x: x + dx, y: y - drop, z: z + dz }), { collide: false, shadow: false });
    b.add('p.twine', place(H.tie, o), { collide: false, shadow: false });
    b.add('p.herbStem', place(H.stems, o), { collide: false, shadow: false });
    b.add(i % 3 === 1 ? 'p.herbGreen' : 'p.herbDry', place(H.leaves, o), { collide: false });
  }
}
export function well(b, x, y, z, r = 0.95) {
  const g = merge([cyl(r, r + 0.05, 0.85, 20, {}, true), cyl(r - 0.3, r - 0.3, 0.85, 20, {}, true), (() => { const t = new THREE.RingGeometry(r - 0.3, r + 0.05, 20); t.rotateX(-Math.PI / 2); t.translate(0, 0.85, 0); return t; })()]);
  at(g, x, y, z, 0); b.add('aed', g);
  b.add('water', cyl(r - 0.3, r - 0.3, 0.02, 20, { x, y: y + 0.2, z }), { collide: false });
  const frame = merge([box(0.12, 2.2, 0.12, { x: -r + 0.1 }), box(0.12, 2.2, 0.12, { x: r - 0.1 }), box(2 * r, 0.12, 0.14, { y: 2.1 })]);
  at(frame, x, y, z, 0.4); b.add('beamExt', frame);
}

export { rot };
