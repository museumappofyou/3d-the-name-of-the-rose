import * as THREE from 'three';
import { model, cloneSkinned } from '../../core/assets.js';
import { buildHabit, woolTextures, collarY } from './habit.js';

// ----------------------------------------------------------------------
// The inhabitants. Each person is a skinned character on the 66-joint
// Mesh2Motion / Quaternius skeleton:
//   head, neck and hands — photoscanned CC0 men by elbolilloduro (six
//     faces of different ages, assets/models/head_*.glb); their modern
//     clothes are never drawn;
//   the habit, tunic, hood, girdle and shoes — built to fit the skeleton
//     and skinned to it (./habit.js);
//   motion — recorded CC0 clips (Quaternius Universal Animation Library and
//     CMU motion capture as retargeted by Mesh2Motion, assets/models/
//     human_anims.glb): a formal walk for the brothers, a working walk,
//     standing with folded arms, sitting, kneeling, carrying, harvesting,
//     chopping, a nod for the bow. Clips cross-fade; each person starts at
//     their own phase and plays a little faster or slower.
// See docs/assets/MODEL_SOURCES.md for authors, licences and conversion.
//
// API (used by ../people.js):
//   loadFigures()                       -> Promise (assets ready)
//   makeFigure(kind, seed)              -> THREE.Group (hidden until loaded)
//   setPose(g, pose, phase, t)          choose the motion for a pose
//   updateFigure(g, dt)                 advance its motion (near figures only)
//   sackMesh()                          a sack for carriers
// ----------------------------------------------------------------------

const HEADS = { male_5: 'mid', male_6: 'mid', male_10: 'mid', male_15: 'young', male_32: 'old', police_male: 'young' };
const KIND_STYLE = { monk: 'monk', abbot: 'abbot', novice: 'novice', servant: 'servant', herd: 'herd', peasant: 'peasant' };
const KEEP = /^(head|head_leaf|neck_01|hand_[lr]|(index|middle|pinky|ring|thumb)_0\d_[lr]|(index|middle|pinky|ring|thumb)_04_leaf_[lr])$/;

// kneeling legs with an upright, recollected upper body (hands folded in
// the sleeves), for prayer in choir; seated legs with working hands
const LOWER = /^(root|pelvis|thigh_[lr]|calf_[lr]|foot_[lr]|ball_[lr]|ball_leaf_[lr])$/;
// (seated: bowed over the bowl — only the head from the nod; hands in the
// sleeves for the lessons)
// [base clip, second clip, bones taken from the second (default: all but the legs)]
const COMPOSITE = { kneelPray: ['kneelWork', 'foldArms'], kneelPray2: ['kneel', 'foldArms'], sitBow: ['sit', 'nod', /^(neck_01|head)$/], sitHands: ['sit', 'foldArms'] };

// the motion for each pose; brothers walk and stand differently from lay folk
const MOTION = {
  brother: { walk: 'walkFormal', carry: 'walkCarry', stand: ['foldArms', 'foldArms', 'idleSubtle', 'foldArms'], bow: 'nod', pray: ['foldArms', 'foldArms', 'foldArms', 'listen'], kneel: 'kneelPray2', prostrate: 'kneelPray2', sit: ['sitHands', 'sit', 'sitHands'], dine: ['sit', 'sitBow', 'sitHands', 'sit', 'sitBow'], write: 'sitTalk', knead: 'interact', stir: 'interact', fodder: 'interact', sweep: 'harvest', talk: 'talk', read: 'talk', hammer: 'idle' },
  lay: { walk: 'walk', carry: 'walkCarry', stand: ['idle', 'idleSubtle', 'talk', 'listen'], bow: 'nod', pray: 'foldArms', kneel: 'kneelPray2', prostrate: 'kneelPray2', sit: 'sit', dine: ['sit', 'sitBow', 'sit'], write: 'sitTalk', knead: 'pickUp', stir: 'interact', fodder: 'interact', sweep: 'harvest', talk: 'talk', read: 'talk', hammer: 'idleSubtle' },
};
// what each working pose holds, and whether a procedural stroke is laid over
// its recorded motion (the clip library has no smith's hammering: the right
// arm is raised and brought down on the anvil in a rhythm over a standing
// clip, the left holds the tongs on the work)
const WORK = { hammer: { right: 'hammer', left: 'tongs', stroke: true }, sweep: { right: 'fork' }, stir: { right: 'paddle' } };

