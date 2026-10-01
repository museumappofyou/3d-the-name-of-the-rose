// The two supplied recordings. Originals stay private in music/; the
// -12 dB review derivatives in assets/audio/music/ are what the page can
// fetch (scripts/audio/prepare_supplied_music.py).
//
// Placement and phrase selection wait for a full audible review. Signal
// measurements cannot identify instruments/bells or approve musical seams.
// `?hear=<id>` auditions the COMPLETE review recording during an office,
// through the same church openings as chant. It is a listening comparison,
// not an approved assignment or a claim of a seamless musical loop.
// `lvl` is only an initial comparison against the existing office recordings.

export const SUPPLIED = {
  cold_stone_prayer: {
    file: 'assets/audio/music/cold_stone_prayer_review.mp3', duration: 105.61,
    lufs: -23.5, lvl: 0.53,                      // -5.5 dB
    reviewed: false, phrases: [],
    place: null, offices: [],
  },
  beneath_the_vault: {
    file: 'assets/audio/music/beneath_the_vault_review.mp3', duration: 100.65,
    lufs: -24.2, lvl: 0.57,                      // -4.8 dB
    reviewed: false, phrases: [],
    place: null, offices: [],
  },
};

// Which supplied recordings join the office sung at `hour` in `place`.
// `hear` is the id named by ?hear= (a listening test, every office).
export function suppliedFor(place, hour, hear = null) {
  const out = [];
  for (const [id, d] of Object.entries(SUPPLIED)) {
    const assigned = d.reviewed && d.phrases.length && d.place === place && d.offices.includes(hour);
    if (assigned || (hear === id && place === 'church')) out.push('rec:' + id);
  }
  return out;
}

export function hearingParam(search = globalThis.location?.search || '') {
  const id = new URLSearchParams(search).get('hear');
  return id && SUPPLIED[id] ? id : null;
}
