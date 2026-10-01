// The verse over the mirror of the finis Africae and the two letters that
// open it: "the first and the seventh of the four" — q and r of *quatuor*.
// One definition for the buttons of the verse (ui.js) and the keys Q / R
// (main.js), so both name a letter by the same position in the verse.
export const VERSE = 'Super thronos viginti quatuor';
const W = VERSE.indexOf('quatuor');
export const MIRROR_KEYS = { q: W, r: W + 6 };   // zero-based positions in VERSE
