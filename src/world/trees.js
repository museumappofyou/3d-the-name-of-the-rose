import * as THREE from 'three';
import { rng, shared } from '../core/materials.js';
import { makeTreeAtlases } from '../core/barkTex.js';

// Trees of the abbey in late November. Everything is built procedurally
// once, as a handful of variants per species and level of detail, and
// drawn as InstancedMeshes: one geometry per variant carries both its
// bark and its alpha-tested foliage/twig cards, sampled from a shared
// texture atlas, so a variant costs one draw call.
//
//   conifers (silver fir, young fir, spruce, windswept pine): 3 LODs
//   stone pine (umbrella canopy), avenue elms, orchard/garth fruit trees,
//   the cemetery oak, dormant rose bushes.

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);
const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const SOLID = 0, CARD = 1, SKIRT = 2;

// ---------------------------------------------------------------------
// geometry builder: position, normal, uv (tiles or card-local), atlas
// region, and (snow propensity, mode, ambient occlusion)
// ---------------------------------------------------------------------
class Geo {
  constructor() { this.p = []; this.n = []; this.uv = []; this.rg = []; this.k = []; this.ix = []; this.count = 0; }
  v(p, n, u, v, reg, snow, mode, ao) {
    this.p.push(p.x, p.y, p.z); this.n.push(n.x, n.y, n.z); this.uv.push(u, v);
    this.rg.push(reg.r[0], reg.r[1], reg.r[2], reg.r[3]); this.k.push(snow, mode, ao);
    return this.count++;
  }
  q(a, b, c, d) { this.ix.push(a, b, c, a, c, d); }
  get tris() { return this.ix.length / 3; }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('aRegion', new THREE.Float32BufferAttribute(this.rg, 4));
    g.setAttribute('aTree', new THREE.Float32BufferAttribute(this.k, 3));
    // solid (bark) triangles first, alpha-tested cards and skirts after:
    // passes that draw the scene with an override material (the GTAO
    // normal/depth pass) cannot alpha-test the atlas, so they draw only the
    // solid range — see solidOnlyUnderOverride()
    const solid = [], cut = [];
    for (let i = 0; i < this.ix.length; i += 3) {
      const a = this.ix[i];
      (this.k[a * 3 + 1] < 0.5 ? solid : cut).push(this.ix[i], this.ix[i + 1], this.ix[i + 2]);
    }
    const ix = solid.concat(cut);
    g.setIndex(this.count > 65535 ? new THREE.Uint32BufferAttribute(ix, 1) : new THREE.Uint16BufferAttribute(ix, 1));
    g.userData.solidCount = solid.length;
    g.computeBoundingSphere();
    return g;
  }
}

// a tapered tube along a polyline (parallel-transport frames)
function tube(g, pts, rad, { radial = 6, reg, snow = () => 0, ao = () => 1, flare = null, cap = false }) {
  const n = pts.length, T = [], N = [], B = [];
  for (let i = 0; i < n; i++) T.push(pts[Math.min(i + 1, n - 1)].clone().sub(pts[Math.max(i - 1, 0)]).normalize());
  let nn = Math.abs(T[0].y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0);
  nn = V().crossVectors(T[0], nn).normalize();
  for (let i = 0; i < n; i++) {
    if (i > 0) {
      const ax = V().crossVectors(T[i - 1], T[i]), s = ax.length();
      if (s > 1e-6) nn.applyAxisAngle(ax.divideScalar(s), Math.asin(Math.min(1, s)));
      nn.addScaledVector(T[i], -nn.dot(T[i])).normalize();
    }
    N.push(nn.clone()); B.push(V().crossVectors(T[i], nn));
  }
  const circ = TAU * rad[0], base = g.count;
  let s = 0;
  const d = V(), p = V(), nr = V();
  for (let i = 0; i < n; i++) {
    if (i > 0) s += pts[i].distanceTo(pts[i - 1]);
    const dr = (rad[Math.min(i + 1, n - 1)] - rad[Math.max(i - 1, 0)]) / Math.max(1e-4, pts[Math.min(i + 1, n - 1)].distanceTo(pts[Math.max(i - 1, 0)]));
    for (let k = 0; k <= radial; k++) {
      const th = k / radial * TAU;
      d.copy(N[i]).multiplyScalar(Math.cos(th)).addScaledVector(B[i], Math.sin(th));
      const rr = rad[i] * (flare ? flare(s, th) : 1);
      p.copy(pts[i]).addScaledVector(d, rr);
      nr.copy(d).addScaledVector(T[i], -dr).normalize();
      g.v(p, nr, k / radial * circ / reg.su, s / reg.sv, reg, snow(rad[i], nr), SOLID, ao(i / (n - 1), rad[i]));
    }
  }
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < radial; k++) {
    const a = base + i * (radial + 1) + k, b = a + 1, c = b + radial + 1, dd = a + radial + 1;
    g.q(a, b, c, dd);
  }
  if (cap) { // a broken stub: close the end
    const c = g.v(pts[n - 1], T[n - 1], 0.5, 0.5, reg, 0.6, SOLID, 0.8), e = base + (n - 1) * (radial + 1);
    for (let k = 0; k < radial; k++) g.ix.push(e + k, e + k + 1, c);
  }
}

// a card: grid over (s,t) ∈ [0,1]², uv = (s,t) inside the atlas region
function sheet(g, nu, nv, pos, nrm, reg, snow, ao, mode = CARD) {
  const base = g.count;
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const s = i / nu, t = j / nv, p = pos(s, t);
    g.v(p, nrm(s, t, p), s, t, reg, snow(s, t), mode, ao(s, t));
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = base + j * (nu + 1) + i;
    g.q(a, a + 1, a + nu + 2, a + nu + 1);
  }
}

// conical skirts of foliage with ragged hems (far LOD and dense cores)
function skirtCone(g, c, yHem, yTop, R, rTop, sides, reg, r, { snow = 0.9, ao = 1, jag = 0.12, rot = 0, squash = 1 } = {}) {
  const base = g.count, tiles = Math.max(1, Math.round(TAU * R / reg.su));
  const slope = V();
  for (let j = 0; j < 2; j++) for (let k = 0; k <= sides; k++) {
    const th = rot + k / sides * TAU, cx = Math.cos(th), cz = Math.sin(th);
    const jj = j === 0 && k < sides ? 1 + (r() - 0.5) * jag * 2 : 1;
    const rr = (j === 0 ? R * jj : rTop), y = j === 0 ? yHem - (jj - 1) * R * 0.3 : yTop;
    const p = V(c.x + cx * rr, y, c.z + cz * rr * squash);
    slope.set(cx * (yTop - yHem), R - rTop, cz * (yTop - yHem)).normalize();
    g.v(p, slope, k / sides * tiles, j, reg, snow, SKIRT, j ? ao * 0.7 : ao);
  }
  for (let k = 0; k < sides; k++) {
    const a = base + k, b = a + 1, cc = b + sides + 1, d = a + sides + 1;
    g.ix.push(a, d, cc, a, cc, b);
  }
  // seam vertex must repeat the first hem jitter
  const p0 = base * 3, pe = (base + sides) * 3;
  g.p[pe] = g.p[p0]; g.p[pe + 1] = g.p[p0 + 1]; g.p[pe + 2] = g.p[p0 + 2];
}

