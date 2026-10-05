// Phase-1 semantic section export (runs inside the unchanged browser game,
// driven by scripts/migration/browser_driver.mjs with shared/data/export/
// slice_cells.json). Captures Batch parts BEFORE their broad material merge,
// assigns each part to one semantic cell by explicit rules, merges only
// within (cell, material key), and writes:
//   cells/<cell>.glb            visual geometry; one mesh per material key,
//                               material named by its semantic key only
//   collision/<cell>.glb        separate collision triangles grouped by the
//                               browser's own surface id (footsteps)
//   dynamic/altar_pivot.glb     the skull altar in hinge-local space
//   generated/*.png             canvas-generated images used by exported keys
//   fields/*.bin                terrain height, ground and trodden-path fields
//   slice_export.json           manifest: rules, part census, exclusions,
//                               materials, anchors, emitters, hashes
// Optional products, each enabled only by its config key (the phase-1
// config uses none of them, so its output is unchanged):
//   cfg.altar === false         skip the dynamic skull altar
//   cfg.trees.groups            instanced tree groups by name, every LOD mesh
//                               of a group (the LOD buckets are camera-relative,
//                               so the union of a group's LOD meshes is the
//                               whole set), clipped to a box
//   cfg.walkable                uint8 per terrain-height vertex: 1 where the
//                               browser's terrainCollider() would collide
//                               (inside the enclosure + 8 m, the upper road,
//                               the spur)
//   cfg.coarse                  a second, coarser height grid (visual only)
//   cfg.far                     the browser's polar far ring: radii, heights
//                               and the smoothed normals buildTerrain() uses
// Explicit selection means hidden rooms are never lost to `onlyVisible`;
// the exporter is still called with onlyVisible:false.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFExporter } from '/__migration/vendor/three-r180/exporters/GLTFExporter.js';
import { plain, b64 } from '/__migration/util.js';
import { OSSUARY_PATH, SKULL_CHAPEL, CHAPELS } from '/src/world/church.js';
import { ANCHORS } from '/src/world/people/schedule.js';
import { CHURCH, CLOISTER, PX, ORIGIN, AED } from '/src/core/plan.js';
import { W } from '/src/core/weathering.js';
import { height, baseHeight, signedDist, roadInfo, ROAD } from '/src/world/terrain.js';
import { BELL_TOWER } from '/src/systems/audio.js';
import { surfaceOf } from '/src/core/kit.js';
import { shared } from '/src/core/materials.js';

const V3 = THREE.Vector3;
const box3 = b => new THREE.Box3(new V3(...b.min), new V3(...b.max));
const r6 = v => +(+v).toFixed(6);
const save = (rel, buf) => window.__migrationSave(rel, b64(buf));

