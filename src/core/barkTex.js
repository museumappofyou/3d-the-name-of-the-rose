import * as THREE from 'three';
import { rng } from './materials.js';

// Procedural textures for the trees: tileable bark (albedo + a normal map
// derived from a height field) and alpha-masked cards for needle sprays,
// winter twigs and dried leaves, packed into two atlases. The normal
// atlas's alpha channel carries a "snow bed" mask for the cards: where
// snow lies on a spray it fills the gaps between the needles.

// ---------------------------------------------------------------------
// periodic noise (every tile wraps seamlessly)
// ---------------------------------------------------------------------
function makeNoise(seed) {
  const r = rng(seed), tab = new Float32Array(4096);
  for (let i = 0; i < 4096; i++) tab[i] = r();
  const h = (x, y) => tab[((x * 73856093) ^ (y * 19349663)) & 4095];
  const wrap = (a, p) => ((a % p) + p) % p;
  function noise(x, y, px, py) {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const x0 = wrap(xi, px), x1 = wrap(xi + 1, px), y0 = wrap(yi, py), y1 = wrap(yi + 1, py);
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = h(x0, y0), b = h(x1, y0), c = h(x0, y1), d = h(x1, y1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, px, py, oct = 4) {
    let s = 0, a = 0.5, n = 0;
    for (let o = 0; o < oct; o++) { s += a * noise(x, y, px, py); n += a; x *= 2; y *= 2; px *= 2; py *= 2; a *= 0.5; }
    return s / n;
  }
  // cellular noise: distance to nearest / second nearest jittered point
  const out = { f1: 0, f2: 0, id: 0 };
  function worley(x, y, px, py, jit = 0.9) {
    const xi = Math.floor(x), yi = Math.floor(y);
    let f1 = 9, f2 = 9, id = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const cx = xi + i, cy = yi + j, wx = wrap(cx, px), wy = wrap(cy, py);
      const ox = cx + 0.5 + (h(wx, wy) - 0.5) * jit, oy = cy + 0.5 + (h(wx + 1013, wy + 2917) - 0.5) * jit;
      const d = Math.hypot(ox - x, oy - y);
      if (d < f1) { f2 = f1; f1 = d; id = h(wx + 331, wy + 77); } else if (d < f2) f2 = d;
    }
    out.f1 = f1; out.f2 = f2; out.id = id;
    return out;
  }
  return { noise, fbm, worley };
}

const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const mix3 = (A, B, t) => [mix(A[0], B[0], t), mix(A[1], B[1], t), mix(A[2], B[2], t)];