// ---------------------------------------------------------------------
// conifers
// ---------------------------------------------------------------------
const CONIFERS = {
  // tall silver fir: narrow cone, flat horizontal sprays
  fir: { h: 19, r0: 0.34, base: 0.2, R: 3.6, whorl: 0.62, per: 5, elevLow: -0.12, elevTop: 0.35, droop: 0.12, tipUp: 0, wr: 0.62, fold: 0.13, miss: 0.1, snags: 6, env: q => Math.pow(1 - q, 0.9) * (0.8 + 0.2 * ss(0, 0.2, q)) + 0.05, bark: 'fir', skirt: 'skirt' },
  // young fir: short, full to the ground, dense
  young: { h: 9, r0: 0.16, base: 0.06, R: 2.3, whorl: 0.42, per: 5, elevLow: -0.05, elevTop: 0.45, droop: 0.1, tipUp: 0, wr: 0.66, fold: 0.12, miss: 0.05, snags: 1, env: q => Math.pow(1 - q, 0.95) + 0.06, bark: 'fir', skirt: 'skirt' },
  // Norway spruce: drooping boughs with curtains of hanging branchlets
  spruce: { h: 21, r0: 0.36, base: 0.14, R: 3.9, whorl: 0.66, per: 5, elevLow: -0.3, elevTop: 0.3, droop: 0.32, tipUp: 0.28, wr: 0.5, fold: 0.1, miss: 0.14, snags: 7, curtain: true, env: q => Math.pow(1 - q, 1.05) * (0.85 + 0.15 * ss(0, 0.15, q)) + 0.04, bark: 'fir', skirt: 'skirtB' },
};

