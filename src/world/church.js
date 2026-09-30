import * as THREE from 'three';
import { CHURCH, AED } from '../core/plan.js';
import { Batch, wall, wallLoop, prism, vault, column, spiral, box, cyl, sphere, lathe, merge, place, quad, pane, gableRoof, gableEnds, pyramidRoof, barrel, TAU, vaultSmooth } from '../core/kit.js';
import * as S from './props/sculpt.js';
import * as SC from './props/sacred.js';
import * as CL from './props/cloth.js';
import { propMaterials } from '../core/propMaterials.js';
import { dress } from '../core/weathering.js';
import { entombmentRelief } from '../core/relief.js';
import * as F from './furniture.js';

// The abbey church (B), First Day, Sext: "Italian in type, firmly planted
// on the ground… its first level crowned with square crenellations like a
// fortress; above it rose a second structure, more a second church than a
// tower, with a pitched roof and severe windows… a pointed spire, added
// recently, rose boldly over the choir." Main door due west, choir and
// altar to the east; the north door faces the Aedificium's south tower.

const C = CHURCH;
const x0 = C.x0, xC = C.xCross, xCh = C.xChoir, xA = C.xApse, zN = C.zN, zS = C.zS, zc = (C.zN + C.zS) / 2;
const zA = zc - C.nave / 2, zB = zc + C.nave / 2;
const T = 1.1;                    // outer wall thickness
const BAYS = 10, bay = (xC - x0) / BAYS;
const colX = i => x0 + i * bay;
export const CHAPELS = [2, 4, 6, 8].map(i => x0 + (i + 0.5) * bay); // four chapels in the north aisle
export const SKULL_CHAPEL = CHAPELS[2];                              // "the third on the left"
const APSE_R = 4.6, chZ = 4.6;
const TUNNEL_Y = -2.8;
// F2: the church's elevation is built ×VS about its floor (see plan.js
// CHURCH.vScale); human-scale fittings (altars, stalls, benches, pulpit,
// tripod, statues inside) and the stairs keep their true size.
const VS = C.vScale || 1, Y0 = 0.35;
const hy = v => (v > Y0 ? Y0 + (v - Y0) * VS : v);
function sy(g) {
  if (!g || VS === 1) return g;
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) p.setY(i, hy(p.getY(i)));
  if (n) { for (let i = 0; i < n.count; i++) { const x = n.getX(i), y = n.getY(i) / VS, z = n.getZ(i), l = Math.hypot(x, y, z) || 1; n.setXYZ(i, x / l, y / l, z / l); } n.needsUpdate = true; }
  p.needsUpdate = true; g.computeBoundingBox(); g.computeBoundingSphere();
  return g;
}
// a door's relative jamb height that keeps its true clear height once scaled
const TYM = { ground: 'tym.ground', stone: 'tym.stone', white: 'tym.white', gold: 'tym.gold', purple: 'tym.purple', green: 'tym.green', sea: 'tym.sea', dark: 'tym.dark' };
const keepH = (yBase, rel) => (Y0 + (yBase + rel - Y0) / VS) - yBase;
// the ossuary passage from the foot of the skull-chapel stair to the foot of
// the kitchen descent in the Aedificium's S tower (also used by zones.js)
export const OSSUARY_PATH = [[SKULL_CHAPEL, zN - 6.0], [17.6, -22.2], [30.0, -25.6], [AED.x + AED.ossX, -27.8], [AED.x + AED.ossX, AED.z + AED.dT + 6.1]];

