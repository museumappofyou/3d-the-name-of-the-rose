import * as THREE from 'three';
import { HERB_GARDEN, VEG_GARDEN, ORCHARD, P } from '../core/plan.js';
import { Batch, box, cyl, sphere, lathe, merge, place, wall } from '../core/kit.js';
import { rng, withSnow, canvasTex, pbr } from '../core/materials.js';
import { dress } from '../core/weathering.js';
import { baseHeight } from './terrain.js';
import * as F from './furniture.js';

// The working gardens in late November (First Day, Nones): "vegetables and
// medicinal herbs visible through the snow… the good herbs grow in winter
// too" (claim_000304–000306). The book names the vegetables talked of
// (squash, onion, garlic, beans) and those chopped in the kitchen (radish,
// watercress, turnip, carrot), and Severinus's herbs (valerian, burdock,
// frangula, sorrel, marshmallow, coltsfoot, gentian, juniper, elder,
// soapwort…). The botanical garden "follows the curve of the walls round the
// baths, the infirmary and the herb store" (claim_000101–000103), so its
// beds are laid in arcs about that corner. The plots themselves are not
// described: the raised beds, wattle edging, straw mulch, bean poles, tools,
// baskets and heaps are an ambient reconstruction of a fourteenth-century
// monastic hortus in winter, kept deliberately uneven and modest.

function wattleTex() {
  return canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#3b2e22'; g.fillRect(0, 0, w, h);
    const r = rng(9);
    for (let row = 0; row < 9; row++) {
      const y = 8 + row * 13;
      for (let x = -20; x < w + 20; x += 32) {
        const up = (row + Math.floor(x / 32)) % 2;
        const grd = g.createLinearGradient(0, y - 6, 0, y + 6);
        grd.addColorStop(0, '#2a2018'); grd.addColorStop(0.5, `rgb(${104 + r() * 30},${84 + r() * 20},${60 + r() * 16})`); grd.addColorStop(1, '#2a2018');
        g.fillStyle = grd;
        g.beginPath(); g.moveTo(x, y + (up ? 4 : -4)); g.bezierCurveTo(x + 11, y - (up ? 6 : -6), x + 21, y - (up ? 6 : -6), x + 32, y + (up ? 4 : -4)); g.lineTo(x + 32, y + (up ? 10 : 2)); g.bezierCurveTo(x + 21, y + (up ? 0 : 12), x + 11, y + (up ? 0 : 12), x, y + (up ? 10 : 2)); g.fill();
      }
    }
    for (let x = 16; x < w; x += 32) { g.fillStyle = '#4a3a2a'; g.fillRect(x - 3, 0, 6, h); }
  }, { repeat: true });
}

