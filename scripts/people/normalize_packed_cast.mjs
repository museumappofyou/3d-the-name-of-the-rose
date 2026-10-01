// One-time upgrade of a packed cast without recompressing its WebP textures.
// Keep the input for a deformation comparison / reversible asset change.
// node scripts/people/normalize_packed_cast.mjs INPUT OUTPUT
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { prune } from '@gltf-transform/functions';
import { shareCharacterSkins } from './shared_skins.mjs';
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(process.argv[2]);
const report = shareCharacterSkins(doc);
await doc.transform(prune({ keepLeaves: true }));
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
await io.write(process.argv[3], doc);
console.log(JSON.stringify(report, null, 2));
