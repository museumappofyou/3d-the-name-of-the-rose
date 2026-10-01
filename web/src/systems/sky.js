import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { shared } from '../core/materials.js';

// Canonical hours as given in Eco's note on the Benedictine horarium,
// with the chapter headings of the Turkish edition.
export const HOURS = [
  { id: 'matins', latin: 'Matutinum', tr: 'Geceyarısı', en: 'Matins', t: 2.6 },
  { id: 'lauds', latin: 'Laudes', tr: 'Alacakaranlık', en: 'Lauds', t: 5.5 },
  { id: 'prime', latin: 'Prima', tr: 'Tansökümü', en: 'Prime', t: 7.6 },
  { id: 'terce', latin: 'Tertia', tr: 'Sabah', en: 'Terce', t: 9.0 },
  { id: 'sext', latin: 'Sexta', tr: 'Öğle', en: 'Sext', t: 12.0 },
  { id: 'nones', latin: 'Nona', tr: 'İkindi', en: 'Nones', t: 14.5 },
  { id: 'vespers', latin: 'Vesperae', tr: 'Günbatımı', en: 'Vespers', t: 16.5 },
  { id: 'compline', latin: 'Completorium', tr: 'Akşam', en: 'Compline', t: 18.2 },
];
export function hourAt(t) {
  let best = HOURS[HOURS.length - 1];
  for (const h of HOURS) if (t >= h.t - 0.01) best = h;
  if (t < HOURS[0].t) best = HOURS[HOURS.length - 1];
  return best;
}

const LAT = 44.3 * Math.PI / 180;       // Ligurian Apennines
const DEC = -21.2 * Math.PI / 180;      // late November
export function sunDir(t) {
  const H = (t - 12) * 15 * Math.PI / 180;
  const alt = Math.asin(Math.sin(LAT) * Math.sin(DEC) + Math.cos(LAT) * Math.cos(DEC) * Math.cos(H));
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(LAT) - Math.tan(DEC) * Math.cos(LAT)); // from south, +west
  // world: +x east, +z south. az measured from south toward west.
  const x = -Math.sin(az) * Math.cos(alt), z = Math.cos(az) * Math.cos(alt), y = Math.sin(alt);
  return new THREE.Vector3(x, y, z).normalize();
}

const lerp = THREE.MathUtils.lerp, clamp = THREE.MathUtils.clamp, smooth = THREE.MathUtils.smoothstep;

