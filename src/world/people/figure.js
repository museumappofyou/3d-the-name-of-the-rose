import * as THREE from 'three';
import { model, cloneSkinned } from '../../core/assets.js';
import { loweredHoodBlend } from './garmentPose.js';

// ----------------------------------------------------------------------
// The inhabitants. Each person is a whole character authored offline
// (scripts/people/): a MakeHuman body shaped by the MPFB add-on for Blender
// to a designed phenotype and face, dressed in garments fitted to that body
// (the Donitz habit with its hood up or down, or a servant's tunic, hose,
// boots and apron; all CC0 / CC BY, docs/assets/MODEL_SOURCES.md), the flesh
// under the clothes removed, skinned to one 53-bone skeleton. Named people
// have their own face; generic brothers and servants are a small designed
// set (scripts/people/cast.json), never a random face per spawn.
//
// Motion (assets/models/people/motions.glb) is one library on that
// skeleton: recorded CC0 locomotion and idles (Quaternius / CMU via
// Mesh2Motion) retargeted in Blender, and task loops authored against the
// abbey's own furniture so that their contacts hold: the quill on the leaf,
// the pelvis on the bench, knees on the stone, the paddle in the pot, the
// hammer on the iron. Tools are held where the loop was authored to hold
// them; work sounds are fired on the frame of their contact.
//
// API (used by ../people.js):
//   loadFigures()                     -> Promise (assets ready)
//   personFor(kind, key)              the designed person a generic slot shows
//   makeFigure(kind, seed, opts)      -> THREE.Group (opts.person: template id)
//   setPose(g, pose, phase, t)        choose the motion for a pose
//   updateFigure(g, dt)               advance it; returns the contact events
//   setHood(g, up)                    hood raised or lying on the back
//   sackMesh()                        a sack for carriers
// ----------------------------------------------------------------------

// the motion for each pose (a list: one is chosen per person, by seed)
const MOTION = {
  brother: { walk: 'walkFormal', carry: 'walkCarry', stand: ['standSleeves', 'standSleeves', 'idleSubtle', 'standSleeves'], bow: 'standBow', pray: ['standSleeves', 'standSleeves', 'standBow'],
    kneel: 'kneelPray', kneelBow: 'kneelBow', sit: 'sitBench', dine: 'dine', write: 'write', read: 'read', tend: 'tend',
    knead: 'knead', stir: 'stirPot', stirVat: 'stirVat', fodder: 'fork', sweep: 'sweep', hammer: 'hammer', talk: 'talk' },
  lay: { walk: 'walk', carry: 'walkCarry', stand: ['idle', 'idleSubtle', 'listen'], bow: 'nod', pray: 'standSleeves',
    kneel: 'kneelPray', kneelBow: 'kneelBow', sit: 'sitBench', dine: 'dine', write: 'write', read: 'read', tend: 'tend',
    knead: 'knead', stir: 'stirPot', stirVat: 'stirVat', fodder: 'fork', sweep: 'sweep', hammer: 'hammer', talk: 'talk' },
};
// clips whose pelvis height is set by furniture (a seat), not by the legs
const SEATED = new Set(['write', 'dine', 'sitBench', 'sitRec', 'sitTalkRec']);
// contact events: [fraction of the clip, event]; footfalls are found in the
// clips themselves (the lowest point of each foot), see footfalls()
const EVENTS = {
  write: [[0.02, 'scratch'], [0.18, 'scratch'], [0.35, 'scratch'], [0.52, 'scratch'], [0.69, 'scratch'], [0.86, 'scratch']],
  read: [[0.83, 'pageTurn']],
  knead: [[0.2, 'knead'], [0.7, 'knead']],
  sweep: [[0.1, 'sweep'], [0.6, 'sweep']],
  fork: [[0.2, 'strawRustle'], [0.68, 'strawRustle']],
  dine: [[0.19, 'spoon']],
  stirPot: [[0.5, 'stir']],
  stirVat: [[0.5, 'pour']],
};

