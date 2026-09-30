import * as THREE from 'three';
import { rng } from './materials.js';

// Carved relief as textures: figures are painted into a height field on a
// canvas, a normal map is derived from it, and a lightly polychromed albedo
// is painted from the same shapes ("the cheerful softness of the colours").

function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function heightToNormal(hc, strength = 3) {
  const w = hc.width, h = hc.height;
  const src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const out = makeCanvas(w, h), g = out.getContext('2d'), img = g.createImageData(w, h);
  const H = (x, y) => src[((Math.min(h - 1, Math.max(0, y)) * w) + Math.min(w - 1, Math.max(0, x))) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x + 1, y - 1) + 2 * H(x + 1, y) + H(x + 1, y + 1)) - (H(x - 1, y - 1) + 2 * H(x - 1, y) + H(x - 1, y + 1));
    const dy = (H(x - 1, y + 1) + 2 * H(x, y + 1) + H(x + 1, y + 1)) - (H(x - 1, y - 1) + 2 * H(x, y - 1) + H(x + 1, y - 1));
    let nx = -dx * strength, ny = dy * strength, nz = 1;
    const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = (y * w + x) * 4;
    img.data[i] = (nx * 0.5 + 0.5) * 255; img.data[i + 1] = (ny * 0.5 + 0.5) * 255; img.data[i + 2] = nz * 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return out;
}
function ao(hc) {
  // cavity darkening from blurred height difference
  const w = hc.width, h = hc.height;
  const blur = makeCanvas(w, h), bg = blur.getContext('2d');
  bg.filter = 'blur(10px)'; bg.drawImage(hc, 0, 0);
  const a = hc.getContext('2d').getImageData(0, 0, w, h).data, b = bg.getImageData(0, 0, w, h).data;
  const out = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = Math.max(0, Math.min(1, 1 - Math.max(0, (b[i * 4] - a[i * 4]) / 255) * 2.2));
  return out;
}

// stone albedo with grain, then shapes tinted by their own paint layer
function finish(hc, paint, base = [196, 186, 168], { grain = 0.12, paint: pw = 0.55 } = {}) {
  const w = hc.width, h = hc.height;
  const occ = ao(hc);
  const out = makeCanvas(w, h), g = out.getContext('2d');
  g.drawImage(paint, 0, 0);
  const img = g.getImageData(0, 0, w, h), d = img.data;
  const hd = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const r = rng(9);
  for (let i = 0; i < w * h; i++) {
    const k = i * 4, a = d[k + 3] / 255;
    const n = 1 - grain + r() * grain * 2;
    const hv = hd[k] / 255;
    for (let c = 0; c < 3; c++) {
      const stone = base[c] * (0.8 + hv * 0.12);
      d[k + c] = Math.min(255, (stone * (1 - a * pw) + d[k + c] * a * pw) * n * (0.55 + 0.45 * occ[i]));
    }
    d[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return out;
}
function tex(c, srgb) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// --- drawing primitives on both layers ---------------------------------
class Carver {
  constructor(w, h) {
    this.hc = makeCanvas(w, h); this.pc = makeCanvas(w, h);
    this.h = this.hc.getContext('2d'); this.p = this.pc.getContext('2d');
    this.h.fillStyle = '#000'; this.h.fillRect(0, 0, w, h);
    this.w = w; this.H = h;
  }
  // raised blob: radial gradient ellipse
  blob(x, y, rx, ry, height = 1, paint = null, rot = 0) {
    const g = this.h;
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(1, ry / rx);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
    const v = Math.round(255 * height);
    gr.addColorStop(0, `rgba(${v},${v},${v},1)`); gr.addColorStop(0.7, `rgba(${v},${v},${v},0.85)`); gr.addColorStop(1, `rgba(${v},${v},${v},0)`);
    g.globalCompositeOperation = 'lighten'; g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, 7); g.fill();
    g.restore();
    if (paint) { const p = this.p; p.save(); p.translate(x, y); p.rotate(rot); p.scale(1, ry / rx); p.fillStyle = paint; p.beginPath(); p.arc(0, 0, rx * 0.85, 0, 7); p.fill(); p.restore(); }
  }
  // flat raised polygon with soft edge
  poly(pts, height = 0.8, paint = null, blur = 3) {
    const g = this.h, v = Math.round(255 * height);
    g.save(); g.filter = `blur(${blur}px)`; g.globalCompositeOperation = 'lighten';
    g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); g.restore();
    if (paint) { const p = this.p; p.fillStyle = paint; p.beginPath(); pts.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); p.closePath(); p.fill(); }
  }
  line(pts, width, height = 0.8, paint = null) {
    const g = this.h, v = Math.round(255 * height);
    g.save(); g.filter = 'blur(1.5px)'; g.globalCompositeOperation = 'lighten'; g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = width; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); g.restore();
    if (paint) { const p = this.p; p.strokeStyle = paint; p.lineWidth = width * 0.8; p.lineCap = 'round'; p.beginPath(); pts.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); p.stroke(); }
  }
  carveLine(pts, width, depth = 0.2) { // incised groove (folds)
    const g = this.h; g.save(); g.filter = 'blur(1px)'; g.globalCompositeOperation = 'darken';
    g.strokeStyle = `rgba(0,0,0,${depth})`; g.lineWidth = width; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); g.restore();
    g.save(); g.globalCompositeOperation = 'multiply'; g.strokeStyle = `rgba(${255 - depth * 255},${255 - depth * 255},${255 - depth * 255},1)`; g.lineWidth = width;
    g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); g.restore();
  }
  ground(height = 0.18) { const g = this.h, v = Math.round(255 * height); g.save(); g.globalCompositeOperation = 'lighten'; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, 0, this.w, this.H); g.restore(); }
  result(base, strength, o = {}) {
    return { map: tex(finish(this.hc, this.pc, base, o), true), normalMap: tex(heightToNormal(this.hc, strength), false), height: this.hc };
  }
}

