import * as THREE from 'three';
import * as C from './props/cloth.js';
import { AED } from '../core/plan.js';
import { createLibrary, rot, sectorPoints, pointInPoly } from '../core/library.js';
import { Batch, wall, wallLoop, spiral, prism, vault, box, cyl, merge, place, quad, sphere, lathe, vaultSmooth } from '../core/kit.js';
import { scrollTexture, canvasTex } from '../core/materials.js';
import * as F from './furniture.js';
import { STAIR_E, WELL, HIDDEN_STAIR } from './aedificium.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

// "Seven walls… only four of them with an opening: a fairly wide archway
// between two small columns set into the wall, under a round arch."
// Bookcases stand regularly against the windowless walls; every shelf
// carries a numbered label; a table stands in the middle. Each room has
// a scroll above its arch, cut into the stone and filled with paint.

const A = AED;
const S = sectorPoints(A);
export const LIB = createLibrary(A);

function inward(poly, a, b) {
  const c = poly.reduce((s, p) => [s[0] + p[0] / poly.length, s[1] + p[1] / poly.length], [0, 0]);
  const d = [b[0] - a[0], b[1] - a[1]], L = Math.hypot(...d);
  let n = [-d[1] / L, d[0] / L];
  const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  if ((c[0] - m[0]) * n[0] + (c[1] - m[1]) * n[1] < 0) n = [-n[0], -n[1]];
  return n;
}