// which designed person stands for a generic slot of each kind (stable: the
// same key always shows the same person)
const KIND_PEOPLE = {
  monk: ['monk_a', 'scribe_a'], novice: ['scribe_a'], abbot: ['monk_a'],
  servant: ['lay_cook'], herd: ['lay_cook'], peasant: ['lay_cook'],
};
function hash(s) { let a = 2166136261; for (let i = 0; i < s.length; i++) a = Math.imul(a ^ s.charCodeAt(i), 16777619); return a >>> 0; }
export function personFor(kind, key) {
  const list = (LIB && LIB.byKind[kind]) || KIND_PEOPLE[kind] || KIND_PEOPLE.monk;
  // a member of the community "monk17": the faces go round in order, so
  // neighbours at consecutive places are never the same person
  const m = /(\d+)$/.exec(String(key));
  return list[(m ? +m[1] : hash(String(key))) % list.length];
}

let LIB = null, READY = null;
const waiting = [];
export function loadFigures() {
  if (READY) return READY;
  READY = Promise.all([model('people/cast'), model('people/motions'), model('people/tasks'), fetch(new URL('../../../assets/models/people/cast.json', import.meta.url)).then(r => r.json())]).then(([cast, mot, tasks, meta]) => {
    if (!cast || !mot || !tasks) throw new Error('no cast');
    // one file holds every person, so GLTFLoader has made the shared bone
    // names unique (pelvis_1, spine_01_2 …): give each its canonical name back
    const names = new Set(); mot.scene.traverse(o => { if (o.name) names.add(o.name); });
    cast.scene.traverse(o => { if (o.isBone && !names.has(o.name)) { const b = o.name.replace(/_\d+$/, ''); if (names.has(b)) o.name = b; } });
    const templates = {};
    for (const root of cast.scene.children) if (meta.people[root.name]) templates[root.name] = prepare(root, meta.people[root.name]);
    const clips = {};
    for (const c of mot.animations) clips[c.name] = c;
    const byKind = {};
    for (const [kind, list] of Object.entries(meta.kinds || KIND_PEOPLE)) byKind[kind] = list.filter(id => templates[id]);
    LIB = { templates, clips, meta, byKind, scaled: new Map(), props: {}, steps: {} };
    measureMotions(mot, meta);
    measurePersonTasks(tasks, meta);
    for (const c of tasks.animations) {
      const fitted = c.clone();
      for (const t of fitted.tracks) t.name = t.name.replace(/^[^.]+__/, '');
      clips[c.name] = fitted;
    }
    for (const w of waiting.splice(0)) dress(w);
    return LIB;
  }).catch(e => { console.warn('[people] could not load the cast', e); return null; });
  return READY;
}

function measurePersonTasks(tasks, meta) {
  const ref = tasks.scene, mixer = new THREE.AnimationMixer(ref);
  const clips = Object.fromEntries(tasks.animations.map(c => [c.name, c]));
  for (const [person, info] of Object.entries(meta.personTasks || {})) {
    for (const [clip, props] of Object.entries(info.props || {})) {
      const key = person + ':' + clip, c = clips[key]; if (!c) continue;
      const a = mixer.clipAction(c); a.reset().play(); mixer.setTime(0); ref.updateMatrixWorld(true);
      const out = LIB.props[key] = [];
      for (const [kind, d] of Object.entries(props)) {
        if (kind.startsWith('_')) continue;
        const b = ref.getObjectByName(person + '__' + d.bone); if (!b) continue;
        _m.set(...d.world.flat()); _mi.copy(b.matrixWorld).invert();
        out.push({ kind, bone: d.bone, local: new THREE.Matrix4().multiplyMatrices(_mi, _m) });
      }
      a.stop();
    }
  }
  mixer.uncacheRoot(ref);
}

