import * as THREE from 'three';

// ----------------------------------------------------------------------
// The clothes of the abbey, made to fit a real skeleton. The people are
// photoscanned CC0 characters (heads and hands, see figure.js) rigged to the
// 66-joint Mesh2Motion / Quaternius skeleton; everything they wear is built
// here, in the skeleton's bind pose (a T-pose, feet at y = 0, facing +z,
// left arm along +x), and skinned to its bones so it moves with recorded
// motion rather than as rigid parts:
//   the tunic and cowl as ONE lofted cloth surface from collar to hem, its
//   folds deepening below the belt and swinging with the legs (the skirt is
//   weighted partly to the thighs and calves, mostly to the pelvis, so it
//   drapes instead of splitting into trouser legs); wide bell sleeves; the
//   hood up (a shell round the head, open at the face, falling into a
//   shoulder cape) or down (lying folded on the back); a cord girdle or
//   leather belt; closed leather shoes.
// Dress: black Benedictine habits with the cowl (Order, AMBIENT), hoods up
// in the refectory and at Compline (BOOK, D1 AKŞAM), novices in lighter
// grey-black and smaller (BOOK #000635), servants and herdsmen in undyed
// wool and sheepskin (BOOK #000788), peasants in short brown tunics with
// hoods (BOOK #001714). See docs/provenance/people.md.
// ----------------------------------------------------------------------

const TAU = Math.PI * 2;
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function noise1(x, seed) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i + seed * 13.1), hash(i + 1 + seed * 13.1), u); }

// A skinned mesh under construction: positions, uvs, colours, 4 weights
class Builder {
  constructor(J) { this.J = J; this.p = []; this.uv = []; this.c = []; this.si = []; this.sw = []; this.ix = []; }
  get n() { return this.p.length / 3; }
  vert(x, y, z, u, v, col, w) {
    this.p.push(x, y, z); this.uv.push(u, v); this.c.push(col[0], col[1], col[2]);
    // keep the four strongest influences
    const e = Object.entries(w).filter(([, a]) => a > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4);
    let s = 0; for (const [, a] of e) s += a;
    for (let k = 0; k < 4; k++) {
      const q = e[k];
      this.si.push(q ? this.J[q[0]].index : 0); this.sw.push(q ? q[1] / s : 0);
    }
    return this.n - 1;
  }
  // a grid of rows × cols (cols wrap if `ring`), skipping cells for which
  // `drop(i, j)` is true; flip reverses the winding
  grid(ids, rows, cols, ring, drop, flip) {
    const C = ring ? cols : cols - 1;
    for (let i = 0; i < rows - 1; i++) for (let j = 0; j < C; j++) {
      if (drop && drop(i, j)) continue;
      const j1 = (j + 1) % cols;
      const a = ids[i * cols + j], b = ids[i * cols + j1], c = ids[(i + 1) * cols + j], d = ids[(i + 1) * cols + j1];
      if (flip) this.ix.push(a, c, b, b, c, d); else this.ix.push(a, b, c, b, d, c);
    }
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.sw, 4));
    g.setIndex(this.ix);
    g.computeVertexNormals();
    return g;
  }
}

// the garments of each kind of person
export const STYLES = {
  monk:    { cloth: 0x2b2825, hem: 0.07, hood: 'up', belt: 'cord', flare: 1.0, sleeve: 1.0 },
  monkBare: { cloth: 0x2b2825, hem: 0.07, hood: 'down', belt: 'cord', flare: 1.0, sleeve: 1.0 },
  abbot:   { cloth: 0x221f1c, hem: 0.05, hood: 'down', belt: 'cord', flare: 1.1, sleeve: 1.15, cross: true },
  novice:  { cloth: 0x3d3833, hem: 0.1, hood: 'down', belt: 'cord', flare: 0.9, sleeve: 0.9 },
  servant: { cloth: 0x5e4e3a, hem: 0.36, hood: 'down', belt: 'leather', flare: 0.75, sleeve: 0.65, hose: 0x3d352c },
  herd:    { cloth: 0x7c6d57, hem: 0.3, hood: 'up', belt: 'leather', flare: 0.85, sleeve: 0.7, hose: 0x40382e, fleece: true },
  peasant: { cloth: 0x52402e, hem: 0.42, hood: 'up', belt: 'cord', flare: 0.7, sleeve: 0.6, hose: 0x3b342b },
};