export function buildLibrary(M, ctx, { emit, interact, toWorld }) {
  const b = new Batch('aed-library', [A.x, 0, A.z]);
  const y = A.y2, H = A.h2, spring = y + 3.6, doorW = 1.3, doorH = 2.25;
  const L = LIB;

  // floor with the east stairhead
  const eC = STAIR_E.c;
  const hole = Array.from({ length: 24 }, (_, i) => [eC[0] + STAIR_E.shaftIn * Math.cos(i * Math.PI / 12), eC[1] + STAIR_E.shaftIn * Math.sin(i * Math.PI / 12)]);
  // F4: Jorge's secret stair (see HIDDEN_STAIR in aedificium.js). Its round
  // pier stands engaged in the finis Africae's S.T4 wall and pierces the
  // library floor; shaft, spiral and concealed doors: hiddenStair() below.
  const HS = HIDDEN_STAIR, hsR = HS.rIn + HS.th / 2, hsOut = HS.rIn + HS.th;
  const hsHole = Array.from({ length: 20 }, (_, i) => [HS.c[0] + hsR * Math.cos(i * Math.PI / 10), HS.c[1] + hsR * Math.sin(i * Math.PI / 10)]);
  // the stretch of an edge that the pier occupies (for bookcases)
  const hsBlock = (a, c) => {
    const Le = Math.hypot(c[0] - a[0], c[1] - a[1]), d = [(c[0] - a[0]) / Le, (c[1] - a[1]) / Le];
    const t = (HS.c[0] - a[0]) * d[0] + (HS.c[1] - a[1]) * d[1];
    const off = Math.abs((HS.c[0] - a[0]) * d[1] - (HS.c[1] - a[1]) * d[0]);
    if (off > hsOut + 0.75 || t < -hsOut || t > Le + hsOut) return null;
    const half = Math.sqrt(Math.max(0, (hsOut + 0.75) ** 2 - off * off)) + 0.2;
    return [t - half, t + half];
  };
  b.add('terracotta', prism(OUTLINE_OF(), y - 0.5, y, { holes: [WELL, hole, hsHole], bottom: false }));
  b.add('plaster', prism(OUTLINE_OF(), y - 0.5, y, { holes: [WELL, hole, hsHole], top: false, sides: false }), { collide: false });
  // stairhead parapet, open toward the heptagon's centre
  for (let i = 0; i < 24; i++) {
    const a0 = i * Math.PI / 12, a1 = (i + 1) * Math.PI / 12;
    const am = ((a0 + a1) / 2) % (2 * Math.PI);
    if (am > 1.45 * Math.PI && am < 2.05 * Math.PI) continue;
    const r = STAIR_E.shaftIn + 0.14;
    b.add('aedIn', wall([eC[0] + r * Math.cos(a0), eC[1] + r * Math.sin(a0)], [eC[0] + r * Math.cos(a1), eC[1] + r * Math.sin(a1)], y, y + 0.95, 0.28));
  }

  // walls between rooms
  const scrollsByText = new Map();
  const addScroll = (room, a, c, n) => {
    if (!room.verse) return;
    const key = room.verse + (room.red ? '|r' : '');
    if (!scrollsByText.has(key)) scrollsByText.set(key, []);
    const Lw = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const m = [(a[0] + c[0]) / 2 + n[0] * 0.3, (a[1] + c[1]) / 2 + n[1] * 0.3];
    const w = Math.min(2.4, Lw - 0.4), h = w * 0.16;
    const d = [(c[0] - a[0]) / Lw, (c[1] - a[1]) / Lw];
    // face the room: build a quad whose front faces n
    let p0 = [m[0] - d[0] * w / 2, m[1] - d[1] * w / 2], p1 = [m[0] + d[0] * w / 2, m[1] + d[1] * w / 2];
    const cross = (p1[0] - p0[0]) * n[1] - (p1[1] - p0[1]) * n[0];
    if (cross < 0) [p0, p1] = [p1, p0];
    const yb = y + doorH + doorW / 2 + 0.22;
    scrollsByText.get(key).push(quad([p0[0], yb, p0[1]], [p1[0], yb, p1[1]], [p1[0], yb + h, p1[1]], [p0[0], yb + h, p0[1]], 0, 1, 0, 1, false));
  };
  const wallOf = e => e.rooms.some(id => L.byId.get(id).kind === 'hall') ? 0.62 : A.wallIn;
  for (const e of L.edges) {
    if (e.rooms.length !== 2) continue;
    const th = wallOf(e);
    const Le = Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1]);
    const ops = [];
    if (e.door) ops.push({ t: Le / 2, w: doorW, y0: 0, y1: doorH, arch: 'round' });
    if (e.mirror) ops.push({ t: Le / 2, w: 1.3, y0: 0, y1: 2.5, arch: 'flat' });
    { // F4: the wall stops where the hidden stair's pier takes its place
      const d = [(e.b[0] - e.a[0]) / Le, (e.b[1] - e.a[1]) / Le];
      const t = (HS.c[0] - e.a[0]) * d[0] + (HS.c[1] - e.a[1]) * d[1];
      const off = Math.abs((HS.c[0] - e.a[0]) * d[1] - (HS.c[1] - e.a[1]) * d[0]);
      if (off < hsR - 0.05 && t > 0 && t < Le) ops.push({ t, w: 2 * Math.sqrt(hsR * hsR - off * off), y0: 0, y1: H, arch: 'flat' });
    }
    b.add('plasterStone', wall(e.a, e.b, y, y + H, th, ops));
    if (e.door) {
      const d = [(e.b[0] - e.a[0]) / Le, (e.b[1] - e.a[1]) / Le], nrm = [-d[1], d[0]];
      const m = [(e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2];
      for (const s of [-1, 1]) for (const f of [-1, 1]) {
        const px = m[0] + d[0] * s * (doorW / 2 + 0.07) + nrm[0] * f * (th / 2 + 0.02);
        const pz = m[1] + d[1] * s * (doorW / 2 + 0.07) + nrm[1] * f * (th / 2 + 0.02);
        b.add('aedIn', F_col(px, y, pz, doorH), { collide: false });
      }
      for (const id of e.rooms) {
        const room = L.byId.get(id);
        addScroll(room, e.a, e.b, inward(room.poly, e.a, e.b));
      }
    }
  }
  for (const [key, list] of scrollsByText) {
    const [text, red] = key.split('|');
    const mat = new THREE.MeshStandardMaterial({ map: scrollTexture(text, red === 'r'), roughness: 0.85, envMapIntensity: 0.3, polygonOffset: true, polygonOffsetFactor: -2 });
    const key2 = `scroll_${[...scrollsByText.keys()].indexOf(key)}`;
    M[key2] = mat;
    b.add(key2, merge(list), { collide: false, shadow: false });
  }

  // vaults, bookcases, tables
  const openingsOf = new Map(); // roomId -> [{a,b,t,w}]
  for (const e of L.edges) {
    for (const id of e.rooms) {
      if (!openingsOf.has(id)) openingsOf.set(id, []);
      if (e.door || e.mirror) openingsOf.get(id).push({ e, w: e.mirror ? 1.5 : doorW + 0.5 });
    }
  }
  let variant = 0;
  const rooms3 = [];
  for (const room of L.rooms) {
    const poly = room.poly;
    b.add('plaster', vaultSmooth(poly, spring, 1.15, { archRise: 0, rings: 9, step: 0.6 }), { collide: false });
    if (room.id === 'S.hall') { finisAfricae(b, room, y, emit, interact, hsBlock); rooms3.push(room); continue; }
    if (room.id === 'E.T3') { altarRoom(b, room, y, emit); }
    const ops = openingsOf.get(room.id) || [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], c = poly[(i + 1) % poly.length];
      const Le = Math.hypot(c[0] - a[0], c[1] - a[1]);
      const n = inward(poly, a, c);
      // which kind of wall is this edge?
      const ed = L.edges.find(e => (sameP(e.a, a) && sameP(e.b, c)) || (sameP(e.a, c) && sameP(e.b, a)));
      const exterior = ed && ed.rooms.length === 1;
      const th = exterior ? (isWell(a, c) ? A.wallWell : A.wallOut) : (ed.rooms.some(id => L.byId.get(id).kind === 'hall') ? 0.62 : A.wallIn);
      const inset = th / 2 + 0.02;
      const d = [(c[0] - a[0]) / Le, (c[1] - a[1]) / Le];
      // free intervals along the edge
      const blocked = [];
      if (ed.door || ed.mirror) blocked.push([Le / 2 - (doorW / 2 + 0.35), Le / 2 + (doorW / 2 + 0.35)]);
      const isWinEdge = room.window && ((sameP(room.window[0], a) && sameP(room.window[1], c)) || (sameP(room.window[0], c) && sameP(room.window[1], a)));
      if (isWinEdge) blocked.push([Le / 2 - 0.75, Le / 2 + 0.75]);
      { const hb = hsBlock(a, c); if (hb) blocked.push(hb); }   // F4 pier
      if (exterior && !isWinEdge) blocked.push([Le / 2 - 0.2, Le / 2 + 0.2]);
      // keep corners clear of neighbouring bookcases
      const intervals = subtract([[0.5, Le - 0.5]], blocked).filter(([u, v]) => v - u > 0.75);
      if (room.id === 'E.T3' && isWinEdge) continue;
      if (room.id === 'S.Bp' && ed.mirror) continue;
      for (const [u, v] of intervals) {
        const p = [a[0] + d[0] * u + n[0] * inset, a[1] + d[1] * u + n[1] * inset];
        const q = [a[0] + d[0] * v + n[0] * inset, a[1] + d[1] * v + n[1] * inset];
        // bookcase() puts +z to the left of p→q; flip if needed
        const left = [-(q[1] - p[1]), q[0] - p[0]];
        const ok = left[0] * n[0] + left[1] * n[1] > 0;
        const h = isWinEdge ? 1.55 : 2.7;
        F.bookcase(b, ok ? p : q, ok ? q : p, y, h, 0.42, { variant: variant++ });
      }
      void ops;
    }
    // central table
    const c = room.center;
    if (room.id === 'E.hall') {
      const tc = [c[0] + 1.3, c[1]];
      F.table(b, tc[0], y, tc[1], Math.PI / 2, 1.6, 0.8);
      bookPile(b, tc[0], y + 0.78, tc[1], 3);
    } else if (room.kind !== 'hall' || true) {
      const ang = longestEdgeAngle(room.poly);
      const small = Math.abs(area(room.poly)) < 16;
      F.table(b, c[0], y, c[1], -ang, small ? 1.3 : 1.7, 0.75);
      bookPile(b, c[0], y + 0.78, c[1], 1 + (room.index % 3));
    }
    rooms3.push(room);
  }

  // the mirror between S and the finis Africae
  const mirror = mirrorDoor(b, M, ctx, y, emit, interact);
  // F4: Jorge's secret stair and the cupboard-door that conceals its top
  const hidden = hiddenStair(b, M, ctx, y, emit, interact);
  // the censer in the Apocalypse room of YSPANIA
  censerRoom(b, y, emit, interact);
  // mirror room props: De bestiis with the unicorn
  {
    const r = L.byId.get('S.Bp');
    openBook(b, r.center[0], y + 0.79, r.center[1], 0.3, 'unicorn');
    interact({ id: 'de-bestiis', pos: [r.center[0], y + 1.1, r.center[1]], radius: 1.8, label: 'De bestiis, open at the unicorn' });
  }
  // east hall: the great scroll "Apocalypsis Iesu Christi"
  interact({ id: 'east-hall', pos: [...pt(L.byId.get('E.hall').center, y + 1.2)], radius: 3, label: 'Apocalypsis Iesu Christi — the entrance heptagon' });

  for (const [k, v] of Object.entries(pages)) M['page_' + k] = v;
  // room lookup for the HUD / map
  const findRoom = (lx, lz) => rooms3.find(r => pointInPoly([lx, lz], r.poly));

  return { batches: [b], mirror, findRoom, rooms: L.rooms, lib: L, hidden };
}