let LIB = null, READY = null;
const waiting = [];
export function loadFigures() {
  if (READY) return READY;
  READY = Promise.all([model('human_anims'), ...Object.keys(HEADS).map(h => model('head_' + h))]).then(([anims, ...heads]) => {
    if (!anims) throw new Error('no human_anims');
    const clips = {};
    for (const c of anims.animations) clips[c.name] = c;
    // composites: the legs of one recording under the upper body of another
    for (const [name, [lower, upper, pick]] of Object.entries(COMPOSITE)) {
      const lo = clips[lower], up = clips[upper]; if (!lo || !up) continue;
      const isLow = pick ? t => !pick.test(t.name.split('.')[0]) : t => LOWER.test(t.name.split('.')[0]);
      const tracks = [...lo.tracks.filter(isLow), ...up.tracks.filter(t => !isLow(t))].map(t => t.clone());
      clips[name] = new THREE.AnimationClip(name, Math.max(lo.duration, up.duration), tracks);
    }
    const variants = {};
    Object.keys(HEADS).forEach((id, i) => { const g = heads[i]; if (g) variants[id] = prepareVariant(id, g); });
    LIB = { clips, variants, templates: new Map(), mats: materials() };
    for (const w of waiting.splice(0)) dress(w);
    return LIB;
  }).catch(e => { console.warn('[people] could not load the cast', e); return null; });
  return READY;
}

function materials() {
  const W = woolTextures();
  const map = W.map.clone(), normal = W.normal.clone();
  map.repeat.set(3, 3); normal.repeat.set(3, 3); map.needsUpdate = normal.needsUpdate = true;
  // wool: a soft grazing sheen along folds and edges (so black cloth shows
  // its form against snow or lamplight instead of reading as a flat hole)
  const cloth = new THREE.MeshPhysicalMaterial({ vertexColors: true, map, normalMap: normal, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.93, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.38,
    sheen: 1, sheenRoughness: 0.6, sheenColor: new THREE.Color(0x35322e) });
  return { cloth, sack: new THREE.MeshStandardMaterial({ color: 0x6a5a44, map, roughness: 1 }) };
}

// A scanned character: its skeleton's bind pose (for fitting the habit) and
// the head / neck / hands cut out of its mesh
function prepareVariant(id, gltf) {
  let skinned = null;
  gltf.scene.traverse(o => { if (o.isSkinnedMesh && !skinned) skinned = o; });
  const skel = skinned.skeleton;
  const J = {};
  skel.bones.forEach((b, i) => { const m = new THREE.Matrix4().copy(skel.boneInverses[i]).invert(); J[b.name] = { index: i, p: new THREE.Vector3().setFromMatrixPosition(m) }; });
  // keep the triangles all of whose corners belong mostly to head, neck or hands
  const g = skinned.geometry, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, idx = g.index;
  const keepV = new Uint8Array(si.count);
  for (let v = 0; v < si.count; v++) {
    let best = 0, bi = 0; for (let k = 0; k < 4; k++) { const w = sw.getComponent(v, k); if (w > best) { best = w; bi = si.getComponent(v, k); } }
    // head, hands, and the neck down to the collar line
    const nm = skel.bones[bi].name;
    keepV[v] = KEEP.test(nm) ? 1 : 0;
  }
  const tri = [];
  for (let t = 0; t < idx.count; t += 3) { const a = idx.getX(t), b = idx.getX(t + 1), c = idx.getX(t + 2); if (keepV[a] && keepV[b] && keepV[c]) tri.push(a, b, c); }
  g.userData.skinImage = skinned.material.map?.image;
  // the scan's own crown and chin (the hood is fitted to them, not to the
  // joints, whose height above the skull differs from scan to scan)
  {
    const pos = g.attributes.position, HB = new Set([J.head.index, J.head_leaf?.index].filter(i => i != null));
    let top = -1e9, chin = 1e9;
    for (let v = 0; v < si.count; v++) {
      let best = 0, bi = 0; for (let k = 0; k < 4; k++) { const w = sw.getComponent(v, k); if (w > best) { best = w; bi = si.getComponent(v, k); } }
      if (!HB.has(bi)) continue;
      const y = pos.getY(v), z = pos.getZ(v);
      top = Math.max(top, y);
      if (z > J.head.p.z + 0.05 && Math.abs(pos.getX(v)) < 0.03) chin = Math.min(chin, y);
    }
    J.crown = { index: J.head.index, p: new THREE.Vector3(0, top, J.head.p.z) };
    J.chin = { index: J.head.index, p: new THREE.Vector3(0, chin < 1e8 ? chin : J.head.p.y - 0.03, J.head.p.z + 0.08) };
  }
  const kept = nape(g, tri, J);
  const skin = addNeck(g, kept, J, keepV, skel);
  const smat = skinned.material.clone();
  smat.side = THREE.FrontSide; smat.roughness = 0.7; smat.metalness = 0; smat.envMapIntensity = 0.22; smat.vertexColors = true;
  if (smat.map) smat.map.anisotropy = 4;
  const smatT = tonsured(smat, g, tri, J, skin);
  return { id, age: HEADS[id], gltf, skinned, J, skin, smat, smatT, habits: new Map() };
}

