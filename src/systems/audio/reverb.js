// Procedural impulse responses for the abbey's spaces: decaying, darkening,
// decorrelated noise behind a handful of early reflections.
//   rt   — decay to -60 dB (s)          pre — pre-delay (s)
//   fc0  — tail brightness at onset     fc1 — brightness at the end of the tail
//   er   — early reflections [count, span (s), level]
//   low  — extra low-mid body (crypt, church) and its decay multiplier
//   wet/dry — mix levels for the space

export const SPACES = {
  exterior:    { rt: 0.35, pre: 0.012, fc0: 6000, fc1: 2500, er: [3, 0.13, 0.5], low: [0, 1], wet: 0.07, dry: 1 },
  cloister:    { rt: 0.7,  pre: 0.008, fc0: 7000, fc1: 2500, er: [6, 0.05, 0.6], low: [0, 1], wet: 0.2, dry: 1 },
  room:        { rt: 1.1,  pre: 0.006, fc0: 4500, fc1: 1500, er: [8, 0.035, 0.6], low: [0.2, 1.1], wet: 0.28, dry: 0.95 },
  hall:        { rt: 1.8,  pre: 0.015, fc0: 4000, fc1: 1200, er: [8, 0.06, 0.5], low: [0.25, 1.1], wet: 0.36, dry: 0.92 },
  kitchen:     { rt: 1.2,  pre: 0.008, fc0: 2800, fc1: 1000, er: [8, 0.04, 0.5], low: [0.2, 1], wet: 0.26, dry: 0.95 },
  scriptorium: { rt: 1.3,  pre: 0.012, fc0: 2400, fc1: 900,  er: [8, 0.05, 0.45], low: [0.2, 1], wet: 0.26, dry: 0.95 },
  library:     { rt: 0.9,  pre: 0.004, fc0: 2200, fc1: 800,  er: [6, 0.025, 0.4], low: [0.1, 1], wet: 0.13, dry: 1 },
  church:      { rt: 4.5,  pre: 0.03,  fc0: 2600, fc1: 700,  er: [10, 0.11, 0.45], low: [0.45, 1.25], wet: 0.5, dry: 0.85 },
  crypt:       { rt: 2.2,  pre: 0.006, fc0: 1600, fc1: 500,  er: [10, 0.03, 0.6], low: [0.6, 1.3], wet: 0.45, dry: 0.9 },
  wood:        { rt: 0.5,  pre: 0.004, fc0: 3500, fc1: 1200, er: [6, 0.02, 0.5], low: [0.3, 1.2], wet: 0.16, dry: 1 },
  stable:      { rt: 0.6,  pre: 0.006, fc0: 2200, fc1: 900,  er: [6, 0.03, 0.4], low: [0.2, 1], wet: 0.13, dry: 1 },
};

// zone id -> space, for callers that don't pass `acoustic`
export const ZONE_ACOUSTIC = {
  crypt: 'crypt', ossuary: 'crypt', library: 'library', scriptorium: 'scriptorium', kitchen: 'kitchen',
  refectory: 'hall', chapter: 'hall', dormitory: 'hall', church: 'church', choir: 'church', skull: 'crypt',
  hospice: 'wood', 'hospice-cell': 'wood', granary: 'wood', stables: 'stable', folds: 'stable', oxshed: 'stable',
  cloister: 'cloister', porch: 'cloister', narthex: 'cloister',
  'smithy-cells': 'crypt', 'secret-stair': 'crypt', calefactory: 'room', abbot: 'room', infirmary: 'room', baths: 'room',
  smithy: 'room', novices: 'room', lodgings: 'room', cellars: 'room', gatehouse: 'wood', mill: 'wood', press: 'wood',
};

export function makeIR(ctx, name) {
  const P = SPACES[name] || SPACES.room, sr = ctx.sampleRate;
  const len = Math.ceil(sr * (P.pre + P.rt * 1.15 + 0.05));
  const ir = ctx.createBuffer(2, len, sr);
  const pre = Math.round(P.pre * sr), k60 = 6.91 / P.rt, kLow = 6.91 / (P.rt * P.low[1]);
  const onset = Math.max(0.004, P.er[1] * 0.6);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    let lp = 0, lp2 = 0, lo = 0, a = 0;
    for (let i = pre; i < len; i++) {
      const t = (i - pre) / sr;
      if (((i - pre) & 63) === 0) {
        // the tail darkens as it dies: the walls drink the highs first
        const fc = P.fc1 + (P.fc0 - P.fc1) * Math.exp(-t / (P.rt * 0.25));
        a = 1 - Math.exp(-6.2832 * fc / sr);
      }
      const w = Math.random() * 2 - 1;
      lp += a * (w - lp); lp2 += a * (lp - lp2);
      lo += 0.03 * (w - lo);
      const ramp = t < onset ? t / onset : 1;
      d[i] = (lp2 * Math.exp(-k60 * t) + lo * 4 * P.low[0] * Math.exp(-kLow * t)) * ramp;
    }
    // early reflections off the nearest walls, differing left and right
    const [n, span, lvl] = P.er;
    for (let k = 0; k < n; k++) {
      const t = P.pre + Math.pow(Math.random(), 0.8) * span, i = Math.round(t * sr) + (ch ? Math.round(Math.random() * 0.002 * sr) : 0);
      if (i + 3 >= len) continue;
      const g = lvl * (0.4 + Math.random() * 0.6) * Math.exp(-2 * (t - P.pre) / span) * (Math.random() < 0.5 ? -1 : 1) * 0.9;
      d[i] += g; d[i + 1] += g * 0.6; d[i + 2] += g * 0.25;
    }
  }
  // unit energy per channel, so `wet` means the same thing in every space
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch); let e = 0;
    for (let i = 0; i < len; i++) e += d[i] * d[i];
    const s = 1 / Math.sqrt(e || 1);
    for (let i = 0; i < len; i++) d[i] *= s;
    // a short fade at the very end
    const f = Math.min(len, Math.round(0.02 * sr));
    for (let i = 0; i < f; i++) d[len - 1 - i] *= i / f;
  }
  return ir;
}
