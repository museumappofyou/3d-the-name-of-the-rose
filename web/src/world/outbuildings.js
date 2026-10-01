import * as THREE from 'three';
import * as C from './props/cloth.js';
import * as W from './props/work.js';
import * as S from './props/sculpt.js';
import { propMaterials } from '../core/propMaterials.js';
import { P, WALL_WEST, WALL_EAST, GATE, GATEHOUSE, INFIRMARY, BATHS, FOLDS, STABLES, STABLE_YARD, GRANARY, OXSHED, THRESHING, HENHOUSE, BLOOD_JAR, SOUTH_RANGE, LOW_WALL, POSTERN, AED } from '../core/plan.js';
import { Batch, wall, prism, box, cyl, sphere, lathe, merge, place, pane, gableRoof, gableEnds, hipRoof, quad, vault, vaultSmooth, stairFlight, TAU } from '../core/kit.js';
import * as F from './furniture.js';
import { height, baseHeight } from './terrain.js';

// Buildings along the enclosure (First Day, Prime and Vespers): the
// infirmary and baths among the botanical gardens by the western wall;
// toward the east the granary, horse and ox stables, henhouses, sheepfolds
// and pigsties; along the south wall the peasants' quarters, mills, oil
// presses, granaries, cellars and the novices' house; the smithy and its
// glassworks "where the east wall turns north".

// the black wool of a Benedictine habit (for clothes left lying about)
function woolBlack(M) {
  return (M.p.woolBlack ||= new THREE.MeshStandardMaterial({ map: M.p.blanketGrey.map, color: 0x4a4540, roughness: 1, envMapIntensity: 0.2, side: THREE.DoubleSide }));
}

// ---------------------------------------------------------------------
// generic rectangular building, built in a local frame (x along length)
// ---------------------------------------------------------------------
function building(ex, inn, o) {
  const { cx, cz, L, W, h, ry = 0, mat = 'rubble', inMat = 'plasterStone', roof = 'roof', ridge, axis = 'x', floorMat = 'flag', y0 = 0.25 } = o;
  const T = g => place(g, { x: cx, z: cz, ry });
  const hl = L / 2, hw = W / 2, th = o.th || 0.65;
  const sides = { S: [[-hl, hw], [hl, hw]], N: [[hl, -hw], [-hl, -hw]], E: [[hl, hw], [hl, -hw]], W: [[-hl, -hw], [-hl, hw]] };
  const lens = { S: L, N: L, E: W, W: W };
  const base = o.base ?? -0.6;
  const toW = (x, z) => [cx + x * Math.cos(ry) + z * Math.sin(ry), cz - x * Math.sin(ry) + z * Math.cos(ry)];
  const outN = { S: [0, 1], N: [0, -1], E: [1, 0], W: [-1, 0] };
  for (const d of o.doors || []) {
    const [a, b] = sides[d.side], t = d.t;
    const lc = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], n = outN[d.side];
    const c = toW(...lc), c2 = toW(lc[0] + n[0], lc[1] + n[1]);
    registerDoor?.({ id: `${o.name || 'building'}:${d.side}${Math.round(t * 100)}`, building: o.name, x: c[0], z: c[1], nx: c2[0] - c[0], nz: c2[1] - c[1], y: o.y0 ?? 0.25, w: d.w || 1.4, th, noWalk: d.noWalk, noSteps: d.noSteps });
  }
  for (const [k, [a, b]] of Object.entries(sides)) {
    const ops = [];
    for (const d of o.doors || []) if (d.side === k) ops.push({ t: lens[k] * d.t + (k === 'S' || k === 'N' ? th / 2 : th / 2), w: d.w || 1.4, y0: 0, y1: (d.h || 2.5) - base, arch: d.arch || 'round' });
    for (const wn of o.windows || []) if (wn.side === k) {
      const n = wn.n || 1;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, w = wn.w || 0.6;
        // no window over a door
        if ((o.doors || []).some(d => d.side === k && Math.abs(t - d.t) * lens[k] < (w + (d.w || 1.4)) / 2 + 0.25)) continue;
        ops.push({ t: lens[k] * t + th / 2, w, y0: (wn.sill || 1.9) - base, y1: (wn.top || 2.9) - base, arch: 'round' });
      }
    }
    // extend long walls to close corners
    const ext = (k === 'S' || k === 'N') ? th / 2 : 0;
    const dir = [b[0] - a[0], b[1] - a[1]], Lk = Math.hypot(...dir), u = [dir[0] / Lk, dir[1] / Lk];
    const a2 = [a[0] - u[0] * ext, a[1] - u[1] * ext], b2 = [b[0] + u[0] * ext, b[1] + u[1] * ext];
    if (o.open === k) { ex.add(mat, T(wall(a2, b2, h - 0.8, h, th))); continue; }
    ex.add(mat, T(wall(a2, b2, base, h, th, ops.map(p => ({ ...p, t: p.t - th / 2 + ext })))));
    for (const p of ops) if (p.y0 > 0.01) ex.add('glassOpaque', T(pane(a2, b2, p.t - th / 2 + ext, p.w, base + p.y0, base + p.y1, 'round', 0)), { collide: false, shadow: false });
  }
  if (o.open) {
    const side = o.open, [a, b] = sides[side];
    const n = Math.max(2, Math.round(lens[side] / 3.2));
    for (let i = 0; i <= n; i++) { const t = i / n; ex.add('beamExt', T(box(0.3, h - 0.8, 0.3, { x: a[0] + (b[0] - a[0]) * t, y: 0, z: a[1] + (b[1] - a[1]) * t }))); }
  }
  const rg = ridge ?? h + Math.min(L, W) * 0.36;
  if (o.hip) ex.add(roof, T(hipRoof(-hl, hl, -hw, hw, h, rg, { over: 0.55 })));
  else if (axis === 'x') {
    ex.add(roof, T(gableRoof(-hl, hl, -hw, hw, h, rg, { over: 0.55 })));
    ex.add(mat, T(gableEnds(-hl, -hl, -hw, hw, h, rg, 'x', th)));
    ex.add(mat, T(gableEnds(hl, hl, -hw, hw, h, rg, 'x', th)));
  } else {
    ex.add(roof, T(gableRoof(-hl, hl, -hw, hw, h, rg, { over: 0.55, axis: 'z' })));
    ex.add(mat, T(gableEnds(-hl, hl, -hw, -hw, h, rg, 'z', th)));
    ex.add(mat, T(gableEnds(-hl, hl, hw, hw, h, rg, 'z', th)));
  }
  if (floorMat) inn.add(floorMat, T(prism([[-hl, -hw], [hl, -hw], [hl, hw], [-hl, hw]], y0 - 0.4, y0)));
  if (!o.noCeil) inn.add('beam', T(prism([[-hl, -hw], [hl, -hw], [hl, hw], [-hl, hw]], h - 0.18, h - 0.02)), { collide: false });
  const poly = [[-hl, -hw], [hl, -hw], [hl, hw], [-hl, hw]].map(([x, z]) => [cx + x * Math.cos(ry) + z * Math.sin(ry), cz - x * Math.sin(ry) + z * Math.cos(ry)]);
  return { T, poly, local: (x, z) => [cx + x * Math.cos(ry) + z * Math.sin(ry), cz - x * Math.sin(ry) + z * Math.cos(ry)], ry };
}
export { building };
let registerDoor = null;
export function setDoorRegistry(f) { registerDoor = f; }

const rect = R => ({ cx: (R.x0 + R.x1) / 2, cz: (R.z0 + R.z1) / 2, L: R.x1 - R.x0, W: R.z1 - R.z0 });

