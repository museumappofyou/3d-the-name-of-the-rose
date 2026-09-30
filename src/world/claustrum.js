import * as THREE from 'three';
import * as C from './props/cloth.js';
import * as S from './props/sculpt.js';
import { propMaterials } from '../core/propMaterials.js';
import { CLOISTER, DORMITORY, CHAPTER, ABBOT, HOSPICE, FLOWER_GARDEN, CHURCH } from '../core/plan.js';
import { Batch, wall, wallLoop, prism, vault, vaultSmooth, column, box, cyl, sphere, lathe, merge, quad, pane, gableRoof, gableEnds, hipRoof, stairFlight, place } from '../core/kit.js';
import { chapterTympanum, capitalFrieze, reliefSemicircle } from '../core/relief.js';
import * as F from './furniture.js';

// Around the cloister (D): the dormitory (F), the Abbot's house and the
// pilgrims' hospice (First Day, Prime); the chapter house (H) built on
// the ruins of the old church (Fifth Day, Prime).

const zS = CHURCH.zS;

export function buildClaustrum(M, ctx) {
  propMaterials(M);
  const ex = new Batch('claustrum-exterior');
  const inn = new Batch('claustrum-interior');
  const emit = ctx.emit, interact = ctx.interact;
  const y0 = 0.3;

  const fr = capitalFrieze();
  M.frieze = new THREE.MeshStandardMaterial({ map: fr.map, normalMap: fr.normalMap, roughness: 0.9, envMapIntensity: 0.5 });
  M.frieze.map.wrapS = M.frieze.normalMap.wrapS = THREE.RepeatWrapping;
  const ct = chapterTympanum();
  M.chapterTympanum = new THREE.MeshStandardMaterial({ map: ct.map, normalMap: ct.normalMap, color: 0xcfc6b4, roughness: 0.95, envMapIntensity: 0.35 });
  M.chapterTympanum.normalScale.set(1.1, 1.1);
  M.chapterTympanum.userData.height = ct.height;

  // ------------------------------------------------------------------
  // cloister walks and arcade
  // ------------------------------------------------------------------
  const X0 = CLOISTER.x0, X1 = CLOISTER.x1, Z0 = zS + 0.55, Z1 = CLOISTER.z1, w = CLOISTER.walk;
  const gx0 = X0 + w, gx1 = X1 - w, gz0 = Z0 + w, gz1 = Z1 - w;
  // walk floor
  inn.add('flag', prism([[X0, Z0], [X1, Z0], [X1, Z1], [X0, Z1]], y0 - 0.4, y0, { holes: [[[gx0 + 0.3, gz0 + 0.3], [gx1 - 0.3, gz0 + 0.3], [gx1 - 0.3, gz1 - 0.3], [gx0 + 0.3, gz1 - 0.3]]] }));
  // arcade on a low parapet: "we sat on the inner side of the parapet, between two columns"
  const sides = [[[gx0, gz0], [gx1, gz0]], [[gx1, gz0], [gx1, gz1]], [[gx1, gz1], [gx0, gz1]], [[gx0, gz1], [gx0, gz0]]];
  const arcH = 3.2;
  for (const [a, b] of sides) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.round(L / 1.55), s = L / n;
    const d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
    const mid = Math.floor(n / 2);
    // parapet with a gap at the middle bay for the garden path
    const parts = [[0, mid * s], [(mid + 1) * s, L]];
    for (const [u, v] of parts) ex.add('church', wall([a[0] + d[0] * u, a[1] + d[1] * u], [a[0] + d[0] * v, a[1] + d[1] * v], y0 - 0.2, y0 + 0.7, 0.55));
    // the garth lies ~0.6 m below the walk: a worn step block in the gap
    {
      const gm = (mid + 0.5) * s, nrm = [-d[1], d[0]];            // inward (toward the garth)
      const blk = box(s - 0.2, 0.62, 0.55, { y: y0 - 0.92 });
      place(blk, { x: a[0] + d[0] * gm + nrm[0] * 0.57, z: a[1] + d[1] * gm + nrm[1] * 0.57, ry: -Math.atan2(d[1], d[0]) });
      ex.add('flagExt', blk, { surface: 'stoneOut' });
    }
    // paired colonnettes
    for (let k = 0; k <= n; k++) {
      const t = k * s;
      for (const o of k === 0 || k === n ? [0] : [-0.12, 0.12]) {
        const px = a[0] + d[0] * (t + o), pz = a[1] + d[1] * (t + o);
        const base = (k === mid || k === mid + 1) ? y0 : y0 + 0.7;
        const c = column(arcH - (base - y0) - 0.4, 0.085, { seg: 8 }); c.translate(px, base, pz);
        ex.add('church', c);
      }
    }
    // arcade wall above the colonnettes with its carved band
    const ops = [];
    for (let k = 0; k < n; k++) ops.push({ t: (k + 0.5) * s, w: s - 0.42, y0: 0, y1: 0, arch: 'round' });
    ex.add('church', wall(a, b, y0 + arcH - 0.4, y0 + arcH + 1.2, 0.5, ops));
    const band = quad([a[0], y0 + arcH - 0.62, a[1]], [b[0], y0 + arcH - 0.62, b[1]], [b[0], y0 + arcH - 0.38, b[1]], [a[0], y0 + arcH - 0.38, a[1]], 0, L / 2.8, 0, 1, true);
    ex.add('frieze', band, { collide: false });
  }
  // lean-to roofs over the walks, sloping toward the garth
  const outerTop = y0 + 6.2, innerTop = y0 + arcH + 1.2;
  const roofQ = (p, q, r, t) => ex.add('roof', quad(p, q, r, t, 0, 20, 0, 5, true), { collide: false });
  roofQ([X0 - 0.3, outerTop, Z0 - 0.3], [X1 + 0.3, outerTop, Z0 - 0.3], [gx1 + 0.4, innerTop, gz0 + 0.4], [gx0 - 0.4, innerTop, gz0 + 0.4]);
  roofQ([X1 + 0.3, outerTop, Z0 - 0.3], [X1 + 0.3, outerTop, Z1 + 0.3], [gx1 + 0.4, innerTop, gz1 - 0.4], [gx1 + 0.4, innerTop, gz0 + 0.4]);
  roofQ([X1 + 0.3, outerTop, Z1 + 0.3], [X0 - 0.3, outerTop, Z1 + 0.3], [gx0 - 0.4, innerTop, gz1 - 0.4], [gx1 + 0.4, innerTop, gz1 - 0.4]);
  roofQ([X0 - 0.3, outerTop, Z1 + 0.3], [X0 - 0.3, outerTop, Z0 - 0.3], [gx0 - 0.4, innerTop, gz0 + 0.4], [gx0 - 0.4, innerTop, gz1 - 0.4]);
  // timber ceiling under the walk roofs
  for (const [a, b, c, d] of [[[X0, Z0], [X1, Z0], [gx1, gz0], [gx0, gz0]], [[X1, Z0], [X1, Z1], [gx1, gz1], [gx1, gz0]], [[X1, Z1], [X0, Z1], [gx0, gz1], [gx1, gz1]], [[X0, Z1], [X0, Z0], [gx0, gz0], [gx0, gz1]]]) {
    inn.add('beam', quad([a[0], outerTop - 0.35, a[1]], [b[0], outerTop - 0.35, b[1]], [c[0], innerTop - 0.3, c[1]], [d[0], innerTop - 0.3, d[1]], 0, 20, 0, 4, true), { collide: false });
  }
  // west outer wall of the cloister (toward the hospice), with doors
  ex.add('church', wall([X0, Z0 - 0.3], [X0, Z1 + 0.3], -0.3, outerTop, 0.7, [{ t: 5.5, w: 1.4, y0: 0, y1: 2.6, arch: 'round' }, { t: 16.5, w: 1.4, y0: 0, y1: 2.6, arch: 'round' }]));
  for (const t of [5.5, 16.5]) ctx.door({ id: `cloister:west${t}`, building: 'cloister', x: X0, z: Z0 - 0.3 + t, nx: -1, nz: 0, y: y0, w: 1.4, th: 0.7, out: 1.0 });
  // garth: grass under snow, a cross of paths, a well among trees
  ctx.plots.push({ x0: gx0 + 1, x1: gx1 - 1, z0: gz0 + 1, z1: gz1 - 1, kind: 'garth' });
  const gcx = (gx0 + gx1) / 2, gcz = (gz0 + gz1) / 2;
  F.well(ex, gcx, y0 - 0.1, gcz);
  for (const [tx, tz] of [[gx0 + 5, gz0 + 4], [gx1 - 5, gz0 + 4], [gx0 + 5, gz1 - 4], [gx1 - 5, gz1 - 4], [gcx - 9, gcz], [gcx + 9, gcz]]) ctx.trees.push({ x: tx, z: tz, kind: 'fruit', s: 0.8 });
  for (const [a, b] of [[[gx0, gcz], [gx1, gcz]], [[gcx, gz0], [gcx, gz1]]]) ctx.paths.push({ w: 1.4, pts: [a, b] });
  interact({ id: 'cloister', pos: new THREE.Vector3(gcx, 1.5, gz0 - 1.5), radius: 12, label: 'The cloister' });

  // ------------------------------------------------------------------
  // east range: calefactory below, passage to the church
  // ------------------------------------------------------------------
  const ER = { x0: X1, x1: DORMITORY.x0 + 0.4, z0: Z0 - 0.3, z1: Z1 + 0.3 };
  ex.add('rubble', wall([ER.x0, ER.z0], [ER.x0, ER.z1], -0.3, 7.6, 0.7, [{ t: 4.5, w: 1.3, y0: 0, y1: 2.5, arch: 'round' }, { t: 14, w: 1.3, y0: 0, y1: 2.5, arch: 'round' }, { t: 9.2, w: 0.7, y0: 4.6, y1: 5.9, arch: 'round' }, { t: 18.5, w: 0.7, y0: 4.6, y1: 5.9, arch: 'round' }]));
  ex.add('rubble', wall([ER.x0, ER.z1], [ER.x1, ER.z1], -0.3, 7.6, 0.7, [{ t: 3.6, w: 0.8, y0: 2.1, y1: 3.4, arch: 'round' }]));
  // the north wall stands against the church's south aisle: no door there
  ex.add('rubble', wall([ER.x0, ER.z0], [ER.x1, ER.z0], -0.3, 7.6, 0.7));
  for (const t of [4.5, 14]) ctx.door({ id: `calefactory:west${t}`, building: 'calefactory', x: ER.x0, z: ER.z0 + t, nx: -1, nz: 0, y: y0, w: 1.3, th: 0.7 });
  ex.add('roof', gableRoof(ER.x0, ER.x1, ER.z0, ER.z1, 7.6, 10.4, { axis: 'z', over: 0.5 }));
  ex.add('rubble', gableEnds(ER.x0, ER.x1, ER.z0, ER.z0, 7.6, 10.4, 'z', 0.7));
  ex.add('rubble', gableEnds(ER.x0, ER.x1, ER.z1, ER.z1, 7.6, 10.4, 'z', 0.7));
  inn.add('flag', prism([[ER.x0, ER.z0], [ER.x1, ER.z0], [ER.x1, ER.z1], [ER.x0, ER.z1]], y0 - 0.4, y0));
  inn.add('boards', prism([[ER.x0, ER.z0], [ER.x1, ER.z0], [ER.x1, ER.z1], [ER.x0, ER.z1]], 3.9, 4.1), { collide: false });
  F.fireplace(inn, (ER.x0 + ER.x1) / 2, y0, ER.z1 - 0.9, Math.PI, emit, { w: 2.4, h: 3.6 });
  for (const zz of [11.2, 20.6]) F.bench(inn, ER.x1 - 1.0, y0, zz, Math.PI / 2, 3.2);
  interact({ id: 'calefactory', pos: new THREE.Vector3((ER.x0 + ER.x1) / 2, 1.4, 15), radius: 5, label: 'The warming room' });

  // ------------------------------------------------------------------
  // Dormitory (F): upper and lower floor of separate cells
  // ------------------------------------------------------------------
  dormitory(ex, inn, M, ctx, y0);

  // ------------------------------------------------------------------
  // Chapter house (H) on the old church
  // ------------------------------------------------------------------
  chapterHouse(ex, inn, M, ctx, y0);
  abbotHouse(ex, inn, M, ctx, y0);
  hospice(ex, inn, M, ctx, y0);
  flowerGarden(ex, M, ctx, y0);

  return { batches: [ex, inn] };
}

