import { P, GATE, STABLES, STABLE_YARD, FOLDS, OXSHED, GRANARY, THRESHING, HENHOUSE, SOUTH_RANGE, AED, CLOISTER, CHURCH } from '../core/plan.js';

// Where the ground is churned, strewn or frozen. Late November, a
// fortnight of frost and a first fall of snow (First Day): the snow stays
// clean where no one walks, packs and greys on the paths, and breaks into
// mud where beasts and carts go every day — the stable yard, the pig pens,
// the gate, the smithy door. Puddles freeze by the wells and troughs.
// This is ambient reconstruction, not a claim of the novel: the book
// gives the snow, the cold and the pig slaughter, not the mud.

const c = (x, z, r, kind, k) => ({ kind, c: [x, z], r, k });
export function groundFeatures() {
  const F = [];
  const [gx, gz] = GATE.center;
  // the gate: carts, mules and pilgrims all pass here
  F.push(c(gx + 6, gz, 5, 'mud'), c(gx - 7, gz + 1, 5, 'mud'), c(gx + 14, gz + 0.5, 3.5, 'mud'));
  // the stable yard and the pig pens before the sties
  F.push({ kind: 'mud', rect: { x0: STABLE_YARD.x0 + 1, x1: STABLE_YARD.x1, z0: STABLE_YARD.z0 + 1, z1: STABLE_YARD.z1 - 1 } });
  F.push({ kind: 'straw', rect: { x0: STABLE_YARD.x0 + 4, x1: STABLE_YARD.x1, z0: STABLE_YARD.z0 + 3, z1: STABLE_YARD.z1 - 6 } });
  for (let z = STABLES.z0 + 4; z < STABLES.z1; z += 7) F.push(c(STABLES.x0 - 2.5, z, 3.2, 'mud'), c(STABLES.x0 - 1.5, z + 2, 2.4, 'straw'));
  F.push({ kind: 'mud', rect: { x0: FOLDS.x0 + 0.5, x1: FOLDS.x1 - 4.5, z0: FOLDS.z1 + 0.8, z1: FOLDS.z1 + 8.6 } });
  F.push(c((FOLDS.x0 + FOLDS.x1) / 2, FOLDS.z1 + 1.5, 4, 'straw'));
  // ox stable, granary and threshing floor
  F.push(c(OXSHED.x0 - 3, (OXSHED.z0 + OXSHED.z1) / 2, 6, 'mud', 1.8), c(OXSHED.x0 - 1.5, (OXSHED.z0 + OXSHED.z1) / 2, 4, 'straw', 2.2));
  F.push(c(GRANARY.x0 - 2.5, (GRANARY.z0 + GRANARY.z1) / 2, 3.5, 'straw'), c(GRANARY.x0 - 3, (GRANARY.z0 + GRANARY.z1) / 2 + 2, 3, 'mud'));
  const tx = (THRESHING.x0 + THRESHING.x1) / 2, tz = (THRESHING.z0 + THRESHING.z1) / 2;
  F.push(c(tx, tz, 9.5, 'straw', 0.9));
  // the henhouse run
  F.push({ kind: 'mud', rect: { x0: HENHOUSE.x0 + 0.5, x1: HENHOUSE.x1 - 0.5, z0: HENHOUSE.z0 + 0.5, z1: HENHOUSE.z1 - 0.5 } });
  F.push(c((HENHOUSE.x0 + HENHOUSE.x1) / 2, HENHOUSE.z0 + 8, 5, 'straw'));
  // the lane behind the choir to the farmyard, where carts turn
  F.push(c(...P(480, 262), 5, 'mud'), c(...P(520, 240), 4, 'mud'), c(...P(520, 300), 5, 'mud'), c(...P(520, 350), 3.5, 'mud'));
  // workshops of the south range: the smithy door, the mill and the press
  for (const R of SOUTH_RANGE) {
    const cx = (R.x0 + R.x1) / 2;
    if (['smithy', 'mill', 'press', 'cellars'].includes(R.id)) F.push(c(cx, R.z0 - 2.2, R.id === 'smithy' ? 5 : 3.5, 'mud', 0.6));
  }
  // the kitchen door toward the gardens, where the servants go back and forth
  F.push(c(...P(392, 181), 3, 'mud'), c(...P(398, 175), 2, 'mud'));
  // the Aedificium's south door: many feet, some slush
  F.push(c(AED.x, AED.z + AED.W / Math.SQRT2 + 3.2, 2.5, 'mud'));
  // frozen puddles: by the wells, the trough and in the ruts of the avenue
  F.push(c(...P(262, 183), 2.4, 'ice'), c((CLOISTER.x0 + CLOISTER.x1) / 2, (CHURCH.zS + CLOISTER.z1) / 2, 1.8, 'ice'));
  F.push(c(STABLE_YARD.x0 + 3, STABLE_YARD.z1 - 4, 1.8, 'ice'));
  for (const px of [120, 160, 205, 250]) F.push(c(...P(px, 270 + (px % 3) - 1), 1.1 + (px % 5) * 0.12, 'ice', 0.5));
  F.push(c(gx + 3, gz - 2, 1.4, 'ice', 0.6));
  return F;
}