// ---------------------------------------------------------------------------
// beds laid along a centreline: a low domed mound of frozen soil that follows
// the ground, its width wandering, its ends slumped
// ---------------------------------------------------------------------------
function stations(pts, step) {
  const seg = [0];
  for (let i = 1; i < pts.length; i++) seg.push(seg[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = seg[seg.length - 1], n = Math.max(2, Math.round(total / step)), out = [];
  let k = 0;
  for (let j = 0; j <= n; j++) {
    const s = j / n * total;
    while (k < pts.length - 2 && seg[k + 1] < s) k++;
    const f = (s - seg[k]) / Math.max(1e-6, seg[k + 1] - seg[k]);
    out.push([pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f]);
  }
  return out.map((p, j) => {
    const a = out[Math.max(0, j - 1)], b = out[Math.min(out.length - 1, j + 1)], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return { x: p[0], z: p[1], tx: (b[0] - a[0]) / L, tz: (b[1] - a[1]) / L };
  });
}
function stripBed(pts, w, h, { ridged = false, seed = 1 } = {}) {
  const r = rng(seed), st = stations(pts, 0.35), nx = ridged ? 10 : 6, nz = st.length - 1;
  const ph = r() * 6, ph2 = r() * 6;
  const pos = [], uv = [], idx = [];
  const widthAt = v => w * (1 + 0.07 * Math.sin(v * 7 + ph) + 0.04 * Math.sin(v * 17 + ph2)) * (0.86 + 0.14 * Math.min(1, Math.sin(Math.PI * v) * 4));
  for (let j = 0; j <= nz; j++) {
    const { x, z, tx, tz } = st[j], v = j / nz, nxv = tz, nzv = -tx;
    const ez = Math.min(1, Math.sin(Math.PI * v) * 3), wj = widthAt(v);
    for (let i = 0; i <= nx; i++) {
      const u = i / nx, ex = Math.sin(Math.PI * u);
      let y = h * Math.pow(ex, 0.45) * ez;
      if (ridged) y *= 0.5 + 0.5 * Math.abs(Math.sin(u * Math.PI * 3 + r() * 0.3));
      y += (r() - 0.5) * 0.035 * ex;
      const off = (u - 0.5) * (wj + 0.2) + (r() - 0.5) * 0.06 * (1.3 - ex);
      const px = x + nxv * off, pz = z + nzv * off;
      pos.push(px, baseHeight(px, pz) + y - 0.04, pz); uv.push(px, pz);
    }
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  // (along 0..1, across offset in m) -> [x, z]
  const at = (v, off) => {
    const f = Math.min(nz - 1e-6, Math.max(0, v * nz)), j = Math.floor(f), t = f - j, A = st[j], B = st[j + 1];
    const x = A.x + (B.x - A.x) * t, z = A.z + (B.z - A.z) * t, tx = A.tx + (B.tx - A.tx) * t, tz = A.tz + (B.tz - A.tz) * t;
    return [x + tz * off, z - tx * off];
  };
  const len = st.reduce((s, p, j) => j ? s + Math.hypot(p.x - st[j - 1].x, p.z - st[j - 1].z) : 0, 0);
  return { geo: g, at, len, st, widthAt };
}

// ---------------------------------------------------------------------------
// plants, each a small reusable geometry for instancing
// ---------------------------------------------------------------------------
// a leaf blade: a bent, crinkled strip from its base upward
function blade(w, L, { curl = 0.1, crinkle = 0, cup = 0.35, seg = 4 } = {}) {
  const g = new THREE.PlaneGeometry(w, L, 2, seg), p = g.attributes.position;
  for (let k = 0; k < p.count; k++) {
    const x = p.getX(k), y = p.getY(k) + L / 2, q = y / L;
    p.setXYZ(k, x * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, q * 1.2 + 0.1))), y, -q * q * curl * L * 3 + Math.abs(x) * cup + crinkle * Math.sin(q * 19 + x * 40) * 0.012);
  }
  g.computeVertexNormals();
  return g;
}
// winter kale / colewort: a woody stem, the lower leaves picked, a crinkled
// blue-black rosette at the top
function kale(seed) {
  const r = rng(seed), parts = [], hs = 0.07 + r() * 0.1;
  const st = cyl(0.016, 0.024, hs + 0.04, 5, {}); st.rotateZ((r() - 0.5) * 0.15); parts.push(st);
  const n = 9;
  for (let i = 0; i < n; i++) {
    // outer leaves spread and droop, inner ones stand up
    const a = i * 2.4 + r() * 0.5, q = i / n, tilt = 1.25 - q * 0.8, L = 0.3 - q * 0.12 + r() * 0.06;
    const leaf = blade(0.15 - q * 0.04, L, { curl: 0.1 + (1 - q) * 0.12, crinkle: 1, cup: 0.3 });
    leaf.rotateX(-tilt); leaf.rotateY(a); leaf.translate(0, hs + q * 0.03, 0);
    parts.push(leaf);
  }
  return merge(parts);
}
// a cut cabbage: the stump left standing, a few loose outer leaves lolling
function stump(seed) {
  const r = rng(seed), parts = [], h = 0.1 + r() * 0.12;
  const s = cyl(0.028, 0.035, h, 6, {}); s.rotateZ((r() - 0.5) * 0.3); parts.push(s);
  parts.push(cyl(0.03, 0.03, 0.01, 6, { y: h }));
  const n = 1 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const leaf = blade(0.16 + r() * 0.06, 0.18 + r() * 0.08, { curl: -0.05, crinkle: 1, cup: 0.25 });
    leaf.rotateX(-1.25 - r() * 0.25); leaf.rotateY(r() * 6.3); leaf.translate(0, 0.02, 0);
    parts.push(leaf);
  }
  if (r() < 0.4) { const sp = sphere(0.035, { y: h + 0.02, sy: 0.8 }, 5, 4); parts.push(sp); }
  return merge(parts);
}
function leek(seed) {
  const r = rng(seed), parts = [];
  for (let i = 0; i < 5; i++) {
    const b = blade(0.035, 0.3 + r() * 0.12, { curl: 0.25 + r() * 0.2, cup: 0.5, seg: 5 });
    b.translate(0, 0.1, 0); b.rotateY(i * 1.3 + r() * 0.3); b.rotateZ((r() - 0.5) * 0.3);
    parts.push(b);
  }
  parts.push(cyl(0.017, 0.02, 0.14, 5, {}));
  return merge(parts);
}
// a dead stalk; some with a dry umbel (valerian, fennel), some branched
function stalk(seed) {
  const r = rng(seed), parts = [];
  const h = 0.4 + r() * 0.5;
  const s = cyl(0.006, 0.01, h, 4, {}); s.rotateZ((r() - 0.5) * 0.35); parts.push(s);
  if (r() < 0.6) { const u = cyl(0.07, 0.005, 0.04, 6, { y: h - 0.02 }); u.rotateZ((r() - 0.5) * 0.3); parts.push(u); }
  if (r() < 0.6) { const b = cyl(0.004, 0.006, h * 0.5, 4, { y: h * 0.4 }); b.rotateZ(0.7); parts.push(b); }
  // a bent-over stalk: the frost has broken it
  if (r() < 0.4) { const b = cyl(0.004, 0.006, h * 0.6, 4, {}); b.rotateZ(1.9); b.translate(0, h * 0.55, 0); parts.push(b); }
  return merge(parts);
}
// evergreen sub-shrub (sage, rosemary, thyme, hyssop, rue): woody stems with
// small grey-green leaf tufts, not a ball
function herbBush(seed, s = 1) {
  const r = rng(seed), parts = [];
  const n = 7 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    const a = r() * 6.3, tilt = 0.2 + r() * 0.75, L = (0.16 + r() * 0.16) * s;
    const dx = Math.sin(tilt) * Math.cos(a), dy = Math.cos(tilt), dz = Math.sin(tilt) * Math.sin(a);
    const st = cyl(0.004 * s, 0.008 * s, L, 3, {});
    st.rotateZ(-tilt); st.rotateY(-a); parts.push(st);
    // narrow leaves in tufts along the upper half of each stem
    for (let k = 0; k < 4; k++) {
      const q = 0.4 + k * 0.18, bl = blade(0.022 * s, (0.07 + r() * 0.04) * s, { curl: 0.05, cup: 0.4, seg: 1 });
      bl.rotateX(-0.3 - r() * 0.9); bl.rotateY(r() * 6.3);
      bl.translate(dx * L * q, dy * L * q, dz * L * q);
      parts.push(bl);
    }
  }
  return merge(parts);
}
// a low rosette (sorrel, coltsfoot, marshmallow crowns, turnip tops)
function rosette(seed, s = 1) {
  const r = rng(seed), parts = [];
  if (r() < 0.5) parts.push(sphere(0.045 * s, { y: 0.015, sy: 0.7 }, 6, 4));
  for (let i = 0; i < 6; i++) {
    const l = blade(0.075 * s, 0.13 * s, { curl: -0.02, cup: 0.25, crinkle: 0.5, seg: 2 });
    l.rotateX(-1.3 + r() * 0.3); l.rotateY(i * 1.05 + r() * 0.4); parts.push(l);
  }
  return merge(parts);
}
// burdock: great leaves blackened by the frost, lying flat; a dead stalk of burrs
function burdock(seed) {
  const r = rng(seed), parts = [];
  for (let i = 0; i < 4; i++) {
    const l = blade(0.3, 0.4, { curl: -0.03, crinkle: 1, cup: 0.12, seg: 3 });
    l.rotateX(-1.45 + r() * 0.2); l.rotateY(i * 1.6 + r() * 0.5); l.translate(0, 0.02, 0); parts.push(l);
  }
  const h = 0.7 + r() * 0.3, s = cyl(0.008, 0.012, h, 4, {}); s.rotateZ(0.12); parts.push(s);
  for (let k = 0; k < 5; k++) parts.push(sphere(0.022, { x: 0.04 * Math.cos(k * 2) + 0.06, y: h * (0.75 + k * 0.05), z: 0.04 * Math.sin(k * 2) }, 4, 3));
  return merge(parts);
}
// a young juniper at a bed end
function juniper(seed) {
  const r = rng(seed), parts = [cyl(0.02, 0.03, 0.2, 5, {})];
  // several leaning, ragged sprays rather than one cone
  for (let i = 0; i < 6; i++) {
    const a = r() * 6.3, h = 0.35 + r() * 0.45, lean = 0.1 + r() * 0.25;
    const c = cyl(0.015, 0.07 + r() * 0.05, h, 6, {}); c.rotateZ(lean); c.rotateY(a); c.translate(Math.cos(a) * 0.05, 0.05 + r() * 0.1, Math.sin(a) * 0.05);
    parts.push(c);
  }
  return merge(parts);
}