export function buildChurch(M, ctx) {
  // the way worn down the nave from the west door to the choir step, and in
  // from the north door (the paving polished by feet: weathering.js)
  { const zc0 = (zN + CHURCH.zS) / 2; ctx.paths.push({ w: 2.4, pts: [[CHURCH.x0 - 1, zc0], [CHURCH.xCross, zc0], [CHURCH.xChoir + 2, zc0]] }, { w: 1.4, pts: [[42.2, zN - 1], [42.2, zc0 - 1.5], [CHURCH.xChoir + 2, zc0]] }); }
  const ex = new Batch('church-exterior');
  const inn = new Batch('church-interior');
  const und = new Batch('ossuary');
  propMaterials(M);
  const emit = ctx.emit, interact = ctx.interact;
  const y0 = 0.35;

  // relief materials
  // the portal's carving: stone with the soft remains of its paint ("the
  // cheerful softness of the colours")
  // a fine tooled grain (pitting, weathered highs) shared by all the carving
  const grain = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const g = cv.getContext('2d'); g.fillStyle = '#c8c8c8'; g.fillRect(0, 0, 256, 256);
    let sd = 7; const r = () => ((sd = (Math.imul(sd, 1664525) + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 5000; i++) { const v = 150 + r() * 105; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(r() * 256, r() * 256, 1 + r() * 3, 1 + r() * 3); }
    for (let i = 0; i < 900; i++) { const v = 70 + r() * 60; g.fillStyle = `rgba(${v},${v},${v},0.8)`; g.beginPath(); g.arc(r() * 256, r() * 256, 0.6 + r() * 1.4, 0, 6.3); g.fill(); }
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const tymStd = (color, o = {}) => new THREE.MeshStandardMaterial({ color, map: grain, roughness: 0.9, envMapIntensity: 0.15, ...o });
  M.tym = { stone: tymStd(0x7a6d5c), ground: tymStd(0x564c41), white: tymStd(0x8d8577), gold: tymStd(0x8c7038, { roughness: 0.55, metalness: 0.3 }), purple: tymStd(0x573250), green: tymStd(0x355c49), sea: tymStd(0x6a7c80, { roughness: 0.5 }), dark: tymStd(0x2e2822) };   // under the grain (~0.7) these sit at the church stone's own tone (texture × tint ≈ #625139)
  // the carving weathers with the wall it is cut in: the same broad stains,
  // rain streaks down the faces, soot and grime lodged under every ledge and
  // figure (so the elders sit in shadowed hollows instead of reading as
  // cut-outs), lichen on the cold faces; the paint stays, dulled
  for (const [k, m] of Object.entries(M.tym)) dress(m, { macro: 0.22, streak: 0.32, soot: k === 'gold' ? 0.2 : 0.38, lichen: 0.18, rough: m.roughness, sat: 0.85, cavity: 0.2 });

  // ------------------------------------------------------------------
  // outer walls of the aisles, west front, choir, transept, apse
  // ------------------------------------------------------------------
  const aisleTop = C.aisleH;
  const northOps = [], southOps = [];
  const LN = xC - x0;
  for (let i = 0; i < BAYS; i++) {
    const t = (i + 0.5) * bay;
    if (CHAPELS.some(cx => Math.abs(cx - (x0 + t)) < 0.1)) northOps.push({ t, w: 3.0, y0: 0, y1: 4.0 - 0.35, arch: 'round' });
    else northOps.push({ t, w: 0.9, y0: 3.4, y1: 5.6, arch: 'round' });
    if (i === BAYS - 1) southOps.push({ t: t - 0.4, w: 1.6, y0: 0, y1: 3.0, arch: 'round' }); // south door to the cloister
    else southOps.push({ t, w: 0.9, y0: 3.4, y1: 5.6, arch: 'round' });
  }
  ex.add('church', wall([x0, zN], [xC + 0.01, zN], -0.5, aisleTop + 1.0, T, northOps.map(o => ({ ...o, y0: o.y0 ? o.y0 + 0.5 : 0, y1: o.y1 + 0.5 + 0.35 }))));
  ex.add('church', wall([x0, zS], [xCh, zS], -0.5, aisleTop + 1.0, T, southOps.map(o => ({ ...o, y0: o.y0 ? o.y0 + 0.5 : 0, y1: o.y1 + 0.5 + 0.35 }))));
  // crenellations: "a row of square merlons, like a fortress"
  for (const z of [zN, zS]) {
    const x1 = z === zS ? xCh : xC;
    for (let x = x0 + 0.4; x < x1 - 0.3; x += 1.5) ex.add('church', box(0.75, 0.85, T, { x: x + 0.37, y: aisleTop + 1.0, z }));
  }
  // west front
  const portalW = 6.2;
  ex.add('church', wall([x0, zS + T / 2], [x0, zN - T / 2], -0.5, aisleTop + 1.0, T + 0.3, [{ t: (zS - zN + T) / 2, w: portalW, y0: 0, y1: 5.4, arch: 'round' }]));
  for (let z = zN + 0.1; z < zS - 0.3; z += 1.5) if (Math.abs(z + 0.37 - zc) > 4.1) ex.add('church', box(T + 0.3, 0.85, 0.75, { x: x0, y: aisleTop + 1.0, z: z + 0.37 }));
  // the upper "second church": clerestory walls on the arcade lines
  const clerOps = [];
  for (let i = 0; i < BAYS; i++) clerOps.push({ t: (i + 0.5) * bay, w: 1.0, y0: 9.9 - 5.2, y1: 11.6 - 5.2, arch: 'round' });
  const archOps = [];
  for (let i = 0; i < BAYS; i++) archOps.push({ t: (i + 0.5) * bay, w: bay - 0.95, y0: 0, y1: 0, arch: 'round' });
  for (const z of [zA, zB]) {
    inn.add('churchIn', sy(wall([x0 + 0.5, z], [xC, z], 5.2, C.naveH, 0.9, [...archOps.map(o => ({ ...o, t: o.t - 0.5 })), ...clerOps.map(o => ({ ...o, t: o.t - 0.5 }))])));
  }
  // west gable of the nave and the façade windows above the portal
  ex.add('church', wall([x0, zB + 0.45], [x0, zA - 0.45], aisleTop + 1.0, C.naveH, T + 0.2, [
    { t: (zB - zA + 0.9) / 2 - 1.3, w: 0.55, y0: 1.2, y1: 3.8, arch: 'round' }, { t: (zB - zA + 0.9) / 2 + 1.3, w: 0.55, y0: 1.2, y1: 3.8, arch: 'round' }]));
  // the west lancets, "recently repaired, of lesser quality" (c0524 k1179 H): plain glass
  for (const t of [(zB - zA + 0.9) / 2 - 1.3, (zB - zA + 0.9) / 2 + 1.3]) ex.add('glassOpaque', pane([x0, zB + 0.45], [x0, zA - 0.45], t, 0.55, aisleTop + 1.0 + 1.2, aisleTop + 1.0 + 3.8, 'round', 0), { collide: false, shadow: false });
  ex.add('church', gableEnds(x0, x0, zA - 0.5, zB + 0.5, C.naveH, 19.6, 'x', T + 0.2).translate(0, 0, 0));
  // oculus
  const oc = new THREE.TorusGeometry(0.9, 0.18, 8, 24); oc.translate(0, 0, 0); oc.rotateY(Math.PI / 2); oc.translate(x0 - 0.66, 16.8, zc);
  ex.add('church', oc, { collide: false });

  // crossing, north transept arm, choir and apse
  const tN = C.transeptN;
  ex.add('church', wall([xC, zN + 0.01], [xC, tN], -0.5, C.naveH, T));
  ex.add('church', wall([xC - T / 2, tN], [xCh + T / 2, tN], -0.5, C.naveH, T, [{ t: (xCh - xC + T) / 2, w: 1.3, y0: 7.0, y1: 10.8, arch: 'round' }]));
  ex.add('glassOpaque', pane([xC - T / 2, tN], [xCh + T / 2, tN], (xCh - xC + T) / 2, 1.3, 6.5, 10.3, 'round', 0), { collide: false, shadow: false });
  ex.add('church', wall([xCh, tN], [xCh, zc - chZ], -0.5, C.naveH, T));
  const chN = zc - chZ, chS = zc + chZ;
  const choirOps = [{ t: 4.0, w: 1.9, y0: 0, y1: 3.2 + 0.5, arch: 'round' }, { t: 2.4, w: 1.1, y0: 8.4 + 0.5, y1: 11.6 + 0.5, arch: 'round' }, { t: 6.4, w: 1.1, y0: 8.4 + 0.5, y1: 11.6 + 0.5, arch: 'round' }];
  ex.add('church', wall([xCh, chN], [xA, chN], -0.5, C.naveH, T, choirOps.map(o => ({ ...o, y0: o.y0 ? o.y0 : 0 }))));
  ex.add('church', wall([xCh, chS], [xA, chS], -0.5, C.naveH, T, [{ t: 2.4, w: 1.1, y0: 8.9, y1: 12.1, arch: 'round' }, { t: 6.4, w: 1.1, y0: 8.9, y1: 12.1, arch: 'round' }, { t: 5.8, w: 1.2, y0: 0, y1: keepH(-0.5, 2.9), arch: 'round' }]));   // past the east end of the stalls
  // apse: half ring with three tall windows of blue glass
  const apsePts = [];
  for (let i = 0; i <= 12; i++) { const a = -Math.PI / 2 + i / 12 * Math.PI; apsePts.push([xA + Math.cos(a) * APSE_R, zc + Math.sin(a) * APSE_R]); }
  for (let i = 0; i < 12; i++) {
    const a = apsePts[i], b = apsePts[i + 1];
    const ops = [3, 6, 9].includes(i) || [2, 5, 8].includes(i) ? [] : [];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (i === 2 || i === 5 || i === 9) ops.push({ t: L / 2, w: 0.95, y0: 5.4, y1: 10.8, arch: 'round' });
    ex.add('church', wall(a, b, -0.5, C.naveH - 0.6, T + 0.1, ops));
    for (const o of ops) ex.add(`stained.${i % 4}`, pane(a, b, o.t, o.w, -0.5 + o.y0, -0.5 + o.y1, 'round', 0), { collide: false, shadow: false });
  }
  // south sacristy lean-to between choir and cloister walk
  ex.add('church', wall([xCh, chS], [xCh, zS], -0.5, 6.0, 0.8));
  ex.add('church', wall([xA - 0.4, chS], [xA - 0.4, zS], -0.5, 6.0, 0.8));
  ex.add('church', wall([xCh + 3.6, zS], [xA - 0.4, zS], -0.5, 6.0, T, [{ t: 2.0, w: 1.3, y0: 0, y1: keepH(-0.5, 2.9), arch: 'round' }]));
  ex.add('roof', gableRoof(xCh - 0.2, xA - 0.2, chS, zS + 1.0, 6.0, 7.6, { over: 0.3 }).translate(0, 0, 0));
  ex.add('church', gableEnds(xCh, xA - 0.4, chS, zS + 1.0, 6.0, 7.6, 'x', 0.8));   // close the sacristy's gables

  // glazing of aisle, clerestory, choir windows
  for (let i = 0; i < BAYS; i++) {
    const cx = x0 + (i + 0.5) * bay;
    if (!CHAPELS.some(c => Math.abs(c - cx) < 0.1)) ex.add('glassOpaque', pane([x0, zN], [xC, zN], cx - x0, 0.9, 3.4 - 0.15, 5.6 + 0.35, 'round', 0), { collide: false, shadow: false });
    if (i < BAYS - 1) ex.add('glassOpaque', pane([x0, zS], [xC, zS], cx - x0, 0.9, 3.4 - 0.15, 5.6 + 0.35, 'round', 0), { collide: false, shadow: false });
    for (const z of [zA, zB]) ex.add(i % 3 === 0 ? 'stainedWarm' : 'glassOpaque', pane([x0 + 0.5, z], [xC, z], cx - x0 - 0.5, 1.0, 9.9, 11.6, 'round', 0), { collide: false, shadow: false });
  }
  for (const [a, b, t, z] of [[[xCh, chN], [xA, chN], 2.4], [[xCh, chN], [xA, chN], 6.4], [[xCh, chS], [xA, chS], 2.4], [[xCh, chS], [xA, chS], 6.4]]) {
    ex.add('stained.1', pane(a, b, t, 1.1, 8.4 + 0.5 - 0.5, 11.6 + 0.5 - 0.5 + 0.5, 'round', 0), { collide: false, shadow: false });
    void z;
  }

  // ------------------------------------------------------------------
  // west porch: two plain pillars, a silvery vault, and the portal
  // ------------------------------------------------------------------
  const px = x0 - T / 2 - 4.6;
  for (const s of [-1, 1]) {
    ex.add('church', box(1.1, 7.2, 1.1, { x: px, y: -0.2, z: zc + s * 3.9 }));
    // side arches with secondary columns
    ex.add('church', wall([px, zc + s * 3.9], [x0 - T / 2 - 0.15, zc + s * 3.9], 4.0, 7.0, 0.6, [{ t: 2.3, w: 3.2, y0: 0, y1: 0, arch: 'round' }]), { collide: false });
    const c2 = column(4.0 - y0, 0.18); c2.translate(px + 2.3 - 1.6 - 0.1, y0, zc + s * 3.9); ex.add('church', c2);
    const c3 = column(4.0 - y0, 0.18); c3.translate(px + 2.3 + 1.7, y0, zc + s * 3.9); ex.add('church', c3);
  }
  ex.add('church', wall([px, zc - 4.45], [px, zc + 4.45], 4.9, 8.4, 1.1, [{ t: 4.45, w: 7.0, y0: 0, y1: 0, arch: 'segment' }]), { collide: false });
  ex.add('plasterExt', barrel([px, zc], [x0 - T / 2, zc], 7.2, 4.6, {}), { collide: false });
  ex.add('roof', gableRoof(px - 0.6, x0 - T / 2, zc - 4.5, zc + 4.5, 8.4, 10.9, { over: 0.4 }));
  ex.add('church', gableEnds(px - 0.6, px - 0.6, zc - 4.5, zc + 4.5, 8.4, 10.9, 'x', 0.5));
  ex.add('flagExt', prism([[px - 0.8, zc - 4.6], [x0, zc - 4.6], [x0, zc + 4.6], [px - 0.8, zc + 4.6]], -0.4, y0 - 0.02));
  ex.add('flagExt', box(1.0, 0.18, 9.2, { x: px - 1.2, y: -0.2, z: zc }));
  // receding orders of the portal
  const depth = T + 0.3;
  for (let k = 0; k < 4; k++) {
    const w = portalW - 0.35 - k * 0.55, xx = x0 - depth / 2 + 0.15 + k * 0.32;
    for (const s of [-1, 1]) {
      const c = column(5.0, 0.13, { cushion: false }); c.translate(xx, y0, zc + s * w / 2); ex.add('church', c);
    }
    const tor = new THREE.TorusGeometry(w / 2, 0.16, 8, 28, Math.PI);
    tor.rotateY(Math.PI / 2); tor.translate(xx, 5.35, zc);
    ex.add('church', tor, { collide: false });
  }
  // tympanum on its two corbels, and the trumeau with crossed lions
  const tymR = 2.25, tymX = x0 + depth / 2 - 0.35;
  // the carving is designed at its true size and pre-stretched by 1/VS so
  // it keeps its proportions when the exterior shell is scaled (sy)
  const at = (cv, x, y, z, ry = -Math.PI / 2) => { cv.scale(1, 1 / VS, 1); new SC.Carving().put(cv, { x, y, z, ry }).emit(ex, TYM, { collide: false }); };
  {
    at(SC.portalTympanum(tymR, tymR * VS), tymX - 0.02, 5.2, zc);
    ex.add('church', box(0.35, 0.25, 2 * tymR + 0.6, { x: tymX, y: 4.95, z: zc }));
    // the lintel: the interlaced plants under the elders' feet
    const band = SC.vineBand([[-tymR - 0.2, -0.1, 0.16], [0, -0.1, 0.16], [tymR + 0.2, -0.1, 0.16]], 0.17, { seed: 17 });
    at(band, tymX - 0.02, 5.2, zc);
  }
  const trumeau = merge([cyl(0.26, 0.28, 4.6, 12, { y: 0.3 }), box(0.7, 0.3, 0.7, {}), box(0.72, 0.3, 0.72, { y: 4.6 })]);
  trumeau.translate(tymX, y0, zc); ex.add('church', trumeau);
  // three pairs of lions crossed in X up the trumeau (First Day, Sext)
  for (let k = 0; k < 3; k++) at(SC.lionPair(1.05, 0.56), tymX - 0.24, y0 + (0.28 + k * 1.1) / VS, zc);
  // the oak doors "of extraordinary height", reinforced with metal
  // the leaves stand open, swung back into the nave on their hinges
  for (const s of [-1, 1]) {
    const hz = zc + s * 2.12, hx = tymX + 0.12;
    const leaf = box(1.85, 4.85, 0.1, { x: 0.92 }); leaf.rotateY(-s * 0.18); leaf.translate(hx, y0, hz);
    ex.add('door', leaf);
    const straps = merge([0.8, 2.4, 4.0].map(yy => box(1.8, 0.1, 0.13, { x: 0.92, y: yy })));
    straps.rotateY(-s * 0.18); straps.translate(hx, y0, hz);
    ex.add('iron', straps, { collide: false });
  }
  // jamb statues: Peter, Paul, Jeremiah, Isaiah facing each other in pairs,
  // opposite the lions; on their pedestals, between the slender columns,
  // the vices (the lustful woman, the miser, the proud man, the beasts)
  for (const [s, k, attr, vice] of [[-1, 0, 'keys', 'lust'], [1, 0, 'book', 'miser'], [-1, 1, 'scroll', 'pride'], [1, 1, 'scroll', 'beasts']]) {
    const w = portalW - 0.35 - k * 1.1;
    const xx = x0 - depth / 2 + 0.3 + k * 0.64, zz = zc + s * (w / 2 - 0.25);
    ex.add('church', box(0.5, 0.9, 0.5, { x: xx, y: y0, z: zz }));
    at(SC.prophet(1.95, { attr, seed: 30 + k * 2 + (s > 0 ? 1 : 0), mirror: -s }), xx, y0 + 0.9, zz, s > 0 ? Math.PI : 0);
    at(SC.viceScene(vice, 0.52, 40 + k), xx - 0.27, y0 + 0.06 / VS, zz);
  }
  // grotesques from the Devil's bestiary on the capitals of the orders
  for (let k = 0; k < 4; k++) {
    const w = portalW - 0.35 - k * 0.55, xx = x0 - depth / 2 + 0.15 + k * 0.32;
    for (const s of [-1, 1]) at(SC.grotesque(0.2, 50 + k * 2 + (s > 0 ? 1 : 0)), xx - 0.14, y0 + 4.72, zc + s * w / 2);
  }
  interact({ id: 'portal', pos: new THREE.Vector3(x0 - 2.5, 3.2, zc), radius: 5, label: 'The west portal: the Seated One and the twenty-four elders' });
  // the two openings either side of the trumeau (First Day, Sext: "two
  // openings… with oak doors reinforced with metal"), each walked through
  for (const s of [-1, 1]) ctx.door({ id: `church:west${s < 0 ? 'N' : 'S'}`, building: 'church', x: x0, z: zc + s * 1.12, nx: -1, nz: 0, y: y0, w: 1.3, th: T + 0.3, out: 6.5, noSteps: s > 0 });
  ctx.door({ id: 'church:north', building: 'church', x: xCh + 4.0, z: zc - chZ, nx: 0, nz: -1, y: y0, w: 1.9, th: T });
  ctx.door({ id: 'church:cloister', building: 'church', x: x0 + (BAYS - 0.5) * bay - 0.4, z: zS, nx: 0, nz: 1, y: y0, w: 1.6, th: T });
  ctx.door({ id: 'church:sacristy-south', building: 'church', x: xCh + 3.6 + 2.0, z: zS, nx: 0, nz: 1, y: y0, w: 1.3, th: T });
  ctx.door({ id: 'church:choir-sacristy', building: 'church', x: xCh + 5.8, z: zc + chZ, nx: 0, nz: 1, y: y0, w: 1.2, th: T });

  // ------------------------------------------------------------------
  // interior: arcade columns, vaults, floor
  // ------------------------------------------------------------------
  for (let i = 1; i < BAYS; i++) for (const z of [zA, zB]) {
    const c = column(5.2 - y0, 0.45, { cushion: true }); c.translate(colX(i), y0, z); inn.add('churchIn', sy(c));
  }
  for (const z of [zA, zB]) {
    inn.add('churchIn', sy(box(0.9, 5.2, 0.9, { x: x0 + 0.5, y: y0, z })));
    for (const x of [xC, xCh]) inn.add('churchIn', sy(box(1.4, C.crossH - 2.8, 1.4, { x, y: y0, z })));
  }
  // aisle vaults
  for (let i = 0; i < BAYS; i++) {
    const xa = colX(i), xb = colX(i + 1);
    inn.add('plaster', sy(vaultSmooth([[xa, zN + T / 2], [xb, zN + T / 2], [xb, zA], [xa, zA]], 5.2, 1.8, { archRise: 1.9 })), { collide: false });
    inn.add('plaster', sy(vaultSmooth([[xa, zB], [xb, zB], [xb, zS - T / 2], [xa, zS - T / 2]], 5.2, 1.8, { archRise: 1.9 })), { collide: false });
    inn.add('plaster', sy(vaultSmooth([[xa, zA], [xb, zA], [xb, zB], [xa, zB]], 12.6, 2.3, { archRise: 2.0 })), { collide: false });
  }
  // crossing, transept, choir vaults
  inn.add('plaster', sy(vaultSmooth([[xC, zA], [xCh, zA], [xCh, zB], [xC, zB]], 13.0, 3.6, { archRise: 3.2 })), { collide: false });
  inn.add('plaster', sy(vaultSmooth([[xC, tN + T / 2], [xCh, tN + T / 2], [xCh, zA], [xC, zA]], 12.0, 2.5, { archRise: 2.5 })), { collide: false });
  inn.add('plaster', sy(vaultSmooth([[xC, zB], [xCh, zB], [xCh, zS - T / 2], [xC, zS - T / 2]], 5.2, 1.8, { archRise: 1.9 })), { collide: false });
  inn.add('plaster', sy(vaultSmooth([[xCh, chN + T / 2], [xA, chN + T / 2], [xA, chS - T / 2], [xCh, chS - T / 2]], 12.6, 2.4, { archRise: 2.4 })), { collide: false });
  {
    const pts = []; for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i / 10 * Math.PI; pts.push([xA + Math.cos(a) * (APSE_R - 0.55), zc + Math.sin(a) * (APSE_R - 0.55)]); }
    inn.add('plaster', sy(vaultSmooth(pts, 12.3, 2.6, { archRise: 0, center: [xA, zc] })), { collide: false });
  }
  // the crossing's south bay is aisle-high: close the crossing above its
  // arcade, as the clerestory walls do along the nave (no sky between the
  // low bay vault and the crossing arch)
  inn.add('churchIn', sy(wall([xC, zB], [xCh, zB], 5.2, 12.9, 0.9)));
  // and the transept's west wall continues above the north aisle's vault
  inn.add('churchIn', sy(wall([xC, zA], [xC, zN], 5.2, C.naveH, 0.9)));
  // the arch between the choir vault and the apse's half-dome hides their seam
  inn.add('churchIn', sy(wall([xA, chN + T / 2], [xA, chS - T / 2], 12.2, 15.4, 0.7, [{ t: chZ - T / 2, w: 2 * chZ - T - 0.9, y0: 0, y1: 0, arch: 'round' }])), { collide: false });
  // crossing arches
  for (const [a, b] of [[[xC, zA], [xC, zB]], [[xCh, zA], [xCh, zB]], [[xC, zA], [xCh, zA]], [[xC, zB], [xCh, zB]]]) {
    inn.add('churchIn', sy(wall(a, b, 12.5, 16.9, 1.2, [{ t: 3.7, w: 6.2, y0: 0, y1: 0, arch: 'round' }])), { collide: false });
  }
  // floor with the skull-altar opening and the crypt stair behind the high altar
  const skull = { x0: SKULL_CHAPEL - 0.72, x1: SKULL_CHAPEL + 0.72, z0: zN - 1.6, z1: zN - 0.55 };
  const cryptHole = [[xA + 0.2, zc - 0.62], [xA + 3.8, zc - 0.62], [xA + 3.8, zc + 0.62], [xA + 0.2, zc + 0.62]];
  const floorPoly = [[x0 + 0.2, zN], [xC, zN], [xC, tN], [xCh, tN], [xCh, chN], [xA, chN], ...apsePts.slice(1, -1), [xA, chS], [xA - 0.4, zS], [x0 + 0.2, zS]];
  inn.add('ashlar', prism(floorPoly, y0 - 0.5, y0, { holes: [cryptHole] }));
  // chapels in the north aisle: small apses with altars
  CHAPELS.forEach((cx, i) => {
    const pts = []; for (let k = 0; k <= 8; k++) { const a = Math.PI + k / 8 * Math.PI; pts.push([cx + Math.cos(a) * 2.05, zN + Math.sin(a) * 2.05]); }
    for (let k = 0; k < 8; k++) {
      const low = cx === SKULL_CHAPEL && (k === 3 || k === 4);
      ex.add('church', wall(pts[k], pts[k + 1], low ? 1.95 : -0.5, 5.6, 0.7));
    }
    ex.add('roof', pyramidRoof([...pts.map(p => [p[0], p[1]])], 5.5, 7.2, { over: 0.35, peak: [cx, zN] }));
    const inner = pts.map(p => [cx + (p[0] - cx) * 0.85, zN + (p[1] - zN) * 0.85]);
    if (cx === SKULL_CHAPEL) {
      // the floor stops at the altar: its opening runs right to the apse wall
      const R = 2.05 * 0.85, hx = 0.72, zArc = zN - Math.sqrt(R * R - hx * hx);
      const arc = (a0, a1) => { const o = []; for (let k = 0; k <= 6; k++) { const a = a0 + (a1 - a0) * k / 6; o.push([cx + Math.cos(a) * R, zN + Math.sin(a) * R]); } return o; };
      const aL = Math.PI + Math.acos(hx / R) * 0 + (Math.PI / 2 - Math.asin(hx / R)) * 0;
      const angL = Math.atan2(zArc - zN, -hx), angR = Math.atan2(zArc - zN, hx);
      inn.add('ashlar', prism([[cx - R, zN - 0.55], ...arc(Math.PI, angL + 2 * Math.PI).map(p => p), [cx - hx, zN - 0.55]], y0 - 0.5, y0));
      inn.add('ashlar', prism([[cx + hx, zN - 0.55], ...arc(angR + 2 * Math.PI, 2 * Math.PI), [cx + R, zN - 0.55]], y0 - 0.5, y0));
      inn.add('ashlar', prism([[cx - R, zN], [cx + R, zN], [cx + R, zN - 0.55], [cx - R, zN - 0.55]], y0 - 0.5, y0));
      void aL;
    } else inn.add('ashlar', prism(inner, y0 - 0.5, y0));
    inn.add('plaster', sy(vaultSmooth(inner, 3.6, 1.4, { archRise: 0, center: [cx, zN] })), { collide: false });
    if (cx !== SKULL_CHAPEL) {
      inn.add('churchIn', box(1.3, 1.0, 0.7, { x: cx, y: y0, z: zN - 1.05 }));
      F.candle(inn, cx - 0.4, y0 + 1.0, zN - 1.05, 0.22, emit);
      F.candle(inn, cx + 0.4, y0 + 1.0, zN - 1.05, 0.22);
      F.crucifix(inn, cx, y0 + 1.05, zN - 1.25, 0, 0.6);
    }
  });

  // Virgin on a slender column beside the last chapel before the altar
  {
    const vx = CHAPELS[3] + 2.6, vz = zN + 1.4;
    inn.add('churchIn', cyl(0.12, 0.14, 2.6, 10, { x: vx, y: y0, z: vz }));
    statue(inn, vx, y0 + 2.6, vz, Math.PI / 2, 1.25, true);
    F.candlestick(inn, vx + 0.7, y0, vz + 0.4, 1.0, emit);
    interact({ id: 'virgin', pos: new THREE.Vector3(vx, y0 + 1.6, vz), radius: 2.5, label: 'The stone Virgin, smiling, the Child in her arms' });
  }
  // high altar: golden frontal and panels on every side
  const ax = xCh + 5.4;
  inn.add('ashlar', box(3.8, 0.35, 2.6, { x: ax, y: y0, z: zc }));
  inn.add('gold', box(2.4, 1.05, 1.15, { x: ax, y: y0 + 0.35, z: zc }));
  inn.add('ashlar', box(2.6, 0.12, 1.3, { x: ax, y: y0 + 1.4, z: zc }));
  // the frontal and the side panels: an arcade of little columns and round
  // arches in gilt relief, with a cloth of linen over the mensa
  {
    const arc = [];
    const side = (L, n, place2) => {
      for (let k = 0; k <= n; k++) arc.push(place2(cyl(0.028, 0.028, 0.8, 8, { y: 0.12 }), -L / 2 + k * L / n));
      for (let k = 0; k < n; k++) { const t = new THREE.TorusGeometry(L / n / 2, 0.022, 5, 12, Math.PI); t.translate(0, 0.92, 0); arc.push(place2(t, -L / 2 + (k + 0.5) * L / n)); }
      arc.push(place2(box(L, 0.06, 0.05, { y: 0.02 }), 0), place2(box(L, 0.06, 0.05, { y: 1.0 }), 0));
    };
    side(2.4, 6, (g, t) => place(g, { x: ax + t, y: y0 + 0.35, z: zc - 0.6 }));
    side(2.4, 6, (g, t) => place(g, { x: ax + t, y: y0 + 0.35, z: zc + 0.6 }));
    side(1.15, 3, (g, t) => place(g, { x: ax - 1.22, y: y0 + 0.35, z: zc + t, ry: Math.PI / 2 }));
    side(1.15, 3, (g, t) => place(g, { x: ax + 1.22, y: y0 + 0.35, z: zc + t, ry: Math.PI / 2 }));
    inn.add('gold', merge(arc), { collide: false });
    const cloth = CL.drape(2.6, 1.3, 0.005, { hang: 0.28, seed: 991, rumple: 0.4, foot: true, head: true, floor: -1 });
    cloth.rotateY(0); inn.add('p.linenWhite', place(cloth, { x: ax, y: y0 + 1.52, z: zc }), { collide: false, shadow: false });
  }
  F.candlestick(inn, ax, y0 + 1.52, zc - 0.95, 0.55, emit); F.candlestick(inn, ax, y0 + 1.52, zc + 0.95, 0.55, emit);
  inn.add('gold', merge([box(0.07, 0.95, 0.07, { x: ax + 0.3, y: y0 + 1.52, z: zc }), box(0.07, 0.07, 0.55, { x: ax + 0.3, y: y0 + 2.15, z: zc })]), { collide: false });
  interact({ id: 'altar', pos: new THREE.Vector3(ax, y0 + 1.4, zc), radius: 3, label: 'The high altar, gold on every side' });
  // the rood and the great bronze tripod
  inn.add('woodDark', box(0.25, 0.25, 7.2, { x: xC + 0.3, y: hy(11.6), z: zc }), { collide: false });
  F.crucifix(inn, xC + 0.3, hy(11.6) + 0.25, zc, Math.PI / 2, 3.2);
  // "a single lamp burning on a huge bronze tripod, twice a man's height"
  // (Second Day, Matins): the only light of the choir at night
  {
    const tp = SC.greatTripod(3.4);
    inn.add('bronze', place(tp.bronze, { x: xC - 2.2, y: y0, z: zc }));
    inn.add('fire', sphere(0.11, { x: xC - 2.2, y: y0 + tp.flameY - 0.02, z: zc, sy: 2.1 }, 8, 6), { collide: false, shadow: false });
    inn.add('bronze', lathe([[0, 0], [0.12, 0.01], [0.16, 0.06], [0.1, 0.08], [0, 0.06]], 14, { x: xC - 2.2, y: y0 + tp.flameY - 0.12, z: zc }), { collide: false });   // the lamp in the bowl
    emit({ x: xC - 2.2, y: y0 + tp.flameY + 0.35, z: zc, color: 0xffa050, intensity: 14, distance: 26, flicker: 0.3 });
  }
  // the chandeliers of the choir (Seventh Day: "altars, choir stalls,
  // painted panels, benches, partitions, chandeliers"), hanging unlit: at
  // the night offices only the tripod burns
  for (const cxx of [xC + 3.2, xCh - 1.2]) {
    const co = SC.corona(0.85, 8, hy(11.2) - y0 - 3.6);
    inn.add('iron', place(co.iron, { x: cxx, y: y0 + 3.6, z: zc }), { collide: false });
    inn.add('bronze', place(co.cups, { x: cxx, y: y0 + 3.6, z: zc }), { collide: false });
  }
  interact({ id: 'tripod', pos: new THREE.Vector3(xC - 2.2, 2.0, zc), radius: 3, label: 'The great bronze tripod that burns all night' });
  // choir stalls: sixty monks in facing rows (CHURCH: individual stalls).
  // Two tiers a side: the upper row with its high panelled back and canopy
  // rail; the lower row whose low back is the bookboard of the row behind,
  // and its own kneeling desk in front. Seats with misericord ledges, carved
  // knobs on the arm-rests, dividers between the monks.
  for (const s of [-1, 1]) {
    const ry = s < 0 ? 0 : Math.PI;
    const xs = xC + 0.6, xe = xCh + 3.4, L = xe - xs, n = Math.round(L / 0.62), w = L / n;
    for (const [row, off, rise] of [[0, 2.45, 0], [1, 3.35, 0.35]]) {
      const zz = zc + s * off;
      const st = SC.stallRow(n, { w, back: row ? 2.3 : 0.95, platform: 0.2 + rise });
      inn.add('woodDark', place(st.wood, { x: xs + L / 2, y: y0, z: zz, ry }));
      inn.add('wood', place(st.carving, { x: xs + L / 2, y: y0, z: zz, ry }), { collide: false });
      if (row === 0) {
        const dk = SC.stallDesk(L, { h: 0.98 });
        inn.add('woodDark', place(dk, { x: xs + L / 2, y: y0, z: zz - s * 0.66, ry }));
        // psalters on the desks, some open
        for (let k = 0; k < n; k += 3) { const bk = box(0.3, 0.05, 0.22, {}); bk.rotateX(-0.3); inn.add(k % 2 ? 'p.leather' : 'p.vellum', place(bk, { x: xs + (k + 0.5) * w, y: y0 + 1.0, z: zz - s * 0.66, ry }), { collide: false }); }
      }
    }
  }
  F.lectern(inn, xC + 3.8, y0, zc, Math.PI / 2);
  // pulpit on the north side of the nave
  {
    const pz = zA + 0.95, pxp = colX(7);
    inn.add('churchIn', box(1.4, 2.0, 1.4, { x: pxp, y: y0, z: pz }));
    inn.add('churchIn', box(1.6, 1.05, 0.2, { x: pxp, y: y0 + 2.0, z: pz + 0.7 }), { collide: false });
    for (let k = 0; k < 8; k++) inn.add('churchIn', box(0.9, 0.25 * (k + 1), 0.3, { x: pxp + 1.15, y: y0, z: pz - 0.6 + k * 0.28 }), { collide: false });
  }
  // the nave stays open, as in a church of the time; a few plain benches
  // stand along the arcades for the old and the lay folk
  const mid = i => (colX(i) + colX(i + 1)) / 2;
  for (const [bx, bz] of [[mid(2), zA + 0.2], [mid(4), zA + 0.2], [mid(3), zB - 0.2], [mid(5), zB - 0.2]]) F.bench(inn, bx, y0, bz, 0, 2.4);
  // bell ropes hanging from the tower into the crossing
  for (const dz of [-0.6, 0.6]) inn.add('linen', sy(box(0.04, 13.5, 0.04, { x: (xC + xCh) / 2 + dz, y: y0 + 1.1, z: zc + 1.8 })), { collide: false });
  interact({ id: 'bells', pos: new THREE.Vector3((xC + xCh) / 2, 1.5, zc + 1.8), radius: 1.8, label: 'The bell ropes' });

  // F12 (con_000609 H, con_001954 M): the entrance to the bell tower. Adso
  // "looked for the entrance of the bell tower" and rang every rope. A newel
  // stair turret in the crossing's south bay (see bellTowerStair).
  bellTowerStair(inn, ex, M, ctx, xCh, zB, zc, y0);

  // ------------------------------------------------------------------
  // roofs, crossing tower and the new spire
  // ------------------------------------------------------------------
  ex.add('roof', gableRoof(x0 - 0.2, xC, zA - 0.5, zB + 0.5, C.naveH, 19.6, { over: 0.5 }));
  for (const [z0, z1, zo] of [[zN, zA - 0.45, zN], [zB + 0.45, zS, zS]]) {
    // lean-to aisle roofs behind the parapets
    const hi = C.aisleH + 1.9, lo = C.aisleH + 0.45;
    const a = zo === zN ? [z1, hi, z0, lo] : [z0, hi, z1, lo];
    // the south one runs on over the crossing's south bay to the choir wall
    const xe = zo === zS ? xCh : xC;
    ex.add('roof', quad([x0, a[1], a[0]], [xe, a[1], a[0]], [xe, a[3], a[2]], [x0, a[3], a[2]], 0, xe - x0, 0, 4, true), { collide: false });
  }
  ex.add('roof', gableRoof(xC, xCh, tN, zA, C.naveH, 19.4, { over: 0.4, axis: 'z' }));
  ex.add('church', gableEnds(xC, xCh, tN, tN, C.naveH, 19.4, 'z', T));
  ex.add('roof', gableRoof(xCh, xA, chN, chS, C.naveH, 19.2, { over: 0.4 }));
  {
    const pts = []; for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + i / 8 * Math.PI; pts.push([xA + Math.cos(a) * APSE_R, zc + Math.sin(a) * APSE_R]); }
    ex.add('roof', pyramidRoof(pts, C.naveH - 0.6, 18.4, { over: 0.45, peak: [xA, zc] }));
  }
  // crossing tower with belfry
  const tw = 4.6, tH0 = C.naveH, tH1 = 26.5;
  const tp = [[xC - 0.4, zA - 0.75], [xCh + 0.4, zA - 0.75], [xCh + 0.4, zB + 0.75], [xC - 0.4, zB + 0.75]];
  const belfry = {};
  for (let i = 0; i < 4; i++) belfry[i] = [{ t: 2.5, w: 1.3, y0: 7.2, y1: 9.3, arch: 'round' }, { t: 5.9, w: 1.3, y0: 7.2, y1: 9.3, arch: 'round' }];
  ex.add('church', wallLoop(tp, tH0, tH1, 1.0, belfry));
  ex.add('church', wallLoop(tp, tH1 - 0.1, tH1 + 0.35, 1.3));
  for (let i = 0; i < 2; i++) { // bells inside the belfry
    const b = lathe([[0, 0], [0.62, 0], [0.58, 0.12], [0.45, 0.5], [0.38, 0.95], [0.28, 1.08], [0, 1.1]], 16, { x: (xC + xCh) / 2 + (i ? 1.2 : -1.2), y: tH0 + 7.2, z: zc });
    ex.add('bronze', b, { collide: false });
  }
  ex.add('church', box(8.4, 0.3, 8.6, { x: (xC + xCh) / 2, y: tH0 + 6.8, z: zc }), { collide: false });
  // octagonal spire
  const sp = []; for (let i = 0; i < 8; i++) { const a = (i + 0.5) * TAU / 8; sp.push([(xC + xCh) / 2 + Math.cos(a) * tw, zc + Math.sin(a) * tw]); }
  ex.add('slate', pyramidRoof(sp, tH1 + 0.35, C.spireTop, { over: 0.2 }));
  ex.add('iron', merge([cyl(0.04, 0.04, 2.6, 6, { x: (xC + xCh) / 2, y: C.spireTop - 0.3, z: zc }), box(0.9, 0.06, 0.06, { x: (xC + xCh) / 2, y: C.spireTop + 1.7, z: zc })]), { collide: false });
  // corner pinnacles on the tower
  for (const [x, z] of tp) ex.add('slate', pyramidRoof([[x - 0.4, z - 0.4], [x + 0.4, z - 0.4], [x + 0.4, z + 0.4], [x - 0.4, z + 0.4]], tH1 + 0.35, tH1 + 2.6, { over: 0.05 }));

  // ------------------------------------------------------------------
  // the skull altar, the ossuary stair and the passage to the kitchen
  // ------------------------------------------------------------------
  const altar = skullAltarPivot(M, ctx, skull, y0);
  ossuary(und, M, ctx, skull, y0);
  crypt(und, inn, M, ctx, y0, ax);

  // terrain must clear the church floor, crypt and stair hump
  // round the apse the footprint follows its half-circle, so no pits are left
  // in the corners outside it
  const apseFoot = Array.from({ length: 13 }, (_, i) => { const a = -Math.PI / 2 + i / 12 * Math.PI; return [xA + Math.cos(a) * (APSE_R + 0.5), zc + Math.sin(a) * (APSE_R + 0.5)]; });
  const foot = [[x0 - 5.8, zN - 2.2], [xC, zN - 2.2], [xC, tN - 0.6], [xCh, tN - 0.6], [xCh, chN - 0.5], ...apseFoot, [xA, zS + 1.2], [x0 - 5.8, zS + 1.2]];
  ctx.sink(foot, -9, 1.6);
  ctx.sink([[skull.x0 - 0.6, zN - 2.2], [skull.x1 + 0.6, zN - 2.2], [skull.x1 + 0.6, zN - 6.3], [skull.x0 - 0.6, zN - 6.3]], -9, 0.25);
  ctx.anchors.church = { westDoor: [x0 - 3, zc], northDoor: [xCh + 4.0, chN - 1.2], skullChapel: [SKULL_CHAPEL, zN + 1.2], nave: [x0 + 6, zc], choir: [xC + 2, zc], belfry: [(xC + xCh) / 2, hy(C.naveH + 7.2), zc] };

  // F2: the whole exterior shell (walls, windows, portal, roofs, tower,
  // spire) is built at design height and scaled here in one go
  { const seen = new Set([...[...ex.parts.values()].flat(), ...ex.colliders]); for (const g of seen) sy(g); }
  return { batches: [ex, inn, und], altar };
}