// a seated figure (elder, apostle, Christ): head, halo, robe, knees, feet
function seated(c, x, y, s, { crown = false, halo = false, attr = null, robe = 'rgba(240,236,224,.9)', face = 1 } = {}) {
  if (halo) c.blob(x, y - s * 0.95, s * 0.36, s * 0.36, 0.45, 'rgba(206,164,70,.95)');
  c.blob(x, y - s * 0.95, s * 0.2, s * 0.24, 0.95, 'rgba(226,196,160,.6)'); // head
  if (crown) c.poly([[x - s * 0.19, y - s * 1.12], [x - s * 0.2, y - s * 1.28], [x - s * 0.1, y - s * 1.18], [x, y - s * 1.32], [x + s * 0.1, y - s * 1.18], [x + s * 0.2, y - s * 1.28], [x + s * 0.19, y - s * 1.12]], 1, 'rgba(214,170,60,1)', 1);
  c.poly([[x - s * 0.24, y - s * 0.72], [x + s * 0.24, y - s * 0.72], [x + s * 0.36, y - s * 0.1], [x + s * 0.5, y + s * 0.05], [x + s * 0.46, y + s * 0.62], [x - s * 0.46, y + s * 0.62], [x - s * 0.5, y + s * 0.05], [x - s * 0.36, y - s * 0.1]], 0.78, robe, 2.5);
  c.blob(x - s * 0.22, y + s * 0.02, s * 0.2, s * 0.13, 0.9); c.blob(x + s * 0.22, y + s * 0.02, s * 0.2, s * 0.13, 0.9); // knees
  for (let k = -2; k <= 2; k++) c.carveLine([[x + k * s * 0.09, y - s * 0.6], [x + k * s * 0.13, y + s * 0.58]], 1.4, 0.18);
  c.carveLine([[x - s * 0.44, y + s * 0.2], [x, y + s * 0.34], [x + s * 0.44, y + s * 0.2]], 1.4, 0.2);
  // arms / attribute
  if (attr === 'viol') { c.blob(x + s * 0.3, y - s * 0.25, s * 0.14, s * 0.24, 0.95, 'rgba(150,100,50,.8)', 0.5); c.line([[x + s * 0.4, y - s * 0.45], [x + s * 0.55, y - s * 0.75]], 3, 0.95); }
  else if (attr === 'phial') { c.blob(x - s * 0.28, y - s * 0.3, s * 0.09, s * 0.14, 1, 'rgba(210,170,70,1)'); }
  else if (attr === 'book') { c.poly([[x - s * 0.18, y - s * 0.42], [x + s * 0.18, y - s * 0.42], [x + s * 0.18, y - s * 0.12], [x - s * 0.18, y - s * 0.12]], 0.95, 'rgba(160,40,30,.9)', 1); }
  else if (attr === 'key') { c.line([[x + s * 0.3, y - s * 0.6], [x + s * 0.3, y - s * 0.05]], 3, 1, 'rgba(210,170,70,1)'); c.blob(x + s * 0.3, y - s * 0.65, s * 0.07, s * 0.07, 1); }
  else if (attr === 'sword') { c.line([[x - s * 0.3, y - s * 0.85], [x - s * 0.3, y + s * 0.1]], 2.5, 1, 'rgba(200,200,210,1)'); }
  else if (attr === 'scroll') { c.line([[x - s * 0.3, y - s * 0.5], [x + s * 0.3, y - s * 0.2]], 4, 0.9, 'rgba(240,230,200,1)'); }
  void face;
}
function beast(c, kind, x, y, s, flip = 1) {
  const gold = 'rgba(205,165,70,.9)';
  if (kind === 'eagle') {
    c.blob(x, y, s * 0.22, s * 0.32, 0.9, 'rgba(120,90,60,.7)');
    c.blob(x, y - s * 0.38, s * 0.11, s * 0.12, 0.95);
    c.poly([[x, y - s * 0.1], [x - s * 0.75 * flip, y - s * 0.55], [x - s * 0.55 * flip, y - s * 0.1], [x - s * 0.7 * flip, y + s * 0.1]], 0.7, 'rgba(120,90,60,.7)', 2);
    c.poly([[x, y - s * 0.1], [x + s * 0.75 * flip, y - s * 0.55], [x + s * 0.55 * flip, y - s * 0.1], [x + s * 0.7 * flip, y + s * 0.1]], 0.7, 'rgba(120,90,60,.7)', 2);
    for (let k = 0; k < 6; k++) c.carveLine([[x + (0.1 + k * 0.1) * s, y - s * 0.1 - k * s * 0.07], [x + (0.12 + k * 0.1) * s, y + s * 0.05]], 1.2, 0.25);
    c.blob(x, y - s * 0.38, s * 0.3, s * 0.3, 0.35, gold);
  } else if (kind === 'man') {
    c.blob(x, y - s * 0.45, s * 0.3, s * 0.3, 0.35, gold);
    c.blob(x, y - s * 0.45, s * 0.13, s * 0.15, 0.95);
    c.poly([[x - s * 0.18, y - s * 0.28], [x + s * 0.18, y - s * 0.28], [x + s * 0.28, y + s * 0.45], [x - s * 0.28, y + s * 0.45]], 0.8, 'rgba(236,230,215,.8)');
    c.poly([[x - s * 0.1, y - s * 0.1], [x + s * 0.1, y - s * 0.1], [x + s * 0.1, y + s * 0.08], [x - s * 0.1, y + s * 0.08]], 1, 'rgba(160,40,30,.9)', 1);
    c.poly([[x + s * 0.12, y - s * 0.3], [x + s * 0.7, y - s * 0.6], [x + s * 0.35, y]], 0.6, null);
  } else { // lion or bull: quadruped, body away from the throne, head turned back
    const lion = kind === 'lion';
    c.blob(x, y, s * 0.5, s * 0.22, 0.85, lion ? 'rgba(190,150,80,.7)' : 'rgba(150,110,80,.7)');
    for (const lx of [-0.35, -0.2, 0.25, 0.38]) c.line([[x + lx * s * flip, y + s * 0.1], [x + lx * s * flip + s * 0.03, y + s * 0.42]], s * 0.07, 0.8);
    const hx = x - s * 0.5 * flip, hy = y - s * 0.22;
    c.blob(hx, hy, s * (lion ? 0.22 : 0.16), s * (lion ? 0.22 : 0.15), 0.95);
    if (lion) for (let k = 0; k < 10; k++) { const a = k / 10 * 6.28; c.line([[hx, hy], [hx + Math.cos(a) * s * 0.28, hy + Math.sin(a) * s * 0.28]], 3, 0.7); }
    else { c.line([[hx - s * 0.1, hy - s * 0.1], [hx - s * 0.2, hy - s * 0.26]], 3, 0.9); c.line([[hx + s * 0.1, hy - s * 0.1], [hx + s * 0.2, hy - s * 0.26]], 3, 0.9); }
    c.poly([[x - s * 0.1, y - s * 0.12], [x + s * 0.2 * flip, y - s * 0.55], [x + s * 0.45 * flip, y - s * 0.35], [x + s * 0.2, y - s * 0.1]], 0.6, null);
    // serpent tail rising in coils ending in flame
    const tail = []; for (let k = 0; k <= 20; k++) { const t = k / 20; tail.push([x + s * (0.5 + t * 0.2) * flip + Math.sin(t * 12) * s * 0.07, y - t * s * 0.8]); }
    c.line(tail, 3.5, 0.85);
    c.blob(hx, hy, s * 0.3, s * 0.3, 0.3, gold);
    c.blob(x - s * 0.1 * flip, y - s * 0.1, s * 0.12, s * 0.12, 0.9); // book
  }
}
function vine(c, pts, w, rngf) {
  c.line(pts, w, 0.75, 'rgba(90,110,60,.35)');
  for (let i = 1; i < pts.length - 1; i += 2) {
    const [x, y] = pts[i];
    const a = rngf() * 6.28;
    c.blob(x + Math.cos(a) * w * 2, y + Math.sin(a) * w * 2, w * 1.4, w * 0.8, 0.9, rngf() < 0.3 ? 'rgba(110,40,90,.5)' : 'rgba(80,110,55,.45)', a);
    if (rngf() < 0.35) for (let k = 0; k < 5; k++) c.blob(x - Math.cos(a) * w * 2 + (k % 2) * w * 0.8, y - Math.sin(a) * w * 2 + k * w * 0.55, w * 0.45, w * 0.45, 1, 'rgba(90,50,110,.6)'); // grapes
  }
}

