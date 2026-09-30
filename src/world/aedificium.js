import * as THREE from 'three';
import * as CL from './props/cloth.js';
import * as SP from './props/sculpt.js';
import { pointInPoly as pointIn } from '../core/library.js';
import { propMaterials } from '../core/propMaterials.js';
import { AED } from '../core/plan.js';
import { sectorPoints, rot, buildRooms, TOWERS } from '../core/library.js';
import { Batch, wall, wallLoop, prism, vault, column, spiral, box, cyl, merge, pane, pyramidRoof, quad, place, sphere, lathe, vaultSmooth } from '../core/kit.js';
import * as F from './furniture.js';
import { buildLibrary } from './aedLibrary.js';

// The Aedificium, from First Day, Prime and Nones and Second Day, Terce:
// kitchen in the western half of the ground floor and refectory in the
// eastern half; a bread oven in the west tower, a great hearth in the
// south tower, a fireplace in the north tower; the east tower's spiral
// stair rises to the scriptorium and is the only one reaching the
// library; two narrower heated stairs wind round the oven flues in the
// west and south towers. The scriptorium is one undivided floor with
// forty windows and forty desks; the library above is the labyrinth.

const A = AED;
const C = [A.x, A.z];
const S = sectorPoints(A);
const deg = Math.PI / 180;
const polar = (r, a, c = [0, 0]) => [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];

// exterior outline (wall centre line): 24 vertices
export const OUTLINE = (() => {
  const o = [];
  for (let k = 0; k < 4; k++) for (let i = 1; i <= 6; i++) o.push(rot(S.t[i], k));
  return o;
})();
export const WELL = Array.from({ length: 8 }, (_, i) => polar(A.a0 / Math.cos(22.5 * deg), (22.5 + 45 * i) * deg));
const WELL_IN = Array.from({ length: 8 }, (_, i) => polar((A.a0 - A.wallWell / 2) / Math.cos(22.5 * deg), (22.5 + 45 * i) * deg));

// shafts (E-frame) and their world positions
export const STAIR_E = { c: [A.dT - 1.8, 0], rIn: 0.24, rOut: 1.5, shaftIn: 1.62, shaftTh: 0.38 };
export const STAIR_WS = { c: [A.dT, 0], rIn: 0.55, rOut: 1.7, shaftIn: 1.8, shaftTh: 0.4 };
const circle = (c, r, n = 20) => Array.from({ length: n }, (_, i) => polar(r, i * 2 * Math.PI / n, c));
// F4 (con_000080 H, con_000562 H, con_001155 H, con_002687 H, con_000530 H):
// Jorge's secret stair "in the thickness of the wall between the kitchen and
// the south tower, parallel to the spiral", from the ossuary "straight up to
// the blind room". RECON: a narrow newel stair in a round pier engaged in the
// south-west wall of the finis Africae (the S.hall | S.T4 wall), clear of the
// S-tower hearth spiral; its foot opens behind the blind wall with the plaque
// on the left of the ossuary passage (claim_002621 "sounds from the wall to our
// left"). AED frame; built in aedLibrary.js hiddenStair().
export const HIDDEN_STAIR = (() => {
  const a = Math.PI / 2 + 2 * Math.PI / 7;       // hall-centre → S.hall|S.T4 edge midpoint
  const r = 3.65;
  return { c: [r * Math.cos(a), A.dT + r * Math.sin(a)], rIn: 1.1, th: 0.3, bot: -2.8, top: A.y2, toHall: a - Math.PI, zPass: 34.3, xT: A.ossX - 0.85 };
})();
const HS_HOLE = circle(HIDDEN_STAIR.c, HIDDEN_STAIR.rIn + HIDDEN_STAIR.th / 2, 20);
// drop the triangles of a (non-colliding) vault that fall inside the shaft
function cutDisc(geo, c, r) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const keep = [];
  const attrs = Object.keys(g.attributes);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i += 3) {
    const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    if (Math.hypot(cx - c[0], cz - c[1]) > r) keep.push(i);
  }
  const out = new THREE.BufferGeometry();
  for (const k of attrs) {
    const src = g.attributes[k], n = src.itemSize, arr = new Float32Array(keep.length * 3 * n);
    keep.forEach((i, j) => { for (let v = 0; v < 3; v++) for (let q = 0; q < n; q++) arr[(j * 3 + v) * n + q] = src.array[(i + v) * n + q]; });
    out.setAttribute(k, new THREE.BufferAttribute(arr, n));
  }
  return out;
}

export const toWorld = p => [p[0] + C[0], p[1] + C[1]];

