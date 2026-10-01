import * as THREE from 'three';
import { AED } from '../core/plan.js';
import { rot } from '../core/library.js';

// Atmosphere: falling snow, chimney smoke, a glow around every flame.
// Each is a single point cloud so the whole abbey costs three draw calls.

function softSprite() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
function smokeTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  for (let i = 0; i < 26; i++) {
    const x = 34 + Math.random() * 60, y = 34 + Math.random() * 60, r = 14 + Math.random() * 26;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  return new THREE.CanvasTexture(c);
}
const fogChunk = {
  vert: 'varying float vFogDepth;',
  frag: 'uniform vec3 fogColor; uniform float fogDensity; varying float vFogDepth;',
};

export class Effects {
  constructor(scene, emitters) {
    this.scene = scene;
    this.time = 0;
    // --- snow --------------------------------------------------------------
    const N = 9000, pos = new Float32Array(N * 3), seed = new Float32Array(N);
    for (let i = 0; i < N; i++) { pos.set([(Math.random() - 0.5) * 80, Math.random() * 40, (Math.random() - 0.5) * 80], i * 3); seed[i] = Math.random(); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    this.snowU = { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uWind: { value: new THREE.Vector2(0.8, 0.3) }, uOpacity: { value: 0 }, uTex: { value: softSprite() } };
    this.snow = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: this.snowU, transparent: true, depthWrite: false,
      vertexShader: `uniform float uTime; uniform vec3 uCam; uniform vec2 uWind; attribute float seed; varying float vA;
        void main(){ vec3 p = position; float t = uTime*(0.9+seed*0.6);
          p.y = mod(p.y - t*1.3, 40.0);
          p.x += uWind.x*t*1.5 + sin(t*0.7+seed*20.)*0.8; p.z += uWind.y*t*1.5 + cos(t*0.6+seed*13.)*0.8;
          p.xz = mod(p.xz - uCam.xz + 40.0, 80.0) - 40.0 + uCam.xz; p.y += uCam.y - 12.0;
          vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv;
          gl_PointSize = min(22.0, (1.6+seed*2.4) * 150.0 / -mv.z); vA = (1.0 - smoothstep(5.0, 60.0, -mv.z)) * smoothstep(0.6, 2.5, -mv.z); }`,
      fragmentShader: `uniform sampler2D uTex; uniform float uOpacity; varying float vA; void main(){ vec4 c = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(vec3(0.95), c.a*uOpacity*vA); }`,
    }));
    this.snow.frustumCulled = false; this.snow.renderOrder = 5;
    scene.add(this.snow);

    // --- chimney smoke: one cloud, particles cycling up each flue -------------
    this.sources = [];
    this.smokeU = { uTime: { value: 0 }, uTex: { value: smokeTex() }, uNight: { value: 0 }, uScale: { value: innerHeight }, fogColor: { value: new THREE.Color() }, fogDensity: { value: 0 } };
    this.addSmokeSources([1, 2, 3].map(k => { const c = rot([AED.dT + (k === 3 ? 6.2 : 3.2), 0], k); return [c[0] + AED.x, AED.towerPeak + 1.4, c[1] + AED.z]; }));

    // --- glows around flames ----------------------------------------------------
    const G = emitters.length, gp = new Float32Array(G * 3), gc = new Float32Array(G * 3), gs = new Float32Array(G * 2);
    emitters.forEach((e, i) => {
      gp.set([e.x, e.y, e.z], i * 3);
      const c = new THREE.Color(e.color); gc.set([c.r, c.g, c.b], i * 3);
      gs.set([e.small ? 0.3 : e.censer ? 0.5 : 0.95, e.flicker || 0], i * 2);
    });
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.BufferAttribute(gp, 3));
    gg.setAttribute('color', new THREE.BufferAttribute(gc, 3));
    gg.setAttribute('sf', new THREE.BufferAttribute(gs, 2));
    this.glowU = { uTime: { value: 0 }, uTex: { value: softSprite() }, uAmt: { value: 0.5 }, uScale: { value: innerHeight } };
    this.glow = new THREE.Points(gg, new THREE.ShaderMaterial({
      uniforms: this.glowU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `uniform float uTime; uniform float uScale; attribute vec3 color; attribute vec2 sf; varying vec3 vC;
        void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); gl_Position = projectionMatrix*mv;
          float f = 1.0 + sin(uTime*12.0 + position.x*3.0)*0.32*sf.y;
          gl_PointSize = sf.x * f * uScale * 0.6 / -mv.z; vC = color; }`,
      fragmentShader: `uniform sampler2D uTex; uniform float uAmt; varying vec3 vC; void main(){ float a = texture2D(uTex, gl_PointCoord).a; a *= a; gl_FragColor = vec4(vC * a * uAmt, 1.0); }`,
    }));
    this.glow.frustumCulled = false;
    scene.add(this.glow);
  }
  addSmokeSources(list, scale = 1) {
    for (const s of list) this.sources.push({ p: s, scale });
    const per = 16, N = this.sources.length * per;
    const pos = new Float32Array(N * 3), data = new Float32Array(N * 2);
    this.sources.forEach((s, i) => { for (let k = 0; k < per; k++) { pos.set(s.p, (i * per + k) * 3); data.set([k / per, s.scale], (i * per + k) * 2); } });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('pd', new THREE.BufferAttribute(data, 2));
    if (this.smoke) { this.scene.remove(this.smoke); this.smoke.geometry.dispose(); }
    this.smoke = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: this.smokeU, transparent: true, depthWrite: false,
      vertexShader: `uniform float uTime; uniform float uScale; attribute vec2 pd; varying float vA; varying float vR; varying float vFogDepth;
        void main(){ float t = fract(pd.x + uTime*0.05); vec3 p = position;
          p += vec3(t*14.0 + sin(t*6.0+position.x)*1.5, t*22.0, t*6.0);
          vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv; vFogDepth = -mv.z;
          gl_PointSize = (1.5 + t*9.0) * pd.y * uScale * 1.1 / -mv.z; vA = sin(t*3.14159); vR = t*2.0 + position.x; }`,
      fragmentShader: `uniform sampler2D uTex; uniform float uNight; uniform vec3 fogColor; uniform float fogDensity; varying float vA; varying float vR; varying float vFogDepth;
        void main(){ vec2 c = gl_PointCoord - 0.5; float s = sin(vR), co = cos(vR); c = mat2(co,-s,s,co)*c + 0.5;
          float a = texture2D(uTex, c).a * vA * 0.55 * mix(1.0, 0.5, uNight);
          vec3 col = mix(vec3(0.58,0.57,0.55), vec3(0.16,0.17,0.2), uNight);
          float f = 1.0 - exp(-fogDensity*fogDensity*vFogDepth*vFogDepth);
          gl_FragColor = vec4(mix(col, fogColor, f), a*(1.0-f)); }`,
    }));
    this.smoke.frustumCulled = false;
    this.scene.add(this.smoke);
  }
  // Seventh Day, Night: "the whole labyrinth was nothing but a vast pyre"
  setFire(on) {
    if (on && !this.fire) {
      const N = 900, pos = new Float32Array(N * 3), sd = new Float32Array(N * 2);
      for (let i = 0; i < N; i++) {
        const a = Math.random() * Math.PI * 2, r = 6 + Math.random() * 20;
        pos.set([AED.x + Math.cos(a) * r, AED.eave - 1 + Math.random() * 3, AED.z + Math.sin(a) * r], i * 3);
        sd.set([Math.random(), 0.6 + Math.random() * 1.2], i * 2);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('sd', new THREE.BufferAttribute(sd, 2));
      this.fireU = { uTime: { value: 0 }, uTex: { value: softSprite() }, uScale: this.glowU.uScale };
      this.fire = new THREE.Points(g, new THREE.ShaderMaterial({
        uniforms: this.fireU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: `uniform float uTime; uniform float uScale; attribute vec2 sd; varying float vT;
          void main(){ float t = fract(sd.x + uTime*0.35*sd.y); vec3 p = position + vec3(sin(uTime*2.0+sd.x*40.0)*0.6, t*9.0*sd.y, cos(uTime*1.7+sd.x*30.0)*0.6);
            vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv; gl_PointSize = (5.0 - t*3.0) * sd.y * uScale * 1.1 / -mv.z; vT = t; }`,
        fragmentShader: `uniform sampler2D uTex; varying float vT; void main(){ float a = texture2D(uTex, gl_PointCoord).a * (1.0 - vT);
          vec3 c = mix(vec3(1.0,0.78,0.35), vec3(0.85,0.2,0.04), vT); gl_FragColor = vec4(c*a*0.5, 1.0); }`,
      }));
      this.fire.frustumCulled = false;
      this.scene.add(this.fire);
      this.fireSmoke = this.sources.length;
      this.addSmokeSources([[AED.x, AED.ridge, AED.z], [AED.x + 12, AED.ridge, AED.z + 12], [AED.x - 10, AED.ridge, AED.z + 6], [AED.x + 4, AED.ridge, AED.z - 12]], 4);
    }
    if (this.fire) this.fire.visible = on;
    if (!on && this.fireSmoke !== undefined) { this.sources.length = this.fireSmoke; this.fireSmoke = undefined; this.addSmokeSources([]); this.scene.remove(this.fire); this.fire = null; }
  }
  update(dt, cam, weather, night) {
    if (this.fireU) this.fireU.uTime.value = this.time;
    this.time += dt;
    this.snowU.uTime.value = this.time; this.snowU.uCam.value.copy(cam);
    this.snowU.uOpacity.value = THREE.MathUtils.damp(this.snowU.uOpacity.value, weather === 'snow' ? 1 : 0, 1.5, dt);
    this.snow.visible = this.snowU.uOpacity.value > 0.01;
    this.smokeU.uTime.value = this.time; this.smokeU.uNight.value = night;
    if (this.scene.fog) { this.smokeU.fogColor.value.copy(this.scene.fog.color); this.smokeU.fogDensity.value = this.scene.fog.density; }
    this.glowU.uTime.value = this.time; this.glowU.uAmt.value = 0.25 + night * 0.3;

  }
}
void fogChunk;