function pt(c, yy) { return [c[0], yy, c[1]]; }
function OUTLINE_OF() {
  const o = [];
  for (let k = 0; k < 4; k++) for (let i = 1; i <= 6; i++) o.push(rot(S.t[i], k));
  return o;
}
function sameP(p, q) { return Math.abs(p[0] - q[0]) < 1e-3 && Math.abs(p[1] - q[1]) < 1e-3; }
function isWell(a, c) { const r = Math.hypot((a[0] + c[0]) / 2, (a[1] + c[1]) / 2); return r < A.a0 + 1; }
function subtract(ints, cuts) {
  let out = ints;
  for (const [c0, c1] of cuts) {
    const next = [];
    for (const [u, v] of out) {
      if (c1 <= u || c0 >= v) { next.push([u, v]); continue; }
      if (c0 > u) next.push([u, c0]);
      if (c1 < v) next.push([c1, v]);
    }
    out = next;
  }
  return out;
}
function area(poly) { let s = 0; for (let i = 0; i < poly.length; i++) { const [x0, z0] = poly[i], [x1, z1] = poly[(i + 1) % poly.length]; s += x0 * z1 - x1 * z0; } return s / 2; }
function longestEdgeAngle(poly) {
  let best = 0, ang = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], c = poly[(i + 1) % poly.length], Le = Math.hypot(c[0] - a[0], c[1] - a[1]);
    if (Le > best) { best = Le; ang = Math.atan2(c[1] - a[1], c[0] - a[0]); }
  }
  return ang;
}
function F_col(x, yy, z, h) {
  return merge([cyl(0.075, 0.075, h - 0.18, 8, { x, y: yy + 0.12, z }), box(0.2, 0.12, 0.2, { x, y: yy, z }), box(0.22, 0.14, 0.22, { x, y: yy + h - 0.1, z })]);
}
function bookPile(b, x, yy, z, n) {
  for (let i = 0; i < n; i++) {
    const w = 0.32 + (i % 2) * 0.08, d = 0.24 + (i % 3) * 0.03, h = 0.06 + (i % 2) * 0.03;
    b.add(i % 2 ? 'door' : 'woodDark', box(w, h, d, { x: x + (i % 2) * 0.08 - 0.2, y: yy + i * 0.075, z: z + (i % 3) * 0.05, ry: i * 0.4 }), { collide: false });
  }
}

