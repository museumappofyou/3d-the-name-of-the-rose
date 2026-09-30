import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeMaterials, shared, setAnisotropy } from './core/materials.js';
import { AED } from './core/plan.js';
import { Atmosphere, HOURS } from './systems/sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { buildTerrain, terrainCollider, buildSea, addSink, addPaths, getMask, paintPlots, paintGround, groundAt, setTerrainStraw, baseHeight, ROAD } from './world/terrain.js';
import { groundFeatures } from './world/ground.js';
import { buildThresholds } from './world/thresholds.js';
import { buildAedificium } from './world/aedificium.js';
import { buildChurch } from './world/church.js';
import { buildClaustrum } from './world/claustrum.js';
import { buildOutbuildings } from './world/outbuildings.js';
import { buildNature } from './world/nature.js';
import { buildGardens } from './world/gardens.js';
import { buildAnimals } from './world/animals.js';
import { buildSoundscape } from './world/soundscape.js';
import { buildPeople } from './world/people.js';
import { buildDressing } from './world/dressing.js';
import { Walker } from './systems/player.js';
import { Aerial } from './systems/aerial.js';
import { Effects } from './systems/effects.js';
import { Sound, BELL_TOWER } from './systems/audio.js';
import { officeAt, phaseAt } from './systems/horarium.js';
import { zoneAt } from './systems/zones.js';
import { UI } from './ui/ui.js';
import { PLACES, byId } from './data/places.js';
import { Notebook, NOTES } from './systems/notes.js';
import { OSSUARY_PATH } from './world/church.js';

const tick = () => new Promise(r => setTimeout(r, 0));
const SURFACES = ['terrain', 'stone', 'stoneOut'];
const params = new URLSearchParams(location.search);

class App {
  constructor() {
    this.mode = 'aerial';
    this.cut = 0;
    this.weather = 'clear';
    this.quality = 'high';
    this.qualityIndex = matchMedia('(pointer: coarse)').matches ? 1 : 0;
    this.lantern = false;
    this.timeTarget = null;
    this.indoor = 0;
  }

