import * as THREE from 'three';
import { FOLDS, STABLES, STABLE_YARD, OXSHED, HENHOUSE, GRANARY, BLOOD_JAR } from '../core/plan.js';
import { baseHeight } from './terrain.js';
import { rng } from '../core/materials.js';
import { model, cloneSkinned } from '../core/assets.js';

// The beasts of the abbey, kept east behind the walls and round the
// threshing floor (Fourth Day, Terce; claim_000366–claim_000375): horses
// in their stalls with Brunellus black and first from the left
// (claim_000060–claim_000086), the guests' mules and the abbey donkeys,
// oxen and calves in their shed (claim_001701, claim_001710), sheep,
// lambs and goats in the folds (claim_000373, claim_001706), pigs in the
// pens by the blood vat "this is the season when they kill the pigs"
// (claim_000217, claim_000375), hens by the henhouse (claim_000372), the
// shepherds' dogs (Fourth Day, Terce) and Salvatore's black cat
// (Fourth Day, Vespers). See docs/provenance/animals-dressing.md.
//
// Every animal is an imported, rigged model (assets/models/animal_*.glb:
// Quaternius CC0 horse, donkey, cow, bull, pig, sheep, dog and cat; Google
// Poly CC BY 3.0 hen, rooster and goat, given a small neck rig here), in the
// coat of its breed, playing its own recorded idle, head-low, eating and
// walking clips at its own phase. Only animals near the walker animate.
// Calls come from a visible animal that moves first: the soundscape's
// emitters ask `ctx.beasts.spot(species)` where to sound and
// `ctx.beasts.cue(species, bank)` to lift the head before a snort, a bleat
// or a low (systems/audio/emitters.js).

// target height (top of head/ears, metres) and coats per kind
const KIND = {
  horse: { file: 'horse', h: 1.8, clips: { stand: ['Idle', 'Idle_2', 'Idle'], graze: ['Eating', 'Idle_Headlow'], chew: ['Idle_Headlow'] } },
  mule: { file: 'donkey', h: 1.62, clips: { stand: ['Idle', 'Idle_2'], graze: ['Eating'] } },
  donkey: { file: 'donkey', h: 1.36, clips: { stand: ['Idle', 'Idle_2'], graze: ['Eating', 'Idle_Headlow'] } },
  cow: { file: 'cow', h: 1.5, clips: { stand: ['Idle', 'Idle_2'], graze: ['Eating'], chew: ['Idle_Headlow', 'Idle'] } },
  ox: { file: 'bull', h: 1.62, clips: { stand: ['Idle', 'Idle_2'], graze: ['Eating'], chew: ['Idle_Headlow', 'Idle'] } },
  calf: { file: 'cow', h: 0.95, clips: { stand: ['Idle'], graze: ['Eating'] } },
  pig: { file: 'pig', h: 0.82, clips: { stand: ['Idle'], root: ['Idle'] } },
  sheep: { file: 'sheep', h: 0.95, clips: { stand: ['Idle'], graze: ['Idle'] } },
  lamb: { file: 'sheep', h: 0.6, clips: { stand: ['Idle'], graze: ['Idle'] } },
  goat: { file: 'goat1', h: 0.98, rig: 'quad', clips: {} },
  dog: { file: 'husky', h: 0.72, clips: { stand: ['Idle', 'Idle_2'], lie: ['Idle_2'] } },
  cat: { file: 'cat', h: 0.3, clips: { stand: ['Idle', 'Idle_Eating'] } },
  hen: { file: 'hen1', h: 0.42, rig: 'fowl', clips: {} },
  rooster: { file: 'rooster', h: 0.55, rig: 'fowl', clips: {} },
};
// coats: material name (in the source) -> colour, per coat key
const COATS = {
  black: { Main: 0x191715, Main_Dark: 0x100f0e, Main_Light: 0x2a2724, Hair: 0x0d0c0b, Muzzle: 0x2c2724, Hooves: 0x2a2622 },
  bay: { Main: 0x5e3a22, Main_Dark: 0x3f2616, Main_Light: 0x7a5132, Hair: 0x1a1512, Muzzle: 0x2a211c, Hooves: 0x2b2622 },
  chestnut: { Main: 0x73452a, Main_Dark: 0x55321e, Main_Light: 0x8a5a38, Hair: 0x5a3622, Muzzle: 0x3a2a20, Hooves: 0x3a332d },
  grey: { Main: 0x8a857d, Main_Dark: 0x6e6961, Main_Light: 0xa39e95, Hair: 0x5e5a55, Muzzle: 0x3a3632, Hooves: 0x3a3632 },
  mule: { Main: 0x4f4034, Main_Light: 0x7a6a58, Hair: 0x2a221c, Muzzle: 0x6a5c4e, Hooves: 0x2a2521 },
  donkey: { Main: 0x7d7468, Main_Light: 0xb2a898, Hair: 0x3e3833, Muzzle: 0xc0b6a6, Hooves: 0x34302b },
  ox: { Main: 0xa49278, Main_Light: 0xc9b99d, Muzzle: 0x3a302a, Hooves: 0x2b2622, Horns: 0xcfc3a8 },
  oxDark: { Main: 0x5a4632, Main_Light: 0x8a7458, Muzzle: 0x2a221c, Hooves: 0x241f1b, Horns: 0xc8bca0 },
  calf: { Main: 0xb49a78, Main_Light: 0xd3c2a2, Muzzle: 0x5a4a3c, Hooves: 0x3a332d, Horns: 0xc8bca0 },
  pig: { 'Material.003': 0xcaa090, Material: 0x9a6e62 },
  pigDark: { 'Material.003': 0x6a4c40, Material: 0x3e2c26 },
  sheep: { White: 0xa89c86, Black: 0x2e2822 },   // winter fleece, greasy and grey with the fold's dirt
  lamb: { White: 0xc9bfac, Black: 0x3a322a },
  // the Poly fowl and goat are painted in toy-bright colours: the map is
  // desaturated (sat) and then tinted, towards a farmyard of mixed hens
  henBrown: { lambert2SG: 0xa27e5c, sat: 0.3 }, henBuff: { lambert2SG: 0xd8c4a0, sat: 0.15 },
  henDark: { lambert2SG: 0x6e5440, sat: 0.3 }, henBlack: { lambert2SG: 0x3a3632, sat: 0.1 },
  hen: { lambert2SG: 0xa27e5c, sat: 0.3 }, rooster: { Rooster_mat: 0xb3a28c, sat: 0.6 }, goat: { Goat_mat: 0xc9bca8, sat: 0.5 },
};