// an open codex with a painted page
const pages = {};
function pageMat(kind) {
  if (pages[kind]) return pages[kind];
  const t = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#e8d9b4'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(80,50,20,.25)'; g.fillRect(w / 2 - 3, 0, 6, h);
    const lines = (x0) => { g.fillStyle = 'rgba(40,25,15,.55)'; for (let i = 0; i < 16; i++) g.fillRect(x0 + 24, 30 + i * 13, w / 2 - 60 - (i % 4) * 8, 3); };
    if (kind === 'unicorn') {
      lines(0);
      g.fillStyle = '#f4efe2'; g.strokeStyle = '#3a2a1a'; g.lineWidth = 3;
      g.beginPath(); g.ellipse(w * 0.75, h * 0.6, 70, 34, 0, 0, 7); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(w * 0.86, h * 0.45); g.lineTo(w * 0.94, h * 0.18); g.stroke();
      g.fillStyle = '#2e5a2c'; g.fillRect(w / 2 + 20, h - 50, w / 2 - 40, 26);
      g.fillStyle = '#a3160e'; g.font = 'bold 44px serif'; g.fillText('D', 30, 60);
    } else if (kind === 'apocalypse') {
      // "four bands: yellow, cinnabar, turquoise, burnt earth" — the woman clothed with the sun
      const bands = ['#d8a531', '#b8321f', '#2f8c8a', '#6e3b1c'];
      bands.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * h / 4, w, h / 4); });
      g.fillStyle = '#f2d060'; g.beginPath(); g.arc(w * 0.3, h * 0.45, 46, 0, 7); g.fill();
      g.fillStyle = '#1d3f9a'; g.fillRect(w * 0.27, h * 0.3, 30, 80);
      g.fillStyle = '#e8d9b4'; g.beginPath(); g.arc(w * 0.3, h * 0.28, 14, 0, 7); g.fill();
      g.strokeStyle = '#1b3b1a'; g.lineWidth = 9;
      g.beginPath(); for (let i = 0; i < 10; i++) { g.moveTo(w * 0.7, h * 0.7); g.lineTo(w * 0.7 + Math.cos(i * 0.5 - 2.4) * 90, h * 0.7 + Math.sin(i * 0.5 - 2.4) * 90); } g.stroke();
      g.fillStyle = '#e9e1c0'; for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(Math.random() * w, Math.random() * h * 0.4, 4, 0, 7); g.fill(); }
    } else if (kind === 'greek') {
      lines(0); lines(w / 2);
      g.fillStyle = 'rgba(120,90,40,.3)'; g.beginPath(); g.arc(w - 40, 30, 60, 0, 7); g.fill();
    } else { lines(0); lines(w / 2); }
  });
  pages[kind] = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, envMapIntensity: 0.3, side: THREE.DoubleSide });
  return pages[kind];
}
function openBook(b, x, yy, z, ry, kind) {
  const key = 'page_' + kind;
  pageMat(kind);
  const w = 0.62, d = 0.42, T = 0.035;
  // each leaf rises from the gutter and flattens toward the fore-edge, over
  // its own block of pages; the boards of the binding beneath, a little
  // larger; the whole resting on a red cloth
  const leaf = side => {
    const g = new THREE.PlaneGeometry(w / 2, d, 14, 2); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) / (w / 2) + 0.5;              // 0 gutter side .. 1 fore-edge (for side 1)
      const t = side > 0 ? u : 1 - u;
      p.setX(i, side * t * w / 2 * 0.98);
      p.setY(i, T * 0.4 + T * 0.9 * Math.sin(Math.min(1, t * 2.2) * Math.PI / 2) - 0.012 * t * t);
      uv.setX(i, side > 0 ? 0.5 + t * 0.5 : 0.5 - t * 0.5);
    }
    return g;
  };
  const g = merge([leaf(-1), leaf(1)]);
  place(g, { x, y: yy, z, ry });
  b.add(key, g, { collide: false, shadow: false });
  const blocks = merge([-1, 1].map(sd => box(w / 2 - 0.02, T, d - 0.02, { x: sd * (w / 4), y: 0.004 })));
  b.add('p.vellum', place(blocks, { x, y: yy, z, ry }), { collide: false });
  b.add('p.leatherBlack', place(merge([box(w + 0.03, 0.012, d + 0.025, { y: -0.008 })]), { x, y: yy, z, ry }), { collide: false });
  b.add('redCloth', box(w + 0.2, 0.01, d + 0.16, { x, y: yy - 0.02, z, ry }), { collide: false });
}

// The east room: "no books and no scroll; a stone altar stood beneath
// the window" — the room lit by the rising sun.
function altarRoom(b, room, y, emit) {
  const w = room.window, m = [(w[0][0] + w[1][0]) / 2, (w[0][1] + w[1][1]) / 2];
  const n = inward(room.poly, w[0], w[1]);
  const p = [m[0] + n[0] * 1.35, m[1] + n[1] * 1.35];
  const ang = Math.atan2(w[1][1] - w[0][1], w[1][0] - w[0][0]);
  b.add('aedIn', box(1.6, 1.0, 0.8, { x: p[0], y, z: p[1], ry: -ang }));
  b.add('aedIn', box(1.8, 0.12, 0.95, { x: p[0], y: y + 1.0, z: p[1], ry: -ang }));
  F.crucifix(b, p[0] + n[0] * 0.1, y + 1.12, p[1] + n[1] * 0.1, -ang, 0.55);
  void emit;
}