export async function run(cfg) {
  const app = window.__abbey;
  const M = app.M;
  const batches = (window.__migrationBatches || []).map(x => x.batch);
  const cells = cfg.cells.map(c => ({ ...c, box: box3(c.center_box), parts: new Map(), coll: new Map(), census: { parts: 0, tris: 0, clipped: 0 } }));
  const excluded = {}, keysUsed = new Set();
  const tri = g => (g.index ? g.index.count : g.attributes.position.count) / 3;
  const matchKey = (key, pats) => (pats || []).some(p => p.endsWith('*') ? key.startsWith(p.slice(0, -1)) : key === p);

  // --- assign parts to cells ------------------------------------------------
  for (const b of batches) {
    const off = new V3(...b.offset);
    const colliderSet = new Map(b.colliders.map((g, i) => [g, b.colliderKeys[i]]));
    const seenColliders = new Set();
    for (const [key, list] of b.parts) {
      for (const g0 of list) {
        g0.computeBoundingBox();
        const bb = g0.boundingBox.clone().translate(off);
        const c = bb.getCenter(new V3());
        let placed = false;
        for (const cell of cells) {
          if (!cell.batches.includes(b.name) || matchKey(key, cell.exclude_keys) || (cell.include_keys && !matchKey(key, cell.include_keys))) continue;
          if (cell.box.containsPoint(c)) {
            const g = clipPart(g0, off, cell);
            if (!g) { placed = true; break; }
            add(cell.parts, key, g); keysUsed.add(key);
            cell.census.parts++; cell.census.tris += tri(g);
            if (colliderSet.has(g0)) { add(cell.coll, surfaceOf(b.name, colliderSet.get(g0)), g); seenColliders.add(g0); }
            placed = true; break;
          }
          if (cell.clip_large && bb.intersectsBox(cell.box)) {
            const g = clipPart(g0, off, cell, true);
            if (!g) continue;
            add(cell.parts, key, g); keysUsed.add(key);
            cell.census.parts++; cell.census.clipped++; cell.census.tris += tri(g);
            if (colliderSet.has(g0)) { add(cell.coll, surfaceOf(b.name, colliderSet.get(g0)), g); seenColliders.add(g0); }
            placed = true; break;
          }
        }
        if (!placed) { const e = excluded[b.name + ':' + key] ||= { parts: 0, tris: 0 }; e.parts++; e.tris += tri(g0); }
      }
    }
    // collision-only surfaces (ramps over the stairs, step quads)
    for (let i = 0; i < b.colliders.length; i++) {
      const g0 = b.colliders[i];
      if (seenColliders.has(g0) || [...b.parts.values()].some(l => l.includes(g0))) continue;
      g0.computeBoundingBox();
      const bb = g0.boundingBox.clone().translate(off), c = bb.getCenter(new V3());
      for (const cell of cells) {
        if (!cell.batches.includes(b.name)) continue;
        if (cell.box.containsPoint(c) || (cell.clip_large && bb.intersectsBox(cell.box))) {
          const g = clipPart(g0, off, cell, !cell.box.containsPoint(c));
          if (g) add(cell.coll, surfaceOf(b.name, b.colliderKeys[i]), g);
          break;
        }
      }
    }
  }

  // --- write cells ------------------------------------------------------------
  const exporter = new GLTFExporter();
  const files = {};
  const cellRecords = [];
  for (const cell of cells) {
    const scene = new THREE.Scene();
    const root = new THREE.Group(); root.name = cell.id; scene.add(root);
    const meshes = [];
    const bounds = new THREE.Box3();
    for (const [key, list] of cell.parts) {
      const mat = resolve(M, key);
      const g = mergeFor(list, !!mat?.vertexColors);
      if (!g) continue;
      g.computeBoundingBox(); bounds.union(g.boundingBox);
      const mesh = new THREE.Mesh(g, placeholder(key));
      mesh.name = cell.id + '__' + key.replace(/\./g, '_');
      mesh.userData = { material_key: key, cell: cell.id, cast_shadow: !(mat?.transparent) };
      root.add(mesh);
      meshes.push({ key, node: mesh.name, triangles: tri(g), vertices: g.attributes.position.count });
    }
    if (!meshes.length) continue;
    files['cells/' + cell.id + '.glb'] = await saveGLB(exporter, scene, 'cells/' + cell.id + '.glb');
    // collision
    const cs = new THREE.Scene(), cr = new THREE.Group(); cr.name = cell.id + '_collision'; cs.add(cr);
    const coll = [];
    for (const [surf, list] of cell.coll) {
      const g = mergeFor(list.map(x => positionsOnly(x)), false, true);
      if (!g) continue;
      const m = new THREE.Mesh(g, placeholder('collision:' + surf)); m.name = 'col__' + surf + '-colonly'; m.userData = { surface: surf }; cr.add(m);
      coll.push({ surface: surf, triangles: tri(g) });
    }
    if (coll.length) files['collision/' + cell.id + '.glb'] = await saveGLB(exporter, cs, 'collision/' + cell.id + '.glb');
    cellRecords.push({ id: cell.id, rule: plain({ batches: cell.batches, center_box: cell.center_box, exclude_keys: cell.exclude_keys, include_keys: cell.include_keys, clip_large: !!cell.clip_large, keep_plane: cell.keep_plane }), census: cell.census, bounds: { min: bounds.min.toArray().map(r6), max: bounds.max.toArray().map(r6) }, meshes, collision: coll });
  }

  // --- dynamic skull altar ----------------------------------------------------
  const altar = app.church.altar;
  const pivot = altar.pivot, hinge = pivot.parent;
  hinge.updateWorldMatrix(true, true);
  const hingePos = hinge.getWorldPosition(new V3());
  if (cfg.altar !== false) {
    const scene = new THREE.Scene();
    const root = new THREE.Group(); root.name = 'altar_pivot'; scene.add(root);
    const inv = hinge.matrixWorld.clone().invert();
    let k = 0;
    pivot.traverse(o => {
      if (!o.isMesh) return;
      o.updateWorldMatrix(true, false);
      const g = o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      const key = materialKey(M, o.material) || ('altar_' + (o.material.name || k));
      keysUsed.add(key);
      const mesh = new THREE.Mesh(mergeFor([g], false), placeholder(key));
      mesh.name = 'altar__' + (k++) + '__' + key.replace(/\./g, '_'); mesh.userData = { material_key: key };
      root.add(mesh);
    });
    files['dynamic/altar_pivot.glb'] = await saveGLB(exporter, scene, 'dynamic/altar_pivot.glb');
  }
  const colGeo = altar.collider?.geometry || altar.collider?.mesh?.geometry;
  colGeo?.computeBoundingBox?.();

  // --- trees (frozen reference instances) --------------------------------------
  const trees = [];
  if (!cfg.trees.groups) {
    // phase 1: lod0 broadleaves in the garth
    const garth = box3(cfg.trees.box);
    const scene = new THREE.Scene(), root = new THREE.Group(); root.name = 'trees'; scene.add(root);
    const m4 = new THREE.Matrix4(), p = new V3();
    app.scene.traverse(o => {
      if (!o.isInstancedMesh || !/^(fruit\d|elm\d|oak|rose):lod0$/.test(o.name)) return;
      const inst = [];
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, m4); m4.premultiply(o.matrixWorld); p.setFromMatrixPosition(m4);
        if (garth.containsPoint(p)) inst.push(m4.toArray().map(r6));
      }
      if (!inst.length) return;
      const mesh = new THREE.Mesh(o.geometry.clone(), o.material);
      mesh.name = o.name.replace(':', '_'); root.add(mesh);
      trees.push({ mesh: mesh.name, source: o.name, instances: inst, triangles: tri(o.geometry), material: plain(materialInfo(o.material)) });
    });
    if (trees.length) files['props/garth_trees.glb'] = await saveGLB(exporter, scene, 'props/garth_trees.glb', { embedTextures: true });
  } else {
    for (const grp of cfg.trees.groups) {
      const bx = box3(grp.box), names = new RegExp(grp.names);
      const scene = new THREE.Scene(), root = new THREE.Group(); root.name = 'trees'; scene.add(root);
      const m4 = new THREE.Matrix4(), p = new V3();
      const byGroup = new Map();
      app.scene.traverse(o => {
        const m = o.isInstancedMesh && /^(.+):lod(\d)$/.exec(o.name);
        if (!m || !names.test(m[1])) return;
        let g = byGroup.get(m[1]);
        if (!g) byGroup.set(m[1], g = { lods: [], instances: [] });
        g.lods[+m[2]] = o;
        for (let i = 0; i < o.count; i++) {
          o.getMatrixAt(i, m4); m4.premultiply(o.matrixWorld); p.setFromMatrixPosition(m4);
          if (bx.containsPoint(p)) g.instances.push(m4.toArray().map(r6));
        }
      });
      for (const [name, g] of [...byGroup].sort()) {
        if (!g.instances.length) continue;
        const lods = [];
        g.lods.forEach((o, i) => {
          if (!o) return;
          const mesh = new THREE.Mesh(o.geometry.clone(), o.material);
          mesh.name = name + '_lod' + i; root.add(mesh);
          lods.push({ mesh: mesh.name, triangles: tri(o.geometry), cast_shadow: o.castShadow });
        });
        trees.push({ group: name, file: grp.file, mesh: lods[0].mesh, lods, lod_max_m: [55, 190], instances: g.instances, triangles: lods[0].triangles, material: plain(materialInfo(g.lods[0].material)) });
      }
      if (root.children.length) files[grp.file] = await saveGLB(exporter, scene, grp.file, { embedTextures: true });
    }
  }

  // --- materials -------------------------------------------------------------
  const materials = {}, images = new Map();
  for (const key of [...keysUsed].sort()) {
    const m = resolve(M, key);
    if (!m) { materials[key] = { missing: true }; continue; }
    materials[key] = await materialRecord(m, key, images);
  }

  // --- fields: terrain height, ground height (weathering), trodden mask ------
  const F = cfg.fields;
  const nx = Math.round((F.x1 - F.x0) / F.step) + 1, nz = Math.round((F.z1 - F.z0) / F.step) + 1;
  const hf = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) hf[j * nx + i] = height(F.x0 + i * F.step, F.z0 + j * F.step);
  files['fields/terrain_height.bin'] = await save('fields/terrain_height.bin', hf.buffer);
  const bf = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) bf[j * nx + i] = baseHeight(F.x0 + i * F.step, F.z0 + j * F.step);
  files['fields/terrain_base.bin'] = await save('fields/terrain_base.bin', bf.buffer);
  const fields = { terrain_height: { file: 'fields/terrain_height.bin', base_file: 'fields/terrain_base.bin', sunk_below_base_m: 0.8, format: 'float32 row-major, z rows', x0: F.x0, z0: F.z0, step: F.step, nx, nz, source: 'web/src/world/terrain.js height(x,z) incl. building sinks; baseHeight(x,z) without; terrainCollider() skips cells with a corner sunk > 0.8 m (floors take over)' } };
  if (cfg.walkable) {
    // terrainCollider(): signedDist < 8 || (road d < 10 && s < 0.55) || spur < 8
    const wm = new Uint8Array(nx * nz);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const x = F.x0 + i * F.step, z = F.z0 + j * F.step, ri = roadInfo(x, z);
      wm[j * nx + i] = (signedDist(x, z) < 8 || (ri.d < 10 && ri.s < 0.55) || ri.spur < 8) ? 1 : 0;
    }
    files['fields/walkable_u8.bin'] = await save('fields/walkable_u8.bin', wm.buffer);
    fields.walkable = { file: 'fields/walkable_u8.bin', format: 'uint8 per terrain_height vertex, row-major', rule: 'web/src/world/terrain.js terrainCollider(): signedDist < 8 || (roadInfo d < 10 && s < 0.55) || spur < 8 (vertex sampled; the browser samples cell corners at 1.5 m)' };
  }
  if (cfg.coarse) {
    const C = cfg.coarse, cnx = Math.round((C.x1 - C.x0) / C.step) + 1, cnz = Math.round((C.z1 - C.z0) / C.step) + 1;
    const ch = new Float32Array(cnx * cnz);
    for (let j = 0; j < cnz; j++) for (let i = 0; i < cnx; i++) ch[j * cnx + i] = height(C.x0 + i * C.step, C.z0 + j * C.step);
    files['fields/coarse_height.bin'] = await save('fields/coarse_height.bin', ch.buffer);
    fields.coarse = { file: 'fields/coarse_height.bin', x0: C.x0, z0: C.z0, step: C.step, nx: cnx, nz: cnz, disc: C.disc || null, format: 'float32 row-major, z rows', source: 'terrain.js height(x,z); visual only (no collider), joined to the fine patch under a skirt' };
  }
  if (cfg.far) {
    // buildTerrain() far ring: A angles, radii growing by max(1.4, r·2π/A)
    const R0 = cfg.far, A = R0.A, radii = [];
    for (let r = R0.r0, k = 0; k <= R0.rings && r < R0.r1; k++) { radii.push(r); r += Math.max(1.4, r * (2 * Math.PI / A)); }
    const R = radii.length, hv = new Float32Array(R * A * 4);
    for (let k = 0; k < R; k++) {
      const e = k ? Math.max(2, (radii[k] - radii[k - 1]) * 0.8) : 2;
      for (let i = 0; i < A; i++) {
        const t = i / A * Math.PI * 2, x = R0.cx + Math.cos(t) * radii[k], z = R0.cz + Math.sin(t) * radii[k], q = (k * A + i) * 4;
        const hx = (baseHeight(x + e, z) - baseHeight(x - e, z)) / (2 * e), hz = (baseHeight(x, z + e) - baseHeight(x, z - e)) / (2 * e), l = Math.hypot(hx, 1, hz);
        hv[q] = height(x, z); hv[q + 1] = -hx / l; hv[q + 2] = 1 / l; hv[q + 3] = -hz / l;
      }
    }
    files['fields/far_ring.bin'] = await save('fields/far_ring.bin', hv.buffer);
    fields.far = { file: 'fields/far_ring.bin', cx: R0.cx, cz: R0.cz, A, radii: radii.map(r6), format: 'float32 [height, nx, ny, nz] per (ring k, angle i), row-major by ring; angle t = i/A·2π, x = cx + cos t·r, z = cz + sin t·r', source: 'terrain.js buildTerrain() far ring (normals from baseHeight central differences over ~0.8 of a ring step)' };
  }
  for (const [name, tex, rect] of [['ground', W.tGround.value, W.uGround.value], ['trodden', W.tMask.value, W.uMask.value]]) {
    const rec = await dumpTexture(tex, 'fields/' + name);
    if (rec) { files[rec.file] = rec.saved; delete rec.saved; fields[name] = { ...rec, rect: [rect.x, rect.y, rect.z, rect.w ?? 0].map(r6), note: name === 'ground' ? 'weathering.js W.tGround: world rect x0,z0,size; R = ground height' : 'weathering.js W.tMask: world rect x0,z0,size; R = trodden path' }; }
  }

  // --- anchors / route / emitters --------------------------------------------
  const porch = ANCHORS.CLOIS.porch;
  const benchTop = app.groundY(porch.x, porch.z, 0.35 + 0.72);
  const zc = (CHURCH.zN + CHURCH.zS) / 2;
  const region = box3(cfg.region);
  const anchors = {
    plan: { PX, ORIGIN, CHURCH: { x0: CHURCH.x0, xCross: CHURCH.xCross, xChoir: CHURCH.xChoir, xApse: CHURCH.xApse, zN: CHURCH.zN, zS: CHURCH.zS, zc, transeptN: CHURCH.transeptN, vScale: CHURCH.vScale }, CLOISTER: { ...CLOISTER }, SKULL_CHAPEL, CHAPELS },
    'cloister.porch': { x: porch.x, y: 0.35, z: porch.z, ry: porch.ry, source: 'web/src/world/people/schedule.js CLOIS.porch' },
    'cloister.porchBenchTop': { x: porch.x, y: benchTop, z: porch.z, source: 'app.groundY ray at the porch slot (people.js resolveY)' },
    'alinardo.seatRoot': { x: porch.x, y: benchTop - 0.46, z: porch.z, ry: porch.ry, source: 'people.js resolveY: bench top − SEAT_H.sit (0.46)' },
    'church.skullChapel': app.ctx.anchors.church.skullChapel,
    'church.westDoor': app.ctx.anchors.church.westDoor, 'church.northDoor': app.ctx.anchors.church.northDoor, 'church.choir': app.ctx.anchors.church.choir, 'church.nave': app.ctx.anchors.church.nave,
    'ossuary.chapelBottom': app.ctx.anchors.ossuary.chapelBottom,
    'ossuary.path': OSSUARY_PATH,
    'altar.hinge': hingePos.toArray().map(r6),
    'altar.rotationPerOpen': -1.45,
    'altar.collider': colGeo?.boundingBox ? { min: colGeo.boundingBox.min.toArray().map(r6), max: colGeo.boundingBox.max.toArray().map(r6), frame: 'hinge-local' } : null,
    'altar.interact': (() => { const it = app.interactables.find(i => i.id === 'skull-altar'); return it ? { pos: it.pos.toArray().map(r6), radius: it.radius, label: it.label } : null; })(),
  };
  if (cfg.day1_anchors) {
    const A = app.ctx.anchors;
    anchors.gate = plain(A.gate); anchors.hospice = plain(A.hospice);
    anchors.road = ROAD.map(q => q.map(r6));
    anchors.bell_tower = [BELL_TOWER.x, BELL_TOWER.y, BELL_TOWER.z].map(r6);
  }
  const doors = app.doors.filter(d => region.containsPoint(new V3(d.x, d.y ?? 0.35, d.z))).map(d => plain({ id: d.id, building: d.building, x: d.x, y: d.y, z: d.z, nx: d.nx, nz: d.nz, w: d.w, th: d.th, open: d.open, out: d.out }));
  const interactables = app.interactables.filter(i => i.pos && region.containsPoint(i.pos)).map(i => ({ id: i.id, pos: i.pos.toArray().map(r6), radius: i.radius, label: i.label, altar: !!i.altar }));
  const emitters = app.emitters.filter(e => region.containsPoint(new V3(e.x, e.y, e.z))).map(e => plain(e));
  const sound_emitters = (app.sound?.emitters || []).map(e => ({ kind: e.o?.kind ?? e.kind, pos: e.pos ? [e.pos.x, e.pos.y, e.pos.z].map(r6) : null, radius: e.o?.radius ?? e.radius ?? null, gain: e.o?.gain ?? e.gain ?? null, zone: e.o?.zone ?? e.zone ?? null })).filter(e => e.pos && region.containsPoint(new V3(...e.pos)));
  // ground probes: three surveyed heights to check the native import against
  const probes = cfg.probes.map(([x, z, from]) => ({ x, z, from, y: r6(app.groundY(x, z, from)) }));
  return plain({
    schema_version: 1,
    exporter: { three_revision: THREE.REVISION, gltf_exporter: 'three r180 examples/jsm/exporters/GLTFExporter.js (pinned, scripts/migration/vendor)', only_visible: false },
    coordinate_convention: 'metres; +X east, +Y up, +Z south; same frame in Godot (no axis conversion)',
    snow_cover: shared.uSnow.value,
    cells: cellRecords, excluded, files, materials, images: [...images.values()], fields, anchors, doors, interactables, emitters, sound_emitters, trees, probes,
  });
}