// a standing or crowned statue: long robe of folds, head, halo, raised hands
function statue(b, x, y, z, ry, h = 1.9, virgin = false) {
  const prof = [[0, 0], [0.26, 0], [0.24, h * 0.3], [0.2, h * 0.6], [0.17, h * 0.78], [0.12, h * 0.84], [0, h * 0.85]];
  const robe = lathe(prof, 14);
  const p = robe.attributes.position;
  for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)); const r = 1 + Math.sin(a * 9) * 0.06 * (1 - p.getY(i) / h); p.setX(i, p.getX(i) * r); p.setZ(i, p.getZ(i) * r); }
  robe.computeVertexNormals();
  const head = sphere(0.1, { y: h * 0.92 }, 10, 8);
  const parts = [robe, head];
  if (!virgin) {
    parts.push(box(0.07, 0.35, 0.07, { x: 0.16, y: h * 0.62, rz: -0.6 }), box(0.07, 0.35, 0.07, { x: -0.16, y: h * 0.62, rz: 0.6 }));
    parts.push(cyl(0.16, 0.16, 0.02, 14, { y: h * 0.92, z: -0.12, rx: Math.PI / 2 }));
  } else {
    parts.push(sphere(0.12, { x: 0.12, y: h * 0.62, z: 0.1 }, 8, 6)); // the Child
    parts.push(cyl(0.12, 0.1, 0.1, 10, { y: h * 1.0 })); // crown
  }
  const g = merge(parts);
  place(g, { x, y, z, ry });
  b.add(b.name.includes('exterior') ? 'church' : 'churchIn', g);
}