function coniferGeo(seed, sp, lod, A) {
  const r = rng(seed), g = new Geo(), R = A.R;
  const { h } = sp, yb = h * sp.base;
  // trunk
  const nT = lod === 0 ? 12 : 5, tp = [], tr = [];
  const lean = V((r() - 0.5) * 0.03, 0, (r() - 0.5) * 0.03);
  for (let i = 0; i <= nT; i++) {
    const q = i / nT, y = -0.6 + q * (h + 0.6);
    tp.push(V(lean.x * y + Math.sin(q * 7 + seed) * 0.04, y, lean.z * y + Math.cos(q * 5 + seed) * 0.04));
    tr.push(Math.max(0.012, sp.r0 * Math.pow(1 - q, 0.8)));
  }
  const axis = y => { const f = Math.min(nT - 1e-6, Math.max(0, (y + 0.6) / (h + 0.6) * nT)), i = Math.floor(f); return tp[i].clone().lerp(tp[i + 1], f - i); };
  const radAt = y => sp.r0 * Math.pow(Math.max(0, 1 - (y + 0.6) / (h + 0.6)), 0.8);
  const ph = r() * TAU;
  if (lod < 2) tube(g, tp, tr, {
    radial: lod === 0 ? 8 : 5, reg: R[sp.bark],
    flare: lod === 0 ? (s, th) => 1 + 0.7 * Math.pow(Math.max(0, 1 - s / 1.5), 2) * (0.7 + 0.3 * Math.cos(5 * th + ph)) : null,
    snow: () => 0.15, ao: q => lerp(0.75, 1, q),
  });
  else tube(g, [tp[0], tp[1]], [tr[0], tr[1] * 0.8], { radial: 4, reg: R[sp.bark], ao: () => 0.8 });

  // dense dark cores (sheltered inner foliage) and, for the far LOD, the
  // whole crown as overlapping tiers
  const tiers = lod === 2 ? 5 : lod === 1 ? 3 : 4;
  const scaleR = lod === 2 ? 1.05 : lod === 1 ? 0.72 : 0.5;
  for (let i = 0; i < tiers; i++) {
    const q0 = i / tiers, q1 = Math.min(1, (i + (lod === 2 ? 1.7 : 1.4)) / tiers);
    const y0 = yb + q0 * (h - yb) - (lod === 2 ? 0.3 : 0), y1 = yb + q1 * (h - yb) + (i === tiers - 1 ? 0.4 : 0);
    const Rr = sp.R * sp.env(q0) * scaleR * (lod === 2 ? 1 : 0.95);
    skirtCone(g, axis(y0), y0 - Rr * sp.droop * 0.8, y1, Rr, lod === 2 && i === tiers - 1 ? 0.02 : Rr * 0.18, lod === 2 ? 10 : 8, R[sp.skirt], r,
      { snow: lod === 2 ? 1.0 : 0.3, ao: lod === 2 ? 1 : 0.55, rot: r() * TAU });
  }
  if (lod === 2) return g.build();

  // whorls of boughs
  let y = yb;
  const outward = (p) => { const a = axis(p.y); return V(p.x - a.x, 0, p.z - a.z); };
  const bough = (b0, az, L, elev, q, level) => {
    const dirH = V(Math.cos(az), 0, Math.sin(az)), side = V(-Math.sin(az), 0, Math.cos(az));
    const ce = Math.cos(elev), se = Math.sin(elev);
    const path = s => b0.clone().addScaledVector(dirH, L * s * ce).addScaledVector(UP, L * (s * se - sp.droop * s * s + sp.tipUp * s * s * s));
    const W = L * sp.wr * (lod === 1 ? 1.25 : 1) + 0.25;
    const roll = (r() - 0.5) * 0.5, across = side.clone().multiplyScalar(Math.cos(roll)).addScaledVector(UP, Math.sin(roll));
    const fold = lod === 0 ? sp.fold : 0;
    const nu = lod === 0 ? 3 : 2, nv = lod === 0 ? 2 : 1;
    // woody bough under the spray (lower, larger branches)
    if (lod === 0 && level === 0 && L > 1.2 && q < 0.65) {
      const pts = [0, 0.3, 0.6, 0.85].map(path), rr = [0.03 + L * 0.012, L * 0.009, L * 0.006, 0.006];
      pts.forEach(p => p.y -= 0.03);
      tube(g, pts, rr, { radial: 3, reg: R[sp.bark], snow: () => 0.4, ao: () => 0.7 });
    }
    const q2 = q;
    sheet(g, nu, nv,
      (s, t) => {
        const c = path(s), x = (t - 0.5) * W * (0.35 + 0.65 * Math.min(1, s * 2.5));
        return c.addScaledVector(across, x).addScaledVector(UP, -Math.abs(t - 0.5) * 2 * W * fold * (0.5 + s));
      },
      (s, t, p) => outward(p).normalize().multiplyScalar(0.62).addScaledVector(UP, 0.85).addScaledVector(across, (t - 0.5) * 0.5).normalize(),
      R.frond,
      (s) => ss(0.12, 0.5, s) * (0.75 + 0.25 * (1 - q2)),
      (s) => (0.5 + 0.5 * s) * (0.82 + 0.18 * q2));
    // a side spray from the middle of big boughs
    if (lod === 0 && level === 0 && L > 1.3) {
      const s0 = 0.38 + r() * 0.12, sg = r() < 0.5 ? -1 : 1, b1 = path(s0);
      bough(b1, az + sg * (0.55 + r() * 0.25), L * 0.45, elev * 0.5 - 0.05, q, 1);
    }
    // spruce: hanging curtain of branchlets under the bough
    if (sp.curtain && level === 0 && L > 0.9) {
      const Hc = L * (lod === 0 ? 0.32 : 0.38);
      sheet(g, lod === 0 ? 2 : 1, 1,
        (s, t) => { const c = path(0.25 + 0.75 * s); return c.addScaledVector(UP, -(1 - t) * Hc * Math.sin(Math.PI * (0.25 + 0.7 * s))).addScaledVector(across, (r() - 0.5) * 0.05); },
        (s, t, p) => outward(p).normalize().multiplyScalar(0.8).addScaledVector(UP, 0.45).normalize(),
        R.curtain, () => 0.1, (s, t) => 0.55 + 0.35 * t);
    }
  };
  const step = sp.whorl * (lod === 1 ? 2.1 : 1);
  let az0 = r() * TAU;
  while (y < h - 0.5) {
    const q = (y - yb) / (h - yb);
    const Lw = sp.R * sp.env(q);
    const n = Math.max(3, sp.per - (lod === 1 ? 1 : 0) + (r() < 0.4 ? 1 : 0) - (q > 0.8 ? 1 : 0));
    az0 += 2.4;
    for (let b = 0; b < n; b++) {
      if (r() < sp.miss * (q < 0.3 ? 2 : 1)) continue; // missing / broken boughs
      const az = az0 + b * TAU / n + (r() - 0.5) * 0.7;
      const L = Lw * (0.78 + r() * 0.4) * (lod === 1 ? 1.08 : 1);
      const elev = lerp(sp.elevLow, sp.elevTop, Math.pow(q, 1.3)) + (r() - 0.5) * 0.14;
      const a = axis(y), ra = radAt(y);
      bough(a.clone().add(V(Math.cos(az) * ra, 0, Math.sin(az) * ra)), az, L, elev, q, 0);
    }
    y += step * (0.8 + 0.4 * r()) * (0.65 + 0.35 * (1 - q));
  }
  // leader: two crossed upright sprays
  const top = axis(h - 1.4);
  for (let k = 0; k < 2; k++) {
    const a = k * Math.PI / 2 + r(), side = V(Math.cos(a), 0, Math.sin(a));
    sheet(g, 1, 1, (s, t) => top.clone().addScaledVector(UP, s * 2.0).addScaledVector(side, (t - 0.5) * 0.9 * (1 - s * 0.6)),
      () => V(side.z, 0.6, -side.x).normalize(), R.frond, () => 0.4, () => 1);
  }
  // dead snags on the lower trunk
  if (lod === 0) for (let k = 0; k < sp.snags; k++) {
    const yy = 1.2 + r() * Math.max(0.5, yb - 1.2), az = r() * TAU, L = 0.25 + r() * 0.9;
    const a = axis(yy), ra = radAt(yy), d = V(Math.cos(az), -0.15 - r() * 0.4, Math.sin(az)).normalize();
    const p0 = a.clone().add(V(Math.cos(az) * ra * 0.8, 0, Math.sin(az) * ra * 0.8));
    tube(g, [p0, p0.clone().addScaledVector(d, L)], [0.025, 0.008], { radial: 3, reg: R[sp.bark], ao: () => 0.7 });
  }
  return g.build();
}