const col = hex => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
// where the neckline of the habit closes (shared with figure.js's neck)
export function collarY(J) { return Math.max(J.neck_01.p.y + 0.012, J.upperarm_l.p.y + 0.06); }

// J: bone name -> { index, p: Vector3 (bind-pose world position) }
export function buildHabit(J, styleName, seed = 1) {
  const S = STYLES[styleName] || STYLES.monk;
  const B = new Builder(J);
  const P = n => J[n].p;
  const cloth = col(S.cloth), dark = col(new THREE.Color(S.cloth).multiplyScalar(0.55).getHex());
  const leather = col(0x2a1f17), cord = col(0x6e6048), hose = S.hose ? col(S.hose) : cloth;

  // ---------------- the tunic: collar to hem ----------------
  // The neckline closes round the base of the neck and the shoulders slope
  // down from it (the scans' neck joints stand 0–9 cm above their shoulder
  // joints, so the collar follows whichever is higher: `collarY()`)
  const yShoulder = P('upperarm_l').y + 0.035, yNeck = collarY(J), yChest = P('spine_03').y;
  const yWaist = P('spine_01').y - 0.02, yHip = P('pelvis').y - 0.07, yKnee = P('calf_l').y, yHem = S.hem;
  const zSpine = P('spine_02').z, zHip = P('pelvis').z, zNeck = P('neck_01').z + 0.012;
  const fl = S.flare;
  // half-width, half-depth, centre z, fold amplitude, fold count, by height
  const keys = [
    // y, hx, hz, cz, amp, k
    [yNeck, 0.078, 0.074, zNeck, 0.0, 7],
    [yNeck - 0.022, 0.108, 0.092, (zNeck + zSpine) / 2 + 0.006, 0.002, 7],
    [Math.min(yNeck - 0.05, yShoulder - 0.012), 0.168, 0.118, zSpine + 0.012, 0.003, 7],
    [yShoulder - 0.045, 0.2, 0.13, zSpine + 0.018, 0.004, 7],
    [yChest, 0.19, 0.138, zSpine + 0.03, 0.006, 7],
    [yWaist + 0.06, 0.172, 0.13, zSpine + 0.03, 0.008, 9],
    [yWaist, 0.165, 0.126, zSpine + 0.03, 0.01, 16],
    [yWaist - 0.05, 0.18, 0.137, zHip + 0.04, 0.014, 14],
    [yHip, 0.205, 0.152, zHip + 0.04, 0.018, 12],
    [yKnee, 0.24 * fl + 0.02, 0.19 * fl + 0.02, 0.01, 0.028, 11],
    [yHem, 0.29 * fl, 0.245 * fl, -0.0, 0.036, 11],
  ].filter(k => k[0] >= yHem - 1e-6).sort((a, b) => b[0] - a[0]);
  const at = y => {
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      if (y <= a[0] && y >= b[0]) { const t = (a[0] - y) / (a[0] - b[0]), s = t * t * (3 - 2 * t); return a.map((v, k) => (k === 0 ? y : lerp(v, b[k], k === 5 ? t : s))); }
    }
    return keys[y > keys[0][0] ? 0 : keys.length - 1];
  };
  const SEG = 44, ROWS = 36;
  const ids = [];
  const sL = x => sstep(-0.11, 0.11, x);
  for (let i = 0; i < ROWS; i++) {
    const v = i / (ROWS - 1);
    // denser rows below the belt, where the cloth moves
    const y = v < 0.3 ? lerp(yNeck, yWaist, Math.pow(v / 0.3, 1.35)) : lerp(yWaist, yHem, (v - 0.3) / 0.7);
    const [, hx, hz, cz, amp, k] = at(y);
    const below = sstep(yWaist, yHem, y);   // 0 at the belt .. 1 at the hem
    for (let j = 0; j < SEG; j++) {
      const a = j / SEG * TAU;           // 0 at the front (+z), counter-clockwise from above
      const ca = Math.cos(a), sa = Math.sin(a);
      // superellipse: flatter flanks, rounder front and back
      const e = 2.4, cx = Math.sign(sa) * Math.pow(Math.abs(sa), 2 / e), czz = Math.sign(ca) * Math.pow(Math.abs(ca), 2 / e);
      // folds: sharp ridges, irregular in phase and depth, a little
      // stronger at the back and flanks than over the belly
      const ph = noise1(a * 3 + seed, seed) * 2.2 + noise1(y * 4 + seed * 3, seed + 1) * 0.8;
      const ridge = Math.pow(0.5 + 0.5 * Math.cos(k * a + ph), 1.6);
      const depth = amp * (0.55 + 0.9 * noise1(a * k * 0.5 + 7, seed + 2)) * (1 - 0.35 * Math.max(0, ca) * (1 - below));
      const r = 1 + (ridge - 0.45) * depth / Math.max(hx, 0.08);
      let x = cx * hx * r, z = cz + czz * hz * r;
      // the hem hangs unevenly and dips at the back
      let yy = y;
      if (i === ROWS - 1) yy += 0.012 * Math.sin(3 * a + seed) + 0.02 * noise1(a * 5, seed + 4) - 0.012 * Math.max(0, -ca);
      // weights: spine above the belt, pelvis and legs below
      const w = {};
      if (y > yWaist) {
        const t = sstep(yWaist, yChest + 0.08, y);
        w.spine_01 = 1 - t; w.spine_02 = t * (1 - sstep(yChest, yShoulder, y)); w.spine_03 = sstep(yChest - 0.1, yShoulder, y);
        const sh = sstep(0.1, 0.19, Math.abs(x)) * sstep(yChest, yShoulder, y);
        if (sh > 0) { const s = x > 0 ? 'l' : 'r'; w['clavicle_' + s] = sh * 0.6; w['upperarm_' + s] = sh * 0.25; }
        if (y > yShoulder) w.neck_01 = sstep(yShoulder, yNeck, y) * 0.5;
      } else {
        const leg = (0.2 + 0.45 * below) * sstep(yWaist - 0.02, yHip, y);
        const l = sL(x);
        const tc = sstep(yHip, yHem + 0.1, y);
        w.pelvis = 1 - leg; w.spine_01 = sstep(yHip, yWaist, y) * 0.4;
        w.thigh_l = leg * (1 - tc) * l; w.thigh_r = leg * (1 - tc) * (1 - l);
        w.calf_l = leg * tc * l; w.calf_r = leg * tc * (1 - l);
      }
      const shade = 1 - 0.18 * (1 - ridge) * (amp > 0.012 ? 1 : 0.3);
      ids.push(B.vert(x, yy, z, j / SEG * 3.4, y * 3.2, cloth.map(c => c * shade), w));
    }
  }
  B.grid(ids, ROWS, SEG, true);
  // the lining a hand's breadth up from the hem, so the skirt has thickness
  {
    const n = ids.length, lid = [];
    for (let i = ROWS - 4; i < ROWS; i++) for (let j = 0; j < SEG; j++) {
      const s = ids[i * SEG + j], p = B.p;
      const x = p[s * 3] * 0.965, y = p[s * 3 + 1] + 0.004, z = p[s * 3 + 2] * 0.965;
      const w = {}; for (let q = 0; q < 4; q++) { const bi = B.si[s * 4 + q], bw = B.sw[s * 4 + q]; if (bw > 0) { const name = Object.keys(J).find(k => J[k].index === bi); w[name] = bw; } }
      lid.push(B.vert(x, y, z, j / SEG * 3.4, y * 3.2, dark, w));
    }
    B.grid(lid, 4, SEG, true, null, true);
    void n;
  }

  // ---------------- sleeves ----------------
  for (const s of ['l', 'r']) {
    const sg = s === 'l' ? 1 : -1;
    const sh = P('upperarm_' + s), el = P('lowerarm_' + s), wr = P('hand_' + s);
    // the brothers' long sleeves come down over the heel of the hand
    const x0 = sg * 0.1, x1 = wr.x + sg * (S.sleeve >= 0.9 ? 0.065 : 0.01 - 0.02 * (1 - S.sleeve));
    const L = Math.abs(x1 - x0), elbowT = Math.abs(el.x - x0) / L;
    const RS = 18, RC = 20, sid = [];
    for (let i = 0; i < RS; i++) {
      const t = i / (RS - 1), x = lerp(x0, x1, t);
      // radius: snug at the elbow, a bell towards the cuff; hanging below the arm
      const bell = sstep(0.45, 1, t) * 0.055 * S.sleeve;
      const ry = 0.082 - 0.012 * sstep(0, elbowT, t) + bell, rz = 0.072 - 0.01 * sstep(0, elbowT, t) + bell * 0.8;
      const drop = 0.012 + bell * 0.55;
      const cy = lerp(sh.y, wr.y, t) - drop, cz = lerp(sh.z, wr.z, t) - 0.004;
      for (let j = 0; j < RC; j++) {
        const a = j / RC * TAU;
        const fold = 1 + 0.06 * Math.pow(0.5 + 0.5 * Math.cos(5 * a + noise1(t * 6, seed + (s === 'l' ? 9 : 11)) * 2), 2) * (0.4 + t);
        // the bell sags: the lower half of the cuff hangs deeper
        const sag = Math.sin(a) < 0 ? 1 + 0.35 * bell / 0.055 : 1;
        const y = cy + Math.sin(a) * ry * fold * sag, z = cz + Math.cos(a) * rz * fold;
        const w = {};
        const te = sstep(elbowT - 0.12, elbowT + 0.12, t);
        w['upperarm_' + s] = (1 - te) * sstep(0, 0.12, t) + (t < 0.12 ? 0.4 : 0);
        w['clavicle_' + s] = (1 - sstep(0, 0.14, t)) * 0.6;
        w.spine_03 = (1 - sstep(0, 0.08, t)) * 0.35;
        const past = sstep(Math.abs(wr.x - x0) / L - 0.04, 1, t);   // beyond the wrist the cuff follows the hand
        w['lowerarm_' + s] = te * (1 - 0.15 * sstep(0.85, 1, t)) * (1 - 0.45 * past);
        w['hand_' + s] = 0.15 * sstep(0.85, 1, t) + 0.4 * past;
        sid.push(B.vert(x, y, z, t * 1.2, j / RC * 1.4, cloth.map(c => c * (0.88 + 0.12 * fold)), w));
      }
    }
    B.grid(sid, RS, RC, true, null, s === 'r');
    // inside of the cuff, dark
    const lid = [];
    for (let i = RS - 3; i < RS; i++) for (let j = 0; j < RC; j++) {
      const k = sid[i * RC + j], p = B.p;
      const cx = p[k * 3], cyv = p[k * 3 + 1], czv = p[k * 3 + 2];
      const w = {}; w['lowerarm_' + s] = 0.9; w['hand_' + s] = 0.1;
      lid.push(B.vert(cx - sg * 0.004, lerp(cyv, lerp(sh.y, wr.y, 1) - 0.02, 0.06), lerp(czv, wr.z, 0.06), 0, 0, dark, w));
    }
    B.grid(lid, 3, RC, true, null, s === 'l');
  }

  // ---------------- hood and cape, or the cowl lying on the back ----------------
  const hc = new THREE.Vector3(0, P('head').y + 0.1, P('head').z + 0.015);
  if (S.hood === 'up') {
    // a loose, pointed hood standing away from the head, framing the face,
    // its sides falling straight to a cape over the shoulders
    // fitted to the scan: the peak stands clear of the crown, the opening
    // runs from the brow to the chin
    const crown = J.crown ? J.crown.p.y : P('head_leaf').y + 0.07;
    const top = crown + 0.07, yBrow = crown - 0.075, yChin = (J.chin ? J.chin.p.y : P('head').y - 0.03) - 0.02;
    const zc = hc.z;
    const prof = [
      // y, hx, hz, cz, fold
      [top + 0.05, 0.015, 0.02, zc - 0.09, 0],
      [top, 0.075, 0.09, zc - 0.055, 0.01],
      [top - 0.06, 0.135, 0.155, zc - 0.03, 0.015],
      [hc.y + 0.02, 0.158, 0.172, zc - 0.01, 0.02],
      [yChin, 0.152, 0.165, zc - 0.005, 0.025],
      [yNeck - 0.01, 0.165, 0.16, zSpine + 0.02, 0.03],
      [yShoulder - 0.02, 0.265 * S.flare, 0.19, zSpine + 0.025, 0.035],
      [yShoulder - 0.15, 0.3 * S.flare, 0.205, zSpine + 0.03, 0.04],
    ];
    const RS = 30, RC = 44, hid = [];
    const at2 = y => { for (let i = 0; i < prof.length - 1; i++) { const A = prof[i], Bq = prof[i + 1]; if (y <= A[0] && y >= Bq[0]) { const t = (A[0] - y) / (A[0] - Bq[0]), sm = t * t * (3 - 2 * t); return A.map((v, k) => lerp(v, Bq[k], sm)); } } return prof[prof.length - 1]; };
    const yBot = prof[prof.length - 1][0];
    for (let i = 0; i < RS; i++) {
      const v = i / (RS - 1), y0 = lerp(prof[0][0], yBot, v);
      const [, hx, hz, cz, fa] = at2(y0);
      for (let j = 0; j < RC; j++) {
        const a = j / RC * TAU, ca = Math.cos(a), sa = Math.sin(a);
        const fold = 1 + fa * 3.2 * (Math.pow(0.5 + 0.5 * Math.cos(8 * a + noise1(a * 2 + y0 * 6, seed + 8) * 2.6), 1.7) - 0.4);
        const x = sa * hx * fold, z = cz + ca * hz * fold;
        // the back of the cape hangs lower than the front
        const y = y0 - (y0 < yNeck ? 0.06 * Math.max(0, -ca) * sstep(yNeck, yBot, y0) : 0);
        const w = {};
        if (y0 > yChin) { w.head = 0.72; w.neck_01 = 0.28; }
        else if (y0 > yNeck - 0.01) { const t = sstep(yChin, yNeck, y0); w.head = 0.45 * (1 - t); w.neck_01 = 0.45; w.spine_03 = 0.1 + 0.4 * t; }
        else { const t = sstep(yNeck, yBot, y0); w.neck_01 = 0.3 * (1 - t); w.spine_03 = 0.7; if (Math.abs(x) > 0.12) { const sd = x > 0 ? 'l' : 'r'; w['clavicle_' + sd] = 0.55 * t * sstep(0.12, 0.26, Math.abs(x)); } }
        const shade = 0.82 + 0.28 * (fold - 1) / Math.max(0.02, fa * 3.2) * 0.5 + 0.1;
        hid.push(B.vert(x, y, z, j / RC * 2.4, v * 1.6, cloth.map(c => c * shade), w));
      }
    }
    // the face opening, from above the brow to the chin: below it the hood
    // closes over the throat (no strip of bare neck in the opening)
    const yLo = yChin + 0.028, mid = (yBrow + 0.02 + yLo) / 2, half = (yBrow + 0.02 - yLo) / 2;
    const open = (y, a) => { const ad = Math.min(a, TAU - a), q = (y - mid) / half; return Math.abs(q) < 1 && ad < 0.78 * Math.sqrt(1 - q * q) + 0.08; };
    B.grid(hid, RS, RC, true, (i, j) => { const k = hid[i * RC + j], k2 = hid[(i + 1) * RC + j]; return open((B.p[k * 3 + 1] + B.p[k2 * 3 + 1]) / 2, (j + 0.5) / RC * TAU); });
    // roll the rim of the opening forward
    for (let i = 0; i < RS; i++) for (let j = 0; j < RC; j++) {
      const k = hid[i * RC + j], y = B.p[k * 3 + 1], a = j / RC * TAU, ad = Math.min(a, TAU - a), q = (y - mid) / (half + 0.03);
      if (Math.abs(q) < 1 && ad < 0.95 * Math.sqrt(1 - q * q) + 0.14) { B.p[k * 3 + 2] += 0.018; B.p[k * 3] *= 1.03; }
    }
  } else {
    // the cowl down: a heavy fold of cloth round the neck, lying on the back
    const RS = 14, RC = 32, cid = [];
    for (let i = 0; i < RS; i++) {
      const v = i / (RS - 1);
      for (let j = 0; j < RC; j++) {
        const a = j / RC * TAU, ca = Math.cos(a), sa = Math.sin(a);
        const back = Math.max(0, -ca);
        // (a thick fold standing a little up the neck — higher at the back —
        // then lying out over the shoulders and down the back)
        const y = lerp(yNeck + 0.028 + 0.03 * back - 0.012 * Math.max(0, ca), yShoulder - 0.07 - 0.3 * back * back, v);
        const rx = lerp(0.092, 0.225, sstep(0, 0.45, v)) * (1 - 0.1 * v * back), rz = lerp(0.09, 0.155, sstep(0, 0.45, v));
        const bulge = 0.03 * Math.sin(v * Math.PI) * (0.45 + 1.2 * back);
        const x = sa * (rx + bulge), z = lerp(zNeck, zSpine + 0.02, sstep(0, 0.4, v)) + ca * (rz + bulge) - back * 0.02 * v;
        const w = { neck_01: 0.55 * (1 - sstep(0, 0.5, v)), spine_03: 0.45 + 0.5 * sstep(0, 0.5, v) };
        if (Math.abs(x) > 0.12) { const sd = x > 0 ? 'l' : 'r'; w['clavicle_' + sd] = 0.4 * sstep(0.12, 0.24, Math.abs(x)); }
        cid.push(B.vert(x, y, z, j / RC * 2, v, cloth.map(c => c * (0.72 + 0.34 * Math.sin(v * Math.PI))), w));
      }
    }
    B.grid(cid, RS, RC, true);
  }

  // ---------------- the collar: a rolled edge hiding where the neck meets the cloth ----------------
  if (S.hood !== 'down') {
    const RS = 7, RC = 28, rid = [], rr = 0.02;
    for (let i = 0; i < RS; i++) {
      const b = i / (RS - 1) * Math.PI * 1.25 - 0.2;          // round the roll, from inside over the top to outside
      for (let j = 0; j < RC; j++) {
        const a = j / RC * TAU, ca = Math.cos(a), sa = Math.sin(a);
        const R = 0.082 + rr * Math.cos(b) + 0.006 * Math.max(0, ca), y = yNeck + 0.008 + rr * Math.sin(b) - 0.008 * Math.max(0, ca);
        rid.push(B.vert(sa * R * 1.04, y, zNeck + ca * R, j / RC * 3, i / RS, cloth.map(c => c * (0.78 + 0.18 * Math.sin(b))), { neck_01: 0.45, spine_03: 0.55 }));
      }
    }
    B.grid(rid, RS, RC, true, null, true);
  }

  // ---------------- girdle ----------------
  {
    const [, hx, hz, cz] = at(yWaist);
    const R = S.belt === 'cord' ? 0.011 : 0.018, RS = 48, RC = 8, bid = [];
    const tint = S.belt === 'cord' ? cord : leather;
    for (let i = 0; i <= RS; i++) {
      const a = i / RS * TAU, ca = Math.cos(a), sa = Math.sin(a);
      const e = 2.4, cx = Math.sign(sa) * Math.pow(Math.abs(sa), 2 / e), czz = Math.sign(ca) * Math.pow(Math.abs(ca), 2 / e);
      const px = cx * (hx + 0.008), pz = cz + czz * (hz + 0.008);
      for (let j = 0; j < RC; j++) {
        const b = j / RC * TAU;
        const nx = cx, nz = czz, nl = Math.hypot(nx, nz) || 1;
        const k = S.belt === 'cord' ? 1 : 1.6;
        bid.push(B.vert(px + nx / nl * Math.cos(b) * R, yWaist + Math.sin(b) * R * k, pz + nz / nl * Math.cos(b) * R, i / RS * 8, j / RC, tint, { spine_01: 0.7, pelvis: 0.3 }));
      }
    }
    B.grid(bid, RS + 1, RC, true);
    // the cord's hanging end, knotted, at the left front
    if (S.belt === 'cord') {
      const hid = [], L = 0.42, x0 = 0.07, z0 = cz + hz + 0.02;
      for (let i = 0; i < 10; i++) {
        const t = i / 9, y = yWaist - t * L, x = x0 + 0.01 * Math.sin(t * 3), z = z0 + 0.02 * t;
        for (let j = 0; j < 6; j++) { const b = j / 6 * TAU; hid.push(B.vert(x + Math.cos(b) * 0.009, y, z + Math.sin(b) * 0.009, 0, t, cord, { pelvis: 0.6 - 0.3 * t, thigh_l: 0.3 * t + 0.1, spine_01: 0.3 * (1 - t) })); }
      }
      B.grid(hid, 10, 6, true);
    }
  }

  // ---------------- hose (short tunics) and shoes ----------------
  for (const s of ['l', 'r']) {
    const ft = P('foot_' + s), ba = P('ball_' + s), tip = P('ball_leaf_' + s), cf = P('calf_' + s);
    if (S.hem > 0.2) {
      // woollen hose from under the tunic to the ankle
      const RS = 8, RC = 12, qid = [];
      for (let i = 0; i < RS; i++) {
        const t = i / (RS - 1), y = lerp(S.hem + 0.05, ft.y + 0.02, t);
        const cx = lerp(cf.x, ft.x, sstep(cf.y, ft.y, y)), cz = lerp(cf.z, ft.z, sstep(cf.y, ft.y, y)) + 0.005;
        const r = lerp(0.062, 0.042, t);
        for (let j = 0; j < RC; j++) { const a = j / RC * TAU; qid.push(B.vert(cx + Math.sin(a) * r, y, cz + Math.cos(a) * r * 1.1, 0, t, hose, y > cf.y - 0.05 ? { ['calf_' + s]: 0.8, ['thigh_' + s]: 0.2 } : { ['calf_' + s]: 1 })); }
      }
      B.grid(qid, RS, RC, true);
    }
    // a closed turnshoe: heel to toe, rounded, a little turned up
    const RS = 10, RC = 12, fid = [];
    const heel = new THREE.Vector3(ft.x, 0.0, ft.z - 0.075), toe = new THREE.Vector3(tip.x, 0.0, tip.z + 0.015);
    for (let i = 0; i < RS; i++) {
      const t = i / (RS - 1), x = lerp(heel.x, toe.x, t), z = lerp(heel.z, toe.z, t);
      const h = lerp(0.095, 0.035, sstep(0.35, 1, t)) * (i === RS - 1 ? 0.3 : 1), wdt = lerp(0.043, 0.047, Math.sin(t * Math.PI)) * (i === RS - 1 ? 0.3 : 1) * (i === 0 ? 0.6 : 1);
      for (let j = 0; j < RC; j++) {
        const a = j / RC * TAU, ca = Math.cos(a), sa = Math.sin(a);
        const y = 0.004 + h * (0.5 + 0.5 * sa) * (sa < 0 ? 0.15 : 1) + 0.008 * t * t;
        const w = t < 0.62 ? { ['foot_' + s]: 1 } : { ['foot_' + s]: 1 - sstep(0.62, 0.8, t), ['ball_' + s]: sstep(0.62, 0.8, t) };
        fid.push(B.vert(x + ca * wdt, y, z, t, j / RC, leather, w));
      }
    }
    B.grid(fid, RS, RC, true, null, s === 'r');
    void ba;
  }

  // ---------------- the Abbot's pectoral cross ----------------
  if (S.cross) {
    const gold = col(0xb08a3a), y0 = yChest - 0.02, z0 = at(y0)[3] + at(y0)[2] + 0.01;
    const box = (cx, cy, w, h) => {
      const q = [];
      for (const [dx, dy] of [[-w, -h], [w, -h], [-w, h], [w, h]]) q.push(B.vert(cx + dx, cy + dy, z0, 0, 0, gold, { spine_03: 1 }));
      B.ix.push(q[0], q[1], q[2], q[1], q[3], q[2]);
    };
    box(0, y0, 0.008, 0.045); box(0, y0 + 0.012, 0.03, 0.008);
  }

  const g = B.geometry();
  g.userData.style = styleName;
  return g;
}