// ---------------------------------------------------------------------
// bark: height field + albedo per kind, all tileable over the w×h tile
// ---------------------------------------------------------------------
function barkField(kind, w, h, seed) {
  const N = makeNoise(seed);
  const H = new Float32Array(w * h), C = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = (x + 0.5) / w, v = (y + 0.5) / h, i = y * w + x;
    let hg, col;
    if (kind === 'elm' || kind === 'oak') {
      // long corky ridges that wander, split and join; oak plates are
      // broader and broken more often by horizontal cracks
      const oak = kind === 'oak';
      const R = oak ? 10 : 15;
      const wx = N.fbm(u * 4, v * 2, 4, 2, 3), wy = N.fbm(u * 8 + 3.1, v * 4 + 1.7, 8, 4, 2);
      const s = u * R + (wx - 0.5) * (oak ? 3.4 : 2.6) + (wy - 0.5) * 1.3;
      const tri = 1 - Math.abs(2 * (s - Math.floor(s)) - 1);
      const ridge = ss(oak ? 0.12 : 0.1, oak ? 0.62 : 0.72, tri);
      const b = N.fbm(u * 6 + 7.3, v * (oak ? 22 : 12), 6, oak ? 22 : 12, 2);
      const brk = ss(0.0, oak ? 0.07 : 0.045, Math.abs(b - 0.5));
      const fine = N.fbm(u * 32, v * 64, 32, 64, 2);
      hg = ridge * (0.55 + 0.45 * brk) * (0.78 + 0.22 * fine) + ridge * 0.08 * N.noise(u * 64, v * 16, 64, 16);
      const lichen = ss(0.6, 0.72, N.fbm(u * 5 + 11, v * 5, 5, 5, 3)) * ridge;
      const top = oak ? [96, 90, 84] : [100, 90, 80], deep = oak ? [30, 26, 24] : [40, 34, 30];
      col = mix3(deep, top, Math.pow(hg, 0.8));
      col = mix3(col, [112, 116, 100], lichen * 0.7);
      const sp = 0.9 + 0.2 * fine; col = col.map(c => c * sp);
    } else if (kind === 'fruit') {
      // apple/pear: small scaly plates flaking off
      const c = N.worley(u * 9, v * 14, 9, 14);
      const edge = c.f2 - c.f1, id = c.id;
      const plate = ss(0.02, 0.14, edge);
      const fine = N.fbm(u * 40, v * 60, 40, 60, 2);
      hg = plate * (0.62 + 0.3 * id) + 0.1 * fine - 0.12 * (1 - plate);
      col = mix3([94, 86, 77], [110, 92, 74], id);
      col = mix3([44, 38, 34], col, plate);
      const al = ss(0.55, 0.7, N.fbm(u * 4, v * 4 + 5, 4, 4, 3)) * plate;
      col = mix3(col, [96, 104, 88], al * 0.6);
      col = col.map(k => k * (0.88 + 0.22 * fine));
    } else if (kind === 'fir') {
      // silver fir: smooth, silvery grey, finely scaled in patches
      const f = N.fbm(u * 6, v * 6, 6, 6, 4);
      const c = N.worley(u * 16, v * 11, 16, 11);
      const crack = (1 - ss(0.0, 0.05, c.f2 - c.f1)) * ss(0.45, 0.6, N.fbm(u * 3 + 2, v * 3, 3, 3, 2));
      const lent = ss(0.72, 0.8, N.noise(u * 48, v * 150, 48, 150)) * ss(0.4, 0.6, N.noise(u * 10, v * 6, 10, 6));
      hg = 0.55 + 0.25 * f - 0.35 * crack - 0.12 * lent;
      col = mix3([84, 82, 78], [126, 124, 118], f);
      col = mix3(col, [58, 54, 50], crack * 0.8 + lent * 0.5);
      col = mix3(col, [112, 120, 104], ss(0.62, 0.75, N.fbm(u * 5, v * 5 + 3, 5, 5, 3)) * 0.6);
    } else if (kind === 'pine') {
      // pine: flaking plates, reddish grey, between dark fissures
      const c = N.worley(u * 6 + (N.fbm(u * 3, v * 3, 3, 3, 2) - 0.5) * 0.8, v * 4, 6, 4, 0.8);
      const edge = c.f2 - c.f1;
      const plate = ss(0.03, 0.16, edge);
      const layers = N.fbm(u * 18, v * 18, 18, 18, 3);
      const q = Math.floor(layers * 5) / 5;
      hg = plate * (0.55 + 0.35 * q + 0.1 * c.id);
      col = mix3([100, 82, 70], [126, 102, 84], c.id * 0.6 + q * 0.4);
      col = mix3([32, 26, 23], col, plate);
    } else if (kind === 'cane') {
      const f = N.fbm(u * 3, v * 30, 3, 30, 3);
      hg = 0.5 + 0.1 * f;
      col = mix3([60, 52, 38], [84, 76, 52], f);
    } else { // hips
      const f = N.fbm(u * 4, v * 4, 4, 4, 3);
      hg = 0.5 + 0.2 * f;
      col = mix3([70, 22, 18], [118, 40, 28], f);
    }
    H[i] = hg; C[i * 3] = col[0]; C[i * 3 + 1] = col[1]; C[i * 3 + 2] = col[2];
  }
  return { H, C };
}

function normalFromHeight(H, w, h, k) {
  const out = new Uint8Array(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const l = H[y * w + (x - 1 + w) % w], r = H[y * w + (x + 1) % w];
    const d = H[((y - 1 + h) % h) * w + x], u = H[((y + 1) % h) * w + x];
    let nx = -(r - l) * k, ny = -(u - d) * k, nz = 1;
    const L = Math.hypot(nx, ny, nz); nx /= L; ny /= L; nz /= L;
    const i = (y * w + x) * 3;
    out[i] = (nx * 0.5 + 0.5) * 255; out[i + 1] = (ny * 0.5 + 0.5) * 255; out[i + 2] = (nz * 0.5 + 0.5) * 255;
  }
  return out;
}