export function buildOutbuildings(M, ctx) {
  propMaterials(M);
  // F10: the refuse/dung slope falls beyond the low wall behind the stables,
  // outside the east wall (c0552 k1563 M; the road's right branch reaches it)
  ctx.plots.push({ x0: 98, x1: 123, z0: -60, z1: -20, kind: 'soil' });
  setDoorRegistry(ctx.door);
  const ex = new Batch('outbuildings-exterior');
  const inn = new Batch('outbuildings-interior');
  const emit = ctx.emit, it = (id, p, r, label, extra = {}) => ctx.interact({ id, pos: new THREE.Vector3(...p), radius: r, label, ...extra });
  const sink = b => ctx.sink(b.poly, -2.2, 0.9);

  enclosure(ex, M, ctx);

  // --- K: the infirmary, with Severinus's laboratory and a chapel apse --
  {
    const a = INFIRMARY.a, b = INFIRMARY.b;
    const cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2, L = Math.hypot(b[0] - a[0], b[1] - a[1]) - 4, W = INFIRMARY.width;
    const ry = -Math.atan2(b[1] - a[1], b[0] - a[0]);
    const B = building(ex, inn, { name: 'infirmary', cx, cz, L, W, h: 5.2, ry, ridge: 8.6,
      doors: [{ side: 'S', t: 0.18, w: 1.5 }, { side: 'S', t: 0.62, w: 1.4 }],
      windows: [{ side: 'S', n: 7, w: 1.1, sill: 2.0, top: 3.4 }, { side: 'N', n: 7, w: 0.9, sill: 2.3, top: 3.4 }] });
    sink(B);
    const hl = L / 2;
    // chapel apse at the north-east end
    const ap = []; for (let i = 0; i <= 8; i++) { const t = -Math.PI / 2 + i / 8 * Math.PI; ap.push([hl + Math.cos(t) * 3.0, Math.sin(t) * 3.0]); }
    for (let i = 0; i < 8; i++) ex.add('rubble', B.T(wall(ap[i], ap[i + 1], -0.6, 4.6, 0.6, i === 4 ? [{ t: 0.6, w: 0.5, y0: 2.4, y1: 3.4, arch: 'round' }] : [])));
    ex.add('roof', B.T(pyramidHalf(hl, 3.0, 4.6, 6.8)));
    inn.add('flag', B.T(prism(ap.map(p => [p[0] - 0.1, p[1] * 0.9]), -0.15, 0.25)));
    // partition: laboratory at the south-west end
    const labX = -hl + 9;
    inn.add('plasterStone', B.T(wall([labX, -W / 2 + 0.3], [labX, W / 2 - 0.3], 0.25, 5.0, 0.3, [{ t: 3.3, w: 1.2, y0: 0, y1: 2.3, arch: 'round' }])));
    // ward: beds along the walls, each with its jug or bowl on the floor or a
    // stool; opposite, a table of remedies and shelves of jars and bottles
    for (let i = 0; i < 8; i++) {
      const x = labX + 2.2 + i * ((hl - 2) - labX - 2.2) / 7;
      const [bx, bz] = B.local(x, -W / 2 + 1.35); F.bed(inn, bx, 0.25, bz, ry + Math.PI / 2, 'linen');
      const [sx2, sz2] = B.local(x + 0.95, -W / 2 + 0.75);
      if (i % 2) { F.stool(inn, sx2, 0.25, sz2); F.vesselsOn(inn, sx2, 0.75, sz2, ry, 0.25, 70 + i, { density: 1 }); }
      else F.vesselsOn(inn, sx2, 0.25, sz2, ry, 0.35, 90 + i, { density: 0.9 });
    }
    for (const t of [0.25, 0.6]) {
      const x = labX + 2 + t * (hl - 2 - labX - 2);
      const [px, pz] = B.local(x, W / 2 - 0.45); F.shelfUnit(inn, px, 0.25, pz, ry + Math.PI, 2.0, 2.2, 0.42);
    }
    { const x = labX + 2 + 0.43 * (hl - 2 - labX - 2); const [px, pz] = B.local(x, W / 2 - 1.3); F.table(inn, px, 0.25, pz, ry, 1.8, 0.75); F.vesselsOn(inn, px, 1.03, pz, ry, 1.6, 55, { density: 0.7 }); F.stool(inn, ...B.local(x, W / 2 - 2.0).flatMap((v, k) => k ? [0.25, v] : [v])); }
    // F11: inside the laboratory, the curtain hiding the bed where Severinus
    // doses his patients (c2156/c2157 k2183/k2184 M, c2119 k0039 H)
    const [lbx, lbz] = B.local(-hl + 6.6, W / 2 - 1.3);
    F.bed(inn, lbx, 0.25, lbz, ry + Math.PI / 2, 'linen');
    inn.add('curtain', B.T(box(2.8, 2.4, 0.03, { x: -hl + 6.6, y: 0.3, z: W / 2 - 2.5 })), { collide: false });
    inn.add('curtain', B.T(box(0.03, 2.4, 2.4, { x: -hl + 5.0, y: 0.3, z: W / 2 - 1.3 })), { collide: false });
    // the laboratory: "alembics, glass and earthenware… an alchemist's shop"
    for (const [x, z, r] of [[-hl + 1.2, -W / 2 + 0.6, 0], [-hl + 4.2, -W / 2 + 0.6, 0], [-hl + 7.2, -W / 2 + 0.6, 0]]) { const [px, pz] = B.local(x, z); F.shelfUnit(inn, px, 0.25, pz, ry + r, 2.4, 2.4, 0.45); }
    { const [px, pz] = B.local(-hl + 0.6, 0.5); F.bookcase(inn, B.local(-hl + 0.45, 2.4), B.local(-hl + 0.45, -1.4), 0.25, 2.3, 0.4, { variant: 5 }); void px; void pz; }
    const [tx, tz] = B.local(-hl + 4.5, 0.6);
    F.table(inn, tx, 0.25, tz, ry, 2.6, 1.1);
    for (let i = 0; i < 5; i++) {
      const [fx, fz] = B.local(-hl + 3.6 + i * 0.45, 0.4 + (i % 2) * 0.3);
      inn.add('glass', lathe([[0, 0], [0.08, 0.01], [0.1, 0.08], [0.04, 0.18], [0.03, 0.32]], 10, { x: fx, y: 1.03, z: fz }), { collide: false, shadow: false });
    }
    // the armillary sphere on the table to the left of the door
    const [sx, sz] = B.local(-hl + 2.0, W / 2 - 1.1);
    F.table(inn, sx, 0.25, sz, ry, 1.2, 0.7);
    for (let i = 0; i < 4; i++) {
      const t = new THREE.TorusGeometry(0.28, 0.012, 6, 32); t.rotateX(i * Math.PI / 4); t.rotateY(i * 0.6); t.translate(sx, 1.53, sz);
      inn.add(i % 2 ? 'silver' : 'bronze', t, { collide: false });
    }
    inn.add('bronze', lathe([[0, 0], [0.14, 0], [0.05, 0.1], [0.03, 0.3], [0, 0.3]], 10, { x: sx, y: 1.03, z: sz }), { collide: false });
    inn.add('gold', merge([box(0.015, 0.14, 0.015, { x: sx, y: 1.82, z: sz }), box(0.08, 0.015, 0.015, { x: sx, y: 1.9, z: sz })]), { collide: false });
    it('armillary', [sx, 1.4, sz], 1.8, 'An armillary sphere of brass and silver rings');
    const [hx, hz] = B.local(labX + 5, 0);
    F.hangingHerbs(inn, hx, 3.3, hz, ry, 10);
    const [lx, lz] = B.local(-hl + 4.5, 0.6); F.oilLamp(inn, lx, 1.1, lz, emit);
    it('infirmary', [...ctxPos(B.local(labX + 6, 0), 1.5)], 7, 'The infirmary');
    it('laboratory', [...ctxPos(B.local(-hl + 4.5, 0), 1.5)], 4, 'Severinus’s laboratory: jars, bottles, alembics');
    ctx.anchors.infirmary = B.local(-hl + 3.2, W / 2 + 2.2);
  }

  // --- J: the baths ------------------------------------------------------
  {
    const r = rect(BATHS);
    const B = building(ex, inn, { name: 'baths', ...r, h: 4.0, ridge: 6.0, doors: [{ side: 'S', t: 0.5, w: 1.3 }], windows: [{ side: 'S', n: 2, w: 0.6, sill: 2.2, top: 3.0 }, { side: 'N', n: 3, w: 0.5, sill: 2.4, top: 3.1 }] });
    sink(B);
    // Third Day, night (c1581–c1593): "there were tubs separated from one
    // another by thick curtains; I do not remember how many"; the monks
    // washed in them on the days the Rule set, Severinus used them to heal.
    // "Water could be drawn from a basin in another corner." The first tubs
    // were empty; "only the last, hidden by a drawn curtain, was full", and
    // beside it lay a heap of clothes on the floor. Here: four stave tubs in
    // bays along the north wall, each bay walled off by heavy woollen
    // curtains on poles carried by a timber rail; the curtains of the first
    // bays are pushed aside, the last is drawn shut. RECON: the hearth with
    // its cauldron for heating the water, the benches and the towels.
    const wool = woolBlack(M);
    const n = 4, T = C.tub(0.7, 0.72), step = (r.L - 5.5) / (n - 1);
    const iw = r.W / 2 - 0.33, zBack = -iw, zFront = -0.8, zTub = -r.W / 2 + 1.5, railY = 2.62;
    const bay = i => -r.L / 2 + 2.0 + i * step;
    const xW = -r.L / 2 + 0.33, xE = bay(n - 1) + step / 2;
    // the timber frame: a rail along the front of the bays, posts at the
    // partitions, and a pole from each post back to the wall
    { const parts = [box(xE - xW, 0.1, 0.1, { x: (xW + xE) / 2, y: railY - 0.05, z: zFront })];
      for (let i = 1; i <= n; i++) {
        const xp = bay(i - 1) + step / 2;
        parts.push(box(0.09, railY + 0.05 - 0.25, 0.09, { x: xp, y: 0.25, z: zFront }));
        parts.push(box(0.05, 0.05, zFront - zBack, { x: xp, y: railY, z: (zFront + zBack) / 2 }));
      }
      inn.add('woodDark', B.T(merge(parts)));
    }
    for (let i = 0; i < n; i++) {
      const x = bay(i), last = i === n - 1;
      const [px, pz] = B.local(x, zTub);
      inn.add('woodDark', place(T.wall.clone(), { x: px, y: 0.25, z: pz, ry: i }));
      inn.add('iron', place(T.hoops.clone(), { x: px, y: 0.25, z: pz }), { collide: false });
      if (last) {
        // the one full tub: dark water to near the rim, the flags wet round it
        inn.add('p.water', cyl(T.waterR * 1.05, T.waterR * 1.05, 0.01, 32, { x: px, y: 0.25 + 0.64, z: pz }), { collide: false, shadow: false });
        inn.add('p.wetFloor', S.mound(2.2, 2.0, 0.004, { seed: 503 }).translate(px + 0.2, 0.254, pz + 0.5), { collide: false, shadow: false });
        // "a heap of clothes lay beside it": a black habit thrown down, sandals
        const [hx2, hz2] = B.local(x + 0.9, zTub + 0.8);
        inn.add('p.woolBlack', place(C.heap(0.75, 0.55, 0.17, { seed: 31 }), { x: hx2, y: 0.25, z: hz2, ry: 0.7 }), { collide: false });
        for (const [dx, dz, a] of [[-0.45, 0.35, 0.3], [-0.3, 0.5, -0.4]]) inn.add('p.leather', box(0.1, 0.025, 0.26, { x: hx2 + dx, y: 0.25, z: hz2 + dz, ry: a }), { collide: false, shadow: false });
      } else {
        // an empty tub, a little water left standing in the bottom, a damp patch
        inn.add('p.water', cyl(T.waterR * 0.93, T.waterR * 0.93, 0.01, 24, { x: px, y: 0.25 + 0.085, z: pz }), { collide: false, shadow: false });
        if (i === 1) inn.add('p.wetFloor', S.mound(1.2, 1.3, 0.004, { seed: 500 + i }).translate(px + 0.2, 0.254, pz + 0.6), { collide: false, shadow: false });
        // a towel over the rail at the open front of the bay
        const tw = C.drape(0.08, 0.5, 0.0, { hang: 0.45, seed: 520 + i, rumple: 1.2, foot: false, floor: -0.45 }); tw.rotateY(Math.PI / 2);
        inn.add('p.linen', B.T(place(tw, { x: x - 0.9, y: railY + 0.05, z: zFront })), { collide: false });
      }
      // the partition curtain on the east side of the bay (floor to pole)
      const cg = C.curtain(zFront - zBack - 0.05, railY - 0.32, { seed: 540 + i, depth: 0.11, gather: 1.2 }); cg.rotateY(Math.PI / 2);
      inn.add('p.curtain', B.T(cg.translate(x + step / 2, 0.3, (zFront + zBack) / 2)), { collide: false });
      // the front: drawn across the last bay, pushed aside at the others
      if (last) {
        const fc = C.curtain(step - 0.1, railY - 0.32, { seed: 560, depth: 0.1, gather: 1.1 });
        inn.add('p.curtain', B.T(fc.translate(x, 0.3, zFront + 0.06)), { collide: false });
      } else {
        const fc = C.curtain(0.75, railY - 0.32, { seed: 570 + i, depth: 0.12, gather: 1.8, folds: 5 });
        inn.add('p.curtain', B.T(fc.translate(x + step / 2 - 0.45, 0.3, zFront + 0.06)), { collide: false });
      }
      if (i === 0 || i === 2) {
        const bk = C.bucket(); const [qx, qz] = B.local(x + 1.0, zTub + 0.9);
        inn.add('wood', place(bk.wood.clone(), { x: qx, y: 0.25, z: qz }), { collide: false }); inn.add('iron', place(bk.iron.clone(), { x: qx, y: 0.25, z: qz, ry: i }), { collide: false });
      }
    }
    // the hearth that heats the water: a copper cauldron on a trivet over
    // the fire, the woodpile beside it (RECON)
    const [hx, hz] = B.local(r.L / 2 - 1.2, 0.8);
    F.fireplace(inn, hx, 0.25, hz, B.ry - Math.PI / 2, emit, { w: 1.8, h: 3.4 });
    { const [kx, kz] = B.local(r.L / 2 - 1.62, 1.05);
      inn.add('p.ironRust', lathe([[0, 0], [0.22, 0.02], [0.4, 0.16], [0.44, 0.34], [0.4, 0.5], [0.42, 0.53], [0.38, 0.53], [0.36, 0.5], [0.4, 0.34], [0.36, 0.18], [0.2, 0.06], [0, 0.06]], 20, { x: kx, y: 0.72, z: kz }));
      inn.add('p.water', cyl(0.37, 0.37, 0.01, 20, { x: kx, y: 1.12, z: kz }), { collide: false, shadow: false });
      inn.add('iron', merge([0, 1, 2].map(k => { const l = cyl(0.015, 0.015, 0.5, 5, {}); l.rotateZ(0.3); l.rotateY(k * TAU / 3); l.translate(kx + Math.cos(k * TAU / 3) * 0.3, 0.47, kz - Math.sin(k * TAU / 3) * 0.3); return l; })), { collide: false });
      const [wx, wz] = B.local(r.L / 2 - 0.9, 2.55); F.woodpile(inn, wx, 0.25, wz, Math.PI / 2, 12); }
    // "a basin in another corner": a stone trough against the west wall, fed
    // from a spout; a ladle and pails beside it
    { const [bx, bz] = B.local(-r.L / 2 + 0.78, r.W / 2 - 1.3), bw = 0.8, bl = 1.4, bh = 0.78, t = 0.1;
      inn.add('church', merge([box(bw, 0.12, bl, { x: bx, y: 0.25, z: bz }), box(t, bh, bl, { x: bx - bw / 2 + t / 2, y: 0.25, z: bz }), box(t, bh, bl, { x: bx + bw / 2 - t / 2, y: 0.25, z: bz }),
        box(bw, bh, t, { x: bx, y: 0.25, z: bz - bl / 2 + t / 2 }), box(bw, bh, t, { x: bx, y: 0.25, z: bz + bl / 2 - t / 2 })]));
      inn.add('p.water', box(bw - 2 * t, 0.01, bl - 2 * t, { x: bx, y: 0.25 + bh - 0.1, z: bz }), { collide: false, shadow: false });
      const sp = cyl(0.025, 0.03, 0.34, 8, {}); sp.rotateZ(Math.PI / 2 - 0.25); sp.translate(bx - bw / 2 + 0.1, 0.25 + bh + 0.42, bz);
      inn.add('bronze', merge([sp, box(0.06, 0.16, 0.16, { x: bx - bw / 2 - 0.02, y: 0.25 + bh + 0.36, z: bz })]), { collide: false });
      for (const [dx, dz] of [[0.75, -0.35], [0.8, 0.25]]) { const bk = C.bucket(); inn.add('wood', place(bk.wood.clone(), { x: bx + dx, y: 0.25, z: bz + dz }), { collide: false }); inn.add('iron', place(bk.iron.clone(), { x: bx + dx, y: 0.25, z: bz + dz, ry: dx }), { collide: false }); }
      inn.add('p.wetFloor', S.mound(1.4, 1.8, 0.004, { seed: 511 }).translate(bx + 0.7, 0.254, bz), { collide: false, shadow: false }); }
    // benches along the south wall either side of the door, towels folded on
    // one, and towels hung on pegs by the basin
    { const zb = r.W / 2 - 0.62;
      for (const x of [-3.9, 3.4]) { const [bx, bz] = B.local(x, zb); F.bench(inn, bx, 0.25, bz, B.ry, 2.4); }
      const [tx, tz] = B.local(-3.9, zb);
      for (let k = 0; k < 3; k++) inn.add('p.linen', box(0.42, 0.05, 0.3, { x: tx - 0.6 + k * 0.5, y: 0.73 + (k === 1 ? 0.05 : 0), z: tz, ry: k * 0.2 - 0.2 }), { collide: false });
      const pegX = -r.L / 2 + 1.9, pegZ = r.W / 2 - 0.36;
      inn.add('woodDark', B.T(box(1.4, 0.07, 0.08, { x: pegX, y: 1.82, z: pegZ })), { collide: false });
      for (let k = 0; k < 3; k++) { const tw = C.drape(0.08, 0.36, 0.0, { hang: 0.4 + k * 0.08, seed: 590 + k, rumple: 1.4, foot: false, floor: -0.6 }); tw.rotateY(Math.PI / 2); inn.add('p.linen', B.T(place(tw, { x: pegX - 0.45 + k * 0.45, y: 1.86, z: pegZ })), { collide: false }); }
    }
    it('last-tub', [...ctxPos(B.local(bay(n - 1), zTub), 1.2)], 2.4, 'The last tub, full, behind its drawn curtain; a heap of clothes on the floor beside it (Third Day, night)');
    it('baths', [...ctxPos(B.local(0, 0), 1.5)], 4, 'The baths: tubs parted by heavy curtains');
    ctx.anchors.baths = B.local(0, r.W / 2 + 2);
  }

  // --- gatehouse: the porter's lodge by the only gate -------------------
  {
    const r = rect(GATEHOUSE);
    const B = building(ex, inn, { name: 'gatehouse', ...r, h: 4.4, doors: [{ side: 'N', t: 0.55, w: 1.2 }], windows: [{ side: 'N', n: 1, t: 0.2, w: 0.6 }, { side: 'E', n: 1 }] });
    sink(B);
    const [fx, fz] = B.local(-r.L / 2 + 1.2, 0); F.fireplace(inn, fx, 0.25, fz, B.ry + Math.PI / 2, emit, { w: 1.6, h: 3.0 });
    const [bx, bz] = B.local(r.L / 2 - 1.2, 0.4); F.bed(inn, bx, 0.25, bz, 0);
    const [tx, tz] = B.local(0, -0.8); F.table(inn, tx, 0.25, tz, 0, 1.4, 0.7); F.bench(inn, tx, 0.25, tz + 0.7, 0, 1.4);
  }

  // --- M, N: sheepfolds, pigsties and stables along the east wall -------
  {
    const r = rect(FOLDS);
    const B = building(ex, inn, { name: 'folds', ...r, h: 3.2, ridge: 4.8, roof: 'thatch', open: 'S', floorMat: 'soil' });
    sink(B);
    for (let i = 1; i < 4; i++) inn.add('beam', B.T(box(0.08, 1.2, r.W - 1, { x: -r.L / 2 + i * r.L / 4, y: 0.2, z: 0 })));
    // a plank feeding trough at the front of each pen, with hay in it
    for (let i = 0; i < 4; i++) {
      const o = { x: -r.L / 2 + (i + 0.5) * r.L / 4, y: 0.2, z: r.W / 2 - 1.2 };
      inn.add('woodDark', B.T(place(plankTrough(2.2, 0.5, 0.35, true), o)));
      inn.add('straw', B.T(box(2.0, 0.07, 0.3, { ...o, y: 0.2 + 0.1 })), { collide: false });
    }
    // pig pens in front, fenced — kept clear of the stables' west doors
    // (the fence used to cross the W20 side door: k0073 H stables beside the wall)
    fence(ex, [[FOLDS.x0, FOLDS.z1 + 0.5], [FOLDS.x0, FOLDS.z1 + 9], [FOLDS.x0 + 5, FOLDS.z1 + 9], [FOLDS.x0 + 5, FOLDS.z1 + 0.5]]);
    // the pigs' two feeding troughs, of the same weathered, snow-dusted timber
    // as the fence, with a dark wet board floor (formerly flat blocks)
    for (const [x, z, ry] of [[FOLDS.x0 + 1.4, FOLDS.z1 + 7.5, 0.03], [FOLDS.x0 + 3.4, FOLDS.z1 + 7.5, -0.04]]) {
      const y = baseHeight(x, z);
      ex.add('beamExt', place(plankTrough(1.6, 0.6, 0.42), { x, y, z, ry }));
      inn.add('woodDark', box(1.44, 0.04, 0.38, { x, y: y + 0.07, z, ry }), { collide: false });
    }
    it('folds', [FOLDS.x0 + 6, 1.5, FOLDS.z1 + 4], 7, 'The sheepfolds and pigsties');
  }
  {
    const r = rect(STABLES);
    const B = building(ex, inn, { name: 'stables', ...r, h: 4.6, ridge: 7.2, axis: 'z', doors: [{ side: 'W', t: 0.5, w: 2.4, h: 3.0, arch: 'flat', noWalk: true }, { side: 'W', t: 0.2, w: 1.4 }, { side: 'W', t: 0.8, w: 1.4 }], windows: [{ side: 'E', n: 8, w: 0.5, sill: 2.6, top: 3.3 }], floorMat: 'soil' });
    // W50 is the great door barred by the metal grille (k1309 H): one sees the
    // horses through it but cannot walk it; the side doors W20/W80 are used.
    sink(B);
    // stalls: Brunellus first from the left. Plank partitions on posts run
    // from the east wall; each stall opens on the aisle through its manger —
    // a plank trough whose rim stands 1.0 m above the floor (claim: "the
    // horses at the mangers"), a slatted hayrack over it; deep straw bedding,
    // droppings, the aisle floor trodden to mud by the doors. Horses face the
    // aisle (−x) with their muzzles over the manger (see animals.js).
    const n = 14, FL = 0.25, dz = (r.W - 2) / n, xm = STABLES.x1 - 3.75;
    for (let i = 0; i <= n; i++) {
      const z = STABLES.z0 + 1 + i * dz;
      inn.add('woodDark', merge([box(0.14, 1.75, 0.14, { x: STABLES.x1 - 3.55, y: FL, z }), box(3.1, 0.12, 0.08, { x: STABLES.x1 - 2.0, y: FL + 1.35, z }),
        ...[0.25, 0.55, 0.85, 1.12].map(yy => box(3.0, 0.26, 0.045, { x: STABLES.x1 - 2.0, y: FL + yy - 0.2, z: z + (i % 2 ? 0.01 : -0.01) }))]));
      if (i === n) continue;
      const zc = z + dz / 2, w = dz - 0.18, v = i % 3;
      // manger and hay
      inn.add('woodDark', merge([box(0.55, 0.06, w, { x: xm, y: FL + 0.72, z: zc }), box(0.05, 0.3, w, { x: xm - 0.26, y: FL + 0.72, z: zc }), box(0.05, 0.26, w, { x: xm + 0.26, y: FL + 0.74, z: zc }),
        box(0.08, 0.74, 0.08, { x: xm - 0.22, y: FL, z: zc - w / 2 + 0.06 }), box(0.08, 0.74, 0.08, { x: xm - 0.22, y: FL, z: zc + w / 2 - 0.06 })]));
      inn.add('p.hay', place(S.mound(0.48, w - 0.1, 0.1, { seed: 700 + i }), { x: xm, y: FL + 0.78, z: zc }), { collide: false, shadow: false });
      // hayrack: slats leaning out from a rail high over the manger, above
      // the horse's head, so a head over the manger is seen from the aisle
      // and the grille (not caged behind the slats)
      const rack = [box(0.06, 0.06, w, { x: xm + 0.42, y: FL + 1.95, z: zc }), box(0.06, 0.06, w, { x: xm + 0.02, y: FL + 2.45, z: zc })];
      for (let k = 0; k < Math.floor(w / 0.2); k++) { const sl = box(0.03, 0.62, 0.03, {}); sl.rotateZ(0.64); sl.translate(xm + 0.22, FL + 1.95, zc - w / 2 + 0.12 + k * 0.2); rack.push(sl); }
      inn.add('beam', merge(rack), { collide: false });
      inn.add('p.hay', place(S.mound(0.26, w - 0.25, 0.3, { seed: 720 + i }), { x: xm + 0.3, y: FL + 2.03, z: zc, rz: 0.9 }), { collide: false, shadow: false });
      // bedding, and the droppings in it
      inn.add('straw', place(S.mound(3.0, w, 0.12 + v * 0.03, { seed: 740 + i }), { x: STABLES.x1 - 2.0, y: FL, z: zc }), { collide: false });
      inn.add('p.hay', place(S.mound(3.2, w + 0.1, 0.16 + v * 0.03, { seed: 750 + i }), { x: STABLES.x1 - 2.0, y: FL + 0.01, z: zc }), { collide: false, shadow: false });
      if (v !== 1) inn.add('p.dung', place(S.mound(0.32, 0.26, 0.07, { seed: 760 + i }), { x: STABLES.x1 - 1.1 - v * 0.4, y: FL + 0.08, z: zc + (v - 1) * 0.3 }), { collide: false, shadow: false });
    }
    // the aisle: loose straw swept to the sides, a wet trodden patch at each
    // door, droppings; buckets, a shovel and a fork against the wall, tack on
    // pegs, a saddle on its trestle
    for (let k = 0; k < 9; k++) inn.add('p.hay', place(S.mound(1.4 + (k % 3) * 0.5, 1.0, 0.02, { seed: 800 + k }), { x: STABLES.x0 + 1.4 + (k % 3) * 1.6, y: FL, z: STABLES.z0 + 3 + k * 3.8, ry: k * 1.3 }), { collide: false, shadow: false });
    for (const t of [0.2, 0.5, 0.8]) inn.add('p.dung', place(S.mound(2.2, 1.8, 0.008, { seed: 780 + t * 10 }), { x: STABLES.x0 + 1.4, y: FL, z: STABLES.z0 + t * r.W }), { collide: false, shadow: false });
    for (const [t, sd] of [[0.33, 1], [0.64, 2], [0.66, 3]]) { const bk = C.bucket(); inn.add('wood', place(bk.wood.clone(), { x: xm - 0.6, y: FL, z: STABLES.z0 + t * r.W, ry: sd })); inn.add('iron', place(bk.iron.clone(), { x: xm - 0.6, y: FL, z: STABLES.z0 + t * r.W, ry: sd }), { collide: false }); }
    const tool = (len, hd) => { const g = merge([cyl(0.018, 0.02, len, 6, {}), hd]); g.rotateZ(0.22); return g; };
    inn.add('wood', place(tool(1.5, box(0.24, 0.3, 0.02, { y: -0.05 })), { x: STABLES.x0 + 0.85, y: FL, z: STABLES.z0 + 0.3 * r.W, ry: Math.PI / 2 }), { collide: false });
    inn.add('iron', place(merge([box(0.02, 0.28, 0.02, { x: -0.06, y: 1.5 }), box(0.02, 0.28, 0.02, { x: 0.06, y: 1.5 }), box(0.14, 0.02, 0.02, { y: 1.5 })]), { x: STABLES.x0 + 0.85, y: FL + 0.05, z: STABLES.z0 + 0.3 * r.W + 0.5, rz: 0.2, ry: Math.PI / 2 }), { collide: false });
    inn.add('wood', place(cyl(0.018, 0.02, 1.55, 6, {}), { x: STABLES.x0 + 0.85, y: FL + 0.05, z: STABLES.z0 + 0.3 * r.W + 0.5, rz: 0.2, ry: Math.PI / 2 }), { collide: false });
    for (let k = 0; k < 4; k++) {
      const pz = STABLES.z0 + 0.36 * r.W + k * 0.7;
      inn.add('woodDark', box(0.18, 0.05, 0.05, { x: STABLES.x0 + 0.75, y: 1.9, z: pz }), { collide: false });
      const loop = new THREE.TorusGeometry(0.22, 0.012, 4, 18); loop.scale(1, 1.8, 1); loop.rotateY(Math.PI / 2); loop.translate(STABLES.x0 + 0.8, 1.55, pz);
      inn.add('p.leather', loop, { collide: false, shadow: false });
      inn.add('iron', cyl(0.035, 0.035, 0.012, 10, { x: STABLES.x0 + 0.8, y: 1.18, z: pz }), { collide: false, shadow: false });
    }
    { const sx = STABLES.x0 + 1.2, sz = STABLES.z0 + 0.58 * r.W;
      inn.add('woodDark', merge([box(0.9, 0.06, 0.14, { y: 0.75 }), ...[[-0.35, -0.2], [0.35, -0.2], [-0.35, 0.2], [0.35, 0.2]].map(([a2, b2]) => { const l = box(0.05, 0.78, 0.05, { x: a2, z: b2 * 0.4 }); return l; })]).translate(sx, FL, sz));
      const saddle = C.drape(0.2, 0.55, 0.85, { hang: 0.28, seed: 790, rumple: 0.4, foot: false, floor: 0.45 }); saddle.rotateY(Math.PI / 2);
      inn.add('p.leather', saddle.translate(sx, FL, sz), { collide: false }); }
    // two lanterns hung over the aisle: the horses' heads catch their light
    // from the side, one by the grille and one by Brunellus's stall
    for (const lz of [r.cz + 1.6, STABLES.z0 + 3.2]) F.oilLamp(inn, STABLES.x0 + 2.6, 2.35, lz, emit, 1.9);
    // the main door has a large metal grille
    const gx = STABLES.x0 - 0.05, gz = r.cz;
    for (let i = 0; i < 9; i++) ex.add('iron', box(0.05, 3.0, 0.05, { x: gx - 0.25, y: 0.25, z: gz - 1.1 + i * 0.275 }), { collide: false });
    for (const y of [0.9, 2.1]) ex.add('iron', box(0.06, 0.05, 2.4, { x: gx - 0.25, y, z: gz }), { collide: false });
    ex.collider(box(0.2, 3.0, 2.4, { x: gx - 0.25, y: 0.25, z: gz }));
    fence(ex, [[STABLE_YARD.x0, STABLE_YARD.z0], [STABLE_YARD.x0, STABLE_YARD.z1], [STABLE_YARD.x1, STABLE_YARD.z1]]);
    F.sacks(inn, STABLES.x0 + 1.4, 0.25, STABLES.z0 + 3, 6);
    it('stables', [STABLES.x0 - 2, 1.5, r.cz], 6, 'The horse stables — their door a great metal grille');
    ctx.anchors.stables = [STABLES.x0 - 4, r.cz];
  }
  // granary ("the first was the granary"), ox stable, threshing floor
  {
    const r = rect(GRANARY);
    const B = building(ex, inn, { name: 'granary', ...r, h: 6.4, ridge: 10, doors: [{ side: 'W', t: 0.5, w: 2.2, h: 3.2, arch: 'flat' }], windows: [{ side: 'N', n: 4, w: 0.4, sill: 4.5, top: 5.3 }, { side: 'S', n: 4, w: 0.4, sill: 4.5, top: 5.3 }], floorMat: 'boards' });
    sink(B);
    for (let i = 0; i < 4; i++) F.sacks(inn, GRANARY.x0 + 3 + i * 4, 0.25, GRANARY.z0 + 2.5, 8);
    for (let i = 0; i < 3; i++) inn.add('woodDark', box(3.5, 1.4, 2.4, { x: GRANARY.x0 + 5 + i * 5, y: 0.25, z: GRANARY.z1 - 2 }));
    it('granary', [GRANARY.x0 - 2, 1.5, r.cz], 6, 'The granary');
  }
  {
    const r = rect(OXSHED);
    const B = building(ex, inn, { name: 'oxshed', ...r, h: 4.2, ridge: 6.8, roof: 'thatch', open: 'W', floorMat: 'soil' });
    sink(B);
    for (let i = 0; i < 6; i++) inn.add('woodDark', box(0.7, 0.7, 2.2, { x: OXSHED.x1 - 1.0, y: 0.25, z: OXSHED.z0 + 2 + i * 4.6 }));
    inn.add('straw', box(r.L - 1, 0.1, r.W - 1, { x: r.cx, y: 0.25, z: r.cz }), { collide: false });
  }
  {
    const cx = (THRESHING.x0 + THRESHING.x1) / 2, cz = (THRESHING.z0 + THRESHING.z1) / 2;
    ex.add('flagExt', cyl(7.5, 7.7, 0.4, 32, { x: cx, y: baseHeight(cx, cz) - 0.25, z: cz }));
    ctx.plots.push({ x0: cx - 8, x1: cx + 8, z0: cz - 8, z1: cz + 8, kind: 'yard' });
    it('threshing', [cx, 1.2, cz], 8, 'The threshing floor at the east end');
  }
  // F14: a stone water cistern by the kitchen yard, "the wells and water
  // reservoirs" drawn on during the fire (c2835 k0955 H)
  {
    const cx = GRANARY.x0 - 4, cz = GRANARY.z0 - 3, cy = baseHeight(cx, cz);
    ex.add('rubble', cyl(2.4, 2.6, 1.3, 24, { x: cx, y: cy - 0.5, z: cz }));
    ex.add('rubbleIn', cyl(2.0, 2.0, 1.2, 24, { x: cx, y: cy - 0.45, z: cz }, true));
    ex.add('water', cyl(2.0, 2.0, 0.02, 24, { x: cx, y: cy + 0.55, z: cz }), { collide: false });
    it('cistern', [cx, cy + 1.0, cz], 3, 'A water cistern for the kitchen and the fire buckets');
  }
  // henhouses and the great jar of pig's blood behind the choir
  {
    const r = rect(HENHOUSE);
    const B = building(ex, inn, { name: 'henhouse', cx: r.cx + 4, cz: r.cz - 6, L: 6, W: 4, h: 2.4, ridge: 3.4, roof: 'thatch', mat: 'beamExt', doors: [{ side: 'W', t: 0.5, w: 0.8, h: 1.4, arch: 'flat', noWalk: true }], floorMat: 'soil', th: 0.2 });
    // the henhouse opening is a low hen hatch (h 1.4), not a walkable door
    void B;
    fence(ex, [[HENHOUSE.x0, HENHOUSE.z0], [HENHOUSE.x0, HENHOUSE.z1], [HENHOUSE.x1, HENHOUSE.z1], [HENHOUSE.x1, HENHOUSE.z0], [HENHOUSE.x0 + 6, HENHOUSE.z0]]);
    const [jx, jz] = BLOOD_JAR, jy = baseHeight(jx, jz);
    // the vat: thrown earthenware, broad-shouldered, a thick rolled rim;
    // the blood within dark and glossy, a stirring pole left in it, runs down
    // the side; beside it the killing trestle, pails, a knife and a basin
    // (1.3 m to its lip: a great jar a swineherd can still stir standing on
    // the ground, scripts/people/tasks.py 'stirVat')
    const vat = C.vat(0.82, 1.3);
    ex.add('p.earthenware', place(vat, { x: jx, y: jy - 0.08, z: jz, ry: 0.7 }));
    ex.add('p.bloodPool', cyl(0.56, 0.56, 0.01, 32, { x: jx, y: jy - 0.08 + 1.2, z: jz }), { collide: false });
    ex.add('beamExt', place(cyl(0.028, 0.03, 2.3, 8, {}), { x: jx + 0.25, y: jy + 0.35, z: jz - 0.1, rx: 0.12, rz: -0.45 }), { collide: false });
    F.trestle(ex, jx - 1.9, jy - 0.02, jz + 1.1, 0.5, 1.8, 0.6, 0.72);
    ex.add('iron', place(box(0.28, 0.004, 0.04, {}), { x: jx - 1.85, y: jy + 0.71, z: jz + 1.05, ry: 0.9 }), { collide: false, shadow: false });
    ex.add('woodDark', place(box(0.12, 0.025, 0.035, {}), { x: jx - 1.7, y: jy + 0.71, z: jz + 1.2, ry: 0.9 }), { collide: false, shadow: false });
    for (const [dx, dz, t] of [[1.0, 0.7, 0], [-0.9, -0.8, 1.2], [1.3, -0.4, 2]]) {
      const bk = C.bucket(0.17, 0.3);
      ex.add('wood', place(bk.wood.clone(), { x: jx + dx, y: jy - 0.02, z: jz + dz, ry: t }), { collide: false });
      ex.add('iron', place(bk.iron.clone(), { x: jx + dx, y: jy - 0.02, z: jz + dz, ry: t }), { collide: false });
    }
    ex.add('p.earthenDark', place(C.bowl(0.28, 0.14), { x: jx - 1.5, y: jy - 0.02, z: jz + 0.2 }), { collide: false });
    // "the snow all around was crimson": a stain soaked into the snow and the
    // trodden earth, draped on the ground, darkest round the jar
    {
      const st = new THREE.PlaneGeometry(6.4, 6.4, 32, 32); st.rotateX(-Math.PI / 2);
      const sp = st.attributes.position;
      for (let i = 0; i < sp.count; i++) { const x = sp.getX(i) + jx + 0.4, z = sp.getZ(i) + jz + 0.5; sp.setXYZ(i, x, baseHeight(x, z) + 0.03, z); }
      st.computeVertexNormals();
      ex.add('p.stain', st, { collide: false, shadow: false });
    }
    ctx.ground.push({ kind: 'mud', c: [jx + 0.3, jz + 0.4], r: 2.6, k: 0.8 });
    it('blood-jar', [jx, 1.4, jz], 3, 'The great jar of pig’s blood, stirred so it will not clot');
    ctx.anchors.bloodJar = [jx - 3, jz + 2];
  }

  // --- south range -----------------------------------------------------
  for (const R of SOUTH_RANGE) {
    const r = rect(R);
    if (R.id === 'smithy') { smithy(ex, inn, r, ctx, sink); continue; }
    const ry = R.rot || 0;
    const opts = { name: R.id, ...r, ry, h: R.id === 'granaries' ? 6.0 : 4.8, doors: [{ side: 'N', t: 0.5, w: R.id === 'mill' || R.id === 'press' ? 2.2 : 1.5, h: 2.8 }], windows: [{ side: 'N', n: Math.max(1, Math.round(r.L / 6)), w: 0.55 }, { side: 'S', n: 2, w: 0.5, sill: 2.4, top: 3.2 }] };
    if (R.id === 'mill' || R.id === 'press') opts.floorMat = 'flag';
    const B = building(ex, inn, opts);
    sink(B);
    const c = B.local(0, 0);
    if (R.id === 'mill') {
      // a beast mill: on a timber hursting frame the bedstone and the runner,
      // grain fed from a hopper; the spindle turned by a sweep that a donkey
      // walks round; meal falls from the stone case into a bin
      const [mx, mz] = c;
      inn.add('beam', merge([box(2.6, 0.9, 0.22, { x: mx, y: 0.25, z: mz - 1.1 }), box(2.6, 0.9, 0.22, { x: mx, y: 0.25, z: mz + 1.1 }), box(0.22, 0.9, 2.4, { x: mx - 1.2, y: 0.25, z: mz }), box(0.22, 0.9, 2.4, { x: mx + 1.2, y: 0.25, z: mz }), box(2.6, 0.08, 2.6, { x: mx, y: 1.1, z: mz })]));
      inn.add('rubbleIn', lathe([[0, 0], [0.95, 0], [0.97, 0.22], [0.9, 0.26], [0, 0.24]], 32, { x: mx, y: 1.18, z: mz }));
      inn.add('rubbleIn', lathe([[0.12, 0.26], [0.92, 0.27], [0.94, 0.5], [0.86, 0.53], [0.18, 0.52], [0.12, 0.45]], 32, { x: mx, y: 1.18, z: mz }));
      // the tun round the stones: coopered staves, each a little uneven,
      // held by two iron hoops; then the meal spout into the bin
      {
        const staves = [];
        for (let k = 0; k < 26; k++) {
          const a = k / 26 * Math.PI * 2, h = 0.6 + ((k * 7) % 5 - 2) * 0.008, rr = 1.05 + ((k * 3) % 4) * 0.003;
          staves.push(place(box(0.245, h, 0.045, {}), { x: mx + Math.sin(a) * rr, y: 1.18, z: mz + Math.cos(a) * rr, ry: a }));
        }
        inn.add('woodDark', merge(staves), { collide: false });
        for (const hy of [0.1, 0.47]) inn.add('iron', lathe([[1.075, 0], [1.095, 0], [1.095, 0.045], [1.075, 0.045]], 32, { x: mx, y: 1.18 + hy, z: mz }), { collide: false });
      }
      inn.add('woodDark', place(box(0.3, 0.12, 0.7, {}), { x: mx, y: 1.0, z: mz + 1.45, rx: 0.4 }), { collide: false });
      inn.add('woodDark', merge([box(1.1, 0.5, 0.05, { x: mx, y: 0.25, z: mz + 1.55 }), box(1.1, 0.5, 0.05, { x: mx, y: 0.25, z: mz + 2.25 }), box(0.05, 0.5, 0.7, { x: mx - 0.55, y: 0.25, z: mz + 1.9 }), box(0.05, 0.5, 0.7, { x: mx + 0.55, y: 0.25, z: mz + 1.9 })]));
      inn.add('p.linenWhite', box(1.0, 0.02, 0.62, { x: mx, y: 0.55, z: mz + 1.9 }), { collide: false });
      // the hopper stands beside the drive shaft on its own frame (the
      // horse) and feeds the runner's eye through an inclined shoe; heaped
      // with grain. Boards of light, worn wood, not a solid pyramid
      {
        const hx = mx + 0.62, hz = mz - 0.1, hy = 2.0;
        inn.add('wood', lathe([[0.1, 0], [0.15, 0], [0.5, 0.58], [0.45, 0.6], [0.1, 0.05]], 4, { x: hx, y: hy, z: hz, ry: Math.PI / 4 }), { collide: false });
        inn.add('p.grainSack', place(S.mound(0.62, 0.62, 0.12, { seed: 671 }), { x: hx, y: hy + 0.5, z: hz }), { collide: false, shadow: false });
        const shoe = box(0.14, 0.03, 0.62, {}); shoe.rotateX(0.32); shoe.rotateY(Math.PI / 2 + 0.12);
        inn.add('wood', place(shoe, { x: (hx + mx + 0.14) / 2, y: 1.84, z: hz }), { collide: false });
        // the horse: four legs on the tun's rim, rails under the hopper
        const legs = [];
        for (const [dx, dz] of [[-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]]) legs.push(box(0.07, 0.62, 0.07, { x: hx + dx, y: 1.78, z: hz + dz }));
        legs.push(box(0.92, 0.06, 0.07, { x: hx, y: 2.2, z: hz - 0.42 }), box(0.92, 0.06, 0.07, { x: hx, y: 2.2, z: hz + 0.42 }));
        inn.add('beam', merge(legs), { collide: false });
      }
      // the drive shaft comes down from the sweep to the runner stone, the
      // sweep high enough for the beast and the miller to walk under
      inn.add('beam', cyl(0.1, 0.12, 2.3, 10, { x: mx, y: 1.7, z: mz }));
      inn.add('iron', cyl(0.13, 0.13, 0.08, 10, { x: mx, y: 1.7, z: mz }), { collide: false });
      const sweep = box(5.6, 0.16, 0.18, { x: 2.8, y: 3.3 }); sweep.rotateY(0.9); sweep.translate(mx, 0.25, mz); inn.add('beam', sweep, { collide: false });
      // chaff and straw kicked about in uneven drifts, not one square mat;
      // meal dust whitening the case, the bin and the floor below the spout
      for (let k = 0; k < 5; k++) inn.add('p.hay', place(S.mound(0.7 + (k % 3) * 0.45, 0.5 + (k % 2) * 0.4, 0.012 + (k % 2) * 0.01, { seed: 640 + k }), { x: mx + 1.0 + Math.cos(k * 2.1) * 1.3, y: 0.25, z: mz - 2.0 + Math.sin(k * 2.1) * 0.9, ry: k * 1.3 }), { collide: false, shadow: false });
      inn.add('p.flour', place(S.mound(1.3, 1.0, 0.012, { seed: 660 }), { x: mx + 0.1, y: 0.25, z: mz + 1.95 }), { collide: false, shadow: false });
      inn.add('p.flour', place(S.mound(0.9, 0.9, 0.015, { seed: 661 }), { x: mx, y: 1.18 + 0.53, z: mz }), { collide: false, shadow: false });
      inn.add('p.flour', lathe([[1.0, 0], [1.1, 0], [1.1, 0.018], [1.0, 0.018]], 32, { x: mx, y: 1.18 + 0.6, z: mz }), { collide: false, shadow: false });
      // a lamp hung from the sweep's beam over the bin: the stones and the
      // spout catch its light
      F.oilLamp(inn, mx + 0.4, 2.55, mz + 1.4, emit, 1.2);
      F.sacks(inn, c[0] - 3.6, 0.25, c[1] + 2.4, 7);
      it('mill', [c[0], 1.5, c[1]], 5, 'The mill: peasants bring wheat and millet');
    } else if (R.id === 'press') {
      // late November is the olive harvest: the crushing basin with its
      // upright runner stone and sweep (a beast walks it round), then the
      // screw press — two great posts and a cross-head, the screw turned by
      // a bar, the platen bearing down on a stack of rush mats of paste on a
      // stone bed whose channel runs into a sunk jar; baskets of olives, oil
      // jars, the floor dark with spilt oil
      const [mx, mz] = [c[0] - 2.2, c[1]];
      inn.add('rubbleIn', lathe([[0, 0], [1.55, 0], [1.6, 0.72], [1.35, 0.78], [1.3, 0.62], [0.3, 0.55], [0.25, 0.72], [0, 0.72]], 32, { x: mx, y: 0.25, z: mz }));
      const run = cyl(0.62, 0.62, 0.3, 28, {}); run.rotateZ(Math.PI / 2); run.translate(0.6, 1.4, 0); run.rotateY(0.4); run.translate(mx, 0.25, mz);
      inn.add('rubbleIn', run);
      inn.add('beam', cyl(0.12, 0.13, 2.1, 10, { x: mx, y: 0.8, z: mz }));
      const sweep = box(4.4, 0.16, 0.16, { x: 1.4, y: 1.35 }); sweep.rotateY(0.4); sweep.translate(mx, 0.25, mz); inn.add('beam', sweep, { collide: false });
      inn.add('p.oilRes', cyl(1.3, 1.3, 0.01, 28, { x: mx, y: 0.25 + 0.56, z: mz }), { collide: false, shadow: false });
      const [px, pz] = [c[0] + 2.4, c[1]];
      // bed, channel and spout
      inn.add('rubbleIn', lathe([[0, 0], [1.05, 0], [1.05, 0.5], [0.95, 0.52], [0.9, 0.44], [0, 0.44]], 28, { x: px, y: 0.25, z: pz }));
      inn.add('rubbleIn', box(0.22, 0.12, 0.6, { x: px, y: 0.55, z: pz + 1.2 }), { collide: false });
      inn.add('p.oilRes', cyl(0.88, 0.88, 0.01, 28, { x: px, y: 0.25 + 0.445, z: pz }), { collide: false, shadow: false });
      // the stack of mats
      for (let k = 0; k < 7; k++) inn.add(k % 2 ? 'p.sacking' : 'straw', lathe([[0, 0], [0.62, 0], [0.66, 0.05], [0.62, 0.1], [0, 0.1]], 22, { x: px, y: 0.7 + k * 0.1, z: pz, ry: k }), { collide: false });
      // platen, posts, cross-head, screw and bar
      inn.add('woodDark', box(1.4, 0.22, 1.4, { x: px, y: 1.42, z: pz }), { collide: false });
      inn.add('beam', merge([box(0.38, 3.6, 0.38, { x: px - 1.25, y: 0.25, z: pz }), box(0.38, 3.6, 0.38, { x: px + 1.25, y: 0.25, z: pz }), box(3.2, 0.5, 0.5, { x: px, y: 3.2, z: pz }), box(3.0, 0.35, 0.45, { x: px, y: 0.25, z: pz - 1.1 }), box(3.0, 0.35, 0.45, { x: px, y: 0.25, z: pz + 1.1 })]));
      const thread = [];
      for (let k = 0; k < 22; k++) { const y = 1.64 + k * 0.075; thread.push([0.12, y], [0.16, y + 0.03], [0.12, y + 0.06]); }
      inn.add('woodDark', lathe([[0, 1.64], ...thread, [0.12, 3.7], [0.2, 3.72], [0.2, 3.95], [0, 3.95]], 14, { x: px, y: 0, z: pz }), { collide: false });
      inn.add('beam', box(0.1, 0.1, 2.6, { x: px, y: 3.82, z: pz, ry: 0.6 }), { collide: false });
      // the receiving jar sunk at the spout, oil jars, olives in baskets
      F.jar(inn, px, -0.2, pz + 1.7, 0.7, 'potteryDark');
      inn.add('p.oilRes', cyl(0.12, 0.12, 0.01, 12, { x: px, y: 0.25 + 0.52, z: pz + 1.7 }), { collide: false, shadow: false });
      inn.add('p.oilRes', S.mound(2.6, 3.2, 0.003, { seed: 610 }).translate(px, 0.252, pz + 0.5), { collide: false, shadow: false });
      for (let k = 0; k < 4; k++) {
        const bx = c[0] - 0.2 + (k % 2) * 0.8, bz = c[1] + 2.4 + Math.floor(k / 2) * 0.8;
        inn.add('straw', lathe([[0, 0], [0.26, 0], [0.34, 0.36], [0.3, 0.38], [0.22, 0.05], [0, 0.05]], 16, { x: bx, y: 0.25, z: bz }));
        inn.add('p.earthenDark', place(S.mound(0.6, 0.6, 0.1, { seed: 620 + k }), { x: bx, y: 0.25 + 0.3, z: bz }), { collide: false });
      }
      F.amphoraRow(inn, c[0] + 5.3, 0.25, c[1] + 3.2, 0, 5, 0.8);
      F.amphoraRow(inn, c[0] + 5.6, 0.25, c[1] - 3.4, 0.2, 4, 0.9);
      it('press', [c[0], 1.5, c[1]], 5, 'The oil press');
    } else if (R.id === 'cellars') {
      for (let i = 0; i < 8; i++) F.barrel(inn, c[0] - 3 + (i % 4) * 1.5, 0.25, c[1] - 2 + Math.floor(i / 4) * 4, 1.5, true);
      F.amphoraRow(inn, c[0], 0.25, c[1] + 4.5, 0, 7, 0.8);
      it('cellars', [c[0], 1.5, c[1]], 5, 'The cellars');
    } else if (R.id === 'granaries') {
      for (let i = 0; i < 4; i++) F.sacks(inn, c[0] - 8 + i * 5, 0.25, c[1] + 2, 9);
    } else if (R.id === 'novices') {
      // beds along the north wall; the slot in front of the N door is left clear
      for (let i = 0; i < 8; i++) { const lx = -r.L / 2 + 2 + i * 2.4; if (Math.abs(lx) < 1.3) continue; const [bx, bz] = B.local(lx, -r.W / 2 + 1.6); F.bed(inn, bx, 0.25, bz, ry); }
      it('novices', [c[0], 1.5, c[1]], 6, 'The novices’ house');
    } else if (R.id === 'lodgings') {
      const [fx, fz] = B.local(r.L / 2 - 1.2, 0); F.fireplace(inn, fx, 0.25, fz, ry - Math.PI / 2, emit, { w: 1.8, h: 3.2 });
      // beds along the north wall, but the slot in front of the N door is left clear
      for (let i = 0; i < 5; i++) { const lx = -r.L / 2 + 2 + i * 2.6; if (Math.abs(lx) < 1.3) continue; const [bx, bz] = B.local(lx, -r.W / 2 + 1.5); F.bed(inn, bx, 0.25, bz, ry); }
      it('lodgings', [c[0], 1.5, c[1]], 6, 'Quarters of the servants and peasants');
    }
  }

  return { batches: [ex, inn] };
}
function ctxPos([x, z], y) { return [x, y, z]; }