function add(map, k, v) { if (!map.has(k)) map.set(k, []); map.get(k).push(v); }
function resolve(M, key) { return key.split('.').reduce((o, k) => o?.[k], M); }
function materialKey(M, mat) {
  for (const [k, v] of Object.entries(M)) {
    if (v === mat) return k;
    if (v && typeof v === 'object' && !v.isMaterial) for (const [k2, v2] of Object.entries(v)) if (v2 === mat) return k + '.' + k2;
  }
  return null;
}
function placeholder(key) { const m = new THREE.MeshStandardMaterial({ color: 0xffffff }); m.name = key; return m; }

// world-space copy of a part, optionally clipped (triangle centroid inside
// the cell's centre box and on the kept side of its keep_plane)
function clipPart(g0, off, cell, force = false) {
  let g = (g0.index ? g0.toNonIndexed() : g0.clone()).translate(off.x, off.y, off.z);
  const kp = cell.keep_plane;
  if (!force && !kp) return g;
  const pos = g.attributes.position, keep = [];
  const c = new V3();
  for (let t = 0; t < pos.count / 3; t++) {
    c.set(0, 0, 0);
    for (let k = 0; k < 3; k++) c.x += pos.getX(t * 3 + k) / 3, c.y += pos.getY(t * 3 + k) / 3, c.z += pos.getZ(t * 3 + k) / 3;
    if (force && !cell.box.containsPoint(c)) continue;
    if (kp && c.y < kp.below_y) {
      const along = (c.x - kp.origin[0]) * kp.dir[0] + (c.z - kp.origin[1]) * kp.dir[1];
      if (along > kp.max) continue;
    }
    keep.push(t);
  }
  if (keep.length === pos.count / 3) return g;
  if (!keep.length) return null;
  const out = new THREE.BufferGeometry();
  for (const [name, a] of Object.entries(g.attributes)) {
    const n = a.itemSize, src = a.array, dst = new src.constructor(keep.length * 3 * n);
    keep.forEach((t, i) => dst.set(src.subarray(t * 3 * n, t * 3 * n + 3 * n), i * 3 * n));
    out.setAttribute(name, new THREE.BufferAttribute(dst, n, a.normalized));
  }
  return out;
}
function toFloat(a) {
  const n = a.count * a.itemSize, out = new Float32Array(n);
  if (!a.isInterleavedBufferAttribute && !a.normalized && a.array.length === n) { out.set(a.array); return out; }
  for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) out[i * a.itemSize + k] = a.getComponent(i, k);
  return out;
}
function positionsOnly(g) { const o = new THREE.BufferGeometry(); o.setAttribute('position', g.attributes.position); return o; }
// merge within one (cell, key): position/normal/uv (+colour where the
// browser material uses vertex colours); welded for a compact indexed mesh
function mergeFor(list, vcol, posOnly = false) {
  const keepNames = posOnly ? ['position'] : ['position', 'normal', 'uv', ...(vcol ? ['color'] : [])];
  const norm = list.map(g0 => {
    const g = g0.index ? g0.toNonIndexed() : g0;
    const o = new THREE.BufferGeometry();
    for (const n of keepNames) {
      let a = g.attributes[n];
      if (!a && n === 'color') a = new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3);
      if (!a && n === 'uv') a = new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2);
      if (!a && n === 'normal') { g.computeVertexNormals(); a = g.attributes.normal; }
      if (n === 'color' && a.itemSize === 4) { const c = new Float32Array(a.count * 3); for (let i = 0; i < a.count; i++) { c[i * 3] = a.getX(i); c[i * 3 + 1] = a.getY(i); c[i * 3 + 2] = a.getZ(i); } a = new THREE.BufferAttribute(c, 3); }
      o.setAttribute(n, new THREE.BufferAttribute(toFloat(a), a.itemSize));
    }
    return o;
  }).filter(g => g.attributes.position.count);
  if (!norm.length) return null;
  const m = mergeGeometries(norm, false);
  return mergeVertices(m, 1e-5);
}
async function saveGLB(exporter, scene, rel, { embedTextures = false } = {}) {
  const buf = await exporter.parseAsync(scene, { binary: true, onlyVisible: false, embedImages: embedTextures, includeCustomExtensions: false, maxTextureSize: 2048 });
  return save(rel, buf);
}