// ---------------------------------------------------------------------
// The west portal tympanum (Apocalypse 4): the Seated One in a mandorla,
// the four living creatures, the 24 elders rising 7+7, 3+3, 2+2, the sea
// of crystal, and the band of interlaced plants.
// ---------------------------------------------------------------------
export function churchTympanum() {
  const W = 1536, Hh = 768, c = new Carver(W, Hh);
  const cx = W / 2, base = Hh - 20;
  c.ground(0.16);
  const r = rng(5);
  // outer archivolt band of vines (semicircle border)
  const R = W / 2 - 18;
  const arc = []; for (let i = 0; i <= 120; i++) { const a = Math.PI + i / 120 * Math.PI; arc.push([cx + Math.cos(a) * (R - 36) + Math.sin(i * 0.7) * 10, base + Math.sin(a) * (R - 36) + Math.cos(i * 0.7) * 10]); }
  vine(c, arc, 12, r);
  // clip: everything outside the half disc is flat wall (handled by mesh shape)
  // sea of crystal
  const sea = []; for (let i = 0; i <= 60; i++) sea.push([cx - 520 + i * 17.3, base - 60 + Math.sin(i * 0.8) * 8]);
  c.line(sea, 10, 0.5, 'rgba(160,190,210,.6)');
  c.poly([[cx - 540, base - 60], [cx + 540, base - 60], [cx + 540, base], [cx - 540, base]], 0.3, 'rgba(170,195,210,.35)', 2);
  // mandorla, emerald rainbow and throne
  c.blob(cx, base - 350, 190, 250, 0.35, 'rgba(60,130,80,.55)');
  c.blob(cx, base - 350, 165, 225, 0.25, 'rgba(210,190,140,.35)');
  c.poly([[cx - 130, base - 180], [cx + 130, base - 180], [cx + 120, base - 150], [cx - 120, base - 150]], 0.7, 'rgba(200,160,70,.8)');
  seated(c, cx, base - 330, 230, { crown: true, halo: true, attr: 'book', robe: 'rgba(110,40,100,.85)' });
  // cruciform halo arms
  for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0]]) c.line([[cx, base - 548], [cx + dx * 80, base - 548 + dy * 80]], 12, 0.55, 'rgba(210,170,60,1)');
  // raised right hand
  c.line([[cx - 70, base - 440], [cx - 120, base - 520]], 22, 0.95); c.blob(cx - 124, base - 530, 20, 26, 1);
  // four creatures: man (viewer's left, high), eagle (right, high), bull and lion below
  beast(c, 'man', cx - 320, base - 440, 150); beast(c, 'eagle', cx + 320, base - 440, 160);
  beast(c, 'bull', cx - 300, base - 200, 170, -1); beast(c, 'lion', cx + 300, base - 200, 170, 1);
  // 24 elders: 7+7 in the base row, then 3+3, then 2+2
  const rows = [[7, base - 120, 64, 90], [3, base - 280, 58, 80], [2, base - 420, 54, 72]];
  const attrs = ['viol', 'phial'];
  let n = 0;
  for (const [cnt, yy, s, gap] of rows) {
    for (const side of [-1, 1]) for (let i = 0; i < cnt; i++) {
      const x = cx + side * (cnt === 7 ? 150 + i * gap : cnt === 3 ? 470 + i * gap * 0.8 : 480 + i * gap * 0.8);
      if (cnt !== 7 && Math.abs(x - cx) < 200) continue;
      seated(c, x, yy, s, { crown: true, attr: attrs[(n++) % 2] });
      c.poly([[x - s * 0.45, yy + s * 0.6], [x + s * 0.45, yy + s * 0.6], [x + s * 0.45, yy + s * 0.75], [x - s * 0.45, yy + s * 0.75]], 0.6, 'rgba(200,160,70,.6)', 1);
    }
  }
  return c.result([156, 146, 130], 2.4, { paint: 0.34, grain: 0.16 });
}

