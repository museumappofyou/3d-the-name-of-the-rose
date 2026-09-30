import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';

// First-person walking: capsule vs. BVH of the world's collision meshes.
// Stairs are smooth ramps in the collider; secret doors are movable
// colliders that can be switched on and off.

const UP = new THREE.Vector3(0, 1, 0);
export class Walker {
  constructor(camera, dom) {
    this.camera = camera; this.dom = dom;
    this.pos = new THREE.Vector3();          // top capsule centre
    this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0;
    this.radius = 0.3; this.seg = 1.0; this.eye = 0.32;
    this.keys = new Set();
    this.enabled = false; this.onGround = false;
    this.colliders = [];
    this.speed = 2.7; this.run = 5.4;
    this.bob = 0; this.stepDist = 0; this.onStep = null;
    this.lookSens = 0.0022;
    this.lantern = null;
    this._seg = new THREE.Line3(); this._box = new THREE.Box3(); this._inv = new THREE.Matrix4();
    this._a = new THREE.Vector3(); this._b = new THREE.Vector3();
    this.touch = { x: 0, y: 0 };
    this.bindInput();
  }

  setStatic(geometry) {
    geometry.boundsTree = new MeshBVH(geometry);
    const mesh = new THREE.Mesh(geometry);
    mesh.updateMatrixWorld();
    this.colliders.unshift({ mesh, enabled: true, static: true });
  }
  addDynamic(object3d, geometry) {
    geometry.boundsTree = new MeshBVH(geometry);
    const c = { mesh: object3d, geometry, enabled: true };
    this.colliders.push(c);
    return c;
  }

  bindInput() {
    const down = e => {
      if (!this.enabled) return;
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      this.keys.add(e.code);
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    };
    const up = e => this.keys.delete(e.code);
    addEventListener('keydown', down); addEventListener('keyup', up);
    addEventListener('blur', () => this.keys.clear());
    this.dom.addEventListener('mousemove', e => {
      if (!this.enabled) return;
      if (document.pointerLockElement === this.dom || this.dragging) {
        this.yaw -= e.movementX * this.lookSens;
        this.pitch -= e.movementY * this.lookSens;
        this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
      }
    });
    this.dom.addEventListener('mousedown', e => { if (this.enabled && document.pointerLockElement !== this.dom) this.dragging = true; });
    addEventListener('mouseup', () => { this.dragging = false; });
    // touch look
    let last = null;
    this.dom.addEventListener('touchstart', e => { if (!this.enabled) return; const t = e.changedTouches[0]; if (t.clientX > innerWidth * 0.35) last = { id: t.identifier, x: t.clientX, y: t.clientY }; }, { passive: true });
    this.dom.addEventListener('touchmove', e => {
      if (!this.enabled || !last) return;
      for (const t of e.changedTouches) if (t.identifier === last.id) {
        this.yaw -= (t.clientX - last.x) * 0.005; this.pitch -= (t.clientY - last.y) * 0.005;
        this.pitch = Math.max(-1.4, Math.min(1.4, this.pitch)); last.x = t.clientX; last.y = t.clientY;
      }
    }, { passive: true });
    this.dom.addEventListener('touchend', () => { last = null; }, { passive: true });
  }

  lock() { if (this.dom.requestPointerLock) { try { const r = this.dom.requestPointerLock(); r?.catch?.(() => {}); } catch (e) { /* ignore */ } } }

  // feet position helpers
  setFeet(x, y, z, yaw = this.yaw) {
    this.pos.set(x, y + this.radius + this.seg, z);
    this.vel.set(0, 0, 0); this.yaw = yaw; this.pitch = 0;
  }
  get feet() { return new THREE.Vector3(this.pos.x, this.pos.y - this.radius - this.seg, this.pos.z); }