export function buildAedificium(M, ctx) {
  propMaterials(M);
  const ext = new Batch('aed-exterior', [C[0], 0, C[1]]);
  const g0 = new Batch('aed-ground', [C[0], 0, C[1]]);
  const g1 = new Batch('aed-scriptorium', [C[0], 0, C[1]]);
  const emit = (o) => ctx.emit({ ...o, x: o.x + C[0], z: o.z + C[1] });
  const interact = (o) => ctx.interact({ ...o, pos: new THREE.Vector3(o.pos[0] + C[0], o.pos[1], o.pos[2] + C[1]) });

  const y0 = A.y0, y1 = A.y1, y2 = A.y2;
  const nOut = OUTLINE.length;
  const segLen = i => { const a = OUTLINE[i], b = OUTLINE[(i + 1) % nOut]; return Math.hypot(b[0] - a[0], b[1] - a[1]); };
  const isLong = i => (i % 6) === 5;        // t6(k) → t1(k+1)
  const towerOf = i => Math.floor(i / 6);   // for faces: tower index (E,S,W,N)
  const faceIdx = i => (i % 6) + 1;         // 1..5 for tower faces

  // ------------------------------------------------------------------
  // exterior walls
  // ------------------------------------------------------------------
  const openings = {};
  const add = (i, o) => { (openings[i] = openings[i] || []).push(o); };
  for (let i = 0; i < nOut; i++) {
    const L = segLen(i);
    const rel = y => y - y0;
    if (isLong(i)) {
      const k = towerOf(i); // wall k: SE(0), SW(1), NW(2), NE(3)
      const door = k === 0 || k === 1; // SE: south entrance; SW: kitchen door
      // F8 (con_001806, con_000342): only the refectory's ground windows may
      // face the precipice. The NW long wall (k=2) is the kitchen half over
      // the cliff — give it no ground windows. Kept ground windows are widened
      // to the "large windows of opaque glass" of con_000098 (RECON/BOOK).
      const groundWin = k !== 2;
      if (groundWin) for (const t of door ? [0.2, 0.8] : [0.2, 0.5, 0.8]) add(i, { t: L * t, w: 1.5, y0: rel(3.1), y1: rel(4.9), arch: 'round' });
      if (door) add(i, { t: L / 2, w: 2.1, y0: 0, y1: rel(3.3), arch: 'round' });
      for (const t of [0.2, 0.5, 0.8]) add(i, { t: L * t, w: 2.3, y0: rel(y1 + 1.0), y1: rel(y1 + 3.9), arch: 'round' });
      for (const t of [0.25, 0.75]) {
        add(i, { t: L * t, w: 0.95, y0: rel(y2 + 1.75), y1: rel(y2 + 2.95), arch: 'round' });
        add(i, { t: L * t + 1.6, w: 0.12, y0: rel(y2 + 1.3), y1: rel(y2 + 1.95), arch: 'flat' });
      }
    } else {
      const f = faceIdx(i);
      const k = towerOf(i);
      // F8: the west tower (k=2) sits over the west/north precipice — its
      // ground-floor faces get no windows (con_001806). The south tower keeps
      // its plateau-facing ground windows.
      if (f >= 2 && f <= 4 && k !== 2) add(i, { t: L / 2, w: 1.3, y0: rel(3.0), y1: rel(4.6), arch: 'round' });
      add(i, { t: L / 2, w: 1.35, y0: rel(y1 + 1.2), y1: rel(y1 + 3.5), arch: 'round' });
      add(i, { t: L / 2, w: 0.95, y0: rel(y2 + 1.75), y1: rel(y2 + 2.95), arch: 'round' });
      add(i, { t: L / 2 + 1.55, w: 0.12, y0: rel(y2 + 1.3), y1: rel(y2 + 1.95), arch: 'flat' });
      add(i, { t: L / 2, w: 0.3, y0: rel(A.eave + 0.8), y1: rel(A.eave + 1.9), arch: 'round' });
    }
  }
  // main walls in two heights: body walls to the eave, tower faces higher
  for (let i = 0; i < nOut; i++) {
    const a = OUTLINE[i], b = OUTLINE[(i + 1) % nOut];
    const d = [b[0] - a[0], b[1] - a[1]], L = Math.hypot(...d), u = [d[0] / L, d[1] / L], e = A.wallOut / 2;
    const top = isLong(i) ? A.eave : A.towerTop;
    const a2 = [a[0] - u[0] * e, a[1] - u[1] * e], b2 = [b[0] + u[0] * e, b[1] + u[1] * e];
    ext.add('aed', wall(a2, b2, y0, top, A.wallOut, (openings[i] || []).map(o => ({ ...o, t: o.t + e }))));
    // foundations running down the rock
    const fOps = [];
    if (i === 8) fOps.push({ t: L / 2 - A.ossX + e, w: 1.8, y0: A.cliffDepth * -1 - 3.4 - 0.4, y1: A.cliffDepth * -1 - 3.4 + 2.1, arch: 'round' });
    ext.add('aed', wall(a2, b2, A.cliffDepth, y0, A.wallOut + 0.02, fOps.length ? fOps.map(o => ({ ...o, y0: o.y0, y1: o.y1 })) : []));
  }
  // plinth band, string courses, corbel table
  const plinthOps = {};
  for (let i = 0; i < nOut; i++) if (isLong(i) && (towerOf(i) === 0 || towerOf(i) === 1)) plinthOps[i] = [{ t: segLen(i) / 2, w: 2.3, y0: 0, y1: 4, arch: 'flat' }];   // cut clean through the plinth
  ext.add('aed', wallLoop(OUTLINE, -1.2, 1.05, A.wallOut + 0.5, plinthOps));
  for (const yy of [y1 - 0.35, y2 - 0.3]) ext.add('aed', wallLoop(OUTLINE, yy, yy + 0.24, A.wallOut + 0.22));
  // eave cornice and Lombard corbels
  const longOnly = OUTLINE.map((p, i) => i);
  for (let i = 0; i < nOut; i++) {
    const a = OUTLINE[i], b = OUTLINE[(i + 1) % nOut];
    const top = isLong(i) ? A.eave : A.towerTop;
    const L = segLen(i), d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
    const nrm = [d[1], -d[0]]; // outward for this winding
    const out = A.wallOut / 2 + 0.12;
    ext.add('aed', wall(a, b, top - 0.42, top, A.wallOut + 0.34));
    const n = Math.floor(L / 0.95);
    for (let k = 1; k < n; k++) {
      const t = k * L / n;
      const px = a[0] + d[0] * t + nrm[0] * out, pz = a[1] + d[1] * t + nrm[1] * out;
      const g = box(0.22, 0.34, 0.24, { x: px, y: top - 0.78, z: pz, ry: -Math.atan2(d[1], d[0]) });
      ext.add('aed', g, { collide: false });
    }
  }
  void longOnly;

  // glazing: ground opaque, scriptorium clear leaded, library alabaster
  for (let i = 0; i < nOut; i++) {
    const a = OUTLINE[i], b = OUTLINE[(i + 1) % nOut];
    const L = segLen(i), e = 0;
    for (const o of openings[i] || []) {
      if (o.y0 <= 0 || o.w < 0.5) continue;
      const yb = y0 + o.y0, yt = y0 + o.y1;
      const mat = yb > y2 ? 'alabaster' : yb > y1 ? 'glass' : yb > A.eave ? null : 'glassOpaque';
      if (!mat) continue;
      const pg = pane(a, b, o.t + e, o.w, yb, Math.min(yt, y0 + o.y1), 'round', 0.18);
      ext.add(mat, pg, { collide: false, shadow: false });
      void L;
    }
  }
  // doors (studded oak leaves standing open)
  // Each leaf is its own pivot (F17: main.js swings them shut after Compline
  // and adds the barring collider). Both pivots take the same scalar angle:
  // the s = −1 leaf sits in a mirrored frame (scale.x = −1), so
  // rotation.y = open stands it open into the hall and 0 shuts the opening.
  const doorLeaves = [];
  const leafGeo = box(1.0, 3.3, 0.12, { x: -0.5 });
  const strapGeo = merge([box(1.0, 0.1, 0.14, { x: -0.5, y: 0.6 }), box(1.0, 0.1, 0.14, { x: -0.5, y: 2.4 })]);
  const doorAt = (i, open = 1.2) => {
    const a = OUTLINE[i], b = OUTLINE[(i + 1) % nOut];
    const L = segLen(i), d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
    const inward = [-d[1], d[0]];
    const c = [a[0] + d[0] * L / 2, a[1] + d[1] * L / 2];
    const ang = Math.atan2(d[1], d[0]);
    const id = i === 5 ? 'aed:south' : 'aed:kitchen';
    const pivots = [];
    for (const s of [-1, 1]) {
      const hinge = [c[0] + d[0] * s * 1.02 + inward[0] * 0.55, c[1] + d[1] * s * 1.02 + inward[1] * 0.55];
      const frame = new THREE.Group();
      frame.position.set(hinge[0] + C[0], y0, hinge[1] + C[1]);
      frame.rotation.y = -ang;
      if (s < 0) frame.scale.x = -1;
      const pivot = new THREE.Group(); pivot.name = `${id}:leaf${s < 0 ? 'A' : 'B'}`;
      const leaf = new THREE.Mesh(leafGeo, M.door), straps = new THREE.Mesh(strapGeo, M.iron);
      leaf.castShadow = leaf.receiveShadow = true;
      pivot.add(leaf, straps); pivot.rotation.y = open;
      frame.add(pivot); ctx.scene.add(frame);
      pivots.push(pivot);
    }
    doorLeaves.push({ id, pivots, open, closed: 0 });
    // threshold step outside
    const outward = [d[1], -d[0]];
    ctx.door({ id, building: 'aedificium', x: c[0] + C[0], z: c[1] + C[1], nx: outward[0], nz: outward[1], y: y0, w: 2.1, th: A.wallOut });
    ext.add('flag', box(3.0, 0.35, 1.3, { x: c[0] + outward[0] * 1.35, y: -0.05, z: c[1] + outward[1] * 1.35, ry: -ang }));
  };
  doorAt(5); doorAt(11);

  // ------------------------------------------------------------------
  // the central octagonal well: open to the sky, no entrance
  // ------------------------------------------------------------------
  const wellOps = {};
  for (let i = 0; i < 8; i++) {
    const a = WELL[i], b = WELL[(i + 1) % 8], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    wellOps[i] = [
      { t: L / 2, w: 1.0, y0: 2.6 - (-0.6), y1: 3.9 + 0.6, arch: 'round' },
      { t: L / 2, w: 0.8, y0: y1 + 0.9 + 0.6, y1: y1 + 4.3 + 0.6, arch: 'round' },
      { t: L * 0.25, w: 0.7, y0: y2 + 1.8 + 0.6, y1: y2 + 2.9 + 0.6, arch: 'round' },
      { t: L * 0.75, w: 0.7, y0: y2 + 1.8 + 0.6, y1: y2 + 2.9 + 0.6, arch: 'round' },
    ];
  }
  ext.add('aed', wallLoop(WELL, -0.6, A.eave + 0.9, A.wallWell, wellOps));
  for (let i = 0; i < 8; i++) {
    const a = WELL[i], b = WELL[(i + 1) % 8];
    for (const o of wellOps[i]) {
      const yb = -0.6 + o.y0, yt = -0.6 + o.y1;
      const mat = yb > y2 ? 'alabaster' : yb > y1 ? 'glass' : 'glassOpaque';
      ext.add(mat, pane(a, b, o.t + A.wallWell / 2 * 0, o.w, yb, yt, 'round', 0), { collide: false, shadow: false });
    }
  }
  // well floor: rough rock and old snow
  ext.add('rubble', prism(WELL_IN, -0.8, -0.35));

  // ------------------------------------------------------------------
  // floors
  // ------------------------------------------------------------------
  const eW = rot(STAIR_E.c, 0), wW = rot(STAIR_WS.c, 2), sW = rot(STAIR_WS.c, 1);
  const shaftR = s => s.shaftIn + s.shaftTh;
  // descent to the ossuary passage in the south tower (E-frame x toward tower)
  const OSS = { x0: A.dT + 2.55, x1: A.dT + 6.1, z0: -A.ossX - 0.72, z1: -A.ossX + 0.72, zc: -A.ossX };
  const ossPoly = [[OSS.x0, OSS.z0], [OSS.x1, OSS.z0], [OSS.x1, OSS.z1], [OSS.x0, OSS.z1]].map(p => rot(p, 1));
  g0.add('flag', prism(OUTLINE, y0 - 0.5, y0, { holes: [WELL, ossPoly, HS_HOLE] }));
  { const holes = [WELL, circle(eW, shaftR(STAIR_E)), circle(wW, shaftR(STAIR_WS)), circle(sW, shaftR(STAIR_WS)), HS_HOLE];
    // boards under strewn straw: the straw lies thick by the desks and the
    // fire and thins to bare boards along the ways the monks walk
    // (collision keeps the straw surface for the footsteps)
    g1.add('boards', prism(OUTLINE, y1 - 0.5, y1, { holes, bottom: false }), { collide: false });
    g1.collider(prism(OUTLINE, y1 - 0.5, y1, { holes, bottom: false }), 'straw');
    { let sd = 97; const r = () => ((sd = (Math.imul(sd, 1664525) + 1013904223) >>> 0) / 4294967296);
      const inHole = (x, z) => holes.some(h => pointIn([x, z], h));
      for (let k = 0, n = 0; k < 1200 && n < 110; k++) {
        const a = r() * Math.PI * 2, rr = 7 + Math.pow(r(), 0.6) * 20, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
        if (!pointIn([x, z], OUTLINE) || inHole(x, z)) continue;
        const big = rr > 17 ? 1.4 : 0.8;   // thicker out by the window desks
        g1.add('p.strew', place(SP.strew((2.2 + r() * 2.6) * big, (1.8 + r() * 2.2) * big), { x, y: y1, z, ry: r() * 6.3 }), { collide: false, shadow: false });
        n++;
      } }
    g1.add('plaster', prism(OUTLINE, y1 - 0.5, y1, { holes, top: false, sides: false }), { collide: false }); }
  // library floor is part of the library batch (see aedLibrary.js)

  // ------------------------------------------------------------------
  // columns, arches and vaults on the two lower floors
  // ------------------------------------------------------------------
  const rooms = buildRooms(A);
  const ringPts = [];
  for (let k = 0; k < 4; k++) {
    ringPts.push(rot(S.A1, k), rot(S.P1p, k), polar(A.a1, (45 + 90 * k) * deg), rot(S.P1m, k + 1));
  }
  // unique points in angular order
  const ring = []; for (const p of ringPts) if (!ring.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < 0.01)) ring.push(p);
  ring.sort((p, q) => Math.atan2(p[1], p[0]) - Math.atan2(q[1], q[0]));
  const bays = [];
  for (const r of rooms) if (r.kind === 'inner') bays.push(r.poly);
  for (let k = 0; k < 4; k++) {
    // tower bay: blind rooms + heptagon + five tower rooms
    bays.push({ tower: k, poly: [S.P1m, S.t[1], S.t[2], S.t[3], S.t[4], S.t[5], S.t[6], S.P1p, S.A1].map(p => rot(p, k)) });
    // long-wall bay
    const P1q = rot(S.P1m, 1), tS1 = rot(S.t[1], 1), M1 = polar(A.a1, 45 * deg);
    bays.push([S.P1p, M1, P1q, tS1, S.t[6]].map(p => rot(p, k)));
  }
  const floorSets = [
    { b: g0, y: y0, spring: y0 + 3.9, crown: 3.0, colMat: 'aedIn', vaultMat: 'plaster', archMat: 'aedIn' },
    { b: g1, y: y1, spring: y1 + 3.9, crown: 2.6, colMat: 'aedIn', vaultMat: 'plaster', archMat: 'aedIn' },
  ];
  for (const fs of floorSets) {
    const colH = fs.spring - fs.y;
    for (const p of ring) {
      const c = column(colH, 0.32, { cushion: true });
      c.translate(p[0], fs.y, p[1]);
      fs.b.add(fs.colMat, c);
      fs.b.add(fs.colMat, box(0.95, 0.22, 0.95, { x: p[0], y: fs.spring - 0.02, z: p[1] }));
    }
    for (const bay of bays) {
      const poly = bay.poly || bay;
      const tower = bay.tower;
      const opts = { archRise: 2.7 };
      if (tower !== undefined) {
        const cen = rot([A.dT - 3, 0], tower);
        opts.center = cen;
      }
      let crown = fs.crown;
      let vg = vaultSmooth(poly, fs.spring, crown + (tower !== undefined ? 1.2 : 0), opts);
      if (tower === 1) vg = cutDisc(vg, HIDDEN_STAIR.c, HIDDEN_STAIR.rIn + HIDDEN_STAIR.th);   // F4 shaft
      fs.b.add(fs.vaultMat, vg, { collide: false });
    }
    // arches between columns and to the walls
    const archBand = (a, b) => {
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const w = L - 0.7;
      const round = w / 2 <= 2.8;
      const rise = round ? w / 2 : w * 0.225;
      fs.b.add(fs.archMat, wall(a, b, fs.spring, fs.spring + rise + 0.45, 0.52, [{ t: L / 2, w, y0: 0, y1: 0, arch: round ? 'round' : 'segment' }]), { collide: false });
    };
    for (let i = 0; i < ring.length; i++) archBand(ring[i], ring[(i + 1) % ring.length]);
    for (const p of ring) {
      const ang = Math.atan2(p[1], p[0]);
      archBand(polar(A.a0 + A.wallWell / 2, ang), p);
    }
    for (let k = 0; k < 4; k++) {
      archBand(rot(S.P1p, k), rot(S.t[6], k));
      archBand(rot(S.P1m, k), rot(S.t[1], k));
    }
  }

  // ------------------------------------------------------------------
  // spiral stairs
  // ------------------------------------------------------------------
  const shaft = (b, c, s, yA, yB, doors) => {
    const n = 16, R = s.shaftIn + s.shaftTh / 2;
    for (let i = 0; i < n; i++) {
      const a0 = i * 2 * Math.PI / n, a1 = (i + 1) * 2 * Math.PI / n, am = (a0 + a1) / 2;
      const p = polar(R, a0, c), q = polar(R, a1, c);
      const segs = [[yA, yB]];
      for (const d of doors) {
        const da = Math.atan2(Math.sin(am - d.a), Math.cos(am - d.a));
        if (Math.abs(da) < 0.46) {
          // cut a doorway through this segment
          for (let j = segs.length - 1; j >= 0; j--) {
            const [s0, s1] = segs[j];
            if (d.y < s1 && d.y + 2.4 > s0) segs.splice(j, 1, ...[[s0, d.y], [d.y + 2.4, s1]].filter(([u, v]) => v - u > 0.05));
          }
        }
      }
      for (const [u, v] of segs) b.add('aedIn', wall(p, q, u, v, s.shaftTh + 0.02));
    }
  };
  // east tower: ground → scriptorium → library
  {
    const c = eW, s = STAIR_E;
    // 2.52 turns: the flight ends just short of the scriptorium doorway (0.42
    // rad), where the upper flight begins, so the landing is continuous
    const f1 = spiral(c[0], c[1], s.rIn, s.rOut, y0, y1, Math.PI, 2.52);
    const f2 = spiral(c[0], c[1], s.rIn, s.rOut, y1, y2, 0, 2.75, { newel: false });
    g0.add('aedIn', f1.geo, { collide: false }); g0.collider(f1.ramp);
    g1.add('aedIn', f2.geo, { collide: false }); g1.collider(f2.ramp);
    g1.add('aedIn', cyl(s.rIn, s.rIn, y2 - y1 + 1.2, 12, { x: c[0], y: y1, z: c[1] }));
    shaft(g0, c, s, y0, y1 - 0.5, [{ a: Math.PI - 0.5, y: y0 }]);
    shaft(g1, c, s, y1 - 0.5, y2 - 0.45, [{ a: 0.42, y: y1 }]);
    ctx.anchors.eastStair = { ground: toWorld(polar(2.6, Math.PI - 0.5, c)), scriptorium: toWorld(polar(2.6, 0.42, c)) };
  }
  // west (oven) and south (hearth) towers: ground → scriptorium
  for (const [k, cW] of [[2, wW], [1, sW]]) {
    const s = STAIR_WS;
    const a0 = rotAngle(0.35, k);
    const f = spiral(cW[0], cW[1], s.rIn, s.rOut, y0, y1, a0, 2.25);
    g0.add('aedIn', f.geo, { collide: false }); g0.collider(f.ramp);
    // the flue column continues through the scriptorium
    g1.add('aedIn', cyl(s.rIn, s.rIn, 4.2, 14, { x: cW[0], y: y1, z: cW[1] }));
    // the S spiral's foot door turns east, into the kitchen beside the
    // ossuary door (the pier of Jorge's stair closes the west side)
    shaft(g0, cW, s, y0, y1 - 0.5, [{ a: rotAngle(k === 1 ? -1.27 : -0.28, k), y: y0 }]);
    shaft(g1, cW, s, y1 - 0.5, y1 + 3.2, [{ a: a0 + 4.5 * Math.PI + 0.3, y: y1 }]);
    g1.add('aedIn', cyl(0.3, shaftR(s) + 0.1, 1.2, 16, { x: cW[0], y: y1 + 3.2, z: cW[1] }));
    g1.add('aedIn', cyl(0.52, 0.55, 3.8, 12, { x: cW[0], y: y1 + 3.2, z: cW[1] }));
  }

  // ------------------------------------------------------------------
  // ground floor partition: kitchen (west) | refectory (east)
  // ------------------------------------------------------------------
  {
    const dir = [Math.SQRT1_2, Math.SQRT1_2];
    const wellR = A.a0 + A.wallWell / 2;
    const Mw = polar(A.W / Math.SQRT2, 45 * deg);
    const top = y0 + 7.3;
    for (const s of [1, -1]) {
      const a = [dir[0] * s * wellR, dir[1] * s * wellR];
      const m = [dir[0] * s * A.a1, dir[1] * s * A.a1];
      const e = [Mw[0] * s, Mw[1] * s];
      // through the colonnade: one doorway in each half
      g0.add('plaster', wall(a, m, y0, top, 0.55, [{ t: 3.2, w: 1.5, y0: 0, y1: 2.4, arch: 'round' }]));
      if (s === 1) {
        // south entrance vestibule: side walls with a door into each hall
        const inner = A.W / Math.SQRT2 - A.wallOut / 2 - 3.6; // distance from centre to vestibule inner wall
        const vi = [dir[0] * inner, dir[1] * inner];
        g0.add('plaster', wall(m, vi, y0, top, 0.55));
        const perp = [-dir[1], dir[0]];
        const hw = 2.3;
        const c0 = [vi[0] + perp[0] * hw, vi[1] + perp[1] * hw], c1 = [vi[0] - perp[0] * hw, vi[1] - perp[1] * hw];
        g0.add('plaster', wall(c0, c1, y0, top, 0.5));
        const eOut = A.W / Math.SQRT2 - A.wallOut / 2;
        for (const sgn of [1, -1]) {
          const p = [vi[0] + perp[0] * hw * sgn, vi[1] + perp[1] * hw * sgn], q = [dir[0] * eOut + perp[0] * hw * sgn, dir[1] * eOut + perp[1] * hw * sgn];
          g0.add('plaster', wall(p, q, y0, top, 0.5, [{ t: 1.8, w: 1.3, y0: 0, y1: 2.3, arch: 'round' }]));
        }
        // lavabo by the refectory door
        const lav = [dir[0] * (inner + 1.0) + perp[0] * (hw + 0.9), dir[1] * (inner + 1.0) + perp[1] * (hw + 0.9)];
        g0.add('aedIn', box(1.6, 0.9, 0.6, { x: lav[0], y: y0, z: lav[1], ry: -Math.atan2(dir[1], dir[0]) }));
        g0.add('water', box(1.4, 0.02, 0.45, { x: lav[0], y: y0 + 0.85, z: lav[1], ry: -Math.atan2(dir[1], dir[0]) }), { collide: false });
        ctx.anchors.vestibule = toWorld([dir[0] * (inner + 1.8), dir[1] * (inner + 1.8)]);
      } else {
        g0.add('plaster', wall(m, e, y0, top, 0.55, [{ t: 2.6, w: 1.5, y0: 0, y1: 2.4, arch: 'round' }]));
      }
    }
  }

  // ------------------------------------------------------------------
  // kitchen furnishings (west half)
  // ------------------------------------------------------------------
  kitchen(g0, M, emit, interact, ossPoly, OSS);
  refectory(g0, M, emit, interact);
  scriptorium(g1, M, emit, interact, ring);

  // ------------------------------------------------------------------
  // roofs: a ring roof over the body, heptagonal pyramids on the towers
  // ------------------------------------------------------------------
  roofs(ext);

  // library (top floor)
  const lib = buildLibrary(M, ctx, { emit, interact, toWorld });

  // sink the terrain under the whole building
  ctx.sink(OUTLINE.map(toWorld), -9, 1.6);
  ctx.sink(ossPoly.map(toWorld), -9, 0.3);

  return { batches: [ext, g0, g1, ...lib.batches], lib, rooms, doorLeaves };
}