export class Atmosphere {
  constructor(renderer, scene) {
    this.renderer = renderer; this.scene = scene;
    this.time = 9.2; this.weather = 'clear'; this.fogAmount = 0;
    this.sky = new Sky();
    this.sky.scale.setScalar(40000);
    this.sky.material.depthWrite = false;
    this.sky.renderOrder = -10;
    scene.add(this.sky);
    const u = this.sky.material.uniforms;
    u.turbidity.value = 3.2; u.rayleigh.value = 1.4; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.82;

    this.sun = new THREE.DirectionalLight(0xffffff, 3);
    this.sun.castShadow = true;
    const sc = this.sun.shadow.camera;
    this.sun.shadow.mapSize.set(4096, 4096);
    sc.near = 1; sc.far = 900;
    this.shadowSpan = 150;
    this.sun.shadow.bias = -0.00035; this.sun.shadow.normalBias = 0.04;
    this.sun.shadow.radius = 2;
    scene.add(this.sun, this.sun.target);

    this.hemi = new THREE.HemisphereLight(0xbcd0ff, 0x6e6458, 0.9);
    scene.add(this.hemi);

    this.fog = new THREE.FogExp2(0xc9d3dd, 0.0012);
    scene.fog = this.fog;

    // a dark vault over the Preetham sky after dusk
    this.nightDome = new THREE.Mesh(new THREE.SphereGeometry(9000, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, transparent: true, depthWrite: false, fog: false,
      uniforms: { uA: { value: 0 }, uTop: { value: new THREE.Color(0x050914) }, uHor: { value: new THREE.Color(0x1a2434) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'uniform float uA; uniform vec3 uTop, uHor; varying vec3 vP; void main(){ float t = smoothstep(-0.05, 0.5, vP.y); gl_FragColor = vec4(mix(uHor, uTop, t), uA); }',
    }));
    this.nightDome.renderOrder = -9.5; this.nightDome.frustumCulled = false;
    scene.add(this.nightDome);
    // overcast and fog: a veil of the fog's own colour over the sky, so the
    // milky fog of the fourth and fifth days (and the grey sky that snow
    // falls from) is not painted on a clear blue dome
    this.veil = new THREE.Mesh(new THREE.SphereGeometry(8900, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, transparent: true, depthWrite: false, fog: false,
      uniforms: { uA: { value: 0 }, uFog: { value: this.fog.color } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'uniform float uA; uniform vec3 uFog; varying vec3 vP; void main(){ float t = smoothstep(0.0, 0.7, vP.y); gl_FragColor = vec4(uFog * mix(1.0, 0.9, t), uA * mix(1.0, 0.82, t)); }',
    }));
    this.veil.renderOrder = -9.45; this.veil.frustumCulled = false;
    scene.add(this.veil);
    // the world below the horizon past the modelled mountains: lowlands and
    // valleys lost in haze, in the fog's own colour darkening downward
    // (without it, looking down past the ranges shows the sky's underside)
    this.groundDome = new THREE.Mesh(new THREE.SphereGeometry(8800, 48, 12, 0, Math.PI * 2, Math.PI / 2 + 0.002, Math.PI / 2 - 0.002), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, transparent: true,
      uniforms: { uFog: { value: this.fog.color }, uLand: { value: new THREE.Color(0x2f3530) }, uDay: { value: 1 } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      // it fades in over the first degrees below the horizon (the sky's own
      // haze shows through there, so no seam), then darkens to far lowland
      // broken into fields and woods, which the haze hides again near the rim
      fragmentShader: `uniform vec3 uFog, uLand; uniform float uDay; varying vec3 vP;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
          return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        void main(){
          float d = -vP.y, a = smoothstep(0.0, 0.07, d), t = smoothstep(0.02, 0.35, d);
          vec2 g = vP.xz / max(d, 0.02) * 1.5;
          float n = vn(g) * 0.6 + vn(g * 2.7 + 5.) * 0.4;
          vec3 land = mix(uFog * 0.2, uLand, uDay);
          vec3 low = mix(uFog * 0.72, land, 0.45) * mix(1.08, 0.7, smoothstep(0.45, 0.7, n));
          gl_FragColor = vec4(mix(uFog * 0.95, low, t), a);
        }`,
    }));
    this.groundDome.renderOrder = -9.4; this.groundDome.frustumCulled = false;
    scene.add(this.groundDome);
    this.stars = makeStars(); scene.add(this.stars);
    this.moon = makeMoon(); scene.add(this.moon);
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envScene = new THREE.Scene();
    this.envSky = new Sky(); this.envSky.scale.setScalar(1000); this.envScene.add(this.envSky);
    // the same veil in the reflection scene (inside its 1000 m sky box), so
    // wet stone and snow in fog reflect a milky sky, not a clear blue one
    this.envVeil = new THREE.Mesh(new THREE.SphereGeometry(400, 24, 12), this.veil.material); this.envScene.add(this.envVeil);
    this.envTarget = null; this.lastEnvT = -99; this.lastEnvW = '';
    this.focus = new THREE.Vector3();
    this.indoor = 0;
    this.exposure = 1;
    this.set(this.time);
  }

  get daylight() { return clamp(this.sunDir.y * 4 + 0.25, 0, 1); }

