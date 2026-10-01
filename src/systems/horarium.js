// The horarium: what the community is doing at a given hour of a late
// November day. One table shared by the people, the church lamps and the
// sound, so that the bells, the chant and the choir stalls agree.
//
// Clock from the editor's note that opens the novel (sunrise ≈ 7:30,
// sunset ≈ 16:40): Matins 2:30–3, Lauds 5–6, Prime ≈ 7:30, Terce ≈ 9,
// Sext noon (and the winter midday meal), None 2–3 pm, Vespers ≈ 4:30
// (supper before dark), Compline ≈ 6, bed before 7.
// Evidence: claim_000592–000601 (supper → cemetery → north door →
// Compline), claim_000632–000645 (wakers, Matins, cloister walk, novices to
// the chapter), claim_000456/000513/000508 (Vespers: desks, forges, mangers).

export const OFFICES = [
  // id, start, end (hours); `full`: the whole community in choir;
  // scriptorium monks are excused from Terce, Sext and None (First Day, after None)
  { id: 'matins', t0: 2.45, t1: 3.7, full: true },
  { id: 'lauds', t0: 5.2, t1: 6.1, full: true },
  { id: 'prime', t0: 7.35, t1: 7.95, full: true, servants: true },   // claim_000740
  { id: 'terce', t0: 8.9, t1: 9.25, full: false },
  { id: 'sext', t0: 11.85, t1: 12.25, full: false },
  { id: 'nones', t0: 14.4, t1: 14.75, full: false },
  { id: 'vespers', t0: 16.35, t1: 16.95, full: true },
  { id: 'compline', t0: 18.0, t1: 18.6, full: true },
];

// phases of the day, in order; `t1` is exclusive
export const PHASES = [
  { id: 'night', t0: 0, t1: 2.2 },            // the dormitory sleeps; the tripod burns (claim_001021)
  { id: 'waking', t0: 2.2, t1: 2.45 },        // the wakers go round with a bell (claim_000632)
  { id: 'office', t0: 2.45, t1: 3.7, office: 'matins' },
  { id: 'vigil', t0: 3.7, t1: 5.2 },          // cloister walk, novices study psalms (claim_000643–000645)
  { id: 'office', t0: 5.2, t1: 6.1, office: 'lauds' },
  { id: 'dawn', t0: 6.1, t1: 7.35 },          // "the first servants rise at dawn"
  { id: 'office', t0: 7.35, t1: 7.95, office: 'prime' },
  // the minor hours are offices too (a small choir; the scriptorium and the
  // workshops go on working: isDay() in people/schedule.js), so the clock,
  // the choir stalls and the chant all agree at Terce, Sext and None
  { id: 'work', t0: 7.95, t1: 8.9 },
  { id: 'office', t0: 8.9, t1: 9.25, office: 'terce' },
  { id: 'work', t0: 9.25, t1: 11.85 },
  { id: 'office', t0: 11.85, t1: 12.25, office: 'sext' },
  { id: 'meal', t0: 12.25, t1: 13.0 },        // the winter midday meal (the editor's note)
  { id: 'work', t0: 13.0, t1: 14.4 },
  { id: 'office', t0: 14.4, t1: 14.75, office: 'nones' },
  { id: 'work', t0: 14.75, t1: 16.35 },
  { id: 'office', t0: 16.35, t1: 16.95, office: 'vespers' },
  { id: 'supper', t0: 16.95, t1: 17.85 },     // refectory, torches, a reader (First Day, Compline)
  { id: 'procession', t0: 17.85, t1: 18.0 },  // hooded file across the cemetery to the north door
  { id: 'office', t0: 18.0, t1: 18.6, office: 'compline' },
  { id: 'retire', t0: 18.6, t1: 19.2 },
  { id: 'night', t0: 19.2, t1: 24 },
];

const wrap = t => Math.round((((t % 24) + 24) % 24) * 1e9) / 1e9;
export function phaseAt(t) {
  t = wrap(t);
  for (const p of PHASES) if (t >= p.t0 && t < p.t1) return p;
  return PHASES[0];
}
export function officeAt(t) {
  t = wrap(t);
  return OFFICES.find(o => t >= o.t0 && t < o.t1) || null;
}
// is this an hour at which daily work goes on (fields, kitchen, forge)?
export const isWork = t => { const p = phaseAt(t).id; return p === 'work' || (p === 'office' && !officeAt(t)?.full); };
export const isDaylight = t => { t = wrap(t); return t > 7.3 && t < 16.8; };
// claim_000173: locked after the evening meal. The implementation's meal
// boundary is shared with the people; these are study hours, not a clock
// that rings bells while the user scrubs a preview.
export const aedificiumBarred = t => { t = wrap(t); return t >= PHASES.find(p => p.id === 'supper').t1 || t < 5.2; };
