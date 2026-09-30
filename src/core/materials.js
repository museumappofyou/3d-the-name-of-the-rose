import * as THREE from 'three';
import { dress, bindShared, W as WZ } from './weathering.js';

// Physically based materials from CC0 Poly Haven scans (assets/textures:
// *_d albedo, *_n OpenGL normal, *_a the packed ARM map — occlusion in R,
// roughness in G, metalness in B — so one texture feeds aoMap and
// roughnessMap, each reading its own channel),
// with a shared world-space snow layer for exterior surfaces. All UVs in
// the project are in metres, so `scale` is the real width of one tile.

export const shared = {
  uSnow: { value: 0.42 },       // 0..1 snow cover
  uWet: { value: 0.0 },
  uTime: { value: 0 },
};

const loader = new THREE.TextureLoader();
const cache = new Map();
// scaled copies of a texture whose image is still downloading: they are
// marked for upload only once it has arrived (marking them earlier makes the
// renderer warn "Texture marked for update but no image data found" for
// every frame drawn before the download ends)
const waitingCopies = new Map();
let maxAniso = 8;
export function setAnisotropy(n) { maxAniso = n; }
bindShared(shared);
shared.uWet = WZ.uWet;
export { WZ };

function tex(name, srgb) {
  const k = name + (srgb ? ':s' : '');
  if (!cache.has(k)) {
    const t = loader.load(`./assets/textures/${name}.jpg`, () => {
      for (const c of waitingCopies.get(t) || []) c.needsUpdate = true;
      waitingCopies.delete(t);
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = maxAniso;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    cache.set(k, t);
  }
  return cache.get(k);
}
function scaled(t, s, rot = 0) {
  const c = t.clone();
  c.repeat.set(1 / s, 1 / s);
  c.rotation = rot;
  // (Texture.copy() itself marks the copy for upload: undo that while the
  // shared image is still missing, and mark it when the image arrives)
  if (!t.image) { c.version = 0; if (!waitingCopies.has(t)) waitingCopies.set(t, []); waitingCopies.get(t).push(c); }
  return c;
}

export function pbr(set, { scale = 2, color = 0xffffff, rough = 1, env = 1, normal = 1, rot = 0, side, metal = 0 } = {}) {
  const m = new THREE.MeshStandardMaterial({
    map: scaled(tex(`${set}_d`, true), scale, rot),
    normalMap: scaled(tex(`${set}_n`), scale, rot),
    aoMap: scaled(tex(`${set}_a`), scale, rot),
    roughnessMap: scaled(tex(`${set}_a`), scale, rot),
    metalnessMap: metal ? null : null,
    color, roughness: rough, metalness: metal, envMapIntensity: env,
  });
  m.normalScale.set(normal, normal);
  m.aoMapIntensity = 0.85;
  if (side) m.side = side;
  return m;
}

// Snow settles on surfaces facing the sky. Adds a world-normal/noise mix
// to any standard material without touching its textures.
const noiseGLSL = /* glsl */`
float sn_hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float sn_noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(sn_hash(i),sn_hash(i+vec2(1,0)),f.x),mix(sn_hash(i+vec2(0,1)),sn_hash(i+vec2(1,1)),f.x),f.y); }
float sn_fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<4;i++){ s+=a*sn_noise(p); p*=2.03; a*=.5; } return s; }
`;
export function withSnow(m, { strength = 1, minUp = 0.5 } = {}) {
  m.userData.snow = true;
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    prev?.(sh, r);
    sh.uniforms.uSnow = shared.uSnow;
    sh.uniforms.uSnowStrength = { value: strength };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSnowN; varying vec3 vSnowP;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vSnowN = normalize(mat3(modelMatrix) * objectNormal);
        vSnowP = (modelMatrix * vec4(transformed,1.0)).xyz;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uSnow; uniform float uSnowStrength; varying vec3 vSnowN; varying vec3 vSnowP;
        ${noiseGLSL}
        float snowAmt;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        {
          float up = smoothstep(${minUp.toFixed(2)}, ${(minUp + 0.28).toFixed(2)}, vSnowN.y);
          float n = sn_fbm(vSnowP.xz*0.32 + vSnowP.y*0.05) * .8 + sn_fbm(vSnowP.xz*2.1) * .2;
          float cover = uSnow * uSnowStrength;
          snowAmt = up * smoothstep(0.95 - cover*1.3, 1.25 - cover*1.3, n + .2);
          vec3 snowCol = vec3(.93,.95,.99) * (0.9 + 0.1*sn_noise(vSnowP.xz*40.0));
          diffuseColor.rgb = mix(diffuseColor.rgb, snowCol, snowAmt);
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, .82, snowAmt);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        normal = normalize(mix(normal, normalize((viewMatrix*vec4(0.,1.,0.,0.)).xyz), snowAmt*.7));`);
  };
  m.customProgramCacheKey = () => 'snow' + strength + minUp;
  return m;
}

function canvasTex(w, h, draw, { srgb = true, repeat = false } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
export { canvasTex };

// deterministic random
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

// Book spines for the bookcases: rows of vellum, leather and wood-board
// bindings with metal bosses and titles in faded gold.
function bookSpines(seed) {
  const r = rng(seed);
  return canvasTex(1024, 256, (g, w, h) => {
    g.fillStyle = '#1a120b'; g.fillRect(0, 0, w, h);
    let x = 0;
    const palette = ['#4e2f20', '#6d4a2c', '#3b2a1e', '#7a5a3a', '#d8c9a6', '#c9b58c', '#40301f', '#5a3a28', '#2f3a2c', '#6b4a30', '#e2d5b5', '#4a3322', '#8a7456', '#b9a47c'];
    while (x < w) {
      const bw = 14 + r() * 34, bh = h * (0.72 + r() * 0.26);
      const col = palette[Math.floor(r() * palette.length)];
      const y = h - bh;
      const grd = g.createLinearGradient(x, 0, x + bw, 0);
      grd.addColorStop(0, 'rgba(0,0,0,.45)'); grd.addColorStop(.25, col); grd.addColorStop(.7, col); grd.addColorStop(1, 'rgba(0,0,0,.55)');
      g.fillStyle = grd; g.fillRect(x, y, bw - 1, bh);
      g.fillStyle = 'rgba(0,0,0,.35)';
      for (let k = 0; k < 3; k++) g.fillRect(x, y + bh * (0.15 + k * 0.33), bw - 1, 3);
      if (r() < .45) { g.fillStyle = 'rgba(214,178,94,.55)'; g.fillRect(x + bw * .3, y + bh * .38, bw * .4, bh * .18); }
      if (r() < .3) { g.fillStyle = '#b89a5a'; for (const yy of [y + 8, y + bh - 12]) { g.beginPath(); g.arc(x + bw / 2, yy, 2.5, 0, 7); g.fill(); } }
      g.fillStyle = 'rgba(255,240,200,.05)'; g.fillRect(x + 2, y, 2, bh);
      x += bw + (r() < .08 ? 10 + r() * 30 : 0);
    }
    // "every shelf carried a label with a number, as in the catalogue"
    for (let lx = 60 + r() * 60; lx < w - 40; lx += 230 + r() * 80) {
      g.fillStyle = '#e8dcbc'; g.fillRect(lx, h * 0.08, 34, 16);
      g.fillStyle = '#3a2716'; g.font = 'bold 12px serif'; g.fillText(['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii'][Math.floor(r() * 7)], lx + 6, h * 0.08 + 12);
    }
    const shade = g.createLinearGradient(0, 0, 0, h);
    shade.addColorStop(0, 'rgba(0,0,0,.65)'); shade.addColorStop(.25, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(0,0,0,.2)');
    g.fillStyle = shade; g.fillRect(0, 0, w, h);
  });
}

// Clear leaded glass in small squares ("kurşun çerçeveli, renksiz cam
// kareleri") and the opaque/alabaster panes of the library.
function leaded(kind) {
  return canvasTex(256, 256, (g, w, h) => {
    const n = 8, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const v = kind === 'alabaster' ? 205 + Math.random() * 40 : 150 + Math.random() * 60;
      g.fillStyle = kind === 'alabaster' ? `rgb(${v},${v * .93},${v * .8})` : `rgba(${v * .85},${v * .95},${v},1)`;
      if (kind === 'alabaster') {
        g.fillRect(i * s, j * s, s, s);
        g.strokeStyle = 'rgba(160,120,70,.35)'; g.lineWidth = 1;
        for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(i * s + Math.random() * s, j * s); g.bezierCurveTo(i * s + Math.random() * s, j * s + s * .3, i * s + Math.random() * s, j * s + s * .7, i * s + Math.random() * s, j * s + s); g.stroke(); }
      } else g.fillRect(i * s, j * s, s, s);
    }
    g.strokeStyle = '#2a2622'; g.lineWidth = kind === 'alabaster' ? 5 : 3;
    if (kind === 'diamond') {
      for (let k = -n; k < 2 * n; k++) { g.beginPath(); g.moveTo(k * s, 0); g.lineTo(k * s + h, h); g.stroke(); g.beginPath(); g.moveTo(k * s, 0); g.lineTo(k * s - h, h); g.stroke(); }
    } else {
      for (let k = 0; k <= n; k++) { g.beginPath(); g.moveTo(k * s, 0); g.lineTo(k * s, h); g.stroke(); g.beginPath(); g.moveTo(0, k * s); g.lineTo(w, k * s); g.stroke(); }
    }
  }, { repeat: true });
}

// Romanesque/early gothic stained glass: deep blue fields ("the wonderful
// blue… that throws a heavenly light into the nave") with medallions.
function stained(seed, blueish = true) {
  const r = rng(seed);
  return canvasTex(256, 512, (g, w, h) => {
    const cols = blueish ? ['#16307a', '#1d3f9a', '#12245e', '#2a55b8', '#8a1c1c', '#b8871e', '#1f6b3a', '#6d2a7a'] : ['#8a1c1c', '#b8871e', '#1f6b3a', '#2a55b8', '#6d2a7a', '#c9a44a'];
    for (let i = 0; i < 90; i++) {
      g.fillStyle = cols[Math.floor(r() * (blueish && r() < .6 ? 4 : cols.length))];
      g.beginPath();
      const x = r() * w, y = r() * h, s = 18 + r() * 40;
      g.moveTo(x, y); for (let k = 0; k < 5; k++) g.lineTo(x + (r() - .5) * s * 2, y + (r() - .5) * s * 2);
      g.fill();
    }
    g.strokeStyle = '#1b1612'; g.lineWidth = 6;
    for (let k = 0; k < 3; k++) {
      const cy = h * (0.2 + k * 0.3);
      g.fillStyle = cols[4 + Math.floor(r() * 4)];
      g.beginPath(); g.arc(w / 2, cy, w * .33, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#e8d8b0'; g.beginPath(); g.arc(w / 2, cy - 8, 12, 0, 7); g.fill();
      g.fillStyle = cols[Math.floor(r() * 3)]; g.fillRect(w / 2 - 14, cy + 4, 28, 30);
    }
    g.lineWidth = 3;
    for (let i = 0; i < 70; i++) { g.beginPath(); g.moveTo(r() * w, r() * h); g.lineTo(r() * w, r() * h); g.stroke(); }
    // the glass itself: hand-blown, seedy and streaked (brighter and darker
    // in each quarry), finer leads between the pieces, saddle bars across,
    // and two centuries of grime thickest at the edges and the foot
    const img = g.getImageData(0, 0, w, h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const streak = Math.sin(x * 0.21 + Math.sin(y * 0.05) * 3) * 0.06 + Math.sin(y * 0.9 + x * 0.13) * 0.025;
      const seed = r() < 0.004 ? 0.25 : 0;
      const ex = Math.min(x, w - x) / w, ey = Math.min(y, h - y) / h, grime = 1 - 0.32 * Math.exp(-Math.min(ex, ey) * 26) - 0.18 * (y / h) ** 3;
      const k = (1 + streak + seed) * grime;
      d[i] = Math.min(255, d[i] * k); d[i + 1] = Math.min(255, d[i + 1] * k); d[i + 2] = Math.min(255, d[i + 2] * k);
    }
    g.putImageData(img, 0, 0);
    g.strokeStyle = 'rgba(27,22,18,0.85)'; g.lineWidth = 1.6;
    for (let i = 0; i < 120; i++) { const x = r() * w, y = r() * h, s = 10 + r() * 22; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * s, y + (r() - 0.5) * s); g.lineTo(x + (r() - 0.5) * s, y + (r() - 0.5) * s); g.stroke(); }
    g.lineWidth = 4; g.strokeStyle = '#141110';
    for (let k = 1; k < 6; k++) { g.beginPath(); g.moveTo(0, h * k / 6); g.lineTo(w, h * k / 6); g.stroke(); }
    g.lineWidth = 10; g.strokeRect(0, 0, w, h);
  });
}

// clipped box: small dark leaves, lighter where they catch the light, holes
// of shadow between them (map + normal, tiling, 1 m ≈ 1.6 repeats)
function leafTex() {
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d'); g.fillStyle = '#10180e'; g.fillRect(0, 0, N, N);
  const h = new Float32Array(N * N);
  let seed = 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 2600; i++) {
    const x = r() * N, y = r() * N, a = r() * Math.PI, L = 3 + r() * 4, W = 1.6 + r() * 1.4, v = r();
    const col = v < 0.12 ? [92, 88, 52] : [28 + v * 40, 46 + v * 46, 22 + v * 20];
    for (const [ox, oy] of [[0, 0], [N, 0], [-N, 0], [0, N], [0, -N]]) {
      g.save(); g.translate(x + ox, y + oy); g.rotate(a); g.fillStyle = `rgb(${col.map(Math.round).join(',')})`;
      g.beginPath(); g.ellipse(0, 0, L, W, 0, 0, Math.PI * 2); g.fill(); g.restore();
    }
  }
  const d = g.getImageData(0, 0, N, N).data;
  for (let i = 0; i < N * N; i++) h[i] = (d[i * 4] + d[i * 4 + 1]) / 255;
  const map = new THREE.CanvasTexture(c); map.wrapS = map.wrapT = THREE.RepeatWrapping; map.colorSpace = THREE.SRGBColorSpace; map.repeat.set(1.6, 1.6); map.anisotropy = 4;
  const cn = document.createElement('canvas'); cn.width = cn.height = N;
  const gn = cn.getContext('2d'), im = gn.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = h[y * N + (x + 1) % N] - h[y * N + (x + N - 1) % N], dy = h[((y + 1) % N) * N + x] - h[((y + N - 1) % N) * N + x];
    const l = Math.hypot(dx * 3, dy * 3, 1), i = (y * N + x) * 4;
    im.data[i] = (-dx * 3 / l * 0.5 + 0.5) * 255; im.data[i + 1] = (-dy * 3 / l * 0.5 + 0.5) * 255; im.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; im.data[i + 3] = 255;
  }
  gn.putImageData(im, 0, 0);
  const normalMap = new THREE.CanvasTexture(cn); normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping; normalMap.repeat.set(1.6, 1.6);
  return { map, normalMap };
}
function strawTex() {
  // Dry golden straw *scattered* over grey stone flags, not a green mat:
  // "the floor was strewn with straw to muffle our footsteps". Bare flags
  // show through the gaps; the straw is warm and pale, never green.
  const r = rng(33);
  return canvasTex(512, 512, (g, w, h) => {
    // 1) stone-flag underlay so the straw reads as a thin scatter, not turf
    g.fillStyle = '#8f857a'; g.fillRect(0, 0, w, h);
    const flag = w / 2;
    for (let fy = 0; fy < 2; fy++) for (let fx = 0; fx < 2; fx++) {
      const off = (fy & 1) ? flag * 0.5 : 0;
      const px = (fx * flag + off) % w, py = fy * flag;
      const v = 122 + r() * 34;
      g.fillStyle = `rgb(${v},${v - 5},${v - 15})`;
      g.fillRect(px + 2, py + 2, flag - 4, flag - 4);
    }
    // mottle the flags
    for (let i = 0; i < 1400; i++) {
      const v = 96 + r() * 44, a = 0.05 + r() * 0.09;
      g.fillStyle = `rgba(${v},${v - 5},${v - 15},${a})`;
      g.fillRect(r() * w, r() * h, 3 + r() * 10, 3 + r() * 10);
    }
    // dark mortar joints
    g.strokeStyle = 'rgba(46,40,34,.5)'; g.lineWidth = 3;
    g.strokeRect(2, 2, flag - 4, flag - 4);
    // 2) soft shadow of the straw clumps onto the flags
    for (let i = 0; i < 46; i++) {
      const x = r() * w, y = r() * h, rr = 16 + r() * 34;
      const gr = g.createRadialGradient(x, y, 0, x, y, rr);
      gr.addColorStop(0, 'rgba(30,24,16,.2)'); gr.addColorStop(1, 'rgba(30,24,16,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill();
    }
    // 3) the straw itself: warm gold, tan and bleached, in loose drifts,
    // leaving bare flags between the clumps
    const clumps = [];
    for (let i = 0; i < 34; i++) clumps.push([r() * w, r() * h, 30 + r() * 70]);
    const near = (x, y) => { let d = 1e9; for (const [cx, cy, cr] of clumps) d = Math.min(d, Math.hypot(x - cx, y - cy) / cr); return d; };
    const stalk = (x, y) => {
      const dens = near(x, y);
      if (dens > 1 && r() < 0.6) return;               // sparser between clumps -> flags show
      const a = r() * Math.PI, l = 12 + r() * 40, t = r();
      g.strokeStyle = t < 0.42 ? `rgba(${215 + r() * 35},${188 + r() * 32},${120 + r() * 40},.9)`   // bright gold
        : t < 0.78 ? `rgba(${182 + r() * 30},${150 + r() * 28},${92 + r() * 26},.85)`               // tan
        : `rgba(${150 + r() * 24},${118 + r() * 22},${72 + r() * 18},.8)`;                          // dull straw
      g.lineWidth = 0.8 + r() * 1.8;
      const dx = Math.cos(a) * l, dy = Math.sin(a) * l;
      for (const [ox, oy] of [[0, 0], [-w, 0], [0, -h], [-w, -h]]) {
        g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + dx, y + oy + dy); g.stroke();
      }
    };
    for (let i = 0; i < 6400; i++) stalk(r() * w, r() * h);
    // a few darker rotting wisps and specks of chaff for grit
    g.strokeStyle = 'rgba(74,54,30,.55)'; g.lineWidth = 1.2;
    for (let i = 0; i < 500; i++) { const x = r() * w, y = r() * h, a = r() * Math.PI, l = 8 + r() * 16; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  }, { repeat: true });
}

export function makeMaterials() {
  const M = {};
  // Stone and timber are "dressed" (core/weathering.js): anti-tiling,
  // world-space discolouration, damp at the wall foot, soot, lichen, snow.
  const D = (set, o, w) => { const m = pbr(set, o); m.roughnessMap = null; m.aoMapIntensity = 1; return dress(m, w); };
  const ov = (set, s) => ({ map: scaled(tex(`${set}_d`, true), s), normal: scaled(tex(`${set}_n`), s) });
  const outside = { snow: 1, drift: 1, wet: 0.8 };
  // the Aedificium is built of the mountain's own grey rock: cold, lichened,
  // stained by centuries of weather from the ground up
  M.aed = D('aed_stone', { scale: 3.2, color: 0xb0b6b9, normal: 1.45 }, { ...outside, macro: 0.26, streak: 0.32, damp: 0.85, lichen: 0.5, rough: 0.9, tintA: 0xefebe4, tintB: 0xd4dde2, sat: 0.5 });
  M.aedIn = D('aed_stone', { scale: 3.2, color: 0xaeaea6, env: 0.35, normal: 1.3 }, { macro: 0.18, streak: 0.08, damp: 0.35, soot: 0.3, rough: 0.88, sat: 0.6 });
  // the church: squarer, warmer blocks
  M.church = D('church_stone', { scale: 2.8, color: 0xd2cbbd, normal: 1.35 }, { ...outside, macro: 0.2, streak: 0.28, damp: 0.75, lichen: 0.35, rough: 0.86, tintA: 0xf6eee2, tintB: 0xe0e0dc, sat: 0.7 });
  M.churchIn = D('church_stone', { scale: 2.8, color: 0xd4c8b4, env: 0.35, normal: 1.2 }, { macro: 0.14, damp: 0.25, soot: 0.4, rough: 0.8, sat: 0.75 });
  // service buildings: rubble with patches of old lime plaster
  M.rubble = D('rubble', { scale: 2.6, color: 0xc6c1b8, normal: 1.5 }, { ...outside, macro: 0.24, streak: 0.3, damp: 1.0, lichen: 0.45, rough: 0.93, sat: 0.62, overlay: { ...ov('plaster', 2.5), amount: 0.8, scale: 1.0 } });
  M.rubbleIn = D('rubble', { scale: 2.6, color: 0xbfb5a4, env: 0.35, normal: 1.3 }, { macro: 0.18, damp: 0.45, soot: 0.45, rough: 0.92, sat: 0.7 });
  // the lower, damp rooms: ossuary and crypt
  M.damp = D('rubble', { scale: 2.4, color: 0x9d9a90, env: 0.3, normal: 1.6 }, { macro: 0.3, streak: 0.45, damp: 1.0, soot: 0.15, lichen: 0.25, rough: 0.7, wet: 1, tintA: 0xe8e4d4, tintB: 0xc8d2cc, sat: 0.55 });
  M.wall = D('wall_stone', { scale: 3.0, color: 0xb8b4ab, normal: 1.45 }, { ...outside, macro: 0.28, streak: 0.35, damp: 1.0, lichen: 0.7, rough: 0.93, sat: 0.55 });
  M.plaster = D('plaster', { scale: 2.5, color: 0xf6eee0, env: 0.6 }, { macro: 0.12, soot: 0.32, damp: 0.3, rough: 0.9, cavity: 0.1 });
  M.plaster.aoMapIntensity = 0.4;
  M.plasterExt = D('plaster', { scale: 2.5, color: 0xe2d9c6 }, { ...outside, macro: 0.2, streak: 0.4, damp: 0.9, lichen: 0.3, rough: 0.92 });
  M.plasterStone = D('plaster_stone', { scale: 2.8, color: 0xe2d8c4, env: 0.35 }, { macro: 0.14, soot: 0.25, damp: 0.3, rough: 0.9 });
  M.roof = D('roof', { scale: 2.4, color: 0x9a877b, rot: Math.PI / 2, normal: 1.3 }, { snow: 1.35, minUp: 0.35, macro: 0.3, lichen: 0.4, rough: 0.85, wet: 0.6, tintA: 0xf0e2d2, tintB: 0xb8b8b0 });
  M.slate = D('roof', { scale: 1.6, color: 0x6c6b69, rot: Math.PI / 2 }, { snow: 1, minUp: 0.35, macro: 0.2, rough: 0.7, wet: 0.8 });
  M.thatch = D('thatch', { scale: 3, color: 0xa99876 }, { snow: 1, minUp: 0.35, macro: 0.3, lichen: 0.3, rough: 0.97, cavity: 0.1 });
  M.flag = D('flag', { scale: 3.2, color: 0xc9c0b1, env: 0.4 }, { macro: 0.22, rough: 0.78, cavity: 0.35 });
  // (weathered outdoor paving: greyer and damper than the floors indoors, the
  // joints dark, so snow and wet stone read apart where feet have passed)
  M.flagExt = D('flag', { scale: 3.2, color: 0xa99f91 }, { snow: 1, macro: 0.32, damp: 0.35, lichen: 0.3, rough: 0.8, wet: 0.9, cavity: 0.45 });
  M.terracotta = D('terracotta', { scale: 2.2, color: 0xd2b29a, env: 0.4 }, { macro: 0.2, rough: 0.78 });
  M.ashlar = D('ashlar', { scale: 3.5, color: 0xd0c6b6, env: 0.4 }, { macro: 0.16, rough: 0.62, cavity: 0.3 });
  M.cobble = D('cobble', { scale: 2.5, color: 0xc0baaf }, { snow: 1, macro: 0.25, rough: 0.8, wet: 0.9 });
  M.door = D('door_planks', { scale: 2.2, color: 0x927459 }, { macro: 0.2, damp: 0.6, rough: 0.8 });
  M.wood = D('wood', { scale: 1.6, color: 0xa98460, env: 0.45 }, { macro: 0.14, rough: 0.72, cavity: 0.15 });
  M.woodDark = D('wood', { scale: 1.6, color: 0x6a4f37, env: 0.4 }, { macro: 0.16, rough: 0.7, cavity: 0.15 });
  M.boards = D('floorboards', { scale: 2.5, color: 0xb09477, env: 0.4 }, { macro: 0.22, rough: 0.78 });
  M.beam = D('beam', { scale: 2.0, color: 0x846650, env: 0.45 }, { macro: 0.18, soot: 0.3, rough: 0.8 });
  M.beamExt = D('beam', { scale: 2.0, color: 0x846650 }, { snow: 1, macro: 0.25, damp: 0.7, lichen: 0.3, rough: 0.85, wet: 0.6 });
  M.soil = D('soil', { scale: 2.2, color: 0xb0a08c }, { macro: 0.25, rough: 0.95 });
  M.soilExt = D('soil', { scale: 2.2, color: 0x9e8f7c }, { snow: 1.1, minUp: 0.3, macro: 0.25, rough: 0.95, wet: 0.7 });

  // plain surfaces
  const std = (o) => new THREE.MeshStandardMaterial(o);
  // straw strewn on the scriptorium floor "to muffle our footsteps"
  M.straw = std({ map: strawTex(), color: 0xd8c8a4, roughness: 0.97, envMapIntensity: 0.18 });
  M.straw.map.repeat.set(0.5, 0.5);
  M.iron = std({ color: 0x2b2a28, roughness: 0.55, metalness: 0.85 });
  M.bronze = std({ color: 0x8a6a3a, roughness: 0.35, metalness: 1 });
  M.gold = std({ color: 0xd8b060, roughness: 0.25, metalness: 1, envMapIntensity: 1.4 });
  M.silver = std({ color: 0xc8c8c8, roughness: 0.25, metalness: 1 });
  M.bone = std({ color: 0xd9ccb0, roughness: 0.8 });
  M.parchment = std({ color: 0xe9dcb8, roughness: 0.9, envMapIntensity: 0.4 });
  M.linen = std({ color: 0xd7cdb8, roughness: 1, side: THREE.DoubleSide, envMapIntensity: 0.4 });
  M.curtain = std({ color: 0x5a4632, roughness: 1, side: THREE.DoubleSide, envMapIntensity: 0.3 });
  M.redCloth = std({ color: 0x6e1a16, roughness: 0.9, envMapIntensity: 0.4 });
  M.wax = std({ color: 0xf2e6c8, roughness: 0.6, envMapIntensity: 0.4 });
  M.char = std({ color: 0x1b1714, roughness: 1 });
  M.water = std({ color: 0x1d2a2c, roughness: 0.05, metalness: 0.1, envMapIntensity: 1.2 });
  M.blood = std({ color: 0x3a0606, roughness: 0.15, envMapIntensity: 1 });
  M.pottery = std({ color: 0x8e5638, roughness: 0.92, envMapIntensity: 0.4 });
  M.potteryDark = std({ color: 0x5b4032, roughness: 0.8, envMapIntensity: 0.5 });
  M.leaves = std({ color: 0x2e3b25, roughness: 0.9 });
  M.hedge = withSnow(std({ ...leafTex(), color: 0x8a9a7a, roughness: 0.9, envMapIntensity: 0.4 }), { minUp: 0.25 });
  M.bark = std({ color: 0x4b3b2d, roughness: 1 });
  M.fire = new THREE.MeshBasicMaterial({ color: 0xffa040, toneMapped: false });
  M.ember = new THREE.MeshBasicMaterial({ color: 0xff5010, toneMapped: false });
  M.flame = new THREE.MeshBasicMaterial({ color: 0xffd080, toneMapped: false });
  M.snow = pbr('snow', { scale: 3, color: 0xffffff });
  M.mirror = std({ color: 0xe8e8e8, roughness: 0.02, metalness: 1, envMapIntensity: 1.5 });

  // glazing: transmissive-looking but cheap (no refraction pass)
  M.glass = std({ map: leaded('square'), color: 0xa9b8c0, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.55, envMapIntensity: 1.2, depthWrite: false });
  M.glass.map.repeat.set(1.4, 1.4);
  M.glassOpaque = std({ map: leaded('diamond'), color: 0xc9c4b0, roughness: 0.4, transparent: true, opacity: 0.85, envMapIntensity: 0.9, emissive: 0xffa24a, emissiveIntensity: 0 });
  M.glassOpaque.emissiveMap = M.glassOpaque.map;
  M.glassOpaque.map.repeat.set(1.2, 1.2);
  // alabaster: "a beautiful light by day; at night not even moonlight"
  M.alabaster = std({ map: leaded('alabaster'), color: 0xffffff, roughness: 0.6, emissive: 0xffe4b8, emissiveIntensity: 0.0, envMapIntensity: 0.3 });
  M.alabaster.map.repeat.set(1, 1);
  M.alabaster.emissiveMap = M.alabaster.map;
  M.stained = [0, 1, 2, 3].map(i => std({ map: stained(11 + i, true), emissive: 0xffffff, emissiveMap: null, emissiveIntensity: 0, roughness: 0.3, transparent: true, opacity: 0.92, depthWrite: false }));
  M.stained.forEach(m => { m.emissiveMap = m.map; });
  M.stainedWarm = std({ map: stained(71, false), emissive: 0xffffff, roughness: 0.3, transparent: true, opacity: 0.92, depthWrite: false });
  M.stainedWarm.emissiveMap = M.stainedWarm.map;

  M.books = [1, 2, 3, 4].map(s => std({ map: bookSpines(s), roughness: 0.8, envMapIntensity: 0.35 }));
  return M;
}

// Inscription scroll over a library arch, painted in the manner of a
// fresco: black letters, the first letter red where a word begins.
export function scrollTexture(text, red, metalLetters = null) {
  return canvasTex(1024, 160, (g, w, h) => {
    g.fillStyle = '#d9c9a2'; g.fillRect(0, 0, w, h);
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, 'rgba(90,60,30,.35)'); grd.addColorStop(.2, 'rgba(0,0,0,0)'); grd.addColorStop(.8, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(90,60,30,.4)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(80,50,20,${Math.random() * .08})`; g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 8, 1 + Math.random() * 3); }
    g.strokeStyle = '#7a1c14'; g.lineWidth = 4; g.strokeRect(10, 12, w - 20, h - 24);
    g.textBaseline = 'middle'; g.textAlign = 'left';
    const first = text[0], rest = text.slice(1);
    let size = 76;
    g.font = `500 ${size}px "Grenze Gotisch", "UnifrakturMaguntia", serif`;
    while (g.measureText(text).width > w - 90 && size > 30) { size -= 2; g.font = `500 ${size}px "Grenze Gotisch", serif`; }
    const total = g.measureText(text).width;
    let x = (w - total) / 2;
    g.fillStyle = red ? '#a3160e' : '#1c1410';
    g.fillText(first, x, h / 2 + 4);
    x += g.measureText(first).width;
    g.fillStyle = '#1c1410';
    if (!metalLetters) { g.fillText(rest, x, h / 2 + 4); return; }
    // the mirror's verse: the letters of "quatuor" are raised metal
    const start = text.lastIndexOf('quatuor');
    for (let i = 1; i < text.length; i++) {
      const ch = text[i];
      const metal = i >= start && metalLetters.includes(i - start);
      if (metal) {
        const gr = g.createLinearGradient(0, h / 2 - 30, 0, h / 2 + 30);
        gr.addColorStop(0, '#f0d58a'); gr.addColorStop(.5, '#a67c2e'); gr.addColorStop(1, '#5e4214');
        g.fillStyle = gr; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowOffsetY = 3; g.shadowBlur = 3;
      } else { g.fillStyle = '#1c1410'; g.shadowColor = 'transparent'; }
      g.fillText(ch, x, h / 2 + 4);
      x += g.measureText(ch).width;
    }
  });
}