// the smouldering censer that gives Adso his vision
function censerRoom(b, y, emit, interact) {
  const r = LIB.byId.get('SW.Xb');
  const c = r.center;
  const bowl = lathe([[0, 0], [0.16, 0.02], [0.2, 0.12], [0.18, 0.14], [0.02, 0.1]], 14, { x: c[0] + 0.35, y: y + 0.78, z: c[1] });
  b.add('bronze', bowl, { collide: false });
  b.add('ember', sphere(0.12, { x: c[0] + 0.35, y: y + 0.88, z: c[1], sy: 0.35 }, 10, 6), { collide: false, shadow: false });
  openBook(b, c[0] - 0.35, y + 0.79, c[1], 0.4, 'apocalypse');
  emit({ x: c[0] + 0.35, y: y + 1.1, z: c[1], color: 0xff6a2a, intensity: 1.6, distance: 6, flicker: 0.12, small: true, censer: true });
  interact({ id: 'censer', pos: [c[0], y + 1.0, c[1]], radius: 3.2, label: 'A censer of smouldering herbs beside an Apocalypse', vision: true });
}

// The mirror: taller than a man, in a sturdy oak frame, of wavy glass that
// distorts; it opens like a door when the first and seventh letters of
// "quatuor" in the verse above it are pressed.
function mirrorDoor(b, M, ctx, y, emit, interact) {
  const e = LIB.mirror;
  const a = e.a, c = e.b, Le = Math.hypot(c[0] - a[0], c[1] - a[1]);
  const d = [(c[0] - a[0]) / Le, (c[1] - a[1]) / Le];
  const room = LIB.byId.get('S.Bp');
  const n = inward(room.poly, a, c);
  const m = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
  const ang = Math.atan2(d[1], d[0]);
  // pivot group at one jamb; local +y up, +z into room S, +x across the opening
  const Z = new THREE.Vector3(n[0], 0, n[1]), Y = new THREE.Vector3(0, 1, 0), X = new THREE.Vector3().crossVectors(Y, Z);
  const hinge = [m[0] - X.x * 0.65 + n[0] * 0.2, m[1] - X.z * 0.65 + n[1] * 0.2];
  const group = new THREE.Group();
  group.position.set(hinge[0] + A.x, y, hinge[1] + A.z);
  group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
  void ang;
  const pivot = new THREE.Group(); group.add(pivot);
  const frameGeo = merge([box(1.4, 0.12, 0.14, { x: 0.65, y: 0 }), box(1.4, 0.12, 0.14, { x: 0.65, y: 2.46 }), box(0.12, 2.58, 0.14, { x: 0.0 }), box(0.12, 2.58, 0.14, { x: 1.3 })]);
  const frame = new THREE.Mesh(frameGeo, M.woodDark); frame.castShadow = true;
  const backing = new THREE.Mesh(box(1.3, 2.46, 0.06, { x: 0.65, y: 0.06, z: -0.05 }), M.woodDark);
  const glassGeo = new THREE.PlaneGeometry(1.18, 2.34, 24, 48);
  // "a sheet of fluted glass": ripple the surface
  const gp = glassGeo.attributes.position;
  for (let i = 0; i < gp.count; i++) gp.setZ(i, Math.sin(gp.getY(i) * 7.5) * 0.012 + Math.sin(gp.getX(i) * 11) * 0.008);
  glassGeo.computeVertexNormals();
  glassGeo.translate(0.65, 1.23, 0.02);
  const glass = new Reflector(glassGeo, { textureWidth: 512, textureHeight: 1024, color: 0xb8b4a8, clipBias: 0.003 });
  // "a sheet of wavy glass": ripple the reflection so it swells and bends
  glass.material.fragmentShader = glass.material.fragmentShader.replace(
    'vec4 base = texture2DProj( tDiffuse, vUv );',
    `vec4 uvw = vUv; vec2 q = uvw.xy / uvw.w;
     q.x += sin(q.y * 38.0) * 0.018 + sin(q.y * 9.0 + q.x * 4.0) * 0.03;
     q.y += sin(q.x * 21.0) * 0.012;
     vec4 base = texture2D( tDiffuse, q );`);
  glass.material.needsUpdate = true;
  glass.userData.reflector = true;
  pivot.add(frame, backing, glass);
  // the verse above, with raised metal letters
  const scroll = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.34), new THREE.MeshStandardMaterial({ map: scrollTexture('Super thronos viginti quatuor', false, [0, 1, 2, 3, 4, 5, 6]), roughness: 0.55, metalness: 0.2, envMapIntensity: 0.6 }));
  scroll.position.set(0.65, 2.95, 0.34);
  group.add(scroll);
  // Q and R buttons (the letters of "quatuor")
  const letters = [];
  for (const [ch, off] of [['q', 0.745], ['r', 0.955]]) {
    const btn = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.12, 0.01), M.bronze); btn.visible = false;
    btn.position.set(0.65 - 1.1 + 2.2 * off, 2.93, 0.36);
    btn.userData.letter = ch;
    group.add(btn); letters.push(btn);
  }
  ctx.scene.add(group);
  // collider for the closed mirror
  const colGeo = box(1.3, 2.5, 0.3, { x: 0.65, z: 0.0 });
  const collider = ctx.addDynamic(pivot, colGeo);
  const state = { open: 0, target: 0, pressed: new Set(), group, pivot, letters, glass, collider };
  const toW = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyMatrix4(group.matrixWorld);
  group.updateMatrixWorld(true);
  interact({ id: 'mirror', pos: [m[0] + n[0] * 1.2, y + 1.6, m[1] + n[1] * 1.2], radius: 2.4, label: 'A mirror of wavy glass, taller than a man', mirror: state });
  state.letterPos = letters.map(l => { l.updateMatrixWorld(true); return l.getWorldPosition(new THREE.Vector3()); });
  state.update = dt => {
    state.open = THREE.MathUtils.damp(state.open, state.target, 2.2, dt);
    pivot.rotation.y = -state.open * 1.55;
    collider.enabled = state.open < 0.35;
  };
  void toW; void emit;
  return state;
}