// ---------------------------------------------------------------------------
export function buildGardens(M, ctx) {
  const ex = new Batch('gardens');
  const r = rng(131);
  const leafMat = (c, snowy = 0.8, rough = 0.82) => withSnow(new THREE.MeshStandardMaterial({ color: c, roughness: rough, side: THREE.DoubleSide, envMapIntensity: 0.4 }), { minUp: 0.55, strength: snowy });
  M.kale = leafMat(0x2c3a33);             // cavolo nero: blue-black winter leaves
  M.cabbage = leafMat(0x6b7556, 0.6);     // loose outer leaves, yellowing
  M.leek = leafMat(0x4c5b4b, 0.5);
  M.deadStalk = withSnow(new THREE.MeshStandardMaterial({ color: 0x5a4a38, roughness: 0.95 }), { minUp: 0.6, strength: 0.6 });
  M.herb = leafMat(0x69705f, 0.9, 0.9);   // sage, rosemary, thyme: grey-green, dusted with snow
  M.juniper = leafMat(0x28362b, 0.9, 0.9);
  M.burdock = leafMat(0x3e3b2a, 0.5, 0.9);
  M.turnipLeaf = leafMat(0x44503a, 0.7);
  M.strawExt = withSnow(M.straw.clone(), { minUp: 0.4, strength: 0.8 });
  const wt = wattleTex();
  M.wattle = withSnow(new THREE.MeshStandardMaterial({ map: wt, roughness: 0.95, color: 0xb8a890 }), { minUp: 0.5, strength: 0.9 });
  // tilled earth: darker than the yard soil, the snow patchy on it where the
  // clods break the crust
  const soil = pbr('soil', { scale: 2.0, color: 0xc4ae94 });
  soil.roughnessMap = null; soil.aoMapIntensity = 1;
  M.bedSoil = dress(soil, { snow: 0.9, minUp: 0.45, macro: 0.35, rough: 0.96, wet: 0.25 });
  // dung and compost: dark, wet, warm enough to keep the snow off
  M.dung = withSnow(new THREE.MeshStandardMaterial({ color: 0x3b2e22, roughness: 0.8, envMapIntensity: 0.3 }), { minUp: 0.7, strength: 0.25 });

  const inst = { kale: [], stump: [], leek: [], stalk: [], herb: [], herbBig: [], rosette: [], burdock: [], juniper: [] };
  const plant = (kind, x, z, s = 1, y) => inst[kind].push({ x, z, y: y ?? baseHeight(x, z), s: s * (0.85 + r() * 0.3), ry: r() * Math.PI * 2 });
  const work = [];   // places where a gardener might dig or gather

  // low woven edging along one side of a bed, with its stakes
  const wattleSide = (bd, side, lo = 0, hi = 1) => {
    const n = bd.st.length - 1, i0 = Math.floor(lo * n), i1 = Math.ceil(hi * n), top = 0.07 + r() * 0.1;
    let prev = null;
    for (let i = i0; i <= i1; i += 2) {
      const v = Math.min(1, i / n), p = bd.at(v, side * (bd.widthAt(v) / 2 + 0.14));
      if (prev) {
        const y0 = Math.min(baseHeight(...prev), baseHeight(...p));
        ex.add('wattle', wall(prev, p, y0 - 0.1, y0 + top, 0.035), { collide: false });
        ex.add('beamExt', cyl(0.016, 0.02, top + 0.2 + r() * 0.08, 4, { x: p[0], y: y0 - 0.12, z: p[1], rz: (r() - 0.5) * 0.15 }), { collide: false, shadow: false });
      }
      prev = p;
    }
  };
  // plank edging (a few older beds)
  const plankSide = (bd, side) => {
    const a = bd.at(0.02, side * (bd.widthAt(0.5) / 2 + 0.12)), b = bd.at(0.98, side * (bd.widthAt(0.5) / 2 + 0.12));
    const y0 = Math.min(baseHeight(...a), baseHeight(...b));
    ex.add('beamExt', wall(a, b, y0 - 0.15, y0 + 0.14, 0.045), { collide: false });
  };
  const edge = (bd, kind) => {
    if (kind === 'wattle') { wattleSide(bd, -1); wattleSide(bd, 1); }
    else if (kind === 'half') wattleSide(bd, r() < 0.5 ? -1 : 1, 0.05, 0.6 + r() * 0.4);
    else if (kind === 'plank') { plankSide(bd, -1); plankSide(bd, 1); }
  };
  // plants along a bed in rows
  const sow = (bd, kind, sp, s, v0 = 0, v1 = 1, miss = 0.15) => {
    const w = bd.widthAt(0.5), rows = Math.max(1, Math.round(w / Math.max(0.3, sp * 0.9)));
    for (let i = 0; i < rows; i++) {
      const u = ((i + 0.5) / rows - 0.5) * w * 0.85;
      for (let a = v0 * bd.len + sp * 0.5; a < v1 * bd.len - sp * 0.3; a += sp * (0.8 + r() * 0.4)) {
        if (r() < miss) continue;
        const [x, z] = bd.at(a / bd.len, u + (r() - 0.5) * sp * 0.25);
        plant(kind, x, z, s, baseHeight(x, z) + 0.07);
      }
    }
  };
  const scatter = (bd, kind, n, s = 1) => {
    for (let k = 0; k < n; k++) { const [x, z] = bd.at(0.05 + r() * 0.9, (r() - 0.5) * bd.widthAt(0.5) * 0.8); plant(kind, x, z, s, baseHeight(x, z) + 0.06); }
  };
  // where the bed meets the snow: trodden earth at the ends where the
  // gardener steps in, a scuffed patch along one side, a few dead stems
  // standing in the margin — no clean line of white against black
  const margins = (bd, w) => {
    // (soft single spots: 'spot' is painted as one radial gradient, cheap)
    for (const v of [0, 1]) if (r() < 0.6) { const [x, z] = bd.at(v, (r() - 0.5) * w * 0.6); ctx.ground.push({ kind: 'mud', spot: true, c: [x + (v ? 1 : -1) * 0.35 * (r() - 0.2), z], r: 0.6 + r() * 0.5, a: 0.35 + r() * 0.3 }); }
    if (r() < 0.35) { const side = r() < 0.5 ? -1 : 1, [x, z] = bd.at(0.25 + r() * 0.5, side * (bd.widthAt(0.5) / 2 + 0.35)); ctx.ground.push({ kind: 'mud', spot: true, c: [x, z], r: 0.55 + r() * 0.4, a: 0.3 }); }
    const nStems = Math.floor(r() * 4);
    for (let k = 0; k < nStems; k++) { const side = r() < 0.5 ? -1 : 1, [x, z] = bd.at(r(), side * (bd.widthAt(0.5) / 2 + 0.2 + r() * 0.25)); plant('stalk', x, z, 0.8 + r() * 0.5); }
  };
  const strawOver = (bd, pts, w, s) => {
    const g = stripBed(pts, w * (0.75 + r() * 0.2), 0.22, { seed: s + 500 });
    // the straw lies on top of the bed; lift it a little
    g.geo.translate(0, 0.05, 0);
    ex.add('strawExt', g.geo, { collide: false, shadow: false });
  };

  // --- the vegetable garden -----------------------------------------------------
  // cross paths from the kitchen side and to the well divide it in four
  const V = VEG_GARDEN;
  const pathX = P(262, 0)[0], pathZ = P(0, 206)[1];
  const quads = [
    { x0: V.x0 + 0.8, x1: pathX - 1.4, z0: V.z0 + 1.4, z1: pathZ - 1.5, dir: 'z' },
    { x0: pathX + 1.4, x1: V.x1 - 1.0, z0: V.z0 + 1.4, z1: pathZ - 1.5, dir: 'x' },
    { x0: V.x0 + 0.8, x1: pathX - 1.4, z0: pathZ + 1.5, z1: V.z1 - 1.0, dir: 'x' },
    { x0: pathX + 1.4, x1: V.x1 - 1.0, z0: pathZ + 1.5, z1: V.z1 - 1.0, dir: 'z' },
  ];
  // compost corner and well surround are kept clear
  const [wx, wz] = P(262, 183);
  const hx = V.x0 + 2.6, hz = V.z0 + 2.8;
  const clear = (x, z) => Math.hypot(x - wx, z - wz) < 3.2 || (x < hx + 3.6 && z < hz + 3.4);
  const crops = ['kale', 'kale', 'kale', 'stumps', 'stumps', 'leek', 'leek', 'straw', 'straw', 'dug', 'dug', 'beans', 'garlic', 'turnip', 'stalks', 'fallow'];
  let seed = 1;
  for (const q of quads) {
    const across = q.dir === 'z' ? q.x1 - q.x0 : q.z1 - q.z0, along = q.dir === 'z' ? q.z1 - q.z0 : q.x1 - q.x0;
    const skew = (r() - 0.5) * 0.04;
    const toW = (a, c) => q.dir === 'z' ? [q.x0 + c + (a - along / 2) * skew, q.z0 + a] : [q.x0 + a, q.z0 + c + (a - along / 2) * skew];
    // a trodden alley across the beds, where the gardeners cut through
    const alley = along * (0.35 + r() * 0.3), alleyW = 1.1 + r() * 0.3;
    ctx.paths.push({ w: 0.6, pts: [toW(alley, -0.5), toW(alley, across + 0.5)] });
    let t = 0.2;
    while (t < across - 1.0) {
      const bw = Math.min(across - t - 0.2, 0.95 + r() * 0.65);
      if (bw < 0.8) break;
      const segs = [[0, alley - alleyW / 2], [alley + alleyW / 2, along]];
      for (const [s0, s1] of segs) {
        let a = s0 + r() * 0.5;
        while (a < s1 - 2.0) {
          const L = Math.min(s1 - a, 2.4 + r() * 4.5);
          if (L < 2.0) break;
          const c = t + bw / 2, bend = (r() - 0.5) * 0.3;
          const p0 = toW(a, c + (r() - 0.5) * 0.12), p2 = toW(a + L, c + (r() - 0.5) * 0.12), pm = toW(a + L / 2, c + bend);
          const mid = [(p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2];
          let crop = crops[Math.floor(r() * crops.length)];
          if (clear(mid[0], mid[1]) || clear(p0[0], p0[1]) || clear(p2[0], p2[1])) crop = 'skip';
          if (crop !== 'skip' && crop !== 'fallow') vegBed([p0, pm, p2], bw, crop, seed++);
          a += L + 0.5 + r() * 0.4;
        }
      }
      t += bw + 0.5 + r() * 0.35;
    }
  }
  function vegBed(pts, w, crop, s) {
    const bd = stripBed(pts, w, crop === 'dug' ? 0.2 : 0.12 + r() * 0.08, { ridged: crop === 'dug', seed: s });
    ex.add('bedSoil', bd.geo, { surface: 'frozenSoil', shadow: false });
    const w2 = w / 2 + 0.25, poly = [bd.at(0, -w2), bd.at(1, -w2), bd.at(1, w2), bd.at(0, w2)];
    ctx.plots.push({ kind: 'bed', poly });
    const er = r();
    edge(bd, er < 0.35 ? 'wattle' : er < 0.55 ? 'half' : er < 0.65 ? 'plank' : 'none');
    margins(bd, w);
    // half the bed may be something else: the harvest moves along the rows
    const split = r() < 0.35 ? 0.3 + r() * 0.4 : 1;
    const fill = (c, v0, v1) => {
      if (c === 'kale') sow(bd, 'kale', 0.5, 1, v0, v1, 0.18);
      else if (c === 'stumps') { sow(bd, 'stump', 0.45, 1, v0, v1, 0.25); if (r() < 0.5) sow(bd, 'kale', 0.9, 0.9, v0, v1, 0.6); }
      else if (c === 'leek') sow(bd, 'leek', 0.2, 1, v0, v1, 0.2);
      else if (c === 'garlic') sow(bd, 'leek', 0.18, 0.38, v0, v1, 0.2);
      else if (c === 'turnip') sow(bd, 'rosette', 0.28, 1.1, v0, v1, 0.3);
      else if (c === 'stalks') scatter(bd, 'stalk', Math.round(bd.len * 3 * (v1 - v0)));
      else if (c === 'straw') {
        const i0 = Math.round(v0 * (bd.st.length - 1)), i1 = Math.round(v1 * (bd.st.length - 1));
        const sub = bd.st.slice(i0, i1 + 1).map(p => [p.x, p.z]);
        if (sub.length > 2) strawOver(bd, sub, w, s);
      } else if (c === 'beans') {
        // last summer's bean poles, lashed in tents, the vines dead on them
        for (let a = 0.6; a < bd.len * (v1 - v0) - 0.4; a += 1.1 + r() * 0.35) {
          const [px, pz] = bd.at(v0 + a / bd.len, 0), top = baseHeight(px, pz) + 0.1, poles = [];
          const lean = (r() - 0.5) * 0.12;
          for (let k = 0; k < 4; k++) {
            const ang = k * Math.PI / 2 + 0.4 + r() * 0.2, p = cyl(0.013, 0.018, 1.6 + r() * 0.35, 4, {});
            p.rotateZ(0.2 + lean); p.rotateY(ang); p.translate(px + Math.cos(ang) * 0.3, top - 0.1, pz - Math.sin(ang) * 0.3); poles.push(p);
          }
          ex.add('beamExt', merge(poles), { collide: false });
          for (let k = 0; k < 5; k++) plant('stalk', px + (r() - 0.5) * 0.45, pz + (r() - 0.5) * 0.45, 1.5, top);
        }
      }
    };
    if (crop === 'dug') { if (r() < 0.4) scatter(bd, 'stalk', 3, 0.6); }
    else if (split < 1) { fill(crop, 0, split); fill(r() < 0.5 ? 'stumps' : 'straw', split + 0.04, 1); }
    else fill(crop, 0, 1);
    if (r() < 0.25) { const [x, z] = bd.at(0.5, 0); work.push({ x, z, ry: Math.atan2(pts[2][0] - pts[0][0], pts[2][1] - pts[0][1]), crop }); }
  }
  // the cross paths: trodden to dirty snow and mud
  ctx.paths.push({ w: 1.6, pts: [[V.x1 + 1, pathZ + 0.3], [pathX + 6, pathZ - 0.2], [pathX, pathZ], [V.x0 - 0.5, pathZ + 0.4]] });
  ctx.paths.push({ w: 1.4, pts: [[pathX + 0.2, V.z1 + 0.5], [pathX - 0.3, pathZ + 6], [pathX, pathZ], [wx, wz + 1.5]] });
  ctx.ground.push({ kind: 'mud', c: [wx + 0.6, wz + 1.6], r: 1.1 });

  // the well-head with its bucket; a water butt; the handbarrow and tools
  const wy = baseHeight(wx, wz);
  F.well(ex, wx, wy - 0.1, wz);
  bucket(ex, wx + 1.2, baseHeight(wx + 1.2, wz + 0.6), wz + 0.6);
  F.barrel(ex, wx - 1.5, baseHeight(wx - 1.5, wz - 1.1), wz - 1.1, 1.2);
  ex.add('water', cyl(0.3, 0.3, 0.01, 12, { x: wx - 1.5, y: baseHeight(wx - 1.5, wz - 1.1) + 0.93, z: wz - 1.1 }), { collide: false });
  // tools left by a bed near the kitchen path; a hoe and a rake by the alley
  const tp = [pathX + 3.5, pathZ - 2.1];
  tools(ex, tp[0], baseHeight(...tp), tp[1], 0.3);
  basket(ex, tp[0] + 0.9, baseHeight(tp[0] + 0.9, tp[1] + 0.35), tp[1] + 0.35, 0.28, true);
  hoe(ex, pathX - 2.6, baseHeight(pathX - 2.6, pathZ + 1.9), pathZ + 1.9, 1.3);
  rake(ex, pathX + 2.2, baseHeight(pathX + 2.2, pathZ + 1.25), pathZ + 1.25, 0.05);
  basket(ex, pathX - 3.4, baseHeight(pathX - 3.4, pathZ + 2.3), pathZ + 2.3, 0.3, false);
  handbarrow(ex, V.x1 - 6, baseHeight(V.x1 - 6, V.z0 + 3), V.z0 + 3, 0.2);
  // the compost heap in the far corner, in a three-sided wattle bin
  compost(ex, hx, hz, 0.15);
  // wattle hurdles along the open sides of the garden, gaps where the paths enter
  const hurdle = (a, c) => {
    const L = Math.hypot(c[0] - a[0], c[1] - a[1]), n = Math.max(1, Math.round(L / 2.4));
    for (let i = 0; i < n; i++) {
      const p = [a[0] + (c[0] - a[0]) * i / n, a[1] + (c[1] - a[1]) * i / n], q = [a[0] + (c[0] - a[0]) * (i + 1) / n, a[1] + (c[1] - a[1]) * (i + 1) / n];
      const y0 = Math.min(baseHeight(...p), baseHeight(...q));
      ex.add('wattle', wall(p, q, y0 - 0.2, y0 + 0.9 + (i % 3) * 0.05 - (i % 5 === 2 ? 0.12 : 0), 0.07));
      ex.add('beamExt', cyl(0.04, 0.05, 1.2 + (i % 2) * 0.08, 5, { x: p[0], y: y0 - 0.2, z: p[1], rz: (i % 3 - 1) * 0.04 }), { collide: false });
    }
  };
  hurdle([V.x1, V.z0 + 0.3], [V.x1, pathZ - 1.4]); hurdle([V.x1, pathZ + 1.4], [V.x1, V.z1]);
  hurdle([V.x0 + 0.3, V.z1], [pathX - 1.3, V.z1]); hurdle([pathX + 1.3, V.z1], [V.x1, V.z1]);
  ctx.interact({ id: 'veg-garden', pos: new THREE.Vector3(wx, 1.5, wz), radius: 16, label: 'The vegetable gardens: kale and leeks through the snow, beds put to bed under straw' });

  // --- Severinus's botanical garden -----------------------------------------------
  // beds in arcs about the corner of the baths and the infirmary (RECON after
  // claim_000101–000103: "it follows the curve of the walls")
  const H = HERB_GARDEN, C = [H.x0 - 7, H.z0 - 10];
  const inH = (x, z, m = 0.7) => x > H.x0 + m && x < H.x1 - m && z > H.z0 + m && z < H.z1 - m;
  const ang = (x, z) => Math.atan2(z - C[1], x - C[0]);
  const aMin = ang(H.x1, H.z0) - 0.05, aMax = ang(H.x0, H.z1) + 0.05;
  const radial = [aMin + (aMax - aMin) * 0.36, aMin + (aMax - aMin) * 0.7];   // two alleys out from the buildings
  const rMin = Math.hypot(H.x0 - C[0], H.z0 - C[1]) + 0.6, rMax = Math.hypot(H.x1 - C[0], H.z1 - C[1]);
  const plotR = rMin + (rMax - rMin) * 0.42, plotA = (radial[0] + radial[1]) / 2;  // the gardener's plot
  const herbKinds = ['herb', 'herb', 'herbBig', 'stalks', 'stalks', 'rosette', 'straw', 'burdock', 'mixed'];
  let ring = 0;
  for (let R = rMin; R < rMax; ring++) {
    const bw = 1.0 + r() * 0.45;
    const Rc = R + bw / 2;
    let a = aMin + r() * 0.03;
    while (a < aMax) {
      const L = 2.6 + r() * 2.6, da = L / Rc;
      const a1 = a + da;
      const hitsAlley = radial.some(q => q > a - 0.9 / Rc && q < a1 + 0.9 / Rc);
      const mid = (a + a1) / 2;
      const inPlot = Math.abs(Rc - plotR) < 2.6 && Math.abs(mid - plotA) * Rc < 3.0;
      const pts = [];
      for (let k = 0; k <= 6; k++) { const t = a + da * k / 6, rr = Rc + Math.sin(t * 9 + ring) * 0.08; pts.push([C[0] + Math.cos(t) * rr, C[1] + Math.sin(t) * rr]); }
      const ok = !hitsAlley && !inPlot && pts.every(p => inH(p[0], p[1], 0.8 + bw / 2));
      if (ok && r() > 0.07) herbBed(pts, bw, herbKinds[Math.floor(r() * herbKinds.length)], 300 + seed++);
      if (hitsAlley) { const q = radial.find(q => q > a - 0.9 / Rc && q < a1 + 0.9 / Rc); a = Math.max(a + 0.3 / Rc, q + 0.75 / Rc); }
      else a = a1 + (0.55 + r() * 0.3) / Rc;
    }
    R += bw + 0.55 + r() * 0.3;
  }
  for (const q of radial) ctx.paths.push({ w: 1.2, pts: [[C[0] + Math.cos(q) * (rMin - 1), C[1] + Math.sin(q) * (rMin - 1)], [C[0] + Math.cos(q) * rMax, C[1] + Math.sin(q) * rMax]] });
  function herbBed(pts, w, kind, s) {
    const bd = stripBed(pts, w, 0.16 + r() * 0.06, { seed: s });
    ex.add('bedSoil', bd.geo, { surface: 'frozenSoil', shadow: false });
    const w2 = w / 2 + 0.25;
    ctx.plots.push({ kind: 'bed', poly: [bd.at(0, -w2), bd.at(0.5, -w2), bd.at(1, -w2), bd.at(1, w2), bd.at(0.5, w2), bd.at(0, w2)] });
    edge(bd, r() < 0.7 ? 'wattle' : 'half');
    margins(bd, w);
    if (kind === 'herb') sow(bd, 'herb', 0.55, 1, 0, 1, 0.2);
    else if (kind === 'herbBig') { sow(bd, 'herbBig', 0.8, 1, 0, 1, 0.2); }
    else if (kind === 'stalks') { scatter(bd, 'stalk', Math.round(bd.len * 4), 1.3); scatter(bd, 'rosette', 3, 0.9); }
    else if (kind === 'rosette') sow(bd, 'rosette', 0.35, 1.1, 0, 1, 0.25);
    else if (kind === 'burdock') { sow(bd, 'burdock', 1.1, 1, 0, 1, 0.3); scatter(bd, 'stalk', 4, 1.2); }
    else if (kind === 'straw') strawOver(bd, pts, w, s);
    else { sow(bd, 'herb', 0.6, 0.9, 0, 0.5, 0.25); scatter(bd, 'stalk', 5, 1.2); sow(bd, 'rosette', 0.4, 1.0, 0.55, 1, 0.3); }
    if (r() < 0.18) { const [x, z] = bd.at(r() < 0.5 ? 0.02 : 0.98, 0); plant('juniper', x, z, 0.9 + r() * 0.4); }
    if (r() < 0.2) { const [x, z] = bd.at(0.5, 0); work.push({ x, z, ry: 0, crop: 'herbs' }); }
  }
  {
    const cx = C[0] + Math.cos(plotA) * plotR, cz = C[1] + Math.sin(plotA) * plotR;
    basket(ex, cx, baseHeight(cx, cz), cz, 0.3, true);
    tools(ex, cx + 0.8, baseHeight(cx + 0.8, cz), cz - 0.4, 1.2);
    rake(ex, cx - 0.9, baseHeight(cx - 0.9, cz + 0.8), cz + 0.8, 2.1);
    // a patch dug over, the spade still in it
    const dg = stripBed([[cx - 1.8, cz + 1.4], [cx + 0.4, cz + 1.9]], 1.1, 0.2, { ridged: true, seed: 77 });
    ex.add('bedSoil', dg.geo, { surface: 'frozenSoil', shadow: false });
    work.push({ x: cx - 1.2, z: cz, ry: 0, crop: 'herbs' });
  }
  ctx.interact({ id: 'herb-garden', pos: new THREE.Vector3((H.x0 + H.x1) / 2, 1.5, (H.z0 + H.z1) / 2), radius: 10, label: 'The botanical garden: valerian, burdock, frangula under the snow' });

  // --- the dung heap "in a corner of the orchard where no one passes"
  // (claim_001792, claim_001793): the far corner by the west wall, behind the
  // end of the infirmary, away from the gate and the avenue
  {
    const poly = ORCHARD.poly, cen = poly.reduce((s, p) => [s[0] + p[0] / poly.length, s[1] + p[1] / poly.length], [0, 0]);
    const k = poly.reduce((b, p, i) => (Math.hypot(p[0] + 100, p[1] + 30) < Math.hypot(poly[b][0] + 100, poly[b][1] + 30) ? i : b), 0);
    const c = poly[k], d = Math.hypot(cen[0] - c[0], cen[1] - c[1]);
    const dx = c[0] + (cen[0] - c[0]) / d * 5.5, dz = c[1] + (cen[1] - c[1]) / d * 5.5;
    dungHeap(ex, dx, dz);
    ctx.ground.push({ kind: 'straw', c: [dx + 0.8, dz + 0.6], r: 2.6 });
  }

  // --- instancing ---------------------------------------------------------------------
  const geos = {
    kale: [kale(1), kale(2), kale(3)], stump: [stump(13), stump(14), stump(15)], leek: [leek(4), leek(5)],
    stalk: [stalk(6), stalk(7), stalk(8)], herb: [herbBush(9, 0.9), herbBush(19, 1.0)], herbBig: [herbBush(10, 1.5)],
    rosette: [rosette(11), rosette(12, 1.2)], burdock: [burdock(16)], juniper: [juniper(17)],
  };
  const mats = { kale: M.kale, stump: M.cabbage, leek: M.leek, stalk: M.deadStalk, herb: M.herb, herbBig: M.herb, rosette: M.turnipLeaf, burdock: M.burdock, juniper: M.juniper };
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  let nPlants = 0;
  for (const [kind, list] of Object.entries(inst)) {
    const vs = geos[kind];
    vs.forEach((geo, vi) => {
      const sub = list.filter((_, i) => i % vs.length === vi);
      if (!sub.length) return;
      const im = new THREE.InstancedMesh(geo, mats[kind], sub.length);
      // a slight lean each: nothing in a winter garden stands straight
      sub.forEach((t, i) => { e.set((r() - 0.5) * 0.18, t.ry, (r() - 0.5) * 0.18, 'YXZ'); q.setFromEuler(e); m4.compose(new THREE.Vector3(t.x, t.y, t.z), q, new THREE.Vector3(t.s, t.s * (0.9 + r() * 0.2), t.s)); im.setMatrixAt(i, m4); });
      im.castShadow = kind !== 'stalk' && kind !== 'leek'; im.receiveShadow = true; im.computeBoundingSphere();
      im.name = 'garden:' + kind;
      ctx.scene.add(im);
      nPlants += sub.length;
    });
  }
  ctx.anchors.gardenWork = work;
  return { batches: [ex], plants: nPlants };
}

// small props
export function bucket(b, x, y, z) {
  b.add('woodDark', lathe([[0, 0], [0.16, 0], [0.19, 0.32], [0.17, 0.32], [0.14, 0.03], [0, 0.03]], 12, { x, y, z }));
  b.add('iron', merge([cyl(0.172, 0.172, 0.025, 12, { x, y: y + 0.08, z }, true), cyl(0.188, 0.188, 0.025, 12, { x, y: y + 0.27, z }, true)]), { collide: false });
  const h = new THREE.TorusGeometry(0.18, 0.008, 4, 12, Math.PI); h.translate(x, y + 0.32, z); b.add('iron', h, { collide: false });
}
export function basket(b, x, y, z, s = 0.3, full = false) {
  b.add('wattle', lathe([[0, 0], [s * 0.75, 0], [s, s * 0.9], [s * 0.95, s * 0.95], [s * 0.7, s * 0.1], [0, s * 0.1]], 12, { x, y, z }), { collide: false });
  if (full) b.add('kale', sphere(s * 0.8, { x, y: y + s * 0.75, z, sy: 0.4 }, 8, 5), { collide: false });
}
export function tools(b, x, y, z, ry = 0) {
  // a wooden spade shod with iron and a mattock, leaning on a stake
  const sp = merge([cyl(0.02, 0.022, 1.1, 5, { y: 0.25 }), box(0.2, 0.28, 0.025, { y: 0 }), box(0.14, 0.03, 0.03, { y: 1.33 })]);
  sp.rotateZ(0.32); place(sp, { x, y: y + 0.02, z, ry });
  b.add('beamExt', sp, { collide: false });
  b.add('iron', place(box(0.21, 0.07, 0.03, { y: 0 }).rotateZ(0.32), { x, y, z, ry }), { collide: false });
  const mt = merge([cyl(0.02, 0.022, 1.05, 5, {}), box(0.05, 0.05, 0.32, { y: 1.02, z: 0.08 })]);
  mt.rotateX(0.35); place(mt, { x: x + 0.35, y, z: z + 0.1, ry: ry + 0.6 });
  b.add('beamExt', mt, { collide: false });
  b.add('beamExt', cyl(0.05, 0.06, 1.1, 6, { x: x + 0.25, y: y - 0.2, z: z - 0.25 }), { collide: false });
}
// a hoe stuck upright in the ground
export function hoe(b, x, y, z, ry = 0) {
  const g = merge([cyl(0.018, 0.02, 1.4, 5, { y: -0.05 }), box(0.18, 0.12, 0.02, { y: -0.08, z: 0.06 })]);
  g.rotateX(-0.12); place(g, { x, y, z, ry });
  b.add('beamExt', g, { collide: false });
  b.add('iron', place(box(0.18, 0.11, 0.012, { y: -0.08, z: 0.075 }).rotateX(-0.12), { x, y, z, ry }), { collide: false });
}
// a wooden rake lying on the ground, teeth down
export function rake(b, x, y, z, ry = 0) {
  const parts = [cyl(0.016, 0.018, 1.6, 5, {}).rotateZ(Math.PI / 2 - 0.03), box(0.05, 0.04, 0.42, { x: 0.8 })];
  for (let i = 0; i < 7; i++) parts.push(box(0.012, 0.07, 0.012, { x: 0.8, y: -0.06, z: -0.18 + i * 0.06 }));
  const g = merge(parts); place(g, { x, y: y + 0.08, z, ry });
  b.add('beamExt', g, { collide: false, shadow: false });
}
export function handbarrow(b, x, y, z, ry = 0) {
  const g = merge([box(0.05, 0.05, 2.2, { x: -0.3, y: 0.3 }), box(0.05, 0.05, 2.2, { x: 0.3, y: 0.3 }), box(0.66, 0.04, 0.9, { y: 0.33 }), box(0.66, 0.25, 0.04, { y: 0.35, z: 0.45 }), box(0.66, 0.25, 0.04, { y: 0.35, z: -0.45 }),
    ...[[-0.3, 0.6], [0.3, 0.6], [-0.3, -0.6], [0.3, -0.6]].map(([a, c]) => box(0.05, 0.3, 0.05, { x: a, z: c }))]);
  place(g, { x, y, z, ry }); b.add('beamExt', g, { collide: false });
  b.add('soil', place(sphere(0.35, { y: 0.45, sy: 0.35 }, 8, 5), { x, y, z, ry }), { collide: false });
}
// lumpy mound: overlapping squashed spheres
function mound(b, key, x, y, z, R, h, n, seed, opts = {}) {
  const r = rng(seed), parts = [];
  for (let i = 0; i < n; i++) {
    const a = r() * 6.3, d = Math.sqrt(r()) * R * 0.6, rr = R * (0.35 + r() * 0.35);
    parts.push(sphere(rr, { x: x + Math.cos(a) * d, y: y - rr * 0.35, z: z + Math.sin(a) * d, sy: h / rr * (1 - d / R * 0.6), ry: r() * 3 }, 9, 6));
  }
  b.add(key, merge(parts), opts);
}
// the compost heap in its bin: soil, straw, cabbage leaves and kitchen waste
function compost(b, x, z, ry) {
  const y = baseHeight(x, z);
  const c = Math.cos(ry), s = Math.sin(ry), L = (u, v) => [x + u * c + v * s, z - u * s + v * c];
  for (const [a, d] of [[L(-1.7, -1.5), L(1.7, -1.5)], [L(-1.7, -1.5), L(-1.7, 1.4)], [L(1.7, -1.5), L(1.7, 1.4)]]) {
    b.add('wattle', wall(a, d, y - 0.15, y + 0.85, 0.07));
    for (const p of [a, d]) b.add('beamExt', cyl(0.045, 0.055, 1.15, 5, { x: p[0], y: y - 0.2, z: p[1] }), { collide: false });
  }
  mound(b, 'dung', x, y, z - 0.1, 1.6, 0.75, 6, 41, { surface: 'mud' });
  mound(b, 'strawExt', x + 0.3, y + 0.35, z - 0.3, 1.0, 0.3, 3, 43, { collide: false, shadow: false });
  mound(b, 'kale', x - 0.5, y + 0.45, z + 0.3, 0.45, 0.12, 3, 44, { collide: false, shadow: false });
  // a fork left in the heap
  const f = merge([cyl(0.018, 0.02, 1.3, 5, {}), box(0.2, 0.03, 0.03, { y: 0 })]); f.rotateX(0.3); place(f, { x: x + 0.6, y: y + 0.4, z: z + 0.2, ry: 0.8 });
  b.add('beamExt', f, { collide: false });
}
// the orchard dung heap: dark, steaming, spread with old straw
function dungHeap(b, x, z) {
  const y = baseHeight(x, z);
  mound(b, 'dung', x, y, z, 2.3, 0.9, 8, 51, { surface: 'mud' });
  mound(b, 'strawExt', x + 1.0, y + 0.35, z + 0.8, 0.7, 0.2, 2, 53, { collide: false, shadow: false });
  mound(b, 'dung', x + 2.2, y, z - 1.0, 0.9, 0.35, 3, 55, { collide: false });
}