// ---------------------------------------------------------------------
// the atlas: RGBA albedo + RGBA normal (alpha = snow bed for cards)
// ---------------------------------------------------------------------
class Atlas {
  constructor(W, H) {
    this.W = W; this.H = H;
    this.rgba = new Uint8Array(W * H * 4);
    this.nrm = new Uint8Array(W * H * 4);
    for (let i = 0; i < W * H; i++) { this.rgba.set([70, 64, 58, 0], i * 4); this.nrm.set([128, 128, 255, 0], i * 4); }
  }
  // tileable content w×h placed at (x0+pad, y0+pad), padded by wrapping
  tiled(x0, y0, w, h, pad, kind, seed, strength, metres) {
    const { H, C } = barkField(kind, w, h, seed);
    const Nn = normalFromHeight(H, w, h, strength);
    for (let dy = -pad; dy < h + pad; dy++) for (let dx = -pad; dx < w + pad; dx++) {
      const sx = (dx + w) % w, sy = (dy + h) % h, si = sy * w + sx;
      const o = ((y0 + pad + dy) * this.W + x0 + pad + dx) * 4;
      this.rgba[o] = C[si * 3]; this.rgba[o + 1] = C[si * 3 + 1]; this.rgba[o + 2] = C[si * 3 + 2]; this.rgba[o + 3] = 255;
      this.nrm[o] = Nn[si * 3]; this.nrm[o + 1] = Nn[si * 3 + 1]; this.nrm[o + 2] = Nn[si * 3 + 2]; this.nrm[o + 3] = 255;
    }
    return this.region(x0 + pad, y0 + pad, w, h, metres[0], metres[1]);
  }
  // an alpha card drawn on a canvas (canvas top = v 1); wrapX pads the
  // region horizontally by wrapping (for skirts tiled around a cone)
  card(x0, y0, w, h, draw, { bg = [40, 50, 44], bed = 0, wrapX = 0, seed = 1 } = {}) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    g.lineCap = 'round'; g.lineJoin = 'round';
    draw(g, w, h, rng(seed));
    const src = g.getImageData(0, 0, w, h).data;
    const A = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) A[i] = src[i * 4 + 3] / 255;
    let B = null;
    if (bed) {
      B = blur(A, w, h, bed, wrapX > 0); B = blur(B, w, h, bed, wrapX > 0);
    }
    for (let j = 0; j < h; j++) for (let dx = -wrapX; dx < w + wrapX; dx++) {
      const i = (j * w + (dx + w) % w), a = A[i];
      const o = ((y0 + h - 1 - j) * this.W + x0 + dx) * 4;
      for (let c = 0; c < 3; c++) this.rgba[o + c] = src[i * 4 + c] * a + bg[c] * (1 - a);
      this.rgba[o + 3] = a * 255;
      this.nrm[o + 3] = B ? ss(0.22, 0.55, B[i]) * 255 : 0;
    }
    return this.region(x0, y0, w, h, 1, 1);
  }
  region(x, y, w, h, su, sv) { return { r: [x / this.W, y / this.H, w / this.W, h / this.H], su, sv }; }
  textures() {
    const mk = (data, srgb) => {
      const t = new THREE.DataTexture(data, this.W, this.H, THREE.RGBAFormat);
      t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
      t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      t.needsUpdate = true;
      return t;
    };
    return { map: mk(this.rgba, true), normal: mk(this.nrm, false) };
  }
}