// --- materials ---------------------------------------------------------------
const PART = /(skin|eyes|brows|lashes|hair|hood_up|hood_down|habit|tunic|hose|boots|apron|beard)(_\d+)?$/;
function prepare(root, info) {
  root.updateMatrixWorld(true);
  root.traverse(o => {
    if (!o.isMesh) return;
    // (GLTFLoader drops the dot of "monk_a.hood_up": match the part by its end)
    const part = (o.name.match(PART) || [, o.name])[1];
    o.userData.part = part;
    o.castShadow = part !== 'lashes' && part !== 'brows' && part !== 'eyes';
    o.receiveShadow = true;
    const m = o.material;
    if (/^(brows|lashes|hair|beard)$/.test(part)) { m.alphaTest = 0.45; m.alphaToCoverage = true; m.transparent = false; m.depthWrite = true; if (part === 'hair') m.side = THREE.DoubleSide; }
    // MakeHuman skins are painted near white by physical standards: brought
    // down so a face does not glow out of a black cowl (lamplight, snow)
    if (part === 'skin') { m.envMapIntensity = 0.25; m.roughness = 0.58; m.color.multiplyScalar(0.74); }
    if (part === 'eyes') { m.envMapIntensity = 0.5; }
    if (/^(habit|hood_up|hood_down|tunic|hose|apron)$/.test(part)) {
      // Restrained, rough fibre reflection. The independent sheen layer
      // must not turn a black habit's grazing sleeves into pale satin under
      // the church lamps; folds still read through the authored normal map.
      const p = new THREE.MeshPhysicalMaterial({ map: m.map, normalMap: m.normalMap, normalScale: new THREE.Vector2(1, 1), roughness: 0.94, metalness: 0,
        color: m.color, envMapIntensity: 0.3, specularIntensity: m.specularIntensity ?? 0.36, specularColor: m.specularColor ?? 0xffffff,
        sheen: 0.28, sheenRoughness: 0.85, sheenColor: new THREE.Color(0x24231f), side: THREE.FrontSide });
      p.name = m.name; o.material = p;
    }
    if (part === 'boots') { m.roughness = 0.78; m.envMapIntensity = 0.3; }
    // each person's own shade of hair and complexion (cast.json tint)
    const tint = info.tint?.[part === 'hair' || part === 'beard' ? 'hair' : part === 'skin' ? 'skin' : ''];
    if (tint) { o.material = o.material.clone(); o.material.color.multiply(new THREE.Color().setRGB(...tint.map(v => Math.min(1.6, v)))); }
    // conservative bounds for culling a moving body: the bind sphere, grown
    // to hold any reach, kneel or stride from the root
    o.geometry.computeBoundingSphere();
    if (o.isSkinnedMesh) { o.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.9, 0.1), 1.35); o.frustumCulled = true; }
  });
  return { root, info };
}