const HENS = ['henBrown', 'henBrown', 'henBuff', 'henDark', 'henBlack'];

// a fine hair/fleece normal texture shared by all hides
let HAIR = null;
function hairTex() {
  if (HAIR) return HAIR;
  const N = 128, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d'), im = g.createImageData(N, N), h = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) h[y * N + x] = Math.random() * 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(y * 0.9 + Math.sin(x * 0.21) * 3));
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = h[y * N + ((x + 1) % N)] - h[y * N + ((x + N - 1) % N)], dy = h[((y + 1) % N) * N + x] - h[((y + N - 1) % N) * N + x];
    const l = Math.hypot(dx, dy, 1), i = (y * N + x) * 4;
    im.data[i] = (-dx / l * 0.5 + 0.5) * 255; im.data[i + 1] = (-dy / l * 0.5 + 0.5) * 255; im.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  HAIR = new THREE.CanvasTexture(c); HAIR.wrapS = HAIR.wrapT = THREE.RepeatWrapping;
  return HAIR;
}

// Give a static model (hen, goat) a small skeleton: body, neck, head (and a
// tail for the fowl), weights by position along the body's length
function autoRig(scene, kind) {
  let mesh = null; scene.traverse(o => { if (o.isMesh && !mesh) mesh = o; });
  scene.updateMatrixWorld(true);
  const geo = mesh.geometry.clone(); geo.applyMatrix4(mesh.matrixWorld);
  geo.computeBoundingBox(); const bb = geo.boundingBox, sz = bb.getSize(new THREE.Vector3());
  // which horizontal axis is the length, which way the head points: the
  // highest point of the model is the head
  const pos = geo.attributes.position;
  let top = 0; for (let i = 1; i < pos.count; i++) if (pos.getY(i) > pos.getY(top)) top = i;
  const alongZ = sz.z >= sz.x, ax = alongZ ? 'z' : 'x';
  const mid = (bb.min[ax] + bb.max[ax]) / 2, headSign = Math.sign((alongZ ? pos.getZ(top) : pos.getX(top)) - mid) || 1;
  const body = new THREE.Bone(), neck = new THREE.Bone(), head = new THREE.Bone();
  body.name = 'Body'; neck.name = 'Neck'; head.name = 'Head';
  const at = (f, y) => { const v = new THREE.Vector3(); v[ax] = mid + headSign * f * sz[ax] / 2; v.y = bb.min.y + y * sz.y; return v; };
  body.position.copy(at(0, 0.45)); neck.position.copy(at(kind === 'fowl' ? 0.35 : 0.55, kind === 'fowl' ? 0.62 : 0.62)).sub(body.position);
  head.position.copy(at(kind === 'fowl' ? 0.55 : 0.85, kind === 'fowl' ? 0.85 : 0.82)).sub(body.position).sub(neck.position);
  body.add(neck); neck.add(head);
  // legs: hinged at the hip under the body, two for the fowl, four for the
  // goat; the vertices below the hip follow them (the fourth skin slot)
  const lat = alongZ ? 'x' : 'z', latMid = (bb.min[lat] + bb.max[lat]) / 2;
  const fowl = kind === 'fowl', hipY = fowl ? 0.3 : 0.5;
  const legDefs = fowl ? [[-0.05, -1], [-0.05, 1]] : [[0.5, -1], [0.5, 1], [-0.55, -1], [-0.55, 1]];
  const legs = legDefs.map(([f, side]) => {
    const b = new THREE.Bone(); b.name = 'Leg'; const p = at(f, hipY); p[lat] = latMid + side * sz[lat] * 0.2;
    b.position.copy(p).sub(body.position); body.add(b); return b;
  });
  const si = [], sw = [];
  for (let i = 0; i < pos.count; i++) {
    const f = ((alongZ ? pos.getZ(i) : pos.getX(i)) - mid) / (sz[ax] / 2) * headSign, y = (pos.getY(i) - bb.min.y) / sz.y;
    const n = THREE.MathUtils.smoothstep(f, fowl ? 0.1 : 0.35, fowl ? 0.45 : 0.62) * THREE.MathUtils.smoothstep(y, 0.35, 0.6);
    const hd = THREE.MathUtils.smoothstep(f, fowl ? 0.35 : 0.65, fowl ? 0.6 : 0.85) * THREE.MathUtils.smoothstep(y, 0.5, 0.75);
    const side = (alongZ ? pos.getX(i) : pos.getZ(i)) > latMid ? 1 : 0;
    const li = fowl ? side : (f > 0 ? 0 : 2) + side;
    const wl = 1 - THREE.MathUtils.smoothstep(y, hipY - (fowl ? 0.12 : 0.14), hipY + 0.02);
    const k = 1 - wl;
    si.push(0, 1, 2, 3 + li); sw.push(Math.max(0, 1 - n) * k, Math.max(0, n - hd) * k, hd * k, wl);
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  const sm = new THREE.SkinnedMesh(geo, mesh.material);
  const root = new THREE.Group(); root.add(body); root.add(sm);
  root.updateMatrixWorld(true);
  sm.bind(new THREE.Skeleton([body, neck, head, ...legs]));
  // which way the model faces, as a turn to add to atan2(dx, dz)
  root.userData.headAxis = alongZ ? (headSign > 0 ? 0 : Math.PI) : (headSign > 0 ? -Math.PI / 2 : Math.PI / 2);
  root.userData.legAxis = lat;   // legs swing about the lateral axis
  return root;
}

export function buildAnimals(M, ctx) {
  const r = rng(53);
  const gy = (x, z) => baseHeight(x, z);
  const animals = [];
  const root = new THREE.Group(); root.name = 'animals'; root.userData.animals = animals;
  ctx.scene.add(root);
  const FLOOR = 0.25;   // the sheds' laid floor level (outbuildings.js)

  // register an animal: species, coat, place, facing, behaviour
  const add = (species, coat, x, z, ry, kind, extra = {}) => {
    const floorY = extra.floorY != null ? extra.floorY : gy(x, z);
    const g = new THREE.Group(); g.position.set(x, floorY, z); g.rotation.y = ry; g.visible = false;
    root.add(g);
    const a = { g, species, coat: coat || species, kind, floorY, phase: r(), rate: 0.85 + r() * 0.3, home: { x, z }, ry, cue: 0, ...extra };
    animals.push(a);
    return a;
  };

  // ---- horses in the stalls, Brunellus first from the left -------------
  // Stalls run along the east wall (x ≈ STABLES.x1-2), the row from z0 to
  // z1; the west door with its grille is the "left" as you enter, so the
  // first stall is at the low-z (north) end. claim_000060 (Brunellus,
  // black), claim_002603 (a row behind the grille). They face the mangers
  // on the west side of each stall (−x).
  const faceW = -Math.PI / 2;
  {
    const n = 14, dz = (STABLES.z1 - STABLES.z0 - 2) / n;
    const stallX = STABLES.x1 - 2.4;
    const coats = ['black', 'bay', 'grey', 'chestnut', 'bay', 'grey', 'bay'];
    for (let i = 0; i < 7; i++) {
      const z = STABLES.z0 + 1 + (i * 2 + 0.5) * dz;
      add('horse', coats[i], stallX, z, faceW + (r() - 0.5) * 0.12, i % 3 === 1 ? 'graze' : 'stand', { floorY: FLOOR, brunellus: i === 0, scale: i === 0 ? 1.03 : 0.96 + r() * 0.06, zone: 'stables' });
    }
    // two more in the stalls that face the grille, so the row reads as full
    // from the court (claim_002603)
    for (const [k, c] of [[7, 'chestnut'], [9, 'bay']])
      add('horse', c, stallX, STABLES.z0 + 1 + (k + 0.5) * dz, faceW + (r() - 0.5) * 0.12, 'stand', { floorY: FLOOR, scale: 0.96 + r() * 0.06, zone: 'stables' });
    // guests' mules in the two free stalls at the south end of the row
    for (const [k, dy, pose] of [[13, -0.15, 'stand'], [11, 0.1, 'graze']])
      add('mule', 'mule', stallX, STABLES.z0 + 1 + (k + 0.5) * dz, faceW + dy, pose, { floorY: FLOOR, zone: 'stables' });
    const bz = STABLES.z0 + 1 + 0.5 * dz;
    ctx.interact({ id: 'brunellus', pos: new THREE.Vector3(stallX - 1.2, 1.4, bz), radius: 3.2,
      label: 'Brunellus, the Abbot’s horse: black, five spans high, small head, sharp ears, big eyes, a full tail' });
  }

  // ---- a donkey and a mule loose in the stable yard --------------------
  {
    const yx = (STABLE_YARD.x0 + STABLE_YARD.x1) / 2, yz = (STABLE_YARD.z0 + STABLE_YARD.z1) / 2;
    add('donkey', 'donkey', yx - 2, yz - 3, 2.2, 'graze');
    add('mule', 'mule', yx + 1.5, yz + 4, -1.0, 'stand');
  }

  // ---- oxen, cows and calves in the ox shed ----------------------------
  {
    const stallX = OXSHED.x1 - 2.4;
    for (let i = 0; i < 5; i++) {
      const zz = OXSHED.z0 + 2 + i * ((OXSHED.z1 - OXSHED.z0 - 4) / 4);
      const ox = i % 3 === 0;
      add(ox ? 'ox' : 'cow', ox ? (i ? 'oxDark' : 'ox') : 'ox', stallX, zz, faceW + (r() - 0.5) * 0.1, i % 2 ? 'chew' : 'stand', { floorY: FLOOR, zone: 'oxshed' });
    }
    add('calf', 'calf', OXSHED.x0 + 3, OXSHED.z0 + 3, -0.6, 'graze', { floorY: FLOOR, zone: 'oxshed' });
    add('calf', 'calf', OXSHED.x0 + 4.5, OXSHED.z0 + 4.5, 1.2, 'stand', { floorY: FLOOR, zone: 'oxshed' });
  }

  // ---- sheep, lambs and goats in the folds -----------------------------
  {
    const inX0 = FOLDS.x0 + 1.5, inX1 = FOLDS.x1 - 1.5, inZ0 = FOLDS.z0 + 1.2, inZ1 = FOLDS.z1 - 1.2;
    const offPart = x => { for (let k = 1; k < 4; k++) { const px = FOLDS.x0 + k * (FOLDS.x1 - FOLDS.x0) / 4; if (Math.abs(x - px) < 0.7) return px + (x < px ? -0.75 : 0.75); } return x; };
    const spots = [];
    const free = (x, z, d) => spots.every(([a, b]) => Math.hypot(a - x, b - z) > d);
    const place = (sp, coat, n, dmin) => {
      for (let i = 0, tries = 0; i < n && tries < 200; tries++) {
        const x = offPart(inX0 + r() * (inX1 - inX0)), z = inZ0 + r() * (inZ1 - inZ0);
        if (!free(x, z, dmin)) continue;
        spots.push([x, z]); i++;
        // goats walk about their own pen (the partitions divide the fold in four)
        const pw = (FOLDS.x1 - FOLDS.x0) / 4, pen = Math.min(3, Math.floor((x - FOLDS.x0) / pw));
        const roam = sp === 'goat' ? { x0: FOLDS.x0 + pen * pw + 0.8, x1: FOLDS.x0 + (pen + 1) * pw - 0.8, z0: inZ0, z1: inZ1 } : {};
        add(sp, coat, x, z, r() * Math.PI * 2, r() < 0.5 ? 'graze' : 'stand', { floorY: FLOOR, zone: 'folds', scale: 0.92 + r() * 0.14, ...roam });
      }
    };
    place('sheep', 'sheep', 9, 1.2); place('lamb', 'lamb', 3, 0.8); place('goat', null, 3, 1.2);
  }

  // ---- pigs in the pens before the folds, by the blood vat -------------
  {
    const px0 = FOLDS.x0 + 0.9, px1 = FOLDS.x0 + 4.1, pz0 = FOLDS.z1 + 1.6, pz1 = FOLDS.z1 + 8.1;
    const ps = [];
    for (let i = 0, t = 0; i < 6 && t < 200; t++) {
      const x = px0 + r() * (px1 - px0), z = pz0 + r() * (pz1 - pz0);
      if (ps.some(([a, b]) => Math.hypot(a - x, b - z) < 1.1)) continue;
      ps.push([x, z]); i++;
      add('pig', i % 4 === 0 ? 'pigDark' : 'pig', x, z, r() * Math.PI * 2, r() < 0.6 ? 'root' : 'stand', { scale: 0.85 + r() * 0.3 });
    }
    add('pig', 'pig', BLOOD_JAR[0] + 4, BLOOD_JAR[1] + 4, 1.0, 'root');
  }

  // ---- hens in the henhouse yard, a cock among them --------------------
  {
    const hx0 = HENHOUSE.x0 + 1, hx1 = HENHOUSE.x1 - 1, hz0 = HENHOUSE.z0 + 1, hz1 = HENHOUSE.z1 - 1;
    for (let i = 0; i < 13; i++) {
      const x = hx0 + r() * (hx1 - hx0), z = hz0 + r() * (hz1 - hz0);
      add(i === 0 ? 'rooster' : 'hen', i === 0 ? null : HENS[Math.floor(r() * HENS.length)], x, z, r() * Math.PI * 2, 'peck', { fowl: true, x0: hx0, x1: hx1, z0: hz0, z1: hz1, scale: 0.9 + r() * 0.2 });
    }
    const gx = GRANARY.x0 - 3.2, gz = (GRANARY.z0 + GRANARY.z1) / 2;
    for (let i = 0; i < 3; i++) add('hen', HENS[i], gx + (r() - 0.5) * 3, gz + (r() - 0.5) * 4, r() * 6, 'peck', { fowl: true, x0: gx - 2, x1: gx + 2, z0: gz - 2.5, z1: gz + 2.5 });
  }

  // ---- sheepdogs and a cat ---------------------------------------------
  add('dog', null, FOLDS.x0 + 6.4, FOLDS.z1 + 1.4, -0.4, 'stand');
  add('dog', null, (STABLE_YARD.x0 + STABLE_YARD.x1) / 2 - 4, (STABLE_YARD.z0 + STABLE_YARD.z1) / 2 + 6, 1.4, 'lie');
  add('cat', null, GRANARY.x0 + 3, GRANARY.z1 - 2, 2.4, 'stand', { floorY: FLOOR });

  // ------------------------------------------------------------------
  // dress each animal once its model has arrived
  // ------------------------------------------------------------------
  const hair = hairTex();
  const tmpl = new Map();
  const load = sp => {
    const K = KIND[sp];
    if (!tmpl.has(K.file)) tmpl.set(K.file, model('animal_' + K.file).then(g => {
      if (!g) return null;
      let scene = g.scene;
      if (K.rig) scene = autoRig(scene, K.rig);
      scene.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(scene);
      return { scene, clips: g.animations, bb };
    }));
    return tmpl.get(K.file);
  };
  const matCache = new Map();
  const coatMat = (src, coat) => {
    const key = src.uuid + ':' + coat;
    if (!matCache.has(key)) {
      const m = new THREE.MeshStandardMaterial({ color: src.color, map: src.map || null, roughness: 0.78, metalness: 0, envMapIntensity: 0.3, normalMap: hair, normalScale: new THREE.Vector2(0.25, 0.25) });
      const c = coat && COATS[coat]?.[src.name], sat = coat && COATS[coat]?.sat;
      if (c != null && sat != null && m.map) {
        // desaturate the painted map, then tint (colour × map would keep the paint's hue)
        m.color.setHex(0xffffff);
        const t = new THREE.Color(c), k = `vec3(${t.r.toFixed(3)}, ${t.g.toFixed(3)}, ${t.b.toFixed(3)})`;
        m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>',
          `#include <map_fragment>\n{ float l = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)); diffuseColor.rgb = mix(vec3(l), diffuseColor.rgb, ${sat.toFixed(2)}) * ${k}; }`); };
        m.customProgramCacheKey = () => 'coat:' + coat;
      } else if (c != null) m.color.setHex(c);
      // fleece and coarse hair: the low-poly hides get a lumpy, locked surface
      // from 3D noise (no UVs needed), darker in the crevices and toward the
      // belly and legs where the fold's muck clings
      const fleece = coat === 'sheep' || coat === 'lamb' ? (src.name === 'White' ? { f: 30, a: 0.55, dirt: 0.5 } : null) : coat === 'goat' ? { f: 48, a: 0.35, dirt: 0.3 } : null;
      if (fleece) {
        m.roughness = 0.98; m.envMapIntensity = 0.1; m.normalMap = null;
        const prev = m.onBeforeCompile, key = 'fleece:' + coat + ':' + src.name;
        m.onBeforeCompile = (sh, r) => {
          prev?.call(m, sh, r);
          sh.uniforms.uFleece = { value: new THREE.Vector3(fleece.f, fleece.a, fleece.dirt) };
          // (object space scaled to metres: the locks stay put as the animal turns)
          sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vFlP; varying float vFlW;').replace('#include <skinning_vertex>', '#include <skinning_vertex>\nvFlP = transformed * length(modelMatrix[0].xyz); vFlW = (modelMatrix * vec4(transformed, 1.0)).y;');
          sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
            varying vec3 vFlP; varying float vFlW; uniform vec3 uFleece;
            float flH(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
              float n=dot(i,vec3(1.,57.,113.));
              #define H(o) fract(sin(n+o)*43758.5453)
              return mix(mix(mix(H(0.),H(1.),f.x),mix(H(57.),H(58.),f.x),f.y),mix(mix(H(113.),H(114.),f.x),mix(H(170.),H(171.),f.x),f.y),f.z); }
            // soft clumps under small curled locks
            float flLocks(vec3 p){ return 0.25*flH(p*0.3+1.7) + 0.45*flH(p + 0.6*flH(p*0.5)) + 0.3*flH(p*2.1+7.1); }`)
            .replace('#include <map_fragment>', `#include <map_fragment>
              float flh = flLocks(vFlP * uFleece.x);
              diffuseColor.rgb *= mix(1.0, 0.8 + 0.3 * flh, uFleece.y);
              float flLow = clamp(1.0 - (vFlW - 0.25) / 0.55, 0.0, 1.0);   // the folds' floor
              diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.62, 0.56, 0.46), uFleece.z * flLow);`)
            .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
              { vec3 sp = -vViewPosition; vec3 sx = dFdx(sp), sy = dFdy(sp); float hx = dFdx(flh), hy = dFdy(flh);
                vec3 R1 = cross(sy, normal), R2 = cross(normal, sx); float det = dot(sx, R1);
                vec3 gr = sign(det) * (hx * R1 + hy * R2) * 0.55 * uFleece.y; normal = normalize(abs(det) * normal - gr); }`)

        };
        m.customProgramCacheKey = () => key;
      }
      if (/eye/i.test(src.name)) { m.roughness = 0.2; m.normalMap = null; }
      if (/hoove/i.test(src.name)) m.roughness = 0.6;
      matCache.set(key, m);
    }
    return matCache.get(key);
  };
  for (const a of animals) load(a.species).then(T => {
    if (!T) return;
    const K = KIND[a.species];
    const body = cloneSkinned(T.scene);
    const h = T.bb.max.y - T.bb.min.y, s = K.h / h * (a.scale || 1);
    body.scale.setScalar(s);
    body.position.y = -T.bb.min.y * s;
    body.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; o.material = coatMat(o.material, a.coat); } });
    a.g.add(body);
    a.body = body;
    a.head = body.getObjectByName('Head') || body.getObjectByName('Neck3');
    a.neck = body.getObjectByName('Neck') || body.getObjectByName('Neck2');
    if (T.clips.length) {
      a.mixer = new THREE.AnimationMixer(body);
      const list = K.clips[a.kind] || K.clips.stand || [T.clips[0].name];
      a.clipNames = list.filter(n => T.clips.some(c => c.name === n));
      if (!a.clipNames.length) a.clipNames = [T.clips[0].name];
      a.clips = T.clips;
      play(a, a.clipNames[Math.floor(a.phase * a.clipNames.length)], a.phase);
    }
    const legs = []; body.traverse(o => { if (o.isBone && o.name === 'Leg') legs.push(o); });
    if (legs.length) {
      a.legs = legs; a.legs0 = legs.map(l => l.quaternion.clone()); a.legAxis = T.scene.userData.legAxis;
      a.headAxis = T.scene.userData.headAxis || 0; a.bodyBone = body.getObjectByName('Body'); a.bodyBone0 = a.bodyBone.quaternion.clone(); a.gait = 0; a.move = 0;
    }
    if (a.head) a.head0 = a.head.quaternion.clone();
    if (a.neck) a.neck0 = a.neck.quaternion.clone();
  });

  function play(a, name, phase = 0) {
    const clip = a.clips.find(c => c.name === name); if (!clip) return;
    const act = a.mixer.clipAction(clip);
    const prev = a.action;
    act.reset(); act.setEffectiveTimeScale(a.rate); act.time = phase * clip.duration; act.play();
    if (prev && prev !== act) prev.crossFadeTo(act, 0.8, false);
    a.action = act; a.clipName = name; a.clipT = 6 + a.phase * 10;
    a.mixer.update(0);
  }

  // ------------------------------------------------------------------
  // the soundscape asks where a species is, and lets it move first
  // ------------------------------------------------------------------
  const SPECIES = { stable: ['horse', 'mule'], oxen: ['ox', 'cow', 'calf'], sheep: ['sheep', 'lamb', 'goat'], pigs: ['pig'], hens: ['hen', 'rooster'] };
  let cam = new THREE.Vector3();
  ctx.beasts = {
    spot(group, near = 26) {
      const want = SPECIES[group] || [group];
      const c = animals.filter(a => a.body && want.includes(a.species) && a.g.position.distanceTo(cam) < near);
      if (!c.length) return null;
      const a = c[Math.floor(Math.random() * c.length)];
      this.last = a;
      const H = KIND[a.species].h * (a.scale || 1);
      return [a.g.position.x, a.g.position.y + H * 0.8, a.g.position.z];
    },
    // head up (a snort, a bleat, a low) or down (a grunt, a peck)
    cue(bank) {
      const a = this.last; if (!a || !a.head) return false;
      a.cue = 1; a.cueDir = /grunt|cluck|chew|cowChew/.test(bank) ? -1 : 1;
      return true;
    },
  };

  const _q = new THREE.Quaternion(), _e = new THREE.Euler();
  ctx.onUpdate((dt, st) => {
    cam = st.cam;
    for (const a of animals) {
      const dx = a.g.position.x - cam.x, dz = a.g.position.z - cam.z, d2 = dx * dx + dz * dz;
      const showR = st.mode === 'walk' ? 80 : 130;
      a.g.visible = !!a.body && d2 < showR * showR;
      if (!a.g.visible) continue;
      const animR = st.mode === 'walk' ? 42 : 55;
      if (d2 > animR * animR) continue;
      a.phase += dt * a.rate;
      if (a.mixer) {
        a.mixer.update(dt);
        // now and then change from one calm clip to another
        a.clipT -= dt;
        if (a.clipT < 0 && a.clipNames.length > 1) play(a, a.clipNames[(a.clipNames.indexOf(a.clipName) + 1) % a.clipNames.length], Math.random());
        else if (a.clipT < 0) a.clipT = 10;
      } else if (a.head) {
        // the auto-rigged fowl and goats: pecking, looking about, chewing
        const t = a.phase * 6.2832;
        if (a.fowl) {
          // pecking when still; walking, the head thrusts forward at each step
          const pk = Math.pow(Math.max(0, Math.sin(t * 0.5)), 6) * (1 - a.move);
          const bob = a.move * 0.28 * (0.5 + 0.5 * Math.sin(a.gait * 2));
          _e.set(pk * 1.1 + bob, Math.sin(t * 0.13) * 0.6 * (1 - a.move * 0.7), 0); a.neck.quaternion.copy(a.neck0).multiply(_q.setFromEuler(_e));
          _e.set(pk * 0.5 - 0.1 * Math.sin(t * 1.7) - bob * 0.6, 0, 0); a.head.quaternion.copy(a.head0).multiply(_q.setFromEuler(_e));
        } else {
          _e.set(0.25 + 0.2 * Math.sin(t * 0.07), Math.sin(t * 0.05) * 0.5, 0); a.neck.quaternion.copy(a.neck0).multiply(_q.setFromEuler(_e));
          _e.set(0.04 * Math.sin(t * 1.1), 0, 0); a.head.quaternion.copy(a.head0).multiply(_q.setFromEuler(_e));
        }
      }
      // the lift of the head that comes before a call
      if (a.cue > 0 && a.head) {
        a.cue = Math.max(0, a.cue - dt * 0.9);
        const k = Math.sin(Math.min(1, (1 - a.cue) * 2.2) * Math.PI) * 0.35 * a.cueDir;
        _e.set(-k, 0, 0); a.head.quaternion.multiply(_q.setFromEuler(_e));
      }
      // hens wander in their yard, goats about their pen: short walks and
      // long pauses, turning toward where they go, legs stepping
      if (a.x0 !== undefined && a.legs) {
        const fowl = !!a.fowl;
        if (a.wx === undefined || Math.random() < dt * (fowl ? 0.08 : 0.025)) {
          const R = fowl ? 2.4 : 3.2;
          a.wx = Math.min(a.x1, Math.max(a.x0, a.g.position.x + (Math.random() - 0.5) * R));
          a.wz = Math.min(a.z1, Math.max(a.z0, a.g.position.z + (Math.random() - 0.5) * R));
        }
        const tx = a.wx - a.g.position.x, tz = a.wz - a.g.position.z, dd = Math.hypot(tx, tz);
        const going = dd > 0.05 ? 1 : 0;
        a.move += (going - a.move) * Math.min(1, dt * 6);
        if (going) {
          const step = Math.min(dd, dt * (fowl ? 0.35 : 0.45) * Math.min(1, a.move * 1.5));
          a.g.position.x += tx / dd * step; a.g.position.z += tz / dd * step;
          if (fowl) a.g.position.y = gy(a.g.position.x, a.g.position.z);
          // turn smoothly toward the way ahead
          const want = Math.atan2(tx, tz) + (a.headAxis || 0);
          let dr = want - a.g.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr));
          a.g.rotation.y += dr * Math.min(1, dt * 5);
          a.gait += step / (fowl ? 0.07 : 0.28) * Math.PI;
        }
        // the legs: alternate for the fowl, diagonal pairs for the goat
        const A = a.move * (fowl ? 0.6 : 0.42), off = fowl ? [0, Math.PI] : [0, Math.PI, Math.PI, 0];
        const axis = a.legAxis === 'x' ? 0 : 2;
        a.legs.forEach((l, i) => {
          const ang = A * Math.sin(a.gait + off[i]);
          _e.set(axis === 0 ? ang : 0, 0, axis === 2 ? ang : 0); l.quaternion.copy(a.legs0[i]).multiply(_q.setFromEuler(_e));
        });
        // the body: a waddle (fowl) or a slight pitch and rise (goat) at each step
        const roll = a.move * (fowl ? 0.09 : 0.03) * Math.sin(a.gait), pitch = a.move * (fowl ? 0 : 0.03) * Math.sin(a.gait * 2);
        _e.set(axis === 0 ? pitch : roll, 0, axis === 0 ? roll : pitch); a.bodyBone.quaternion.copy(a.bodyBone0).multiply(_q.setFromEuler(_e));
      }
    }
  });

  return { root, animals };
}