function dormitory(ex, inn, M, ctx, y0) {
  const D = DORMITORY;
  const x0 = D.x0, x1 = D.x1, z0 = D.z0, z1 = D.z0 + 34.0;
  const h1 = 4.2, h2 = 8.2;
  const nCells = 10, cellD = (z1 - z0 - 3) / nCells;
  // outer walls with cell windows on both floors
  const side = x => {
    const ops = [];
    for (let i = 0; i < nCells; i++) {
      const t = 3 + (i + 0.5) * cellD;
      ops.push({ t, w: 0.55, y0: 2.0, y1: 3.0, arch: 'round' }, { t, w: 0.55, y0: h1 + 2.0, y1: h1 + 3.0, arch: 'round' });
    }
    ex.add('rubble', wall([x, z0], [x, z1], -0.3, h2, 0.7, ops.map(o => ({ ...o, y0: o.y0 + 0.3, y1: o.y1 + 0.3 }))));
    for (const o of ops) ex.add('glassOpaque', pane([x, z0], [x, z1], o.t, o.w, o.y0, o.y1, 'round', 0), { collide: false, shadow: false });
  };
  side(x0); side(x1);
  ex.add('rubble', wall([x0 - 0.35, z0], [x1 + 0.35, z0], -0.3, h2, 0.7, [{ t: 6.3, w: 1.3, y0: 0, y1: 2.5, arch: 'round' }]));
  ex.add('rubble', wall([x0 - 0.35, z1], [x1 + 0.35, z1], -0.3, h2, 0.7, [{ t: 6.3, w: 1.3, y0: 0, y1: 2.5, arch: 'round' }, { t: 3.0, w: 1.3, y0: 0, y1: 2.5, arch: 'round' }]));
  ctx.door({ id: 'dormitory:north', building: 'dormitory', x: x0 - 0.35 + 6.3, z: z0, nx: 0, nz: -1, y: y0, w: 1.3, th: 0.7 });
  ctx.door({ id: 'dormitory:south', building: 'dormitory', x: x0 - 0.35 + 6.3, z: z1, nx: 0, nz: 1, y: y0, w: 1.3, th: 0.7 });
  ex.add('roof', gableRoof(x0, x1, z0, z1, h2, h2 + 4.4, { axis: 'z', over: 0.6 }));
  for (const z of [z0, z1]) ex.add('rubble', gableEnds(x0, x1, z, z, h2, h2 + 4.4, 'z', 0.7));
  // floors
  const poly = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  inn.add('flag', prism(poly, y0 - 0.4, y0));
  // the stair between the floors climbs westward along the north wall of the
  // stair hall (z0 … z0+3, ahead of the cells) so both floors are reached
  // from their corridors (c0880, c0881–c0885 k1970/k1971 M)
  const sw = 1.2, sz0 = z0 + 0.36, szc = sz0 + sw / 2, sxB = x1 - 0.5, sxT = x0 - 0.35 + 6.3 + 1.3;
  const stairHole = [[sxT - 0.1, sz0], [x1 - 0.36, sz0], [x1 - 0.36, sz0 + sw + 0.1], [sxT - 0.1, sz0 + sw + 0.1]];
  inn.add('boards', prism(poly, h1, h1 + 0.3, { holes: [stairHole] }));
  inn.add('beam', prism(poly, h2 - 0.15, h2), { collide: false });
  const st = stairFlight([sxB, szc], [sxT, szc], y0, h1 + 0.3, sw);
  inn.add('woodDark', st.geo, { collide: false }); inn.collider(st.ramp, 'wood');
  // a rail along the open side of the stairwell upstairs
  inn.add('woodDark', box(sxB - sxT, 0.08, 0.08, { x: (sxB + sxT) / 2, y: h1 + 1.2, z: sz0 + sw + 0.14 }), { collide: false });
  inn.collider(box(sxB - sxT - 0.4, 1.0, 0.1, { x: (sxB + sxT) / 2 + 0.2, y: h1 + 0.3, z: sz0 + sw + 0.14 }), 'wood');
  // central corridor and cells on each floor
  const cx = (x0 + x1) / 2, cw = 1.8;
  const BERENGAR = 4;
  const bits = { woodDark: [], pottery: [], 'p.woolBlack': [] };
  woolBlack(M);
  for (const [fy, fh] of [[y0, h1 - y0], [h1 + 0.3, h2 - h1 - 0.45]]) {
    for (const s of [-1, 1]) {
      const xw = cx + s * cw / 2;
      const ops = [];
      // one door per cell, just past the cell's middle (clear of the stool)
      for (let i = 0; i < nCells; i++) ops.push({ t: (i + 0.5) * cellD + 0.25, w: 0.9, y0: 0, y1: 1.95, arch: 'flat' });
      inn.add('plaster', wall([xw, z0 + 3], [xw, z1 - 0.35], fy, fy + fh, 0.2, ops));
      // the cells are closed by plank doors (some shut, some ajar) or by a
      // woollen curtain; Jorge's, by the stair, stands open
      for (let i = 0; i < nCells; i++) {
        const zc = z0 + 3 + (i + 0.5) * cellD + 0.25;
        // Berengar's cell, searched (c1291), stands open; Benno watched from the
        // door of his cell, not far off, held ajar (c0879); the upper cell the
        // R30a route walks into is open too
        const up = fy > 1 && s < 0 ? { 2: 1, [BERENGAR]: 1, [BERENGAR + 1]: 3 }[i] : undefined;
        const k = up ?? (i + (s > 0 ? 1 : 0) + (fy > 1 ? 2 : 0)) % 4;
        if (i === 0 && s < 0 && fy < 1) continue;
        if (k === 0) {
          // shut: a leaf of three boards with two iron straps, flush in the reveal
          inn.add('door', box(0.05, 1.93, 0.88, { x: xw + s * 0.06, y: fy, z: zc }));
          inn.add('iron', merge([0.45, 1.5].map(h => box(0.012, 0.05, 0.7, { x: xw + s * 0.09, y: fy + h, z: zc - 0.06 }))), { collide: false });
        } else if (k === 1 || k === 3) {
          // ajar, swung into the cell on its hinge at the far jamb
          const ang = k === 1 ? 1.15 : 0.55, hz = zc + 0.44;
          const leaf = box(0.05, 1.93, 0.88, { z: -0.44 }); leaf.rotateY(-s * ang); leaf.translate(xw + s * 0.12, fy, hz);
          inn.add('door', leaf, { collide: false });
        } else {
          // a curtain hung on a rod across the doorway
          const cg = C.curtain(0.95, 1.9, { seed: 700 + i * 3 + (s > 0 ? 1 : 0), depth: 0.05, gather: 0.8 }); cg.rotateY(Math.PI / 2); cg.translate(xw - s * 0.14, fy + 0.02, zc);
          inn.add('p.curtain', cg, { collide: false });
          inn.add('beam', place(C.pole(1.05, 0.015), { x: xw - s * 0.14, y: fy + 1.95, z: zc, ry: Math.PI / 2 }), { collide: false });
        }
      }
      for (let i = 0; i <= nCells; i++) {
        const zz = z0 + 3 + i * cellD;
        const xa = s < 0 ? x0 + 0.35 : xw, xb = s < 0 ? xw : x1 - 0.35;
        inn.add('plaster', wall([xa, zz], [xb, zz], fy, fy + fh, 0.18));
      }
      for (let i = 0; i < nCells; i++) {
        const zz = z0 + 3 + (i + 0.5) * cellD;
        const bx = s < 0 ? x0 + 0.9 : x1 - 0.9;
        const berengar = fy > 1 && s < 0 && i === BERENGAR;
        if (berengar) berengarsBed(inn, bx, fy, zz + 0.2);
        else F.bed(inn, bx, fy, zz + 0.2, 0, 'straw');
        cellThings(bits, s, i, fy, zz, x0, x1, xw, cellD);
        F.crucifix(inn, s < 0 ? x0 + 0.37 : x1 - 0.37, fy + 1.6, zz, s < 0 ? Math.PI / 2 : -Math.PI / 2, 0.5);
        if (i % 2 === 0) F.stool(inn, s < 0 ? xw - 0.7 : xw + 0.7, fy, zz - 0.6);
        // a monk's few things: a pitcher by the bed, a chest in some cells
        F.vesselsOn(inn, s < 0 ? x0 + 1.55 : x1 - 1.55, fy, zz - 0.95, 0, 0.2, 40 + i * 3 + (s > 0 ? 1 : 0), { density: 1 });
        if (i % 3 === 1) F.chest(inn, s < 0 ? xw - 0.55 : xw + 0.55, fy, zz + 0.9, Math.PI / 2, 0.8);
      }
    }
  }
  for (const [k, list] of Object.entries(bits)) if (list.length) inn.add(k, merge(list), { collide: false, shadow: k !== 'pottery' });
  // RECON (the Rule, ch. 22): a lamp burns in the dormitory until morning —
  // clay lamps hung from the corridor ceilings on both floors
  for (const [fy, top] of [[y0, h1], [h1 + 0.3, h2 - 0.15]])
    for (const t of [1.5, 5.5, 9.0]) F.oilLamp(inn, cx, top - 0.75, z0 + 3 + t * cellD, ctx.emit, 0.75);
  interact_(ctx, 'dormitory', [cx, 1.4, z0 + 12], 6, 'The dormitory: a cell for each monk');
  interact_(ctx, 'berengar-cell', [cx - 1.6, h1 + 1.4, z0 + 3 + (BERENGAR + 0.5) * cellD], 2.0, 'Berengar’s cell: under the straw mattress they found a white cloth stained with blood');
  interact_(ctx, 'jorge-cell', [cx - 1.4, 1.4, z0 + 3 + cellD * 0.5], 1.8, 'A cell off the lower corridor — Jorge’s');
  // the night passage to the church and the latrines to the south
  const px0 = CHURCH.xChoir + 3.6, px1 = CHURCH.xApse - 0.4;
  ex.add('rubble', wall([px0, zS], [px0, z0], -0.3, 4.2, 0.6));
  // R10 (c0886–c0888 k1972 M, k0667 H): Adelmo "left the dormitory, went round
  // the apse and entered the choir by the north door". RECON: the dormitory's way
  // out is this passage, whose east door opens beside the apse.
  const pdz = (zS + z0 - 0.35) / 2;
  ex.add('rubble', wall([px1, zS], [px1, z0], -0.3, 4.2, 0.6, [{ t: pdz - zS, w: 1.0, y0: 0, y1: 2.6, arch: 'round' }]));
  ctx.door({ id: 'dormitory:passage-east', building: 'dormitory', x: px1, z: pdz, nx: 1, nz: 0, y: y0, w: 1.0, th: 0.6 });
  // a paved apron outside that door, in the angle of the apse and the
  // dormitory gable (it also closes the gap the church's rectangular footing
  // sink leaves in the terrain there)
  ex.add('flagExt', prism([[px1 + 0.2, -2.4], [px1 + 5.4, -2.4], [px1 + 5.4, zS + 0.05], [px1 + 0.2, zS + 0.05]], -0.7, -0.1), { surface: 'stoneOut' });
  ex.add('roof', gableRoof(px0, px1, zS, z0, 4.2, 5.4, { axis: 'z', over: 0.3 }));
  inn.add('flag', prism([[px0, zS], [px1, zS], [px1, z0], [px0, z0]], y0 - 0.4, y0));
  const L0 = z1 + 1.0, L1 = L0 + 5.5;
  // the latrine's north doorway lines up with the dormitory south door (43.33)
  // so the covered latrine is reached straight from the dormitory (c0510 k1572 M)
  ex.add('rubble', wallLoop([[x0 + 1, L0], [x1 - 1, L0], [x1 - 1, L1], [x0 + 1, L1]], -0.3, 3.8, 0.6, { 0: [{ t: (x0 - 0.35 + 6.3) - (x0 + 1), w: 1.4, y0: 0, y1: 2.2, arch: 'flat' }] }));
  ex.add('roof', gableRoof(x0 + 1, x1 - 1, L0, L1, 3.8, 5.6, { over: 0.4 }));
  ex.add('rubble', gableEnds(x0 + 1, x0 + 1, L0, L1, 3.8, 5.6, 'x', 0.6));
  ex.add('rubble', gableEnds(x1 - 1, x1 - 1, L0, L1, 3.8, 5.6, 'x', 0.6));
  ex.add('rubble', box(1.2, 3.4, 5.5, { x: x0 + 3.4, y: -0.3, z: (z1 + L0) / 2 + 0.2 }), { collide: false });
  inn.add('woodDark', box(x1 - x0 - 3, 0.5, 0.9, { x: cx, y: y0, z: L1 - 0.9 }));
  ctx.sink(poly, -2.5, 1.0);
  ctx.anchors.dormitory = [cx, z0 + 12];
}