  async init() {
    const canvas = document.getElementById('scene');
    this.canvas = canvas;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.localClippingEnabled = true;
    setAnisotropy(Math.min(8, r.capabilities.getMaxAnisotropy()));
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.08, 14000);
    this.camera.position.set(-160, 120, 180);
    const M = this.M = makeMaterials();
    this.atmo = new Atmosphere(r, this.scene);
    this.aerial = new Aerial(this.camera, canvas);
    this.walker = new Walker(this.camera, canvas);
    this.sound = new Sound();
    this.notes = new Notebook();
    this.ui = new UI(this);
    this.ui.loader(0.05, 'Laying the foundations…');
    this.emitters = []; this.interactables = []; this.doors = [];
    const ctx = this.ctx = {
      scene: this.scene, anchors: {}, trees: [], plots: [], paths: [], ground: [],
      emit: o => this.emitters.push(o),
      interact: o => this.interactables.push(o),
      sink: (poly, depth, band) => addSink(poly, depth, band),
      addDynamic: (obj, geo) => this.walker.addDynamic(obj, geo),
      door: o => this.doors.push(o),
      // per-frame hooks of living things (people, animals): f(dt, state)
      updaters: [], onUpdate: f => ctx.updaters.push(f),
      // ambient sound sources: registered now, sounding once audio starts
      sound: this.sound,
    };
    this.colliders = [];
    this.groups = [];
    const addBatches = (list, tag) => {
      for (const b of list) {
        const g = b.build(M); g.userData.tag = tag; g.userData.interior = /interior|ground|scriptorium|library|ossuary/.test(b.name); g.userData.name = b.name;
        this.scene.add(g); this.groups.push(g);
        const c = b.colliderGeometry(); if (c) this.colliders.push(c);
      }
    };
    const steps = [
      ['Raising the Aedificium: kitchen, scriptorium, fifty-six rooms…', () => { this.aed = buildAedificium(M, ctx); addBatches(this.aed.batches, 'aed'); }],
      ['Carving the portal of the church…', () => { this.church = buildChurch(M, ctx); addBatches(this.church.batches, 'church'); }],
      ['Building the cloister, the dormitory, the chapter house…', () => { addBatches(buildClaustrum(M, ctx).batches, 'claustrum'); }],
      ['Stables, smithy, mills and the walls…', () => { addBatches(buildOutbuildings(M, ctx).batches, 'out'); }],
      ['Planting the gardens under the snow…', () => { const nat = buildNature(M, ctx); this.nature = nat; addBatches(nat.batches, 'nature'); addBatches(buildGardens(M, ctx).batches, 'gardens'); buildAnimals(M, ctx); }],
      ['Furnishing the workrooms, calling the brothers…', () => { addBatches(buildDressing(M, ctx).batches, 'dressing'); addBatches(buildPeople(M, ctx).batches, 'people'); }],
      ['Shaping the mountain…', () => {
        addPaths(ctx.paths);
        const mask = getMask();
        paintPlots(mask, ctx.plots.filter(p => p.kind === 'soil' || p.kind === 'bed'), 'g');
        paintPlots(mask, ctx.plots.filter(p => p.kind === 'yard'), 'b');
        paintGround([...groundFeatures(), ...ctx.ground]);
        setTerrainStraw(M.straw.map);
        this.terrain = buildTerrain(); this.scene.add(this.terrain); this.scene.add(buildSea());
        this.colliders.push(terrainCollider());
      }],
      ['Tracing the paths of the walker…', () => {
        const mergeCol = () => mergeGeometries(this.colliders.map(g => { const c = new THREE.BufferGeometry(); c.setAttribute('position', g.attributes.position); return c; }), false);
        this.walker.setStatic(mergeCol());
        // steps at every door whose floor stands above the ground outside
        const th = buildThresholds(this.doors, (x, z, from) => this.groundY(x, z, from));
        this.thresholds = th.steps;
        addBatches([th.batch], 'out');
        this.walker.colliders.shift();
        this.walker.setStatic(mergeCol());
        // what each collision triangle is made of, for the footsteps
        const codes = new Uint8Array(this.colliders.reduce((n, g) => n + g.attributes.position.count / 3, 0));
        let at = 0;
        for (const g of this.colliders) {
          for (const [k, n] of g.userData.surfaces || [['terrain', g.attributes.position.count / 3]]) {
            let c = SURFACES.indexOf(k); if (c < 0) { SURFACES.push(k); c = SURFACES.length - 1; }
            codes.fill(c, at, at + n); at += n;
          }
        }
        this.surfCodes = codes;
        // the great fires (hearths, ovens, forges) also sound
        ctx.fires = this.emitters.filter(e => !e.small && e.intensity >= 6).map(e => ({ x: e.x, y: e.y, z: e.z, zone: zoneAt(e.x, e.y + 0.3, e.z).id }));
        buildSoundscape(this.sound, ctx);
        this.effects = new Effects(this.scene, this.emitters);
        this.effects.addSmokeSources([[-96, 7.8, 0], [34, 10.6, 25.5], [-39, 7.8, 57.5], [82, 8.5, 53]], 0.5);
      }],
    ];
    // the painted scrolls need the blackletter face before they are drawn
    try { await Promise.race([Promise.all(['500 60px "Grenze Gotisch"', '600 30px "Grenze Gotisch"', '400 40px "Maguntia"'].map(f => document.fonts.load(f))), new Promise(r => setTimeout(r, 2500))]); } catch (e) { /* fall back */ }
    for (let i = 0; i < steps.length; i++) {
      this.ui.loader(0.08 + 0.85 * i / steps.length, steps[i][0]);
      await tick();
      steps[i][1]();
    }
    // lights: a pool assigned to the nearest flames, and the lantern
    this.pool = Array.from({ length: 8 }, () => { const l = new THREE.PointLight(0xffaa66, 0, 10, 2); this.scene.add(l); return l; });
    this.lamp = new THREE.PointLight(0xffcf98, 0, 20, 1.5); this.scene.add(this.lamp);
    // clipping for the cutaway views of the Aedificium
    this.clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e5);
    this.clipMats = new Map();
    for (const g of this.groups) if (g.userData.tag === 'aed') g.traverse(o => { if (o.isMesh) o.material = this.clipMat(o.material); });
    this.aed.lib.mirror.group.traverse(o => { if (o.isMesh && !o.userData.reflector) o.material = this.clipMat(o.material); });

    this.sound.bellPos = BELL_TOWER;
    this.walker.onStep = (feet, run) => { const s = this.surfaceUnder(feet); this.lastSurface = s; this.sound.step(s, run); };
    this.walker.onFall = () => this.walkTo(byId.gate);
    this.setupCurfew();
    this.setupPost();
    this.bindInput();
    this.fit(); addEventListener('resize', () => this.fit());

    // initial state from the address
    const t = parseFloat(params.get('time'));
    this.atmo.set(isFinite(t) ? t : 9.3, true);
    this.ui.updateTime(this.atmo.time);
    if (params.get('weather')) this.ui.setWeatherIndex(params.get('weather'));
    this.home(0.01);
    const pid = params.get('place');
    if (pid && byId[pid]) { this.ui.select(pid); if (params.get('mode') === 'walk') setTimeout(() => this.walkTo(byId[pid]), 300); }

    this.clock = new THREE.Clock();
    this.renderer.setAnimationLoop(() => this.frame());
    this.ui.loader(1, 'Stat rosa pristina nomine.');
    window.__abbey = this;
    if (params.has('debug')) import('./debug.js').then(m => m.installDebug(this));
  }

  // height of the ground (terrain or floor) at x,z: a ray down the collider
  groundY(x, z, from = 40) {
    const geo = this.walker.colliders[0].mesh.geometry;
    const ray = new THREE.Ray(new THREE.Vector3(x, from, z), new THREE.Vector3(0, -1, 0));
    const hit = geo.boundsTree.raycastFirst(ray, THREE.DoubleSide, 0, 200);
    return hit ? hit.point.y : baseHeight(x, z);
  }
  // the ground under the walker's feet: the material of the collision
  // triangle below, or out of doors the snow, mud or straw of the masks
  surfaceUnder(feet) {
    const geo = this.walker.colliders[0].mesh.geometry;
    this._ray = this._ray || new THREE.Ray();
    this._ray.origin.set(feet.x, feet.y + 0.45, feet.z); this._ray.direction.set(0, -1, 0);
    const hit = geo.boundsTree.raycastFirst(this._ray, THREE.DoubleSide, 0, 1.3);
    let s = 'terrain';
    if (hit) { const tri = Math.floor(geo.index.array[hit.faceIndex * 3] / 3); s = SURFACES[this.surfCodes[tri]] || 'stone'; }
    const snow = shared.uSnow.value;
    if (s === 'terrain') return groundAt(feet.x, feet.z, snow);
    if (s === 'stoneOut') return this.weather === 'snow' ? 'snowPacked' : this.weather === 'fog' ? 'stoneWet' : (Math.sin(feet.x * 1.3) * Math.sin(feet.z * 1.7) > 0.3 ? 'snowPacked' : 'stoneWet');
    return s;
  }

  // post: ambient occlusion in the corners, then tone mapping and a
  // restrained grade (cool shadows, warm lamplight, a little grain)
  setupPost() {
    const r = this.renderer, size = r.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
    const c = this.composer = new EffectComposer(r, rt);
    c.addPass(new RenderPass(this.scene, this.camera));
    const ao = this.gtao = new GTAOPass(this.scene, this.camera, size.x, size.y);
    ao.updateGtaoMaterial({ radius: 0.85, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: 12, distanceFallOff: 1.0 });
    ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, radiusExponent: 1, rings: 2, samples: 12 });
    ao.blendIntensity = 0.9;
    c.addPass(ao);
    c.addPass(new OutputPass());
    this.grade = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: 0.022 }, uTone: { value: 1 }, uWarm: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uGrain, uTone, uWarm; varying vec2 vUv;
        void main(){ vec4 c = texture2D(tDiffuse, vUv); vec3 x = c.rgb;
          x = mix(x, x*x*(3.0-2.0*x), 0.16);
          float l = dot(x, vec3(0.299,0.587,0.114));
          x += (vec3(-0.014,-0.002,0.018)*(1.0-l) + vec3(0.014,0.006,-0.012)*l*(1.0+uWarm)) * uTone;
          x = mix(vec3(l), x, 0.9);
          float g = fract(sin(dot(floor(gl_FragCoord.xy) + fract(uTime)*vec2(113.0,71.0), vec2(12.9898,78.233)))*43758.5453) - 0.5;
          x += g * uGrain * (1.2 - l);
          gl_FragColor = vec4(x, c.a); }`,
    });
    c.addPass(this.grade);
    this.usePost = true;
  }
  render() {
    if (this.usePost && this.composer && !this.cut) { this.grade.uniforms.uTime.value = shared.uTime.value; this.composer.render(); }
    else this.renderer.render(this.scene, this.camera);
  }

  clipMat(m) {
    if (!this.clipMats.has(m)) {
      const c = m.clone();
      if (m.onBeforeCompile) { c.onBeforeCompile = m.onBeforeCompile; c.customProgramCacheKey = m.customProgramCacheKey; }
      c.clippingPlanes = [this.clip]; c.clipShadows = true;
      c.userData.side = m.side;
      this.clipMats.set(m, c);
    }
    return this.clipMats.get(m);
  }

  fit() {
    const fp = params.get('frame');
    const [w, h] = fp ? fp.split('x').map(Number) : [innerWidth, innerHeight];
    this.renderer.setSize(w, h, !fp);
    if (fp) { this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px'; }
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    if (this.composer) { this.composer.setPixelRatio(this.renderer.getPixelRatio()); this.composer.setSize(w, h); }
    if (this.effects) this.effects.smokeU.uScale.value = this.effects.glowU.uScale.value = h;
  }

  setQuality(q) {
    this.quality = q;
    const dpr = Math.min(devicePixelRatio, 2);
    this.renderer.setPixelRatio(q === 'high' ? Math.min(dpr, 1.6) : q === 'balanced' ? Math.min(dpr, 1.2) : 1);
    const size = q === 'high' ? 4096 : q === 'balanced' ? 2048 : 1024;
    this.usePost = q !== 'low';
    const sh = this.atmo?.sun.shadow;
    if (sh && sh.mapSize.x !== size) { sh.mapSize.set(size, size); sh.map?.dispose(); sh.map = null; }
    this.fit?.();
  }

  // --- navigation --------------------------------------------------------------
  home(dur = 2.6) {
    this.setFire?.(false);
    this.setMode('aerial', true);
    this.setCut(0);
    this.aerial.flyTo([28, 4, -16], [-120, 98, 132], dur);
    this.ui.closeFolio();
  }
  showPlace(p, hour) {
    this.setFire(!!p.fire);
    if (p.hour != null && hour == null) hour = p.hour;
    if (hour != null) this.setTime(hour, true);
    if (this.mode === 'walk') { this.walkTo(p); setTimeout(() => this.ui.toast('Study jump: carried to ' + p.en + '. Nothing on the way is noted.', 3800), 50); return; }
    this.setCut(p.cut || 0);
    this.aerial.flyTo(p.view.t, p.view.p, 2.4);
  }
  spawnOf(p) {
    const w = p.walk;
    if (w.road) { const q = ROAD[12]; return { x: q[0], y: baseHeight(q[0], q[1]) + 0.5, z: q[1], yaw: Math.atan2(-(-105 - q[0]), -(-8.6 - q[1])) }; }
    let y = w.y !== undefined ? w.y + 0.05 : baseHeight(w.x, w.z) + 0.45;
    // an upper-floor spawn settles on the floor actually built under it (a
    // ray from just above the stated height), so a raised floor can never
    // leave the feet inside or below it
    if (w.y !== undefined && this.walker.colliders[0]) { const f = this.groundY(w.x, w.z, w.y + 1.0); if (Math.abs(f - w.y) < 1.2) y = f + 0.05; }
    return { x: w.x, y, z: w.z, yaw: w.yaw || 0, pitch: w.pitch || 0 };
  }
  walkTo(p) {
    const s = this.spawnOf(p);
    this.setCut(0);
    if (this.mode !== 'walk') {
      this.mode = 'transition';
      this.ui.setMode('walk');
      const eye = [s.x, s.y + 1.62, s.z];
      const look = [s.x - Math.sin(s.yaw) * 6, s.y + 1.5, s.z - Math.cos(s.yaw) * 6];
      this.aerial.flyTo(look, eye, 2.2, () => this.enterWalk(s));
    } else this.enterWalk(s);
  }
  enterWalk(s) {
    // any placement of the walker (Index, plan, Walk here, the address) is a
    // study jump: nothing between here and there counts as walked
    this.teleportT = performance.now(); this._passage = null;
    this.walker.setFeet(s.x, s.y, s.z, s.yaw);
    if (s.pitch) this.walker.pitch = s.pitch;   // a spawn may look up (the portal)
    this.walker.enabled = true; this.aerial.enabled = false;
    this.mode = 'walk'; this.ui.setMode('walk');
    this.zone = null;
    document.getElementById('folio').hidden = true; document.body.classList.remove('reading');
    this.ui.toast('Click the view to look around · W A S D to walk · P to fly', 4200);
  }
  setMode(m, silent) {
    if (m === this.mode || (this.mode === 'transition' && m === 'walk')) return;
    if (m === 'walk') {
      const t = this.aerial.controls.target;
      let best = PLACES[0], bd = Infinity;
      for (const p of PLACES) { const d = Math.hypot(p.walk.x - t.x, p.walk.z - t.z) + (p.walk.y !== undefined ? 25 : 0); if (d < bd) { bd = d; best = p; } }
      this.walkTo(best);
      return;
    }
    const pos = this.camera.position.clone();
    this.walker.enabled = false;
    this.releasePointer();
    this.mode = 'aerial'; this.aerial.enabled = true;
    this.ui.setMode('aerial'); this.closeMirror();
    const dir = new THREE.Vector3(); this.camera.getWorldDirection(dir); dir.y = 0; dir.normalize();
    const target = pos.clone().addScaledVector(dir, 10);
    if (!silent) this.aerial.flyTo(target.toArray(), [pos.x - dir.x * 45, pos.y + 38, pos.z - dir.z * 45], 1.8);
    this.lamp.intensity = 0;
  }
  setFire(on) {
    if (on === !!this.fireOn) return;
    this.fireOn = on;
    this.effects.setFire(on);
    if (!this.fireLight) { this.fireLight = new THREE.PointLight(0xff6a20, 0, 220, 1.2); this.fireLight.position.set(AED.x, AED.ridge + 12, AED.z); this.scene.add(this.fireLight); }
    if (on) this.ui.toast('The Aedificium burns: the library is a pyre.', 5000);
  }
  releasePointer() { if (document.pointerLockElement) document.exitPointerLock(); }
  setCut(level) {
    this.cut = level;
    this.clip.constant = [1e5, AED.y0 + 2.6, AED.y1 + 2.6, AED.y2 + 1.85][level];
    for (const m of this.clipMats.values()) { m.side = level ? THREE.DoubleSide : (m.userData.side ?? THREE.FrontSide); m.needsUpdate = true; }
    this.ui.setCut(level);
  }
  setTime(t, animate) {
    if (animate) { this.timeTarget = ((t % 24) + 24) % 24; this.sound.bell(this.hourBells(t)); }
    else { this.timeTarget = null; this.atmo.set(t); this.ui.updateTime(this.atmo.time); }
  }
  hourBells(t) { const i = HOURS.findIndex(h => Math.abs(h.t - t) < 0.05); return i < 0 ? 1 : [3, 2, 1, 1, 2, 1, 3, 2][i]; }
  setWeather(w) { this.weather = w; this.atmo.setWeather(w); shared.uSnow.value = w === 'snow' ? 0.62 : 0.42; }
  toggleSound() { return this.sound.toggle(); }
  marker() {
    if (this.mode !== 'walk') { const t = this.aerial.controls.target, d = new THREE.Vector3(); this.camera.getWorldDirection(d); return { x: t.x, z: t.z, yaw: Math.atan2(-d.x, -d.z) }; }
    return { x: this.camera.position.x, z: this.camera.position.z, yaw: this.walker.yaw };
  }

  // --- input -------------------------------------------------------------------
  bindInput() {
    this.canvas.addEventListener('click', () => { if (this.mode === 'walk' && !this.mirrorOpen) this.walker.lock(); });
    addEventListener('keydown', e => {
      if (e.repeat) return;
      if (e.code === 'KeyE' && this.mode === 'walk') this.act();
      if (e.code === 'KeyF' && this.mode === 'walk') { this.lantern = !this.lantern; this.ui.toast(this.lantern ? 'You light the lantern' : 'The lantern is out', 1800); }
      if (e.code === 'KeyP') this.setMode(this.mode === 'walk' ? 'aerial' : 'walk');
      if (e.code === 'KeyN') this.setTime(this.atmo.time < 6 || this.atmo.time > 18 ? 12 : 23, true);
      if (this.mirrorOpen && (e.code === 'KeyQ' || e.code === 'KeyR')) this.pressLetter(e.code === 'KeyQ' ? 23 : 29, e.code === 'KeyQ' ? 'q' : 'r');
      if (e.code === 'Escape' && this.mirrorOpen) this.closeMirror();
    });
    const stick = document.getElementById('stick'), knob = stick.firstElementChild;
    let id = null;
    stick.addEventListener('touchstart', e => { id = e.changedTouches[0].identifier; e.preventDefault(); }, { passive: false });
    stick.addEventListener('touchmove', e => {
      for (const t of e.changedTouches) if (t.identifier === id) {
        const r = stick.getBoundingClientRect(), dx = (t.clientX - r.left - r.width / 2) / (r.width / 2), dy = (t.clientY - r.top - r.height / 2) / (r.height / 2);
        const l = Math.min(1, Math.hypot(dx, dy)), a = Math.atan2(dy, dx);
        this.walker.touch.x = Math.cos(a) * l; this.walker.touch.y = -Math.sin(a) * l;
        knob.style.transform = `translate(${Math.cos(a) * l * 36}px, ${Math.sin(a) * l * 36}px)`;
      }
      e.preventDefault();
    }, { passive: false });
    stick.addEventListener('touchend', () => { this.walker.touch.x = this.walker.touch.y = 0; knob.style.transform = ''; });
    document.getElementById('touchAct').onclick = () => this.act();
  }

  // --- interactions ----------------------------------------------------------------
  // F17: after Compline the Aedificium is barred from within and only the
  // ossuary way remains (k0491/k0492 H, k1423/k1427/k1428 M: Malachi closes
  // the doors; William and Adso get in by the skull altar). The bars drop
  // for someone already inside, who can always unbar the door to leave.
  setupCurfew() {
    this.curfew = [];
    for (const d of this.doors) {
      if (d.id !== 'aed:south' && d.id !== 'aed:kitchen') continue;
      const th = d.th || 1.2, geo = new THREE.BoxGeometry((d.w || 2.1) + 0.5, 4.2, 0.3);
      geo.rotateY(Math.atan2(d.nx, d.nz));
      geo.translate(d.x - d.nx * (th / 2 - 0.2), d.y + 2.1, d.z - d.nz * (th / 2 - 0.2));
      const mesh = new THREE.Mesh(geo); mesh.visible = false; mesh.name = 'curfew:' + d.id;
      this.scene.add(mesh); mesh.updateMatrixWorld(true);
      const c = this.walker.addDynamic(mesh, geo); c.enabled = false;
      const leaves = (this.aed.doorLeaves || []).find(l => l.id === d.id);
      this.curfew.push({ d, c, leaves, shut: 0 });
    }
  }
  updateCurfew(dt) {
    if (!this.curfew?.length) return;
    const t = this.atmo.time, night = t >= 19.2 || t < 5.2;
    const f = this.walker.feet, inside = this.mode === 'walk' && ['kitchen', 'refectory', 'scriptorium', 'library'].includes(zoneAt(f.x, f.y + 0.3, f.z).id);
    for (const q of this.curfew) {
      q.c.enabled = night && !inside;
      q.shut += ((night ? 1 : 0) - q.shut) * Math.min(1, dt * 1.5);
      if (q.leaves) for (const p of q.leaves.pivots) p.rotation.y = q.leaves.open + (q.leaves.closed - q.leaves.open) * q.shut;
      if (q.c.enabled && this.mode === 'walk' && Math.hypot(f.x - q.d.x, f.z - q.d.z) < 3.2) {
        if (!q.told || performance.now() - q.told > 20000) { q.told = performance.now(); this.ui.toast('The door is barred from within. After Compline Malachi closes the Aedificium; only the way under the church remains.', 5500); }
        this.note('barred');
      }
      // the same door by day, once it has been found barred at night
      if (!night && this.mode === 'walk' && this.notes.has('barred') && Math.hypot(f.x - q.d.x, f.z - q.d.z) < 3.2) this.noteMore('barred');
    }
    // the library by night (k1419/k1457 M, k1482 M)
    const inLib = this.mode === 'walk' && this.zone?.id === 'library';
    if (inLib && !this._inLib && (t >= 18.6 || t < 5.2)) this.ui.toast('No one may enter the library at night: only the librarian knows its way.', 5000);
    this._inLib = inLib;
  }

  nearest() {
    const cam = this.camera.position, dir = new THREE.Vector3(); this.camera.getWorldDirection(dir);
    let best = null, bs = -Infinity;
    for (const it of this.interactables) {
      const d = it.pos.distanceTo(cam);
      if (d > it.radius) continue;
      const small = it.radius < 4;
      const facing = it.pos.clone().sub(cam).normalize().dot(dir);
      if (small && facing < 0.3 && d > 1.3) continue;
      const score = (small ? 2 : 0) + facing - d / it.radius;
      if (score > bs) { bs = score; best = it; }
    }
    return best;
  }
  act() {
    const it = this.current; if (!it) return;
    const T = (s, ms) => this.ui.toast(s, ms || 6000);
    if (it.altar) {
      it.altar.target = it.altar.target ? 0 : 1;
      this.sound.creak();
      const tx = it.altar.text;
      T(tx ? (it.altar.target ? tx.open : tx.close) : it.altar.target ? 'You press the eyes of the fourth skull from the right. The altar turns on a hidden pivot: damp steps go down into the dark.' : 'The altar turns back into place.');
      return;
    }
    if (it.mirror) {
      if (it.mirror.target) { T('The mirror stands open onto the finis Africae.'); return; }
      this.mirrorOpen = true; this.releasePointer(); this.ui.showMirror(true); this.mirrorState = it.mirror; this.pressed = [];
      return;
    }
    if (it.vision) { this.vision(); return; }
    const lines = {
      catalogue: 'The catalogue: “iii, IV gradus, V in prima graecorum; ii, V gradus, VII in tertia anglorum”. Some shelf marks read “finis Africae” — those books are lost.',
      'adelmo-desk': 'Adelmo’s psalter leaf, still fastened to the desk: in the margins a world upside down — dogs fleeing hares, deer hunting lions, a monkey with antlers.',
      'venantius-desk': 'Venantius’s desk, its back to the warm flue: a Greek book on the rest, loose Latin sheets on the low shelf.',
      'jorge-stool': 'Jorge often sat here by the fire, listening to Malachi’s steps in the straw as he climbed to the library.',
      'ossuary-door': 'An iron-clad wooden door. Behind it, steps go down into the ossuary, toward the church.',
      poetics: 'A worn binding with light metal bands. The Greek leaves are soft linen paper; their upper corners stick together… Do not wet your finger.',
      'de-bestiis': 'De bestiis, open at a unicorn painted in the French manner. Beside it, the Liber monstrorum de diversis generibus.',
      armillary: 'A sphere of brass and silver rings on a short tripod, a gold cross above — heavy enough to kill a man.',
      'blood-jar': 'Fresh pig’s blood in the great jar, stirred so it will not clot; in this cold it keeps for days.',
      laboratory: 'Rows of bottles, jugs and stoppered jars on the shelves by the door; alembics on the table. The jars hold dried herbs.',
      bells: 'You pull the rope; the bell answers from the tower.',
      tripod: '“A single lamp on a huge bronze tripod, two men tall.” It burns all night.',
      plaque: 'A blind wall of great squared stones and an old plaque of worn monograms. Behind it, knocking — a stair hidden in the thickness of the wall.',
      'william-cell': 'Wine, cheese, olives, bread and good raisins on the table; fresh straw in the niche for Adso.',
    };
    if (it.id === 'bells') this.sound.bell(2, 174);
    if (it.id === 'severinus') {
      // the one named response (claim_000309 / claim_000303, paraphrased)
      T('Severinus straightens from the frozen beds. What he gathers here, he says, he dries and keeps ready in jars in his laboratory.', 7500);
      this.note('herb-jars', { by: 'severinus' });
      return;
    }
    const noted = { catalogue: 'shelf-marks', 'blood-jar': 'blood-vat', laboratory: 'herb-jars' }[it.id];
    if (lines[it.id]) { T(lines[it.id], 8000); if (noted) setTimeout(() => this.note(noted), 900); return; }
    T(it.label, 4000);
    const zp = this.zone?.place && byId[this.zone.place];
    if (zp) this.ui.select(zp.id, { fly: false });
  }
  pressLetter(i, ch, btn) {
    if (!this.mirrorState) return;
    const ok = (i === 23 && ch === 'q') || (i === 29 && ch === 'r');
    const b = btn || document.querySelector(`#verseLetters button[data-i="${i}"]`);
    if (!ok) { this.ui.toast('Nothing. The letter does not move.', 2000); this.pressed = []; document.querySelectorAll('#verseLetters button').forEach(x => x.classList.remove('pressed')); return; }
    b?.classList.add('pressed');
    this.sound.chime();
    if (!this.pressed.includes(ch)) this.pressed.push(ch);
    if (this.pressed.length === 2) {
      this.mirrorState.target = 1; this.sound.creak();
      this.ui.toast('The q clicks, then the r. The frame shakes and the glass springs back: the mirror is a door, and it swings toward you.', 6500);
      setTimeout(() => this.closeMirror(), 900);
    } else this.ui.toast('A dry click inside the wall…', 1800);
  }
  closeMirror() { this.mirrorOpen = false; this.ui.showMirror(false); }
  // --- the notebook ---------------------------------------------------------------
  note(id, extra) {
    if (!this.notes.add(id, extra)) return false;
    this.ui.noteCue(NOTES[id]?.title || id);
    this.sound.noteCue?.();
    return true;
  }
  noteMore(id) {
    const n = NOTES[id];
    if (!n?.more || !this.notes.has(id) || !this.notes.add(n.more.id)) return false;
    this.ui.noteCue(n.title + ' · ' + n.more.where);
    this.sound.noteCue?.();
    return true;
  }
  // The passage under the altar is noted only when walked: the altar turned
  // (E), the player seen standing by it, then going down the steps without
  // any study jump in between. From there each point of the passage reached
  // on foot extends the red line on the plan.
  trackPassage(f, zid) {
    const now = performance.now(), altar = this.church.altar;
    if (zid === 'skull' && altar.target === 1 && f.y > -0.4) this._atAltar = now;
    const below = f.y < -1.0;
    if (!this._passage && below && this._atAltar > (this.teleportT || 0) && now - this._atAltar < 45000 && Math.hypot(f.x - OSSUARY_PATH[0][0], f.z - OSSUARY_PATH[0][1]) < 4.5) {
      this._passage = { i: 0 };
      this.note('altar-passage');
      this.notes.routeTo(0);
    }
    if (this._passage && below) {
      const i = this._passage.i + 1;
      if (i < OSSUARY_PATH.length && Math.hypot(f.x - OSSUARY_PATH[i][0], f.z - OSSUARY_PATH[i][1]) < 2.6) { this._passage.i = i; this.notes.routeTo(i); }
    }
  }
  vision() {
    this.visionT = 11;
    document.getElementById('vision').style.opacity = 1;
    this.ui.toast('The monster’s scales become a forest… the ceiling bends down, a hiss of a thousand snakes. — “Magic herbs, burned to frighten the curious.”', 9000);
  }

  // --- the frame ---------------------------------------------------------------------
  frame() {
    const dt = Math.min(this.clock.getDelta(), 0.1);
    shared.uTime.value += dt;
    const T = shared.uTime.value;
    if (this.timeTarget != null) {
      let d = this.timeTarget - this.atmo.time; if (d > 12) d -= 24; if (d < -12) d += 24;
      if (Math.abs(d) < 0.02) { this.atmo.set(this.timeTarget); this.timeTarget = null; }
      else this.atmo.set(this.atmo.time + Math.sign(d) * Math.min(Math.abs(d), dt * Math.max(2.5, Math.abs(d) * 1.8)));
      this.ui.updateTime(this.atmo.time);
    }
    if (this.mode === 'walk') this.walker.update(dt); else this.aerial.update(dt);
    this.church.altar.update(dt);
    this.updateCurfew(dt);
    this.nature?.forest?.update(this.camera);
    {
      const t = this.atmo.time, st = this._life || (this._life = {});
      st.time = t; st.cam = this.camera.position; st.mode = this.mode; st.night = this.atmo.night; st.zone = this.zone?.id || null;
      st.office = officeAt(t); st.phase = phaseAt(t); st.weather = this.weather; st.fire = !!this.fireOn;
      for (const f of this.ctx.updaters) f(dt, st);
    }
    this.aed.lib.mirror.update(dt);
    { const mg = this.aed.lib.mirror.glass; const p = mg.getWorldPosition(new THREE.Vector3()); mg.visible = this.mode === 'walk' && p.distanceTo(this.camera.position) < 16; }

    const cam = this.camera.position;
    let indoor = false;
    if (this.mode === 'walk') {
      const f = this.walker.feet;
      const z = zoneAt(f.x, f.y + 0.3, f.z);
      if (z !== this.zone) {
        if (!this.zone || z.latin !== this.zone.latin) this.ui.banner(z);
        this.zone = z;
        // entering a dark way without a light: one quiet reminder, not repeated for a while
        const dark = /^(library|ossuary|crypt|secret-stair|smithy-cells)$/.test(z.id) || (z.indoor && this.atmo.night > 0.6 && !/^(church|choir|kitchen|refectory)$/.test(z.id));
        this._lampCue ||= {};
        if (dark && !this.lantern && !(performance.now() - (this._lampCue[z.id] || -1e9) < 240000)) {
          this._lampCue[z.id] = performance.now();
          // (after the library's own night warning has been read, if it shows)
          const wait = z.id === 'library' && (this.atmo.time >= 18.6 || this.atmo.time < 5.2) ? 5600 : 1400;
          setTimeout(() => { if (!this.lantern && this.zone === z) this.ui.toast('It is dark here. F lights the lantern.', 3200); }, wait);
        }
      }
      indoor = z.indoor;
      let room = null;
      if (z.id === 'library') room = this.aed.lib.findRoom(f.x - AED.x, f.z - AED.z) || null;
      if ((room && room.id) !== (this.room && this.room.id)) { this.room = room; if (room) this.ui.room(room); }
      // Severinus answers only where and when he is actually at work
      if (!this._sev) { this._sev = { id: 'severinus', pos: new THREE.Vector3(0, -999, 0), radius: 2.6, label: 'Severinus, the herbalist' }; this.interactables.push(this._sev); }
      { const r = this.ctx.people?.rigs.find(q => q.named === 'severinus'); if (r && r.g.visible && r.group?.id === 'gardener') this._sev.pos.set(r.g.position.x, r.g.position.y + 1.5, r.g.position.z); else this._sev.pos.y = -999; }
      // the catalogue's numbers, found again on the shelves themselves
      if (z.id === 'library' && this.notes.has('shelf-marks')) { this._libT = (this._libT || 0) + dt; if (this._libT > 5) this.noteMore('shelf-marks'); } else this._libT = 0;
      this.trackPassage(f, z.id);
      const it = this.mirrorOpen ? null : this.nearest();
      if (it !== this.current) { this.current = it; this.ui.prompt(it ? it.label : null); }
      // the clock gives way while something low and near is looked at
      const low = it && it.radius < 4 && it.pos.y < cam.y - 0.45 && it.pos.distanceTo(cam) < 3.2;
      if (low !== this._inspecting) { this._inspecting = low; document.body.classList.toggle('inspecting', !!low); }
    } else { this.zone = null; this.room = null; if (this.current) { this.current = null; this.ui.prompt(null); } if (this._inspecting) { this._inspecting = false; document.body.classList.remove('inspecting'); } }
    const dark = !indoor ? 0 : ({ scriptorium: 0.45, cloister: 0.3, church: 0.8, choir: 0.8 }[this.zone?.id] ?? 1);
    this.indoor = THREE.MathUtils.damp(this.indoor, dark, 2.5, dt);
    const k = this.indoor;

    const focus = this.mode === 'walk' ? cam : this.aerial.controls.target;
    const span = this.mode === 'walk' ? 50 : Math.min(230, cam.distanceTo(this.aerial.controls.target) * 0.95 + 30);
    this.atmo.update(dt, focus, span);
    // the eye adapts indoors: ambient light falls, exposure rises. A very
    // faint cool floor keeps night interiors reading as dark stone (strong
    // enclosure) rather than pure black, without lifting the daytime look.
    // (raised so that at Matins, in the library and the crypt, the eye still
    // finds pillars, doorways and steps before the lantern is lit)
    const nightFill = this.mode === 'walk' ? k * this.atmo.night * 0.13 : 0;
    this.atmo.hemi.intensity = this.atmo.hemiBase * (1 - k * 0.62) + nightFill;
    this.scene.environmentIntensity = this.atmo.envBase * (1 - k * 0.6) + nightFill * 0.5;
    const nightWalk = this.mode === 'walk' ? this.atmo.night * 0.2 : 0;
    this.renderer.toneMappingExposure = this.atmo.baseExposure * (1 + k * 0.5 * (this.lantern ? 0.6 : 1) + nightWalk);

    const day = this.atmo.daylight;
    // after dark a dim light shows in the top floor (First Day, Vespers)
    this.M.alabaster.emissiveIntensity = 0.6 * day * (0.25 + k * 0.75) + (1 - k) * this.atmo.night * 0.16;
    for (const m of [...this.M.stained, this.M.stainedWarm]) m.emissiveIntensity = 0.95 * day * (0.15 + k * 0.85) + this.atmo.night * (1 - k) * 0.35;
    // lamplit windows after dark, seen from outside
    this.M.glassOpaque.emissiveIntensity = this.atmo.night * (1 - k) * 0.55;
    if (this.fireOn) {
      const f = 0.8 + 0.2 * Math.sin(T * 9) * Math.sin(T * 4.3);
      this.M.alabaster.emissive.setHex(0xff4a0a); this.M.alabaster.emissiveIntensity = 1.5 * f;
      this.M.glass.emissive?.setHex(0xff7a2a);
      this.fireLight.intensity = 1300 * f;
    } else if (this.fireLight) { this.fireLight.intensity = 0; this.M.alabaster.emissive.setHex(0xffe4b8); }
    for (const [o, c] of this.clipMats) if (o.emissive) c.emissiveIntensity = o.emissiveIntensity;

    // the flame pool
    const sorted = this.emitters.map(e => [e, (e.x - cam.x) ** 2 + (e.y - cam.y) ** 2 + (e.z - cam.z) ** 2]).sort((a, b) => a[1] - b[1]);
    this.pool.forEach((l, i) => {
      const s = sorted[i];
      if (!s || s[1] > 70 * 70) { l.intensity = 0; return; }
      const e = s[0];
      // flames: a warm but not saturated light with a long, soft falloff,
      // so a torch lifts the room around it instead of burning one patch
      l.position.set(e.x, e.y, e.z); l.color.setHex(e.color).lerp(this._flameWhite || (this._flameWhite = new THREE.Color(0xffd6a8)), 0.45);
      l.distance = e.distance * 2.1; l.decay = 1.6;
      const fl = 1 - (e.flicker || 0) * 0.6 * (0.5 + 0.5 * Math.sin(T * 13 + i * 7) * Math.sin(T * 7.3 + i));
      l.intensity = e.intensity * 2.4 * fl * (0.55 + 0.45 * Math.max(this.atmo.night, k));
    });
    if (this.mode === 'walk' && this.lantern) {
      // held low and a little ahead, near the line of sight: the light
      // reaches down a passage instead of flaring on the nearest wall
      this.lamp.position.copy(cam).add(this._lampOff || (this._lampOff = new THREE.Vector3())).add(new THREE.Vector3(0.12, -0.3, -0.55).applyQuaternion(this.camera.quaternion));
      this.lamp.distance = 24; this.lamp.decay = 1.25;
      this.lamp.intensity = (3.1 + 1.5 * this.atmo.night) * (0.94 + 0.06 * Math.sin(T * 17) * Math.sin(T * 5.3));
    } else this.lamp.intensity = 0;

    // interiors are drawn only when near
    for (const g of this.groups) {
      if (!g.userData.interior) continue;
      // distance to the group's box (a long passage such as the ossuary has
      // a bounding sphere that contains half the abbey)
      if (!g.userData.box) { const v = g.visible; g.visible = true; g.userData.box = new THREE.Box3().setFromObject(g); g.visible = v; }
      let d = g.userData.box.distanceToPoint(cam);
      // the ossuary runs under the church and the kitchen, so the rooms above
      // are "near" it: it is drawn only from its stairs or below ground
      if (g.userData.name === 'ossuary') {
        const o = this.ctx.anchors.ossuary;
        const atStair = o && [o.chapelBottom, o.kitchenEnd].some(p => Math.hypot(cam.x - p[0], cam.z - p[1]) < 12);
        if (!atStair && cam.y > 0.5) d = Infinity;
      }
      g.visible = d < (this.mode === 'walk' ? 45 : 150) || (this.cut > 0 && g.userData.tag === 'aed');
    }

    // Adso's vision
    if (this.visionT > 0) {
      this.visionT -= dt;
      const a = Math.min(1, this.visionT / 3) * Math.min(1, (11 - this.visionT) / 1.5);
      this.canvas.style.filter = `hue-rotate(${Math.sin(T * 0.7) * 70 * a}deg) saturate(${1 + a * 1.2}) blur(${a * 1.2}px)`;
      this.camera.fov = 55 + Math.sin(T * 0.9) * 9 * a; this.camera.updateProjectionMatrix();
      if (this.visionT <= 0) { this.canvas.style.filter = ''; document.getElementById('vision').style.opacity = 0; this.camera.fov = 55; this.camera.updateProjectionMatrix(); }
    }

    this.effects.update(dt, cam, this.weather, this.atmo.night);
    let fireDist = 99; for (const [e, d2] of sorted.slice(0, 3)) if (!e.small) fireDist = Math.min(fireDist, Math.sqrt(d2));
    const zid = this.zone?.id;
    {
      const L = this._lis || (this._lis = {}), d = this._lisD || (this._lisD = new THREE.Vector3());
      this.camera.getWorldDirection(d); L.x = cam.x; L.y = cam.y; L.z = cam.z; L.fx = d.x; L.fz = d.z;
      const office = officeAt(this.atmo.time);
      this.sound.update(dt, { listener: L, indoor: k, inside: this.mode === 'walk' && !!this.zone?.indoor, zone: this.mode === 'walk' ? this.zone : null, acoustic: this.mode === 'walk' ? undefined : 'exterior', fireDist, library: zid === 'library', time: this.atmo.time, hour: office?.id || null, office: !!office, night: this.atmo.night, weather: this.weather });
    }

    this._mapT = (this._mapT || 0) + dt;
    if (this._mapT > 0.2) { this._mapT = 0; this.ui.drawMappa(zid === 'library' ? (this.room?.id || '') : null); }
    this.render();
  }
}

const app = new App();
app.init().catch(e => { console.error(e); const s = document.getElementById('loaderStatus'); if (s) s.textContent = 'The abbey could not be built: ' + e.message; });
