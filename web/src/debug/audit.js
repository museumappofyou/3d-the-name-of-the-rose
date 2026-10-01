import * as THREE from 'three';
import { computeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { zoneAt, ZONES } from '../systems/zones.js';
import { yieldTask } from './taskYield.js';

// Structural audits, run from the console with ?debug:
//   await __audit.leaks()      rays cast upward from every enclosed floor;
//                              any ray that reaches the sky is a hole
//   await __audit.walk(route)  the walker, driven by a simple bot, follows a
//                              route with the real collision; reports where
//                              it gets stuck
//   await __audit.routes()     every route of src/data/routes.js

THREE.Mesh.prototype.raycast = acceleratedRaycast;
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;

export function installAudit(app) {
  const ray = new THREE.Raycaster();
  let prepared = false;
  const meshes = [];
  const prepare = () => {
    if (prepared) return;
    app.scene.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh || !o.geometry?.attributes?.position) return;
      if (o.name === 'sea' || o.material?.depthWrite === false && o.material?.transparent && !/glass|stained|alabaster/.test(o.name)) return;
      if (!o.geometry.boundsTree) o.geometry.computeBoundsTree();
      meshes.push(o);
    });
    // interiors are hidden when far: show everything during the audit
    for (const g of app.groups) g.visible = true;
    prepared = true;
  };
  const castUp = (p, dirs) => {
    const out = [];
    for (const d of dirs) {
      ray.set(p, d); ray.far = 300; ray.firstHitOnly = true;
      const hit = ray.intersectObjects(meshes, false)[0];
      if (!hit) out.push(d.clone());
    }
    return out;
  };
  // hemisphere of directions above 25° elevation
  const dirs = [];
  for (let i = 0; i < 64; i++) {
    const u = (i + 0.5) / 64, el = Math.asin(0.42 + 0.58 * u), az = i * 2.39996;
    dirs.push(new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)));
  }
  const down = new THREE.Vector3(0, -1, 0);
  const leaks = async ({ x0 = -110, x1 = 115, z0 = -120, z1 = 72, step = 1.5, levels = null, zones = null } = {}) => {
    prepare();
    const ys = levels || [0.35, 4.5, 8.2, 15.6, -2.8, -3.0];
    const found = {};
    let tested = 0;
    for (const yb of ys) for (let x = x0; x <= x1; x += step) for (let z = z0; z <= z1; z += step) {
      const zn = zoneAt(x, yb + 0.3, z);
      if (!zn.indoor || (zones && !zones.includes(zn.id))) continue;
      // is there a floor just below? (otherwise we are inside a wall or in the air)
      const p = new THREE.Vector3(x, yb + 1.7, z);
      ray.set(p, down); ray.far = 2.4; ray.firstHitOnly = true;
      const f = ray.intersectObjects(meshes, false)[0];
      if (!f || f.distance < 0.8) continue;
      // and a ceiling above within reach: a free-standing point outdoors is not an interior
      tested++;
      const esc = castUp(p, dirs);
      if (esc.length) {
        const k = zn.id;
        (found[k] = found[k] || []).push({ p: [x, yb, z].map(v => +v.toFixed(1)), n: esc.length, d: esc.slice(0, 3).map(v => v.toArray().map(q => +q.toFixed(2))) });
      }
      if (tested % 400 === 0) await new Promise(r => setTimeout(r, 0));
    }
    const summary = Object.fromEntries(Object.entries(found).map(([k, v]) => [k, { points: v.length, worst: v.sort((a, b) => b.n - a.n).slice(0, 6) }]));
    return { tested, summary };
  };

  // --- the walking bot ----------------------------------------------------------
  const walk = async (route, { speed = 'walk', timeout = 40, tol = 0.7 } = {}) => {
    const w = app.walker, pts = route.pts;
    const [sx, sy, sz] = pts[0];
    app.enterWalk({ x: sx, y: sy, z: sz, yaw: 0 });
    w.setFeet(sx, sy, sz, 0);
    const dt = 1 / 60;
    let i = 1, t = 0, stuckT = 0, last = w.feet.clone();
    const log = [];
    w.keys.clear();
    while (i < pts.length && t < timeout) {
      const [tx, ty, tz] = pts[i];
      const f = w.feet;
      const dx = tx - f.x, dz = tz - f.z, dh = Math.hypot(dx, dz);
      if (dh < tol && Math.abs(ty - f.y) < 1.6) { i++; stuckT = 0; continue; }
      w.yaw = Math.atan2(-dx, -dz);
      w.keys.add('KeyW'); if (speed === 'run') w.keys.add('ShiftLeft');
      w.update(dt); t += dt;
      if (Math.round(t * 60) % 30 === 0) {
        const moved = w.feet.distanceTo(last); last = w.feet.clone();
        if (moved < 0.12) { stuckT += 0.5; if (stuckT >= 2) { log.push({ stuck: w.feet.toArray().map(v => +v.toFixed(2)), toward: i, target: pts[i] }); break; } }
        else stuckT = 0;
      }
      if (w.feet.y < -60) { log.push({ fell: true }); break; }
    }
    w.keys.clear();
    const ok = i >= pts.length;
    return { id: route.id, ok, reached: i, of: pts.length, time: +t.toFixed(1), end: w.feet.toArray().map(v => +v.toFixed(2)), zone: zoneAt(w.feet.x, w.feet.y + 0.3, w.feet.z).id, log };
  };
  const routes = async (list, opts) => {
    if (!list) list = (await import('../data/routes.js')).ROUTES;
    const out = [];
    for (const r of list) { out.push(await walk(r, opts)); await yieldTask(); }
    return out;
  };
  // every registered door, walked from outside to inside and back
  const doors = async (filter) => {
    const out = [];
    for (const d of app.doors) {
      if (filter && !d.id.includes(filter)) continue;
      const o = (d.th || 0.7) / 2 + (d.out || 2.2), i = (d.th || 0.7) / 2 + 1.4;
      const ox = d.x + d.nx * o, oz = d.z + d.nz * o, ix = d.x - d.nx * i, iz = d.z - d.nz * i;
      const gy = app.groundY(ox, oz, d.y + 1.6);
      if (d.noWalk) { out.push({ id: d.id, skipped: true }); continue; }
      const r1 = await walk({ id: d.id + ' in', pts: [[ox, gy + 0.1, oz], [d.x + d.nx * 0.3, d.y, d.z + d.nz * 0.3], [ix, d.y, iz]] }, { timeout: 12 });
      const r2 = await walk({ id: d.id + ' out', pts: [[ix, d.y + 0.05, iz], [ox, gy, oz]] }, { timeout: 12 });
      out.push({ id: d.id, in: r1.ok, out: r2.ok, rise: +(d.y - gy).toFixed(2), stuck: r1.log[0]?.stuck || r2.log[0]?.stuck || null });
      await yieldTask();
    }
    return out;
  };
  window.__audit = { leaks, walk, routes, doors, prepare, zones: ZONES.map(z => z.id) };
  return window.__audit;
}
