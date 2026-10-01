// Geometry conservation check for render-only batching. Uses the repository's
// pinned Three modules, matching the browser import map, without an install.
import { registerHooks } from 'node:module';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
const base = new URL('../', import.meta.url);
registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'three') return { url: new URL('lib/three/three.module.js', base).href, shortCircuit: true };
  if (specifier.startsWith('three/addons/')) return { url: new URL('lib/three/addons/' + specifier.slice(13), base).href, shortCircuit: true };
  return next(specifier, context);
} });
const THREE = await import('three');
const { Batch, box, cyl } = await import('../src/core/kit.js');
const b = new Batch('check-interior', [11, 0, -9]);
for (const [x, y, z] of [[-60, .3, -60], [-24, .3, 24], [-.5, 8.2, -.5], [24, 15.6, 48], [65, .3, -23]]) {
  b.add('stone', box(2, 3, 1, { x, y, z }));
  b.add('wood', cyl(.3, .3, 1, 12, { x: x + 2, y, z }), { collide: false, shadow: false });
}
b.add('stone', box(92, .25, 70, { y: 8 }));
const colored = box(1, 1, 1, { x: 24, y: 15.6, z: 48 });
colored.setAttribute('color', new THREE.Float32BufferAttribute(Array.from({ length: colored.attributes.position.count * 3 }, (_, i) => .2 + i % 3 * .1), 3));
b.add('wood', colored, { collide: false });
const digest = array => createHash('sha256').update(Buffer.from(array.buffer, array.byteOffset, array.byteLength)).digest('hex');
const triangles = entries => {
  const out = new Map();
  for (const [key, g] of entries) for (let i = 0; i < g.attributes.position.count; i += 3) {
    const values = [];
    for (let j = i; j < i + 3; j++) for (const [name, size] of [['position', 3], ['normal', 3], ['uv', 2], ['color', 3]]) {
      const a = g.attributes[name];
      for (let k = 0; k < size; k++) values.push(a ? a.array[j * size + k] : name === 'color' ? 1 : 0);
    }
    const id = key + ':' + digest(new Float32Array(values)); out.set(id, (out.get(id) || 0) + 1);
  }
  return JSON.stringify([...out].sort(([a], [b]) => a.localeCompare(b)));
};
const expected = triangles([...b.parts].flatMap(([key, parts]) => parts.map(g => [key, g])));
const colliderBefore = digest(b.colliderGeometry().attributes.position.array);
const M = { stone: new THREE.MeshStandardMaterial(), wood: new THREE.MeshStandardMaterial({ vertexColors: true }) }, group = b.build(M);
const actual = triangles(group.children.map(m => [m.name.slice(b.name.length + 1).split(':')[0], m.geometry]));
const local = new Batch('aed-library'); local.add('stone', box(3, 3, 3, { x: -8 })); local.add('stone', box(3, 3, 3, { x: 8 }));
const localGroup = local.build(M);
const result = { renderMeshes: group.children.length, originalTriangles: [...b.parts.values()].flat().reduce((n, g) => n + g.attributes.position.count / 3, 0),
  positionsNormalsUvsColorsAndWindingPreserved: expected === actual, collisionUnchanged: colliderBefore === digest(b.colliderGeometry().attributes.position.array),
  offsetsPreserved: group.children.every(m => m.position.toArray().every((v, i) => v === b.offset[i])),
  shadowPolicyPreserved: group.children.every(m => m.castShadow === m.name.includes(':stone:')),
  coloredMaterialsRetainNeutralPlainPieces: group.children.filter(m => m.material.vertexColors).every(m => !!m.geometry.attributes.color),
  singleBuildingRetainsOneMaterialBatch: !localGroup.userData.renderCells && localGroup.children.length === 1 };
console.log(JSON.stringify(result, null, 2));
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(result, null, 2) + '\n');
if (Object.entries(result).some(([k, v]) => typeof v === 'boolean' && !v)) process.exitCode = 1;
