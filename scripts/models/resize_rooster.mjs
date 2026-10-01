// Resize only the oversized background rooster colour map. The model's
// topology, materials, source credit and runtime rig inputs are preserved.
// Run: node scripts/models/resize_rooster.mjs [input.glb] [output.glb]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';

await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const input = process.argv[2] || 'shared/assets/models/animal_rooster.glb';
const output = process.argv[3] || input;
const doc = await io.read(input), changes = [];
for (const t of doc.getRoot().listTextures()) {
  const original = Buffer.from(t.getImage()), info = await sharp(original).metadata();
  if (Math.max(info.width, info.height) <= 1024) continue;
  const image = await sharp(original).resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true }).toBuffer();
  t.setImage(new Uint8Array(image));
  changes.push({ texture: t.getName(), from: [info.width, info.height], to: [1024, 1024], originalBytes: original.length, resizedBytes: image.length });
}
// Existing decoded attributes are already packed. Reapplying the octahedral
// NORMAL filter can shift an 8-bit normal by one unit; use lossless packing.
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
await io.write(output, doc);
console.log(JSON.stringify({ input, output, changes }, null, 2));