function texInfo(t) {
  if (!t) return null;
  const src = t.image?.currentSrc || t.image?.src || '';
  const set = /assets\/textures\/([^/]+)\.(jpg|png|webp)/.exec(src);
  return { source: set ? 'shared/assets/textures/' + set[1] + '.' + set[2] : (t.image instanceof HTMLCanvasElement || t.isCanvasTexture ? 'canvas' : (t.isDataTexture ? 'data' : 'unknown')), set: set?.[1] ?? null,
    repeat: [t.repeat.x, t.repeat.y].map(r6), offset: [t.offset.x, t.offset.y].map(r6), rotation: r6(t.rotation), color_space: t.colorSpace, wrap: [t.wrapS, t.wrapT], channel: t.channel ?? 0, flipY: t.flipY };
}
function materialInfo(m) {
  return { type: m.type, color: m.color?.getHexString(), roughness: m.roughness, metalness: m.metalness, env: m.envMapIntensity, emissive: m.emissive?.getHexString(), emissive_intensity: m.emissiveIntensity,
    transparent: m.transparent, opacity: m.opacity, depth_write: m.depthWrite, side: m.side, vertex_colors: m.vertexColors, alpha_test: m.alphaTest, tone_mapped: m.toneMapped,
    normal_scale: m.normalScale ? [m.normalScale.x, m.normalScale.y] : null, ao_intensity: m.aoMapIntensity,
    map: texInfo(m.map), normal_map: texInfo(m.normalMap), ao_map: texInfo(m.aoMap), roughness_map: texInfo(m.roughnessMap), metalness_map: texInfo(m.metalnessMap), emissive_map: texInfo(m.emissiveMap), alpha_map: texInfo(m.alphaMap),
    snow: !!m.userData?.snow, underground: !!m.userData?.underground, has_on_before_compile: !!m.onBeforeCompile && m.onBeforeCompile.toString() !== THREE.Material.prototype.onBeforeCompile.toString() };
}
async function materialRecord(m, key, images) {
  const rec = materialInfo(m);
  const wz = m.userData?.wz;
  if (wz) rec.weathering = { snow_k: wz.wzSnowK.value, min_up: wz.wzMinUp.value, macro_streak_damp_soot: wz.wzA.value.toArray(), lichen_drift_rough_wet: wz.wzB.value.toArray(), tile_overlayAmount_overlayScale_cavity: wz.wzC.value.toArray(), tint_a: wz.wzTintA.value.getHexString(), tint_b: wz.wzTintB.value.getHexString(), saturation: wz.wzSat.value, overlay_map: texInfo(wz.wzOvMap?.value), overlay_normal: texInfo(wz.wzOvNrm?.value) };
  for (const slot of ['map', 'normal_map', 'ao_map', 'roughness_map', 'metalness_map', 'emissive_map', 'alpha_map']) {
    const info = rec[slot];
    if (!info || info.source !== 'canvas') continue;
    const tex = { map: m.map, normal_map: m.normalMap, ao_map: m.aoMap, roughness_map: m.roughnessMap, metalness_map: m.metalnessMap, emissive_map: m.emissiveMap, alpha_map: m.alphaMap }[slot];
    const img = tex.image;
    if (!images.has(img)) {
      const name = 'generated/' + key.replace(/[^a-zA-Z0-9]+/g, '_') + '_' + slot + '.png';
      const blob = await new Promise(r => img.toBlob(r, 'image/png'));
      const saved = await save(name, await blob.arrayBuffer());
      images.set(img, { file: name, width: img.width, height: img.height, ...saved, first_key: key, slot });
    }
    info.file = images.get(img).file;
  }
  return rec;
}
async function dumpTexture(tex, base) {
  const img = tex?.image;
  if (!img) return null;
  if (img.data) {
    const d = img.data, kind = d.constructor.name;
    const saved = await save(base + '.bin', d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength));
    return { file: base + '.bin', width: img.width, height: img.height, array: kind, channels: d.length / (img.width * img.height), saved };
  }
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  const saved = await save(base + '.bin', d.buffer);
  return { file: base + '.bin', width: c.width, height: c.height, array: 'Uint8ClampedArray', channels: 4, saved };
}