// --- motion measurements: pelvis scaling, prop grips, footfalls --------------
const _m = new THREE.Matrix4(), _mi = new THREE.Matrix4();
function measureMotions(mot, meta) {
  const ref = mot.scene;
  const mixer = new THREE.AnimationMixer(ref);
  const bone = n => ref.getObjectByName(n);
  // the grip of each held thing: the tool's world placement at the clip's
  // first frame, relative to the holding bone as the clip poses it there
  for (const [clip, props] of Object.entries(meta.motions.props || {})) {
    const c = LIB.clips[clip]; if (!c) continue;
    const a = mixer.clipAction(c); a.reset().play(); mixer.setTime(0); ref.updateMatrixWorld(true);
    const out = LIB.props[clip] = [];
    for (const [k, d] of Object.entries(props)) {
      if (k.startsWith('_')) { if (k === '_hits') LIB.steps[clip] = d; continue; }
      const b = bone(d.bone); if (!b) continue;
      _m.set(...d.world.flat());
      _mi.copy(b.matrixWorld).invert();
      out.push({ kind: k, bone: d.bone, local: new THREE.Matrix4().multiplyMatrices(_mi, _m) });
    }
    a.stop();
  }
  // footfalls of the walks: the moments each foot is lowest
  for (const name of ['walk', 'walkFormal', 'walkCarry', 'walkHeavy']) {
    const c = LIB.clips[name]; if (!c) continue;
    const a = mixer.clipAction(c); a.reset().play();
    const N = 48, h = { foot_l: [], foot_r: [] };
    for (let i = 0; i < N; i++) {
      mixer.setTime(c.duration * i / N); ref.updateMatrixWorld(true);
      for (const f of ['foot_l', 'foot_r']) h[f].push(bone(f).getWorldPosition(new THREE.Vector3()).y);
    }
    const ev = [];
    for (const f of ['foot_l', 'foot_r']) {
      const y = h[f]; let lo = 0; for (let i = 1; i < N; i++) if (y[i] < y[lo]) lo = i;
      // the heel strikes a little before the lowest point of the ankle
      ev.push([((lo - 2 + N) % N) / N, 'step']);
    }
    EVENTS[name] = ev;
    a.stop();
  }
  mixer.uncacheRoot(ref);
}

// a clip fitted to one body: standing and kneeling pelvis heights scale with
// the legs; seated ones are set by the seat
function clipFor(name, U) {
  const fitted = LIB.clips[U.person + ':' + name];
  if (fitted) return fitted;
  const c = LIB.clips[name]; if (!c) return null;
  const k = SEATED.has(name) ? 1 : Math.round((U.pelvis / LIB.meta.motions.pelvis) * 200) / 200;
  const carrying = name === 'walkCarry';
  const key = name + '@' + k + (carrying ? ':' + U.person : '');
  if (!LIB.scaled.has(key)) {
    const s = c.clone(); s.name = key;
    // Recorded clips animate the reference adult's joint translations. Keep
    // this body's authored bone spacing and retarget only rotations/pelvis.
    s.tracks = s.tracks.filter(t => !/\.position$/.test(t.name) || /pelvis\.position$/.test(t.name));
    for (const t of s.tracks) if (/pelvis\.position$/.test(t.name)) { const v = t.values = t.values.slice(); for (let i = 0; i < v.length; i++) v[i] *= k; }
    // This recording cranes the neck toward a high carried object. Our
    // sacks are held at the chest; keep each body's relaxed neck/head frame
    // while retaining the recorded stride and load-bearing arms.
    if (carrying) for (const t of s.tracks) {
      const bone = /^(head|neck_01)\.quaternion$/.exec(t.name)?.[1];
      if (!bone || !U.rest[bone]) continue;
      t.values = t.values.slice();
      for (let i = 0; i < t.values.length; i += 4) U.rest[bone].toArray(t.values, i);
    }
    LIB.scaled.set(key, s);
  }
  return LIB.scaled.get(key);
}