// the scraggly windswept pine at the cliff edge: leaning, flagged to the
// lee (+x), foliage in flat pads, dead windward limbs
function windPineGeo(seed, lod, A) {
  const r = rng(seed), g = new Geo(), R = A.R, h = 10.5;
  const nT = lod === 0 ? 10 : lod === 1 ? 5 : 3, tp = [], tr = [];
  for (let i = 0; i <= nT; i++) {
    const q = i / nT, y = -0.6 + q * (h + 0.6);
    tp.push(V(Math.pow(q, 1.6) * 2.6 + Math.sin(q * 9) * 0.12, y * (1 - 0.08 * q), Math.sin(q * 5 + 1) * 0.25));
    tr.push(Math.max(0.03, 0.3 * Math.pow(1 - q, 0.7)));
  }
  const axis = q => { const f = Math.min(nT - 1e-6, q * nT), i = Math.floor(f); return tp[i].clone().lerp(tp[i + 1], f - i); };
  tube(g, tp, tr, {
    radial: lod === 0 ? 7 : lod === 1 ? 5 : 4, reg: R.pine,
    flare: lod === 0 ? (s, th) => 1 + 0.9 * Math.pow(Math.max(0, 1 - s / 1.3), 2) * (0.6 + 0.4 * Math.cos(4 * th)) : null,
    snow: () => 0.4, ao: q => lerp(0.75, 1, q),
  });
  const pad = (c, size, tilt, nCards) => {
    if (lod === 2) { skirtCone(g, c, c.y - 0.25, c.y + size * 0.35, size * 0.75, size * 0.2, 7, R.skirt, r, { snow: 1, ao: 0.95, squash: 0.8 }); return; }
    for (let k = 0; k < nCards; k++) {
      const a = r() * TAU, d = V(Math.cos(a), 0, Math.sin(a)), sd = V(-d.z, 0, d.x);
      const o = c.clone().addScaledVector(d, -size * 0.3);
      sheet(g, 1, 1, (s, t) => o.clone().addScaledVector(d, s * size).addScaledVector(sd, (t - 0.5) * size * 0.9).addScaledVector(UP, s * size * tilt + (r() - 0.5) * 0.08),
        (s, t, p) => V(p.x - c.x, 0, p.z - c.z).multiplyScalar(0.4).add(UP).normalize(),
        R.tuft, s => 0.3 + 0.6 * s, s => 0.6 + 0.4 * s);
    }
  };
  const nB = lod === 0 ? 13 : lod === 1 ? 8 : 5;
  for (let b = 0; b < nB; b++) {
    const q = 0.35 + 0.62 * (b / nB) + (r() - 0.5) * 0.06;
    const lee = r() < 0.82;
    const az = lee ? (r() - 0.5) * 2.2 : Math.PI + (r() - 0.5) * 1.6;
    const L = (lee ? 2.2 + r() * 2.2 : 0.6 + r() * 1.0) * (1 - 0.45 * q);
    const s0 = axis(q), pts = [s0];
    let d = V(Math.cos(az), 0.25 + r() * 0.2, Math.sin(az)).normalize(), p = s0.clone();
    const segs = lod === 0 ? 4 : 2;
    for (let k = 0; k < segs; k++) {
      d.add(V((r() - 0.5) * 0.5, (r() - 0.35) * 0.4, (r() - 0.5) * 0.5)).add(V(0.35, 0, 0)).normalize();
      p = p.clone().addScaledVector(d, L / segs); pts.push(p);
    }
    const rr = pts.map((_, i) => Math.max(0.01, (0.07 - q * 0.03) * (1 - i / (pts.length) * 0.8)));
    if (lod < 2) tube(g, pts, rr, { radial: 3, reg: R.pine, snow: () => 0.6, ao: () => 0.85, cap: !lee });
    if (lee) {
      pad(pts[pts.length - 1].clone().add(V(0, 0.15, 0)), 1.3 + r() * 0.8, 0.12, lod === 0 ? 3 : 2);
      if (lod === 0 && L > 2.5) pad(pts[2].clone().add(V(0, 0.2, 0)), 1.0 + r() * 0.5, 0.2, 2);
    }
  }
  // flat top pad
  pad(axis(1).add(V(0.3, 0.1, 0)), 2.0, 0.08, lod === 0 ? 4 : 2);
  return g.build();
}

// the stone pine: bare curving trunk, limbs radiating to a flat umbrella
function stonePineGeo(seed, A) {
  const r = rng(seed), g = new Geo(), R = A.R;
  const hFork = 7.5, top = 12.5, crownR = 6.2;
  const tp = [], tr = [];
  const bend = V((r() - 0.5) * 1.2, 0, (r() - 0.5) * 1.2);
  for (let i = 0; i <= 9; i++) {
    const q = i / 9, y = -0.6 + q * (hFork + 0.6);
    tp.push(V(bend.x * Math.sin(q * 2.2), y, bend.z * Math.sin(q * 2.2)));
    tr.push(0.36 * (1 - 0.35 * q));
  }
  tube(g, tp, tr, { radial: 9, reg: R.pine, flare: (s, th) => 1 + 0.6 * Math.pow(Math.max(0, 1 - s / 1.2), 2) * (0.7 + 0.3 * Math.cos(4 * th)), snow: () => 0.2, ao: q => lerp(0.8, 1, q) });
  const fork = tp[9];
  const cc = V(fork.x, top, fork.z);
  const dome = (x, z) => top - 1.9 * ((x - cc.x) ** 2 + (z - cc.z) ** 2) / (crownR * crownR);
  const nL = 4, pads = [];
  for (let l = 0; l < nL; l++) {
    const az = l / nL * TAU + r() * 0.8, spread = crownR * (0.4 + r() * 0.2);
    const end = V(cc.x + Math.cos(az) * spread, 0, cc.z + Math.sin(az) * spread); end.y = dome(end.x, end.z) - 2.0;
    const pts = [fork.clone().add(V(0, -0.2, 0))];
    for (let k = 1; k <= 4; k++) { const f = k / 4; pts.push(fork.clone().lerp(end, f).add(V((r() - 0.5) * 0.3, Math.sin(f * Math.PI) * 0.6, (r() - 0.5) * 0.3))); }
    tube(g, pts, [0.24, 0.2, 0.16, 0.13, 0.1], { radial: 6, reg: R.pine, snow: r2 => 0.7, ao: () => 0.85 });
    for (let k = 0; k < 3; k++) {
      const a2 = az + (k - 1) * 0.9 + (r() - 0.5) * 0.4, rad2 = crownR * (0.55 + r() * 0.42);
      const e2 = V(cc.x + Math.cos(a2) * rad2, 0, cc.z + Math.sin(a2) * rad2); e2.y = dome(e2.x, e2.z) - 0.6;
      const s2 = [end.clone()];
      for (let m = 1; m <= 3; m++) { const f = m / 3; s2.push(end.clone().lerp(e2, f).add(V((r() - 0.5) * 0.25, Math.sin(f * Math.PI) * 0.4, (r() - 0.5) * 0.25))); }
      tube(g, s2, [0.1, 0.075, 0.055, 0.035], { radial: 4, reg: R.pine, snow: () => 0.6, ao: () => 0.85 });
      for (let m = 0; m < 4; m++) {
        const a3 = a2 + (r() - 0.5) * 1.6, d3 = 0.6 + r() * 1.2;
        const e3 = V(e2.x + Math.cos(a3) * d3, 0, e2.z + Math.sin(a3) * d3); e3.y = dome(e3.x, e3.z) - 0.25;
        const from = s2[1 + (m % 3)];
        tube(g, [from, from.clone().lerp(e3, 0.5).add(V(0, 0.2, 0)), e3], [0.035, 0.025, 0.015], { radial: 3, reg: R.pine, snow: () => 0.3, ao: () => 0.8 });
        pads.push(e3);
      }
    }
  }
  // extra pads to close the canopy
  for (let i = 0; i < 18; i++) {
    const a = r() * TAU, d = Math.sqrt(r()) * crownR * 0.9;
    const p = V(cc.x + Math.cos(a) * d, 0, cc.z + Math.sin(a) * d); p.y = dome(p.x, p.z) - 0.3 - r() * 0.3;
    pads.push(p);
  }
  for (const c of pads) {
    const nrmC = V(c.x - cc.x, 0, c.z - cc.z).multiplyScalar(1.9 * 2 / (crownR * crownR)).add(UP).normalize();
    for (let k = 0; k < 3; k++) {
      const a = r() * TAU, d = V(Math.cos(a), 0, Math.sin(a)), sd = V(-d.z, 0, d.x), size = 1.5 + r() * 0.8;
      const o = c.clone().addScaledVector(d, -size * 0.45);
      sheet(g, 1, 1, (s, t) => o.clone().addScaledVector(d, s * size).addScaledVector(sd, (t - 0.5) * size).addScaledVector(UP, s * size * 0.22 + (t - 0.5) * 0.15),
        () => nrmC, R.tuft, s => 0.5 + 0.5 * s, s => 0.6 + 0.4 * s);
    }
  }
  return g.build();
}