  set(t, force) {
    this.time = ((t % 24) + 24) % 24;
    const d = sunDir(this.time);
    this.sunDir = d;
    const u = this.sky.material.uniforms;
    u.sunPosition.value.copy(d);
    const alt = d.y;
    const day = smooth(alt, -0.12, 0.18);
    const low = 1 - smooth(alt, 0.02, 0.35);
    const fogK = this.fogAmount;
    u.turbidity.value = lerp(1.8, 9, fogK) + low * 2;
    u.rayleigh.value = lerp(0.9, 2.6, low) * lerp(1, 0.4, fogK);

    // moon opposite-ish, high at night
    const md = new THREE.Vector3(-d.x * 0.6 + 0.2, Math.max(0.35, -d.y * 0.9 + 0.25), -d.z * 0.6 - 0.35).normalize();
    this.moon.position.copy(md).multiplyScalar(3000);
    this.moon.visible = alt < 0.08;
    this.moon.material.opacity = clamp((0.08 - alt) * 8, 0, 1) * (1 - fogK * 0.9);
    this.stars.material.opacity = clamp((-alt - 0.02) * 6, 0, 1) * (1 - fogK);
    this.nightDome.material.uniforms.uA.value = clamp((0.02 - alt) * 5, 0, 0.94) * (1 - fogK * 0.6);
    this.veil.material.uniforms.uA.value = clamp(fogK * 1.7, 0, 0.96);   // snow: a grey overcast; fog: milk

    // key light: sun by day, moon by night
    const sunCol = new THREE.Color().setHSL(0.09 - low * 0.03, lerp(0.07, 0.5, low), lerp(0.94, 0.66, low));   // a pale winter sun
    const moonCol = new THREE.Color(0x8ea6d8);
    const night = 1 - day;
    this.keyDir = day > 0.02 ? d.clone() : md.clone();
    this.sun.color.copy(sunCol).lerp(moonCol, night);
    const sunI = lerp(0, 3.6, smooth(alt, -0.02, 0.25)) * lerp(1, 0.22, fogK);
    const moonI = 0.75 * night * (1 - fogK * 0.7);
    this.sun.intensity = Math.max(sunI, moonI);
    // under overcast and fog the light is diffuse: shadows fade, not only dim
    this.sun.shadow.intensity = lerp(1, 0.3, fogK);
    if (alt < -0.02) this.keyDir = md.clone();

    // ambient
    const skyC = new THREE.Color().setHSL(0.6, 0.35, lerp(0.08, 0.72, day));
    skyC.lerp(new THREE.Color(0xd8cfc4), low * day * 0.45);
    const grd = new THREE.Color().setHSL(0.08, 0.2, lerp(0.03, 0.42, day));
    this.hemi.color.copy(skyC); this.hemi.groundColor.copy(grd);
    this.hemiBase = this.hemi.intensity = lerp(0.2, 1.35, day) * lerp(1, 1.3, fogK);

    // fog colour follows horizon
    const fogDay = new THREE.Color().setHSL(0.6, 0.2, 0.66).lerp(new THREE.Color(0xe6c8a8), low * 0.55);
    const fogNight = new THREE.Color(0x121824);
    const fc = fogNight.clone().lerp(fogDay, day);
    if (fogK > 0) fc.lerp(new THREE.Color().setHSL(0.6, 0.06, lerp(0.1, 0.8, day)), fogK);
    this.fog.color.copy(fc);
    this.fog.density = lerp(0.00014, 0.0205, fogK * fogK) + (1 - day) * 0.0005 + (this.weather === "snow" ? 0.0011 : 0);
    this.renderer.setClearColor(fc);
    this.nightDome.material.uniforms.uHor.value.copy(fc);

    // exposure: dim nights stay legible without looking like day
    this.baseExposure = lerp(1.6, 0.6, day);

    // glowing glass after dark
    shared.night = night;
    this.night = night;
    if (force || Math.abs(this.time - this.lastEnvT) > 0.2 || this.lastEnvW !== this.weather || Math.abs(this.fogAmount - (this.lastEnvF ?? 0)) > 0.06) this.updateEnv();
  }

