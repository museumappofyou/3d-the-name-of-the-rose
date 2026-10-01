import { AED, CHURCH, STABLES, FOLDS, OXSHED, HENHOUSE, SOUTH_RANGE, BATHS, CLOISTER, GRANARY, BLOOD_JAR, P } from '../core/plan.js';

// Where the abbey sounds. Each source is sparse and local; most are silent
// much of the day (see systems/audio/emitters.js for their schedules).
// BOOK: the chant of the offices (Second Day, Matins), the silence of the
// scriptorium broken by quills and pages (claim_000843), the fires of the
// kitchen "roaring like a forge" (claim_000778), the neighing horses behind
// the grille (claim_002606), bleating, bellowing and the pigs (Fourth Day,
// Terce; claim_000215), the wind moaning in the library's slits
// (claim_001251, claim_002775), damp stone below ground.
// AMBIENT: hens, crows over the refuse slope, doors, brooms, the woodpile.

const mid = r => [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2];
const SR = id => mid(SOUTH_RANGE.find(r => r.id === id));

export function buildSoundscape(sound, ctx) {
  const E = (kind, x, y, z, o = {}) => sound.addEmitter({ kind, x, y, z, ...o });
  // calls come from a visible animal of the kind, which lifts its head first
  const beast = group => ({ spot: () => ctx.beasts?.spot(group) || null, onHit: bank => ctx.beasts?.cue(bank) || false, lead: 0.35 });
  const zc = (CHURCH.zN + CHURCH.zS) / 2;
  // church: the choir sings at the offices (between them the church is silent)
  E('chant', (CHURCH.xCross + CHURCH.xChoir) / 2 + 1, 2.4, zc, { zone: ['choir', 'church'], radius: 70 });
  // below ground: water finding its way through the vault
  E('drip', CHURCH.xChoir + 5, -2.2, zc, { zone: 'crypt', radius: 14 });
  E('drip', 30, -2.6, -26, { zone: 'ossuary', radius: 18, gain: 0.8 });
  // the Aedificium
  const A = (x, z) => [AED.x + x, AED.z + z];
  { const [x, z] = A(-12, 11); E('kitchen', x, 1.6, z, { zone: 'kitchen', radius: 30 }); }
  // Quills/pages now belong to the visible authored writing loops.
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 + Math.PI / 8, [x, z] = A(Math.cos(a) * 24, Math.sin(a) * 24);
    E('wind-slit', x, AED.y2 + 1.6, z, { zone: 'library', radius: 9 });
  }
  { const [x, z] = A(0, 29.5); E('door', x - 12, 1.2, z - 12, { radius: 30 }); E('door', x + 12, 1.2, z - 12, { radius: 30 }); }
  // farmyard
  const [sx, sz] = mid(STABLES);
  for (const dz of [-12, 4]) E('stable', sx, 1.4, sz + dz, { zone: 'stables', radius: 26, ...beast('stable') });
  { const [x, z] = mid(FOLDS); E('sheep', x, 1.0, z, { zone: 'folds', radius: 30, ...beast('sheep') }); }
  { const [x, z] = mid(OXSHED); E('oxen', x, 1.3, z, { zone: 'oxshed', radius: 28, ...beast('oxen') }); }
  { const [x, z] = mid(HENHOUSE); E('hens', x + 2, 0.6, z - 5, { radius: 22, ...beast('hens') }); }
  E('pigs', BLOOD_JAR[0] + 18, 0.6, BLOOD_JAR[1] - 26, { radius: 26, ...beast('pigs') });
  { const [x, z] = mid(GRANARY); E('work', x - 14, 0.8, z + 8, { radius: 40 }); }
  E('crows', 96, 2, -68, { radius: 70 });
  E('crows', P(150, 0)[0], 8, P(0, 215)[1], { radius: 60, gain: 0.6 });
  // the south lane: forge and glassworks, mill, woodpile
  { const [x, z] = SR('smithy'); E('smithy', x - 4, 1.4, z, { radius: 38 }); }
  { const [x, z] = SR('mill'); E('work', x, 0.8, z - 8, { radius: 35, gain: 0.7 }); }
  // cloister: a broom on the flags, the well
  E('broom', CLOISTER.x0 + 2, 0.4, CLOISTER.z0 + 4, { zone: ['cloister'], radius: 18 });
  E('water', (CLOISTER.x0 + CLOISTER.x1) / 2, 0.6, (CLOISTER.z0 + CLOISTER.z1) / 2 + 1.5, { radius: 9, gain: 0.35 });
  // baths: the basin in the corner
  { const [x, z] = mid(BATHS); E('drip', x + 5, 1.0, z - 2, { zone: 'baths', radius: 12 }); }
  // the great fires, with their own roar and settling
  for (const e of ctx.fires || []) E('hearth', e.x, e.y, e.z, { zone: e.zone || null, radius: 14, gain: e.gain || 1 });
}