// Chapter house: Christ between the twelve apostles; an arch of twelve
// panels with the peoples of the world; an arch of thirty roundels with
// the peoples of unknown lands (sciapods, cynocephali, blemmyes…).
export function chapterTympanum() {
  const W = 1536, Hh = 768, c = new Carver(W, Hh);
  const cx = W / 2, base = Hh - 16, r = rng(12);
  c.ground(0.16);
  const R = W / 2 - 10;
  // 30 roundels on the outer arch
  for (let i = 0; i < 30; i++) {
    const a = Math.PI + (i + 0.5) / 30 * Math.PI;
    const x = cx + Math.cos(a) * (R - 44), y = base + Math.sin(a) * (R - 44);
    c.blob(x, y, 38, 38, 0.55); c.carveLine(circlePts(x, y, 36), 3, 0.35);
    const kind = i % 6;
    if (kind === 0) { c.blob(x, y - 6, 8, 16, 1); c.blob(x + 4, y + 18, 16, 6, 1); } // sciapod with huge foot
    else if (kind === 1) { c.blob(x, y + 6, 10, 16, 1); c.blob(x + 6, y - 14, 10, 7, 1); } // dog-head
    else if (kind === 2) { c.blob(x, y + 2, 14, 18, 1); c.blob(x - 5, y - 2, 3, 3, 0.4); c.blob(x + 5, y - 2, 3, 3, 0.4); } // blemmye
    else if (kind === 3) { c.blob(x, y, 18, 10, 1); c.line([[x + 16, y], [x + 26, y - 12]], 4, 1); } // centaur
    else if (kind === 4) { c.blob(x, y - 8, 9, 9, 1); c.blob(x, y + 10, 10, 14, 1); c.blob(x, y - 9, 4, 4, 0.5); } // cyclops
    else { c.blob(x, y, 12, 12, 1); c.line([[x - 12, y + 4], [x - 24, y + 14]], 5, 1); } // siren
  }
  // arch of 12 panels
  for (let i = 0; i < 12; i++) {
    const a0 = Math.PI + i / 12 * Math.PI, a1 = Math.PI + (i + 1) / 12 * Math.PI;
    const r0 = R - 90, r1 = R - 170;
    c.poly([[cx + Math.cos(a0) * r0, base + Math.sin(a0) * r0], [cx + Math.cos(a1) * r0, base + Math.sin(a1) * r0], [cx + Math.cos(a1) * r1, base + Math.sin(a1) * r1], [cx + Math.cos(a0) * r1, base + Math.sin(a0) * r1]], 0.35, null, 1);
    const am = (a0 + a1) / 2;
    for (let k = -1; k <= 1; k++) seated(c, cx + Math.cos(am + k * 0.05) * (R - 130), base + Math.sin(am + k * 0.05) * (R - 130) + 18, 26, { robe: ['rgba(150,60,40,.6)', 'rgba(60,80,130,.6)', 'rgba(90,110,60,.6)'][i % 3] });
  }
  seated(c, cx, base - 250, 210, { halo: true, crown: false, attr: 'book', robe: 'rgba(120,40,40,.8)' });
  const attrs = ['key', 'sword', 'book', 'scroll', 'book', 'scroll'];
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) {
    const x = cx + s * (170 + i * 70), yy = base - 110 - (5 - i) * 10 - (i < 2 ? 40 : 0);
    const sc = 64 - i * 4;
    if (Math.hypot(x - cx, (yy - base) * 1.35) > R - 190) continue;
    seated(c, x, yy, sc, { halo: true, attr: attrs[i] });
  }
  // weathered: only faint traces of the old colour survive in the hollows
  return c.result([128, 122, 110], 3.0, { paint: 0.06, grain: 0.3 });
}
function circlePts(x, y, r) { const p = []; for (let i = 0; i <= 24; i++) p.push([x + Math.cos(i / 24 * 6.283) * r, y + Math.sin(i / 24 * 6.283) * r]); return p; }

