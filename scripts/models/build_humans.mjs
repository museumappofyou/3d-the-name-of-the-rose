// Build the web derivatives for the abbey's people from Mesh2Motion's CC0
// assets (github.com/Mesh2Motion/mesh2motion-app, LICENSE-CC0.MD):
//   shared/assets/models/human_anims.glb  — the 66-joint skeleton and the clips we
//       use, from human-base / human-addon / human-mocap-animations.glb
//       (Quaternius Universal Animation Library and CMU mocap retargets)
//   shared/assets/models/head_<id>.glb    — photoscanned CC0 characters by
//       elbolilloduro; only the head, neck and hands are drawn in the abbey
//       (the habit is made in web/src/world/people/habit.js), textures as JPEG
//
//   node scripts/models/build_humans.mjs SRC_DIR   (needs @gltf-transform/*,
//   meshoptimizer and sharp-free JPEG via ffmpeg on PATH)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { prune, resample, dedup } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SRC = process.argv[2];
const OUT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../shared/assets/models');
fs.mkdirSync(OUT, { recursive: true });
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

// clip name in the source -> name used by the abbey
const CLIPS = {
  'animations_human-base-animations.glb': {
    Walk: 'walk', Walk_Formal: 'walkFormal', Walk_Carry: 'walkCarry', Idle_A: 'idle', Idle_FoldArms: 'foldArms',
    Idle_Talking: 'talk', Idle_Lantern: 'lantern', Sitting_Idle: 'sit', Sitting_Talking: 'sitTalk', Sitting_Enter: 'sitDown',
    Fixing_Kneeling: 'kneelWork', Farm_Harvest: 'harvest', Farm_PlantSeed: 'plant', Chop_Tree: 'chop', Push: 'push',
    PickUp_Table: 'pickUp', Interact: 'interact', Consume: 'drink', Crouch_Idle: 'crouch', LayToIdle: 'layUp',
  },
  'animations_human-addon-animations.glb': {
    Idle_Subtle: 'idleSubtle', 'Idle Listening': 'listen', 'Kneeling Tired': 'kneel', Meditate: 'meditate',
    'Head Nod': 'nod', 'Tired Hunched': 'hunched', Sleeping: 'sleep', Greeting: 'greet', Walk_Large: 'walkHeavy',
  },
  'animations_human-mocap-animations.glb': { Salute: 'salute' },
};

async function anims() {
  const files = Object.keys(CLIPS);
  const doc = await io.read(path.join(SRC, files[0]));
  const root = doc.getRoot();
  const byName = new Map(root.listNodes().map(n => [n.getName(), n]));
  const buffer = root.listBuffers()[0];
  for (const a of root.listAnimations()) { const nn = CLIPS[files[0]][a.getName()]; if (nn) a.setName(nn); else a.dispose(); }
  for (const f of files.slice(1)) {
    const src = await io.read(path.join(SRC, f));
    for (const a of src.getRoot().listAnimations()) {
      const nn = CLIPS[f][a.getName()]; if (!nn) continue;
      const na = doc.createAnimation(nn);
      for (const ch of a.listChannels()) {
        const tn = byName.get(ch.getTargetNode()?.getName()); if (!tn) continue;
        const s = ch.getSampler();
        const cp = acc => doc.createAccessor().setType(acc.getType()).setArray(acc.getArray().slice()).setBuffer(buffer);
        const ns = doc.createAnimationSampler().setInput(cp(s.getInput())).setOutput(cp(s.getOutput())).setInterpolation(s.getInterpolation());
        na.addSampler(ns).addChannel(doc.createAnimationChannel().setTargetNode(tn).setTargetPath(ch.getTargetPath()).setSampler(ns));
      }
    }
  }
  // keep only the skeleton: no mannequin mesh, skin, material or texture
  for (const n of root.listNodes()) { n.setMesh(null); n.setSkin(null); }
  for (const m of root.listMeshes()) m.dispose();
  for (const s of root.listSkins()) s.dispose();
  for (const t of root.listTextures()) t.dispose();
  for (const m of root.listMaterials()) m.dispose();
  // scale/translation keys of the limbs are constant in these clips; only
  // the pelvis and root move
  for (const a of root.listAnimations()) for (const ch of a.listChannels()) {
    const n = ch.getTargetNode()?.getName(), p = ch.getTargetPath();
    if (p === 'scale' || (p === 'translation' && n !== 'pelvis' && n !== 'root')) { const s = ch.getSampler(); ch.dispose(); if (!s.listParents().some(x => x.propertyType === 'AnimationChannel')) s.dispose(); }
  }
  await doc.transform(resample({ tolerance: 1e-4 }), dedup(), prune());
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
  await io.write(path.join(OUT, 'human_anims.glb'), doc);
  console.log('human_anims.glb', (fs.statSync(path.join(OUT, 'human_anims.glb')).size / 1024).toFixed(0), 'KB', root.listAnimations().map(a => a.getName()).join(' '));
}

async function heads() {
  for (const id of ['male_5', 'male_6', 'male_10', 'male_15', 'male_32', 'police_male']) {
    const doc = await io.read(path.join(SRC, id + '.glb'));
    for (const t of doc.getRoot().listTextures()) {
      if (t.getMimeType() !== 'image/png') continue;
      const tmp = path.join(SRC, `_${id}.png`), tj = path.join(SRC, `_${id}.jpg`);
      fs.writeFileSync(tmp, Buffer.from(t.getImage()));
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', tmp, '-q:v', '3', tj]);
      t.setImage(new Uint8Array(fs.readFileSync(tj))).setMimeType('image/jpeg').setURI('');
      fs.unlinkSync(tmp); fs.unlinkSync(tj);
    }
    for (const m of doc.getRoot().listMaterials()) { for (const e of m.listExtensions()) e.dispose(); }
    await doc.transform(prune());
    const out = path.join(OUT, `head_${id}.glb`);
    await io.write(out, doc);
    console.log(path.basename(out), (fs.statSync(out).size / 1024).toFixed(0), 'KB');
  }
}

await anims();
await heads();
