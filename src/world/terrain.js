import * as THREE from 'three';
import { AED, P, PATHS, WALL_WEST, WALL_EAST, CHURCH } from '../core/plan.js';
import { shared, pbr, WZ } from '../core/materials.js';
import { pointInPoly } from '../core/library.js';

// "The buildings were arranged around the great courtyard on a gently
// sloping plateau that cut across the mountain top… a soft concavity."
// North of the Aedificium the rock falls away: its north tower "jutted
// out over the precipice". The road reaches the single western gate by a
// goat path winding round the mountain.

// --- deterministic value noise ------------------------------------------
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, o = 5) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * noise(x * f, y * f); f *= 2.03; a *= 0.5; } return s; }
function ridged(x, y, o = 5) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * (1 - Math.abs(noise(x * f, y * f) * 2 - 1)) ** 2; f *= 2.1; a *= 0.5; } return s; }

// the plateau outline: the enclosure wall, pushed out a few metres
const RING = [...WALL_WEST, ...WALL_EAST];
const plateau = RING;
function distToPoly(x, z, poly) {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t));
  }
  return best;
}
function signedDist(x, z) { const d = distToPoly(x, z, plateau); return pointInPoly([x, z], plateau) ? -d : d; }

// the goat path: from the gate it runs west, then winds down round the
// mountain in hairpins toward the valley
// The goat path (F3, HARD). Coming up from the valley the road climbs the
// eastern cliff foot: a bend below the EAST tower, then a lower bend below
// the SOUTH side, then the last bend — a three-way fork under a roof of
// snowy pines. The upper/left branch swings west round the wall to the
// single gate; the right branch (ROAD_SPUR) dead-ends at the straw-and-dung
// refuse slope below the low wall behind the stables, under the east tower.
//   c0551 k1355 H (bend under the E tower), c0083/c0084 k1400/k0537 H (lower
//   bend under the S tower), k1097 H (three-way fork), c0061/c0062
//   k1562/k1563 M (refuse slope). ROAD[0] stays at the gate for spawnOf.
const gate = P(80, 269.5);
export const ROAD = (() => {
  // world coords, index 0 at the gate (top) descending toward the valley
  const pts = [
    [gate[0] + 12, gate[1] - 1], [gate[0] - 6, gate[1] - 1],   // out through the gate, on to the shelf
    [-118, 6], [-116, 34],                                      // swing south, hugging the west wall foot
    [-96, 60], [-64, 74],                                       // round the south-west corner
    [-20, 82], [30, 84],                                        // the last bend / three-way FORK, under snowy pines
    [78, 78], [112, 56],                                        // lower bend below the SOUTH tower
    [128, 8], [122, -34],                                       // climb the eastern cliff foot
    [116, -54],                                                 // the bend below the EAST tower
    [138, -78], [176, -104], [232, -150],                       // down into the valley to the south-east
  ];
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'catmullrom', 0.5);
  return curve.getSpacedPoints(160).map(v => [v.x, v.z]);
})();
// The right branch of the fork: a short dead-end down to the refuse slope
// under the east tower, behind the stables' low wall (c0061/c0062).
export const ROAD_SPUR = (() => {
  const pts = [[30, 84], [58, 60], [82, 30], [100, -8], [106, -34], [104, -52]];
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'catmullrom', 0.5);
  return curve.getSpacedPoints(40).map(v => [v.x, v.z]);
})();
function roadInfo(x, z) {
  let best = Infinity, bi = 0;
  for (let i = 0; i < ROAD.length - 1; i++) {
    const a = ROAD[i], b = ROAD[i + 1], dx = b[0] - a[0], dz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
    const d = Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
    if (d < best) { best = d; bi = i + t; }
  }
  // the spur reads as part of the road for the shelf and the mask
  let sd = Infinity;
  for (let i = 0; i < ROAD_SPUR.length - 1; i++) {
    const a = ROAD_SPUR[i], b = ROAD_SPUR[i + 1], dx = b[0] - a[0], dz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
    sd = Math.min(sd, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t));
  }
  return { d: best, s: bi / (ROAD.length - 1), spur: sd };
}
// descent along the road (0 at the gate). The plateau-hugging stretch to the
// fork stays nearly level; past the east-tower bend it drops into the valley.
const roadY = s => -Math.pow(Math.max(0, (s - 0.42) / 0.58), 1.25) * 210;

// Building footprints where the ground must sink out of sight (floors,
// crypts, the ossuary stair). [poly, depth]
const sinks = [];
export function addSink(poly, depth = -2.5, band = 1.1) { sinks.push({ poly, depth, band }); }

const AEDPOLY = (() => {
  const pts = [];
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2;
    for (let i = -3; i <= 3; i++) {
      const b = a + i * 0.45;
      pts.push([AED.x + Math.cos(b) * (AED.dT + AED.Rt * 0.95), AED.z + Math.sin(b) * (AED.dT + AED.Rt * 0.95)]);
    }
  }
  return pts;
})();

