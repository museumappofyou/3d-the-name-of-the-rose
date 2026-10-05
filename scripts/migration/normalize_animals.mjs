// Normalized animal derivatives for the native Day-1A slice.
//
//   node scripts/migration/normalize_animals.mjs
//
// Input (unchanged): shared/assets/models/animal_donkey.glb (Quaternius,
// CC0 — shared/provenance/model-sources.json). Godot refuses its required
// EXT_meshopt_compression, so the buffers are decoded bit-exactly (as for
// the cast, normalize_people.mjs) and written to
// native/assets/animals/mule/mule.glb. Geometry, skin, weights and the
// five clips (Idle, Idle_2, Eating, Idle_Headlow, Walk) are unchanged.
// The browser's mule (web/src/world/animals.js KIND.mule, COATS.mule) is the
// same donkey fitted to 1.62 m with the mule coat; both are applied at run
// time from shared/data/manifests/animal_derivatives.json.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dequantize } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const src = path.join(ROOT, 'shared/assets/models/animal_donkey.glb');
const doc = await io.read(src);
await doc.transform(dequantize({ pattern: /^(POSITION|NORMAL|TANGENT|TEXCOORD_\d+)$/ }));
for (const e of doc.getRoot().listExtensionsUsed()) if (/meshopt|quantization/i.test(e.extensionName)) e.dispose();
// bounding height in the bind pose (the browser fits the bounding box height)
let y0 = Infinity, y1 = -Infinity;
for (const node of doc.getRoot().listNodes()) {
  const m = node.getMesh(); if (!m) continue;
  const w = node.getWorldMatrix();
  for (const p of m.listPrimitives()) {
    const a = p.getAttribute('POSITION'), e = [];
    for (let i = 0; i < a.getCount(); i++) { a.getElement(i, e); const y = w[1] * e[0] + w[5] * e[1] + w[9] * e[2] + w[13]; y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  }
}
const out = path.join(ROOT, 'native/assets/animals/mule/mule.glb');
fs.mkdirSync(path.dirname(out), { recursive: true });
await io.write(out, doc);
const manifest = {
  schema_version: 1, generator: 'scripts/migration/normalize_animals.mjs',
  animals: {
    mule: {
      source: path.relative(ROOT, src), source_sha256: sha(src), output: path.relative(ROOT, out), output_sha256: sha(out),
      licence: 'CC0 1.0 (Quaternius farm animals; shared/provenance/model-sources.json)',
      clips: doc.getRoot().listAnimations().map(a => a.getName()),
      bind_height_m: +(y1 - y0).toFixed(5), target_height_m: 1.62, scale: +(1.62 / (y1 - y0)).toFixed(6),
      coat: { Main: '4f4034', Main_Light: '7a6a58', Hair: '2a221c', Muzzle: '6a5c4e', Hooves: '2a2521' },
      browser_binding: 'web/src/world/animals.js KIND.mule (donkey fitted to 1.62 m) and COATS.mule',
      transformations: ['meshopt decode', 'dequantize POSITION/NORMAL/TANGENT/TEXCOORD to float32'],
    },
  },
};
fs.writeFileSync(path.join(ROOT, 'shared/data/manifests/animal_derivatives.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log(JSON.stringify(manifest.animals.mule, null, 0));