function chapterHouse(ex, inn, M, ctx, y0) {
  const H = CHAPTER, x0 = H.x0, xn = H.narthex, x1 = H.x1, z0 = H.z0, z1 = H.z1, zc = (z0 + z1) / 2;
  const hH = 7.4;
  // outer door: "new style, pointed arch, no decoration, a coloured window above"
  ex.add('church', wall([x0, z0], [x0, z1], -0.3, 6.2, 0.9, [{ t: (z1 - z0) / 2, w: 1.9, y0: 0, y1: 3.0, arch: 'pointed' }, { t: (z1 - z0) / 2, w: 0.9, y0: 5.1 - 0.9, y1: 5.3, arch: 'round' }]));
  ex.add('stainedWarm', pane([x0, z0], [x0, z1], (z1 - z0) / 2, 0.9, 4.2 - 0.3, 5.0, 'round', 0), { collide: false, shadow: false });
  ctx.door({ id: 'chapter:outer', building: 'chapter', x: x0, z: zc, nx: -1, nz: 0, y: y0, w: 1.9, th: 0.9 });
  ctx.door({ id: 'chapter:old-portal', building: 'chapter', x: xn, z: zc, nx: -1, nz: 0, y: y0, w: 3.2, th: 1.2 });
  // the courtyard on the ruins of the old narthex: broken walls, open sky
  for (const z of [z0, z1]) {
    ex.add('rubble', wall([x0, z], [xn, z], -0.3, 3.6, 0.8));
    ex.add('rubble', box(1.6, 1.4, 0.8, { x: x0 + 3.2, y: 3.6, z }), { collide: false });
    ex.add('rubble', box(1.1, 0.8, 0.8, { x: x0 + 6.0, y: 3.6, z }), { collide: false });
  }
  ex.add('flagExt', prism([[x0, z0], [xn, z0], [xn, z1], [x0, z1]], y0 - 0.4, y0 - 0.05));
  // the way worn across the courtyard from the outer door to the old portal
  ctx.paths.push({ w: 1.5, pts: [[x0 - 1.2, zc], [(x0 + xn) / 2, zc + 0.25], [xn + 1.0, zc]] });
  for (const zz of [z0 + 2.2, z1 - 2.2]) ex.add('rubble', cyl(0.35, 0.4, 1.1, 10, { x: (x0 + xn) / 2, y: y0, z: zz }));
  // the old portal: "old style, carved with extraordinary beauty, with a
  // semicircular tympanum" — Christ between the twelve apostles
  const opW = 3.2;
  ex.add('church', wall([xn, z0], [xn, z1], -0.3, hH + 1.2, 1.2, [{ t: (z1 - z0) / 2, w: opW + 2.2, y0: 0, y1: 2.7, arch: 'round' }]));
  {
    const R = (opW + 1.8) / 2;
    // carved in the round: the relief stands out of the tympanum by up to
    // 9 cm, worn and barely coloured after two centuries of weather
    const g = reliefSemicircle(R, M.chapterTympanum.userData.height, 0.16, 300, 150);
    g.rotateY(-Math.PI / 2); g.translate(xn - 0.05, 2.9, zc);
    ex.add('chapterTympanum', g, { collide: false });
    ex.add('church', box(0.5, 0.25, 2 * R + 0.3, { x: xn, y: 2.65, z: zc }));
    for (const s of [-1, 1]) {
      const c = column(2.6 - y0, 0.16); c.translate(xn - 0.5, y0, zc + s * (R + 0.2)); ex.add('church', c);
      // F15: the leaves stand hinged wide open against the reveal (k0532 H, k2067/k2068 M)
      const lf = box(opW / 2 - 0.05, 2.35, 0.1, { x: (opW / 2 - 0.05) / 2 }); lf.rotateY(-s * 1.35); lf.translate(xn + 0.55, y0, zc + s * (opW / 2 + 0.05));
      ex.add('door', lf, { collide: false });
    }
    for (let k = 0; k < 3; k++) {
      const tor = new THREE.TorusGeometry(R + 0.15 + k * 0.28, 0.12, 8, 28, Math.PI);
      tor.rotateY(Math.PI / 2); tor.translate(xn - 0.62 + k * 0.1, 2.9, zc);
      ex.add('church', tor, { collide: false });
    }
  }
  interact_(ctx, 'chapter-portal', [xn - 2, 2.2, zc], 4, 'The old portal: Christ, the twelve apostles, the peoples of the world');
  // the hall
  const wins = [];
  for (let i = 0; i < 4; i++) wins.push({ t: 3 + i * 5.5, w: 1.0, y0: 3.2, y1: 5.3, arch: 'pointed' });
  // F16: one low slit so the novices can peer in on the proceedings
  // (c2281 k1784 M, k0867 H "windows and cracks")
  const lowSlit = { t: 8.0, w: 0.28, y0: 1.3, y1: 2.1, arch: 'flat' };
  ex.add('church', wall([xn, z0], [x1, z0], -0.3, hH, 1.0, [...wins, lowSlit]));
  ex.add('church', wall([xn, z1], [x1, z1], -0.3, hH, 1.0, wins));
  ex.add('church', wall([x1, z0 - 0.5], [x1, z1 + 0.5], -0.3, hH, 1.0));
  for (const z of [z0, z1]) for (const o of wins) ex.add('stainedWarm', pane([xn, z], [x1, z], o.t, o.w, o.y0 - 0.3, o.y1 - 0.3, 'pointed', 0), { collide: false, shadow: false });
  ex.add('roof', gableRoof(xn, x1, z0, z1, hH, hH + 3.6, { over: 0.5 }));
  ex.add('church', gableEnds(xn, xn, z0, z1, hH, hH + 3.6, 'x', 1.0));
  inn.add('ashlar', prism([[xn, z0], [x1, z0], [x1, z1], [xn, z1]], y0 - 0.4, y0));
  // rib vaults on two columns
  const bays = 4, bw = (x1 - xn) / bays;
  for (let i = 0; i < bays; i++) inn.add('plaster', vaultSmooth([[xn + i * bw, z0 + 0.5], [xn + (i + 1) * bw, z0 + 0.5], [xn + (i + 1) * bw, z1 - 0.5], [xn + i * bw, z1 - 0.5]], 4.6, 2.2, { archRise: 2.0 }), { collide: false });
  for (let i = 1; i < bays; i++) for (const z of [z0 + 0.6, z1 - 0.6]) inn.add('churchIn', box(0.6, 4.6, 0.6, { x: xn + i * bw, y: y0, z }));
  // benches in a semicircle facing each other; the great walnut table at the head
  const tcx = x1 - 3.0;
  F.table(inn, tcx, y0, zc, Math.PI / 2, 4.2, 1.2, 0.8, 'woodDark');
  for (const s of [-1, 1]) F.chair(inn, tcx + 1.0, y0, zc + s * 0.9, -Math.PI / 2);
  for (let r = 0; r < 2; r++) for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i + 0.5) / 7 * Math.PI;
    const R = 5.2 + r * 1.2;
    const bx = tcx - 2.2 - Math.cos(a) * R * 1.35, bz = zc + Math.sin(a) * R * 0.78;
    F.bench(inn, bx, y0, bz, -a, 2.2);
  }
  F.candlestick(inn, tcx, y0 + 0.8, zc - 1.6, 0.4, ctx.emit);
  interact_(ctx, 'chapter-house', [xn + 8, 1.5, zc], 6, 'The chapter house');
  ctx.sink([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], -2.5, 1.0);
  // F13: the chapter house "and its garden" (c0542 k0051 H) — a small walled
  // herb plot along the south lane, seen on the right walking west
  {
    const gx0 = xn + 1, gx1 = x1 - 1, gz0 = z1 + 1.5, gz1 = z1 + 8.5;
    const gcx = (gx0 + gx1) / 2, gcz = (gz0 + gz1) / 2;
    let hs = 0; const hedge = (a, b) => ex.add('hedge', S.hedgeRun(a, b, y0 - 0.12, 0.6, 0.45, { seed: 350 + hs++ }), { collide: false });
    for (const [a, b] of [[[gx0, gz0], [gx1, gz0]], [[gx1, gz0], [gx1, gz1]], [[gx1, gz1], [gx0, gz1]], [[gx0, gz1], [gx0, gz0]]]) hedge(a, b);
    hedge([gcx, gz0 + 0.5], [gcx, gz1 - 0.5]);
    ctx.plots.push({ x0: gx0 + 0.4, x1: gx1 - 0.4, z0: gz0 + 0.4, z1: gz1 - 0.4, kind: 'flowers' });
    for (const [dx, dz] of [[-4, 0], [4, 0]]) ctx.trees.push({ x: gcx + dx, z: gcz + dz, kind: 'fruit', s: 0.6 });
    F.well(ex, gcx, y0 - 0.1, gz0 + 1.2);
    interact_(ctx, 'chapter-garden', [gcx, 1.3, gcz], 5, 'The chapter house garden');
  }
  ctx.anchors.chapter = [xn - 3, zc];
}

