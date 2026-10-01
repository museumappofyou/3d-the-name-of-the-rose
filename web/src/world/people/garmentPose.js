// The sculpted lowered-hood target is fitted at a 66-degree torso bend.
// Drive it from the actual chest, including mixer transitions and recorded
// motions, rather than a task name or an independent animation clock.
const START = 10 * Math.PI / 180, FULL = 66 * Math.PI / 180;
export function loweredHoodBlend(bend) {
  const t = Math.max(0, Math.min(1, (bend - START) / (FULL - START)));
  return t * t * (3 - 2 * t);
}
