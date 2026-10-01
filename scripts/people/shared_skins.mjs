// Normalize only equivalent per-part bind spaces, preserving deformation:
// B_i * I_part_i * p == B_i * I_shared_i * D_part * p, for every pose B.
// Blender's per-part quantization gives nine skins on the same 53 joints.
// Bake the CONSTANT correction into vertices and share one skin per person.
// Reject nonconstant corrections, shared primitive accessors and morphs.
import { Matrix4 } from '../../lib/three/three.core.js';
import { transformPrimitive } from '@gltf-transform/functions';

export function shareCharacterSkins(doc) {
  const root = doc.getRoot(), skins = root.listSkins();
  const groups = new Map(), ids = new Map(root.listNodes().map((n, i) => [n, i]));
  for (const skin of skins) {
    const key = skin.listJoints().map(n => ids.get(n)).join(',');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(skin);
  }
  let maximumMatrixResidual = 0, convertedParts = 0;
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const base = group[0], canonical = base.getInverseBindMatrices().getArray();
    for (const skin of group.slice(1)) {
      const source = skin.getInverseBindMatrices().getArray();
      const correction = new Matrix4().fromArray(canonical).invert().multiply(new Matrix4().fromArray(source));
      let residual = 0;
      for (let i = 0; i < skin.listJoints().length; i++) {
        const fitted = new Matrix4().fromArray(canonical, i * 16).multiply(correction).elements;
        for (let k = 0; k < 16; k++) residual = Math.max(residual, Math.abs(fitted[k] - source[i * 16 + k]));
      }
      if (residual > 1e-5) throw new Error('Nonconstant bind correction: ' + skin.getName() + ' ' + residual);
      maximumMatrixResidual = Math.max(maximumMatrixResidual, residual);
      const nodes = root.listNodes().filter(n => n.getSkin() === skin);
      for (const node of nodes) {
        const mesh = node.getMesh();
        if (root.listNodes().filter(n => n.getMesh() === mesh).length !== 1) throw new Error('Shared source mesh');
        for (const prim of mesh.listPrimitives()) {
          if (prim.listTargets().length) throw new Error('Morph targets need a separate conversion');
          for (const semantic of ['POSITION', 'NORMAL', 'TANGENT']) {
            const a = prim.getAttribute(semantic);
            if (a && a.listParents().some(p => p !== prim && p.propertyType === 'Primitive')) throw new Error('Shared source vertices');
          }
          transformPrimitive(prim, correction.elements);
        }
        node.setSkin(base); convertedParts++;
      }
      skin.dispose();
    }
  }
  return { skinsBefore: skins.length, skinsAfter: root.listSkins().length, convertedParts, maximumMatrixResidual };
}