function rnd(seed) { let a = (seed * 1831 + 13) >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ----------------------------------------------------------------------
export function makeFigure(kind, seed, opts = {}) {
  const g = new THREE.Group();
  g.name = 'person:' + kind;
  const r = rnd(seed);
  g.userData = { kind, seed, r, opts, pose: null, clip: null, speed: 0.94 + r() * 0.12, lay: !/monk|abbot|novice/.test(kind), h: 1.75, scale: 1 };
  loadFigures();
  if (LIB) dress(g); else waiting.push(g);
  return g;
}

function dress(g) {
  const U = g.userData, r = U.r;
  const id = U.opts.person && LIB.templates[U.opts.person] ? U.opts.person : personFor(U.kind, U.seed);
  const T = LIB.templates[id]; if (!T) return;
  U.person = id; U.head = id;
  const body = cloneSkinned(T.root);
  body.position.set(0, 0, 0); body.rotation.set(0, 0, 0);
  g.add(body);
  U.body = body; U.info = T.info; U.pelvis = T.info.pelvis || LIB.meta.motions.pelvis; U.h = T.info.height || 1.75;
  U.parts = {};
  body.traverse(o => { if (o.isMesh && o.userData.part) U.parts[o.userData.part] = o; });
  // each brother his own wool: habits dyed and worn to different blacks
  const cloth = U.parts.habit?.material;
  if (cloth) {
    const m = cloth.clone(), wear = 0.8 + r() * 0.35;
    m.color.setRGB(wear * (1 + (r() - 0.5) * 0.06), wear, wear * (1 - r() * 0.05));
    for (const p of ['habit', 'hood_up', 'hood_down']) if (U.parts[p]) U.parts[p].material = m;
  }
  U.mixer = new THREE.AnimationMixer(body);
  U.actions = new Map();
  U.bones = {}; U.rest = {}; body.traverse(o => { if (o.isBone) { U.bones[o.name] = o; U.rest[o.name] = o.quaternion.clone(); } });
  const hood = U.parts.hood_down;
  U.hoodDrapeIndex = hood?.morphTargetDictionary?.bendDrape;
  if (U.hoodDrapeIndex !== undefined) U.hoodRestAngle = chestAngle(g);
  U.hoodUp = null; setHood(g, !!U.opts.hood);
  if (U.pending) { const [p, ph, t] = U.pending; U.pending = null; setPose(g, p, ph, t); }
}

// hoods up in the refectory and at Compline (BOOK, D1 AKŞAM)
export function setHood(g, up) {
  const U = g.userData;
  if (!U.parts) return;
  up = !!up && !!U.parts.hood_up;
  if (U.hoodUp === up) return;
  U.hoodUp = up;
  if (U.parts.hood_up) U.parts.hood_up.visible = up;
  if (U.parts.hood_down) U.parts.hood_down.visible = !up;
  if (U.parts.hair) U.parts.hair.visible = !up;
}

function action(U, name) {
  let a = U.actions.get(name);
  if (!a) {
    const clip = clipFor(name, U); if (!clip) return null;
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
  if (!LIB.clips[name]) name = Array.isArray(M.stand) ? M.stand[0] : M.stand;
  if (name === U.clip) return;
  const a = action(U, name); if (!a) return;
  const prev = U.clip ? U.actions.get(U.clip) : null;
  a.reset(); a.setEffectiveTimeScale(SEATED.has(name) || /kneel|write|dine/.test(name) ? 1 : U.speed); a.setEffectiveWeight(1);
  a.time = (phase % 1) * a.getClip().duration;
  a.play();
  if (prev && prev !== a) prev.crossFadeTo(a, 0.5, false);
  U.clip = name;
  U.events = EVENTS[name] || (LIB.steps[name] ? LIB.steps[name].map(s => [s / a.getClip().duration, 'hit']) : null);
  if (name === 'hammer' && LIB.steps.hammer) U.events = LIB.steps.hammer.map(s => [(s / a.getClip().duration) % 1, 'hot']);
  holdTools(U, name);
  U.mixer.update(0);
}

// --- held things ---------------------------------------------------------------
let TOOLS = null;
function toolMeshes() {
  if (TOOLS) return TOOLS;
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b5236, roughness: 0.85 }), iron = new THREE.MeshStandardMaterial({ color: 0x3a3836, roughness: 0.5, metalness: 0.7 });
  const quillM = new THREE.MeshStandardMaterial({ color: 0xe8e0cc, roughness: 0.7, side: THREE.DoubleSide }), horn = new THREE.MeshStandardMaterial({ color: 0x8a7a5c, roughness: 0.5 });
  const twig = new THREE.MeshStandardMaterial({ color: 0x6e5a3a, roughness: 1 });
  // every tool is built from its working end (origin) along +y toward the hands
  const cyl = (r0, r1, h, m, y0 = 0) => { const g = new THREE.CylinderGeometry(r1, r0, h, 7); g.translate(0, y0 + h / 2, 0); return new THREE.Mesh(g, m); };
  const grp = (...ms) => { const g = new THREE.Group(); for (const m of ms) { m.castShadow = true; g.add(m); } return g; };
  TOOLS = {
    quill: () => {
      const shaft = cyl(0.0012, 0.0028, 0.2, quillM);
      const vg = new THREE.BufferGeometry();
      vg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.07, 0, 0.012, 0.13, 0, 0, 0.2, 0, 0, 0.07, 0, 0, 0.2, 0, -0.007, 0.15, 0], 3)); vg.computeVertexNormals();
      return grp(shaft, new THREE.Mesh(vg, quillM));
    },
    spoon: () => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), horn); b.scale.set(1, 0.35, 1.3); b.rotation.x = Math.PI; return grp(b, cyl(0.004, 0.005, 0.16, horn, 0.01)); },
    paddle: () => { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.2, 0.014), wood); bl.position.y = 0.1; return grp(bl, cyl(0.014, 0.014, 1.2, wood, 0.1)); },
    hammer: () => { const hd = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.13), iron); hd.position.y = 0.0; return grp(hd, cyl(0.013, 0.016, 0.38, wood, 0.02)); },
    tongs: () => grp(cyl(0.006, 0.007, 0.5, iron), (() => { const m = cyl(0.006, 0.007, 0.5, iron); m.position.x = 0.012; return m; })()),
    fork: () => { const g = grp(cyl(0.015, 0.015, 1.5, wood, 0.18)); for (const x of [-0.05, 0, 0.05]) { const t = cyl(0.004, 0.006, 0.26, iron, -0.02); t.position.x = x; t.rotation.x = 0.15; g.add(t); } return g; },
    broom: () => { const b = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.42, 9, 1, true), twig); b.position.y = 0.15; b.scale.set(1, 1, 0.45); return grp(b, cyl(0.015, 0.015, 1.1, wood, 0.3)); },
  };
  return TOOLS;
}
function holdTools(U, clip) {
  U.tools ||= {};
  for (const t of Object.values(U.tools)) t.visible = false;
  for (const p of LIB.props[U.person + ':' + clip] || LIB.props[clip] || []) {
    const key = clip + ':' + p.kind;
    let t = U.tools[key];
    if (!t) {
      const make = toolMeshes()[p.kind]; if (!make) continue;
      t = make(); t.matrixAutoUpdate = false; t.matrix.copy(p.local);
      U.bones[p.bone]?.add(t); U.tools[key] = t;
    }
    t.visible = true;
  }
}