// Altar of the skull chapel: "a row of empty, deep-socketed skulls on top
// of a heap of shin bones"
export function skullAltar() {
  const W = 1024, Hh = 512, c = new Carver(W, Hh);
  c.ground(0.14);
  c.poly([[10, 10], [W - 10, 10], [W - 10, 34], [10, 34]], 0.6); c.poly([[10, Hh - 34], [W - 10, Hh - 34], [W - 10, Hh - 10], [10, Hh - 10]], 0.6);
  // heap of long bones, crossed
  const r = rng(3);
  for (let i = 0; i < 70; i++) {
    const x = 40 + r() * (W - 80), y = 290 + r() * 150, a = (r() - 0.5) * 0.9, l = 90 + r() * 60;
    const p0 = [x - Math.cos(a) * l / 2, y - Math.sin(a) * l / 2], p1 = [x + Math.cos(a) * l / 2, y + Math.sin(a) * l / 2];
    c.line([p0, p1], 13, 0.55 + r() * 0.3);
    c.blob(p0[0], p0[1], 11, 9, 0.8); c.blob(p1[0], p1[1], 11, 9, 0.8);
  }
  // a row of skulls; the fourth from the right is worn smooth by fingers
  const n = 7;
  for (let i = 0; i < n; i++) {
    const x = 90 + i * (W - 180) / (n - 1), y = 170;
    c.blob(x, y, 58, 62, 1);
    c.blob(x, y + 55, 34, 22, 0.85);
    for (const s of [-1, 1]) c.carveLine(circlePts(x + s * 22, y + 5, 7), 16, 0.9);
    c.carveLine([[x - 4, y + 32], [x, y + 22], [x + 4, y + 32]], 6, 0.7);
    for (let k = -3; k <= 3; k++) c.carveLine([[x + k * 7, y + 60], [x + k * 7, y + 70]], 2, 0.5);
  }
  return c.result([200, 192, 176], 3.4);
}