// F12: the entrance to the bell tower (con_000609 H, con_001954 M: Adso
// "looked for the entrance of the bell tower"; the ropes hang in the
// crossing, con_000610 H). RECON: a newel-stair turret in the crossing's
// south bay, behind the south choir stalls and against the SE crossing pier,
// rising beside the tower to the belfry floor; its low arched door opens west
// toward the south aisle, so the crossing and the choir stay free.
function bellTowerStair(inn, ex, M, ctx, xCh, zB, zc, y0) {
  const x1s = xCh - 0.7, x0s = x1s - 4.5;   // west..east (against the SE pier)
  const z0s = zB + 0.35, z1s = zS - T / 2;  // north (behind the stall backs)..south wall
  const wallTh = 0.4;
  const topD = CHURCH.naveH + 6.8;          // belfry floor, design height (turret walls are scaled with ex)
  const top = hy(topD);                     // as built
  const cxr = x1s - 1.3, czr = (z0s + z1s) / 2;   // spiral at the east end, a clear vestibule west of it
  const doorZ = czr;
  ex.add('church', wall([x0s, z0s], [x1s, z0s], y0, topD + 2.6, wallTh));       // north
  ex.add('church', wall([x0s, z1s], [x1s, z1s], y0, topD + 2.6, wallTh));       // south
  ex.add('church', wall([x1s, z0s], [x1s, z1s], y0, topD + 2.6, wallTh));       // east
  ex.add('church', wall([x0s, z0s], [x0s, z1s], y0, topD + 2.6, wallTh, [{ t: (doorZ - z0s), w: 1.2, y0: 0, y1: keepH(y0, 2.4), arch: 'round' }])); // west, with door
  ex.add('slate', pyramidRoof([[x0s - 0.25, z0s - 0.25], [x1s + 0.25, z0s - 0.25], [x1s + 0.25, z1s + 0.25], [x0s - 0.25, z1s + 0.25]], topD + 2.6, topD + 4.4, { over: 0.1 }));
  // base floor and belfry landing
  inn.add('ashlar', prism([[x0s, z0s], [x1s, z0s], [x1s, z1s], [x0s, z1s]], y0 - 0.4, y0));
  inn.add('ashlar', prism([[x1s - 2.5, z0s], [x1s, z0s], [x1s, z1s], [x1s - 2.5, z1s]], top - 0.3, top), { collide: false });
  // the newel stair, its first tread toward the vestibule
  const sp = spiral(cxr, czr, 0.24, 1.1, y0 + 0.05, top, Math.PI, (top - y0) / 2.1);
  inn.add('ashlar', sp.geo, { collide: false });
  inn.collider(sp.ramp, 'stone');
  // the door register: outward normal points west, into the south aisle
  const dx = x0s - wallTh / 2 - 0.05, dz = doorZ;
  ctx.door({ id: 'church:belltower', building: 'church', x: dx, z: dz, nx: -1, nz: 0, y: y0, w: 1.2, th: wallTh, noSteps: true });
  ctx.interact({ id: 'belltower', pos: new THREE.Vector3(dx - 0.7, y0 + 1.2, dz), radius: 2.0, label: 'The stair to the bell tower' });
  ctx.anchors.belltower = { door: [dx - 1.2, dz], spiral: [cxr, czr], top, a0: Math.PI, turns: (top - y0) / 2.1 };
  void M; void zc;
}