// advance the motion; returns the contact events that fell in this step
export function updateFigure(g, dt) {
  const U = g.userData;
  if (!U.mixer) return null;
  const a = U.clip && U.actions.get(U.clip), d = a?.getClip().duration || 1;
  const before = a ? (a.time % d) / d : 0;
  U.mixer.update(dt);
  updateHoodDrape(g);
  if (!U.events || !a) return null;
  const after = (a.time % d) / d;
  let hit = null;
  for (const [f, ev] of U.events) if ((before < f && after >= f) || (after < before && (before < f || after >= f))) (hit ||= []).push(ev);
  return hit;
}

const _clothQ = new THREE.Quaternion(), _clothParentQ = new THREE.Quaternion(), _clothUp = new THREE.Vector3();
function chestAngle(g) {
  const chest = g.userData.bones?.spine_03;
  if (!chest) return 0;
  g.getWorldQuaternion(_clothParentQ).invert();
  chest.getWorldQuaternion(_clothQ).premultiply(_clothParentQ);
  _clothUp.set(0, 1, 0).applyQuaternion(_clothQ);
  return Math.atan2(_clothUp.z, _clothUp.y);
}
function updateHoodDrape(g) {
  const U = g.userData;
  if (U.hoodDrapeIndex === undefined) return;
  U.parts.hood_down.morphTargetInfluences[U.hoodDrapeIndex] = loweredHoodBlend(chestAngle(g) - U.hoodRestAngle);
}