// cloister capitals: apes, lions and centaurs among leaves (Jorge points
// them out from the scriptorium window)
export function capitalFrieze() {
  const W = 1024, Hh = 256, c = new Carver(W, Hh), r = rng(21);
  c.ground(0.2);
  for (let i = 0; i < 4; i++) {
    const x = 128 + i * 256;
    for (let k = 0; k < 6; k++) c.blob(x - 100 + k * 40, 210, 22, 40, 0.7, null, (k - 2.5) * 0.3);
    const kind = i % 4;
    if (kind === 0) { c.blob(x, 120, 50, 30, 1); c.blob(x - 55, 100, 26, 26, 1); for (let k = 0; k < 10; k++) c.line([[x - 55, 100], [x - 55 + Math.cos(k * 0.63) * 34, 100 + Math.sin(k * 0.63) * 34]], 4, 0.8); }
    else if (kind === 1) { c.blob(x, 110, 22, 40, 1); c.blob(x, 60, 18, 18, 1); c.line([[x - 20, 100], [x - 50, 60]], 10, 0.9); c.line([[x + 20, 100], [x + 50, 70]], 10, 0.9); }
    else if (kind === 2) { c.blob(x + 20, 140, 55, 25, 1); c.blob(x - 30, 90, 18, 34, 1); c.blob(x - 30, 50, 15, 15, 1); c.line([[x - 30, 80], [x - 70, 50]], 8, 0.9); }
    else { vine(c, [[x - 100, 180], [x - 50, 100], [x, 160], [x + 50, 90], [x + 100, 170]], 9, r); }
  }
  return c.result([205, 196, 180], 2.6);
}