// The nape of a scan still samples its modern collar (grey, blue or red
// cloth): drop the neck triangles whose texel is not skin (the generated
// neck of addNeck covers that band)
function nape(g, tri, J) {
  const img = g.userData.skinImage; if (!img) return tri;
  const uv = g.attributes.uv, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
  const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
  const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
  const D = cx.getImageData(0, 0, img.width, img.height).data;
  const ni = J.neck_01.index;
  const dom = v => { let best = -1, bi = 0; for (let k = 0; k < 4; k++) { const w = sw.getComponent(v, k); if (w > best) { best = w; bi = si.getComponent(v, k); } } return bi; };
  const out = [];
  for (let t = 0; t < tri.length; t += 3) {
    const a = tri[t], b = tri[t + 1], c = tri[t + 2];
    if (dom(a) === ni || dom(b) === ni || dom(c) === ni) {
      const u = (uv.getX(a) + uv.getX(b) + uv.getX(c)) / 3, v = (uv.getY(a) + uv.getY(b) + uv.getY(c)) / 3;
      const px = Math.min(img.width - 1, Math.max(0, Math.round(u * img.width))), py = Math.min(img.height - 1, Math.max(0, Math.round(v * img.height)));
      const i = (py * img.width + px) * 4, r = D[i], gg = D[i + 1], bb = D[i + 2];
      if (!(r > 95 && r > gg + 10 && gg >= bb - 6)) continue;
    }
    out.push(a, b, c);
  }
  return out;
}