function rotAngle(a, k) { return a + k * Math.PI / 2; }

// ----------------------------------------------------------------------
function roofs(ext) {
  const eave = A.eave, ridge = A.ridge, over = 0.9;
  // body ring roof: outer eave follows the long walls (extended into the
  // towers), inner eave follows the well, ridge between them.
  const N = 96;
  const outer = a => { // distance to the diamond |x|+|z| = W along direction a
    const c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
    return (A.W + over * Math.SQRT2) / (c + s);
  };
  const inner = a => { const q = ((a % (Math.PI / 4)) + Math.PI / 4) % (Math.PI / 4) - Math.PI / 8; return (A.a0 - 0.3) / Math.cos(q); };
  const rp = a => (outer(a) * 0.46 + inner(a) * 0.54);
  const pos = [];
  const P = (r, a, y) => [r * Math.cos(a), y, r * Math.sin(a)];
  const angles = [];
  for (let i = 0; i < N; i++) angles.push(i * 2 * Math.PI / N);
  // include diamond corners and octagon corners exactly
  for (let k = 0; k < 8; k++) angles.push(k * Math.PI / 4, (22.5 + 45 * k) * deg);
  angles.sort((p, q) => p - q);
  const uniq = angles.filter((v, i) => i === 0 || v - angles[i - 1] > 1e-5);
  for (let i = 0; i < uniq.length; i++) {
    const a = uniq[i], b = uniq[(i + 1) % uniq.length] + (i === uniq.length - 1 ? 2 * Math.PI : 0);
    const o0 = P(outer(a), a, eave - 0.3), o1 = P(outer(b), b, eave - 0.3);
    const r0 = P(rp(a), a, ridge), r1 = P(rp(b), b, ridge);
    const i0 = P(inner(a), a, eave + 1.2), i1 = P(inner(b), b, eave + 1.2);
    pos.push(...o0, ...r1, ...o1, ...o0, ...r0, ...r1);
    pos.push(...r0, ...i1, ...r1, ...r0, ...i0, ...i1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  // fix winding to face up
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i += 3) {
    const v0 = new THREE.Vector3().fromBufferAttribute(p, i), v1 = new THREE.Vector3().fromBufferAttribute(p, i + 1), v2 = new THREE.Vector3().fromBufferAttribute(p, i + 2);
    const n = new THREE.Vector3().subVectors(v1, v0).cross(new THREE.Vector3().subVectors(v2, v0));
    if (n.y < 0) { p.setXYZ(i + 1, v2.x, v2.y, v2.z); p.setXYZ(i + 2, v1.x, v1.y, v1.z); }
  }
  g.computeVertexNormals();
  // UVs: u along the ring, v up the slope
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x), r = Math.hypot(x, z);
    uv[i * 2] = a * rp(a); uv[i * 2 + 1] = r * 1.1 + y * 0.4;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const under = g.clone(); flipGeo(under); under.translate(0, -0.2, 0);
  ext.add('roof', merge([g, under]));
  // tower roofs
  for (let k = 0; k < 4; k++) {
    const hep = S.t.slice(0, 7).map(q => rot(q, k));
    ext.add('roof', pyramidRoof(hep, A.towerTop - 0.1, A.towerPeak, { over: 0.85 }));
    // finial
    const c = rot(S.Tc, k);
    ext.add('iron', cyl(0.05, 0.05, 1.6, 6, { x: c[0], y: A.towerPeak - 0.2, z: c[1] }), { collide: false });
    ext.add('bronze', sphere(0.2, { x: c[0], y: A.towerPeak + 0.3, z: c[1] }), { collide: false });
  }
  // chimneys: oven (W), hearth (S) and the north-tower fireplace
  for (const k of [1, 2, 3]) {
    const c = rot([A.dT + (k === 3 ? 4.5 : 0), 0], k);
    ext.add('aed', box(1.4, 4.2, 1.4, { x: c[0], y: A.towerPeak - 5.4, z: c[1] }));
    ext.add('aed', box(1.7, 0.3, 1.7, { x: c[0], y: A.towerPeak - 1.2, z: c[1] }));
  }
}
function flipGeo(g) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i += 3) {
    const x = p.getX(i + 1), y = p.getY(i + 1), z = p.getZ(i + 1);
    p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2)); p.setXYZ(i + 2, x, y, z);
  }
  g.computeVertexNormals();
}