function skullAltarPivot(M, ctx, skull, y0) {
  // the altar block turns about a hidden axis at its west end
  const g = new THREE.Group();
  const w = skull.x1 - skull.x0, d = skull.z1 - skull.z0;
  g.position.set(skull.x0, y0, skull.z1);
  const pivot = new THREE.Group(); g.add(pivot);
  const block = new THREE.Mesh(box(w, 1.05, d, { x: w / 2, z: -d / 2 }), M.churchIn);
  block.castShadow = block.receiveShadow = true;
  // "a stone altar with skull reliefs carved on its base": a row of skulls
  // with deep empty sockets over a heap of shin bones, all cut from the
  // same stone (the fourth from the right is the one whose eyes are pressed)
  const st = ossStock(), carved = [], holes = [];
  // five skulls, each in its own bay of a little arcade: pilasters, a sill
  // and a moulded cornice standing proud of the block so the bays hold
  // shadow; the skulls themselves life-size and in the round
  const nSk = 5, bay = (w - 0.12) / nSk;
  for (let i = 0; i < nSk; i++) {
    const cx = 0.06 + (i + 0.5) * bay, sc = 1.55 - (i % 2) * 0.06;
    const o = { x: cx, y: 0.5, z: -0.075, sx: sc, sy: sc, sz: sc, ry: (i - 2) * 0.06, rx: -0.08 };
    carved.push(place(st.skulls[(i + 2) % st.skulls.length].clone(), o));
    holes.push(place(st.shade.clone(), o));
    // the bay's shadowed back, set in
    holes.push(box(bay - 0.07, 0.36, 0.01, { x: cx, y: 0.48, z: -0.035 }));
  }
  for (let i = 0; i <= nSk; i++) carved.push(box(0.055, 0.42, 0.075, { x: 0.06 + i * bay, y: 0.45, z: 0.005 }));
  carved.push(box(w - 0.02, 0.05, 0.09, { x: w / 2, y: 0.42, z: 0.012 }));
  carved.push(box(w + 0.02, 0.08, 0.1, { x: w / 2, y: 0.87, z: 0.018 }));
  for (let i = 0; i < 16; i++) {
    const g = st.long[i % st.long.length].clone(); g.translate(-0.21, 0, 0);
    const k = i % 2 ? 1 : -1, row = Math.floor(i / 4);
    place(g, { x: w / 2 + ((i % 4) - 1.5) * 0.25, y: 0.08 + row * 0.075, z: 0.0, rz: k * (0.28 + (i % 3) * 0.06), ry: (i % 5 - 2) * 0.05, sx: 0.78, sy: 1.25, sz: 1.25 });
    carved.push(g);
  }
  const front = new THREE.Mesh(merge(carved), M.churchIn);
  front.castShadow = front.receiveShadow = true;
  front.add(new THREE.Mesh(merge(holes), M.p.socket));
  front.position.set(0, 0, 0);
  const mensa = new THREE.Mesh(box(w + 0.12, 0.1, d + 0.1, { x: w / 2, y: 1.05, z: -d / 2 }), M.churchIn);
  pivot.add(block, front, mensa);
  ctx.scene.add(g);
  const collider = ctx.addDynamic(pivot, box(w, 1.05, d, { x: w / 2, z: -d / 2 }));
  const state = { open: 0, target: 0, pivot, collider };
  state.update = dt => {
    state.open = THREE.MathUtils.damp(state.open, state.target, 1.6, dt);
    pivot.rotation.y = -state.open * 1.45;
    collider.enabled = state.open < 0.4;
  };
  ctx.interact({ id: 'skull-altar', pos: new THREE.Vector3(skull.x0 + w / 2, y0 + 0.8, skull.z1 + 0.4), radius: 2.0, label: 'An altar carved with skulls above a heap of shin bones', altar: state });
  return state;
}

