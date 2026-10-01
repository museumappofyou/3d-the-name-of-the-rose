// Pack the people built by build_people.py / build_motions.py for the web:
//   assets/models/people/cast.glb     every designed person of cast.json in
//                                     one file (shared textures stored once)
//   assets/models/people/motions.glb  the motion library (reference skeleton
//                                     and clips), resampled
//   assets/models/people/tasks.glb    work poses fitted to each person's rig
//   assets/models/people/cast.json    what the runtime needs to know about
//                                     each person and each clip
// Meshopt-compressed like the abbey's other models.
//   node scripts/people/pack_people.mjs [.local/mh/out]
// (needs @gltf-transform/core|functions|extensions and meshoptimizer:
//  npm i --no-save @gltf-transform/core @gltf-transform/functions @gltf-transform/extensions meshoptimizer)
// With --decompress IN OUT it only strips meshopt from a GLB (Blender cannot
// read EXT_meshopt_compression; build_motions.py needs human_anims.glb raw).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { mergeDocuments, dedup, prune, resample, reorder, quantize, meshopt, weld, textureCompress } from '@gltf-transform/functions';
import sharp from 'sharp';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { shareCharacterSkins } from './shared_skins.mjs';
import { fitLoweredHoods } from './fit_lowered_hoods.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

if (process.argv[2] === '--decompress') {
  const doc = await io.read(process.argv[3]);
  for (const e of doc.getRoot().listExtensionsUsed()) if (/meshopt|quantiz/i.test(e.extensionName)) e.dispose();
  await io.write(process.argv[4], doc);
  process.exit(0);
}

const TASKS_ONLY = process.argv.includes('--tasks-only');
const SRC = path.resolve((process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null) || path.join(ROOT, '.local/mh/out'));
const outAt = process.argv.indexOf('--out');
const OUT = path.resolve(outAt >= 0 ? process.argv[outAt + 1] : path.join(ROOT, 'assets/models/people'));
fs.mkdirSync(OUT, { recursive: true });
const CAST = JSON.parse(fs.readFileSync(path.join(HERE, 'cast.json'), 'utf8'));
const report = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(SRC, 'report.json'), 'utf8')).map(r => [r.id, r]));
const motions = JSON.parse(fs.readFileSync(path.join(SRC, 'motions.json'), 'utf8'));

// --- the cast ---------------------------------------------------------------
const people = CAST.people.filter(p => fs.existsSync(path.join(SRC, p.id + '.glb')));
let castDoc = null;
if (!TASKS_ONLY) {
const doc = await io.read(path.join(SRC, people[0].id + '.glb'));
for (const p of people.slice(1)) mergeDocuments(doc, await io.read(path.join(SRC, p.id + '.glb')));
// one scene holding every person's root
const root = doc.getRoot(), scenes = root.listScenes(), scene = scenes[0];
for (const s of scenes.slice(1)) { for (const n of s.listChildren()) scene.addChild(n); s.dispose(); }
root.setDefaultScene(scene);
// one buffer
const buf = root.listBuffers()[0];
for (const a of root.listAccessors()) a.setBuffer(buf);
for (const b of root.listBuffers().slice(1)) b.dispose();
// WebP (EXT_texture_webp) keeps the alpha of hair, beards, brows and
// lashes at about a third of the PNG size; three.js decodes it natively
await doc.transform(dedup(), prune(), reorder({ encoder: MeshoptEncoder }), quantize(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 88 }));
// Quantization can change per-part bind spaces. Normalize AFTER it, then
// tailor the lowered hood after the fitted task document has been assembled.
console.log('Equivalent shared skin bindings:', shareCharacterSkins(doc));
castDoc = doc;

// --- the motions -------------------------------------------------------------
const mdoc = await io.read(path.join(SRC, 'motions.glb'));
for (const m of mdoc.getRoot().listMeshes()) m.dispose();
for (const s of mdoc.getRoot().listSkins()) s.dispose();
await mdoc.transform(resample({ tolerance: 1e-4 }), prune({ keepLeaves: true }), dedup(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(path.join(OUT, 'motions.glb'), mdoc);
}

// --- fitted task clips -------------------------------------------------------
// Keep target node names unique while merging. At runtime each clip binds to
// the canonical bones of its person; these reference rigs measure tool grips.
let tdoc;
for (const p of people) {
  const d = await io.read(path.join(SRC, p.id + '.tasks.glb'));
  // Tasks need bones/curves only; discard any unused export skin bindings.
  for (const m of d.getRoot().listMeshes()) m.dispose();
  for (const s of d.getRoot().listSkins()) s.dispose();
  // Preserve the fitted joint channels: Blender's exported reference pose
  // has different local offsets from the cast's bind nodes. Dropping their
  // constant channels changed limb placement despite identical bone names.
  for (const n of d.getRoot().listNodes()) if (n.getName()) n.setName(p.id + '__' + n.getName());
  if (tdoc) mergeDocuments(tdoc, d); else tdoc = d;
}
const tr = tdoc.getRoot(), ts = tr.listScenes(), sceneTasks = ts[0];
for (const s of ts.slice(1)) { for (const n of s.listChildren()) sceneTasks.addChild(n); s.dispose(); }
tr.setDefaultScene(sceneTasks);
const tb = tr.listBuffers()[0];
for (const a of tr.listAccessors()) a.setBuffer(tb);
for (const b of tr.listBuffers().slice(1)) b.dispose();
await tdoc.transform(resample({ tolerance: 1e-4 }), prune({ keepLeaves: true }), dedup(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(path.join(OUT, 'tasks.glb'), tdoc);
if (castDoc) {
  console.log('Tailored lowered hoods:', fitLoweredHoods(castDoc, tdoc).length);
  castDoc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  await io.write(path.join(OUT, 'cast.glb'), castDoc);
}
const personTasks = JSON.parse(fs.readFileSync(path.join(SRC, 'person_tasks.json'), 'utf8'));

// --- runtime metadata ----------------------------------------------------------
const meta = {
  about: 'Generated by scripts/people/pack_people.mjs from scripts/people/cast.json and the Blender builds. Do not edit.',
  people: Object.fromEntries(people.map(p => [p.id, {
    dress: p.dress, note: p.note, wool: p.wool || null, hoods: Object.keys(p.hoods || {}),
    tint: { hair: p.hairMul || null, skin: p.skinMul || null },
    height: report[p.id]?.height, pelvis: report[p.id]?.pelvis_h, head: report[p.id]?.head_h, tris: report[p.id]?.tris_total,
  }])),
  kinds: CAST.kinds,
  motions: { pelvis: motions.pelvis_h, clips: motions.clips, props: motions.props },
  personTasks,
};
fs.writeFileSync(path.join(OUT, 'cast.json'), JSON.stringify(meta, null, 1));
for (const f of ['cast.glb', 'motions.glb', 'tasks.glb', 'cast.json']) console.log(f, fs.statSync(path.join(OUT, f)).size);