// ---------------------------------------------------------------------
// broadleaf trees: recursive, curved, tapering branches; twig cards
// ---------------------------------------------------------------------
const rand = (r, [a, b]) => a + (b - a) * r();
function perp(d) { const a = Math.abs(d.y) < 0.9 ? UP : V(1, 0, 0); return V().crossVectors(d, a).normalize(); }

function broadleafGeo(seed, S, A) {
  const r = rng(seed), g = new Geo(), R = A.R, bark = R[S.bark];
  const center = V(0, S.crownY, 0);
  let terminals = 0;
  const snowOf = (rad, n) => ss(0.025, 0.1, rad);
  const grow = (lvl, start, dir, len, r0, phase) => {
    const L = S.levels[lvl];
    const segs = L.segs, pts = [start.clone()], dirs = [];
    let d = dir.clone(), p = start.clone();
    for (let i = 0; i < segs; i++) {
      const w = V(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(L.gnarl * 2);
      d.add(w).addScaledVector(UP, L.up || 0);
      if (L.out) { const o = V(p.x, 0, p.z); if (o.lengthSq() > 1e-4) d.addScaledVector(o.normalize(), L.out); }
      d.normalize();
      dirs.push(d.clone());
      p = p.clone().addScaledVector(d, len / segs); pts.push(p);
    }
    const r1 = r0 * (L.taper ?? 0.45);
    const rad = pts.map((_, i) => lerp(r0, r1, Math.pow(i / segs, 0.9)));
    tube(g, pts, rad, {
      radial: L.radial, reg: bark, snow: snowOf, ao: q => lerp(0.7, 1, Math.min(1, Math.max(0, lerp(start.y, p.y, q)) / S.crownY)),
      flare: lvl === 0 && S.flare ? (s, th) => 1 + S.flare * Math.pow(Math.max(0, 1 - s / S.flareH), 2) * (0.6 + 0.4 * Math.cos(S.lobes * th + phase)) : null,
    });
    const at = t => { const f = t * segs, i = Math.min(segs - 1, Math.floor(f)); return { p: pts[i].clone().lerp(pts[i + 1], f - i), d: dirs[i], r: lerp(r0, r1, t) }; };
    const next = S.levels[lvl + 1];
    if (next) {
      const n = Math.round(rand(r, next.n));
      let az = r() * TAU;
      for (let c = 0; c < n; c++) {
        const t = next.t[0] + (next.t[1] - next.t[0]) * (n === 1 ? 0.5 : c / (n - 1)) + (r() - 0.5) * 0.06;
        const a = at(Math.min(0.98, Math.max(0, t)));
        az += 2.4 + (r() - 0.5) * 0.5;
        const b1 = perp(a.d), b2 = V().crossVectors(a.d, b1);
        const ang = rand(r, next.ang);
        const side = b1.multiplyScalar(Math.cos(az)).addScaledVector(b2, Math.sin(az));
        const cd = a.d.clone().multiplyScalar(Math.cos(ang)).addScaledVector(side, Math.sin(ang)).normalize();
        const cl = len * rand(r, next.len) * (1 - (next.shorten ?? 0.4) * t);
        grow(lvl + 1, a.p, cd, cl, Math.min(a.r * 0.92, Math.max(next.minR ?? 0.006, a.r * rand(r, next.rr))), r() * TAU);
      }
      // water sprouts on pruned fruit trees: straight, upright
      if (next.sprouts && lvl === 1) for (let k = 0; k < next.sprouts; k++) {
        const a = at(0.25 + r() * 0.7);
        const sd = V((r() - 0.5) * 0.25, 1, (r() - 0.5) * 0.25).normalize();
        grow(S.levels.length - 1, a.p, sd, 0.7 + r() * 0.8, 0.012, 0);
      }
    }
    if (!next || L.cards) {
      // twig cards continue the branch into a fan of fine shoots
      terminals++;
      const nc = S.cardsPer;
      const tip = pts[pts.length - 1], base = at(S.cardAt).p;
      for (let k = 0; k < nc; k++) {
        const dd = d.clone().addScaledVector(V(r() - 0.5, (r() - 0.5) * 0.6, r() - 0.5), 0.5).normalize();
        const a = perp(dd).applyAxisAngle(dd, r() * Math.PI);
        const H = S.card * (0.8 + r() * 0.4), Wd = H * 0.95;
        const o = base.clone().lerp(tip, k / Math.max(1, nc));
        const reg = S.cardReg[(r() * S.cardReg.length) | 0];
        sheet(g, 1, 1, (s, t) => o.clone().addScaledVector(a, (s - 0.5) * Wd).addScaledVector(dd, t * H),
          (s, t, p) => p.clone().sub(center).normalize().add(V(0, 0.5, 0)).normalize(),
          reg, () => 0.1, () => 0.95);
      }
    }
  };
  grow(0, V(0, -0.5, 0), V((r() - 0.5) * S.lean, 1, (r() - 0.5) * S.lean).normalize(), S.trunkL, S.trunkR, r() * TAU);
  const geo = g.build(); geo.userData.tris = g.tris; geo.userData.terminals = terminals;
  return geo;
}

const BROADLEAF = {
  // avenue elms: vase-shaped, ascending limbs, fine zig-zag twigs
  elm: (v, R) => ({
    bark: 'elm', trunkL: [4.4, 5.2, 3.8][v], trunkR: 0.3, lean: 0.06, flare: 0.8, flareH: 1.4, lobes: 5, crownY: 8,
    // (late November: bare twig sprays, thinner than a summer crown)
    card: 0.92, cardAt: 0.5, cardsPer: 2, cardReg: [R.twig, R.twigB],
    levels: [
      { segs: 7, radial: 10, gnarl: 0.06, taper: 0.55 },
      { n: [[5, 6], [4, 5], [5, 7]][v], t: [0.72, 1.0], ang: [0.35, 0.75], len: [[1.25, 1.55], [1.5, 1.8], [1.1, 1.4]][v], rr: [0.55, 0.7], segs: 5, radial: 7, gnarl: 0.09, up: 0.03, out: 0.04, shorten: 0.2 },
      { n: [3, 4], t: [0.3, 0.95], ang: [0.45, 0.8], len: [0.45, 0.6], rr: [0.5, 0.65], segs: 4, radial: 5, gnarl: 0.12, up: 0.02, shorten: 0.35 },
      { n: [3, 3], t: [0.3, 0.95], ang: [0.5, 0.9], len: [0.45, 0.6], rr: [0.5, 0.65], segs: 3, radial: 3, gnarl: 0.15, up: -0.02, shorten: 0.4, minR: 0.008 },
    ],
  }),
  // pruned fruit trees: short trunk, open centre, spurs and water sprouts
  fruit: (v, R) => ({
    bark: 'fruit', trunkL: [1.2, 1.5, 1.0][v], trunkR: 0.13, lean: [0.1, 0.05, 0.35][v], flare: 0.5, flareH: 0.5, lobes: 4, crownY: 2.6,
    card: 0.8, cardAt: 0.4, cardsPer: 2, cardReg: [R.spur, R.spur, R.twigB],
    levels: [
      { segs: 4, radial: 8, gnarl: [0.08, 0.05, 0.16][v], taper: 0.7 },
      { n: [[3, 4], [4, 4], [3, 3]][v], t: [0.8, 1.0], ang: [[0.7, 1.0], [0.5, 0.75], [0.8, 1.15]][v], len: [[1.5, 1.9], [1.6, 2.0], [1.8, 2.3]][v], rr: [0.6, 0.75], segs: 4, radial: 6, gnarl: 0.12, up: 0.05, shorten: 0.1, sprouts: [4, 3, 5][v] },
      { n: [3, 4], t: [0.3, 0.95], ang: [0.4, 0.8], len: [0.45, 0.6], rr: [0.5, 0.65], segs: 3, radial: 4, gnarl: 0.16, up: 0.05, shorten: 0.35 },
      { n: [2, 3], t: [0.3, 0.9], ang: [0.4, 0.8], len: [0.35, 0.55], rr: [0.5, 0.6], segs: 2, radial: 3, gnarl: 0.18, up: 0.06, shorten: 0.4, minR: 0.006 },
    ],
  }),
  // the cemetery oak: massive, low, wide tortuous limbs
  oak: (v, R) => ({
    bark: 'oak', trunkL: 3.6, trunkR: 0.62, lean: 0.12, flare: 1.0, flareH: 1.6, lobes: 6, crownY: 7,
    // a few dead leaves hang on in winter (oaks keep them), most twigs are bare
    card: 1.0, cardAt: 0.45, cardsPer: 2, cardReg: [R.twig, R.twigB, R.twig, R.twigB, R.leaves],
    levels: [
      { segs: 8, radial: 12, gnarl: 0.08, taper: 0.62 },
      { n: [5, 5], t: [0.55, 1.0], ang: [0.75, 1.2], len: [1.75, 2.05], rr: [0.52, 0.68], segs: 7, radial: 9, gnarl: 0.16, up: 0.02, shorten: 0.1 },
      { n: [4, 5], t: [0.25, 0.95], ang: [0.5, 0.95], len: [0.45, 0.6], rr: [0.5, 0.62], segs: 5, radial: 6, gnarl: 0.2, up: 0.03, shorten: 0.3 },
      { n: [3, 4], t: [0.3, 0.95], ang: [0.5, 1.0], len: [0.45, 0.6], rr: [0.5, 0.62], segs: 3, radial: 4, gnarl: 0.22, up: 0.02, shorten: 0.4 },
      { n: [2, 2], t: [0.4, 0.95], ang: [0.5, 0.9], len: [0.5, 0.65], rr: [0.5, 0.6], segs: 2, radial: 3, gnarl: 0.22, up: 0.0, shorten: 0.4, minR: 0.008 },
    ],
  }),
};

// dormant rose bush: arching thorny canes, a few dried hips
function roseGeo(seed, A) {
  const r = rng(seed), g = new Geo(), R = A.R;
  const nC = 11;
  for (let c = 0; c < nC; c++) {
    const az = r() * TAU, tilt = 0.15 + r() * 0.55, L = 0.7 + r() * 0.7;
    const pts = [V(Math.cos(az) * 0.05, -0.05, Math.sin(az) * 0.05)];
    let d = V(Math.cos(az) * Math.sin(tilt), Math.cos(tilt), Math.sin(az) * Math.sin(tilt)), p = pts[0].clone();
    for (let k = 0; k < 5; k++) {
      d.add(V(Math.cos(az) * 0.12, -0.12 * k / 5 - 0.02, Math.sin(az) * 0.12)).add(V(r() - 0.5, 0, r() - 0.5).multiplyScalar(0.15)).normalize();
      p = p.clone().addScaledVector(d, L / 5); pts.push(p);
    }
    const rad = pts.map((_, i) => lerp(0.011, 0.004, i / 5));
    tube(g, pts, rad, { radial: 3, reg: R.cane, ao: () => 0.9 });
    // side shoots with hips at the ends
    for (let k = 0; k < 2; k++) {
      const q = pts[2 + k * 2] || pts[3];
      const sd = V(r() - 0.5, 0.6 + r() * 0.4, r() - 0.5).normalize(), l = 0.15 + r() * 0.25;
      const e = q.clone().addScaledVector(sd, l);
      tube(g, [q, q.clone().lerp(e, 0.5).add(V(0, 0.02, 0)), e], [0.005, 0.004, 0.003], { radial: 3, reg: R.cane, ao: () => 0.9 });
      if (r() < 0.7) hip(g, e, R.hips);
    }
    if (r() < 0.4) hip(g, pts[5], R.hips);
  }
  return g.build();
}
function hip(g, c, reg) {
  const s = 0.012, pts = [[1, 0, 0], [-1, 0, 0], [0, 1.3, 0], [0, -1.3, 0], [0, 0, 1], [0, 0, -1]].map(([x, y, z]) => V(c.x + x * s, c.y + y * s, c.z + z * s));
  const faces = [[0, 2, 4], [4, 2, 1], [1, 2, 5], [5, 2, 0], [4, 3, 0], [1, 3, 4], [5, 3, 1], [0, 3, 5]];
  for (const [a, b, d] of faces) {
    const n = pts[a].clone().add(pts[b]).add(pts[d]).multiplyScalar(1 / 3).sub(c).normalize();
    const i0 = g.v(pts[a], n, 0, 0, reg, 0, SOLID, 1), i1 = g.v(pts[b], n, 0.3, 0.3, reg, 0, SOLID, 1), i2 = g.v(pts[d], n, 0.6, 0, reg, 0, SOLID, 1);
    g.ix.push(i0, i1, i2);
  }
}

// ---------------------------------------------------------------------
// the tree shader: atlas sampling with wrap, alpha-to-coverage cards
// that stay dense in the distance, snow on upper surfaces
// ---------------------------------------------------------------------
const snowGLSL = /* glsl */`
float tr_hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float tr_noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(tr_hash(i),tr_hash(i+vec2(1,0)),f.x),mix(tr_hash(i+vec2(0,1)),tr_hash(i+vec2(1,1)),f.x),f.y); }
float tr_fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<3;i++){ s+=a*tr_noise(p); p*=2.07; a*=.5; } return s/.875; }
`;
function patchVertex(sh) {
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', `#include <common>
      attribute vec4 aRegion; attribute vec3 aTree;
      varying vec4 vReg; varying vec3 vTK; varying vec2 vTUv; varying vec3 vTreeP; varying vec3 vTreeN;`)
    .replace('#include <fog_vertex>', `#include <fog_vertex>
      {
        vec4 tp = vec4(transformed, 1.0);
        vec3 tn = objectNormal;
        #ifdef USE_INSTANCING
          tp = instanceMatrix * tp; tn = mat3(instanceMatrix) * tn;
        #endif
        vTreeP = (modelMatrix * tp).xyz;
        vTreeN = normalize(mat3(modelMatrix) * tn);
        vReg = aRegion; vTK = aTree; vTUv = uv;
      }`);
}
const atlasFrag = /* glsl */`
  vec2 tAtlasUv, tAtlasDx, tAtlasDy; float tMode;
  void treeAtlas() {
    tMode = vTK.y;
    vec2 t = vTUv;
    vec2 f = tMode < 0.5 ? fract(t) : tMode < 1.5 ? clamp(t, 0.002, 0.998) : vec2(fract(t.x), clamp(t.y, 0.004, 0.996));
    tAtlasUv = vReg.xy + f * vReg.zw;
    tAtlasDx = dFdx(t) * vReg.zw; tAtlasDy = dFdy(t) * vReg.zw;
  }
`;
function patchDepth(m) {
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec4 aRegion; attribute vec3 aTree; varying vec4 vReg; varying vec3 vTK; varying vec2 vTUv;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vReg = aRegion; vTK = aTree; vTUv = uv;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec4 vReg; varying vec3 vTK; varying vec2 vTUv;
        ${atlasFrag}`)
      .replace('#include <map_fragment>', `treeAtlas();
        diffuseColor.a *= textureGrad(map, tAtlasUv, tAtlasDx, tAtlasDy).a;`);
  };
  m.customProgramCacheKey = () => 'tree-depth';
  return m;
}
function treeMaterial(tex, size) {
  const m = new THREE.MeshStandardMaterial({
    map: tex.map, normalMap: tex.normal, roughness: 0.92, metalness: 0,
    side: THREE.DoubleSide, alphaTest: 0.42, alphaToCoverage: true, envMapIntensity: 0.55,
  });
  m.userData.snow = true;
  m.onBeforeCompile = sh => {
    sh.uniforms.uSnow = shared.uSnow;
    sh.uniforms.uAtlasSize = { value: new THREE.Vector2(size[0], size[1]) };
    patchVertex(sh);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uSnow; uniform vec2 uAtlasSize;
        varying vec4 vReg; varying vec3 vTK; varying vec2 vTUv; varying vec3 vTreeP; varying vec3 vTreeN;
        ${snowGLSL}
        ${atlasFrag}
        float tSnow;`)
      .replace('#include <map_fragment>', `
        treeAtlas();
        vec4 texel = textureGrad(map, tAtlasUv, tAtlasDx, tAtlasDy);
        float bed = textureGrad(normalMap, tAtlasUv, tAtlasDx, tAtlasDy).a;
        diffuseColor *= texel;
        diffuseColor.rgb *= vTK.z;
        if (tMode > 0.5) {
          // keep thin needles and twigs from dissolving into the mips
          vec2 px = vTUv * vReg.zw * uAtlasSize;
          vec2 ddx = dFdx(px), ddy = dFdy(px);
          float lod = 0.5 * log2(max(dot(ddx, ddx), dot(ddy, ddy)));
          diffuseColor.a *= 1.0 + max(0.0, lod) * 0.25;
        }
        {
          float up;
          if (tMode > 0.5 && tMode < 1.5) {
            // cards: snow on the face that looks at the sky
            vec3 gN = normalize(cross(dFdx(vTreeP), dFdy(vTreeP)));
            up = smoothstep(-0.05, 0.45, gN.y) * 0.85 + 0.15 * smoothstep(0.2, 0.6, vTreeN.y);
          } else up = smoothstep(${'0.42'}, 0.75, vTreeN.y);
          float n = tr_fbm(vTreeP.xz * 1.7 + vTreeP.y * 0.9) * 0.75 + tr_noise(vTreeP.xz * 7.0 + vTreeP.y * 5.0) * 0.25;
          float cover = uSnow * vTK.x;
          tSnow = up * smoothstep(0.92 - cover * 1.25, 1.12 - cover * 1.25, n + 0.18);
          vec3 snowCol = vec3(.9, .92, .96) * (0.88 + 0.12 * tr_noise(vTreeP.xz * 40.0));
          if (tMode > 0.5 && tMode < 1.5) {
            // A cap of snow may bridge the gaps between the twigs of a spray.
            // Only fill where the snow-bed mask (dilated twig coverage) and
            // the snow amount are both high, and — crucially — paint the
            // filled pixels snow-white. Otherwise the bed would raise the
            // alpha of the whole card while leaving the colour dark, and the
            // spray would read as a solid black quad.
            float fill = bed * tSnow;
            fill *= fill;                       // bias the cap tight to the twigs
            diffuseColor.a = clamp(max(diffuseColor.a, fill), 0.0, 1.0);
            tSnow = max(tSnow, fill);
            diffuseColor.rgb = mix(diffuseColor.rgb, snowCol, tSnow);
          } else {
            diffuseColor.rgb = mix(diffuseColor.rgb, snowCol, tSnow);
          }
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, .8, tSnow);`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        if (tMode > 0.5) {
          // thin twigs and needles pass some skylight: a faint floor keeps the
          // shaded side of the crown from crushing to black
          reflectedLight.indirectDiffuse += diffuseColor.rgb * vec3(0.5, 0.55, 0.64) * 0.25;
        }`)
      .replace('vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;', 'vec3 mapN = textureGrad( normalMap, tAtlasUv, tAtlasDx, tAtlasDy ).xyz * 2.0 - 1.0;')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        // cards shade with their crown normal (outward from the crown centre,
        // tipped up), the same on both faces: the spray reads as part of a
        // rounded mass rather than a lit or unlit plane
        if (tMode > 0.5 && tMode < 1.5) normal = normalize(vNormal);
        normal = normalize(mix(normal, normalize((viewMatrix * vec4(0., 1., 0., 0.)).xyz), tSnow * 0.55));`);
  };
  m.customProgramCacheKey = () => 'tree-atlas';
  return m;
}

// ---------------------------------------------------------------------
// forest: instanced variants, LOD buckets rebuilt when the camera moves
// ---------------------------------------------------------------------
const LOD_NEAR = 55, LOD_MID = 190, REBUILD = 25;

// Screen-space AO (GTAOPass) renders the scene once more with
// scene.overrideMaterial = MeshNormalMaterial to get normals and depth.
// That material knows nothing of the atlas alpha, so every twig card and
// needle spray went into the AO buffers as a full opaque quad, and the AO
// then darkened those quads over the sky: the floating blue-grey squares
// around every crown. Under an override, draw only the bark range of the
// index buffer (the shadow pass uses customDepthMaterial and is not an
// override, so shadows keep their alpha-tested twigs).
function solidOnlyUnderOverride(im) {
  let saved = -1;
  im.onBeforeRender = (r, sc, cam, geo, mat) => {
    if (mat === im.material || geo.userData.solidCount == null) return;
    saved = geo.drawRange.count;
    geo.drawRange.count = geo.userData.solidCount;
  };
  im.onAfterRender = (r, sc, cam, geo) => {
    if (saved !== -1) { geo.drawRange.count = saved; saved = -1; }
  };
}

export function buildTrees(scene, inst) {
  const t0 = performance.now();
  const atlases = makeTreeAtlases();
  const W = atlases.wood, C = atlases.conifer;
  const woodMat = treeMaterial(W.tex, W.size), conMat = treeMaterial(C.tex, C.size);
  const depthOf = tex => patchDepth(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex.map, alphaTest: 0.5, side: THREE.DoubleSide }));
  const woodDepth = depthOf(W.tex), conDepth = depthOf(C.tex);
  const meshes = [], stats = {};
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = V(), p3 = V();
  const matrixOf = t => { q.setFromAxisAngle(UP, t.ry); m4.compose(p3.set(t.x, t.y, t.z), q, s3.set(t.s, t.s, t.s)); return m4.toArray(new Float32Array(16)); };
  const mkMesh = (geo, mat, depth, cap, shadow, name) => {
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, cap));
    im.count = 0; im.visible = false; im.name = name;
    im.castShadow = shadow; im.receiveShadow = true;
    im.customDepthMaterial = depth;
    solidOnlyUnderOverride(im);
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(im); meshes.push(im);
    return im;
  };
  const tris = g => g.index.count / 3;

  // groups: [{ list, lods: [{ mesh, max }] }] — list items carry .m (matrix)
  const groups = [];
  const addGroup = (name, list, lodGeos, mat, depth, shadows) => {
    if (!list.length) return;
    list.forEach(t => (t.m = matrixOf(t)));
    const lods = lodGeos.map((geo, i) => ({ mesh: mkMesh(geo, mat, depth, list.length, shadows[i], `${name}:lod${i}`), max: [LOD_NEAR, LOD_MID, Infinity][i] ?? Infinity }));
    if (lods.length === 1) lods[0].max = Infinity;
    groups.push({ list, lods });
    stats[name] = lodGeos.map(tris);
  };

  // conifers: 4 variants × 3 LODs
  const conV = ['fir', 'young', 'spruce', 'wind'];
  conV.forEach((k, vi) => {
    const list = inst.pine.filter(t => t.v === vi);
    const geos = [0, 1, 2].map(l => k === 'wind' ? windPineGeo(40 + vi, l, C) : coniferGeo(40 + vi, CONIFERS[k], l, C));
    addGroup(k, list, geos, conMat, conDepth, [true, true, false]);
  });
  addGroup('stonePine', inst.umbrella, [stonePineGeo(9, C)], conMat, conDepth, [true]);
  // broadleaves: 3 elm, 3 fruit, the oak, roses
  for (let v = 0; v < 3; v++) addGroup('elm' + v, inst.bare.filter(t => t.v === v), [broadleafGeo(3 + v * 5, BROADLEAF.elm(v, W.R), W)], woodMat, woodDepth, [true]);
  for (let v = 0; v < 3; v++) addGroup('fruit' + v, inst.fruit.filter(t => t.v === v), [broadleafGeo(21 + v * 7, BROADLEAF.fruit(v, W.R), W)], woodMat, woodDepth, [true]);
  addGroup('oak', inst.oak, [broadleafGeo(31, BROADLEAF.oak(0, W.R), W)], woodMat, woodDepth, [true]);
  addGroup('rose', inst.rose, [roseGeo(5, W)], woodMat, woodDepth, [true]);

  const last = V(1e9, 0, 0);
  function rebuild(cam) {
    for (const gr of groups) {
      const counts = gr.lods.map(() => 0);
      for (const t of gr.list) {
        const d = Math.hypot(t.x - cam.x, t.y - cam.y, t.z - cam.z);
        let l = 0; while (d > gr.lods[l].max) l++;
        gr.lods[l].mesh.instanceMatrix.array.set(t.m, counts[l]++ * 16);
      }
      gr.lods.forEach((o, i) => {
        const im = o.mesh;
        im.count = counts[i]; im.visible = counts[i] > 0;
        im.instanceMatrix.clearUpdateRanges(); im.instanceMatrix.addUpdateRange(0, counts[i] * 16);
        im.instanceMatrix.needsUpdate = true;
        if (counts[i]) im.computeBoundingSphere();
      });
    }
  }
  // cheap per-frame hook: re-bucket only after the camera has moved
  function update(camera, force = false) {
    const p = camera.position ?? camera;
    if (!force && p.distanceToSquared(last) < REBUILD * REBUILD) return false;
    last.copy(p); rebuild(p);
    return true;
  }
  update(V(-120, 98, 132), true); // the opening aerial view
  const info = { stats, ms: +(performance.now() - t0).toFixed(0), counts: Object.fromEntries(groups.map(g => [g.lods[0].mesh.name.split(':')[0], g.list.length])) };
  activeForest = { update, meshes, info };
  return activeForest;
}
// the most recently built forest (for development tools)
export let activeForest = null;