function blur(A, w, h, r, wrapX) {
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h), n = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    let s = 0;
    for (let k = -r; k <= r; k++) s += A[y * w + (wrapX ? (k + w) % w : Math.min(w - 1, Math.max(0, k)))];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = s / n;
      const add = x + r + 1, sub = x - r;
      s += A[y * w + (wrapX ? add % w : Math.min(w - 1, add))] - A[y * w + (wrapX ? (sub + w) % w : Math.max(0, sub))];
    }
  }
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let k = -r; k <= r; k++) s += tmp[Math.min(h - 1, Math.max(0, k)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = s / n;
      s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

// ---------------------------------------------------------------------
// card drawing
// ---------------------------------------------------------------------
const rgb = (c, k = 1) => `rgb(${c[0] * k | 0},${c[1] * k | 0},${c[2] * k | 0})`;
function line(g, x0, y0, x1, y1, w, c) { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
const NEEDLE = [[24, 36, 32], [30, 43, 38], [35, 50, 43], [27, 40, 36], [40, 54, 47], [33, 46, 42]];

// needles combed out along a polyline
function needleRow(g, pts, r, { len = 11, gap = 2.4, ang = 1.25, fwd = 0.35, width = 2, pal = NEEDLE, sides = 2, lenFn = null }) {
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i], L = Math.hypot(bx - ax, by - ay);
    if (L < 1e-3) continue;
    const dx = (bx - ax) / L, dy = (by - ay) / L;
    while (acc < L) {
      const x = ax + dx * acc, y = ay + dy * acc, t = (i - 1 + acc / L) / (pts.length - 1);
      for (let s = 0; s < sides; s++) {
        const sg = sides === 1 ? (r() < 0.5 ? -1 : 1) : (s ? 1 : -1);
        const a = Math.atan2(dy, dx) + sg * (ang + (r() - 0.5) * 0.35) - sg * fwd;
        const l = (lenFn ? lenFn(t) : 1) * len * (0.75 + r() * 0.5);
        const c = pal[(r() * pal.length) | 0], k = 0.85 + r() * 0.3;
        g.strokeStyle = rgb(c, k); g.lineWidth = width * (0.8 + r() * 0.4);
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
      }
      acc += gap * (0.75 + r() * 0.5);
    }
    acc -= L;
  }
}
function curve(x, y, a, len, bend, n = 10, wob = 0, r = Math.random) {
  const pts = [[x, y]];
  for (let i = 0; i < n; i++) { a += bend / n + (r() - 0.5) * wob; x += Math.cos(a) * len / n; y += Math.sin(a) * len / n; pts.push([x, y]); }
  return pts;
}
function polyStroke(g, pts, w0, w1, c) {
  for (let i = 1; i < pts.length; i++) line(g, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], mix(w0, w1, i / (pts.length - 1)), c);
}

// silver-fir frond: rachis along u (base at left), flat comb of laterals
function firFrond(g, W, H, r) {
  const cy = H / 2;
  const rachis = curve(6, cy + 6, -0.01, W - 16, 0.04, 30, 0.02, r);
  const env = t => t < 0.07 ? 0 : Math.min(1, (t - 0.07) / 0.32) ** 0.7 * (1 - 0.82 * Math.pow(Math.max(0, (t - 0.5) / 0.5), 1.4));
  const twigs = [];
  let side = 1;
  for (let t = 0.09; t < 0.97; t += 0.024 + r() * 0.01) {
    side = -side;
    const p = rachis[Math.min(rachis.length - 1, Math.round(t * (rachis.length - 1)))];
    const L = env(t) * H * 0.47 * (0.8 + r() * 0.35);
    if (L < 8) continue;
    const a = side * (0.95 + (r() - 0.5) * 0.3);
    const lat = curve(p[0], p[1], a, L, -side * 0.35, 8, 0.05, r);
    twigs.push({ pts: lat, w: 2.4, o: 1 });
    for (const f of [0.3, 0.55, 0.78]) {
      if (L < 40) break;
      const q = lat[Math.round(f * (lat.length - 1))], s2 = r() < 0.5 ? -1 : 1;
      const dirA = Math.atan2(lat[lat.length - 1][1] - lat[0][1], lat[lat.length - 1][0] - lat[0][0]);
      twigs.push({ pts: curve(q[0], q[1], dirA + s2 * 0.8, L * 0.32 * (1.1 - f * 0.5), -s2 * 0.2, 4, 0.05, r), w: 1.5, o: 2 });
    }
  }
  polyStroke(g, rachis, 7, 2.5, '#4a3d31');
  for (const t of twigs) polyStroke(g, t.pts, t.w, 1, '#4f4233');
  // needles: sparse near the trunk, dense and long in the middle
  needleRow(g, rachis.slice(Math.round(rachis.length * 0.3)), r, { len: 12, gap: 2.6, width: 2.2 });
  for (const t of twigs) needleRow(g, t.pts, r, { len: t.o === 1 ? 12 : 10, gap: 2.1, width: 2.1, lenFn: q => 1 - 0.4 * q * q });
  // a few whitish needle undersides
  needleRow(g, twigs.filter((_, i) => i % 5 === 0).flatMap(t => t.pts), r, { len: 8, gap: 9, width: 1.4, pal: [[70, 84, 82], [62, 76, 74]] });
}