  update(dt) {
    if (!this.enabled) return;
    dt = Math.min(dt, 0.05);
    const k = this.keys;
    const fwd = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) + this.touch.y;
    const str = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0) + this.touch.x;
    const running = k.has('ShiftLeft') || k.has('ShiftRight');
    const sp = running ? this.run : this.speed;
    const dir = new THREE.Vector3(str, 0, -fwd);
    if (dir.lengthSq() > 1) dir.normalize();
    dir.applyAxisAngle(UP, this.yaw).multiplyScalar(sp);
    // smooth acceleration
    const acc = this.onGround ? 12 : 3;
    this.vel.x = THREE.MathUtils.damp(this.vel.x, dir.x, acc, dt);
    this.vel.z = THREE.MathUtils.damp(this.vel.z, dir.z, acc, dt);
    if (this.onGround && k.has('Space') && !this._jumped) { this.vel.y = 4.2; this._jumped = true; }
    if (!k.has('Space')) this._jumped = false;

    const steps = 4, h = dt / steps;
    const before = this.pos.clone();
    for (let i = 0; i < steps; i++) {
      const start = this.pos.clone(), grounded = this.onGround;
      const want = Math.hypot(this.vel.x, this.vel.z) * h;
      this.step(h);
      // step offset: a threshold, a kerb or a stair tread up to 0.42 m is
      // climbed rather than blocking the way
      if (grounded && want > 1e-4) {
        const got = Math.hypot(this.pos.x - start.x, this.pos.z - start.z);
        if (got < want * 0.6) this.stepUp(start, h, got);
      }
    }
    const moved = Math.hypot(this.pos.x - before.x, this.pos.z - before.z);
    if (this.onGround) {
      this.stepDist += moved;
      this.bob += moved * (running ? 1.35 : 1.9);
      const stride = running ? 1.25 : 0.82;
      if (this.stepDist > stride) { this.stepDist = 0; this.onStep?.(this.feet, running); }
    }
    // respawn safety
    if (this.pos.y < -80) this.onFall?.();

    const bobY = Math.sin(this.bob * Math.PI) * 0.028 * Math.min(1, Math.hypot(this.vel.x, this.vel.z) / 2);
    // the eye follows steps up and down smoothly
    if (this.eyeY === undefined || Math.abs(this.eyeY - this.pos.y) > 0.8) this.eyeY = this.pos.y;
    this.eyeY = THREE.MathUtils.damp(this.eyeY, this.pos.y, 16, dt);
    this.camera.position.set(this.pos.x, this.eyeY + this.eye + bobY, this.pos.z);
    this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, Math.sin(this.bob * Math.PI * 0.5) * 0.004, 'YXZ'));
  }

  // Blocked while walking: is there a tread just ahead, no more than a step
  // high, with room above it for a body? Then stand on it.
  stepUp(start, h, got) {
    const STEP = 0.42, r = this.radius;
    const hv = Math.hypot(this.vel.x, this.vel.z);
    if (hv < 0.05) return;
    const dx = this.vel.x / hv, dz = this.vel.z / hv;
    const feetY = start.y - r - this.seg;
    const geo = this.colliders[0]?.mesh.geometry;
    if (!geo?.boundsTree) return;
    this._ray = this._ray || new THREE.Ray();
    let best = null;
    for (const reach of [r + 0.06, r + 0.2]) {
      this._ray.origin.set(start.x + dx * reach, feetY + STEP + 0.05, start.z + dz * reach);
      this._ray.direction.set(0, -1, 0);
      const hit = geo.boundsTree.raycastFirst(this._ray, THREE.DoubleSide, 0, STEP + 0.05);
      if (!hit) continue;
      const rise = hit.point.y - feetY;
      if (rise < 0.03 || rise > STEP) continue;
      if (hit.face && Math.abs(hit.face.normal.y) < 0.7) continue;
      best = hit.point.y; break;
    }
    if (best === null) return;
    const saved = this.pos.clone(), savedG = this.onGround;
    this.pos.set(start.x, best + r + this.seg + 0.01, start.z);
    const lift = this.resolve();
    if (lift.y < -0.02) { this.pos.copy(saved); this.onGround = savedG; return; }   // a ceiling: no headroom
    this.pos.x += this.vel.x * h; this.pos.z += this.vel.z * h;
    this.resolve();
    const got2 = Math.hypot(this.pos.x - start.x, this.pos.z - start.z);
    if (got2 <= got + 1e-4) { this.pos.copy(saved); this.onGround = savedG; return; }
    this.onGround = true; if (this.vel.y < 0) this.vel.y = 0;
  }
  // push the capsule out of every collider; returns the displacement
  resolve() {
    const seg = this._seg, r = this.radius;
    seg.start.copy(this.pos); seg.end.copy(this.pos).addScaledVector(UP, -this.seg);
    for (const c of this.colliders) {
      if (!c.enabled) continue;
      const geo = c.static ? c.mesh.geometry : c.geometry;
      c.mesh.updateMatrixWorld();
      this._inv.copy(c.mesh.matrixWorld).invert();
      const s = seg.clone(); s.start.applyMatrix4(this._inv); s.end.applyMatrix4(this._inv);
      const box = this._box.makeEmpty(); box.expandByPoint(s.start); box.expandByPoint(s.end);
      box.min.addScalar(-r); box.max.addScalar(r);
      geo.boundsTree.shapecast({
        intersectsBounds: b => b.intersectsBox(box),
        intersectsTriangle: tri => {
          const d = tri.closestPointToSegment(s, this._a, this._b);
          if (d < r) { const dir = this._b.sub(this._a).normalize(); s.start.addScaledVector(dir, r - d); s.end.addScaledVector(dir, r - d); }
        },
      });
      s.start.applyMatrix4(c.mesh.matrixWorld); s.end.applyMatrix4(c.mesh.matrixWorld);
      seg.copy(s);
    }
    const delta = new THREE.Vector3().subVectors(seg.start, this.pos);
    this.pos.copy(seg.start);
    return delta;
  }

  step(dt) {
    this.vel.y += (this.onGround ? -2 : -24) * dt;
    this.pos.addScaledVector(this.vel, dt);
    const seg = this._seg;
    seg.start.copy(this.pos); seg.end.copy(this.pos).addScaledVector(UP, -this.seg);
    const r = this.radius;
    for (const c of this.colliders) {
      if (!c.enabled) continue;
      const geo = c.static ? c.mesh.geometry : c.geometry;
      c.mesh.updateMatrixWorld();
      this._inv.copy(c.mesh.matrixWorld).invert();
      const s = seg.clone(); s.start.applyMatrix4(this._inv); s.end.applyMatrix4(this._inv);
      const box = this._box.makeEmpty(); box.expandByPoint(s.start); box.expandByPoint(s.end);
      box.min.addScalar(-r); box.max.addScalar(r);
      geo.boundsTree.shapecast({
        intersectsBounds: b => b.intersectsBox(box),
        intersectsTriangle: tri => {
          const d = tri.closestPointToSegment(s, this._a, this._b);
          if (d < r) {
            const dir = this._b.sub(this._a).normalize();
            s.start.addScaledVector(dir, r - d); s.end.addScaledVector(dir, r - d);
          }
        },
      });
      s.start.applyMatrix4(c.mesh.matrixWorld); s.end.applyMatrix4(c.mesh.matrixWorld);
      seg.copy(s);
    }
    const delta = new THREE.Vector3().subVectors(seg.start, this.pos);
    this.onGround = delta.y > Math.abs(dt * this.vel.y * 0.25) || (delta.y > 0.0005 && Math.abs(this.vel.y) < 0.5);
    const off = Math.max(0, delta.length() - 1e-5);
    if (off > 0) {
      delta.normalize();
      this.pos.addScaledVector(delta, off);
      if (!this.onGround) this.vel.addScaledVector(delta, -delta.dot(this.vel));
      else if (this.vel.y < 0) this.vel.y = 0;
    }
  }
}