function abbotHouse(ex, inn, M, ctx, y0) {
  const A = ABBOT, x0 = A.x0, x1 = A.x1, z0 = A.z0, z1 = A.z1;
  // F2: the upper hall is raised ~2 m so the Aedificium shows over the church
  // roof from its north windows (c2506/c2508 k1732/k1733 M, k0024 H)
  const h1 = 6.2, h2 = 10.8;
  const opsN = [{ t: 4.0, w: 0.8, y0: 2.4, y1: 3.4, arch: 'round' }, { t: 9.2, w: 1.3, y0: h1 + 1.4, y1: h1 + 3.3, arch: 'round' }, { t: 13.5, w: 1.3, y0: h1 + 1.4, y1: h1 + 3.3, arch: 'round' }];
  ex.add('church', wall([x0, z0], [x1, z0], -0.3, h2, 0.9, opsN));
  ex.add('church', wall([x0, z1], [x1, z1], -0.3, h2, 0.9, [{ t: 12, w: 1.4, y0: 0, y1: 2.7, arch: 'round' }, { t: 6, w: 0.8, y0: h1 + 1.6, y1: h1 + 3.0, arch: 'round' }]));
  ctx.door({ id: 'abbot:south', building: 'abbot', x: x0 + 12, z: z1, nx: 0, nz: 1, y: y0, w: 1.4, th: 0.9 });
  ex.add('church', wall([x0, z0 - 0.45], [x0, z1 + 0.45], -0.3, h2, 0.9));
  ex.add('church', wall([x1, z0 - 0.45], [x1, z1 + 0.45], -0.3, h2, 0.9, [{ t: 5.2, w: 0.7, y0: 2.3, y1: 3.4, arch: 'round' }]));
  for (const o of opsN) ex.add('glassOpaque', pane([x0, z0], [x1, z0], o.t, o.w, o.y0 - 0.3, o.y1 - 0.3, 'round', 0), { collide: false, shadow: false });
  ex.add('roof', hipRoof(x0, x1, z0, z1, h2, h2 + 3.2, { over: 0.6 }));
  const poly = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  inn.add('ashlar', prism(poly, y0 - 0.4, y0));
  const hole = [[x1 - 2.1, z1 - 8.4], [x1 - 0.5, z1 - 8.4], [x1 - 0.5, z1 - 0.8], [x1 - 2.1, z1 - 0.8]];
  inn.add('boards', prism(poly, h1, h1 + 0.3, { holes: [hole] }));
  inn.add('beam', prism(poly, h2 - 0.2, h2), { collide: false });
  const st = stairFlight([x1 - 1.3, z1 - 0.9], [x1 - 1.3, z1 - 8.3], y0, h1 + 0.3, 1.4);
  inn.add('woodDark', st.geo, { collide: false }); inn.collider(st.ramp, 'wood');
  // F15/R24: the stair comes up into a small lobby; the hall door beside the
  // stairhead stands ajar, and Adso hides behind it (c2513/c2514 k1856 M, k0591 H)
  {
    const xp = x1 - 2.55, dzc = z0 + 1.22, dw = 1.1;
    inn.add('plaster', wall([xp, z0 + 0.45], [xp, z1 - 0.45], h1 + 0.3, h2 - 0.2, 0.2, [{ t: dzc - z0 - 0.45, w: dw, y0: 0, y1: 2.2, arch: 'flat' }]));
    // hinged on the north jamb, swung ~75° into the lobby, clear of the stairhead
    const lf = box(dw - 0.06, 2.15, 0.07, { x: (dw - 0.06) / 2 }); lf.rotateY(-0.26);
    lf.translate(xp + 0.12, h1 + 0.3, dzc - dw / 2 + 0.03);
    inn.add('door', lf, { collide: false });
  }
  // the chapel below the Abbot's rooms
  inn.add('plaster', wall([x0 + 8.0, z0], [x0 + 8.0, z1], y0, h1, 0.4, [{ t: 6.5, w: 1.2, y0: 0, y1: 2.3, arch: 'round' }]));
  inn.add('churchIn', box(1.4, 1.0, 0.7, { x: x0 + 1.2, y: y0, z: (z0 + z1) / 2, ry: Math.PI / 2 }));
  F.candle(inn, x0 + 1.2, y0 + 1.0, (z0 + z1) / 2 - 0.45, 0.22, ctx.emit); F.candle(inn, x0 + 1.2, y0 + 1.0, (z0 + z1) / 2 + 0.45, 0.22);
  F.crucifix(inn, x0 + 0.6, y0 + 1.1, (z0 + z1) / 2, Math.PI / 2, 0.8);
  for (let i = 0; i < 3; i++) F.bench(inn, x0 + 3.5 + i * 1.4, y0, (z0 + z1) / 2, Math.PI / 2, 3.0);
  // the great hall above: "from its window, over the church roof, the
  // outline of the Aedificium"
  const hx = (x0 + x1) / 2;
  F.table(inn, hx, h1 + 0.3, (z0 + z1) / 2 + 0.5, 0, 3.4, 1.2, 0.8, 'woodDark');
  F.chair(inn, hx, h1 + 0.3, (z0 + z1) / 2 + 1.5, Math.PI);
  F.chest(inn, x0 + 1.4, h1 + 0.3, z1 - 1.0, 0);
  F.fireplace(inn, x0 + 0.7, h1 + 0.3, (z0 + z1) / 2, Math.PI / 2, null, { w: 2.2, h: 3.4 });
  F.candlestick(inn, hx + 1.2, h1 + 1.1, (z0 + z1) / 2 + 0.5, 0.35, ctx.emit);
  inn.add('redCloth', box(3.0, 0.02, 2.2, { x: hx, y: h1 + 0.31, z: (z0 + z1) / 2 + 0.4 }), { collide: false });
  interact_(ctx, 'abbot-hall', [hx, h1 + 1.6, z0 + 1.5], 3.2, 'The Abbot’s hall: the Aedificium over the church roof');
  interact_(ctx, 'abbot-chapel', [x0 + 3, 1.4, (z0 + z1) / 2], 3, 'The Abbot’s chapel');
  ctx.sink(poly, -2.5, 1.0);
  ctx.anchors.abbot = { door: [x0 + 12, z1 + 1.5], hall: [hx, (z0 + z1) / 2 - 1.2, h1 + 0.3] };
}