// The finis Africae: heptagonal, vaulted, windowless; shelves along the
// walls; a table in the middle piled with papers; a stool; a chair by the
// door; a cupboard at the far end hiding a door, a weighted wheel beside it.
function finisAfricae(b, room, y, emit, interact, hsBlock) {
  const poly = room.poly;
  const mirrorE = LIB.mirror;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], c = poly[(i + 1) % poly.length];
    const isMirror = (sameP(a, mirrorE.a) && sameP(c, mirrorE.b)) || (sameP(a, mirrorE.b) && sameP(c, mirrorE.a));
    const n = inward(poly, a, c);
    const Le = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const d = [(c[0] - a[0]) / Le, (c[1] - a[1]) / Le];
    const inset = 0.33;
    // shelves stop where the pier of the hidden stair stands (F4)
    const cuts = isMirror ? [[Le / 2 - 1.0, Le / 2 + 1.0]] : [];
    const hb = hsBlock && hsBlock(a, c); if (hb) cuts.push(hb);
    const ints = subtract([[0.35, Le - 0.35]], cuts);
    for (const [u, v] of ints) {
      if (v - u < 0.6) continue;
      const p = [a[0] + d[0] * u + n[0] * inset, a[1] + d[1] * u + n[1] * inset];
      const q = [a[0] + d[0] * v + n[0] * inset, a[1] + d[1] * v + n[1] * inset];
      const left = [-(q[1] - p[1]), q[0] - p[0]];
      const ok = left[0] * n[0] + left[1] * n[1] > 0;
      F.bookcase(b, ok ? p : q, ok ? q : p, y, 2.6, 0.42, { variant: 3 + i });
    }
  }
  const c = room.center;
  F.table(b, c[0], y, c[1], 0.3, 1.9, 1.0, 0.8, 'woodDark');
  // "a table in the middle piled with papers": loose leaves, curling, in
  // drifts; a few closed codices; an inkhorn
  for (let i = 0; i < 14; i++) {
    const sh = C.drape(0.3, 0.22, 0, { hang: 0.008, seed: 960 + i, rumple: 0.5, floor: -1 });
    b.add('p.vellum', place(sh, { x: c[0] + ((i * 37) % 11 - 5) * 0.1, y: y + 0.8 + (i % 5) * 0.006, z: c[1] + ((i * 17) % 7 - 3) * 0.1, ry: i * 0.7, rx: (i % 3 - 1) * 0.03 }), { collide: false, shadow: false });
  }
  for (let i = 0; i < 3; i++) b.add(['p.leather', 'p.leatherRed', 'p.leatherBlack'][i], box(0.3, 0.07, 0.22, { x: c[0] - 0.65 + i * 0.05, y: y + 0.8 + i * 0.07, z: c[1] + 0.25, ry: 0.3 + i * 0.2 }), { collide: false });
  openBook(b, c[0] + 0.2, y + 0.99, c[1] - 0.1, 0.3, 'greek');
  F.stool(b, c[0] - 1.0, y, c[1] + 0.8);
  // chair by the door (the mirror side), cupboard and weighted wheel opposite
  const mE = [(mirrorE.a[0] + mirrorE.b[0]) / 2, (mirrorE.a[1] + mirrorE.b[1]) / 2];
  const toC = [c[0] - mE[0], c[1] - mE[1]], l = Math.hypot(...toC);
  const u = [toC[0] / l, toC[1] / l];
  F.chair(b, mE[0] + u[0] * 1.0 + u[1] * 1.0, y, mE[1] + u[1] * 1.0 - u[0] * 1.0, Math.atan2(u[0], u[1]));
  // the cupboard is built by hiddenStair() as the movable door of Jorge's
  // stair (F4); the weighted wheel stands beside it (claim_002688) and works
  // the mechanism from above
  const HS = HIDDEN_STAIR, tv = [Math.cos(HS.toHall), Math.sin(HS.toHall)], side = [tv[1], -tv[0]];
  const cupF = [HS.c[0] + tv[0] * (HS.rIn + HS.th + 0.3), HS.c[1] + tv[1] * (HS.rIn + HS.th + 0.3)];
  const wh = [cupF[0] + side[0] * 1.35 - tv[0] * 0.2, cupF[1] + side[1] * 1.35 - tv[1] * 0.2];
  const ry = Math.atan2(tv[0], tv[1]);
  const wheel = cyl(0.42, 0.42, 0.08, 18, {}); wheel.rotateX(Math.PI / 2); wheel.rotateY(ry); wheel.translate(wh[0], y + 1.4, wh[1]);
  b.add('iron', wheel, { collide: false });
  b.add('iron', box(0.02, 0.8, 0.02, { x: wh[0] + 0.3, y: y + 0.55, z: wh[1] }), { collide: false });
  b.add('iron', box(0.18, 0.26, 0.18, { x: wh[0] + 0.3, y: y + 0.3, z: wh[1] }), { collide: false });
  F.oilLamp(b, c[0] - 0.5, y + 0.86, c[1] + 0.2, emit);
  interact({ id: 'finis-africae', pos: [c[0], y + 1.2, c[1]], radius: 3, label: 'The finis Africae' });
  interact({ id: 'poetics', pos: [c[0] + 0.2, y + 1.1, c[1] - 0.1], radius: 1.5, label: 'A worn volume: Arabic, Syriac, Latin — and a headless Greek text' });
}