// The corona of a Benedictine of 1327: the crown shaved, a ring of hair left
// round the head. The scans wear modern haircuts, so a copy of each head's
// texture is painted over the crown in the tone of its own brow (monks,
// novices and the abbot; servants and peasants keep their hair).
function tonsured(smat, g, tri, J, skin) {
  const img = smat.map?.image; if (!img) return smat;
  const pos = g.attributes.position, uv = g.attributes.uv, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
  // the scalp is weighted to the head or to its tip bone (head_leaf)
  const HB = new Set([J.head.index, J.head_leaf?.index].filter(i => i != null));
  const dom = v => { let best = -1, bi = 0; for (let k = 0; k < 4; k++) { const w = sw.getComponent(v, k); if (w > best) { best = w; bi = si.getComponent(v, k); } } return bi; };
  // the crown: the highest point of the head
  let top = -1;
  for (const v of new Set(tri)) if (HB.has(dom(v)) && (top < 0 || pos.getY(v) > pos.getY(top))) top = v;
  if (top < 0) return smat;
  // the tonsure sits on the vertex of the skull, over the head joint and a
  // little behind it (the highest point of a scan is often the brow)
  const ty = pos.getY(top), tx = J.head.p.x, tz = J.head.p.z - 0.015;
  const W = img.width, H = img.height;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
  const id = cx.getImageData(0, 0, W, H), D = id.data;
  // the skin tone: the texel the neck was given (the back of the hand)
  const su = skin.attributes.uv.getX(skin.attributes.uv.count - 1), sv = skin.attributes.uv.getY(skin.attributes.uv.count - 1);
  let cr = 0, cg = 0, cb = 0, cn = 0;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const px = Math.min(W - 1, Math.max(0, Math.round(su * W) + dx)), py = Math.min(H - 1, Math.max(0, Math.round(sv * H) + dy)), i = (py * W + px) * 4;
    cr += D[i]; cg += D[i + 1]; cb += D[i + 2]; cn++;
  }
  cr = cr / cn * 1.03; cg /= cn; cb = cb / cn * 0.97;   // a shaven scalp: a shade paler and pinker than the hand
  // per texel: the 3D point it maps to, its distance from the crown (the
  // disc about 12 cm across seen from above), a soft rim into the hair ring
  const R0 = 0.05, R1 = 0.066;
  let painted = 0;
  for (let t = 0; t < tri.length; t += 3) {
    const a = tri[t], b = tri[t + 1], c = tri[t + 2];
    if (!HB.has(dom(a))) continue;
    const near = [a, b, c].some(v => pos.getY(v) > ty - 0.08 && Math.hypot(pos.getX(v) - tx, pos.getZ(v) - tz) < R1 * 1.8);
    if (!near) continue;
    const ax = uv.getX(a) * W, ay = uv.getY(a) * H, bx = uv.getX(b) * W, by = uv.getY(b) * H, qx = uv.getX(c) * W, qy = uv.getY(c) * H;
    const den = (by - qy) * (ax - qx) + (qx - bx) * (ay - qy); if (Math.abs(den) < 1e-6) continue;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx, qx)) - 1), x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx, qx)) + 1);
    const y0 = Math.max(0, Math.floor(Math.min(ay, by, qy)) - 1), y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by, qy)) + 1);
    for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
      const X = px + 0.5, Y = py + 0.5;
      const l1 = ((by - qy) * (X - qx) + (qx - bx) * (Y - qy)) / den, l2 = ((qy - ay) * (X - qx) + (ax - qx) * (Y - qy)) / den, l3 = 1 - l1 - l2;
      if (l1 < -0.02 || l2 < -0.02 || l3 < -0.02) continue;
      const X3 = l1 * pos.getX(a) + l2 * pos.getX(b) + l3 * pos.getX(c), Y3 = l1 * pos.getY(a) + l2 * pos.getY(b) + l3 * pos.getY(c), Z3 = l1 * pos.getZ(a) + l2 * pos.getZ(b) + l3 * pos.getZ(c);
      if (Y3 < ty - 0.05) continue;
      const d = Math.hypot(X3 - tx, (Z3 - tz) * 0.92);
      const k = d < R0 ? 1 : d > R1 ? 0 : 1 - (d - R0) / (R1 - R0);
      if (k <= 0) continue;
      const i = (py * W + px) * 4, n = 0.94 + 0.06 * Math.random();
      D[i] += (cr * n - D[i]) * k; D[i + 1] += (cg * n - D[i + 1]) * k; D[i + 2] += (cb * n - D[i + 2]) * k;
      painted++;
    }
  }
  cx.putImageData(id, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = smat.map.colorSpace; tex.flipY = smat.map.flipY; tex.wrapS = smat.map.wrapS; tex.wrapT = smat.map.wrapT; tex.anisotropy = 4;
  const m = smat.clone(); m.map = tex;
  if (!painted) console.warn('[people] no crown found for a head');
  return m;
}