// ----------------------------------------------------------------------
// Ossuary: "more than ten steps down… a corridor with horizontal niches on
// either side… skulls stacked in pyramids so they would not roll, in one
// niche only hands, fingers interlaced"; at the end steps rise again to an
// iron-clad wooden door behind the kitchen hearth.
// ----------------------------------------------------------------------
function ossuary(b, M, ctx, skull, y0) {
  const cx = (skull.x0 + skull.x1) / 2;
  const n = 12, top = y0, stepH = (top - TUNNEL_Y) / n;
  const zTop = skull.z1 - 0.1, zBot = zN - 6.0;
  const run = (zTop - zBot) / n;
  // steps descending north under the chapel wall
  for (let i = 0; i < n; i++) {
    const zz = zTop - (i + 1) * run, yy = top - (i + 1) * stepH;
    b.add('p.cryptStone', box(1.2, stepH + 0.3, run + 0.02, { x: cx, y: yy - 0.3, z: zz + run / 2 }), { collide: false });
  }
  b.collider(quad([cx - 0.65, top, zTop], [cx + 0.65, top, zTop], [cx + 0.65, TUNNEL_Y, zBot], [cx - 0.65, TUNNEL_Y, zBot], 0, 1, 0, 1, true), 'stoneWet');
  // stair passage: below the chapel floor inside the church, then a low
  // vaulted hump among the graves where it runs under the cemetery
  const stepY = z => top - (zTop - z) / run * stepH;
  for (const s of [-1, 1]) {
    b.add('p.cryptStone', wall([cx + s * 0.9, zN - 0.4], [cx + s * 0.9, zN - 2.3], TUNNEL_Y - 0.1, y0 - 0.5, 0.5));
    const segs = 6;
    for (let i = 0; i < segs; i++) {
      const za = zN - 2.3 - (zN - 2.3 - zBot) * i / segs, zb = zN - 2.3 - (zN - 2.3 - zBot) * (i + 1) / segs;
      b.add('p.cryptStone', wall([cx + s * 0.9, za], [cx + s * 0.9, zb], TUNNEL_Y - 0.1, stepY(za) + 1.5, 0.5));
    }
  }
  {
    const segs = 8;
    for (let i = 0; i < segs; i++) {
      const za = zN - 2.2 - (zN - 2.2 - zBot) * i / segs, zb = zN - 2.2 - (zN - 2.2 - zBot) * (i + 1) / segs;
      b.add('p.cryptStone', barrelSeg(cx, za, zb, stepY(za) + 1.5, stepY(zb) + 1.5, 1.15), { collide: false });
    }
  }
  b.add('p.cryptStone', wall([cx - 0.9, zN - 0.35], [cx + 0.9, zN - 0.35], TUNNEL_Y - 0.1, y0 - 0.5, 0.4));
  // the kitchen descent below the south tower
  {
    const zk0 = AED.z + AED.dT + 2.35, zk1 = AED.z + AED.dT + 6.4;
    const xk = AED.x + AED.ossX;
    for (const s of [-1, 1]) b.add('p.cryptStone', wall([xk + s * 0.95, zk0], [xk + s * 0.95, zk1], TUNNEL_Y - 0.1, AED.y0 - 0.5, 0.5));
    b.add('p.cryptStone', wall([xk - 1.1, zk0], [xk + 1.1, zk0], TUNNEL_Y - 0.1, AED.y0 - 0.5, 0.5));
  }
  // the passage from the chapel stair to the south tower
  const sT = [AED.x + AED.ossX, AED.z + AED.dT + 6.1]; // bottom of the kitchen descent
  const path = OSSUARY_PATH;
  const off = (sgn, dist) => path.map((p, i) => {
    const a = path[Math.max(0, i - 1)], c = path[Math.min(path.length - 1, i + 1)];
    const d0 = i > 0 ? norm2([p[0] - a[0], p[1] - a[1]]) : norm2([c[0] - p[0], c[1] - p[1]]);
    const d1 = i < path.length - 1 ? norm2([c[0] - p[0], c[1] - p[1]]) : d0;
    const n0 = [-d0[1], d0[0]], n1 = [-d1[1], d1[0]];
    const m = norm2([n0[0] + n1[0], n0[1] + n1[1]]);
    const k = dist / Math.max(0.35, m[0] * n1[0] + m[1] * n1[1]);
    return [p[0] + m[0] * k * sgn, p[1] + m[1] * k * sgn];
  });
  const walls = { [-1]: off(-1, 1.2), [1]: off(1, 1.2) };
  // F4: the blind wall on the left near the kitchen end is the sinking door of
  // Jorge's stair when aedLibrary.js built it (ctx.anchors.hiddenStair)
  const hs = ctx.anchors.hiddenStair || null;
  for (let i = 0; i < path.length - 1; i++) tunnelSeg(b, path[i], path[i + 1], i, i === path.length - 2, walls, hs);
  // one continuous vault swept along the whole passage, its sections
  // mitred at the bends onto the same offsets as the walls (the separate
  // barrels overshot each bend and crossed the next corridor as great
  // triangles at eye level)
  b.add('p.cryptStone', sweptVault(path, walls, TUNNEL_Y + 1.55, 0.75, 0.9), { collide: false });
  // bottom of the kitchen stair: the chamber under the tower
  ctx.anchors.ossuary = { chapelBottom: [cx, zBot - 1.2], kitchenEnd: [sT[0], sT[1] + 1.0] };
  ctx.interact({ id: 'ossuary', pos: new THREE.Vector3(path[2][0], TUNNEL_Y + 1.2, path[2][1]), radius: 6, label: 'The ossuary' });
  // the plate below works the lever above (claim_002685): pressing the plaque
  // toggles the hidden stair
  const plq = hs ? [hs.seal[0] + 0.5, hs.seal[1]] : [sT[0] - 0.85, sT[1] + 1.8];
  ctx.interact({ id: 'plaque', pos: new THREE.Vector3(plq[0], TUNNEL_Y + 1.4, plq[1]), radius: 1.8, label: 'A blind wall of squared stones with an old, worn plaque', ...(hs ? { altar: hs.state } : {}) });
}
function barrelSeg(cx, za, zb, ya, yb, r) {
  const pos = [], seg = 16;
  for (let k = 0; k < seg; k++) {
    const a0 = Math.PI * k / seg, a1 = Math.PI * (k + 1) / seg;
    const P = (a, z, y) => [cx + Math.cos(a) * r, y + Math.sin(a) * r, z];
    const A = P(a0, za, ya), B = P(a1, za, ya), Cc = P(a1, zb, yb), D = P(a0, zb, yb);
    pos.push(...A, ...B, ...Cc, ...A, ...Cc, ...D, ...A, ...Cc, ...B, ...A, ...D, ...Cc);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function flipTris(g) {
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i += 3) for (const A of [p, n].filter(Boolean)) {
    const x = A.getX(i + 1), y = A.getY(i + 1), z = A.getZ(i + 1);
    A.setXYZ(i + 1, A.getX(i + 2), A.getY(i + 2), A.getZ(i + 2)); A.setXYZ(i + 2, x, y, z);
  }
  if (n) for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  return g;
}
function norm2(v) { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; }
// a half-round vault (flattened by `flat`) swept through mitred sections
// L[i]..R[i]; the two ends run on `ext` metres along their segments
function sweptVault(path, walls, ySpring, flat, ext) {
  const Ls = walls[-1].map(p => p.slice()), Rs = walls[1].map(p => p.slice());
  const n = path.length;
  const push = (i, j, k) => { const d = norm2([path[j][0] - path[i][0], path[j][1] - path[i][1]]); for (const A of [Ls, Rs]) { A[k][0] += d[0] * ext; A[k][1] += d[1] * ext; } };
  push(1, 0, 0); push(n - 2, n - 1, n - 1);
  const seg = 16, pos = [], uv = [], nor = [];
  const N = [];
  const P = (i, k) => {
    const a = Math.PI * k / seg, L = Ls[i], R = Rs[i], m = [(L[0] + R[0]) / 2, (L[1] + R[1]) / 2], hw = Math.hypot(R[0] - m[0], R[1] - m[1]);
    const c = Math.cos(a), s = Math.sin(a), B = Math.min(hw, 1.25) * flat;
    // the inward normal of the ellipse, so the vault shades smoothly
    const lx = (R[0] - m[0]) / hw, lz = (R[1] - m[1]) / hw, nx = -lx * c / hw, ny = -s / B, nz = -lz * c / hw, nl = Math.hypot(nx, ny, nz);
    N.push([nx / nl, ny / nl, nz / nl]);
    return [m[0] + (R[0] - m[0]) * c, ySpring + s * B, m[1] + (R[1] - m[1]) * c];
  };
  const Q = (i, k) => { const p = P(i, k); nor.push(...N.pop()); return p; };
  let along = 0;
  for (let i = 0; i < n - 1; i++) {
    const len = Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]);
    for (let k = 0; k < seg; k++) {
      const u0 = along, u1 = along + len, v0 = k / seg * 3.6, v1 = (k + 1) / seg * 3.6;
      // the inner face, wound toward the passage; then the outer shell for
      // the cutaway views, wound the other way with its normals reversed
      for (const [ii, kk, uu, vv] of [[i, k, u0, v0], [i, k + 1, u0, v1], [i + 1, k + 1, u1, v1], [i, k, u0, v0], [i + 1, k + 1, u1, v1], [i + 1, k, u1, v0]]) { pos.push(...Q(ii, kk)); uv.push(uu, vv); }
      for (const [ii, kk, uu, vv] of [[i, k, u0, v0], [i + 1, k + 1, u1, v1], [i, k + 1, u0, v1], [i, k, u0, v0], [i + 1, k, u1, v0], [i + 1, k + 1, u1, v1]]) { pos.push(...Q(ii, kk)); const l = nor.length; nor[l - 3] *= -1; nor[l - 2] *= -1; nor[l - 1] *= -1; uv.push(uu, vv); }
    }
    along += len;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return g;
}
function tunnelSeg(b, a, c, idx, last, walls, hs = null) {
  const y = TUNNEL_Y, W = 1.7, wallH = 1.55;
  const L = Math.hypot(c[0] - a[0], c[1] - a[1]);
  const d = [(c[0] - a[0]) / L, (c[1] - a[1]) / L], nrm = [-d[1], d[0]];
  const ext = 0.9;
  const a2 = [a[0] - d[0] * ext, a[1] - d[1] * ext], c2 = [c[0] + d[0] * ext, c[1] + d[1] * ext];
  b.add('flag', prism([[a2[0] + nrm[0] * W / 2, a2[1] + nrm[1] * W / 2], [c2[0] + nrm[0] * W / 2, c2[1] + nrm[1] * W / 2], [c2[0] - nrm[0] * W / 2, c2[1] - nrm[1] * W / 2], [a2[0] - nrm[0] * W / 2, a2[1] - nrm[1] * W / 2]], y - 0.3, y));
  const nN = Math.max(1, Math.floor(L / 1.7));
  for (const s of [-1, 1]) {
    const wa = walls[s][idx], wc = walls[s][idx + 1];
    const Lw = Math.hypot(wc[0] - wa[0], wc[1] - wa[1]);
    const ops = [];
    for (let k = 0; k < nN; k++) {
      const t = (k + 0.5) * Lw / nN;
      if (last && s === -1 && k === nN - 1) continue; // the blind wall with the plaque
      ops.push({ t, w: 1.15, y0: 0.45, y1: 1.2, arch: 'round' });
    }
    const doorOps = [];
    if (last && s === -1 && hs) {
      // the doorway closed by the sinking blind wall (F4)
      const wd = [(wc[0] - wa[0]) / Lw, (wc[1] - wa[1]) / Lw];
      const tO = (hs.seal[0] - wa[0]) * wd[0] + (hs.seal[1] - wa[1]) * wd[1];
      doorOps.push({ t: tO, w: 1.15, y0: 0, y1: wallH, arch: 'flat' });
    }
    b.add('p.cryptStone', wall(wa, wc, y, y + wallH, 0.7, [...ops, ...doorOps]));
    // niche backs and their bones
    for (const o of ops) {
      const t = o.t * L / Lw;
      const px = a[0] + d[0] * t + nrm[0] * s * (W / 2 + 0.62), pz = a[1] + d[1] * t + nrm[1] * s * (W / 2 + 0.62);
      const ang = Math.atan2(d[1], d[0]);
      b.add('p.cryptStone', box(1.3, 1.4, 0.2, { x: px + nrm[0] * s * 0.15, y: y + 0.3, z: pz + nrm[1] * s * 0.15, ry: -ang }), { collide: false });
      bones(b, px - nrm[0] * s * 0.18, y + 0.45, pz - nrm[1] * s * 0.18, ang, (idx * 7 + Math.round(t * 3) + (s > 0 ? 1 : 0)) % 4, [-nrm[0] * s, -nrm[1] * s]);
    }
  }
  if (last && !hs) {
    // the blind wall of great squared stones and the plaque of worn monograms
    const t = L - 1.0;
    const px = a[0] + d[0] * t - nrm[0] * (W / 2 + 0.05), pz = a[1] + d[1] * t - nrm[1] * (W / 2 + 0.05);
    const ang = Math.atan2(d[1], d[0]);
    b.add('aedIn', box(1.6, wallH + 0.4, 0.12, { x: px, y, z: pz, ry: -ang }));
    b.add('bronze', box(0.62, 0.42, 0.05, { x: px - nrm[0] * 0.07, y: y + 1.15, z: pz - nrm[1] * 0.07, ry: -ang }), { collide: false });
  }
}
// "bones sorted by kind: skulls in pyramids, long bones, only hands"
// (CHURCH: ossuary). Sculpted skulls (props/sculpt.js), a handful of
// variants turned and scaled so no two neighbours match; long bones
// stacked with their knobbed ends outward as in the charnel houses; the
// small bones of hands heaped and interlaced.
let OSS = null;
function ossStock() {
  if (OSS) return OSS;
  OSS = {
    skulls: [0, 1, 2, 3, 4, 5].map(i => S.skull({ seed: 200 + i })),
    shade: S.skullShadows(),
    long: [0, 1, 2, 3].map(i => S.longBone(0.4 + i * 0.03, { seed: 300 + i })),
    small: [0, 1, 2].map(i => S.smallBone(0.03 + i * 0.012, { seed: 400 + i })),
  };
  return OSS;
}
let ossSeed = 7;
const ossR = () => { ossSeed = (Math.imul(ossSeed, 1664525) + 1013904223) >>> 0; return ossSeed / 4294967296; };
function skull(b, x, y, z, f) {
  const st = ossStock(), k = Math.floor(ossR() * st.skulls.length);
  const ry = Math.atan2(f[0], f[1]) + (ossR() - 0.5) * 0.5, sc = 0.93 + ossR() * 0.14;
  const o = { x, y: y - 0.004, z, ry, rx: (ossR() - 0.5) * 0.18, rz: (ossR() - 0.5) * 0.2, sx: sc, sy: sc, sz: sc };
  b.add(ossR() < 0.3 ? 'p.boneDark' : 'p.bone', place(st.skulls[k].clone(), o), { collide: false });
  b.add('p.socket', place(st.shade.clone(), o), { collide: false, shadow: false });
}
function bones(b, x, y, z, ang, kind, f = [0, 1]) {
  // x, z: the front of the niche sill; f points out of the niche; d along it
  const st = ossStock(), d = [Math.cos(ang), Math.sin(ang)];
  const back = (k) => [x - f[0] * k, z - f[1] * k];
  if (kind === 0 || kind === 2) {
    // skulls in a pyramid, "so they would not roll", two deep
    const rows = [5, 4, 3, 2, 1];
    for (const depth of [0.2, 0.05]) rows.forEach((cnt, r) => {
      if (depth > 0.1 && r > 3) return;
      for (let i = 0; i < cnt; i++) {
        const t = (i - (cnt - 1) / 2) * 0.155 + (ossR() - 0.5) * 0.015;
        const [bx, bz] = back(depth + r * 0.02);
        skull(b, bx + d[0] * t, y + r * 0.118, bz + d[1] * t, f);
      }
    });
  } else if (kind === 1) {
    // long bones packed with their knobbed ends outward, course on course,
    // and a band of skulls laid in the middle of the stack
    const layers = 9, per = 19;
    for (let r = 0; r < layers; r++) {
      if (r === 4) {
        for (let i = 0; i < 6; i++) { const t = (i - 2.5) * 0.16; const [bx, bz] = back(0.08); skull(b, bx + d[0] * t, y + 0.02 + r * 0.034, bz + d[1] * t, f); }
        continue;
      }
      const yy = y + 0.02 + (r > 4 ? r * 0.034 + 0.1 : r * 0.034);
      for (let i = 0; i < per; i++) {
        const g = st.long[Math.floor(ossR() * st.long.length)].clone();
        g.translate(-0.47, 0, 0);            // the outer knob at the sill, the shaft running back
        const t = (i - (per - 1) / 2) * 0.052 + (r % 2) * 0.026 + (ossR() - 0.5) * 0.008;
        const [bx, bz] = back(0.02 + ossR() * 0.03);
        place(g, { x: bx + d[0] * t, y: yy, z: bz + d[1] * t, ry: Math.atan2(-f[1], f[0]) + (ossR() - 0.5) * 0.12, rx: ossR() * 6.28, rz: (ossR() - 0.5) * 0.05 });
        b.add(ossR() < 0.35 ? 'p.boneDark' : 'p.bone', g, { collide: false });
      }
    }
  } else {
    // "in one niche only hands, fingers interlaced"
    for (let i = 0; i < 160; i++) {
      const g = st.small[Math.floor(ossR() * st.small.length)].clone();
      const t = (ossR() - 0.5) * 1.0, h = Math.pow(ossR(), 1.5) * 0.18 * (1 - Math.abs(t) * 1.3);
      const [bx, bz] = back(0.05 + ossR() * 0.35);
      place(g, { x: bx + d[0] * t, y: y + 0.01 + Math.max(0, h), z: bz + d[1] * t, ry: ossR() * 6.3, rx: (ossR() - 0.5) * 1.2, rz: (ossR() - 0.5) * 1.2 });
      b.add(ossR() < 0.4 ? 'p.boneDark' : 'p.bone', g, { collide: false, shadow: false });
    }
  }
}