// ----------------------------------------------------------------------
// F4: Jorge's secret stair. "A stair hidden in the wall, parallel to the
// spiral, climbing from the ossuary straight to the blind room"
// (claim_002629 con_000562 H, con_001155 H; "very great wall thickness
// between the kitchen and the S tower" con_000080 H). At the top a door
// behind the finis Africae cupboard (claim_002686 con_000530 H), a weighted
// wheel beside it works the mechanism from above, a plate below
// (claim_002685); one mechanism opens both passages (claim_002632). Only
// Jorge knew it (con_000002 H) — so it is CLOSED by default. Opened by the
// cupboard or by the plaque on the ossuary's blind wall ('altar'-style
// toggle in main.js act()).
// RECON: newel stair (clear radius 1.1 m) in a round pier engaged in the
// S.hall|S.T4 wall; at the foot a short dog-leg passage to the blind wall of
// squared stones on the left of the ossuary passage (claim_002619/2620).
function hiddenStair(b, M, ctx, y, emit, interact) {
  const HS = HIDDEN_STAIR, cF = HS.c;
  const W = p => [p[0] + A.x, p[1] + A.z];            // frame → world
  const top = y, bot = HS.bot, rIn = HS.rIn, th = HS.th, rC = rIn + th / 2, rOut = rIn + th;
  const aTop = HS.toHall, aLow = Math.PI / 2;           // door headings: into the hall, south to the passage
  const tv = [Math.cos(aTop), Math.sin(aTop)];
  const pol = (r, a) => [cF[0] + r * Math.cos(a), cF[1] + r * Math.sin(a)];
  const dAng = (a, b2) => Math.abs(Math.atan2(Math.sin(a - b2), Math.cos(a - b2)));
  // ---- the pier: 20 wall segments, doorways cut at the top and the foot ----
  const n = 20, wallTop = y + 3.6;
  for (let i = 0; i < n; i++) {
    const a0 = aTop + (i - 0.5) * 2 * Math.PI / n, a1 = a0 + 2 * Math.PI / n, am = (a0 + a1) / 2;
    let segs = [[bot - 0.3, wallTop]];
    const cut = (y0c, y1c) => { segs = segs.flatMap(([u, v]) => [[u, Math.min(v, y0c)], [Math.max(u, y1c), v]]).filter(([u, v]) => v - u > 0.05); };
    if (dAng(am, aTop) < 0.45) cut(top, top + 2.3);
    if (dAng(am, aLow) < 0.45) cut(bot, bot + 2.1);
    for (const [u, v] of segs) b.add('aedIn', wall(pol(rC, a0), pol(rC, a1), u, v, th + 0.02));
  }
  b.add('plaster', prism(Array.from({ length: n }, (_, i) => pol(rOut, i * 2 * Math.PI / n)), wallTop, wallTop + 0.3), { collide: false });
  // ---- the newel stair: from beside the foot door up to beside the top door ----
  const a0 = aLow + 0.5, aEnd0 = aTop - 0.35;
  let span = aEnd0 - a0; while (span < 0) span += 2 * Math.PI;
  const turns = (span + 2 * Math.PI * Math.round(((top - bot) / 2.4 * 2 * Math.PI - span) / (2 * Math.PI))) / (2 * Math.PI);
  const sp = spiral(cF[0], cF[1], 0.2, rIn - 0.02, bot, top, a0, turns, { stepH: 0.21 });
  b.add('aedIn', sp.geo, { collide: false });
  b.collider(sp.ramp, 'stone');
  // landings (colliding): a sector at the top in front of the door, the foot floor
  const sector = (r, aa, ab, k = 10) => [[cF[0], cF[1]], ...Array.from({ length: k + 1 }, (_, i) => pol(r, aa + (ab - aa) * i / k))];
  b.add('terracotta', prism(sector(rIn + 0.02, aEnd0 - 0.02, aTop + 0.5), top - 0.12, top));
  b.add('flag', prism(Array.from({ length: n }, (_, i) => pol(rIn + 0.05, i * 2 * Math.PI / n)), bot - 0.3, bot));
  // ---- the foot: a dog-leg passage, south then east to the ossuary ----
  const hw = 0.55, wt = 0.4, hP = 2.1, zP = HS.zPass, xT = HS.xT;   // xT: inner face of the ossuary wall
  const x0 = cF[0] - hw, x1 = cF[0] + hw, zA = cF[1] + rIn * 0.6;
  const rect = (xa, xb, za, zb) => [[xa, za], [xb, za], [xb, zb], [xa, zb]];
  b.add('flag', prism(rect(x0, x1, zA, zP + hw), bot - 0.3, bot));
  b.add('flag', prism(rect(x0, xT, zP - hw, zP + hw), bot - 0.3, bot));
  b.add('damp', wall([x0 - wt / 2, cF[1] + rIn * 0.7], [x0 - wt / 2, zP + hw + wt], bot - 0.3, bot + hP, wt));   // west
  b.add('damp', wall([x1 + wt / 2, cF[1] + rIn * 0.7], [x1 + wt / 2, zP - hw - wt / 2], bot - 0.3, bot + hP, wt)); // east of leg 1
  b.add('damp', wall([x1, zP - hw - wt / 2], [xT - 0.7, zP - hw - wt / 2], bot - 0.3, bot + hP, wt));               // north of leg 2
  b.add('damp', wall([x0 - wt, zP + hw + wt / 2], [xT - 0.7, zP + hw + wt / 2], bot - 0.3, bot + hP, wt));          // south of leg 2
  b.add('damp', prism(rect(x0 - wt, x1 + wt, cF[1] + rIn * 0.5, zP + hw + wt), bot + hP, bot + hP + 0.3), { collide: false });
  b.add('damp', prism(rect(x1, xT - 0.35, zP - hw - wt, zP + hw + wt), bot + hP, bot + hP + 0.3), { collide: false });
  // ---- the cupboard-door: a heavy oak press over the upper doorway ----
  const sideX = [tv[1], -tv[0]];
  const back = rOut + 0.02;
  const hingeF = [cF[0] + tv[0] * back - sideX[0] * 0.75, cF[1] + tv[1] * back - sideX[1] * 0.75];
  const cupGroup = new THREE.Group();
  const hw2 = W(hingeF); cupGroup.position.set(hw2[0], top, hw2[1]);
  cupGroup.rotation.y = Math.atan2(tv[0], tv[1]);          // local +z → into the room, +x → sideX
  const pivot = new THREE.Group(); cupGroup.add(pivot);
  const cupGeo = box(1.5, 2.3, 0.55, { x: 0.75, z: 0.275 });
  const cup = new THREE.Mesh(cupGeo, M.woodDark); cup.castShadow = cup.receiveShadow = true;
  const shelfGeo = merge([0.45, 1.05, 1.65].map(yy => box(1.36, 0.05, 0.08, { x: 0.75, y: yy, z: 0.56 })).concat([box(0.05, 2.1, 0.08, { x: 0.75, y: 0.1, z: 0.56 })]));
  const trim = new THREE.Mesh(shelfGeo, M.wood);
  const booksGeo = merge([0.5, 1.1, 1.7].map(yy => box(1.3, 0.34, 0.2, { x: 0.75, y: yy, z: 0.46 })));
  const books = new THREE.Mesh(booksGeo, M.books[1]);
  pivot.add(cup, trim, books);
  ctx.scene.add(cupGroup);
  const cupCollider = ctx.addDynamic(pivot, cupGeo);
  // ---- the blind wall of great squared stones with the worn plaque: the
  // lower concealed door, flush with the ossuary wall; it sinks when opened ----
  const sealF = [xT - 0.15, zP], sw = W(sealF);
  const sealGroup = new THREE.Group(); sealGroup.position.set(sw[0], bot, sw[1]); ctx.scene.add(sealGroup);
  const sealGeo = box(0.3, 1.95, 1.35, { y: 0 });
  const sealMesh = new THREE.Mesh(sealGeo, M.aedIn); sealMesh.castShadow = sealMesh.receiveShadow = true;
  const plaque = new THREE.Mesh(box(0.05, 0.42, 0.62, { x: 0.17, y: 1.15 }), M.bronze);
  sealMesh.add(plaque); sealGroup.add(sealMesh);
  const sealCollider = ctx.addDynamic(sealMesh, sealGeo);
  // ---- state: closed by default; opens the cupboard and sinks the slab ----
  const state = { open: 0, target: 0, pivot, cupCollider, sealCollider, sealMesh,
    text: { open: 'Something gives behind the stone: the cupboard swings out from the wall, the blind wall below sinks. A narrow stair winds down in the thickness of the wall.', close: 'The mechanism turns back: cupboard and blind wall close the secret stair again.' } };
  state.update = dt => {
    state.open = THREE.MathUtils.damp(state.open, state.target, 1.8, dt);
    pivot.rotation.y = -state.open * 1.45;
    sealMesh.position.y = -state.open * 2.05;
    cupCollider.enabled = state.open < 0.4;
    sealCollider.enabled = state.open < 0.4;
  };
  ctx.onUpdate(state.update);
  ctx.anchors.hiddenStair = { state, seal: sw, zPass: zP, xT, frame: [A.x, A.z] };
  const cupFront = [cF[0] + tv[0] * (back + 0.9), cF[1] + tv[1] * (back + 0.9)];
  interact({ id: 'finis-cupboard', pos: [cupFront[0], top + 1.2, cupFront[1]], radius: 2.2, label: 'A heavy cupboard against the far wall: behind it, a draught of cold air', altar: state });
  // waypoints for the audit route (world): room → door → landing → foot → passage → ossuary
  state.route = { top: W(cupFront), door: W([cF[0] + tv[0] * (rIn - 0.3), cF[1] + tv[1] * (rIn - 0.3)]), a0, turns, c: W(cF), bot, topY: top };
  void emit;
  return state;
}

export { rot };