// The scans end at the jaw (their necks belong to modern collars): add a
// neck of the same skin, sampled from the texel of the hand's back, from
// under the jaw down into the collar.
function addNeck(g, tri, J, keepV, skel) {
  const pos = g.attributes.position, uv = g.attributes.uv, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
  // a skin texel: the uv of a vertex on the back of the left hand
  // pick, among the hand's vertices, one whose texel really is skin
  let su = 0.5, sv = 0.5;
  const hi = J.hand_l.index, img = g.userData.skinImage;
  if (img) {
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
    const data = cx.getImageData(0, 0, img.width, img.height).data, cand = [];
    for (let v = 0; v < pos.count; v++) {
      if (!keepV[v] || si.getX(v) !== hi || sw.getX(v) < 0.8) continue;
      const px = Math.min(img.width - 1, Math.max(0, Math.round(uv.getX(v) * img.width))), py = Math.min(img.height - 1, Math.max(0, Math.round(uv.getY(v) * img.height)));
      const i = (py * img.width + px) * 4, r = data[i], gg = data[i + 1], b = data[i + 2];
      if (r > 110 && r > gg + 12 && gg > b) cand.push([r + gg + b, uv.getX(v), uv.getY(v)]);
    }
    cand.sort((a, b) => a[0] - b[0]);
    if (cand.length) { const c = cand[cand.length >> 1]; su = c[1]; sv = c[2]; }
  }
  const P = [], U = [], I = [], W = [], idx = [];
  const n0 = pos.count, RC = 14, RS = 6;
  // from just under the habit's collar (collarY) to under the jaw: only the
  // top few centimetres show above the cloth
  const y0 = collarY(J) - 0.04, y1 = J.head.p.y + 0.045, z0 = J.neck_01.p.z + 0.018, z1 = J.head.p.z + 0.004;
  for (let i = 0; i < RS; i++) {
    const t = i / (RS - 1), y = y0 + (y1 - y0) * t, zc = z0 + (z1 - z0) * t, r = 0.066 - 0.008 * Math.sin(t * Math.PI) - 0.01 * t * t;
    for (let j = 0; j < RC; j++) {
      const a = j / RC * Math.PI * 2;
      P.push(Math.sin(a) * r, y, zc + Math.cos(a) * r * 1.05); U.push(su, sv);
      I.push(J.neck_01.index, J.head.index, J.spine_03.index, 0); W.push(Math.max(0, 0.75 - 0.75 * t * t), Math.min(1, 0.15 + 0.85 * t * t), Math.max(0, 0.1 - 0.1 * t), 0);
    }
  }
  for (let i = 0; i < RS - 1; i++) for (let j = 0; j < RC; j++) {
    const j1 = (j + 1) % RC, A = n0 + i * RC + j, Bq = n0 + i * RC + j1, C = n0 + (i + 1) * RC + j, D = n0 + (i + 1) * RC + j1;
    idx.push(A, C, Bq, Bq, C, D);
  }
  // (attributes may be interleaved: copy element by element)
  const cat = (att, extra, T) => { const n = att.count * att.itemSize, a = new T(n + extra.length); for (let i = 0; i < att.count; i++) for (let k = 0; k < att.itemSize; k++) a[i * att.itemSize + k] = att.getComponent(i, k); a.set(extra, n); return a; };
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(cat(pos, P, Float32Array), 3));
  out.setAttribute('uv', new THREE.BufferAttribute(cat(uv, U, Float32Array), 2));
  out.setAttribute('skinIndex', new THREE.BufferAttribute(cat(si, I, Uint16Array), 4));
  out.setAttribute('skinWeight', new THREE.BufferAttribute(cat(sw, W, Float32Array), 4));
  // shade: the scan as scanned; the neck darker where the collar shadows it
  // and toward its sides, so it sits in the cloth instead of glowing above it
  const colr = new Float32Array((n0 + P.length / 3) * 3).fill(1);
  for (let i = 0; i < RS; i++) for (let j = 0; j < RC; j++) {
    const t = i / (RS - 1), a = j / RC * Math.PI * 2, k = (0.5 + 0.5 * Math.pow(t, 0.7)) * (0.86 + 0.14 * Math.max(0, Math.cos(a)));
    const v = (n0 + i * RC + j) * 3; colr[v] = k; colr[v + 1] = k * 0.97; colr[v + 2] = k * 0.95;
  }
  out.setAttribute('color', new THREE.BufferAttribute(colr, 3));
  out.setIndex([...tri, ...idx]);
  out.computeVertexNormals();
  void skel;
  return out;
}

// one template per face × dress, shared by every instance of it
function template(vid, style) {
  const key = vid + '/' + style;
  if (LIB.templates.has(key)) return LIB.templates.get(key);
  const V = LIB.variants[vid];
  const root = V.gltf.scene.clone(true);
  // rebind: find our copy of the scanned mesh, give it the cut geometry
  let sm = null; root.traverse(o => { if (o.isSkinnedMesh && !sm) sm = o; });
  const bones = V.skinned.skeleton.bones.map(b => root.getObjectByName(b.name));
  const skel = new THREE.Skeleton(bones, V.skinned.skeleton.boneInverses);
  sm.geometry = V.skin; sm.material = /^(monk|abbot|novice)$/.test(style) ? V.smatT : V.smat; sm.bind(skel, V.skinned.bindMatrix);
  sm.castShadow = true; sm.receiveShadow = true; sm.frustumCulled = false; sm.name = 'skin';
  const hood = style === 'monk' ? ['monk', 'monkBare'] : [style];
  for (const st of hood) {
    let geo = V.habits.get(st);
    if (!geo) { geo = buildHabit(V.J, st, vid.length * 7 + st.length); V.habits.set(st, geo); }
    const hm = new THREE.SkinnedMesh(geo, LIB.mats.cloth);
    hm.name = st === 'monkBare' ? 'habitBare' : 'habit';
    hm.castShadow = true; hm.receiveShadow = true; hm.frustumCulled = false;
    sm.parent.add(hm); hm.bind(skel, V.skinned.bindMatrix);
    if (st === 'monkBare') hm.visible = false;
  }
  LIB.templates.set(key, root);
  return root;
}