function pyramidHalf(x, r, yE, yP) {
  const pts = []; for (let i = 0; i <= 8; i++) { const t = -Math.PI / 2 + i / 8 * Math.PI; pts.push([x + Math.cos(t) * (r + 0.4), Math.sin(t) * (r + 0.4)]); }
  const pos = [];
  for (let i = 0; i < 8; i++) {
    const a = pts[i], b = pts[i + 1];
    pos.push(a[0], yE, a[1], x, yP, 0, b[0], yE, b[1], a[0], yE, a[1], b[0], yE, b[1], x, yP, 0);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  const uv = new Float32Array(pos.length / 3 * 2); for (let i = 0; i < pos.length / 3; i++) { uv[i * 2] = pos[i * 3 + 2] + pos[i * 3]; uv[i * 2 + 1] = pos[i * 3 + 1]; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

// wattle fences of posts and rails
// A plank trough as merged geometry at the origin (length along x): two
// splayed boards a side nailed to end boards that stand on the ground, their
// tops capped; with floor, a board floor inside
function plankTrough(L, W, H, floor = false) {
  const parts = [], bh = H * 0.36, y0 = H * 0.17;
  for (const s of [-1, 1]) {
    parts.push(box(L - 0.04, bh, 0.04, { y: y0, z: s * (W / 2 - 0.08), rx: s * 0.12 }), box(L - 0.04, bh, 0.04, { y: y0 + bh + 0.005, z: s * (W / 2 - 0.06), rx: s * 0.12 }));
    parts.push(box(0.05, H, W, { x: s * (L / 2 - 0.05) }), box(0.07, 0.05, W, { x: s * (L / 2 - 0.05), y: H }));
  }
  if (floor) parts.push(box(L - 0.16, 0.04, W - 0.22, { y: y0 }));
  return merge(parts);
}

export function fence(b, pts) {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], c = pts[i + 1], L = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const n = Math.max(1, Math.round(L / 1.8));
    for (let k = 0; k <= n; k++) {
      const x = a[0] + (c[0] - a[0]) * k / n, z = a[1] + (c[1] - a[1]) * k / n;
      b.add('beamExt', box(0.12, 1.3, 0.12, { x, y: baseHeight(x, z) - 0.2, z }));
    }
    const ang = Math.atan2(c[1] - a[1], c[0] - a[0]);
    const ya = baseHeight(...a), yc = baseHeight(...c);
    for (const h of [0.45, 0.95]) {
      const r = box(L, 0.07, 0.06, {}); r.rotateZ(Math.atan2(yc - ya, L)); r.translate(L / 2, 0, 0);
      place(r, { x: a[0], y: ya + h, z: a[1], ry: -ang });
      b.add('beamExt', r);
    }
  }
}

// R: forge in the front, glass blown at the back, Nicola's bench apart;
// prison cells with wall-rings in the basement (F7: c2017–c2021 k0146,
// k0967, k0624, k0625 H; c2153 the cellarer taken down to the forge)
function smithy(ex, inn, r, ctx, sink) {
  // the second N door (t 0.74) opens into the gap between the two forges
  const B = building(ex, inn, { name: 'smithy', ...r, h: 5.2, ridge: 8.0, doors: [{ side: 'N', t: 0.35, w: 2.4, h: 3.0, arch: 'flat' }, { side: 'N', t: 0.74, w: 1.3 }], windows: [{ side: 'N', n: 2, w: 0.6 }, { side: 'S', n: 3, w: 0.5, sill: 2.6, top: 3.4 }], floorMat: null });
  // (no generic floor: smithyBasement() lays the forge floor with its stair well cut out)
  sink(B);
  const hl = r.L / 2, hw = r.W / 2;
  // partition between the forge hall (front) and the glassworks (back)
  inn.add('plasterStone', B.T(wall([hl - 8, -hw + 0.3], [hl - 8, hw - 0.3], 0.25, 5.0, 0.35, [{ t: 2.2, w: 1.3, y0: 0, y1: 2.3, arch: 'round' }])));
  // --- the forge hall: two forges with hoods and bellows, anvils on their
  // stumps, quench troughs, tool boards, bar iron, a grindstone -----------
  for (const [k, x] of [[0, -hl + 3.5], [1, -hl + 9.5]]) {
    const [fx, fz] = B.local(x, -hw + 1.0);
    W.forge(inn, fx, 0.25, fz, B.ry, ctx.emit, { w: 1.8 });
    const [ax, az] = B.local(x + 0.2, 0.2);
    W.anvil(inn, ax, 0.25, az, B.ry + 0.2 + k * 0.3);
    const [qx, qz] = B.local(x - 1.6, -hw + 2.3); W.trough(inn, qx, 0.25, qz, B.ry + Math.PI / 2, 1.1);
    const [tx, tz] = B.local(x - 0.2, -hw + 0.36); W.toolRack(inn, tx, 0.25, tz, B.ry);
  }
  { const [ix, iz] = B.local(-hl + 0.6, hw - 1.2); W.barIron(inn, ix, 0.25, iz, B.ry + Math.PI / 2); }
  { const [gx2, gz2] = B.local(-hl + 6.5, hw - 1.5); W.grindstone(inn, gx2, 0.25, gz2, B.ry); }
  { const [cx2, cz2] = B.local(-hl + 12.3, hw - 1.3); F.woodpile(inn, cx2, 0.25, cz2, B.ry, 18); }
  // charcoal heaped by the forges, scale and cinders trodden into the floor
  { const [hx2, hz2] = B.local(-hl + 6.5, -hw + 1.0); inn.add('p.coal', place(S.mound(1.0, 0.8, 0.35, { seed: 930 }), { x: hx2, y: 0.25, z: hz2 }), { collide: false }); }
  // the cart in the yard before the door
  { const [yx, yz] = B.local(-hl + 1.2, -hw - 4.2); W.cart(ex, yx, baseHeight(yx, yz) - 0.02, yz, B.ry + 0.3); }
  // --- the round glass furnace at the east end, as drawn on the plan ---
  const [gx, gz] = B.local(hl - 2.4, hw - 2.6);
  inn.add('rubbleIn', lathe([[0, 0], [1.6, 0], [1.6, 1.4], [1.2, 2.3], [0.5, 2.7], [0.4, 3.4], [0, 3.4]], 20, { x: gx, y: 0.25, z: gz }));
  for (let i = 0; i < 3; i++) { const a = i * TAU / 3; inn.add('ember', box(0.35, 0.3, 0.05, { x: gx + Math.cos(a) * 1.58, y: 1.0, z: gz + Math.sin(a) * 1.58, ry: -a + Math.PI / 2 }), { collide: false, shadow: false }); }
  ctx.emit({ x: gx - 1.4, y: 1.3, z: gz, color: 0xff8a40, intensity: 8, distance: 10, flicker: 0.3 });
  // --- Nicola's bench, nearly a room apart: tiny coloured glass, panes
  // against the wall, an unfinished reliquary of silver set with glass ---
  const [wx, wz] = B.local(hl - 6.2, -hw + 1.2);
  F.table(inn, wx, 0.25, wz, B.ry, 2.2, 0.8);
  const cols = ['stained.0', 'stained.1', 'stainedWarm', 'glass'];
  for (let i = 0; i < 18; i++) inn.add(cols[i % 4], box(0.06, 0.01, 0.06, { x: wx - 0.8 + (i % 9) * 0.18, y: 1.04, z: wz - 0.2 + Math.floor(i / 9) * 0.25 }), { collide: false });
  inn.add('silver', box(0.3, 0.16, 0.12, { x: wx + 0.6, y: 1.04, z: wz }), { collide: false });
  for (let i = 0; i < 3; i++) { const [px, pz] = B.local(hl - 7.5 + i * 0.5, -hw + 0.45); inn.add(cols[i], box(0.6, 1.2, 0.03, { x: px, y: 0.3, z: pz, ry: B.ry, rx: 0.15 }), { collide: false }); }
  // F7: the basement cells reached by a stair from the forge hall
  smithyBasement(ex, inn, B, r, ctx);
  ctx.interact({ id: 'smithy', pos: new THREE.Vector3(...B.local(-hl + 6, 0).flatMap((v, i) => i ? [v] : [v, 1.5])), radius: 6, label: 'The smithy: the forge, and Nicola’s glassworks at the back' });
  ctx.interact({ id: 'glassworks', pos: new THREE.Vector3(wx, 1.4, wz), radius: 2.6, label: 'The glassworks: Nicola’s bench and the spectacle lenses' });
  ctx.anchors.smithy = B.local(-hl + 5, -hw - 3);
}

// F7: below the smithy, a low vaulted cellar with cells; iron rings in the
// walls, "a place for the instruments of torture" (c2017–c2021, c2248 k0931
// H). Reached by a stone stair in the forge hall.
function smithyBasement(ex, inn, B, r, ctx) {
  const hl = r.L / 2, hw = r.W / 2;
  const yF = 0.25, yB = -3.1;                       // forge floor / basement floor
  const bx0 = -hl + 1.0, bx1 = -hl + 12.0, bz0 = -hw + 1.0, bz1 = hw - 1.0;
  const basePoly = [[bx0, bz0], [bx1, bz0], [bx1, bz1], [bx0, bz1]];
  // the void under the cells, wider than the cellar so the terrain's ramp
  // lies outside the walls (not rising through their inner face as a band of snow)
  ctx.sink([[bx0 - 0.9, bz0 - 0.9], [bx1 + 0.9, bz0 - 0.9], [bx1 + 0.9, bz1 + 0.9], [bx0 - 0.9, bz1 + 0.9]].map(p => B.local(...p)), yB - 0.8, 0.4);
  // The stair well lies in the gap between the two forges, straight in from
  // the small north door (N74): the flight goes down southward, 5 m for the
  // 3.35 m drop (≈34°), and lands before the cells. One floor slab, cut.
  const sx0 = -hl + 5.7, sx1 = -hl + 7.3, sxc = (sx0 + sx1) / 2;
  const sz0 = -3.7, sz1 = 1.7;
  const holeLocal = [[sx0, sz0], [sx1, sz0], [sx1, sz1], [sx0, sz1]];
  inn.add('soil', B.T(prism([[-hl, -hw], [hl, -hw], [hl, hw], [-hl, hw]], yF - 0.4, yF, { holes: [holeLocal] })));
  const st = stairFlight(B.local(sxc, sz1 - 0.2), B.local(sxc, sz0 + 0.2), yB + 0.05, yF + 0.05, 1.3);
  inn.add('rubbleIn', st.geo, { collide: false }); inn.collider(st.ramp, 'stone');
  // the well's lining down to the cellar vault, and a timber rail on the
  // open sides at the top so the drop is visible and cannot be walked into
  for (const [a, b] of [[[sx0, sz0], [sx0, sz1]], [[sx1, sz1], [sx1, sz0]], [[sx1, sz1], [sx0, sz1]]])
    inn.add('rubbleIn', B.T(wall(a, b, yB + 1.9, yF - 0.02, 0.18)), { collide: false });
  for (const x of [sx0 - 0.08, sx1 + 0.08]) {
    inn.add('woodDark', B.T(box(0.07, 0.07, sz1 - sz0 - 0.9, { x, y: yF + 0.95, z: (sz0 + sz1) / 2 + 0.45 })), { collide: false });
    for (const z of [sz0 + 0.9, (sz0 + sz1) / 2 + 0.45, sz1]) inn.add('woodDark', B.T(box(0.08, 1.0, 0.08, { x, y: yF, z })), { collide: false });
    inn.collider(B.T(box(0.12, 1.1, sz1 - sz0 - 0.9, { x, y: yF, z: (sz0 + sz1) / 2 + 0.45 })), 'wood');
  }
  inn.add('woodDark', B.T(box(sx1 - sx0 + 0.24, 0.07, 0.07, { x: sxc, y: yF + 0.95, z: sz1 + 0.04 })), { collide: false });
  inn.collider(B.T(box(sx1 - sx0 + 0.2, 1.1, 0.12, { x: sxc, y: yF, z: sz1 + 0.04 })), 'wood');
  // basement floor, walls and a low vault either side of the stair well
  inn.add('flag', B.T(prism(basePoly, yB - 0.4, yB)));
  for (const vp of [[[bx0, bz0], [sx0 - 0.1, bz0], [sx0 - 0.1, bz1], [bx0, bz1]], [[sx1 + 0.1, bz0], [bx1, bz0], [bx1, bz1], [sx1 + 0.1, bz1]]])
    inn.add('rubbleIn', B.T(vaultSmooth(vp, yB + 2.3, 0.5, { archRise: 0.45 })), { collide: false });
  for (const [a, b] of [[[bx0, bz0], [bx1, bz0]], [[bx1, bz0], [bx1, bz1]], [[bx1, bz1], [bx0, bz1]], [[bx0, bz1], [bx0, bz0]]])
    inn.add('rubbleIn', B.T(wall(a, b, yB - 0.4, yF, 0.6)));
  // a lamp hung at the foot of the flight: from the forge floor a glow shows below
  { const [lx, lz] = B.local(sxc + 0.95, sz1 + 0.7); F.oilLamp(inn, lx, yB + 2.0, lz, ctx.emit, 0.95); }
  ctx.anchors.smithyStair = { top: B.local(sxc, sz0 - 0.6), bottom: B.local(sxc, sz1 + 0.9), yTop: yF, yBottom: yB, door: B.local(sxc - 0.1, -hw - 1.6) };
  // three cells along the south wall, each with a barred door and a wall-ring
  const cellW = (bx1 - bx0 - 1) / 3;
  for (let i = 0; i < 3; i++) {
    const x = bx0 + 0.5 + i * cellW;
    inn.add('rubbleIn', B.T(wall([x, bz1 - 2.4], [x, bz1], yB - 0.4, yB + 2.0, 0.35)));
    inn.add('rubbleIn', B.T(wall([x + cellW - 0.9, bz1 - 2.4], [x + cellW - 0.9, bz1], yB - 0.4, yB + 2.0, 0.35)));
    inn.add('rubbleIn', B.T(wall([x, bz1 - 2.4], [x + cellW - 0.9, bz1 - 2.4], yB - 0.4, yB + 2.0, 0.35, [{ t: cellW / 2 - 0.45, w: 0.85, y0: 0, y1: 1.9, arch: 'flat' }])));
    for (let k = 0; k < 4; k++) inn.add('iron', B.T(box(0.05, 1.9, 0.05, { x: x + cellW / 2 - 0.75 + k * 0.28, y: yB, z: bz1 - 2.4 })), { collide: false });
    const rg = new THREE.TorusGeometry(0.09, 0.02, 6, 14); rg.rotateX(Math.PI / 2);
    const [rx, rz] = B.local(x + cellW / 2 - 0.45, bz1 - 0.2);
    rg.translate(rx, yB + 0.9, rz); inn.add('iron', rg, { collide: false });
    inn.add('straw', B.T(box(cellW - 1.2, 0.06, 1.4, { x: x + cellW / 2 - 0.45, y: yB, z: bz1 - 1.2 })), { collide: false });
  }
  const [ex2, ez2] = B.local(-hl + 9.5, 0);
  ctx.emit({ x: ex2, y: yB + 1.6, z: ez2, color: 0xff7a30, intensity: 3, distance: 7, flicker: 0.4, small: true });
  ctx.interact({ id: 'smithy-cells', pos: new THREE.Vector3(...B.local(-hl + 6.5, 0).flatMap((v, i) => i ? [v] : [v, yB + 1.4])), radius: 5, label: 'The cells beneath the forge: iron rings set in the walls' });
}

// ---------------------------------------------------------------------
// the enclosure wall and the only gate
// ---------------------------------------------------------------------
function enclosure(ex, M, ctx) {
  const lines = [WALL_WEST, WALL_EAST];
  const H = 6.0, TH = 1.5;
  for (const line of lines) {
    for (let i = 0; i < line.length - 1; i++) {
      const a = line[i], b = line[i + 1];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.max(1, Math.ceil(L / 10));
      // F10: the wall is low at the east-tower junction (seg0) and behind the
      // stables (the north part of seg1), so one can look down the dung slope
      // (c0497/c0501 k0976 H, c0505 k2189 M, c0560 k0876 H)
      const lowSeg = line === WALL_EAST && (i === 0 || i === 1);
      for (let k = 0; k < n; k++) {
        const t0 = k / n, t1 = (k + 1) / n;
        const low = lowSeg && (i === 0 || (t0 + t1) / 2 < LOW_WALL.t1);
        const p = [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0], q = [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1];
        const hp = baseHeight(...p), hq = baseHeight(...q);
        const mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], hm = baseHeight(...mid);
        const top = Math.max(hp, hq, hm) + (low ? 1.1 : H);
        const d = [(q[0] - p[0]) / (L / n), (q[1] - p[1]) / (L / n)];
        const e = 0.7;
        const p2 = [p[0] - d[0] * e, p[1] - d[1] * e], q2 = [q[0] + d[0] * e, q[1] + d[1] * e];
        // F5: the secret postern falls in this sub-segment of the NW wall
        const segL = L / n;
        let ops = [];
        if (line === WALL_WEST && i === POSTERN.seg) {
          const pt = POSTERN.t * L;                    // distance along the whole segment
          const k0 = k * segL, k1 = (k + 1) * segL;
          if (pt >= k0 && pt < k1) {
            const tLocal = pt - k0 + e;                 // offset within the extended sub-wall
            ops = [{ t: tLocal, w: POSTERN.w, y0: 0, y1: POSTERN.h + 8, arch: 'round' }];
            const px = a[0] + (b[0] - a[0]) * (pt / L), pz = a[1] + (b[1] - a[1]) * (pt / L);
            const gy = baseHeight(px, pz);
            const nrm = [d[1], -d[0]];                  // outward (west) normal
            ctx.door({ id: 'postern', building: 'wall', x: px, z: pz, nx: nrm[0], nz: nrm[1], y: gy, w: POSTERN.w, th: TH, out: 2.4 });
            // a plain oak leaf, flush with the wall so it reads as masonry
            const leaf = box(0.12, POSTERN.h, POSTERN.w - 0.08, { x: 0 }); leaf.rotateY(-Math.atan2(nrm[1], nrm[0]) + 0.5);
            leaf.translate(px + nrm[0] * 0.2, gy, pz + nrm[1] * 0.2);
            ex.add('woodDark', leaf, { collide: false });
            ctx.interact({ id: 'postern', pos: new THREE.Vector3(px, gy + 1.0, pz), radius: 2.2, label: 'A narrow wicket, hidden in the wall behind the orchard' });
          }
        }
        ex.add('wall', wall(p2, q2, Math.min(hp, hq) - 8, top, TH, ops));
        if (!low) {
          const seg = L / n, m = Math.floor(seg / 2.1);
          for (let j = 0; j < m; j++) {
            const t = (j + 0.5) / m;
            const x = p[0] + (q[0] - p[0]) * t, z = p[1] + (q[1] - p[1]) * t;
            ex.add('wall', box(1.0, 0.9, TH, { x, y: top, z, ry: -Math.atan2(d[1], d[0]) }), { collide: false });
          }
        }
      }
    }
  }
  // gate tower over the western entrance: an arched passage with the oak
  // gates standing open
  const [gx, gz] = GATE.center;
  const gy = baseHeight(gx, gz);
  const tw = 7.4, td = 6.4, th = 10.5;
  const pts = [[gx - td / 2, gz - tw / 2], [gx + td / 2, gz - tw / 2], [gx + td / 2, gz + tw / 2], [gx - td / 2, gz + tw / 2]];
  for (let i = 0; i < 4; i++) {
    const a = pts[i], b = pts[(i + 1) % 4];
    const ops = (i === 1 || i === 3) ? [{ t: tw / 2 + 0.6, w: 3.6, y0: 0, y1: 4.2 + 3, arch: 'round' }, { t: tw / 2 + 0.6, w: 0.5, y0: 8.4 + 3, y1: 9.4 + 3, arch: 'round' }] : [{ t: td / 2 + 0.6, w: 0.4, y0: 7.2 + 3, y1: 8.2 + 3, arch: 'round' }];
    const d = [b[0] - a[0], b[1] - a[1]], L = Math.hypot(...d), u = [d[0] / L, d[1] / L];
    ex.add('wall', wall([a[0] - u[0] * 0.6, a[1] - u[1] * 0.6], [b[0] + u[0] * 0.6, b[1] + u[1] * 0.6], gy - 3, gy + th, 1.2, ops));
  }
  ex.add('flagExt', prism(pts, gy - 0.6, gy + 0.05));
  ex.add('roof', hipRoof(gx - td / 2, gx + td / 2, gz - tw / 2, gz + tw / 2, gy + th, gy + th + 3.2, { over: 0.6 }));
  ex.add('plaster', prism(pts, gy + 7.2, gy + 7.5), { collide: false });
  for (const s of [-1, 1]) {
    const leaf = box(0.14, 5.0, 1.8, { x: gx + td / 2 - 0.9, y: gy, z: gz + s * 1.9 });
    ex.add('door', leaf);
  }
  ctx.interact({ id: 'gate', pos: new THREE.Vector3(gx, gy + 1.6, gz), radius: 6, label: 'The great gate, the abbey’s only open entrance' });
  ctx.anchors.gate = { outside: [gx - 16, gz], inside: [gx + 8, gz] };
}