// ----------------------------------------------------------------------
// Kitchen: "huge and full of smoke, like an endless entrance hall"
// ----------------------------------------------------------------------
function kitchen(b, M, emit, interact, ossPoly, OSS) {
  const y = A.y0;
  const W = (p, k) => rot(p, k);
  // west tower: the bread oven, mouth toward the hall, stair behind it
  {
    const k = 2, p = W([A.dT - 4.0, 0], k);
    F.breadOven(b, p[0], y, p[1], rotY(k), emit);
    const wp = W([A.dT - 6.5, 3.2], k); F.woodpile(b, wp[0], y, wp[1], rotY(k) + 0.3);
    const tb = W([A.dT - 7.5, -2.6], k); F.table(b, tb[0], y, tb[1], rotY(k) + Math.PI / 2, 2.4, 1.0);
    F.sacks(b, ...W([A.dT - 3.5, -4.2], k).flatMap((v, i) => i === 0 ? [v, y] : [v]), 5);
  }
  // south tower: the great hearth; the ossuary stair behind it
  {
    const k = 1, p = W([A.dT - 3.95, 0], k);
    F.hearth(b, p[0], y, p[1], rotY(k), emit);
    const bl = W([A.dT - 6.2, -3.2], k); F.woodpile(b, bl[0], y, bl[1], rotY(k));
    // stair house over the descent, iron-clad door toward the stair
    const cx = (OSS.x0 + OSS.x1) / 2;
    const walls = [
      [[OSS.x0 - 0.3, OSS.z0 - 0.25], [OSS.x1 + 0.2, OSS.z0 - 0.25]],
      [[OSS.x0 - 0.3, OSS.z1 + 0.25], [OSS.x1 + 0.2, OSS.z1 + 0.25]],
    ];
    for (const [a, c] of walls) b.add('aedIn', wall(W(a, k), W(c, k), y, y + 2.6, 0.45));
    b.add('aedIn', wall(W([OSS.x0 - 0.3, OSS.z0 - 0.25], k), W([OSS.x0 - 0.3, OSS.z1 + 0.25], k), y, y + 2.6, 0.45, [{ t: 0.97, w: 1.12, y0: 0, y1: 1.85, arch: 'round' }]));
    b.add('aedIn', prismRot([[OSS.x0 - 0.55, OSS.z0 - 0.5], [OSS.x1 + 0.45, OSS.z0 - 0.5], [OSS.x1 + 0.45, OSS.z1 + 0.5], [OSS.x0 - 0.55, OSS.z1 + 0.5]], k, y + 2.6, y + 2.9));
    // steps down (>10) toward the church
    const n = 12;
    for (let i = 0; i < n; i++) {
      const x0 = OSS.x0 + i * (OSS.x1 - OSS.x0) / n;
      const x1 = x0 + (OSS.x1 - OSS.x0) / n;
      const top = y - (i + 1) * 0.26;
      b.add('aedIn', prismRot([[x0, OSS.z0], [x1 + 0.02, OSS.z0], [x1 + 0.02, OSS.z1], [x0, OSS.z1]], k, top - 0.26, top), { collide: false });
    }
    const from = W([OSS.x0 - 0.1, OSS.zc], k), to = W([OSS.x1, OSS.zc], k);
    b.collider(rampQuad(from, to, y, y - n * 0.26, 1.3), 'stoneWet');
    // the iron-clad door, standing ajar
    const hinge = W([OSS.x0 - 0.36, OSS.z0 + 0.05], k);
    // swung back into the kitchen, so the way to the ossuary stands open
    const LEAF = -2.9;
    const leaf = box(1.0, 2.3, 0.09, { x: 0.5 }); leaf.rotateY(LEAF);
    place(leaf, { x: hinge[0], y, z: hinge[1], ry: rotY(k) + Math.PI / 2 });
    b.add('door', leaf);
    const plates = box(0.95, 1.9, 0.1, { x: 0.47 }); plates.rotateY(-1.1); plates.scale(1, 1, 1);
    place(plates, { x: hinge[0], y, z: hinge[1], ry: rotY(k) + Math.PI / 2 });
    b.add('iron', merge([box(0.95, 0.08, 0.11, { x: 0.5, y: 0.3 }), box(0.95, 0.08, 0.11, { x: 0.5, y: 1.7 })].map(g2 => { g2.rotateY(LEAF); return place(g2, { x: hinge[0], y, z: hinge[1], ry: rotY(k) + Math.PI / 2 }); })), { collide: false });
    void plates; void cx;
    interact({ id: 'ossuary-door', pos: [...W([OSS.x0 - 0.6, OSS.zc], k).flatMap((v, i) => i === 0 ? [v, y + 1.2] : [v])], radius: 2.2, label: 'The iron-clad door to the ossuary' });
  }
  // the great work tables
  const tables = [[-15.5, 6.2, 0.5], [-9.5, 12.5, 0.95], [5.5, 15.8, 1.4]];
  // on each board the work of the hour: dough rising in a kneading trough,
  // bowls and a jug, a chopping board with a knife and cut greens, onions,
  // a cabbage, a basket; baskets and a sack at the table's foot
  tables.forEach(([x, z, r], ti) => {
    F.trestle(b, x, y, z, r, 4.2, 1.1);
    const T = (dx, dz) => [x + dx * Math.cos(r) + dz * Math.sin(r), z - dx * Math.sin(r) + dz * Math.cos(r)];
    const top = y + 0.78;
    { const [px, pz] = T(-1.1, 0); b.add('woodDark', place(merge([box(1.1, 0.04, 0.5, {}), box(1.1, 0.16, 0.04, { z: 0.23 }), box(1.1, 0.16, 0.04, { z: -0.23 }), box(0.04, 0.16, 0.5, { x: 0.53 }), box(0.04, 0.16, 0.5, { x: -0.53 })]), { x: px, y: top, z: pz, ry: r }), { collide: false });
      b.add('p.bread', place(SP.mound(0.95, 0.4, 0.13, { seed: 810 + ti }), { x: px, y: top + 0.04, z: pz, ry: r + Math.PI / 2 }), { collide: false }); }
    { const [px, pz] = T(0.4, -0.15); b.add('wood', place(box(0.55, 0.04, 0.35, {}), { x: px, y: top, z: pz, ry: r + 0.1 }), { collide: false });
      b.add('iron', place(box(0.24, 0.004, 0.035, {}), { x: px + 0.05, y: top + 0.045, z: pz, ry: r + 0.5 }), { collide: false, shadow: false });
      b.add('woodDark', place(box(0.1, 0.02, 0.025, {}), { x: px - 0.12, y: top + 0.045, z: pz - 0.06, ry: r + 0.5 }), { collide: false, shadow: false });
      for (let k = 0; k < 5; k++) b.add('p.greens', place(box(0.05, 0.02, 0.03, {}), { x: px - 0.1 + k * 0.05, y: top + 0.045, z: pz + 0.08, ry: k }), { collide: false, shadow: false }); }
    for (let k = 0; k < 4; k++) { const [px, pz] = T(0.95 + (k % 2) * 0.1, 0.2 + k * 0.07); b.add('p.onion', sphere(0.04, { x: px, y: top + 0.04, z: pz, sy: 0.85 }, 8, 6), { collide: false }); }
    { const [px, pz] = T(1.35, -0.2); b.add('p.greens', place(SP.mound(0.22, 0.22, 0.16, { seed: 830 + ti }), { x: px, y: top, z: pz }), { collide: false }); }
    { const [px, pz] = T(1.5, 0.25); b.add('p.earthenware', place(CL.bowl(0.16, 0.08), { x: px, y: top, z: pz }), { collide: false }); b.add('p.glazeBrown', place(CL.jug(1.1), { x: px + 0.2, y: top, z: pz - 0.1 }), { collide: false }); }
    { const [px, pz] = T(-1.9, 0.75); b.add('straw', lathe([[0, 0], [0.22, 0], [0.3, 0.32], [0.27, 0.34], [0.2, 0.04], [0, 0.04]], 16, { x: px, y, z: pz }));
      b.add('p.onion', place(SP.mound(0.45, 0.45, 0.1, { seed: 840 + ti }), { x: px, y: y + 0.27, z: pz }), { collide: false }); }
  });
  // shelves, jars, barrels along the outer walls
  const wallSpots = [[-18.2, -2.5, Math.PI / 4 + Math.PI / 2], [-13.5, -7.2, Math.PI / 4 + Math.PI / 2], [-2.5, 18.2, -Math.PI / 4 + Math.PI], [2.5, 20.5, -Math.PI / 4 + Math.PI]];
  for (const [x, z, r] of wallSpots) F.shelfUnit(b, x, y, z, r, 2.0, 2.2, 0.45);
  for (const [x, z] of [[-20.5, 3.5], [-19.6, 5.0], [-4.2, 20.8], [-1.5, 21.6]]) F.barrel(b, x, y, z, 1.1);
  F.amphoraRow(b, -12.5, y, 16.5, -Math.PI / 4, 6, 0.75);
  F.hangingHerbs(b, -12, y + 3.6, 10.5, Math.PI / 4, 8);
  F.hangingHerbs(b, -5.5, y + 3.6, 15.5, Math.PI / 4, 7);
  // the washing-up pit, where Venantius was found by Remigio
  b.add('aedIn', box(1.6, 0.35, 1.0, { x: -16.8, y, z: 11.2, ry: Math.PI / 4 }));
  b.add('water', box(1.3, 0.02, 0.75, { x: -16.8, y: y + 0.3, z: 11.2, ry: Math.PI / 4 }), { collide: false });
  // lamps on the pillars
  for (const [x, z] of [[-9.2, 9.2], [-12.0, 0], [0, 12.0]]) F.oilLamp(b, x, y + 2.8, z, emit);
  interact({ id: 'kitchen', pos: [-10, y + 1.5, 10], radius: 7, label: 'The kitchen' });
}