// Norway spruce: branch along the top, branchlets hanging in a curtain
function spruceCurtain(g, W, H, r) {
  const top = curve(0, 34, 0.03, W, -0.02, 20, 0.02, r);
  polyStroke(g, top, 6, 3, '#4a3d31');
  needleRow(g, top, r, { len: 10, gap: 2, width: 2 });
  for (let x = 10; x < W - 6; x += 9 + r() * 6) {
    const t = x / W, env = 0.45 + 0.55 * Math.sin(Math.PI * Math.min(1, t * 1.15));
    const L = (H - 60) * env * (0.55 + r() * 0.45);
    const p = top[Math.min(top.length - 1, Math.round(t * (top.length - 1)))];
    const pts = curve(p[0], p[1], Math.PI / 2 - 0.25 + (r() - 0.5) * 0.3, L, 0.25 + (r() - 0.5) * 0.3, 10, 0.06, r);
    polyStroke(g, pts, 2, 1, '#4b3f33');
    needleRow(g, pts, r, { len: 9, gap: 1.9, width: 1.9, ang: 0.9, fwd: 0.2, lenFn: q => 1 - 0.35 * q });
  }
}

// pine: twigs fanning up from the base, ending in brushes of long needles
const PINE = [[44, 58, 43], [52, 66, 47], [40, 53, 40], [58, 70, 51], [48, 60, 46]];
function pineTufts(g, W, H, r) {
  const tuft = (x, y, a, n, len) => {
    for (let i = 0; i < n; i++) {
      const b = a + (r() - 0.5) * 2.5, l = len * (0.6 + r() * 0.5), c = PINE[(r() * PINE.length) | 0];
      const bend = (r() - 0.5) * 0.3;
      g.strokeStyle = rgb(c, 0.85 + r() * 0.3); g.lineWidth = 1.3 + r() * 0.8;
      g.beginPath(); g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(b) * l * 0.5, y + Math.sin(b) * l * 0.5, x + Math.cos(b + bend) * l, y + Math.sin(b + bend) * l); g.stroke();
    }
  };
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI / 2 + (k - 2.5) * 0.3 + (r() - 0.5) * 0.2;
    const L = H * (0.45 + r() * 0.3);
    const pts = curve(W / 2 + (r() - 0.5) * 20, H - 4, a, L, (r() - 0.5) * 0.5, 8, 0.08, r);
    polyStroke(g, pts, 5, 2.5, '#5a4636');
    const e = pts[pts.length - 1], m = pts[5];
    needleRow(g, pts.slice(4), r, { len: 26, gap: 3, width: 1.4, ang: 0.6, fwd: 0.1, pal: PINE });
    tuft(m[0], m[1], a + (r() - 0.5), 30, 55);
    tuft(e[0], e[1], a, 70, 80);
  }
}

