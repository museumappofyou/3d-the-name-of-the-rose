import * as THREE from 'three';
import { P, ORCHARD, CEMETERY, AED, CHURCH } from '../core/plan.js';
import { Batch, box, cyl, sphere, merge, place, wall, prism } from '../core/kit.js';
import { rng, withSnow } from '../core/materials.js';
import { buildTrees } from './trees.js';
import { baseHeight, ROAD, signedDist } from './terrain.js';
import { pointInPoly } from '../core/library.js';
import * as F from './furniture.js';
import * as S from './props/sculpt.js';
import { propMaterials } from '../core/propMaterials.js';

// Trees and gardens in late November: bare orchard and avenue trees, dark
// evergreen pines "white with snow" over the upper road, the oak at the
// edge of the cemetery, herb beds with dry stalks through the snow.

export function buildNature(M, ctx) {
  const ex = new Batch('nature');
  const r = rng(77);

  const instances = { bare: [], fruit: [], pine: [], umbrella: [], oak: [], rose: [] };
  const add = (kind, x, z, s = 1, y) => instances[kind].push({ x, z, s, y: y ?? baseHeight(x, z), ry: r() * Math.PI * 2 });

  // the avenue from the gate to the church
  for (let x = P(92, 0)[0]; x < P(280, 0)[0]; x += 7.2) {
    add('bare', x + (r() - 0.5), P(0, 262)[1] + (r() - 0.5) * 0.6, 0.85 + r() * 0.3);
    add('bare', x + 3.4 + (r() - 0.5), P(0, 283)[1] + (r() - 0.5) * 0.6, 0.85 + r() * 0.3);
  }
  // orchard among the infirmary's gardens
  for (let i = 0; i < 70; i++) {
    const x = P(108, 0)[0] + r() * 45, z = P(0, 185)[1] + r() * 35;
    if (pointInPoly([x, z], ORCHARD.poly)) add('fruit', x, z, 0.7 + r() * 0.4);
  }
  // the oak at the edge of the cemetery
  add('oak', P(458, 0)[0], P(0, 246)[1], 1.25);
  // trees requested by the buildings (cloister garth, flower garden)
  for (const t of ctx.trees) add(t.kind === 'rose' ? 'rose' : 'fruit', t.x, t.z, t.s);
  // "a row of evergreen pines on both sides of the road ... formed a natural
  // roof over the upper part of the road" (claim_000056, claim_000080): on
  // the stretch just below the gate, umbrella pines close over the road
  // (RECON: the species is unstated; stone pines give the roof). Further
  // down, firs and spruces line it.
  const along = [0];
  for (let i = 1; i < ROAD.length; i++) along.push(along[i - 1] + Math.hypot(ROAD[i][0] - ROAD[i - 1][0], ROAD[i][1] - ROAD[i - 1][1]));
  const roofed = i => along[i] > 22 && along[i] < 95;
  let lastRoof = -1e9;
  for (let i = 1; i < ROAD.length - 1; i++) {
    if (!roofed(i) || along[i] - lastRoof < 9) continue;
    lastRoof = along[i];
    const [x, z] = ROAD[i], [x2, z2] = ROAD[i + 1];
    const d = [x2 - x, z2 - z], L = Math.hypot(...d), n = [-d[1] / L, d[0] / L];
    for (const s of [-1, 1]) {
      const o = 3.9 + r() * 1.2, sh = (r() - 0.5) * 3;
      add('umbrella', x + n[0] * s * o + d[0] / L * sh, z + n[1] * s * o + d[1] / L * sh, 0.85 + r() * 0.25);
    }
  }
  for (let i = 3; i < ROAD.length - 4; i += 3) {
    if (along[i] < 100) continue; // the gate forecourt and the pine roof
    const [x, z] = ROAD[i], [x2, z2] = ROAD[i + 1];
    const d = [x2 - x, z2 - z], L = Math.hypot(...d), n = [-d[1] / L, d[0] / L];
    for (const s of [-1, 1]) {
      const px = x + n[0] * s * (4.6 + r() * 2), pz = z + n[1] * s * (4.6 + r() * 2);
      add('pine', px, pz, 0.9 + r() * 0.5);
    }
  }
  for (let i = 0; i < 2600; i++) {
    const a = r() * Math.PI * 2, rad = 150 + Math.pow(r(), 0.7) * 520;
    const x = 20 + Math.cos(a) * rad, z = -10 + Math.sin(a) * rad;
    if (signedDist(x, z) < 12) continue;
    const y = baseHeight(x, z);
    const s = baseHeight(x + 3, z), s2 = baseHeight(x, z + 3);
    if (Math.hypot(s - y, s2 - y) > 4.6) continue; // too steep: bare rock
    if (y < -240) continue;
    add('pine', x, z, 0.7 + r() * 0.8, y);
  }

  // pines on the slope beneath the east tower (First Day, Prime)
  for (let i = 0; i < 26; i++) {
    const x = 84 + r() * 34, z = -86 + r() * 30, y = baseHeight(x, z);
    if (signedDist(x, z) < 6 || y > -1) continue;
    add('pine', x, z, 0.7 + r() * 0.5, y);
  }
  // variants, then the instanced forest with its levels of detail (trees.js)
  const vr = rng(5);
  for (const t of instances.pine) t.v = Math.min(3, Math.floor(vr() * 4));
  for (const k of ['bare', 'fruit']) for (const t of instances[k]) t.v = Math.floor(vr() * 3);
  const forest = buildTrees(ctx.scene, instances);

  // the working gardens, and the orchard dung heap, are built in gardens.js
  cemetery(ex, M, ctx, r);
  return { batches: [ex], forest };
}