// ----------------------------------------------------------------------
// Refectory: rows of tables, the Abbot's table on a dais at the head,
// perpendicular to the others, and a pulpit for the reader opposite.
// ----------------------------------------------------------------------
function refectory(b, M, emit, interact) {
  const y = A.y0;
  // NE wall sector: tables parallel to the wall (direction (1,-1))
  const along = -Math.PI / 4; // ry so that table's x runs along NE wall
  const rows = [9.5, 12.6, 15.7];
  for (const d of rows) {
    for (const s of [-5.2, 5.2]) {
      const cx = d * Math.SQRT1_2 + s * Math.SQRT1_2, cz = -d * Math.SQRT1_2 + s * Math.SQRT1_2;
      F.trestle(b, cx, y, cz, along, 6.0, 0.8);
      // benches either side of the board, across its long axis (1,1)
      // seat centres 0.35 m out from the board's edge (0.4 + 0.35)
      for (const off of [-0.75, 0.75]) {
        F.bench(b, cx - off * Math.SQRT1_2, y, cz + off * Math.SQRT1_2, along, 5.6);
      }
      // a place for each monk on both sides: bowl, cup, a piece of bread, a spoon
      for (let i = -2; i <= 2; i++) for (const side of [-1, 1]) {
        const u = i * 1.1 + side * 0.18;
        const px = cx + u * Math.SQRT1_2 - side * 0.22 * Math.SQRT1_2, pz = cz + u * Math.SQRT1_2 + side * 0.22 * Math.SQRT1_2;
        b.add('p.earthenware', place(CL.bowl(0.09, 0.05), { x: px, y: y + 0.78, z: pz }), { collide: false });
        b.add('p.bread', sphere(0.06, { x: px + 0.12 * Math.SQRT1_2, y: y + 0.79, z: pz + 0.12 * Math.SQRT1_2, sy: 0.6 }, 8, 5), { collide: false });
        if ((i + side) % 2) b.add('p.glazeBrown', place(CL.jug(0.6, { handle: false }), { x: px - 0.14 * Math.SQRT1_2, y: y + 0.78, z: pz + 0.14 * Math.SQRT1_2 }), { collide: false });
      }
    }
  }
  // the Abbot's dais toward the east tower, table perpendicular
  const dx = 19.5, dz = 3.2;
  b.add('ashlar', box(3.0, 0.4, 7.0, { x: dx, y, z: dz - 3.5 }));
  F.trestle(b, dx, y + 0.4, dz - 3.5, Math.PI / 2, 5.4, 0.9);
  for (let i = -2; i <= 2; i++) F.chair(b, dx + 0.95, y + 0.4, dz - 3.5 + i * 1.05, -Math.PI / 2);
  F.candlestick(b, dx, y + 1.18, dz - 5.2, 0.35, emit);
  b.add('silver', cyl(0.18, 0.12, 0.06, 12, { x: dx, y: y + 1.18, z: dz - 3.5 }), { collide: false });
  // the reader's pulpit on the far side, toward the north tower
  const px = -3.0, pz = -19.5;
  b.add('aedIn', box(1.4, 1.4, 1.4, { x: px, y, z: pz }));
  F.lectern(b, px, y + 1.4, pz, Math.PI * 0.25);
  // north tower fireplace
  const fp = rot([A.dT + 5.6, 0], 3);
  F.fireplace(b, fp[0], y, fp[1], Math.PI, emit, { w: 3.0, h: 5.2 });
  // big torches on the columns
  for (const [x, z, r] of [[9.2, -9.2, Math.PI * 0.75], [0, -12.6, Math.PI], [12.6, 0, Math.PI / 2], [4.97, -12.0, Math.PI]]) F.torch(b, x, y + 2.4, z, r, emit);
  interact({ id: 'refectory', pos: [11, y + 1.4, -11], radius: 8, label: 'The refectory' });
}

