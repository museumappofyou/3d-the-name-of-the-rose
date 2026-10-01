// npm dependencies as in scripts/people/pack_people.mjs.
// node scripts/models/pack_horse.mjs [.local/animals/work/horse.glb]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, resample, reorder, quantize, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import fs from 'node:fs';
await MeshoptEncoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder});
const doc=await io.read(process.argv[2] || '.local/animals/work/horse.glb');
if(doc.getRoot().listAnimations().length!==4)throw new Error('Expected four authored stable clips');
await doc.transform(resample({tolerance:1e-4}),dedup(),prune(),reorder({encoder:MeshoptEncoder}),quantize(),meshopt({encoder:MeshoptEncoder,level:'medium'}));
const out='assets/models/animal_horse_rancher.glb';
await io.write(out,doc);
console.log(out,fs.statSync(out).size,'bytes',doc.getRoot().listAnimations().map(a=>a.getName()));
