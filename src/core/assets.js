import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

// Imported models (assets/models/*.glb): web derivatives of CC0 / CC BY
// sources, compressed with meshopt, listed with author, licence and the
// conversion steps in docs/assets/MODEL_SOURCES.md and credited in the Credits
// folio. `model(name)` resolves to the parsed glTF (scene, animations),
// fetched once however many callers ask; `clone(name)` gives an instance
// that shares geometry, materials and — for skinned models — a fresh
// skeleton (SkeletonUtils-style, see cloneSkinned).

const BASE = new URL('../../assets/models/', import.meta.url);
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const cache = new Map();
export const loaded = { bytes: 0, files: [] };

export function model(name) {
  if (!cache.has(name)) {
    cache.set(name, new Promise((res, rej) => {
      loader.load(new URL(name + '.glb', BASE).href, g => { loaded.files.push(name); res(g); }, e => { if (e.loaded && e.total && e.loaded === e.total) loaded.bytes += e.total; }, rej);
    }).catch(e => { console.warn('[assets] could not load', name, e); return null; }));
  }
  return cache.get(name);
}

// clone a (possibly skinned) hierarchy: meshes share geometry and
// materials, bones are duplicated and rebound
export function cloneSkinned(src) {
  const map = new Map();
  const out = src.clone(true);
  const walk = (a, b) => { map.set(a, b); for (let i = 0; i < a.children.length; i++) walk(a.children[i], b.children[i]); };
  walk(src, out);
  out.traverse(o => {
    if (!o.isSkinnedMesh) return;
    const s = [...map.entries()].find(([, v]) => v === o)[0];
    const bones = s.skeleton.bones.map(b => map.get(b));
    o.bind(new THREE.Skeleton(bones, s.skeleton.boneInverses), s.bindMatrix);
  });
  return out;
}