function rnd(seed) { let a = (seed * 1831 + 13) >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ----------------------------------------------------------------------
export function makeFigure(kind, seed, opts = {}) {
  const g = new THREE.Group();
  g.name = 'person:' + kind;
  const r = rnd(seed);
  // stature: brothers 1.62–1.78 m, novices smaller (BOOK #000635)
  const scale = kind === 'novice' ? 0.86 + r() * 0.05 : 0.9 + r() * 0.09;
  g.userData = { kind, seed, h: 1.8 * scale, scale, r, opts, pose: null, clip: null, speed: 0.9 + r() * 0.2, lay: !/monk|abbot|novice/.test(kind) };
  loadFigures();
  if (LIB) dress(g); else waiting.push(g);
  return g;
}

function dress(g) {
  const U = g.userData, r = U.r;
  const ids = Object.keys(LIB.variants);
  if (!ids.length) return;
  const byAge = a => ids.filter(i => LIB.variants[i].age === a);
  let pool = U.kind === 'novice' ? byAge('young') : U.kind === 'abbot' ? byAge('old') : U.kind === 'monk' ? ids : ids.filter(i => LIB.variants[i].age !== 'old');
  if (!pool.length) pool = ids;
  // a named person's own face; otherwise the faces are dealt round the pool
  const vid = U.opts.head && LIB.variants[U.opts.head] ? U.opts.head : U.opts.deal != null ? pool[U.opts.deal % pool.length] : pool[Math.floor(r() * pool.length)];
  U.head = vid;
  const body = cloneSkinned(template(vid, KIND_STYLE[U.kind] || 'monk'));
  body.scale.setScalar(U.scale);
  body.rotation.y = 0;   // the skeleton faces +z, as the old figures did
  g.add(body);
  U.body = body;
  U.mixer = new THREE.AnimationMixer(body);
  U.actions = new Map();
  U.habit = body.getObjectByName('habit'); U.habitBare = body.getObjectByName('habitBare');
  // each person his own complexion and his own wool: a slightly different
  // skin tone, and habits dyed and worn to different blacks and browns
  const skin = body.getObjectByName('skin');
  if (skin) { skin.material = skin.material.clone(); U.skinMat = skin.material; U.skinBase = new THREE.Color(1, 0.96 - r() * 0.05, 0.92 - r() * 0.08).multiplyScalar(0.8 + r() * 0.12); skin.material.color.copy(U.skinBase); }
  const cloth = LIB.mats.cloth.clone(), wear = 0.86 + r() * 0.26;
  cloth.color.setRGB(wear * (1 + (r() - 0.5) * 0.08), wear, wear * (1 - r() * 0.06));
  for (const h of [U.habit, U.habitBare]) if (h) h.material = cloth;
  // the scanned heads are a little small for the fuller cut of the habit
  const hb = body.getObjectByName('head'); if (hb) hb.scale.setScalar(1.015 + r() * 0.02);
  U.bones = { spine: body.getObjectByName('spine_03'), hand: body.getObjectByName('hand_r'), handL: body.getObjectByName('hand_l'), head: body.getObjectByName('head'),
    armR: body.getObjectByName('upperarm_r'), armL: body.getObjectByName('upperarm_l'), foreR: body.getObjectByName('lowerarm_r'), root: body };
  // a few brothers walk about with their hoods down
  if (U.habitBare && !U.opts.hood && r() < 0.45) { U.habit.visible = false; U.habitBare.visible = true; }
  U.fixedHood = /^(monk|herd|peasant)$/.test(U.habit?.geometry.userData.style || '');   // dresses without a second cowl
  U.hoodUp = null; setHood(g, U.habitBare ? U.habit.visible : U.fixedHood);
  if (U.pending) { const [p, ph, t] = U.pending; U.pending = null; setPose(g, p, ph, t); }
}

// hoods up in the refectory and at Compline (BOOK, D1 AKŞAM)
export function setHood(g, up) {
  const U = g.userData;
  if (!U.habitBare) up = !!U.fixedHood;
  // a raised hood shades the face it frames
  if (U.skinMat && U.hoodUp !== up) { U.skinMat.color.copy(U.skinBase).multiplyScalar(up ? 0.7 : 1); }
  U.hoodUp = up;
  if (!U.habitBare) return;
  U.habit.visible = up; U.habitBare.visible = !up;
}

function action(U, name) {
  let a = U.actions.get(name);
  if (!a) {
    const clip = LIB.clips[name]; if (!clip) return null;
    a = U.mixer.clipAction(clip); U.actions.set(name, a);
  }
  return a;
}

export function setPose(g, pose, phase = 0, t = 0) {
  const U = g.userData;
  if (!U.mixer) { U.pending = [pose, phase, t]; return; }
  if (pose === U.pose) return;
  U.pose = pose;
  const M = MOTION[U.lay ? 'lay' : 'brother'];
  let name = M[pose] || M.stand;
  if (Array.isArray(name)) name = name[Math.floor(U.r() * name.length)];
  if (name === U.clip) return;
  const a = action(U, name); if (!a) return;
  const prev = U.clip ? U.actions.get(U.clip) : null;
  a.reset(); a.setEffectiveTimeScale(U.speed * (pose === 'bow' ? 0.5 : 1)); a.setEffectiveWeight(1);
  a.time = (phase % 1) * a.getClip().duration;
  a.play();
  if (prev && prev !== a) prev.crossFadeTo(a, 0.45, false);
  U.clip = name;
  U.work = WORK[pose] || null; U.stroke = U.work?.stroke ? (U.stroke ?? phase) : null;
  holdTools(U);
  U.mixer.update(0);
}

// --- tools in the hands ---------------------------------------------------
let TOOLS = null;
function toolMeshes() {
  if (TOOLS) return TOOLS;
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b5236, roughness: 0.85 }), iron = new THREE.MeshStandardMaterial({ color: 0x3a3836, roughness: 0.5, metalness: 0.7 });
  const mk = parts => { const g = new THREE.Group(); for (const [geo, m, x, y, z, rx = 0] of parts) { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.x = rx; o.castShadow = true; g.add(o); } return g; };
  // (built along the hand's grip: the handle runs along local +z out of the fist)
  TOOLS = {
    hammer: () => mk([[new THREE.CylinderGeometry(0.014, 0.016, 0.36, 6), wood, 0, 0, 0.12, Math.PI / 2], [new THREE.BoxGeometry(0.13, 0.05, 0.05), iron, -0.02, 0, 0.29]]),
    tongs: () => mk([[new THREE.BoxGeometry(0.012, 0.012, 0.46), iron, 0.01, 0, 0.18], [new THREE.BoxGeometry(0.012, 0.012, 0.46), iron, -0.01, 0, 0.18], [new THREE.BoxGeometry(0.03, 0.03, 0.06), iron, 0, 0, 0.42]]),
    fork: () => mk([[new THREE.CylinderGeometry(0.016, 0.016, 1.5, 6), wood, 0, 0, 0.3, Math.PI / 2], [new THREE.BoxGeometry(0.012, 0.16, 0.28), iron, 0, 0, 1.13]]),
    paddle: () => mk([[new THREE.CylinderGeometry(0.014, 0.014, 1.0, 6), wood, 0, 0, 0.3, Math.PI / 2], [new THREE.BoxGeometry(0.08, 0.012, 0.16), wood, 0, 0, 0.84]]),
  };
  return TOOLS;
}
// grip, in hand-bone space (bind pose: +y runs along the fingers, +z points
// forward out of the fist, the palm faces −x on the right hand and +x on the
// left): the handle leaves the closed fist forward, held a little palm-ward
const GRIP = { r: new THREE.Vector3(-0.03, 0.085, 0), l: new THREE.Vector3(0.03, 0.085, 0) };
function holdTools(U) {
  U.tools ||= {};
  for (const side of ['right', 'left']) {
    const want = U.work?.[side] || null, cur = U.tools[side];
    if (cur && cur.userData.kind !== want) { cur.visible = false; }
    if (!want) continue;
    let t = U.tools[side + ':' + want];
    if (!t) {
      t = toolMeshes()[want](); t.userData.kind = want;
      t.position.copy(side === 'right' ? GRIP.r : GRIP.l);
      t.scale.setScalar(1 / (U.scale || 1));
      (side === 'right' ? U.bones.hand : U.bones.handL)?.add(t); U.tools[side + ':' + want] = t;
    }
    t.visible = true; U.tools[side] = t;
  }
}

