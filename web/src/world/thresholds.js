import { Batch, box, place } from '../core/kit.js';

// Door steps. The floors of the buildings stand a little above the
// plateau (the ground falls away round every footing), so each outer door
// gets the few worn stone steps it needs to be walked through — a
// reconstruction decision: the novel gives the hospice's outside stair
// and the church's steps, not the risers of every door.

const MAT = { church: 'church', aedificium: 'aed', chapter: 'church', abbot: 'church', cloister: 'church' };
export function buildThresholds(doors, groundAt) {
  const b = new Batch('thresholds');
  const out = [];
  for (const d of doors) {
    if (d.noSteps || d.noWalk) continue;
    const th = d.th || 0.7, face = th / 2 - 0.02;
    const ang = Math.atan2(d.nz, d.nx);   // outward direction
    // ground in front of the door, sampled across its width
    const gs = [];
    for (const s of [-0.5, 0, 0.5]) for (const o of [0.8, 1.6]) {
      const px = d.x + d.nx * (face + o) - d.nz * s * d.w, pz = d.z + d.nz * (face + o) + d.nx * s * d.w;
      gs.push(groundAt(px, pz, d.y + 1.6));
    }
    const g = Math.min(...gs);
    const rise = d.y - g;
    if (rise < 0.12 || rise > 2.5) continue;
    const n = Math.max(1, Math.round(rise / 0.17)), riser = rise / n, tread = 0.34;
    const w = d.w + 0.5 + (d.w > 2.5 ? 0.6 : 0);
    const mat = MAT[d.building] || 'flagExt';
    for (let k = 0; k < n; k++) {
      const top = d.y - k * riser - 0.01;
      const depth = face + (k + 1) * tread;
      // each block runs back under the wall so no gap shows
      const blk = box(depth + 0.2, top - (g - 0.35), w - k * 0.06, { x: depth / 2 - 0.1, y: g - 0.35 });
      place(blk, { x: d.x, z: d.z, ry: -ang });
      b.add(mat, blk, { surface: 'stoneOut' });
    }
    out.push({ id: d.id, n, rise: +rise.toFixed(2) });
  }
  return { batch: b, steps: out };
}
