// Compare actual weighted vertices under varied bone transforms in two
// exports. This checks the bind-space conversion without relying on a
// standing silhouette or removing task channels. Optional build tooling.
// node scripts/people/check_shared_cast.mjs ORIGINAL OPTIMIZED
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { Matrix4, Vector3, Euler, Quaternion } from '../../web/lib/three/three.core.js';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const [before, after] = await Promise.all(process.argv.slice(2, 4).map(p => io.read(p)));
const next = new Map(after.getRoot().listNodes().map(n => [n.getName(), n]));
let checked = 0, maximumVertexErrorMetres = 0;
const point = new Vector3(), transformed = new Vector3(), weights = [], joints = [], xyz = [];
const deformation = (node, primitive, vertex, phase) => {
  primitive.getAttribute('POSITION').getElement(vertex, xyz);
  primitive.getAttribute('WEIGHTS_0').getElement(vertex, weights);
  primitive.getAttribute('JOINTS_0').getElement(vertex, joints);
  const skin = node.getSkin(), result = new Vector3();
  for (let k = 0; k < 4; k++) {
    if (!weights[k]) continue;
    const j = joints[k], inv = new Matrix4().fromArray(skin.getInverseBindMatrices().getArray(), j * 16);
    const world = new Matrix4().fromArray(skin.listJoints()[j].getWorldMatrix());
    const q = new Quaternion().setFromEuler(new Euler(Math.sin(j * .8 + phase) * .6, Math.cos(j + phase) * .5, Math.sin(j * .4 - phase) * .35));
    world.premultiply(new Matrix4().makeRotationFromQuaternion(q));
    transformed.copy(point.fromArray(xyz)).applyMatrix4(inv).applyMatrix4(world).multiplyScalar(weights[k]);
    result.add(transformed);
  }
  return result.applyMatrix4(new Matrix4().fromArray(node.getWorldMatrix()));
};
for (const node of before.getRoot().listNodes()) {
  if (!node.getSkin() || !node.getMesh()) continue;
  const target = next.get(node.getName());
  if (!target?.getSkin()) throw new Error('Missing skinned part ' + node.getName());
  const old = node.getMesh().listPrimitives(), converted = target.getMesh().listPrimitives();
  for (let p = 0; p < old.length; p++) {
    const n = old[p].getAttribute('POSITION').getCount();
    if (converted[p].getAttribute('POSITION').getCount() !== n) throw new Error('Changed vertices');
    for (let i = 0; i < n; i += 7) for (const phase of [0, 1.2, 3.4]) {
      const a = deformation(node, old[p], i, phase), b = deformation(target, converted[p], i, phase);
      maximumVertexErrorMetres = Math.max(maximumVertexErrorMetres, a.distanceTo(b)); checked++;
    }
  }
}
const report = { checked, maximumVertexErrorMetres, toleranceMetres: 0.00005 };
console.log(JSON.stringify(report, null, 2));
if (maximumVertexErrorMetres > report.toleranceMetres) throw new Error('Deformation changed');