// the smith's stroke, laid over the standing clip after the mixer: the
// right arm swings up and forward, then down onto the anvil, about once a
// second; the left arm reaches the tongs out over the work
const _q = new THREE.Quaternion(), _qp = new THREE.Quaternion(), _qr = new THREE.Quaternion(), _ax = new THREE.Vector3();
function turn(bone, axisRoot, ang, rootQ) {
  if (!bone?.parent) return;
  bone.parent.getWorldQuaternion(_qp);
  _ax.copy(axisRoot).applyQuaternion(rootQ).normalize();
  _q.setFromAxisAngle(_ax, ang);
  bone.quaternion.premultiply(_qp.clone().invert().multiply(_q).multiply(_qp));
}
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);
function strokeLayer(U, dt) {
  const T = 1.05;
  const prev = U.stroke;
  U.stroke = (U.stroke + dt / T) % 1;
  const p = U.stroke, ease = x => x * x * (3 - 2 * x);
  // raise 0→0.62 (slow), strike 0.62→0.7 (fast), rest on the work 0.7→1
  const up = p < 0.62 ? ease(p / 0.62) : p < 0.7 ? 1 - (p - 0.62) / 0.08 : 0;
  const ang = -(0.62 + 1.25 * up);         // about the body's lateral axis: forward, up to head height
  U.bones.root.getWorldQuaternion(_qr);
  turn(U.bones.spine, X, 0.14, _qr);        // leaning over the anvil
  turn(U.bones.armR, X, ang, _qr);
  turn(U.bones.foreR, X, -0.5 * up, _qr);
  turn(U.bones.armL, X, -0.85, _qr); turn(U.bones.armL, Y, -0.35, _qr);
  return prev < 0.7 && p >= 0.7 || (p < prev && prev < 0.7);
}