  updateEnv() {
    const eu = this.envSky.material.uniforms, u = this.sky.material.uniforms;
    for (const k of ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG']) eu[k].value = u[k].value;
    eu.sunPosition.value.copy(u.sunPosition.value);
    if (this.sunDir.y < -0.05) eu.sunPosition.value.set(0, -0.2, 1);
    const prev = this.envTarget;
    this.envTarget = this.pmrem.fromScene(this.envScene, 0.02, 1, 2000);
    this.scene.environment = this.envTarget.texture;
    const day = smooth(this.sunDir.y, -0.12, 0.2);
    this.envBase = this.scene.environmentIntensity = lerp(0.08, 1.0, day) * lerp(1, 0.8, this.fogAmount);
    prev?.dispose();
    this.lastEnvT = this.time; this.lastEnvW = this.weather; this.lastEnvF = this.fogAmount;
  }

  setWeather(w) {
    this.weather = w;
    this.targetFog = w === 'fog' ? 1 : w === 'snow' ? 0.35 : 0;
  }

  // keep the shadow frustum around what the viewer looks at
  update(dt, focus, span) {
    if (this.targetFog !== undefined && Math.abs(this.targetFog - this.fogAmount) > 0.002) {
      this.fogAmount = lerp(this.fogAmount, this.targetFog, 1 - Math.exp(-dt * 0.8));
      this.set(this.time);
    }
    const s = span || this.shadowSpan;
    const sc = this.sun.shadow.camera;
    if (sc.right !== s) { sc.left = -s; sc.right = s; sc.top = s; sc.bottom = -s; sc.updateProjectionMatrix(); }
    // snap to shadow texels to avoid shimmering
    const texel = (2 * s) / this.sun.shadow.mapSize.x;
    const f = focus.clone();
    const dir = this.keyDir;
    const back = dir.clone().multiplyScalar(400);
    // stabilise in light space
    const lightMat = new THREE.Matrix4().lookAt(new THREE.Vector3(), dir.clone().negate(), new THREE.Vector3(0, 1, 0));
    const inv = lightMat.clone().invert();
    f.applyMatrix4(inv);
    f.x = Math.round(f.x / texel) * texel; f.y = Math.round(f.y / texel) * texel;
    f.applyMatrix4(lightMat);
    this.sun.target.position.copy(f);
    this.sun.position.copy(f).add(back);
    this.sun.target.updateMatrixWorld();
    this.stars.position.copy(focus); this.nightDome.position.copy(focus); this.veil.position.copy(focus); this.groundDome.position.copy(focus);
    this.groundDome.material.uniforms.uDay.value = this.daylight ?? 1;
    this.stars.rotation.y = this.time * 0.04;
  }
}

function makeStars() {
  const n = 2600, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let s = 7;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++) {
    const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2;
    const y = Math.abs(u) * 0.95 + 0.05, r = Math.sqrt(1 - y * y);
    pos.set([Math.cos(th) * r * 5000, y * 5000, Math.sin(th) * r * 5000], i * 3);
    const b = 0.5 + rnd() * 0.5, w = rnd();
    col.set([b, b * (0.9 + w * 0.1), b * (0.85 + (1 - w) * 0.15)], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, fog: false });
  const p = new THREE.Points(g, m); p.renderOrder = -8.8; p.frustumCulled = false;
  return p;
}
function makeMoon() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 10, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,250,235,1)'); grd.addColorStop(0.42, 'rgba(240,238,225,1)'); grd.addColorStop(0.47, 'rgba(200,210,235,.25)'); grd.addColorStop(1, 'rgba(160,180,230,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  g.fillStyle = 'rgba(170,165,150,.35)';
  for (const [x, y, r] of [[52, 50, 9], [74, 70, 7], [60, 78, 5], [78, 48, 4]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
  s.scale.setScalar(260);
  s.renderOrder = -8;
  return s;
}
