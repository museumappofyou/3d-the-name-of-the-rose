import * as THREE from 'three';
import { pbr, canvasTex, rng, underground } from './materials.js';
import { dress } from './weathering.js';

// Materials for the sculpted props and room dressing (src/world/props/):
// the same Poly Haven scans as the architecture where a surface is stone,
// earth or timber, and small painted canvases for cloth, bone, earthenware,
// leather and stains. Added once onto the shared material table as M.p.*,
// so the builders' Batch keys read 'p.bone', 'p.linen', ...

const dressed = (set, o, w) => { const m = pbr(set, o); m.roughnessMap = null; m.aoMapIntensity = 1; return dress(m, w); };
const std = o => new THREE.MeshStandardMaterial(o);

// a coarse woven cloth: warp and weft, slubs, a few darns and stains
function weave(seed, base, { stripe = null, dirt = 0.3 } = {}) {
  const r = rng(seed);
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.08})`; g.fillRect(0, y, w, 1); }
    for (let x = 0; x < w; x += 2) { g.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.05})`; g.fillRect(x, 0, 1, h); }
    for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.12})`; g.fillRect(r() * w, r() * h, 1 + r() * 30, 1); }
    if (stripe) for (let y = 30; y < h; y += 96) { g.fillStyle = stripe; g.fillRect(0, y, w, 8); }
    for (let i = 0; i < 6 * dirt * 10; i++) { const x = r() * w, y = r() * h, rr = 6 + r() * 30; const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, `rgba(70,50,30,${0.12 * dirt})`); gr.addColorStop(1, 'rgba(70,50,30,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  }, { repeat: true });
}
// old bone: ivory to brown, darker in pits and toward the base
function boneTex(seed) {
  const r = rng(seed);
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#c9b999'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) { const x = r() * w, y = r() * h, rr = 2 + r() * 16; g.fillStyle = `rgba(${90 + r() * 60},${70 + r() * 40},${40 + r() * 30},${0.05 + r() * 0.12})`; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); }
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(40,30,20,${0.1 + r() * 0.2})`; g.fillRect(r() * w, r() * h, 1, 1 + r() * 4); }
  }, { repeat: true });
}
// unglazed and slip-glazed earthenware with a darker fired band
function potTex(seed, base) {
  const r = rng(seed);
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 3 + r() * 5) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,230,200'},${0.03 + r() * 0.05})`; g.fillRect(0, y, w, 1 + r() * 2); }
    for (let i = 0; i < 160; i++) { const x = r() * w, y = r() * h, rr = 1 + r() * 10; g.fillStyle = `rgba(40,20,10,${r() * 0.12})`; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); }
  }, { repeat: true });
}
// dried and wet blood soaked into snow and trodden earth: a blotchy map
// with a soft edge (used with alpha)
function stainTex(seed) {
  const r = rng(seed);
  return canvasTex(512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      const a = r() * Math.PI * 2, d = Math.pow(r(), 0.8) * w * 0.34, x = w / 2 + Math.cos(a) * d * 1.2, y = h / 2 + Math.sin(a) * d * 0.8, rr = 10 + r() * 70 * (1 - d / w);
      const gr = g.createRadialGradient(x, y, 0, x, y, rr);
      const dark = r() < 0.6;
      gr.addColorStop(0, dark ? 'rgba(60,6,6,0.85)' : 'rgba(110,20,16,0.7)'); gr.addColorStop(0.6, 'rgba(80,10,8,0.35)'); gr.addColorStop(1, 'rgba(80,10,8,0)');
      g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    // drips and splashes out from the vat
    for (let i = 0; i < 140; i++) { const a = r() * Math.PI * 2, d = w * (0.2 + r() * 0.28), x = w / 2 + Math.cos(a) * d, y = h / 2 + Math.sin(a) * d * 0.8; g.fillStyle = `rgba(70,8,6,${0.3 + r() * 0.5})`; g.beginPath(); g.arc(x, y, 1 + r() * 4, 0, 7); g.fill(); }
    // footprints through it
    for (let i = 0; i < 9; i++) { const x = w * (0.25 + r() * 0.5), y = h * (0.2 + r() * 0.6); g.fillStyle = 'rgba(40,20,14,0.45)'; g.save(); g.translate(x, y); g.rotate(r() * 3); g.beginPath(); g.ellipse(0, 0, 7, 16, 0, 0, 7); g.fill(); g.restore(); }
  });
}
// hay and straw strewn loose, with alpha at the gaps
function strewTex(seed, cols) {
  const r = rng(seed);
  return canvasTex(512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const x = r() * w, y = r() * h, a = r() * Math.PI, l = 8 + r() * 36;
      g.strokeStyle = cols[Math.floor(r() * cols.length)]; g.lineWidth = 0.8 + r() * 1.6;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
  }, { repeat: true });
}
// one patch of strewn straw, thick in the middle and thinning to nothing
// along a ragged edge (not tiled: the patch spans the texture)
function strewPatchTex(seed, cols) {
  const r = rng(seed), ph = [r() * 6.3, r() * 6.3, r() * 6.3];
  return canvasTex(1024, 1024, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0, n = 0; i < 60000 && n < 9000; i++) {
      const x = r() * w, y = r() * h, u = x / w * 2 - 1, v = y / h * 2 - 1, t = Math.atan2(v, u);
      const edge = 0.8 + 0.1 * Math.sin(3 * t + ph[0]) + 0.06 * Math.sin(5 * t + ph[1]) + 0.04 * Math.sin(9 * t + ph[2]);
      const d = Math.hypot(u, v) / edge;
      if (d > 1 || r() > Math.min(1, (1 - d) * 2.5)) continue;
      const a = r() * Math.PI, l = 10 + r() * 44;
      g.strokeStyle = cols[Math.floor(r() * cols.length)]; g.lineWidth = 1 + r() * 2;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); n++;
    }
  });
}
// leather of a binding or harness: grain and wear
function leatherTex(seed, base) {
  const r = rng(seed);
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,220,180'},${r() * 0.07})`; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); }
    for (let i = 0; i < 30; i++) { const x = r() * w, y = r() * h, rr = 8 + r() * 26; const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(255,220,170,0.08)'); gr.addColorStop(1, 'rgba(255,220,170,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  }, { repeat: true });
}