// the moment in each working clip when the tool meets the work (fraction
// of the clip): the sound of a blow is played on that frame, not on a timer
const IMPACT = { chop: 0.52, harvest: 0.45, pickUp: 0.5 };
export function updateFigure(g, dt) {
  const U = g.userData;
  if (!U.mixer) return false;
  const a = U.clip && U.actions.get(U.clip), d = a?.getClip().duration || 1;
  const before = a ? (a.time % d) / d : 0;
  // (the mixer rewrites a bone only when its clip value changes, so the
  // layer's bones are put back to the clip's pose before each update, or the
  // stroke would pile up frame on frame on the stiller tracks)
  if (U.layerRest) { for (const [b, q] of U.layerRest) b.quaternion.copy(q); if (U.stroke == null) U.layerRest = null; }
  U.mixer.update(dt);
  if (U.stroke != null) {
    U.layerRest ||= new Map([U.bones.spine, U.bones.armR, U.bones.foreR, U.bones.armL].filter(Boolean).map(b => [b, new THREE.Quaternion()]));
    for (const [b, q] of U.layerRest) q.copy(b.quaternion);
    return strokeLayer(U, dt);
  }
  const f = IMPACT[U.clip]; if (f == null || !a) return false;
  const after = (a.time % d) / d;
  return (before < f && after >= f) || (after < before && (before < f || after >= f));
}

// A carried sack for the peasants at the mills
export function sackMesh() {
  const g = new THREE.SphereGeometry(0.22, 12, 9); g.scale(1, 1.25, 0.8);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y > 0.18) p.setXYZ(i, p.getX(i) * 0.4, y, p.getZ(i) * 0.4); else p.setXYZ(i, p.getX(i) * (1 + 0.05 * Math.sin(i)), y, p.getZ(i)); }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, (LIB?.mats || materials()).sack);
  m.castShadow = true; return m;
}

export function figureMaterials() { return {}; }