// Treasury crypt: "a very low vaulted ceiling on thick, rough stone
// columns"; dusty display cases; relics and curiosities.
function crypt(und, inn, M, ctx, y0, ax) {
  const y = -3.0, xa = xCh + 0.6, xb = xA + 0.1, za = zc - 3.8, zb = zc + 3.8;
  und.add('flag', prism([[xa, za], [xb, za], [xb, zb], [xa, zb]], y - 0.3, y));
  und.add('damp', wallLoop([[xa, za], [xb, za], [xb, zb], [xa, zb]], y, -0.1, 0.8, { 1: [{ t: 3.8, w: 1.3, y0: 0, y1: 1.7, arch: 'round' }] }));
  const cols = [[xa + 2.4, zc - 1.9], [xa + 5.0, zc - 1.9], [xa + 2.4, zc + 1.9], [xa + 5.0, zc + 1.9]];
  for (const [cx, cz] of cols) und.add('damp', cyl(0.48, 0.52, 1.8, 10, { x: cx, y, z: cz }));
  const xs = [xa, xa + 2.4, xa + 5.0, xb], zs = [za, zc - 1.9, zc + 1.9, zb];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) und.add('plaster', vaultSmooth([[xs[i], zs[j]], [xs[i + 1], zs[j]], [xs[i + 1], zs[j + 1]], [xs[i], zs[j + 1]]], y + 1.8, 0.85, { archRise: 0.9 }), { collide: false });
  // stair down from behind the high altar, heading west under the apse
  const n = 12, sx0 = xA + 3.8, sx1 = xA + 0.2;
  for (let i = 0; i < n; i++) {
    const x1 = sx0 - (i + 1) * (sx0 - sx1) / n, yy = y0 - (i + 1) * (y0 - y) / n;
    und.add('damp', box((sx0 - sx1) / n + 0.02, 0.4, 1.2, { x: x1 + (sx0 - sx1) / n / 2, y: yy - 0.4, z: zc }), { collide: false });
  }
  und.add('damp', box(0.9, 0.4, 1.2, { x: sx1 - 0.45 + 0.9, y: y - 0.4 + 0.02, z: zc }), { collide: false });
  und.collider(quad([sx0, y0, zc - 0.62], [sx0, y0, zc + 0.62], [sx1, y, zc + 0.62], [sx1, y, zc - 0.62], 0, 1, 0, 1, true), 'stoneWet');
  // parapets round the stairwell; the north one stops short of the top step so
  // one steps in from the north side, behind the altar (claim_002367 k1657 M)
  for (const s of [-1, 1]) und.add('damp', wall([s < 0 ? sx0 - 1.35 : sx0 + 0.3, zc + s * 0.85], [xb - 0.4, zc + s * 0.85], y, y0 + 0.9, 0.45));
  und.add('damp', wall([sx0 - 1.35, zc - 0.85], [sx0 + 0.3, zc - 0.85], y, y0 - 0.02, 0.45));
  und.add('damp', wall([sx0 + 0.3, zc - 0.85], [sx0 + 0.3, zc + 0.85], y, y0 + 0.9, 0.45));
  // the treasure: iron-bound chests with their lids raised, credence
  // tables under cloths bearing reliquaries and plate, and at the centre
  // "a little temple" of lapis columns framing a silver Entombment; the
  // jewel box "inlaid with emeralds and quartz" (CELLAR: treasure vault)
  const cases = [[xa + 1.2, zc - 2.9, 0], [xa + 3.7, zc - 2.9, 0], [xa + 6.2, zc - 2.9, 0], [xa + 1.2, zc + 2.9, 0], [xa + 3.7, zc + 2.9, 0], [xa + 6.2, zc + 2.9, 0], [xa + 3.7, zc, 1]];
  const face = cz => (cz < zc ? 0 : Math.PI);
  cases.forEach(([cx, cz, big], i) => {
    const ry = big ? Math.PI / 2 : face(cz);
    const o = (g, dx = 0, dy = 0, dz = 0, r2 = 0) => { const [ax, az] = [dx * Math.cos(ry) + dz * Math.sin(ry), -dx * Math.sin(ry) + dz * Math.cos(ry)]; return place(g, { x: cx + ax, y: y + dy, z: cz + az, ry: ry + r2 }); };
    if (!big && i % 2 === 1) {
      const ch = SC.chest(1.15, 0.55, 0.55, { open: 1.2 });
      und.add('door', o(ch.wood)); und.add('iron', o(ch.iron), { collide: false });
      und.add('redCloth', o(CL.drape(0.95, 0.4, 0.42, { hang: 0.02, seed: 950 + i, rumple: 1.5, floor: 0.4 })), { collide: false });
      und.add('gold', o(SC.chalice(1.1), -0.2, 0.44, 0), { collide: false });
      und.add('silver', o(SC.ciborium(1), 0.2, 0.44, 0.02), { collide: false });
      return;
    }
    const cr = SC.credence(big ? 1.6 : 1.3, 0.62, 0.92);
    und.add('woodDark', o(cr.wood)); und.add(big ? 'redCloth' : 'p.linenWhite', o(cr.cloth), { collide: false, shadow: false });
    const top = 0.94;
    if (big) {
      // the little temple (BOOK, the treasury visit: "an elegant little
      // temple with two columns of lapis lazuli and gold, framing an
      // Entombment of Christ in thin silver in half relief; above it, on
      // veined variegated porphyry, a cross inlaid with thirteen diamonds;
      // its little base worked in agate and rubies in the shape of a
      // scallop shell"). The same relief faces both ways.
      const T = treasureMats(M), b0 = top + 0.075;
      und.add('p.agate', o(scallop(0.3, 0.07), 0, top, 0), { collide: false });
      const rub = []; for (let k = 0; k < 7; k++) { const a = Math.PI * (0.12 + 0.76 * k / 6); rub.push(o(sphere(0.009, { x: Math.cos(a) * 0.12, y: 0.045 + Math.sin(a) * 0.02, z: -Math.sin(a) * 0.1 + 0.03 }, 6, 4))); }
      und.add('p.ruby', merge(rub), { collide: false, shadow: false });
      und.add('gold', merge([o(box(0.52, 0.02, 0.17, {}), 0, b0 - 0.02, 0), o(box(0.56, 0.035, 0.2, {}), 0, b0 + 0.43, 0),
        o(prism([[-0.28, 0], [0.28, 0], [0, -0.1]], -0.09, 0.09).rotateX(Math.PI / 2), 0, b0 + 0.465, 0),
        ...[-0.22, 0.22].flatMap(x => [o(cyl(0.042, 0.046, 0.035, 12, {}), x, b0, 0), o(cyl(0.046, 0.036, 0.04, 12, {}), x, b0 + 0.39, 0)])]), { collide: false });
      und.add('p.lapis', merge([-0.22, 0.22].map(x => o(cyl(0.026, 0.03, 0.355, 12, {}), x, b0 + 0.035, 0))), { collide: false });
      und.add('silver', o(box(0.36, 0.25, 0.03, {}), 0, b0 + 0.08, 0), { collide: false });
      for (const side of [-1, 1]) { const pl = new THREE.PlaneGeometry(0.34, 0.234); if (side < 0) pl.rotateY(Math.PI); und.add('p.entombment', o(pl, 0, b0 + 0.08 + 0.125, side * 0.0162), { collide: false, shadow: false }); }
      void T;
      // the cross of thirteen stones on its porphyry, above the pediment
      und.add('p.porphyry', o(box(0.15, 0.2, 0.03, {}), 0, b0 + 0.56, 0), { collide: false });
      und.add('gold', merge([o(box(0.024, 0.15, 0.036, {}), 0, b0 + 0.585, 0), o(box(0.1, 0.024, 0.036, {}), 0, b0 + 0.66, 0)]), { collide: false });
      const dia = []; for (let k = 0; k < 13; k++) { const vtc = k < 8; const q = vtc ? [0, b0 + 0.597 + k * 0.0175] : [-0.04 + (k - 8) * 0.02, b0 + 0.672]; for (const sd of [-1, 1]) dia.push(o(sphere(0.0065, { x: q[0], y: q[1], z: sd * 0.019 }, 6, 4))); }
      und.add('glass', merge(dia), { collide: false, shadow: false });
      const jb = SC.jewelBox();
      und.add('woodDark', o(jb.wood, 0.55, top, 0.05, 0.3), { collide: false }); und.add('gold', o(jb.gold, 0.55, top, 0.05, 0.3), { collide: false });
      und.add('stained.2', o(jb.green, 0.55, top, 0.05, 0.3), { collide: false }); und.add('glass', o(jb.quartz, 0.55, top, 0.05, 0.3), { collide: false });
    } else {
      const k = SC.chasse(0.42, 0.2, 0.2);
      und.add('gold', o(k.gold, -0.3, top, 0), { collide: false }); und.add('stained.2', o(k.stones, -0.3, top, 0), { collide: false });
      und.add('silver', o(SC.armReliquary(1.1), 0.25, top, -0.05), { collide: false });
      und.add('gold', o(SC.chalice(1), 0.48, top, 0.12), { collide: false });
    }
  });
  for (const [cx, cz] of [[xa + 0.3, zc - 1.0], [xa + 0.3, zc + 1.0]]) F.torch(und, cx, y + 1.3, cz, Math.PI / 2, ctx.emit);
  ctx.interact({ id: 'treasury', pos: new THREE.Vector3(xa + 3.7, y + 1.2, zc), radius: 4.2, label: 'The treasury crypt' });
  ctx.anchors.crypt = [xa + 3.7, zc];
  void ax; void M;
}