const CX0 = 20, CZ0 = -10;
// height of the land at (x,z), without building sinks
export function baseHeight(x, z) {
  const sd = signedDist(x, z);
  // plateau: a soft concavity
  const inner = 0.35 * fbm(x * 0.02, z * 0.02, 3) - 0.35 + Math.min(0, (z - 10) * 0.004) * -1;
  let h = inner;
  const r = Math.hypot(x - 20, z + 10);
  if (sd > 0) {
    const sdm = Math.max(0, sd - 5 - 4 * noise(x * 0.05, z * 0.05));
    // the mountain falls away toward the valleys, in rocky ledges
    const ledges = (fbm(x * 0.05, z * 0.05, 3) * 5 + Math.abs(noise(x * 0.11, z * 0.11) - 0.5) * 3) * Math.min(1, sdm / 8);
    // spurs and gullies running down the mountain
    const ang = Math.atan2(z - CZ0, x - CX0);
    const spur = (ridged(ang * 2.2 + 11, sdm * 0.004, 3) - 0.35) * 55 * THREE.MathUtils.smoothstep(sdm, 15, 140);
    const rough = (fbm(x * 0.018, z * 0.018, 5) - 0.5) * 26 * Math.min(1, sdm / 50);
    h = inner - (0.34 * sdm + 330 * (1 - Math.exp(-sdm / 700))) - ledges + spur + rough;
    // sheer cliffs to the north and east
    const cliffZ = -60 + 6 * fbm(x * 0.03, 3.1, 3);
    const north = (1 - THREE.MathUtils.smoothstep(z, cliffZ - 4, cliffZ + 8)) * THREE.MathUtils.smoothstep(x, -95, -60);
    const east = THREE.MathUtils.smoothstep(x, 85, 112) * 0.75;
    const cliff = Math.max(north, east) * (1 - THREE.MathUtils.smoothstep(sd, 50, 170));
    if (cliff > 0) h -= cliff * Math.min(60, sdm * 4.5) * (0.85 + 0.3 * noise(x * 0.08, z * 0.08));
  }
  // under the Aedificium's northern half the rock falls sheer
  const dxA = x - AED.x, dzA = z - AED.z;
  if (dzA < -4 && Math.hypot(dxA, dzA) < 60) {
    const k = THREE.MathUtils.smoothstep(-dzA, 4, 18) * (1 - THREE.MathUtils.smoothstep(Math.hypot(dxA, dzA), 40, 60));
    h = Math.min(h, THREE.MathUtils.lerp(h, -55 - 10 * noise(x * 0.1, z * 0.1), k));
  }
  // the mountains around: higher and forested to the north, a lower range
  // to the south facing the sea
  if (r > 380) {
    const f = THREE.MathUtils.smoothstep(r, 380, 3200);
    const nz = -(z + 10) / r;
    const amp = nz > 0 ? 600 + 500 * nz : 420 - 200 * Math.max(0, -nz);
    const m = ridged(x * 0.0007 + 3.3, z * 0.0007 - 1.7, 6) * amp + fbm(x * 0.002, z * 0.002, 4) * 110;
    h += m * f;
    // southward, beyond the range, the land sinks to the sea
    if (z > 1500) h -= THREE.MathUtils.smoothstep(z, 3500, 9000) * 900;
    // far to the west and south-west, blue ranges of lower hills close the
    // horizon beyond the valleys (the sea stays open to the south)
    if (r > 3800 && x < -1500) {
      const k = THREE.MathUtils.smoothstep(r, 3800, 7500) * THREE.MathUtils.smoothstep(-x, 1500, 4500);
      h += k * (ridged(x * 0.00045 - 7.1, z * 0.00045 + 2.3, 5) * 1150 + fbm(x * 0.0012, z * 0.0012, 3) * 180 + 250);
    }
  }
  // the road and its refuse-slope spur carve a shelf down the slope
  if (sd > -6 && r < 600) {
    const ri = roadInfo(x, z);
    if (ri.d < 16 && ri.s < 1) {
      const ry = roadY(ri.s) + inner * 0.2;
      const w = 1 - THREE.MathUtils.smoothstep(ri.d, 3.5, 16);
      h = THREE.MathUtils.lerp(h, ry, w);
    }
    // the spur drops gently to the refuse slope under the east tower
    if (ri.spur < 12) {
      const w = 1 - THREE.MathUtils.smoothstep(ri.spur, 3.0, 12);
      const sy = THREE.MathUtils.lerp(inner - 1, -12, THREE.MathUtils.smoothstep(x, 60, 106));
      h = THREE.MathUtils.lerp(h, Math.min(h, sy), w);
    }
  }
  return h;
}

export function height(x, z) {
  let h = baseHeight(x, z);
  for (const s of sinks) {
    if (!pointInPoly([x, z], s.poly)) continue;
    const d = distToPoly(x, z, s.poly);
    if (d > s.band) h = Math.min(h, s.depth);
  }
  return h;
}

