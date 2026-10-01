// Read-only census of what the live browser scene holds inside the phase-1
// slice region: retained Batch parts by batch/material, non-batch meshes,
// anchors, doors and interactables. Used to write the export cell rules.
import * as THREE from 'three';
import { plain } from '/__migration/util.js';

export async function run(cfg) {
  const app = window.__abbey;
  const region = new THREE.Box3(new THREE.Vector3(...cfg.region.min), new THREE.Vector3(...cfg.region.max));
  const out = { batches: [], others: [], anchors: app.ctx.anchors, doors: [], interactables: [] };
  const inBatch = new Set();
  for (const { batch, group } of window.__migrationBatches || []) {
    group.traverse(o => inBatch.add(o));
    const off = new THREE.Vector3(...batch.offset);
    const keys = {};
    let n = 0;
    for (const [key, list] of batch.parts) {
      for (const g of list) {
        g.computeBoundingBox();
        const b = g.boundingBox.clone().translate(off);
        if (!b.intersectsBox(region)) continue;
        const s = b.getSize(new THREE.Vector3());
        const k = keys[key] ||= { parts: 0, tris: 0, big: 0 };
        k.parts++; k.tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
        if (Math.max(s.x, s.z) > 20) k.big++;
        n++;
      }
    }
    if (n) out.batches.push({ name: batch.name, offset: batch.offset, keys, colliders: batch.colliders.length });
  }
  app.scene.traverse(o => {
    if (!o.isMesh || inBatch.has(o)) return;
    let p = o; let people = false;
    while (p) { if (p.name === 'people') people = true; p = p.parent; }
    if (people) return;
    o.updateWorldMatrix(true, false);
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
    if (!b.intersectsBox(region)) return;
    const s = b.getSize(new THREE.Vector3());
    out.others.push({ name: o.name, type: o.type, parent: o.parent?.name, mat: o.material?.name || o.material?.type, instanced: !!o.isInstancedMesh, count: o.count, size: s.toArray().map(v => +v.toFixed(2)), min: b.min.toArray().map(v => +v.toFixed(2)), tris: (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 });
  });
  for (const d of app.doors) if (region.containsPoint(new THREE.Vector3(d.x, d.y ?? 0.35, d.z))) out.doors.push({ id: d.id, x: d.x, y: d.y, z: d.z, nx: d.nx, nz: d.nz, w: d.w, th: d.th });
  for (const it of app.interactables) if (it.pos && region.containsPoint(it.pos)) out.interactables.push({ id: it.id, pos: it.pos.toArray(), radius: it.radius, label: it.label, altar: !!it.altar });
  out.batchCount = (window.__migrationBatches || []).length;
  return plain(out);
}
