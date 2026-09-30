import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// The bird's-eye view: damped orbit with cinematic fly-to moves.
export class Aerial {
  constructor(camera, dom) {
    this.camera = camera;
    this.controls = new OrbitControls(camera, dom);
    const c = this.controls;
    c.enableDamping = true; c.dampingFactor = 0.07;
    c.minDistance = 6; c.maxDistance = 520;
    c.maxPolarAngle = Math.PI * 0.485; c.minPolarAngle = 0.05;
    c.zoomSpeed = 0.9; c.rotateSpeed = 0.55; c.panSpeed = 0.8;
    c.screenSpacePanning = false;
    c.target.set(22, 0, -12);
    this.flight = null;
    this.enabled = true;
    this.bounds = { r: 420 };
    this.onFlightEnd = null;
    this.idle = 0;
    c.addEventListener('start', () => { this.flight = null; this.idle = 0; this.userMoving = true; });
    c.addEventListener('end', () => { this.userMoving = false; });
  }
  set enabled(v) { this._en = v; if (this.controls) this.controls.enabled = v; }
  get enabled() { return this._en; }

  flyTo(target, position, dur = 2.4, done) {
    const from = { t: this.controls.target.clone(), p: this.camera.position.clone() };
    this.flight = { from, to: { t: new THREE.Vector3(...target), p: new THREE.Vector3(...position) }, t: 0, dur, done };
  }
  update(dt) {
    if (this.flight) {
      const f = this.flight;
      f.t = Math.min(1, f.t + dt / f.dur);
      const e = f.t < 0.5 ? 4 * f.t ** 3 : 1 - (-2 * f.t + 2) ** 3 / 2;
      // arc upward mid-flight for long moves
      const dist = f.from.p.distanceTo(f.to.p);
      const lift = Math.sin(Math.PI * e) * Math.min(80, dist * 0.25);
      this.controls.target.lerpVectors(f.from.t, f.to.t, e);
      this.camera.position.lerpVectors(f.from.p, f.to.p, e);
      this.camera.position.y += lift;
      this.camera.lookAt(this.controls.target);
      if (f.t >= 1) { this.flight = null; f.done?.(); }
      return;
    }
    if (this.enabled) {
      const t = this.controls.target;
      const r = Math.hypot(t.x - 20, t.z + 10);
      if (r > this.bounds.r) { t.x = 20 + (t.x - 20) * this.bounds.r / r; t.z = -10 + (t.z + 10) * this.bounds.r / r; }
      t.y = THREE.MathUtils.clamp(t.y, -60, 60);
      this.controls.update();
    }
  }
}
