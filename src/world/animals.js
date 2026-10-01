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
// Realtime Ranchers CC0 horse; BojanBabic CC BY 4.0 pig;
// hendrikReyneke CC BY 4.0 sheep; Quaternius CC0 donkey, cow, bull, dog and
// cat; Google Poly CC BY 3.0 hen, rooster
// and goat, given a small neck rig here), in the coat of its breed, playing
// its own recorded idle, head-low, eating, rooting and walking clips at its
// own phase. Only animals near the walker animate.
// Calls come from a visible animal that moves first: the soundscape's
// emitters ask `ctx.beasts.spot(species)` where to sound and
// `ctx.beasts.cue(species, bank)` to lift the head before a snort, a bleat,
// a low or a pig's grunt (systems/audio/emitters.js).

// target height (top of head/ears, metres) and coats per kind
const KIND = {
  horse: { file: 'horse_rancher', metric: true, clips: { stand: ['Idle', 'Idle_2', 'Idle'], graze: ['Eating', 'Idle_Headlow'], chew: ['Idle_Headlow'] } },
  mule: { file: 'donkey', h: 1.62, clips: { stand: ['Idle', 'Idle_2'], graze: ['Eating'] } },
  donkey: { file: 'donkey', h: 1.36, clips: { stand: ['Idle', 'Idle_2'], graze: ['Eating', 'Idle_Headlow'] } },
  cow: { file: 'cow', h: 1.5, clips: { stand: ['Idle', 'Idle_2'], graze: ['Eating'], chew: ['Idle_Headlow', 'Idle'] } },
  ox: { file: 'bull', h: 1.62, clips: { stand: ['Idle', 'Idle_2'], graze: ['Eating'], chew: ['Idle_Headlow', 'Idle'] } },
  calf: { file: 'cow', h: 0.95, clips: { stand: ['Idle'], graze: ['Eating'] } },
  // metric (withers 0.65 m, scripts/models/pack_pig.mjs): 'Idle' is the source's
  // whole 10 s loop (looks about, sniffs the ground, looks up), 'Root' its
  // head-down 5.04–7.63 s, closed into a loop
  pig: { file: 'pig', metric: true, nod: 'lateral', clips: { stand: ['Idle'], root: ['Root', 'Idle'] } },
  // metric (withers 0.65 m, scripts/models/pack_sheep.mjs): 'Idle' 12 s (looks
  // about, sniffs, ear flicks), 'Graze' 10 s (muzzle in the bedding); lambs are
  // the same sheep at two-thirds, the head a little larger, not grazing
  sheep: { file: 'sheep', metric: true, nod: 'lateral', clips: { stand: ['Idle'], graze: ['Graze', 'Idle'] } },
  lamb: { file: 'sheep', metric: true, base: 0.66, headScale: 1.12, nod: 'lateral', clips: { stand: ['Idle'], graze: ['Idle'] } },
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
  // pigs: the dark, bristly, long-legged swine of the Italian Middle Ages (the
  // belted one after Lorenzetti's Good Government, Siena 1338–39); coat, and
  // for the belted pig the pale band over shoulders and forelegs, in sRGB
  pigBlack: { pig: 0x1f1c1a }, pigBrown: { pig: 0x3d281e }, pigBelt: { pig: 0x1e1b1a, belt: 0xaa9c8f },
  // sheep: the unimproved fleece of a mixed flock in winter, greasy and
  // dirtied; cream (the map's own colour, dulled), grey-brown, and one dark;
  // fleece and the short hair of face and legs, sRGB; re: 1 recolours from
  // the map's light and shade, 0 tints the map's own colour
  sheepCream: { fleece: 0xbfb4a1, skin: 0xbab0a3, re: 0 }, sheepGrey: { fleece: 0x7a6a5a, skin: 0x51443a, re: 1 },
  sheepDark: { fleece: 0x342b26, skin: 0x27201c, re: 1 },
  lambCream: { fleece: 0xcdc3b1, skin: 0xc6bcaf, re: 0 }, lambGrey: { fleece: 0x897a69, skin: 0x5e5146, re: 1 },
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

// The pig's coat, over the source's pink Large White map: the map gives only
// its detail (luminance: hair, folds, wrinkles, the snout's disc); the colour
// comes from the bind-pose (pre-skinning) position in metres, so the belt
// stays put as the pig moves: dark slate or reddish-brown, or black with a
// pale, irregular band over the shoulders and forelegs, bristles catching
// the light at the silhouette, the legs muddied from the pen. The source's
// roughness and occlusion map are kept: a pig is not shiny.
function pigCoat(src, K) {
  const m = src.clone(); m.metalness = 0; m.envMapIntensity = 0.22;
  const a = new THREE.Color(K.pig), b = new THREE.Color(K.belt ?? K.pig), belt = K.belt != null ? 1 : 0;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, { uPigA: { value: a }, uPigB: { value: b }, uPigBelt: { value: belt } });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vPigP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPigP = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vPigP; uniform vec3 uPigA, uPigB; uniform float uPigBelt;
      float pigN(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        float n = dot(i, vec3(1., 57., 113.));
        #define PH(o) fract(sin(n + o) * 43758.5453)
        return mix(mix(mix(PH(0.), PH(1.), f.x), mix(PH(57.), PH(58.), f.x), f.y), mix(mix(PH(113.), PH(114.), f.x), mix(PH(170.), PH(171.), f.x), f.y), f.z); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
      {
        vec3 p = vPigP;   // metres: x across, y up from the hooves, z from tail (-0.71) to snout (+0.71)
        // the map's own light and shade, about its mean skin tone
        float d = clamp(pow(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)) / 0.315, 0.85), 0.2, 1.7);
        // coarse bristle, lying back along the body
        float br = pigN(vec3(p.x * 240., p.y * 240., p.z * 34.)) * 0.6 + pigN(vec3(p.x * 90., p.y * 90., p.z * 14.) + 5.3) * 0.4;
        d *= 0.8 + 0.4 * br;
        // the belt: from behind the jowls (z 0.35) to behind the elbows (z 0.03), ragged
        // white and black hairs mixed along the border
        float n = pigN(p * 9.0) + 0.5 * pigN(p * 23.0 + 3.1) - 0.75, zb = p.z + (br - 0.5) * 0.035;
        float zr = 0.03 + (0.62 - p.y) * 0.08 + n * 0.08, zf = 0.35 + (0.62 - p.y) * 0.05 + n * 0.06;
        float belt = uPigBelt * smoothstep(zr - 0.02, zr + 0.02, zb) * (1.0 - smoothstep(zf - 0.02, zf + 0.02, zb));
        vec3 c = mix(uPigA, uPigB, belt);
        // grey-brown bristle tips at grazing angles
        float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 3.0);
        c += vec3(0.03, 0.026, 0.022) * rim * (1.0 - 0.7 * belt);
        // the pen's mud on the legs
        c = mix(c, vec3(0.045, 0.032, 0.021), (1.0 - smoothstep(0.04, 0.22, p.y)) * (0.5 + 0.35 * pigN(p * 30.0)));
        diffuseColor.rgb = c * d;
      }`)
      // hair scatters the sheen: rougher still than the bare skin
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = mix(roughnessFactor, 1.0, 0.35);');
  };
  m.customProgramCacheKey = () => 'pig.skin';
  return m;
}

// The sheep's coat over the source's cream fleece map: the fleece and the
// short hair of face, ears and lower legs are told apart by bind-pose
// position (metres: the head at rest is up, z 0.36–0.58), so each keeps its
// own colour as the head goes down to graze; the fleece dulls towards the
// belly with the fold's muck. Wool is matte: roughness stays at 1.
function sheepCoat(src, K) {
  const m = src.clone(); m.metalness = 0; m.roughness = 1; m.envMapIntensity = 0.2;
  const f = new THREE.Color(K.fleece), k = new THREE.Color(K.skin), re = K.re || 0;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, { uShF: { value: f }, uShS: { value: k }, uShRe: { value: re } });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vShP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvShP = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vShP; uniform vec3 uShF, uShS; uniform float uShRe;')
      .replace('#include <map_fragment>', `#include <map_fragment>
      {
        vec3 p = vShP;
        float l = clamp(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)) / 0.37, 0.15, 1.8);
        // face and ears in front of the poll, and the legs below the belly
        float face = smoothstep(0.39, 0.45, p.z) * smoothstep(0.42, 0.5, p.y);
        float ears = smoothstep(0.065, 0.09, abs(p.x)) * smoothstep(0.33, 0.37, p.z) * smoothstep(0.58, 0.62, p.y);
        float skin = max(max(face, ears), 1.0 - smoothstep(0.15, 0.21, p.y));
        vec3 tint = mix(uShF * mix(0.72, 1.0, smoothstep(0.2, 0.42, p.y)), uShS, skin);
        diffuseColor.rgb = mix(diffuseColor.rgb * tint, vec3(l) * tint, uShRe);
      }`);
  };
  m.customProgramCacheKey = () => 'sheep.fleece';
  return m;
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

  // An animal as discs along its spine (offsets f and radius q, × its scale),
  // turned, and if need be moved up to a metre, until clear(discs) holds; no
  // random draws, so the rest of the herd keeps its places
  const settle = (x, z, ry0, s, f, q, clear) => {
    const discs = (px, pz, a) => f.map(k => [px + Math.sin(a) * k * s, pz + Math.cos(a) * k * s, q * s]);
    for (const d of [0, 0.25, 0.5, 0.75, 1]) for (let j = 0; j < (d ? 8 : 1); j++) for (let k = 0; k < 24; k++) {
      const px = x + d * Math.cos(j * Math.PI / 4), pz = z + d * Math.sin(j * Math.PI / 4), a = ry0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * Math.PI / 12;
      const D = discs(px, pz, a);
      if (clear(D)) return { at: [px, pz, a], D };
    }
    return { at: [x, z, ry0], D: discs(x, z, ry0) };
  };
  // inside the rectangle, off the blocks [cx, cz, half x, half z], off the laid
  const clearOf = (box, blocks, laid) => D => D.every(([x, z, q]) => x > box.x0 + q && x < box.x1 - q && z > box.z0 + q && z < box.z1 - q &&
    blocks.every(([bx, bz, hx, hz]) => Math.hypot(Math.max(0, Math.abs(x - bx) - hx), Math.max(0, Math.abs(z - bz) - hz)) > q) &&
    laid.every(E => E.every(([a, b, p]) => Math.hypot(a - x, b - z) > p + q)));

  // ---- sheep, lambs and goats in the folds -----------------------------
  {
    const inX0 = FOLDS.x0 + 1.5, inX1 = FOLDS.x1 - 1.5, inZ0 = FOLDS.z0 + 1.2, inZ1 = FOLDS.z1 - 1.2;
    const offPart = x => { for (let k = 1; k < 4; k++) { const px = FOLDS.x0 + k * (FOLDS.x1 - FOLDS.x0) / 4; if (Math.abs(x - px) < 0.7) return px + (x < px ? -0.75 : 0.75); } return x; };
    const spots = [];
    const free = (x, z, d) => spots.every(([a, b]) => Math.hypot(a - x, b - z) > d);
    // a sheep (1.16 m muzzle to tail at scale 1, lambs two-thirds) keeps clear
    // of the walls, the three partitions, the four feeding boxes along the open
    // front (outbuildings.js), the trough and hay rack (dressing.js) and the
    // flock already placed; goats walk about, so they are left as drawn
    const pw = (FOLDS.x1 - FOLDS.x0) / 4, laid = [];
    const fold = { x0: FOLDS.x0 + 0.35, x1: FOLDS.x1 - 0.35, z0: FOLDS.z0 + 0.35, z1: FOLDS.z1 - 0.1 };
    const blocks = [
      ...[1, 2, 3].map(k => [FOLDS.x0 + k * pw, (FOLDS.z0 + FOLDS.z1) / 2, 0.06, (FOLDS.z1 - FOLDS.z0 - 1) / 2]),
      ...[0, 1, 2, 3].map(k => [FOLDS.x0 + (k + 0.5) * pw, FOLDS.z1 - 1.2, 1.12, 0.27]),
      [FOLDS.x0 + 3, FOLDS.z0 + 1.2, 1.05, 0.3], [FOLDS.x0 + 8, FOLDS.z0 + 1.4, 1.05, 0.35],
    ];
    const clear = clearOf(fold, blocks, laid);
    const place = (sp, coats, n, dmin) => {
      for (let i = 0, tries = 0; i < n && tries < 200; tries++) {
        const x = offPart(inX0 + r() * (inX1 - inX0)), z = inZ0 + r() * (inZ1 - inZ0);
        if (!free(x, z, dmin)) continue;
        spots.push([x, z]); i++;
        // goats walk about their own pen (the partitions divide the fold in four)
        const pen = Math.min(3, Math.floor((x - FOLDS.x0) / pw));
        const roam = sp === 'goat' ? { x0: FOLDS.x0 + pen * pw + 0.8, x1: FOLDS.x0 + (pen + 1) * pw - 0.8, z0: inZ0, z1: inZ1 } : {};
        const ry0 = r() * Math.PI * 2, kind = r() < 0.5 ? 'graze' : 'stand', scale = 0.92 + r() * 0.14;
        let at = [x, z, ry0];
        if (sp !== 'goat') { const S = settle(x, z, ry0, scale * (sp === 'lamb' ? 0.66 : 1), [-0.44, -0.22, 0, 0.22, 0.44], 0.17, clear); at = S.at; laid.push(S.D); }
        add(sp, coats && coats[(i - 1) % coats.length], ...at, kind, { floorY: FLOOR, zone: 'folds', scale, ...roam });
      }
    };
    place('sheep', ['sheepCream', 'sheepCream', 'sheepGrey', 'sheepCream', 'sheepDark', 'sheepCream', 'sheepGrey', 'sheepCream', 'sheepGrey'], 9, 1.2);
    place('lamb', ['lambCream', 'lambGrey', 'lambCream'], 3, 0.8); place('goat', null, 3, 1.2);
  }

  // ---- pigs in the pens before the folds, by the blood vat -------------
  {
    const px0 = FOLDS.x0 + 0.9, px1 = FOLDS.x0 + 4.1, pz0 = FOLDS.z1 + 1.6, pz1 = FOLDS.z1 + 8.1;
    const ps = [];
    // a pig (1.42 m snout to tail at scale 1) as five discs along its spine;
    // each is turned, without new random draws, until it is clear of the
    // fence (x0…x0+5, z1+0.5…z1+9, outbuildings.js), the trough (dressing.js),
    // the two feeding boxes and the pigs already in the pen
    const pen = { x0: FOLDS.x0 + 0.12, x1: FOLDS.x0 + 4.88, z0: FOLDS.z1 + 0.62, z1: FOLDS.z1 + 8.88 };
    const blocks = [[FOLDS.x0 + 4, FOLDS.z1 + 3, 0.9, 0.35], [FOLDS.x0 + 1.4, FOLDS.z1 + 7.5, 0.85, 0.35], [FOLDS.x0 + 3.4, FOLDS.z1 + 7.5, 0.85, 0.35]];
    const laid = [], clear = clearOf(pen, blocks, laid);
    const PIGS = ['pigBlack', 'pigBrown', 'pigBelt', 'pigBlack', 'pigBrown', 'pigBlack'];
    for (let i = 0, t = 0; i < 6 && t < 200; t++) {
      const x = px0 + r() * (px1 - px0), z = pz0 + r() * (pz1 - pz0);
      if (ps.some(([a, b]) => Math.hypot(a - x, b - z) < 1.1)) continue;
      ps.push([x, z]); i++;
      const ry0 = r() * Math.PI * 2, kind = r() < 0.6 ? 'root' : 'stand', scale = 0.92 + r() * 0.16;
      const { at, D } = settle(x, z, ry0, scale, [-0.55, -0.27, 0, 0.27, 0.55], 0.2, clear);
      laid.push(D);
      add('pig', PIGS[i - 1], ...at, kind, { scale });
    }
    add('pig', 'pigBelt', BLOOD_JAR[0] + 4, BLOOD_JAR[1] + 4, 1.0, 'root');
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
      // a Biped head does not nod about its local x: the body's lateral axis
      // in the head's and neck's own frames, from the rest pose (head level)
      const side = n => { const o = scene.getObjectByName(n); return o && new THREE.Vector3(1, 0, 0).applyQuaternion(o.getWorldQuaternion(new THREE.Quaternion()).invert()); };
      const nod = K.nod === 'lateral' ? { head: side('Head'), neck: side('Neck') } : null;
      return { scene, clips: g.animations, bb, nod: nod?.head && nod?.neck ? nod : null };
    }));
    return tmpl.get(K.file);
  };
  const matCache = new Map();
  const coatMat = (src, coat) => {
    const key = src.uuid + ':' + coat;
    if (!matCache.has(key)) {
      if (src.name.startsWith('horse.')) {
        const m=src.clone();m.envMapIntensity=.24;m.roughness=src.name==='horse.eye'?.27:.84;
        if(src.name==='horse.eye')m.color.setHex(0x29241b);
        if (src.name==='horse.hair') { m.transparent=false;m.alphaTest=.4;m.alphaToCoverage=true;m.side=THREE.DoubleSide;m.depthWrite=true; }
        if (src.name!=='horse.eye') {
          const tint=src.name==='horse.hair' ? (coat==='chestnut'?[.68,.4,.27]:[.20,.18,.17]) :
            ({black:[.29,.30,.32],bay:[.95,.80,.68],chestnut:[1.16,.85,.67],grey:[1.9,1.82,1.72]}[coat] || [1,1,1]);
          const sat=coat==='black'||coat==='grey'?.08:.72;
          m.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>\n{ float horseL=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=mix(vec3(horseL),diffuseColor.rgb,${sat})*vec3(${tint.join(',')}); }`);};
          m.customProgramCacheKey=()=>src.name+':'+coat;
        }
        matCache.set(key,m);return m;
      }
      if (src.name === 'pig.skin') { const m = pigCoat(src, COATS[coat] || COATS.pigBlack); matCache.set(key, m); return m; }
      if (src.name === 'sheep.fleece') { const m = sheepCoat(src, COATS[coat] || COATS.sheepCream); matCache.set(key, m); return m; }
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
    // The authored horse is already metric; fitting the ears' bounding box
    // would change its withers height and its reach to the manger.
    const h = T.bb.max.y - T.bb.min.y, s = (K.metric ? K.base || 1 : K.h / h) * (a.scale || 1);
    body.scale.setScalar(s);
    body.position.y = -T.bb.min.y * s;
    body.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; o.material = coatMat(o.material, a.coat);
      if(K.metric && o.isSkinnedMesh){o.computeBoundingSphere();o.boundingSphere.radius+=.45;o.frustumCulled=true;}
    } });
    a.g.add(body);
    a.body = body;
    // Metric imports have no target-height override. Keep the fitted model's
    // measured height for its audible mouth position as well as its scale.
    a.soundHeight = h * s;
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
    if (T.nod && a.head && a.neck) { a.nodHead = T.nod.head; a.nodNeck = T.nod.neck; }
    if (K.headScale && a.head) a.head.scale.setScalar(K.headScale);
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
      const c = animals.filter(a => a.body && a.g.visible && want.includes(a.species) && a.g.position.distanceTo(cam) < near);
      if (!c.length) return null;
      const a = c[Math.floor(Math.random() * c.length)];
      this.last = a;
      const H = a.soundHeight;
      return [a.g.position.x, a.g.position.y + H * 0.8, a.g.position.z];
    },
    // head up (a snort, a bleat, a low) or down (a grunt, a peck)
    cue(bank) {
      const a = this.last; if (!a || !a.head) return false;
      // (a pig, often rooting already, lifts its snout to grunt)
      a.cue = 1; a.cueDir = a.species === 'pig' || !/grunt|cluck|chew|cowChew/.test(bank) ? 1 : -1;
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
        if (a.nodHead) { a.neck.quaternion.multiply(_q.setFromAxisAngle(a.nodNeck, -0.6 * k)); a.head.quaternion.multiply(_q.setFromAxisAngle(a.nodHead, -0.5 * k)); }
        else { _e.set(-k, 0, 0); a.head.quaternion.multiply(_q.setFromEuler(_e)); }
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