// --- mesh ---------------------------------------------------------------
// A uniform 1.25 m grid for the near disc (the plateau and its slopes) and
// a polar ring of nearly square cells out to the horizon, joined under a
// short skirt so no seam shows.
const CX = 20, CZ = -10, R_NEAR = 215;
export function buildTerrain() {
  const mat = terrainMaterial();
  const group = new THREE.Group();
  group.name = 'terrain';
  // near disc
  {
    const step = 1.25, n = Math.ceil(2 * R_NEAR / step) + 1, x0 = CX - R_NEAR, z0 = CZ - R_NEAR;
    const pos = new Float32Array(n * n * 3);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = x0 + i * step, z = z0 + j * step, k = (j * n + i) * 3;
      const r = Math.hypot(x - CX, z - CZ);
      pos[k] = x; pos[k + 1] = r < R_NEAR + 4 ? height(x, z) : 0; pos[k + 2] = z;
    }
    const idx = [];
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
      const xc = x0 + (i + 0.5) * step - CX, zc = z0 + (j + 0.5) * step - CZ;
      if (xc * xc + zc * zc > (R_NEAR + 2) * (R_NEAR + 2)) continue;
      const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    group.add(meshOf(pos, idx, mat));
  }
  // far ring (polar), starting just inside the near disc as a skirt
  {
    const A = 360, rings = 240, r0 = R_NEAR - 6, r1 = 9500;
    const radii = [];
    let r = r0;
    for (let k = 0; k <= rings && r < r1; k++) { radii.push(r); r += Math.max(1.4, r * (2 * Math.PI / A)); }
    const R = radii.length;
    const pos = new Float32Array(R * A * 3);
    for (let k = 0; k < R; k++) for (let i = 0; i < A; i++) {
      const t = i / A * Math.PI * 2, rr = radii[k];
      const x = CX + Math.cos(t) * rr, z = CZ + Math.sin(t) * rr, q = (k * A + i) * 3;
      pos[q] = x; pos[q + 1] = height(x, z) - (k === 0 ? 1.2 : 0); pos[q + 2] = z;
    }
    const idx = [];
    for (let k = 0; k < R - 1; k++) for (let i = 0; i < A; i++) {
      const a = k * A + i, b = k * A + (i + 1) % A, c = (k + 1) * A + i, d = (k + 1) * A + (i + 1) % A;
      idx.push(a, b, c, b, d, c);
    }
    const far = meshOf(pos, idx, mat);
    // the cells grow to tens of metres out here: the triangle normals would
    // shade every cell as a flat facet. Take the normal from the height field
    // itself, smoothed over about one cell, so the far slopes shade as ground.
    {
      const nrm = far.geometry.attributes.normal;
      for (let k = 1; k < R; k++) {
        const e = Math.max(2, (radii[k] - radii[k - 1]) * 0.8);
        for (let i = 0; i < A; i++) {
          const q = k * A + i, x = pos[q * 3], z = pos[q * 3 + 2];
          const hx = (baseHeight(x + e, z) - baseHeight(x - e, z)) / (2 * e), hz = (baseHeight(x, z + e) - baseHeight(x, z - e)) / (2 * e);
          const l = Math.hypot(hx, 1, hz);
          nrm.setXYZ(q, -hx / l, 1 / l, -hz / l);
        }
      }
      nrm.needsUpdate = true;
    }
    group.add(far);
  }
  return group;
}
function meshOf(pos, idx, mat) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const uv = new Float32Array(pos.length / 3 * 2);
  for (let i = 0; i < pos.length / 3; i++) { uv[i * 2] = pos[i * 3]; uv[i * 2 + 1] = pos[i * 3 + 2]; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  m.receiveShadow = true;
  return m;
}

