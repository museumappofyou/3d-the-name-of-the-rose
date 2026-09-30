// Ambient emitter kinds. Each is a sparse scheduler of recorded one-shots
// (generator functions: `a.hit(bank, gain, rate)` plays at the scheduled time
// `a.t`, `yield s` waits s seconds within the gesture) and/or a quiet loop or
// live voice. `act(s)` scales how often things happen (0 = never).
//   gain — level at refDistance     ref — PannerNode refDistance (m)
//   indoor — the source lives inside a room (for occlusion)
//   far — events only when the listener is at least this far (m): fixed
//         sources that stand for unseen work must not suggest an invisible
//         actor at arm's length
// Emitters placed on living things may be given `spot()` (move the source
// to one visible animal before a gesture) and `onHit(bank)` (let that
// animal move first: the sound follows `lead` seconds later).

import { Office } from './chant.js';
import { rand, rint, pick } from './dsp.js';

// working hours in late November: from Prime to just before Vespers
const work = s => (s.time > 7.2 && s.time < 16.3 ? 1 : 0);
const day = s => 1 - 0.9 * s.night;
const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);

export const KINDS = {
  hearth: {
    indoor: true, ref: 2, gain: 0.9, banks: ['fireLoop', 'firePop', 'fireSettle'],
    loop: { bank: 'fireLoop', gain: 0.85, flicker: 0.15 }, loopAct: s => 1 - 0.4 * s.night,   // banked at night
    events: [
      { gap: [2, 7], *run(a) { a.hit('firePop', rand(0.2, 0.55), rand(0.9, 1.1)); } },
      { gap: [20, 60], *run(a) { a.hit('fireSettle', rand(0.35, 0.6)); } },
    ],
  },
  kitchen: {
    indoor: true, ref: 3, gain: 0.8, banks: ['pot', 'metal', 'chop', 'ladle', 'pour'],
    act: s => (s.time > 4.5 && s.time < 20 ? 1 : 0.03),
    events: [{ gap: [4, 12], *run(a) {
      const r = Math.random();
      if (r < 0.22) a.hit('pot', rand(0.3, 0.6));
      else if (r < 0.36) a.hit('metal', rand(0.25, 0.45));
      else if (r < 0.62) { for (let k = rint(4, 10); k > 0; k--) { a.hit('chop', rand(0.35, 0.6)); yield rand(0.3, 0.45); } }
      else if (r < 0.84) a.hit('ladle', rand(0.3, 0.5));
      else a.hit('pour', rand(0.3, 0.5));
    } }],
  },
  scriptorium: {
    indoor: true, ref: 3, gain: 0.7, banks: ['scratch', 'pageTurn', 'benchCreak', 'cough'], act: s => Math.max(work(s), 0.03),
    events: [
      { gap: [2, 8], *run(a) {
        // a monk writes a line or two, word by word
        const end = a.t + rand(1.5, 5);
        while (a.t < end) {
          for (let k = rint(1, 3); k > 0; k--) { const d = a.hit('scratch', rand(0.4, 0.9)); yield Math.max(0.08, d * rand(0.5, 0.9)); }
          yield rand(0.25, 0.6);
        }
      } },
      { gap: [12, 35], *run(a) { a.hit('pageTurn', rand(0.35, 0.6)); } },
      { gap: [20, 60], *run(a) { a.hit('benchCreak', rand(0.2, 0.35)); } },
      { gap: [60, 160], *run(a) { a.hit('cough', rand(0.25, 0.45)); } },
    ],
  },
  stable: {
    indoor: true, ref: 3, gain: 0.8, banks: ['breath', 'snort', 'hoof', 'whinny', 'strawRustle', 'timber', 'chew'], act: s => 1 - 0.5 * s.night,
    events: [
      { gap: [5, 12], *run(a) { a.hit('breath', rand(0.35, 0.6), rand(0.95, 1.05)); } },
      { gap: [12, 35], *run(a) { a.hit('snort', rand(0.4, 0.65)); } },
      { gap: [8, 22], *run(a) { for (let k = rint(1, 2); k > 0; k--) { a.hit('hoof', rand(0.4, 0.75)); yield rand(0.35, 0.6); } } },
      { gap: [90, 240], *run(a) { a.hit('whinny', rand(0.3, 0.5), rand(0.97, 1.03)); } },
      { gap: [10, 25], *run(a) { a.hit('strawRustle', rand(0.25, 0.5)); } },
      { gap: [30, 80], *run(a) { a.hit('timber', rand(0.2, 0.35)); } },
      { gap: [15, 40], *run(a) { a.hit('chew', rand(0.3, 0.5)); } },
    ],
  },
  hens: {
    indoor: false, ref: 2, gain: 0.55, banks: ['cluck', 'bawk', 'rooster'], act: s => (s.time > 7 && s.time < 16.8 ? 1 : 0),
    events: [
      { gap: [4, 14], *run(a) {
        for (let k = rint(1, 4); k > 0; k--) { a.hit('cluck', rand(0.4, 0.85), rand(0.96, 1.04)); yield rand(0.25, 0.6); }
        if (Math.random() < 0.15) { yield 0.2; a.hit('bawk', rand(0.4, 0.7)); }
      } },
      // the cock at first light, not all day
      { gap: [40, 120], *run(a) { if (a.s.time > 6.3 && a.s.time < 8.5) a.hit('rooster', rand(0.5, 0.7)); } },
    ],
  },
  pigs: {
    indoor: false, ref: 2.5, gain: 0.7, banks: ['grunt', 'squeal'], act: s => 1 - 0.7 * s.night,
    events: [{ gap: [5, 16], *run(a) {
      if (Math.random() < 0.02) { a.hit('squeal', 0.35); return; }
      for (let k = rint(1, 2); k > 0; k--) { const d = a.hit('grunt', rand(0.4, 0.8), rand(0.95, 1.05)); yield d + rand(0.2, 0.8); }
    } }],
  },
  sheep: {
    indoor: true, ref: 3, gain: 0.6, banks: ['bleat'], act: s => 1 - 0.6 * s.night,
    events: [{ gap: [18, 60], *run(a) {
      a.hit('bleat', rand(0.35, 0.65));
      if (Math.random() < 0.25) { yield rand(1.5, 3); a.hit('bleat', rand(0.2, 0.4)); }
    } }],
  },
  oxen: {
    indoor: true, ref: 3, gain: 0.7, banks: ['low', 'cowChew', 'breath'], act: s => 1 - 0.5 * s.night,
    events: [
      { gap: [45, 140], *run(a) { a.hit('low', rand(0.35, 0.6), rand(0.95, 1.02)); } },
      { gap: [12, 35], *run(a) { a.hit('cowChew', rand(0.3, 0.5)); } },
      { gap: [8, 20], *run(a) { a.hit('breath', rand(0.25, 0.4), rand(0.82, 0.88)); } },
    ],
  },
  smithy: {
    indoor: true, ref: 3, gain: 0.8, far: 14, banks: ['anvil', 'hot', 'tap', 'quench'], act: work,
    events: [
      { gap: [5, 14], *run(a) {
        // hammer on the hot iron, a ringing tap on the face between blows, again
        for (let k = rint(5, 14); k > 0; k--) {
          a.hit(Math.random() < 0.2 ? 'anvil' : 'hot', rand(0.55, 0.85), rand(0.97, 1.03));
          if (Math.random() < 0.5) { yield rand(0.24, 0.32); a.hit('tap', rand(0.2, 0.35)); }
          yield rand(0.45, 0.65);
        }
      } },
      { gap: [60, 200], *run(a) { a.hit('quench', 0.45); } },
    ],
  },
  // the cloister well: water running into the stone basin
  water: {
    indoor: false, ref: 2, gain: 0.45, banks: ['trickle'],
    loop: { bank: 'trickle', gain: 0.5, flicker: 0.05 }, events: [],
  },
  // water finding its way through a vault: a real grotto, very quiet
  drip: {
    indoor: true, ref: 3, gain: 0.45, banks: ['cave'],
    loop: { bank: 'cave', gain: 0.5, flicker: 0.05 }, events: [],
  },
  chant: {
    // (a long reference distance: the voices fill the church to its west door)
    indoor: true, ref: 11, gain: 0.9, banks: [], events: [],
    live: (snd, e) => new Office(snd, e), liveOn: s => !!s.office,
    // heard directly in church and choir; through a door or a wall from the
    // places that touch the church (the porch, the cloister walk, the
    // cemetery at the north door, the skull chapel); scarcely at all from
    // inside another building
    occ: s => (s.zone === 'church' || s.zone === 'choir' || s.zone === 'skull') ? 0
      : s.zone === 'porch' ? 0.45
      : (s.zone === 'cloister' || s.zone === 'garth' || s.zone === 'cemetery' || s.zone === 'narthex') ? 0.8
      : s.inside ? 1.85 : 1.35,
  },
  // murmured prayer and far talk: silence is better than an invented voice
  murmur: { indoor: true, ref: 2, gain: 0, banks: [], events: [] },
  // the wind through the library's vent slits, strongest in the gusts
  'wind-slit': {
    indoor: true, ref: 2.5, gain: 0.5, banks: ['windSlit'], events: [],
    loop: { bank: 'windSlit', gain: 0.6, flicker: 0.02 }, loopAct: s => clamp01((s.wind - 0.35) * 1.6),
  },
  crows: {
    indoor: false, ref: 8, gain: 0.5, banks: ['caw'], act: s => (s.indoor > 0.5 ? 0.15 : 1) * (1 - 0.92 * s.night),
    events: [{ gap: [20, 70], *run(a) {
      const r = rand(0.96, 1.04);
      for (let k = rint(1, 3); k > 0; k--) { a.hit('caw', rand(0.45, 0.8), r); yield rand(0.5, 0.8); }
    } }],
  },
  // a door somewhere across the court: only from a distance
  door: {
    indoor: false, ref: 3, gain: 0.5, far: 12, banks: ['doorThud', 'latch', 'doorCreak'], act: s => 1 - 0.6 * s.night,
    events: [{ gap: [40, 150], *run(a) {
      if (Math.random() < 0.4) { a.hit('doorCreak', rand(0.15, 0.3)); yield rand(1.2, 2); a.hit('doorThud', rand(0.3, 0.55)); }
      else { a.hit('latch', rand(0.25, 0.45)); yield rand(0.4, 0.9); a.hit('doorThud', rand(0.3, 0.5)); }
    } }],
  },
  work: {
    indoor: false, ref: 5, gain: 0.6, far: 14, banks: ['axe', 'saw', 'dig'], act: work,
    events: [{ gap: [10, 35], *run(a) {
      const r = Math.random();
      if (r < 0.4) for (let k = rint(4, 10); k > 0; k--) { a.hit('axe', rand(0.5, 0.85), rand(0.96, 1.04)); yield rand(1.4, 2.1); }
      else if (r < 0.7) for (let k = rint(6, 12); k > 0; k--) { const d = a.hit('saw', rand(0.35, 0.55)); yield Math.max(0.3, d * 0.9); }
      else for (let k = rint(3, 7); k > 0; k--) { a.hit('dig', rand(0.45, 0.75)); yield rand(1.9, 2.8); }
    } }],
  },
  broom: {
    indoor: false, ref: 2, gain: 0.5, far: 10, banks: ['sweep'], act: s => day(s) * (s.office ? 0 : 1),
    events: [{ gap: [4, 12], *run(a) { for (let k = rint(4, 9); k > 0; k--) { const d = a.hit('sweep', rand(0.45, 0.8)); yield Math.max(0.5, d); } } }],
  },
};
export { pick };