// ----------------------------------------------------------------------
// Scriptorium: forty windows, a desk under each; the catalogue chained
// to Malachi's desk; Jorge's stool by the north-tower fire.
// ----------------------------------------------------------------------
function scriptorium(b, M, emit, interact, ring) {
  const y = A.y1;
  let count = 0;
  // 12 desks under the great windows of the four long walls
  for (let k = 0; k < 4; k++) {
    const a = rot(S.t[6], k), c = rot(S.t[1], k + 1);
    const d = [c[0] - a[0], c[1] - a[1]], L = Math.hypot(...d), u = [d[0] / L, d[1] / L];
    const inw = [u[1], -u[0]];
    // choose inward normal pointing to the centre
    const mid = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
    const sgn = (mid[0] * inw[0] + mid[1] * inw[1]) > 0 ? -1 : 1;
    for (const t of [0.2, 0.5, 0.8]) {
      const off = A.wallOut / 2 + 0.55;
      const x = a[0] + u[0] * L * t + inw[0] * sgn * off, z = a[1] + u[1] * L * t + inw[1] * sgn * off;
      const ry = Math.atan2(-inw[0] * sgn, -inw[1] * sgn) + Math.PI;
      F.desk(b, x, y, z, ry, { rest: count % 3 !== 1 });
      count++;
      if (k === 2 && t === 0.2) interact({ id: 'adelmo-desk', pos: [x, y + 1.1, z], radius: 1.8, label: 'Adelmo’s desk: the half-finished psalter' });
    }
  }
  // 20 desks in the towers, one under each face window
  for (let k = 0; k < 4; k++) {
    for (let f = 1; f <= 5; f++) {
      const a = rot(S.t[f], k), c = rot(S.t[f + 1], k);
      const mid = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
      const tc = rot(S.Tc, k);
      const toC = [tc[0] - mid[0], tc[1] - mid[1]], L = Math.hypot(...toC);
      const off = A.wallOut / 2 + 0.55;
      const x = mid[0] + toC[0] / L * off, z = mid[1] + toC[1] / L * off;
      const ry = Math.atan2(toC[0], toC[1]) + Math.PI;
      F.desk(b, x, y, z, ry, { small: false, rest: (f + k) % 2 === 0 });
      count++;
    }
  }
  // 8 smaller desks for the scholars under the well windows
  for (let i = 0; i < 8; i++) {
    const ang = (i * 45) * deg;
    const r = A.a0 + A.wallWell / 2 + 0.5;
    const x = r * Math.cos(ang), z = r * Math.sin(ang);
    const ry = Math.atan2(Math.cos(ang), Math.sin(ang));
    F.desk(b, x, y, z, ry, { small: true });
    count++;
    if (i === 3) interact({ id: 'venantius-desk', pos: [x, y + 1.1, z], radius: 1.8, label: 'Venantius’s desk, backed against the warm flue' });
  }
  // Malachi's desk and the chained catalogue beside the east stair
  const md = [A.dT - 6.8, -2.2];
  F.table(b, md[0], y, md[1], 0, 1.6, 0.8, 0.82);
  F.lectern(b, md[0] - 0.9, y, md[1] + 1.5, Math.PI / 2);
  b.add('parchment', box(0.55, 0.14, 0.4, { x: md[0] + 0.3, y: y + 0.82, z: md[1] }), { collide: false });
  b.add('gold', box(0.02, 0.02, 0.5, { x: md[0] + 0.5, y: y + 0.83, z: md[1] + 0.25 }), { collide: false });
  F.chair(b, md[0], y, md[1] - 0.8, 0);
  interact({ id: 'catalogue', pos: [md[0], y + 1.1, md[1]], radius: 2.0, label: 'The catalogue, chained to Malachi’s desk' });
  // the north-tower fireplace and Jorge's stool
  const fp = rot([A.dT + 5.5, 0], 3);
  F.fireplace(b, fp[0], y, fp[1], Math.PI, emit, { w: 3.2, h: 5.4 });
  const js = rot([A.dT + 3.0, 1.9], 3);
  F.stool(b, js[0], y, js[1]);
  interact({ id: 'jorge-stool', pos: [js[0], y + 0.9, js[1]], radius: 1.6, label: 'Jorge’s stool by the fire' });
  // lecterns and chests in the open floor
  F.chest(b, 14.5, y, 1.0, Math.PI / 4);
  F.chest(b, -1.5, y, 14.2, -Math.PI / 4);
  F.lectern(b, 0, y, -10.0, 0);
  stats.scriptoriumDesks = count;
  void ring;
}
export const stats = { scriptoriumDesks: 0 };

function rotY(k) { return -k * Math.PI / 2 - Math.PI / 2; }
function prismRot(poly, k, yA, yB) { return prism(poly.map(p => rot(p, k)), yA, yB); }
function rampQuad(from, to, yA, yB, w) {
  const d = [to[0] - from[0], to[1] - from[1]], L = Math.hypot(...d), n = [-d[1] / L * w / 2, d[0] / L * w / 2];
  return quad([from[0] - n[0], yA, from[1] - n[1]], [to[0] - n[0], yB, to[1] - n[1]], [to[0] + n[0], yB, to[1] + n[1]], [from[0] + n[0], yA, from[1] + n[1]], 0, 1, 0, 1, true);
}
export { rotY, lathe };