// a monk's cell holds little more than the bed: "a lamp is indispensable
// in the cells" (c1499/c1519), so a clay lamp stands on a shelf by the bed
// head, unlit by day; in every other cell the day cowl hangs from a peg by
// the door. Geometry is collected and merged per material.
function cellThings(bits, s, i, fy, zz, x0, x1, xw, cellD) {
  const inX = s < 0 ? 1 : -1, wx = s < 0 ? x0 + 0.35 : x1 - 0.35;
  const zN = zz - cellD / 2 + 0.09, zS = zz + cellD / 2 - 0.09;
  const sx = wx + inX * 1.6;
  bits.woodDark.push(box(0.5, 0.035, 0.2, { x: sx, y: fy + 1.42, z: zN + 0.1 }),
    box(0.03, 0.14, 0.14, { x: sx - 0.18, y: fy + 1.28, z: zN + 0.07 }), box(0.03, 0.14, 0.14, { x: sx + 0.18, y: fy + 1.28, z: zN + 0.07 }));
  bits.pottery.push(lathe([[0, 0], [0.06, 0.008], [0.075, 0.03], [0.028, 0.05], [0, 0.05]], 10, { x: sx - 0.08, y: fy + 1.455, z: zN + 0.1 }));
  if ((i + (s > 0 ? 1 : 0)) % 2 === 0) {
    const px = xw - inX * 1.05;
    bits.woodDark.push(box(0.03, 0.03, 0.12, { x: px, y: fy + 1.72, z: zS - 0.06 }));
    const g = C.hanging(0.52, 1.05, { seed: 800 + i * 7 + (s > 0 ? 3 : 0) + Math.round(fy), depth: 0.04 });
    g.rotateY(Math.PI); g.translate(px, fy + 1.74, zS - 0.1);
    bits['p.woolBlack'].push(g);
  }
}
// Berengar's bed after the search (Fourth Day, c1291–c1292): "under the straw
// mattress a monk found a white cloth stained with blood". The mattress is
// pulled half off the frame, the blanket thrown down, the cloth on the slats.
function berengarsBed(b, x, y, z) {
  const frame = merge([
    ...[[-0.43, -0.96, 0.78], [0.43, -0.96, 0.78], [-0.43, 0.96, 0.52], [0.43, 0.96, 0.52]].map(([px, pz, h]) => box(0.07, h, 0.07, { x: px, z: pz })),
    box(0.06, 0.14, 1.86, { x: -0.43, y: 0.2 }), box(0.06, 0.14, 1.86, { x: 0.43, y: 0.2 }),
    box(0.8, 0.3, 0.035, { y: 0.34, z: -0.96 }), box(0.8, 0.1, 0.035, { y: 0.26, z: 0.96 }),
    ...[-0.6, -0.2, 0.2, 0.6].map(sz => box(0.84, 0.025, 0.1, { y: 0.28, z: sz })),
  ]);
  b.add('woodDark', frame.translate(x, y, z));
  const m = C.mattress(0.8, 1.86, 0.15, { seed: 91 });
  m.rotateZ(-0.42); m.translate(x + 0.72, y + 0.2, z + 0.1);
  b.add('p.sacking', m, { collide: false });
  b.add('p.blanket', place(C.heap(0.9, 0.7, 0.13, { seed: 93 }), { x: x + 1.5, y, z: z + 0.9, ry: 0.4 }), { collide: false });
  const cloth = C.drape(0.4, 0.3, 0, { hang: 0.015, seed: 95, rumple: 1.6, foot: false, floor: -0.01 });
  b.add('p.linenWhite', place(cloth, { x: x - 0.08, y: y + 0.305, z: z - 0.2, ry: 0.5 }), { collide: false, shadow: false });
  b.add('p.bloodStain', place(S.mound(0.25, 0.17, 0.002, { seed: 97 }), { x: x - 0.1, y: y + 0.319, z: z - 0.18, ry: 1.1 }), { collide: false, shadow: false });
}
// the black wool of a Benedictine habit
function woolBlack(M) {
  M.p.bloodStain ||= new THREE.MeshStandardMaterial({ color: 0x5c1a12, roughness: 0.8, envMapIntensity: 0.2, polygonOffset: true, polygonOffsetFactor: -2 });
  return (M.p.woolBlack ||= new THREE.MeshStandardMaterial({ map: M.p.blanketGrey.map, color: 0x4a4540, roughness: 1, envMapIntensity: 0.2, side: THREE.DoubleSide }));
}