// conifer tier skirt (tiles in u): dense needles, ragged drooping hem
function skirt(g, W, H, r, long) {
  const dark = [20, 30, 27];
  g.fillStyle = rgb(dark); g.fillRect(0, 0, W, H * 0.42);
  for (let i = 0; i < 5000; i++) {
    const x = r() * W, y = r() * H * 0.45, a = Math.PI / 2 + (r() - 0.5) * 1.6, l = 6 + r() * 8;
    g.strokeStyle = rgb(NEEDLE[(r() * NEEDLE.length) | 0], 0.7 + r() * 0.4); g.lineWidth = 1.8;
    for (const ox of [0, -W, W]) { g.beginPath(); g.moveTo(x + ox, y); g.lineTo(x + ox + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  }
  const n = long ? 44 : 60;
  for (let i = 0; i < n; i++) {
    const x = r() * W, y0 = H * (0.2 + r() * 0.22), L = H * (long ? 0.45 + r() * 0.33 : 0.3 + r() * 0.3);
    const a = Math.PI / 2 + (r() - 0.5) * 0.5;
    for (const ox of [0, -W, W]) {
      const pts = curve(x + ox, y0, a, L, (r() - 0.5) * 0.4, 6, 0.05, r);
      polyStroke(g, pts, 3, 1.5, '#3c3228');
      needleRow(g, pts, r, { len: long ? 9 : 12, gap: 2.2, width: 2, ang: 1.0, fwd: 0.35, lenFn: q => 1 - 0.4 * q });
    }
  }
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, 'rgba(0,0,0,0.35)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.08)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = gr; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
}

// winter twigs: a fan of fine shoots from the base (bottom centre)
function twigs(g, W, H, r, { zig = 0.22, main = 3, stepLen = 30, depth = 3, spur = false } = {}) {
  // grey-brown winter shoots: darker than the sky behind them, but not the
  // black of a silhouette (the flat November light greys them)
  const cols = ['#534b44', '#5a5149', '#61574e', '#4d4640', '#686055'];
  const bud = (x, y, s) => { g.fillStyle = spur ? '#6f604f' : '#4d3a30'; g.beginPath(); g.ellipse(x, y, s, s * (spur ? 1 : 1.5), r() * 3, 0, 7); g.fill(); };
  const shoot = (x, y, a, len, w, d) => {
    const steps = Math.max(2, Math.round(len / (stepLen * (0.8 + r() * 0.4))));
    let side = r() < 0.5 ? -1 : 1;
    const c = cols[(r() * cols.length) | 0];
    for (let k = 0; k < steps; k++) {
      const seg = len / steps;
      a += side * zig * (0.6 + r() * 0.8) * 0.5 + (r() - 0.5) * 0.08;
      const nx = x + Math.cos(a) * seg, ny = y + Math.sin(a) * seg;
      const ww = mix(w, Math.max(1, w * 0.35), k / steps);
      line(g, x, y, nx, ny, ww, c);
      x = nx; y = ny;
      if (d > 0 && k < steps - 1) {
        const f = 1 - k / steps;
        shoot(x, y, a + side * (0.55 + r() * 0.4), len * (0.3 + 0.35 * f) * (0.7 + r() * 0.5), ww * 0.65, d - 1);
      } else if (spur && r() < 0.6) {
        const sa = a + side * (0.8 + r() * 0.8), sl = 6 + r() * 12;
        line(g, x, y, x + Math.cos(sa) * sl, y + Math.sin(sa) * sl, 3, '#5a4c40');
        bud(x + Math.cos(sa) * sl, y + Math.sin(sa) * sl, 3 + r() * 1.5);
      } else if (r() < 0.5) bud(x + Math.cos(a + side * 1.2) * 2, y + Math.sin(a + side * 1.2) * 2, 1.6);
      side = -side;
    }
    bud(x, y, spur ? 3.2 : 2);
  };
  for (let m = 0; m < main; m++) {
    const a = -Math.PI / 2 + (m - (main - 1) / 2) * 0.42 + (r() - 0.5) * 0.2;
    shoot(W / 2 + (r() - 0.5) * 10, H - 3, a, H * (0.7 + r() * 0.25), spur ? 6 : 5, depth);
  }
  if (spur) for (let m = 0; m < 3; m++) { // straight water sprouts
    const x = W / 2 + (r() - 0.5) * W * 0.5;
    const pts = curve(x, H - 3, -Math.PI / 2 + (r() - 0.5) * 0.2, H * (0.6 + r() * 0.35), 0, 3, 0.02, r);
    polyStroke(g, pts, 3, 1.5, '#5b4a3e'); bud(pts[3][0], pts[3][1], 2);
  }
}

// oak twig still holding its dried leaves (marcescent downy oak)
function oakLeaves(g, W, H, r) {
  const pts = curve(W / 2, H - 2, -Math.PI / 2 + (r() - 0.5) * 0.3, H * 0.7, 0.3, 6, 0.1, r);
  polyStroke(g, pts, 4, 1.5, '#4f433a');
  const leaf = (x, y, a, L) => {
    const Wd = L * 0.45, sx = 0.55 + r() * 0.45;
    g.save(); g.translate(x, y); g.rotate(a); g.scale(1, sx);
    g.beginPath(); g.moveTo(0, 0);
    const lobes = 4;
    for (let s = -1; s <= 1; s += 2) {
      for (let k = 0; k <= lobes; k++) {
        const t = (s < 0 ? k : lobes - k) / lobes, xx = L * (0.1 + 0.9 * t), wv = Wd * Math.sin(Math.PI * (0.15 + 0.85 * t)) * (k % 2 ? 0.6 : 1);
        g.lineTo(xx, s * wv * 0.5);
      }
    }
    g.closePath();
    const c = [[98, 72, 50], [86, 64, 46], [112, 84, 58], [78, 60, 44]][(r() * 4) | 0];
    g.fillStyle = rgb(c, 0.9 + r() * 0.2); g.fill();
    g.strokeStyle = 'rgba(40,28,20,0.6)'; g.lineWidth = 1; g.stroke();
    line(g, 0, 0, L * 0.9, 0, 1.2, 'rgba(50,36,26,0.8)');
    g.restore();
  };
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i];
    for (let k = 0; k < 2; k++) leaf(x, y, Math.PI / 2 + (r() - 0.5) * 2.4, 40 + r() * 30);
  }
}

