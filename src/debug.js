// Development helpers, active only with ?debug in the address.
// __step(n) advances frames; __go(target, position) places the aerial
// camera; __view(x,y,z,yaw,pitch) places the walker; __shot(name) posts a
// frame to a local receiver (see docs/DEVELOPMENT.md).
import * as THREE from 'three';
import { stats } from './world/aedificium.js';
import { LIB } from './world/aedLibrary.js';
export function installDebug(a) {
  console.info('[abbey] scriptorium desks:', stats.scriptoriumDesks, '· library rooms:', LIB.rooms.length, '· colliders tris:', a.walker.colliders[0].mesh.geometry.attributes.position.count / 3);
  window.a = a; window.THREE = THREE; a.THREE_ = THREE;
  import('./debug/audit.js').then(m => m.installAudit(a));
  window.__step = n => { for (let i = 0; i < n; i++) { a.clock.getDelta(); a.clock.oldTime -= 50; a.frame(); } };
  window.__go = (t, p, n = 4) => { if (a.mode !== 'aerial') a.setMode('aerial', true); a.aerial.flyTo(t, p, 0.01); window.__step(n); };
  window.__view = (x, y, z, yaw, pitch = 0, n = 25) => {
    if (a.mode !== 'walk') a.enterWalk({ x, y, z, yaw });
    a.walker.setFeet(x, y, z, yaw); a.walker.pitch = pitch; window.__step(n);
    return [a.zone && a.zone.id, a.room && a.room.id, a.walker.feet.toArray().map(v => +v.toFixed(2))];
  };
  window.__shot = async (name, w = 1280, h = 720) => {
    a.renderer.setPixelRatio(1); a.renderer.setSize(w, h, false);
    a.camera.aspect = w / h; a.camera.updateProjectionMatrix();
    a.effects.glowU.uScale.value = a.effects.smokeU.uScale.value = h;
    a.renderer.render(a.scene, a.camera);
    const d = a.renderer.domElement.toDataURL('image/jpeg', 0.85);
    await fetch('http://127.0.0.1:8124/' + name, { method: 'POST', body: d });
    return name;
  };
}