function hospice(ex, inn, M, ctx, y0) {
  const H = HOSPICE, x0 = H.x0, x1 = H.x1, z0 = H.z0, z1 = H.z1;
  // F2: the guest floor is raised ~2 m so the Aedificium rises "like a crown
  // above the church" from William's east cell window (c0187/c0188 k0970 H,
  // k1745 M, k1351 H). The outside steps are lengthened to stay walkable.
  const h1 = 5.9, h2 = 9.6;
  const cells = 4, cd = (z1 - z0) / cells;
  const east = [], west = [];
  for (let i = 0; i < cells; i++) {
    const t = (i + 0.5) * cd;
    // William's cell (i=2) gets a broad, tall east window so the Aedificium
    // shows "like a crown above the church" (c0187/c0188 k0970 H, k1745 M)
    const ew = i === 2 ? 1.4 : 0.8, etop = i === 2 ? h1 + 3.0 : h1 + 2.6;
    east.push({ t, w: ew, y0: h1 + 1.2, y1: etop, arch: 'round' }, { t, w: 0.6, y0: 2.0, y1: 3.0, arch: 'round' });
    west.push({ t: t + 1.2, w: 0.6, y0: h1 + 1.5, y1: h1 + 2.5, arch: 'round' });
  }
  // the upper doorway sits clear of the cell partition at z0 + 2·cd so one steps
  // straight into William's cell (c0142–c0144 k0760/k0761 H, c2698 k0140 H)
  const sz = z0 + cd * 2 + 0.65;
  west.push({ t: 2.4, w: 1.2, y0: 0, y1: 2.3, arch: 'round' }, { t: sz - z0, w: 1.1, y0: h1 + 0.3, y1: h1 + 2.6, arch: 'round' });
  ex.add('rubble', wall([x1, z0], [x1, z1], -0.3, h2, 0.7, east));
  ex.add('rubble', wall([x0, z0], [x0, z1], -0.3, h2, 0.7, west));
  ctx.door({ id: 'hospice:west', building: 'hospice', x: x0, z: z0 + 2.4, nx: -1, nz: 0, y: y0, w: 1.2, th: 0.7 });
  // the guest-floor door off the landing of the outside steps (k1635/k1636 M)
  ctx.door({ id: 'hospice:upper', building: 'hospice', x: x0, z: sz, nx: -1, nz: 0, y: h1 + 0.3, w: 1.1, th: 0.7, out: 0.45, noSteps: true });
  ex.add('rubble', wall([x0 - 0.35, z0], [x1 + 0.35, z0], -0.3, h2, 0.7));
  ex.add('rubble', wall([x0 - 0.35, z1], [x1 + 0.35, z1], -0.3, h2, 0.7));
  for (const o of east) ex.add('glassOpaque', pane([x1, z0], [x1, z1], o.t, o.w, o.y0 - 0.3, o.y1 - 0.3, 'round', 0), { collide: false, shadow: false });
  ex.add('roof', gableRoof(x0, x1, z0, z1, h2, h2 + 3.0, { axis: 'z', over: 0.5 }));
  for (const z of [z0, z1]) ex.add('rubble', gableEnds(x0, x1, z, z, h2, h2 + 3.0, 'z', 0.7));
  const poly = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  inn.add('flag', prism(poly, y0 - 0.4, y0));
  inn.add('boards', prism(poly, h1, h1 + 0.3));
  inn.add('beam', prism(poly, h2 - 0.2, h2), { collide: false });
  // outside steps up the west side to the guest floor ("climbing the steps of
  // the pilgrims' hospice", c2312/c2313 k1635/k1636 M). The flight starts at
  // the trodden ground of the flower garden (≈ −0.2 after the footing sink) so
  // its first tread is a normal step, and ends on a landing level with the floor.
  const yFoot = -0.25, run = 9.0;
  const st = stairFlight([x0 - 1.0, sz + 0.65 + run], [x0 - 1.0, sz + 0.65], yFoot, h1 + 0.3, 1.3);
  ex.add('rubble', st.geo, { collide: false }); ex.collider(st.ramp, 'stoneOut');
  ex.add('rubble', box(1.4, h1 + 0.5, 1.4, { x: x0 - 1.0, y: -0.2, z: sz }));
  // a stepped parapet along the open side of the flight, and round the landing
  {
    const n = Math.max(2, Math.round((h1 + 0.3 - yFoot) / 0.19)), rise = (h1 + 0.3 - yFoot) / n, rl = run / n;
    const parts = [];
    for (let i = 0; i < n; i++) parts.push(box(rl + 0.02, rise * (i + 1) + 0.85, 0.22, { x: rl * (i + 0.5), y: yFoot - 0.1, z: 0 }));
    const g = merge(parts); place(g, { x: x0 - 1.76, z: sz + 0.65 + run, ry: Math.PI / 2 });
    ex.add('rubble', g);
    ex.add('rubble', box(0.22, 0.9, 1.4, { x: x0 - 1.76, y: h1 + 0.3, z: sz }));
    ex.add('rubble', box(1.4, 0.9, 0.22, { x: x0 - 1.0, y: h1 + 0.3, z: sz - 0.59 }));
  }
  // guest cells on the upper floor
  for (let i = 1; i < cells; i++) inn.add('plaster', wall([x0 + 0.35, z0 + i * cd], [x1 - 0.35, z0 + i * cd], h1 + 0.3, h2 - 0.2, 0.2, [{ t: 1.2, w: 0.9, y0: 0, y1: 2.0, arch: 'flat' }]));
  for (let i = 0; i < cells; i++) {
    const zz = z0 + (i + 0.5) * cd;
    F.bed(inn, x1 - 1.0, h1 + 0.3, zz, Math.PI / 2 * 0);
    F.crucifix(inn, x0 + 0.37, h1 + 1.9, zz, Math.PI / 2, 0.45);
  }
  // William's cell: a long, wide niche in the wall filled with fresh
  // straw for Adso; wine, cheese, olives, bread and raisins on the table
  const wz = z0 + 2.5 * cd;
  inn.add('rubbleIn', box(0.9, 0.55, 2.3, { x: x0 + 0.8, y: h1 + 0.3, z: wz + 0.4 }));
  inn.add('straw', box(0.8, 0.28, 2.2, { x: x0 + 0.8, y: h1 + 0.85, z: wz + 0.4 }));
  inn.add('rubbleIn', box(0.9, 0.3, 2.3, { x: x0 + 0.8, y: h1 + 2.2, z: wz + 0.4 }), { collide: false });
  F.table(inn, x0 + 3.0, h1 + 0.3, wz - 0.7, 0, 1.2, 0.7);
  F.jar(inn, x0 + 2.7, h1 + 1.08, wz - 0.7, 0.28, 'pottery');
  // "wine, cheese, olives, bread and raisins"
  inn.add('p.bread', sphere(0.11, { x: x0 + 3.2, y: h1 + 1.08, z: wz - 0.6, sy: 0.55 }, 12, 8), { collide: false });
  inn.add('p.earthenware', place(C.bowl(0.1, 0.05), { x: x0 + 3.45, y: h1 + 1.08, z: wz - 0.85 }), { collide: false });
  for (let k = 0; k < 7; k++) inn.add('p.earthenDark', sphere(0.012, { x: x0 + 3.45 + Math.cos(k) * 0.04, y: h1 + 1.12, z: wz - 0.85 + Math.sin(k) * 0.04 }, 6, 4), { collide: false, shadow: false });
  inn.add('p.onion', box(0.12, 0.06, 0.09, { x: x0 + 2.95, y: h1 + 1.08, z: wz - 0.9, ry: 0.4 }), { collide: false });
  inn.add('parchment', cyl(0.14, 0.14, 0.05, 12, { x: x0 + 3.2, y: h1 + 1.08, z: wz - 0.7 }), { collide: false });
  inn.add('bark', sphere(0.12, { x: x0 + 3.45, y: h1 + 1.12, z: wz - 0.6, sy: 0.6 }), { collide: false });
  F.oilLamp(inn, x0 + 3.0, h1 + 1.1, wz - 0.95, ctx.emit);
  // William's things: a chest for his instruments and books, a stool, a
  // lectern with an open codex by the great east window; a pitcher and basin
  F.chest(inn, x1 - 0.7, h1 + 0.3, wz + 1.4, Math.PI / 2, 0.9);
  F.stool(inn, x0 + 3.0, h1 + 0.3, wz - 0.1);
  F.lectern(inn, x1 - 1.4, h1 + 0.3, wz - 1.2, -Math.PI / 2);
  F.vesselsOn(inn, x0 + 3.6, h1 + 0.3, wz + 1.35, 0, 0.3, 77, { density: 1 });
  // below, the pilgrims' hall: a trestle table, benches, a chest, sacks of
  // the travellers' baggage and a hearth-side stool
  { const zh = z0 + cd * 1.3, xh = (x0 + x1) / 2;
    F.table(inn, xh, y0, zh, Math.PI / 2, 2.6, 0.85);
    F.bench(inn, xh - 0.75, y0, zh, Math.PI / 2, 2.4); F.bench(inn, xh + 0.75, y0, zh, Math.PI / 2, 2.4);
    F.chest(inn, x1 - 0.7, y0, z0 + cd * 2.6, Math.PI / 2, 1.0);
    F.sacks(inn, x1 - 0.9, y0, z0 + cd * 3.3, 3);
    F.vesselsOn(inn, xh, y0 + 0.78, zh, Math.PI / 2, 1.8, 91, { density: 0.7 });
    F.oilLamp(inn, xh + 0.1, y0 + 0.84, zh + 0.55, ctx.emit);
    // RECON: the poorer pilgrims sleep in the hall on straw pallets along the
    // east wall; their staffs lean by the door, a hat and a scrip on the pegs
    const pal = [], pb = [], pg = [];
    for (let k = 0; k < 4; k++) {
      const pz = z0 + 1.35 + k * 2.4, px = x1 - 0.8, v = k % 2;
      const m = C.mattress(0.78, 1.85, 0.13, { seed: 610 + k }); m.translate(px, y0, pz); pal.push(m);
      const bl = C.blanket(0.78, 1.1 - v * 0.2, y0 + 0.13, { seed: 620 + k, hang: 0.1 }); bl.translate(px, 0, pz + 0.3 + v * 0.1);
      (v ? pg : pb).push(bl);
    }
    inn.add('p.sacking', merge(pal), { collide: false });
    inn.add('p.blanket', merge(pb), { collide: false }); inn.add('p.blanketGrey', merge(pg), { collide: false });
    const staffs = [0, 1, 2].map(k => { const g = cyl(0.017, 0.02, 1.75, 6, {}); g.rotateZ(-0.12 - k * 0.04); g.rotateX(0.05 * (k - 1)); g.translate(x0 + 0.5 + k * 0.05, y0 + 0.86, z0 + 4.3 + k * 0.22); return g; });
    inn.add('wood', merge(staffs), { collide: false });
    const pegZ = z0 + 0.4;
    const hat = merge([cyl(0.26, 0.26, 0.012, 20, { y: 0 }), cyl(0.1, 0.12, 0.09, 14, { y: 0.01 })]); hat.rotateX(1.35);
    inn.add('p.woolBlack', place(hat, { x: xh - 0.9, y: y0 + 1.55, z: pegZ + 0.05 }), { collide: false });
    inn.add('p.leather', merge([box(0.26, 0.3, 0.07, { x: xh + 0.2, y: y0 + 1.3, z: pegZ + 0.06 }), box(0.27, 0.12, 0.08, { x: xh + 0.2, y: y0 + 1.5, z: pegZ + 0.07 }), box(0.02, 0.3, 0.01, { x: xh + 0.2, y: y0 + 1.6, z: pegZ + 0.04 })]), { collide: false });
    inn.add('woodDark', merge([box(2.4, 0.07, 0.08, { x: xh - 0.3, y: y0 + 1.82, z: pegZ }), ...[-1.2, -0.9, 0.2, 0.6].map(dx => box(0.03, 0.03, 0.14, { x: xh + dx, y: y0 + 1.78, z: pegZ + 0.06 }))]), { collide: false }); }
  // the other guest cells: a stool, a cloak on a peg by the door
  woolBlack(M);
  for (const i of [0, 1, 3]) {
    const zz = z0 + (i + 0.5) * cd;
    F.stool(inn, x1 - 2.2, h1 + 0.3, zz + 0.6);
    const g = C.hanging(0.55, 1.1, { seed: 640 + i, depth: 0.04 }); g.rotateY(Math.PI / 2); g.translate(x0 + 0.42, h1 + 2.1, zz + 1.0);
    inn.add('p.woolBlack', g, { collide: false });
    inn.add('woodDark', box(0.12, 0.03, 0.03, { x: x0 + 0.41, y: h1 + 2.08, z: zz + 1.0 }), { collide: false });
  }
  interact_(ctx, 'william-cell', [x0 + 2.4, h1 + 1.6, wz], 2.2, 'William’s cell, and Adso’s niche of fresh straw');
  interact_(ctx, 'hospice', [x0 - 3, 1.6, z0 + 9], 5, 'The pilgrims’ hospice');
  ctx.sink(poly, -2.5, 1.0);
  ctx.anchors.hospice = { steps: [x0 - 1.0, sz + run], cell: [x0 + 2.4, wz, h1 + 0.3] };
}