// ---------------------------------------------------------------------
export function makeTreeAtlases() {
  // broadleaf trees and the rose bushes
  const wood = new Atlas(2048, 1024), R = {};
  R.elm = wood.tiled(0, 0, 320, 640, 16, 'elm', 11, 3.2, [0.55, 1.1]);
  R.oak = wood.tiled(352, 0, 320, 640, 16, 'oak', 12, 3.8, [0.6, 1.2]);
  R.fruit = wood.tiled(704, 0, 320, 640, 16, 'fruit', 13, 2.8, [0.4, 0.8]);
  R.cane = wood.tiled(1056, 0, 64, 64, 16, 'cane', 14, 1, [0.05, 0.3]);
  R.hips = wood.tiled(1152, 0, 64, 64, 16, 'hips', 15, 1, [0.05, 0.05]);
  R.twig = wood.card(1536, 512, 512, 512, (g, w, h, r) => twigs(g, w, h, r, { zig: 0.3, main: 3, stepLen: 28, depth: 3 }), { bg: [84, 77, 70], seed: 21 });
  R.twigB = wood.card(1536, 0, 512, 512, (g, w, h, r) => twigs(g, w, h, r, { zig: 0.16, main: 4, stepLen: 40, depth: 2 }), { bg: [84, 77, 70], seed: 29 });
  R.spur = wood.card(1024, 512, 512, 512, (g, w, h, r) => twigs(g, w, h, r, { zig: 0.1, main: 3, stepLen: 24, depth: 1, spur: true }), { bg: [84, 77, 70], seed: 23 });
  R.leaves = wood.card(1280, 256, 256, 256, oakLeaves, { bg: [88, 66, 48], seed: 25 });

  // conifers
  const con = new Atlas(2048, 1024), C = {};
  C.frond = con.card(0, 512, 1024, 512, firFrond, { bg: [30, 42, 37], bed: 7, seed: 31 });
  C.curtain = con.card(1024, 512, 512, 512, spruceCurtain, { bg: [28, 40, 35], bed: 5, seed: 32 });
  C.tuft = con.card(1536, 512, 512, 512, pineTufts, { bg: [46, 58, 44], bed: 9, seed: 33 });
  C.skirt = con.card(16, 256, 992, 256, (g, w, h, r) => skirt(g, w, h, r, false), { bg: [26, 37, 33], wrapX: 16, bed: 4, seed: 34 });
  C.skirtB = con.card(16, 0, 992, 256, (g, w, h, r) => skirt(g, w, h, r, true), { bg: [26, 37, 33], wrapX: 16, bed: 4, seed: 35 });
  C.skirt.su = C.skirtB.su = 1.6;
  C.fir = con.tiled(1024, 0, 320, 320, 16, 'fir', 36, 1.6, [0.6, 0.6]);
  C.pine = con.tiled(1376, 0, 320, 320, 16, 'pine', 37, 3.6, [0.55, 0.55]);
  return { wood: { tex: wood.textures(), R, size: [wood.W, wood.H] }, conifer: { tex: con.textures(), R: C, size: [con.W, con.H] } };
}