// A greyscale wool texture: twill weave, fulling, a few slubs and wear
let WOOL = null;
export function woolTextures() {
  if (WOOL) return WOOL;
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d'), im = g.createImageData(N, N), h = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const tw = 0.5 + 0.5 * Math.sin((x + y) * TAU / 4) * Math.sin(y * TAU / 8);   // twill
    const slub = noise1(x * 0.06 + Math.floor(y / 3) * 7.3, 3) * 0.6 + noise1(y * 0.02 + x * 0.004, 5) * 0.4;
    const fuzz = hash(x * 131 + y * 7);
    h[y * N + x] = 0.55 * tw + 0.3 * slub + 0.15 * fuzz;
  }
  for (let i = 0; i < N * N; i++) { const v = 150 + h[i] * 90; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
  g.putImageData(im, 0, 0);
  const map = new THREE.CanvasTexture(c); map.wrapS = map.wrapT = THREE.RepeatWrapping; map.colorSpace = THREE.SRGBColorSpace;
  // normal map from the height
  const cn = document.createElement('canvas'); cn.width = cn.height = N;
  const gn = cn.getContext('2d'), imn = gn.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = h[y * N + ((x + 1) % N)] - h[y * N + ((x + N - 1) % N)], dy = h[((y + 1) % N) * N + x] - h[((y + N - 1) % N) * N + x];
    const nx = -dx * 2.2, ny = -dy * 2.2, nz = 1, l = Math.hypot(nx, ny, nz), i = (y * N + x) * 4;
    imn.data[i] = (nx / l * 0.5 + 0.5) * 255; imn.data[i + 1] = (ny / l * 0.5 + 0.5) * 255; imn.data[i + 2] = (nz / l * 0.5 + 0.5) * 255; imn.data[i + 3] = 255;
  }
  gn.putImageData(imn, 0, 0);
  const normal = new THREE.CanvasTexture(cn); normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
  WOOL = { map, normal };
  return WOOL;
}
