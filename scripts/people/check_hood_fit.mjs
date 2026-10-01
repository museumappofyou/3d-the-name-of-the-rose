// Verify the focused tailoring preserves everything outside lowered hoods,
// then sample the new morph against real standing/seated/kneeling task poses.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { auditLoweredHoods } from './fit_lowered_hoods.mjs';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const [before, after, tasks] = await Promise.all([io.read(process.argv[2]), io.read(process.argv[3]), io.read('assets/models/people/tasks.glb')]);
const hash = a => a && createHash('sha256').update(Buffer.from(a.buffer, a.byteOffset, a.byteLength)).digest('hex');
const targets = new Map(after.getRoot().listNodes().map(n => [n.getName() + ':' + n.getSkin()?.getName(), n]));
let unchangedParts = 0, tailoredHoods = 0;
for (const node of before.getRoot().listNodes()) {
  if (!node.getMesh()) continue;
  const next = targets.get(node.getName() + ':' + node.getSkin()?.getName());
  if (!next || JSON.stringify(node.getWorldMatrix()) !== JSON.stringify(next.getWorldMatrix())) throw new Error('Changed node transform ' + node.getName());
  const old = node.getMesh().listPrimitives(), neu = next.getMesh().listPrimitives();
  if (old.length !== neu.length) throw new Error('Changed primitive count');
  if (hash(node.getSkin()?.getInverseBindMatrices().getArray()) !== hash(next.getSkin()?.getInverseBindMatrices().getArray())) throw new Error('Changed bind matrices');
  for (let k = 0; k < old.length; k++) {
    if (hash(old[k].getIndices().getArray()) !== hash(neu[k].getIndices().getArray())) throw new Error('Changed topology');
    for (const sem of old[k].listSemantics()) {
      if (node.getName().endsWith('.hood_down') && ['POSITION', 'NORMAL', 'JOINTS_0', 'WEIGHTS_0'].includes(sem)) continue;
      if (hash(old[k].getAttribute(sem).getArray()) !== hash(neu[k].getAttribute(sem).getArray())) throw new Error('Changed ' + node.getName() + ':' + sem);
    }
  }
  if (node.getName().endsWith('.hood_down')) {
    if (neu.some(p => p.listTargets().length !== 1 || p.listTargets()[0].getName() !== 'bendDrape')) throw new Error('Missing named bend target');
    tailoredHoods++;
  } else unchangedParts++;
}
const imagesUnchanged = before.getRoot().listTextures().every((t, i) => hash(t.getImage()) === hash(after.getRoot().listTextures()[i]?.getImage()));
const result = { unchangedParts, tailoredHoods, topologyBindMatricesAndNodeTransformsUnchanged: true, imagesUnchanged,
  sharedSkins: after.getRoot().listSkins().length, poses: auditLoweredHoods(after, tasks) };
result.maximumSampledPenetrationMetres = Math.max(...result.poses.map(p => p.maximumPenetrationMetres));
result.penetrationToleranceMetres = .008;
console.log(JSON.stringify(result, null, 2));
if (process.argv[4]) writeFileSync(process.argv[4], JSON.stringify(result, null, 2) + '\n');
if (!imagesUnchanged) throw new Error('Texture changed');
if (result.maximumSampledPenetrationMetres > result.penetrationToleranceMetres) throw new Error('Hood penetrates sampled robe surface');