// the treasury's precious materials (relief maps made once)
function treasureMats(M) {
  const P = M.p || (M.p = {});
  if (P.entombment) return P;
  const R = entombmentRelief();
  P.entombment = new THREE.MeshStandardMaterial({ color: 0xe2e2e6, map: R.map, normalMap: R.normalMap, normalScale: new THREE.Vector2(1.3, 1.3), metalness: 0.92, roughness: 0.36, envMapIntensity: 1.25 });
  // lapis lazuli: deep blue with flecks of pyrite; porphyry: purple-red
  // with pale veins; agate: warm translucent banding
  const fleck = (base, spots, n, veins) => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 128, 128);
    let sd = 11; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    if (veins) { g.strokeStyle = veins; g.lineWidth = 1.2; for (let k = 0; k < 9; k++) { g.beginPath(); let x = r() * 128, y = r() * 128; g.moveTo(x, y); for (let j = 0; j < 6; j++) { x += (r() - 0.5) * 40; y += r() * 26; g.lineTo(x, y); } g.stroke(); } }
    for (let k = 0; k < n; k++) { g.fillStyle = spots[k % spots.length]; g.fillRect(r() * 128, r() * 128, 1 + r() * 1.5, 1 + r() * 1.5); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  };
  P.lapis = new THREE.MeshStandardMaterial({ map: fleck('#16275e', ['#8c7440', '#1f3578', '#0e1a44', '#25397e'], 420), roughness: 0.34, metalness: 0.05, envMapIntensity: 0.9 });
  P.lapis.map.repeat.set(0.35, 1.2);
  P.porphyry = new THREE.MeshStandardMaterial({ map: fleck('#6a2332', ['#d8b8b0', '#8a3a48'], 180, 'rgba(230,200,190,0.55)'), roughness: 0.25, envMapIntensity: 1.0 });
  P.agate = new THREE.MeshStandardMaterial({ map: fleck('#a8612f', ['#e0a060', '#7a3a18'], 120, 'rgba(240,200,150,0.5)'), roughness: 0.22, envMapIntensity: 1.0 });
  P.ruby = new THREE.MeshStandardMaterial({ color: 0x9c0f22, roughness: 0.12, metalness: 0.1, emissive: 0x2a0005, envMapIntensity: 1.6 });
  return P;
}
// a scallop shell lying open, hinge at the back: ribs radiating in a fan
function scallop(w, h) {
  const g = new THREE.CircleGeometry(w / 2, 40, 0, Math.PI); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z) / (w / 2), a = Math.atan2(-z, x);
    p.setY(i, h * (1 - r * r) * 0.6 + h * 0.4 * r * (0.5 + 0.5 * Math.cos(a * 18)) * 0.25 + 0.012);
    p.setZ(i, z + w * 0.18);
  }
  g.computeVertexNormals();
  return merge([g, cyl(w * 0.46, w * 0.5, 0.012, 24, {}).scale(1, 1, 0.55).translate(0, 0, 0.02)]);
}