// A shelf of medieval books as seen from the room: codices of every size
// in leather over boards, limp vellum and a few bare boards; raised bands
// across the spines, titles inked on paper labels rather than gilt; most
// stand upright, some lean, others lie flat in small piles; gaps at the back.
// Returns albedo and a normal map drawn from the same height field.
function bookShelf(seed) {
  const r = rng(seed), W = 1024, H = 256;
  const col = document.createElement('canvas'); col.width = W; col.height = H;
  const hgt = document.createElement('canvas'); hgt.width = W; hgt.height = H;
  const g = col.getContext('2d'), h = hgt.getContext('2d');
  g.fillStyle = '#120c08'; g.fillRect(0, 0, W, H); h.fillStyle = '#000'; h.fillRect(0, 0, W, H);
  const leather = ['#5a3a24', '#6b4328', '#3e2a1c', '#4a2c20', '#6a2c22', '#552a1e', '#34261c', '#7a5634', '#2e2a22', '#5c4a30'];
  const vellum = ['#cdbb92', '#bfae88', '#d8c8a0', '#b8a37c'];
  const spine = (x, y, w, bh, c, horiz) => {
    // body with rounded shading, raised bands, a label, wear at the head
    const grd = horiz ? g.createLinearGradient(0, y, 0, y + bh) : g.createLinearGradient(x, 0, x + w, 0);
    grd.addColorStop(0, 'rgba(0,0,0,0.55)'); grd.addColorStop(0.3, c); grd.addColorStop(0.6, c); grd.addColorStop(1, 'rgba(0,0,0,0.6)');
    g.fillStyle = grd; g.fillRect(x, y, w, bh);
    const hg = horiz ? h.createLinearGradient(0, y, 0, y + bh) : h.createLinearGradient(x, 0, x + w, 0);
    hg.addColorStop(0, '#222'); hg.addColorStop(0.5, '#ddd'); hg.addColorStop(1, '#222');
    h.fillStyle = hg; h.fillRect(x, y, w, bh);
    const n = 3 + Math.floor(r() * 3);
    for (let k = 1; k <= n; k++) {
      if (horiz) { const xx = x + w * k / (n + 1); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(xx - 2, y, 4, bh); h.fillStyle = '#fff'; h.fillRect(xx - 1.5, y, 3, bh); }
      else { const yy = y + bh * (0.1 + 0.8 * k / (n + 1)); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, yy - 2, w, 4); g.fillStyle = 'rgba(255,230,190,0.08)'; g.fillRect(x, yy - 3, w, 1); h.fillStyle = '#fff'; h.fillRect(x, yy - 1.5, w, 3); }
    }
    if (!horiz && r() < 0.55) { g.fillStyle = r() < 0.5 ? '#d9cca8' : '#c8b88e'; const lw = w * 0.7, lh = 10 + r() * 10; g.fillRect(x + (w - lw) / 2, y + bh * 0.22, lw, lh); g.fillStyle = 'rgba(40,20,10,0.6)'; for (let q = 0; q < 3; q++) g.fillRect(x + (w - lw) / 2 + 2, y + bh * 0.22 + 3 + q * 3.5, lw * (0.4 + r() * 0.5), 1.2); }
    for (let q = 0; q < 30; q++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '230,200,160'},${r() * 0.12})`; g.fillRect(x + r() * w, y + r() * bh, 1 + r() * 3, 1 + r() * 3); }
  };
  let x = 0;
  while (x < W) {
    const u = r();
    if (u < 0.07) { x += 12 + r() * 40; continue; }                       // a gap
    if (u < 0.2) {                                                        // a pile lying flat
      const pw = 90 + r() * 70; let y = H;
      for (let k = 0, nk = 2 + Math.floor(r() * 4); k < nk; k++) { const bh = 14 + r() * 16, bw = pw * (0.8 + r() * 0.2); y -= bh; spine(x + (pw - bw) / 2, y, bw, bh, r() < 0.2 ? vellum[Math.floor(r() * 4)] : leather[Math.floor(r() * leather.length)], true); }
      x += pw + 4; continue;
    }
    const w = 18 + Math.pow(r(), 1.5) * 52, bh = H * (0.55 + r() * 0.42);
    const c = r() < 0.18 ? vellum[Math.floor(r() * 4)] : leather[Math.floor(r() * leather.length)];
    if (u > 0.93) { // leaning
      g.save(); h.save(); const a = (r() < 0.5 ? -1 : 1) * (0.12 + r() * 0.2); g.translate(x + w / 2, H); h.translate(x + w / 2, H); g.rotate(a); h.rotate(a); spine(-w / 2, -bh, w, bh, c, false); g.restore(); h.restore(); x += w + 16; continue;
    }
    spine(x, H - bh, w, bh, c, false); x += w + (r() < 0.2 ? 1 : 0);
  }
  // height → normal map
  const hd = h.getImageData(0, 0, W, H).data, nc = document.createElement('canvas'); nc.width = W; nc.height = H;
  const nctx = nc.getContext('2d'), out = nctx.createImageData(W, H), px = (i, j) => hd[((Math.min(H - 1, Math.max(0, j)) * W) + Math.min(W - 1, Math.max(0, i))) * 4] / 255;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const dx = (px(i + 1, j) - px(i - 1, j)) * 2.5, dy = (px(i, j + 1) - px(i, j - 1)) * 2.5, l = Math.hypot(dx, dy, 1), o = (j * W + i) * 4;
    out.data[o] = (-dx / l * 0.5 + 0.5) * 255; out.data[o + 1] = (dy / l * 0.5 + 0.5) * 255; out.data[o + 2] = (1 / l * 0.5 + 0.5) * 255; out.data[o + 3] = 255;
  }
  nctx.putImageData(out, 0, 0);
  const map = new THREE.CanvasTexture(col); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = 8;
  const nm = new THREE.CanvasTexture(nc); nm.wrapS = nm.wrapT = THREE.RepeatWrapping;
  return { map, nm };
}

export function propMaterials(M) {
  if (M.p) return M.p;
  const p = M.p = {};
  // turned earth of a new grave, which the thin snow has not yet closed
  p.graveEarth = dressed('soil', { scale: 1.6, color: 0xc2ae94 }, { snow: 0.8, minUp: 0.3, macro: 0.3, rough: 0.95, wet: 0.25 });
  // the ossuary's rough-hewn rock: a finer grain and a duller, damp sheen
  // (the architecture's wet rubble, under a lantern at arm's length, broke
  // into large glossy facets)
  const cs = [{ scale: 1.5, color: 0x8f8a80, env: 0.2, normal: 0.75 }, { macro: 0.35, streak: 0.3, damp: 0.55, soot: 0.2, lichen: 0.1, rough: 0.9, wet: 0.15, tintA: 0xe8e2d2, tintB: 0xcfd2c8, sat: 0.5 }];
  p.cryptStone = dressed('rubble', ...cs);
  // the treasury's own rock and flags are the ossuary's and the church's
  // materials again, but closed to the lights of the church above
  // (core/materials.js underground())
  p.tStone = underground(dressed('rubble', ...cs));
  p.tFlag = underground(dressed('flag', { scale: 3.2, color: 0xc9c0b1, env: 0.4 }, { macro: 0.22, rough: 0.78, cavity: 0.35 }));
  // its low vault: old lime over the rock, greyed and smoked by centuries
  // of torches (the church's white plaster, #f6eee0, lit from half a metre,
  // burned to gold leaf). Albedo about a third of that.
  p.cryptVault = underground(dressed('plaster_stone', { scale: 2.2, color: 0x9a9184, env: 0.2, normal: 0.9 }, { macro: 0.3, streak: 0.12, damp: 0.2, soot: 0.55, rough: 0.94, cavity: 0.25, tintA: 0xe6e0d4, tintB: 0xd0d0c8, sat: 0.55 }));
  p.bone = std({ map: boneTex(3), color: 0xbfb398, roughness: 0.78, envMapIntensity: 0.35 });
  p.boneDark = std({ map: boneTex(7), color: 0x958667, roughness: 0.85, envMapIntensity: 0.3 });
  p.socket = std({ color: 0x0c0907, roughness: 1, envMapIntensity: 0 });
  p.linen = std({ map: weave(5, '#b3a890', { dirt: 0.5 }), roughness: 1, envMapIntensity: 0.3, side: THREE.DoubleSide });
  p.linenWhite = std({ map: weave(6, '#c4bba8', { dirt: 0.25 }), roughness: 1, envMapIntensity: 0.3, side: THREE.DoubleSide });
  p.blanket = std({ map: weave(9, '#6b5a44', { stripe: 'rgba(40,30,20,0.4)', dirt: 0.4 }), roughness: 1, envMapIntensity: 0.25, side: THREE.DoubleSide });
  p.blanketGrey = std({ map: weave(12, '#7c776c', { stripe: 'rgba(60,50,40,0.35)' }), roughness: 1, envMapIntensity: 0.25, side: THREE.DoubleSide });
  p.sacking = std({ map: weave(15, '#9c8a68', { dirt: 0.6 }), roughness: 1, envMapIntensity: 0.25 });
  // grain sacks: coarser, browner, grimed with handling and meal dust
  p.grainSack = std({ map: weave(11, '#7d6c50', { dirt: 0.85 }), color: 0xc9bca6, roughness: 1, envMapIntensity: 0.18 });
  p.twine = std({ color: 0x8a7a5a, roughness: 1 });
  p.herbStem = std({ color: 0x5b5236, roughness: 1, side: THREE.DoubleSide });
  p.herbDry = std({ color: 0x6f6a48, roughness: 0.95, flatShading: true, envMapIntensity: 0.3 });
  p.herbGreen = std({ color: 0x55603f, roughness: 0.9, flatShading: true, envMapIntensity: 0.3 });
  p.flour = std({ color: 0xd9d2c2, roughness: 1, envMapIntensity: 0.3 });
  p.curtain = std({ map: weave(21, '#4f3f2c', { dirt: 0.3 }), roughness: 1, envMapIntensity: 0.25, side: THREE.DoubleSide });
  p.earthenware = std({ map: potTex(4, '#80583f'), roughness: 0.9, envMapIntensity: 0.35 });
  p.earthenDark = std({ map: potTex(8, '#6e4a36'), roughness: 0.7, envMapIntensity: 0.45 });
  p.glazeGreen = std({ map: potTex(10, '#5d6a3c'), roughness: 0.35, envMapIntensity: 0.7 });
  p.glazeBrown = std({ map: potTex(13, '#6b4424'), roughness: 0.3, envMapIntensity: 0.7 });
  p.glass = std({ color: 0x7d8d6a, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.55, envMapIntensity: 1.2, depthWrite: false });
  p.stain = std({ map: stainTex(17), transparent: true, roughness: 0.35, envMapIntensity: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
  // Thick, opaque blood retains a restrained wet sheen. The grazing sky
  // reflection was still whitening the entire vat in the rendered snow.
  p.bloodPool = new THREE.MeshPhysicalMaterial({ color: 0x380607, roughness: 0.42, metalness: 0,
    envMapIntensity: 0.12, specularIntensity: 0.22, specularColor: 0xbb6655 });
  p.water = std({ color: 0x1c2220, roughness: 0.08, metalness: 0, envMapIntensity: 0.45, transparent: true, opacity: 0.9 });
  p.wetFloor = std({ color: 0x141614, roughness: 0.12, envMapIntensity: 0.5, transparent: true, opacity: 0.35, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  p.hay = std({ map: strewTex(23, ['#b89a5a', '#a88a4c', '#c9ae70', '#8d7440', '#d8c48c']), transparent: true, alphaTest: 0.35, roughness: 1, envMapIntensity: 0.2, side: THREE.DoubleSide });
  p.strew = std({ map: strewPatchTex(29, ['#8f7a4c', '#7f6b40', '#9c8756', '#6c5a36', '#a8966a']), transparent: true, alphaTest: 0.35, roughness: 1, envMapIntensity: 0.2, side: THREE.DoubleSide });  // one patch, thinning to its edge (sculpt.strew)
  p.dung = dressed('soil', { scale: 0.9, color: 0x4e3e2c }, { macro: 0.3, rough: 0.6, wet: 1, damp: 0.8 });
  p.leather = std({ map: leatherTex(31, '#5a3a22'), roughness: 0.7, envMapIntensity: 0.4 });
  p.leatherRed = std({ map: leatherTex(33, '#6a2a1e'), roughness: 0.7, envMapIntensity: 0.4 });
  p.leatherBlack = std({ map: leatherTex(35, '#2a221c'), roughness: 0.65, envMapIntensity: 0.4 });
  p.vellum = std({ map: leatherTex(37, '#d6c7a0'), roughness: 0.85, envMapIntensity: 0.35 });
  p.ink = std({ color: 0x0a0806, roughness: 0.15, envMapIntensity: 0.8 });
  p.quill = std({ color: 0xe8e2d2, roughness: 0.8, side: THREE.DoubleSide });
  p.ironRust = std({ color: 0x3b2d24, roughness: 0.8, metalness: 0.6, envMapIntensity: 0.5 });
  p.coal = std({ color: 0x151210, roughness: 0.95 });
  p.glow = new THREE.MeshBasicMaterial({ color: 0xff6a20, toneMapped: false });
  // coals glowing from within, each vertex its own heat (props/sculpt.js embers)
  p.ember = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  p.wine = std({ color: 0x2c0a10, roughness: 0.1, envMapIntensity: 1 });
  p.oilRes = std({ color: 0x2e2812, roughness: 0.4, envMapIntensity: 0.35 });
  p.bread = std({ color: 0xa07040, roughness: 0.9 });
  p.onion = std({ color: 0xb78a52, roughness: 0.6 });
  // meat browning on the spit: dark and fatty, not the pale crust of bread
  p.roast = std({ color: 0x3e1f12, roughness: 0.55, envMapIntensity: 0.3 });
  p.greens = std({ color: 0x4a5a2c, roughness: 0.9 });
  // leaf shading in vertex colour (props/sculpt.js cabbage), waxy bloom
  p.cabbage = std({ vertexColors: true, roughness: 0.62, envMapIntensity: 0.3, side: THREE.DoubleSide });
  p.books = [101, 102, 103, 104].map(sd => { const t = bookShelf(sd); const m = std({ map: t.map, normalMap: t.nm, roughness: 0.78, envMapIntensity: 0.3 }); m.normalScale.set(1.4, 1.4); return m; });
  return p;
}