// Real relief: a semicircular tympanum of radius R as a dense grid whose
// vertices stand out of the stone by the carved height field (up to `depth`
// metres), so the figures cast their own shadows and turn with the light.
// Faces +z before the caller rotates it; UVs match the texture's.
export function reliefSemicircle(R, heightCanvas, depth = 0.1, nx = 200, ny = 100) {
  const w = heightCanvas.width, h = heightCanvas.height;
  const hd = heightCanvas.getContext('2d').getImageData(0, 0, w, h).data;
  const H = (u, v) => { const x = Math.min(w - 1, Math.max(0, Math.round(u * (w - 1)))), y = Math.min(h - 1, Math.max(0, Math.round((1 - v) * (h - 1)))); return hd[(y * w + x) * 4] / 255; };
  const g = new THREE.PlaneGeometry(2 * R, R, nx, ny);
  g.translate(0, R / 2, 0);
  const p = g.attributes.position, uv = g.attributes.uv;
  const base = H(0.5, 0.02);
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i);
    const rr = Math.hypot(x, y);
    if (rr > R) { x *= R / rr; y *= R / rr; }
    const u = (x + R) / (2 * R), v = y / R;
    const e = Math.min(1, (R - Math.hypot(x, y)) / 0.04);   // flush at the rim
    p.setXYZ(i, x, y, Math.max(0, H(u, v) - base * 0.5) * depth * e);
    uv.setXY(i, u, v);
  }
  g.computeVertexNormals();
  return g;
}