// collider: only the walkable area (enclosure, road), at 1.5 m
export function terrainCollider() {
  const step = 1.5, x0 = -250, x1 = 140, z0 = -80, z1 = 200;
  const nx = Math.ceil((x1 - x0) / step), nz = Math.ceil((z1 - z0) / step);
  const pos = [];
  const Hc = new Float32Array((nx + 1) * (nz + 1)).fill(NaN), Bc = new Float32Array((nx + 1) * (nz + 1)).fill(NaN);
  const H = (i, j) => { const k = j * (nx + 1) + i; if (Number.isNaN(Hc[k])) Hc[k] = height(x0 + i * step, z0 + j * step); return Hc[k]; };
  const B = (i, j) => { const k = j * (nx + 1) + i; if (Number.isNaN(Bc[k])) Bc[k] = baseHeight(x0 + i * step, z0 + j * step); return Bc[k]; };
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const xa = x0 + i * step, za = z0 + j * step;
    const ri = roadInfo(xa, za);
    const inside = signedDist(xa, za) < 8 || (ri.d < 10 && ri.s < 0.55) || (ri.spur < 8);
    if (!inside) continue;
    const a = [xa, H(i, j), za], b = [xa + step, H(i + 1, j), za], c = [xa, H(i, j + 1), za + step], d = [xa + step, H(i + 1, j + 1), za + step];
    // where the ground has been sunk under a building the floors take over
    const sunk = a[1] < B(i, j) - 0.8 || b[1] < B(i + 1, j) - 0.8 || c[1] < B(i, j + 1) - 0.8 || d[1] < B(i + 1, j + 1) - 0.8;
    if (sunk) continue;
    pos.push(...a, ...c, ...b, ...b, ...c, ...d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

// Ground masks. Mask 1 (R trodden path, G cultivated soil, B cobbles/yard)
// and mask 2 (R mud, G strewn straw, B drift halo round the buildings)
// cover the plateau at ~0.3 m a texel; mask 3 carries frozen puddles (R)
// and the damp drip line at the foot of the walls (G). The terrain shader
// reads them to decide between fresh snow, packed dirty snow, mud, frozen
// soil, cobbles and ice, and footsteps read the same pixels on the CPU.
const extraPaths = [];
export function addPaths(list) { extraPaths.push(...list); }
const MX0 = -150, MZ0 = -120, MSPAN = 300, MS = 1024;
function maskCanvas(S = MS) { const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, S, S); return [c, g]; }
const TX = ([x, z], S = MS) => [(x - MX0) / MSPAN * S, (z - MZ0) / MSPAN * S];
const M_ = (m, S = MS) => m / MSPAN * S;
function pathMask() {
  const [c, g] = maskCanvas();
  const T = q => TX(q);
  g.lineCap = 'round'; g.lineJoin = 'round';
  // R: path, G: cultivated soil, B: cobbles/yard
  for (const p of [...PATHS, ...extraPaths]) {
    g.strokeStyle = 'rgba(255,0,0,0.9)'; g.lineWidth = M_(p.w);
    g.beginPath(); p.pts.forEach((q, i) => { const [a, b] = T(q); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.stroke();
    g.strokeStyle = 'rgba(255,0,0,0.35)'; g.lineWidth = M_(p.w * 1.8); g.stroke();
  }
  // road outside the gate, and the refuse-slope spur under the east tower
  g.strokeStyle = 'rgba(255,0,0,1)'; g.lineWidth = M_(4.2);
  g.beginPath(); ROAD.forEach((q, i) => { const [a, b] = T(q); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.stroke();
  g.strokeStyle = 'rgba(255,0,0,0.85)'; g.lineWidth = M_(3.2);
  g.beginPath(); ROAD_SPUR.forEach((q, i) => { const [a, b] = T(q); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.stroke();
  // yards before the church, around the Aedificium door, the farmyard
  g.fillStyle = 'rgba(255,0,0,.55)';
  const blob = (q, r) => { const [a, b] = T(q); g.beginPath(); g.ellipse(a, b, M_(r), M_(r) * 0.8, 0, 0, 7); g.fill(); };
  blob(P(292, 272), 10); blob(P(395, 182), 6); blob(P(460, 170), 8); blob(P(480, 262), 12); blob(P(520, 300), 10); blob(P(90, 270), 8);
  const tex = new THREE.CanvasTexture(c);
  tex.userData = { x0: MX0, z0: MZ0, span: MSPAN };
  return tex;
}
export function paintPlots(tex, rects, channel = 'g') {
  const c = tex.image, g = c.getContext('2d');
  const { x0, z0, span } = tex.userData, S = c.width;
  g.globalCompositeOperation = 'lighter';
  for (const r of rects) {
    g.fillStyle = channel === 'g' ? 'rgba(0,255,0,1)' : 'rgba(0,0,255,1)';
    if (r.poly) { g.beginPath(); r.poly.forEach((q, i) => { const a = (q[0] - x0) / span * S, b = (q[1] - z0) / span * S; i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.closePath(); g.fill(); continue; }
    const a = (r.x0 - x0) / span * S, b = (r.z0 - z0) / span * S;
    g.fillRect(a, b, (r.x1 - r.x0) / span * S, (r.z1 - r.z0) / span * S);
  }
  g.globalCompositeOperation = 'source-over';
  tex.needsUpdate = true;
}

let maskTex, mask1Tex, mask2Tex, maskData = null;
export function getMask() { return maskTex || (maskTex = pathMask()); }

// features declared by the builders: { kind: 'mud'|'straw'|'ice'|'clear', poly?|c:[x,z], r, w? (rect) }
export function paintGround(features) {
  const [c2, g2] = maskCanvas(), [c3, g3] = maskCanvas(512);
  const fill = (g, f, col, S) => {
    g.fillStyle = col; g.beginPath();
    if (f.poly) f.poly.forEach((q, i) => { const [a, b] = TX(q, S); i ? g.lineTo(a, b) : g.moveTo(a, b); });
    else if (f.rect) { const r = f.rect; const [a, b] = TX([r.x0, r.z0], S); g.rect(a, b, M_(r.x1 - r.x0, S), M_(r.z1 - r.z0, S)); }
    else { const [a, b] = TX(f.c, S); g.ellipse(a, b, M_(f.r, S), M_(f.r * (f.k || 0.8), S), f.a || 0, 0, 7); }
    g.fill();
  };
  // soft, irregular edges: many overlapping translucent blobs
  const blotch = (g, f, rgb, S, n = 1) => {
    const r0 = rng2(f.c ? f.c[0] * 13 + f.c[1] : 7);
    if (f.c) for (let i = 0; i < 6 * n; i++) fill(g, { c: [f.c[0] + (r0() - 0.5) * f.r, f.c[1] + (r0() - 0.5) * f.r], r: f.r * (0.35 + r0() * 0.5), a: r0() * 3 }, `rgba(${rgb},${0.18 + r0() * 0.25})`, S);
  };
  g2.globalCompositeOperation = 'lighter'; g3.globalCompositeOperation = 'lighter';
  // drift halo and drip line round every building footprint
  g2.filter = `blur(${M_(1.6)}px)`;
  for (const s of sinks) { g2.strokeStyle = 'rgba(0,0,200,1)'; g2.lineWidth = M_(3.2); g2.beginPath(); s.poly.forEach((q, i) => { const [a, b] = TX(q); i ? g2.lineTo(a, b) : g2.moveTo(a, b); }); g2.closePath(); g2.stroke(); }
  g2.filter = 'none';
  g3.filter = `blur(${M_(0.35, 512)}px)`;
  for (const s of sinks) { g3.strokeStyle = 'rgba(0,255,0,1)'; g3.lineWidth = M_(1.2, 512); g3.beginPath(); s.poly.forEach((q, i) => { const [a, b] = TX(q, 512); i ? g3.lineTo(a, b) : g3.moveTo(a, b); }); g3.closePath(); g3.stroke(); }
  g3.filter = 'none';
  // the trodden paths turn to mud where the traffic is heaviest
  g2.filter = `blur(${M_(0.6)}px)`;
  for (const f of features) {
    if (f.spot) continue;
    if (f.kind === 'mud') { if (f.c) blotch(g2, f, '255,0,0', MS, 2); else fill(g2, f, 'rgba(230,0,0,0.9)', MS); }
    if (f.kind === 'straw') { if (f.c) blotch(g2, f, '0,255,0', MS, 2); else fill(g2, f, 'rgba(0,200,0,0.8)', MS); }
    if (f.kind === 'ice') fill(g3, f, 'rgba(255,0,0,0.9)', 512);
  }
  g2.filter = 'none';
  // small soft spots (many of them: bed margins) are single radial
  // gradients, no filter — hundreds of blurred blotches overload the canvas
  for (const f of features) {
    if (!f.spot || !f.c) continue;
    const [a, b] = TX(f.c), R = M_(f.r), gr = g2.createRadialGradient(a, b, 0, a, b, R);
    const ch = f.kind === 'straw' ? '0,255,0' : '255,0,0';
    gr.addColorStop(0, `rgba(${ch},${f.a ?? 0.5})`); gr.addColorStop(0.6, `rgba(${ch},${(f.a ?? 0.5) * 0.5})`); gr.addColorStop(1, `rgba(${ch},0)`);
    g2.fillStyle = gr; g2.beginPath(); g2.arc(a, b, R, 0, 7); g2.fill();
  }
  g2.globalCompositeOperation = g3.globalCompositeOperation = 'source-over';
  const m1 = getMask().image;
  maskData = {
    a: m1.getContext('2d').getImageData(0, 0, MS, MS).data,
    b: g2.getImageData(0, 0, MS, MS).data,
    c: g3.getImageData(0, 0, 512, 512).data,
  };
  // pack into two RGBA textures: (path, soil, yard, drip) and (mud, straw, drift, ice)
  const p1 = new Uint8Array(MS * MS * 4), p2 = new Uint8Array(MS * MS * 4);
  for (let j = 0; j < MS; j++) for (let i = 0; i < MS; i++) {
    const k = (j * MS + i) * 4, q = ((j >> 1) * 512 + (i >> 1)) * 4;
    p1[k] = maskData.a[k]; p1[k + 1] = maskData.a[k + 1]; p1[k + 2] = maskData.a[k + 2]; p1[k + 3] = maskData.c[q + 1];
    p2[k] = maskData.b[k]; p2[k + 1] = maskData.b[k + 1]; p2[k + 2] = maskData.b[k + 2]; p2[k + 3] = maskData.c[q];
  }
  const dt = d => { const t = new THREE.DataTexture(d, MS, MS); t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.flipY = false; t.needsUpdate = true; return t; };
  mask1Tex = dt(p1); mask2Tex = dt(p2);
  // the height of the plateau for the wall shader (damp rising from the ground, drifts)
  const N = 256, data = new Uint16Array(N * N * 4);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const h = baseHeight(MX0 + (i + 0.5) / N * MSPAN, MZ0 + (j + 0.5) / N * MSPAN);
    const k = (j * N + i) * 4, hv = THREE.DataUtils.toHalfFloat(h);
    data[k] = data[k + 1] = data[k + 2] = hv; data[k + 3] = THREE.DataUtils.toHalfFloat(1);
  }
  const gt = new THREE.DataTexture(data, N, N, THREE.RGBAFormat, THREE.HalfFloatType);
  gt.magFilter = gt.minFilter = THREE.LinearFilter; gt.needsUpdate = true;
  WZ.tGround.value = gt; WZ.uGround.value.set(MX0, MZ0, MSPAN, 0);
  WZ.tMask.value = mask1Tex; WZ.uMask.value.set(MX0, MZ0, MSPAN);
}
function rng2(seed) { let s = (Math.abs(Math.floor(seed * 1000)) % 2147483646) + 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// What is underfoot out of doors, read from the same masks as the shader.
export function groundAt(x, z, snowCover = 0.42) {
  if (!maskData) return 'snowFresh';
  const u = (x - MX0) / MSPAN, v = (z - MZ0) / MSPAN;
  if (u < 0 || v < 0 || u >= 1 || v >= 1) return snowCover > 0.3 ? 'snowFresh' : 'gravel';
  const i = (Math.floor(v * MS) * MS + Math.floor(u * MS)) * 4, j = (Math.floor(v * 512) * 512 + Math.floor(u * 512)) * 4;
  const A = maskData.a, B = maskData.b, Cc = maskData.c;
  const path = A[i] / 255, soil = A[i + 1] / 255, yard = A[i + 2] / 255, mud = B[i] / 255, straw = B[i + 1] / 255, drift = B[i + 2] / 255, ice = Cc[j] / 255;
  const n = noise(x * 0.7, z * 0.7), n3 = noise(x * 3.1, z * 3.1);
  const slope = Math.hypot(baseHeight(x + 1, z) - baseHeight(x - 1, z), baseHeight(x, z + 1) - baseHeight(x, z - 1)) / 2;
  if (ice > 0.45 && n3 > 0.35) return 'ice';
  if (straw > 0.45) return 'straw';
  const mudK = mud * (0.8 + 0.5 * (n - 0.5)) + Math.max(0, path - 0.8) * 0.4;
  if (mudK > 0.45) return 'mud';
  if (yard > 0.5) return snowCover > 0.55 && n3 > 0.5 ? 'snowPacked' : 'stoneWet';
  if (path > 0.35) return 'snowPacked';
  if (soil > 0.5) return n3 > 0.55 ? 'snowCrust' : 'frozenSoil';
  if (slope > 0.55) return 'gravel';
  if (drift > 0.35) return 'snowFresh';
  return n3 > 0.62 ? 'snowCrust' : 'snowFresh';
}

let strawMap = null;
export function setTerrainStraw(t) { strawMap = t; }
function terrainMaterial() {
  const grass = pbr('grass', { scale: 7 }), rock = pbr('rock', { scale: 9 }), snow = pbr('snow', { scale: 4 }),
    trail = pbr('trail', { scale: 3.5 }), soil = pbr('soil', { scale: 2.6 }), cobble = pbr('cobble', { scale: 2.8 });
  const m = new THREE.MeshStandardMaterial({ map: grass.map, normalMap: grass.normalMap, roughness: 1 });
  const mask = getMask();
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, {
      tRock: { value: rock.map }, tRockN: { value: rock.normalMap }, tSnow: { value: snow.map }, tSnowN: { value: snow.normalMap },
      tTrail: { value: trail.map }, tTrailN: { value: trail.normalMap }, tSoil: { value: soil.map },
      tCobble: { value: cobble.map }, tStraw: { value: strawMap || soil.map },
      tMask: { value: mask1Tex || mask }, tMask2: { value: mask2Tex || mask },
      uMask: { value: new THREE.Vector3(mask.userData.x0, mask.userData.z0, mask.userData.span) },
      uSnow: shared.uSnow, uWet: WZ.uWet,
    });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTP; varying vec3 vTN;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvTP = (modelMatrix*vec4(transformed,1.)).xyz; vTN = normalize(mat3(modelMatrix)*objectNormal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vTP; varying vec3 vTN;
        uniform sampler2D tRock, tRockN, tSnow, tSnowN, tTrail, tTrailN, tSoil, tCobble, tStraw, tMask, tMask2;
        uniform vec3 uMask; uniform float uSnow, uWet;
        float th(vec2 p){ p=fract(p*vec2(233.34,851.73)); p+=dot(p,p+23.45); return fract(p.x*p.y); }
        float tn(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(th(i),th(i+vec2(1,0)),f.x),mix(th(i+vec2(0,1)),th(i+vec2(1,1)),f.x),f.y); }
        float tf(vec2 p){ float s=0.,a=.5; for(int i=0;i<5;i++){ s+=a*tn(p); p*=2.07; a*=.5;} return s; }
        vec4 msk(sampler2D t, vec2 p){ vec2 u = (p - uMask.xy)/uMask.z; return (u.x>0.&&u.x<1.&&u.y>0.&&u.y<1.) ? texture2D(t, u) : vec4(0); }
        float wSnow; float wRock; float wMud; float wPack; float wIce; float wCob; float wSoil; float wStraw; float wPuddle; float wDamp;`)
      .replace('#include <map_fragment>', `
        vec2 wp = vTP.xz;
        float dist = length(vTP - cameraPosition);
        float near = 1. - smoothstep(60., 300., dist);
        // two-scale sampling kills tiling at distance
        vec3 gC = mix(texture2D(map, wp/7.).rgb, texture2D(map, wp/53.).rgb, .45);
        vec3 tw = pow(abs(vTN), vec3(4.)); tw /= (tw.x+tw.y+tw.z);
        vec3 rC = (texture2D(tRock, vTP.zy/9.).rgb*tw.x + texture2D(tRock, vTP.xz/9.).rgb*tw.y + texture2D(tRock, vTP.xy/9.).rgb*tw.z);
        rC = mix(rC, (texture2D(tRock, vTP.zy/47.).rgb*tw.x + texture2D(tRock, vTP.xz/47.).rgb*tw.y + texture2D(tRock, vTP.xy/47.).rgb*tw.z), .45);
        vec3 sC = mix(texture2D(tSnow, wp/4.).rgb, texture2D(tSnow, wp/17.).rgb, .4) * vec3(.95,.97,1.);
        vec3 trC = mix(texture2D(tTrail, wp/3.5).rgb, texture2D(tTrail, wp/13.).rgb, .35);
        vec3 soC = mix(texture2D(tSoil, wp/2.6).rgb, texture2D(tSoil, wp/11.).rgb, .35);
        vec3 cbC = texture2D(tCobble, wp/2.8).rgb;
        float cbA = smoothstep(0.08, 0.5, dot(cbC, vec3(0.33)));
        vec3 stC = texture2D(tStraw, wp/2.2).rgb;
        vec4 mk = msk(tMask, wp), m2 = msk(tMask2, wp), m3 = vec4(m2.a, mk.a, 0., 0.);
        float slope = 1. - vTN.y;
        float n = tf(wp*.05), n2 = tn(wp*.7), n3 = tn(wp*3.1), n4 = tf(wp*.23);
        wRock = smoothstep(.2, .42, slope + (n-.5)*.3);
        // far mountains: forest tone on mid slopes
        vec3 forest = mix(vec3(.12,.15,.1), vec3(.2,.21,.16), tn(wp*.01));
        float far = smoothstep(300., 1400., length(vTP.xz));
        // the wooded flanks of the abbey's own mountain begin much nearer
        float farF = smoothstep(140., 520., length(vTP.xz - vec2(20., -10.)));
        vec3 col = mix(gC*vec3(.62,.64,.56), forest, far*.8);   // winter grass: dun and flattened
        vec3 rG = vec3(dot(rC, vec3(.33))); col = mix(col, mix(rC, rG, .65)*vec3(.82,.85,.88) + vec3(.02), wRock);
        // frozen garden soil: dark, grey with hoar frost in the hollows
        wSoil = mk.g;
        vec3 frozen = soC * vec3(.62,.6,.6) + vec3(.07,.075,.085) * smoothstep(.45, .8, n3);
        col = mix(col, frozen, wSoil);
        // cobbles and yards: snow lodged between the stones
        wCob = mk.b;
        vec3 cob = cbC * vec3(.9,.9,.92);
        col = mix(col, cob, wCob);
        // strewn straw in the farmyard: warm, dry gold over the dirt
        wStraw = clamp(m2.g * (0.75 + 0.6*(n3-.5)), 0., 1.);
        col = mix(col, stC * vec3(1.02,0.92,0.7), wStraw);
        // traffic: trodden paths become packed, dirty snow; the heaviest turn to mud
        float traffic = clamp(mk.r * (0.75 + 0.5*(n2-.5)), 0., 1.);
        wMud = clamp(m2.r * (0.8 + 0.6*(n2-.5)) + smoothstep(.8, 1., traffic) * .45 * (1. - wCob), 0., 1.) * (1. - far);
        wMud = smoothstep(.25, .7, wMud);
        wPuddle = wMud * smoothstep(.62, .78, n4 + n3*.15);
        vec3 mudC = mix(soC*.34, trC*.4, .35 + .3*n3) * vec3(.95,.86,.76);
        mudC = mix(mudC, mudC*.55, wPuddle);
        // the drip line at the wall foot: dark, wet, trampled
        wDamp = m3.g * (1. - wCob*.5);
        col = mix(col, trC*vec3(.45,.42,.4), wDamp*.7);
        // snow: fresh where no one walks, deeper in drifts against the walls
        float alt = smoothstep(-80., 200., vTP.y);
        float cover = uSnow * (1.05 + alt*.6);
        float drift = smoothstep(.1, .6, m2.b) * (1. - smoothstep(.55, .95, m2.b)*.4);
        wSnow = smoothstep(.62 - cover*.55, .8 - cover*.55, (1.-slope*1.9) + (n-.5)*.55 + alt*.25 + drift*.5);
        wSnow = clamp(wSnow*min(1.,uSnow*2.2), 0., 1.);
        // the far mountainsides below the snow line are forest: in late
        // November the firs and bare beeches stand dark through a thin snow
        float fM = farF * smoothstep(.38, .62, tf(wp*.0035) + (n-.5)*.3) * (1. - smoothstep(560., 1150., vTP.y + (n - .5) * 180.)) * (1. - smoothstep(.62, .85, slope));
        vec3 forestSnow = mix(vec3(.16,.19,.17), vec3(.32,.35,.36), smoothstep(.4,.8,tn(wp*.08))) * (.85 + .3*tn(wp*.02));
        col = mix(col, forestSnow, fM);
        wSnow *= 1. - .82 * fM;
        // the thin November snow does not reach the valleys far below
        float low = far * (1. - smoothstep(-480., -180., vTP.y + (n - .5) * 160.));
        vec3 vale = mix(vec3(.3,.29,.22), vec3(.17,.2,.16), smoothstep(.45,.6,tf(wp*.002)));
        col = mix(col, vale, low);
        wSnow *= 1. - low;
        // on garden beds the snow lies in the furrows and hollows only
        wSnow *= 1. - wSoil * smoothstep(.35, .65, n3 + (n2-.5)*.6) * .9;
        // cobbles: snow sits in the joints
        wSnow *= 1. - wCob * (1. - smoothstep(.25, .55, 1. - cbA)) * .85;
        wSnow *= 1. - wStraw*.85;
        wSnow *= 1. - wDamp*.8;
        wPack = traffic * (1. - far) * wSnow;
        vec3 packC = mix(sC*vec3(.74,.72,.69), trC*.78, .22 + .35*smoothstep(.3,.8,n3)) ;
        float fresh = wSnow * (1. - traffic*.95);
        col = mix(col, packC, wPack);
        col = mix(col, sC * mix(1., .86, farF), fresh);   // far snow sits into the haze
        col = mix(col, trC*vec3(.62,.58,.54), traffic*(1.-wSnow)*.8);   // bare trodden earth where the snow has gone
        col = mix(col, mudC, wMud);
        // frozen puddles
        wIce = clamp(m3.r * smoothstep(.35, .6, n3 + (n2-.5)*.4), 0., 1.) * (1. - far);
        col = mix(col, vec3(.44,.5,.56)*(.85+.3*n3), wIce*.85);
        diffuseColor.rgb = col;
      `)
      // aerial perspective: the far valleys and ranges lose their relief into
      // the haze (the fog alone leaves every lit facet of them standing out)
      .replace('#include <fog_fragment>', `#include <fog_fragment>
        #ifdef USE_FOG
        gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, smoothstep(900., 6500., length(vTP.xz - vec2(20., -10.))) * .6);
        #endif`)
      .replace('#include <roughnessmap_fragment>', `float roughnessFactor = .95;
        roughnessFactor = mix(roughnessFactor, mix(.78, .97, farF), wSnow);   // no glint off distant faceted slopes
        roughnessFactor = mix(roughnessFactor, .58, wPack);
        roughnessFactor = mix(roughnessFactor, mix(.72, .45, uWet), wCob);
        roughnessFactor = mix(roughnessFactor, .42, wMud);
        roughnessFactor = mix(roughnessFactor, .1, wPuddle);
        roughnessFactor = mix(roughnessFactor, .07, wIce);
        roughnessFactor = mix(roughnessFactor, .5, wDamp*.6);`)
      .replace('#include <normal_fragment_maps>', `
        vec3 nG = texture2D(normalMap, wp/7.).xyz*2.-1.;
        vec3 nR = (texture2D(tRockN, vTP.zy/9.).xyz*tw.x + texture2D(tRockN, vTP.xz/9.).xyz*tw.y + texture2D(tRockN, vTP.xy/9.).xyz*tw.z)*2.-1.;
        vec3 nS = texture2D(tSnowN, wp/4.).xyz*2.-1.;
        vec3 nT = texture2D(tTrailN, wp/3.5).xyz*2.-1.;
        // cobbles and clods: relief derived from the albedo
        vec3 L3 = vec3(.33);
        float lc = dot(texture2D(tCobble, wp/2.8).rgb, L3), lcx = dot(texture2D(tCobble, wp/2.8 + vec2(.006,0.)).rgb, L3), lcy = dot(texture2D(tCobble, wp/2.8 + vec2(0.,.006)).rgb, L3);
        float ls = dot(texture2D(tSoil, wp/2.6).rgb, L3), lsx = dot(texture2D(tSoil, wp/2.6 + vec2(.008,0.)).rgb, L3), lsy = dot(texture2D(tSoil, wp/2.6 + vec2(0.,.008)).rgb, L3);
        vec3 nC = normalize(vec3((lc-lcx)*9., (lc-lcy)*9., 1.));
        vec3 nSo = normalize(vec3((ls-lsx)*7., (ls-lsy)*7., 1.));
        vec3 mapN = mix(nG, nR*vec3(1.6,1.6,1.), wRock);
        mapN = mix(mapN, nSo*vec3(1.4,1.4,1.), wSoil);
        mapN = mix(mapN, nC*vec3(1.5,1.5,1.), wCob);
        mapN = mix(mapN, nS, wSnow);
        mapN = mix(mapN, nT*vec3(1.2,1.2,1.), wPack*.8);
        mapN = mix(mapN, vec3(nT.xy*.5, 1.), wMud);
        mapN = mix(mapN, vec3(0,0,1), max(wPuddle, wIce));
        mapN = normalize(mapN);
        mapN.xy *= normalScale * (1. - smoothstep(60., 400., dist));
        normal = normalize( tbn * mapN );
      `);
  };
  m.normalScale.set(1.2, 1.2);
  m.customProgramCacheKey = () => 'terrain2';
  return m;
}

// the sea to the south, glimpsed "at ten miles or less" from the bends
export function buildSea() {
  const g = new THREE.PlaneGeometry(60000, 30000);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.MeshStandardMaterial({ color: 0x1a2c38, roughness: 0.55, metalness: 0.0, envMapIntensity: 0.45 });   // a grey winter sea under haze
  const s = new THREE.Mesh(g, m);
  s.position.set(0, -520, 22000);
  s.name = 'sea';
  return s;
}

export { AEDPOLY, signedDist, roadInfo, CHURCH };
