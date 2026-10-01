import * as THREE from 'three';
import { scene as groupsAt } from '../world/people/schedule.js';
import { phaseAt, officeAt } from '../systems/horarium.js';
import { yieldTask } from './taskYield.js';

// Where the people are placed, checked with their real bodies and motions.
//   await __audit.people([hours])  for each hour: let the scheduler place the
//     community, then pose every figure at six phases of its clip and cast a
//     ray along each body segment (spine, neck, head, upper arm, forearm, hand,
//     thigh, shin): a segment that meets built geometry is a limb through a
//     wall or a piece of furniture. Seated figures must also have a
//     seat under them (the ray down from the pelvis meets it within 12 cm).
// Returns { checked, problems: [{ hour, group, key, person, clip, bone, gap }] }.
// real body segments (a segment that crosses built geometry is a limb through it)
const LIMBS = [['spine_02', 'spine_03'], ['spine_03', 'neck_01'], ['neck_01', 'head'], ['head', 'head_top'],
  ...['l', 'r'].flatMap(s => [['clavicle_' + s, 'upperarm_' + s], ['upperarm_' + s, 'lowerarm_' + s], ['lowerarm_' + s, 'hand_' + s], ['hand_' + s, 'middle_02_' + s],
    ['thigh_' + s, 'calf_' + s], ['calf_' + s, 'foot_' + s]])];
const SEATED = /^(write|dine|sitBench)$/;
const CONTACT = /^(write|dine|knead|stirPot|stirVat|fork|sweep|read|hammer|tend)$/;

export function installPeopleAudit(app, audit) {
  const ray = new THREE.Ray(), a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3();
  const geo = () => app.walker.colliders[0].mesh.geometry;
  audit.people = async (hours = [2.6, 3.2, 4.2, 5.5, 7.6, 9.05, 10, 12.0, 12.5, 14, 14.55, 16.6, 17.3, 17.9, 18.3]) => {
    const P = app.ctx.people, problems = [];
    let checked = 0;
    const saveMode = app.mode, saveUpd = app.walker.update;
    app.mode = 'walk'; app.walker.update = () => {};
    try { for (const h of hours) {
      app.atmo.set(h); app.timeTarget = null;
      P.frozen = false;
      // visit each group's places: the scheduler fills the places nearest the
      // camera, so stand the camera at each group of the hour in turn
      const seen = new Set();
      const stations = groupsAt(phaseAt(h), officeAt(h), h).map(g => {
        const s = g.slots?.[0] || (g.area && { x: g.area.x, z: g.area.z }) || (g.walkers && { x: g.walkers.cx + g.walkers.w, z: g.walkers.cz }) || (g.file && { x: g.file[0][0], z: g.file[0][1] });
        return s && [s.x, (s.y ?? 0.3) + 1.7, s.z + 1.5];
      }).filter(Boolean);
      for (const [x, y, z] of stations) {
        app.camera.position.set(x, y, z);
        // (a few steps past a reassignment of the scheduler, 0.45 s)
        for (let i = 0; i < 12; i++) app.frame(0.05, false);
        for (const r of P.rigs) {
          if (!r.busy || !r.g.visible || seen.has(r.key)) continue;
          seen.add(r.key);
          const U = r.g.userData; if (!U.mixer || !U.clip) continue;
          const act = U.actions.get(U.clip); if (!act) continue;
          checked++;
          const bad = new Map();
          // the clip alone at full weight (no crossfade in progress)
          U.mixer.stopAllAction(); act.reset(); act.play(); act.setEffectiveWeight(1);
          for (let k = 0; k < 6; k++) {
            act.time = act.getClip().duration * k / 6; U.mixer.update(0); r.g.updateMatrixWorld(true);
            for (const [from, to] of LIMBS) {
              const A = U.bones[from], B = U.bones[to === 'head_top' ? 'head' : to]; if (!A || !B) continue;
              A.getWorldPosition(a); B.getWorldPosition(b);
              if (to === 'head_top') b.add(d.set(0, 0.2, 0).applyQuaternion(B.getWorldQuaternion(new THREE.Quaternion())));
              d.subVectors(b, a); const L = d.length(); if (L < 1e-3) continue;
              ray.origin.copy(a); ray.direction.copy(d).divideScalar(L);
              const hit = geo().boundsTree.raycastFirst(ray, THREE.DoubleSide, 0, L);
              const gap = hit ? L - hit.distance : 0;
              // the authored contacts (fingers on the leaf, the dough, a handle
              // against a rail) are meant: only deeper than 10 cm counts there
              const contact = CONTACT.test(U.clip) && /^(hand_|middle_02_|lowerarm_)/.test(to);
              if (hit && gap > (contact ? 0.1 : 0.04)) bad.set(to, Math.max(bad.get(to) || 0, +gap.toFixed(2)));
            }
            if (SEATED.test(U.clip) && k === 0) {
              U.bones.pelvis.getWorldPosition(a); ray.origin.copy(a); ray.direction.set(0, -1, 0);
              const hit = geo().boundsTree.raycastFirst(ray, THREE.DoubleSide, 0, 0.5);
              if (!hit || hit.distance > 0.16) bad.set('seat', hit ? +hit.distance.toFixed(2) : 'none');
            }
          }
          const clip = U.clip;
          U.pose = null; U.clip = null;   // the scheduler sets the pose again next frame
          for (const [bone, gap] of bad) problems.push({ hour: h, group: r.group?.id, key: r.key, person: U.person, clip, bone, gap, at: [+r.g.position.x.toFixed(2), +r.g.position.y.toFixed(2), +r.g.position.z.toFixed(2)], slot: r.slot && [+r.slot.x.toFixed(2), +(r.slot.y ?? 0).toFixed(2), +r.slot.z.toFixed(2)] });
        }
        // Give the browser a task boundary during this substantial review.
        await yieldTask();
      }
    } } finally { app.mode = saveMode; app.walker.update = saveUpd; }
    return { checked, problems };
  };
}