// The treasury's Entombment: "an Entombment of Christ in thin silver, in
// half relief" framed by the little temple of lapis and gold (BOOK, Fifth
// Day, the visit to the treasury; see docs/provenance). The body, wrapped,
// lowered into the sarcophagus by the two at its head and feet; the Virgin
// bending over the face, John and the Magdalene behind, haloed. Returns
// maps for a silver plaque (height field -> normal map; the hollows dark
// with old tarnish in the albedo).
export function entombmentRelief(W = 512, H = 352) {
  const C = new Carver(W, H);
  C.ground(0.14);
  // a raised, beaded border
  const B = 12;
  C.poly([[4, 4], [W - 4, 4], [W - 4, B], [4, B]], 0.6, null, 2); C.poly([[4, H - B], [W - 4, H - B], [W - 4, H - 4], [4, H - 4]], 0.6, null, 2);
  C.poly([[4, 4], [B, 4], [B, H - 4], [4, H - 4]], 0.6, null, 2); C.poly([[W - B, 4], [W - 4, 4], [W - 4, H - 4], [W - B, H - 4]], 0.6, null, 2);
  for (let k = 0; k < 40; k++) { C.blob(10 + k * (W - 20) / 39, 8, 2.6, 2.6, 0.75); C.blob(10 + k * (W - 20) / 39, H - 8, 2.6, 2.6, 0.75); }
  const sy = H * 0.64;
  // the sarcophagus: a lid moulding and a strigilated front
  C.poly([[W * 0.14, sy - 4], [W * 0.86, sy - 4], [W * 0.86, sy + 8], [W * 0.14, sy + 8]], 0.62, null, 2);
  C.poly([[W * 0.15, sy + 8], [W * 0.85, sy + 8], [W * 0.84, H - 18], [W * 0.16, H - 18]], 0.46, null, 2);
  for (let k = 0; k < 22; k++) { const x = W * (0.2 + k * 0.028); C.carveLine([[x, sy + 16], [x + 10 * Math.sin(k * 0.6), H - 26]], 3, 0.3); }
  // a mourner: a cloaked figure bending toward the body, head veiled or
  // bare, a halo ring behind the head
  const mourner = (x, h, lean, { halo = true, veil = false, arms = 0 } = {}) => {
    const hx = x + lean * h * 0.35, hy = sy - h;
    if (halo) { C.carveLine(Array.from({ length: 25 }, (_, k) => [hx + Math.cos(k / 24 * 6.283) * 21, hy + Math.sin(k / 24 * 6.283) * 21]), 3, 0.1); C.blob(hx, hy, 20, 20, 0.36); }
    const body = [[x - 24, sy - 2], [x + 22, sy - 2], [x + 18 + lean * 10, sy - h * 0.55], [hx + 13, hy + 16], [hx - 14, hy + 18], [x - 20 + lean * 12, sy - h * 0.5]];
    C.poly(body, 0.58, null, 4);
    // the mantle's folds, falling from the shoulders
    for (let f = -3; f <= 3; f++) C.carveLine([[hx + f * 3.5, hy + 22], [x + f * 7 + lean * 6, sy - h * 0.45], [x + f * 7.5, sy - 3]], 1.4, 0.26);
    C.blob(hx, hy, veil ? 15 : 12, veil ? 17 : 14, 0.78, null, lean * 0.4);
    if (veil) C.carveLine([[hx - 14, hy + 12], [hx - 12, hy - 8], [hx, hy - 16], [hx + 12, hy - 8], [hx + 14, hy + 12]], 2, 0.3);
    if (arms) C.line([[hx + 10 * arms, hy + 26], [hx + 34 * arms, sy - 26]], 7, 0.66);
  };
  // behind: John, the Magdalene (arms flung up in grief), another Mary
  mourner(W * 0.42, 118, 0.35, { arms: 1 }); mourner(W * 0.58, 128, -0.15, { veil: true }); mourner(W * 0.7, 110, -0.45, { veil: true, arms: -1 });
  // the Virgin at the head, bent low over the face
  mourner(W * 0.27, 84, 0.9, { veil: true });
  // Joseph and Nicodemus at head and feet, lowering the shroud
  mourner(W * 0.15, 104, 0.55, { halo: false, arms: 1 }); mourner(W * 0.85, 100, -0.6, { halo: false, arms: -1 });
  // the body, wrapped in the shroud, along the rim: the cruciform halo at left
  const by = sy - 16;
  C.blob(W * 0.21, by - 4, 21, 21, 0.44);
  C.carveLine([[W * 0.21 - 20, by - 4], [W * 0.21 + 20, by - 4]], 2, 0.25); C.carveLine([[W * 0.21, by - 24], [W * 0.21, by + 16]], 2, 0.25);
  C.blob(W * 0.215, by - 2, 13, 11, 0.98);
  C.poly([[W * 0.23, by - 12], [W * 0.5, by - 14], [W * 0.8, by - 6], [W * 0.81, by + 8], [W * 0.5, by + 10], [W * 0.23, by + 10]], 0.95, null, 4);
  for (let k = 0; k < 12; k++) { const x = W * (0.27 + k * 0.043); C.carveLine([[x, by - 12], [x + 7, by + 9]], 1.4, 0.32); }
  C.line([[W * 0.3, by - 3], [W * 0.44, by - 6]], 5, 0.99);           // the crossed hands under the linen
  return C.result([168, 168, 174], 5.5, { grain: 0.05, paint: 0 });
}
