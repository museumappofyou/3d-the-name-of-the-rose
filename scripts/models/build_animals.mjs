// Web derivatives of the abbey's livestock (see docs/assets/MODEL_SOURCES.md):
// Quaternius "Ultimate Animated Animals" / "Farm Animals" (CC0) via
// poly.pizza, and three static Google Poly models (CC BY 3.0): hen, rooster,
// goat. Each is welded and given smooth normals (the sources are flat-shaded
// low-poly), stripped to the calm clips the abbey uses, and meshopt-packed.
//   node scripts/models/build_animals.mjs SRC_DIR OUT_DIR
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { prune, resample, dedup, weld, normals } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import fs from 'fs';
import path from 'path';
const [,, SRC, OUT] = process.argv;
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const KEEP = /^(Idle|Idle_2|Idle_Headlow|Idle_Eating|Eating|Walk)$/;
const LIST = ['horse', 'donkey', 'cow', 'bull', 'pig', 'sheep', 'husky', 'cat', 'hen1', 'rooster', 'goat1'];
for (const id of LIST) {
  const doc = await io.read(path.join(SRC, id + '.glb'));
  const r = doc.getRoot(), seen = new Set();
  for (const a of r.listAnimations()) {
    const n = a.getName().split('|').pop();
    if (!KEEP.test(n) || seen.has(n)) { a.dispose(); continue; }
    seen.add(n); a.setName(n);
  }
  await doc.transform(weld({ tolerance: 0.0001 }), normals({ overwrite: true }), resample(), dedup(), prune());
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
  const out = path.join(OUT, 'animal_' + id + '.glb');
  await io.write(out, doc);
  console.log(path.basename(out), (fs.statSync(out).size / 1024).toFixed(0), 'KB', [...seen].join(','), 'mats', r.listMaterials().map(m => m.getName()).join('/'));
}