function flowerGarden(ex, M, ctx, y0) {
  const G = FLOWER_GARDEN;
  const cx = (G.x0 + G.x1) / 2, cz = (G.z0 + G.z1) / 2;
  // low hedges framing four beds around a round centre, as on the plan
  let hs = 0; const hedge = (a, b) => ex.add('hedge', S.hedgeRun(a, b, y0 - 0.12, 0.66, 0.5, { seed: 300 + hs++ }), { collide: false });
  for (const [a, b] of [[[G.x0, G.z0], [G.x1, G.z0]], [[G.x1, G.z0], [G.x1, G.z1]], [[G.x1, G.z1], [G.x0, G.z1]], [[G.x0, G.z1], [G.x0, G.z0]]]) hedge(a, b);
  for (const s of [-1, 1]) {
    hedge([G.x0 + 1.2, cz + s * 1.3], [cx - 3.2, cz + s * 1.3]);
    hedge([cx + 3.2, cz + s * 1.3], [G.x1 - 1.2, cz + s * 1.3]);
    hedge([cx + s * 1.3, G.z0 + 1.2], [cx + s * 1.3, cz - 3.2]);
    hedge([cx + s * 1.3, cz + 3.2], [cx + s * 1.3, G.z1 - 1.2]);
  }
  const ring = []; for (let i = 0; i <= 16; i++) ring.push([cx + Math.cos(i / 16 * Math.PI * 2) * 2.6, cz + Math.sin(i / 16 * Math.PI * 2) * 2.6]);
  for (let i = 0; i < 16; i++) if (i % 4 !== 1) hedge(ring[i], ring[i + 1]);
  ex.add('church', cyl(0.9, 1.0, 0.7, 16, { x: cx, y: y0 - 0.1, z: cz }));
  ex.add('church', cyl(0.25, 0.3, 1.3, 10, { x: cx, y: y0 + 0.6, z: cz }));
  for (const [dx, dz] of [[-6, -5], [6, -5], [-6, 5], [6, 5]]) {
    ctx.trees.push({ x: cx + dx, z: cz + dz, kind: 'rose', s: 0.5 });
  }
  ctx.plots.push({ x0: G.x0 + 0.5, x1: G.x1 - 0.5, z0: G.z0 + 0.5, z1: G.z1 - 0.5, kind: 'flowers' });
  ctx.paths.push({ w: 1.2, pts: [[G.x0, cz], [G.x1, cz]] }, { w: 1.2, pts: [[cx, G.z0], [cx, G.z1]] });
  interact_(ctx, 'flower-garden', [cx, 1.4, cz], 8, 'The flower garden before the hospice');
}

function interact_(ctx, id, p, radius, label) { ctx.interact({ id, pos: new THREE.Vector3(...p), radius, label }); }
