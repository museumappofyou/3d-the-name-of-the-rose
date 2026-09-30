// Footsteps: every surface of the abbey in late November, from the polished
// slabs of the nave to the fresh snow of the cemetery. Each surface has its
// own bank of recorded steps (leather or soft-soled shoes on the real
// material; see docs/assets/AUDIO_SOURCES.md), cut heel-to-roll and levelled
// alike, so the trims below only set how loud each ground is underfoot.

export const SURFACES = ['stone', 'stoneWet', 'churchStone', 'tile', 'wood', 'dirt', 'frozenSoil', 'mud', 'snowPacked', 'snowFresh', 'snowCrust', 'ice', 'straw', 'gravel'];
export const SURFACE_ALIAS = { snow: 'snowPacked', earth: 'dirt', soil: 'dirt', grass: 'dirt', church: 'churchStone', board: 'wood', boards: 'wood', stairs: 'wood', hay: 'straw' };

// per-surface playback: lowpass centre for the runtime filter jitter, trim
export const STEP_PLAY = {
  stone: [14000, 0.95], stoneWet: [12000, 0.85], churchStone: [11000, 0.62], tile: [14000, 0.85], wood: [12000, 0.95],
  dirt: [10000, 0.75], frozenSoil: [14000, 0.7], mud: [9000, 0.75], snowPacked: [13000, 0.62], snowFresh: [9000, 0.55],
  snowCrust: [14000, 0.65], ice: [15000, 0.6], straw: [12000, 0.5], gravel: [14000, 0.7],
};