// A named person turns his head toward someone who comes up to him (the
// only acknowledgement: no gesture, no talk loop). `target` a world point or
// null; eased in and out, limited to what a neck does (±55° across, a little
// up or down), laid over the clip after the mixer.
const _t = new THREE.Vector3(), _hq = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _qa = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0), _ax = new THREE.Vector3();
export function lookAt(g, target, dt) {
  const U = g.userData, head = U.bones?.head, neck = U.bones?.neck_01; if (!head) return;
  let yaw = 0, pitch = 0;
  if (target) {
    _t.copy(target); g.worldToLocal(_t);
    head.getWorldPosition(_ax); g.worldToLocal(_ax);
    _t.sub(_ax);
    yaw = Math.max(-0.95, Math.min(0.95, Math.atan2(_t.x, _t.z)));
    pitch = Math.max(-0.35, Math.min(0.25, Math.atan2(_t.y, Math.hypot(_t.x, _t.z)))) * 0.6;
    if (Math.abs(Math.atan2(_t.x, _t.z)) > 2.2) yaw = 0;   // behind him: he does not wring his neck round
  }
  const k = 1 - Math.exp(-dt * 3);
  U.lookYaw = (U.lookYaw || 0) + (yaw - (U.lookYaw || 0)) * k;
  U.lookPitch = (U.lookPitch || 0) + (pitch - (U.lookPitch || 0)) * k;
  if (Math.abs(U.lookYaw) < 1e-3 && Math.abs(U.lookPitch) < 1e-3) return;
  // shared between neck and head, about the body's up and the head's side
  g.getWorldQuaternion(_pq);
  for (const [b, share] of [[neck, 0.35], [head, 0.65]]) {
    if (!b) continue;
    b.parent.getWorldQuaternion(_hq);
    _ax.copy(_up).applyQuaternion(_pq);
    _qa.setFromAxisAngle(_ax, U.lookYaw * share);
    const side = new THREE.Vector3(1, 0, 0).applyQuaternion(_pq);
    _qa.multiply(new THREE.Quaternion().setFromAxisAngle(side, -U.lookPitch * share));
    // world rotation -> the bone's parent space
    b.quaternion.premultiply(_hq.clone().invert().multiply(_qa).multiply(_hq));
  }
}

// A carried sack for the peasants at the mills: slung on the right shoulder
export function sackMesh() {
  const g = new THREE.SphereGeometry(0.22, 12, 9); g.scale(1, 1.25, 0.8);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y > 0.18) p.setXYZ(i, p.getX(i) * 0.4, y, p.getZ(i) * 0.4); else p.setXYZ(i, p.getX(i) * (1 + 0.05 * Math.sin(i)), y, p.getZ(i)); }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x6a5a44, roughness: 1 }));
  m.castShadow = true; return m;
}

// Level of detail by distance (hysteresis in people.js): the small parts of
// the face go first, then the sun shadow. Measured in the full Vespers choir
// (46 figures): sun-shadow casting was 4.4 of 7.3 ms of their drawing.
const FACE = ['eyes', 'brows', 'lashes'];
export function setDetail(g, face, shadow) {
  const U = g.userData; if (!U.parts) return;
  if (U.face !== face) { U.face = face; for (const k of FACE) if (U.parts[k]) U.parts[k].visible = face; }
  if (U.shadow !== shadow) {
    U.shadow = shadow;
    for (const [k, m] of Object.entries(U.parts)) m.castShadow = shadow && !FACE.includes(k) && k !== 'hair';
    for (const t of Object.values(U.tools || {})) t.traverse(o => { if (o.isMesh) o.castShadow = shadow; });
  }
}

export function figureMaterials() { return {}; }
export function figureLib() { return LIB; }