// "newly erected gravestones and old stones bearing the marks of time,
// recounting the lives of monks of past centuries"; under the snow "the
// place of the cemetery could be told only by some tombs still rising above
// the ground" (OTHER_BUILDINGS: CEMETERY). Old stones lean, lichened and
// bitten at the edges, sunk deep; the new ones stand straighter over low
// humps of turned earth that the thin snow has not yet closed; a few worn
// slabs of older burials; the rough wooden crosses of the most recent dead.
function cemetery(ex, M, ctx, r) {
  propMaterials(M);
  const poly = CEMETERY.poly;
  const xmin = poly.reduce((m, p) => Math.min(m, p[0]), 1e9), zmin = poly.reduce((m, p) => Math.min(m, p[1]), 1e9);
  const xmax = poly.reduce((m, p) => Math.max(m, p[0]), -1e9), zmax = poly.reduce((m, p) => Math.max(m, p[1]), -1e9);
  // a small stock of sculpted shapes, each placed with its own turn and scale
  const V = (n, f) => Array.from({ length: n }, (_, i) => f(i));
  const oldStones = V(7, i => S.stone(0.42 + (i % 3) * 0.08, 0.5 + (i % 4) * 0.1, 0.13 + (i % 2) * 0.04, { seed: 11 + i, top: ['round', 'round', 'gable', 'flat'][i % 4], wear: 1.4, chips: 4 }));
  const newStones = V(5, i => S.stone(0.44 + (i % 2) * 0.1, 0.62 + (i % 3) * 0.1, 0.12, { seed: 51 + i, top: i % 3 === 2 ? 'gable' : 'round', wear: 0.35, chips: 1 }));
  const crosses = V(3, i => S.stoneCross(0.85 + i * 0.12, { seed: 71 + i, wear: 0.8 }));
  const wood = V(3, i => S.woodCross(1.0 + i * 0.1, { seed: 81 + i }));
  const slabs = V(4, i => S.slab(0.75 + (i % 2) * 0.15, 1.7 + (i % 3) * 0.15, 0.16, { seed: 91 + i, wear: 1.3, tilt: (i - 1.5) * 0.02 }));
  const mounds = V(4, i => S.mound(0.85, 1.9, 0.2 + i * 0.03, { seed: 101 + i }));
  const put = (key, src, o) => ex.add(key, place(src.clone(), o), { collide: false });
  // rows run roughly east-west, as burials face east, but loosely kept
  const taken = [];
  const free = (x, z, d) => taken.every(([a, b, e]) => Math.hypot(a - x, b - z) > d + e);
  // four graves by the entry, each telling its own age: an old stone cross
  // leaning and sunk; a worn round-headed stela; the latest burial, its
  // earth humped and already sinking, a lashed wooden cross; a slab gone
  // down at one end with snow lodged in its incised cross
  {
    const F = [[24.8, -25.9], [26.6, -23.9], [27.6, -26.9], [25.0, -28.3]];
    const ry = Math.PI / 2 + 0.08;
    const head = (x, z, d = 1.05) => [x + Math.sin(ry) * d, z + Math.cos(ry) * d];
    { const [x, z] = F[0], y = baseHeight(x, z);
      put('wall', S.stoneCross(1.35, { seed: 177, wear: 1.3 }), { x, y: y - 0.3, z, ry, rx: 0.1, rz: -0.14 });
      put('snow', mounds[1], { x: head(x, z)[0], y: y - 0.14, z: head(x, z)[1], ry, sy: 0.3 });
      taken.push([x, z, 0.7]); }
    { const [x, z] = F[1], y = baseHeight(x, z);
      put('wall', S.stone(0.58, 0.95, 0.16, { seed: 178, top: 'round', wear: 1.6, chips: 5 }), { x, y: y - 0.2, z, ry: ry - 0.1, rx: -0.07, rz: 0.05 });
      put('p.graveEarth', mounds[2], { x: head(x, z)[0], y: y - 0.1, z: head(x, z)[1], ry, sy: 0.4 });
      put('snow', mounds[0], { x: head(x, z)[0], y: y - 0.07, z: head(x, z)[1], ry, sx: 0.9, sy: 0.3, sz: 0.8 });
      taken.push([x, z, 0.7]); }
    { const [x, z] = F[2], y = baseHeight(x, z), [hx, hz] = head(x, z);
      put('beamExt', S.woodCross(1.15, { seed: 179 }), { x, y: y - 0.3, z, ry, rz: 0.07 });
      put('p.graveEarth', mounds[3], { x: hx, y: y + 0.02, z: hz, ry, sy: 1.25 });
      // the thin snow settling unevenly on the fresh earth, and the hollow
      // along its middle where it has begun to sink
      put('snow', S.mound(0.6, 1.2, 0.08, { seed: 180 }), { x: hx + 0.18, y: y + 0.18, z: hz - 0.1, ry: ry + 0.2 });
      put('p.graveEarth', S.mound(0.3, 1.1, 0.03, { seed: 181 }), { x: hx, y: y + 0.17, z: hz, ry });
      ctx.ground.push({ kind: 'mud', c: [hx, hz], r: 1.6, k: 0.7 });
      taken.push([x, z, 0.7], [hx, hz, 0.9]); }
    { const [x, z] = F[3], y = baseHeight(x, z), [hx, hz] = head(x, z, 0.9);
      put('flagExt', S.slab(0.85, 1.85, 0.18, { seed: 182, wear: 1.7, tilt: 0.03 }), { x: hx, y: y - 0.2, z: hz, ry, rz: 0.02 });
      put('snow', merge([box(0.08, 0.02, 1.0, { x: 0, y: 0.1, z: 0 }), box(0.55, 0.02, 0.08, { x: 0, y: 0.1, z: -0.2 })]), { x: hx, y: y - 0.08, z: hz, ry });
      taken.push([hx, hz, 1.2]); }
  }
  let n = 0;
  for (let i = 0; i < 900 && n < 74; i++) {
    const x = xmin + r() * (xmax - xmin), z = zmin + r() * (zmax - zmin);
    if (!pointInPoly([x, z], poly)) continue;
    // keep the monks' path from the north door to the Aedificium clear
    if (Math.abs(x - 42) < 2.6 && z < -14) continue;
    if (!free(x, z, 0.9)) continue;
    const y = baseHeight(x, z);
    const ry = Math.PI / 2 + (r() - 0.5) * 0.35;           // headstone faces east
    const hx = x + Math.sin(ry) * 1.05, hz = z + Math.cos(ry) * 1.05; // head to the west, the grave runs east
    const kind = r();
    if (kind < 0.42) {
      // old: lichened, leaning, sunk to half its height, the grave long level
      const g = oldStones[Math.floor(r() * oldStones.length)], sink = 0.12 + r() * 0.22;
      put('wall', g, { x, y: y - sink, z, ry, rx: (r() - 0.5) * 0.3, rz: (r() - 0.5) * 0.28, sx: 0.9 + r() * 0.25, sy: 0.85 + r() * 0.3 });
      if (r() < 0.35) put('snow', mounds[Math.floor(r() * mounds.length)], { x: hx, y: y - 0.12, z: hz, ry: ry, sy: 0.35 });
      taken.push([x, z, 0.6]);
    } else if (kind < 0.62) {
      // a worn slab over an older burial, one end settled into the ground
      const g = slabs[Math.floor(r() * slabs.length)];
      put('flagExt', g, { x: hx, y: y - 0.1 - r() * 0.06, z: hz, ry: ry, rz: (r() - 0.5) * 0.05 });
      taken.push([hx, hz, 1.1]);
    } else if (kind < 0.86) {
      // "newly erected": pale, upright, the earth still humped
      const g = r() < 0.3 ? crosses[Math.floor(r() * crosses.length)] : newStones[Math.floor(r() * newStones.length)];
      put('church', g, { x, y: y - 0.08, z, ry, rx: (r() - 0.5) * 0.06, rz: (r() - 0.5) * 0.06 });
      put('p.graveEarth', mounds[Math.floor(r() * mounds.length)], { x: hx, y: y - 0.02, z: hz, ry: ry, sx: 0.95 + r() * 0.1 });
      ctx.ground.push({ kind: 'mud', c: [hx, hz], r: 1.35, k: 0.45 });
      taken.push([x, z, 0.6], [hx, hz, 0.8]);
    } else {
      // the latest dead: a lashed wooden cross over fresh earth
      put('beamExt', wood[Math.floor(r() * wood.length)], { x, y: y - 0.25, z, ry, rz: (r() - 0.5) * 0.12 });
      put('p.graveEarth', mounds[Math.floor(r() * mounds.length)], { x: hx, y: y, z: hz, ry: ry, sy: 1.15 });
      ctx.ground.push({ kind: 'mud', c: [hx, hz], r: 1.5, k: 0.6 });
      taken.push([x, z, 0.6], [hx, hz, 0.8]);
    }
    n++;
  }
  ctx.interact({ id: 'cemetery', pos: new THREE.Vector3(40, 1.5, -19), radius: 12, label: 'The cemetery between the church and the Aedificium' });
  void M; void AED; void CHURCH; void prism;
}
