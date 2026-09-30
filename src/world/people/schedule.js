import { sectorPoints, rot as lrot } from '../../core/library.js';
import { CHURCH as C, AED, CLOISTER, VEG_GARDEN, HERB_GARDEN, GRANARY, THRESHING, STABLES, SOUTH_RANGE, CHAPTER, BLOOD_JAR } from '../../core/plan.js';

// ----------------------------------------------------------------------
// Who is where, at which hour. This is the population's half of the
// horarium (systems/horarium.js is the shared clock; we only read
// phaseAt/officeAt from it and add the people layer here). Every slot is a
// fixed floor position with a facing and a pose; the runtime picks the
// groups active for the current phase and animates the nearest.
//
// Discipline: the numbers stay sparse and quiet. The whole community is
// 60 monks + 150 servants (BOOK #000166/#000167), but they are never all
// shown; we spawn per zone by hour, capped. Evidence lives in
// evidence_life.md §1–§2 and §9; claim ids are noted per group below.
// ----------------------------------------------------------------------

const zc = (C.zN + C.zS) / 2;
const CHURCH_FLOOR = 0.35, AED0 = AED.y0, AED1 = AED.y1;

// --- CHOIR STALLS ------------------------------------------------------
// church.js: two facing rows each side of the choir, xs = xCross+0.6 to
// xChoir+3.4, z = zc ± 2.55 (inner) and ± 3.25 (outer, +0.35 riser).
// Monks stand/sit facing across the choir (inner rows face inward).
function choirSlots() {
  const xs = C.xCross + 1.2, xe = C.xChoir + 3.0, out = [];
  const n = 9;
  for (const s of [-1, 1]) {
    for (const [off, rise] of [[2.55, 0.06], [3.25, 0.41]]) {
      const z = zc + s * off;
      // face across the choir toward the centre line (figures look along
      // their local +z: ry = 0 faces south, π faces north)
      const ry = s < 0 ? 0 : Math.PI;
      for (let k = 0; k < n; k++) {
        const x = xs + (k + 0.5) * (xe - xs) / n;
        out.push({ x, y: CHURCH_FLOOR + rise, z: z - s * 0.28, ry, seat: true });
      }
    }
  }
  return out;
}
const CHOIR = choirSlots();
const ALTAR = { x: C.xChoir + 5.4, y: CHURCH_FLOOR, z: zc };     // high altar
const VIRGIN = { x: (C.x0 + (C.xCross - C.x0) * 0.85) + 2.6, y: CHURCH_FLOOR, z: C.zN + 1.4 };
const TRIPOD = { x: C.xCross - 2.2, y: CHURCH_FLOOR, z: zc };
const NAVE = { x: C.x0 + 14, y: CHURCH_FLOOR, z: zc };
const PULPIT_CH = { x: C.x0 + (C.xCross - C.x0) * 0.7, y: CHURCH_FLOOR, z: zc - 6.6 }; // sermon pulpit

// --- SCRIPTORIUM DESKS -------------------------------------------------
// The 40 desks under the windows at AED.y1 (aedificium.js scriptorium()):
// the same construction is repeated here so that each monk sits on the
// bench of a real desk (furniture.js desk(): bench 0.75 m behind the desk
// in its local +z), facing the page. BOOK #000403: about thirty at work.
function scriptoriumSlots() {
  const A = AED, S = sectorPoints(A), out = [];
  const seat = (x, z, ry) => out.push({ x: A.x + x + Math.sin(ry) * 0.74, y: AED1, z: A.z + z + Math.cos(ry) * 0.74, ry: ry + Math.PI, seat: true });
  for (let k = 0; k < 4; k++) {               // 12 under the long walls
    const a = lrot(S.t[6], k), c = lrot(S.t[1], k + 1);
    const d = [c[0] - a[0], c[1] - a[1]], L = Math.hypot(...d), u = [d[0] / L, d[1] / L];
    const inw = [u[1], -u[0]], mid = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
    const sgn = (mid[0] * inw[0] + mid[1] * inw[1]) > 0 ? -1 : 1, off = A.wallOut / 2 + 0.55;
    for (const t of [0.2, 0.5, 0.8]) seat(a[0] + u[0] * L * t + inw[0] * sgn * off, a[1] + u[1] * L * t + inw[1] * sgn * off, Math.atan2(-inw[0] * sgn, -inw[1] * sgn) + Math.PI);
  }
  for (let k = 0; k < 4; k++) for (let f = 1; f <= 5; f++) {   // 20 in the towers
    const a = lrot(S.t[f], k), c = lrot(S.t[f + 1], k), mid = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2], tc = lrot(S.Tc, k);
    const toC = [tc[0] - mid[0], tc[1] - mid[1]], L = Math.hypot(...toC), off = A.wallOut / 2 + 0.55;
    seat(mid[0] + toC[0] / L * off, mid[1] + toC[1] / L * off, Math.atan2(toC[0], toC[1]) + Math.PI);
  }
  for (let i = 0; i < 8; i++) {                // 8 under the well windows
    const ang = i * Math.PI / 4, rr = A.a0 + A.wallWell / 2 + 0.5;
    seat(rr * Math.cos(ang), rr * Math.sin(ang), Math.atan2(Math.cos(ang), Math.sin(ang)));
  }
  // interleave long-wall, tower and well desks so any subset is spread out
  return out.map((s, i) => [s, (i * 7) % out.length]).sort((a, b) => a[1] - b[1]).map(a => a[0]);
}
const SCRIPT = scriptoriumSlots();
// Malachi's desk & the fire (aedificium.js local [dT-6.8,-2.2] rot0, and
// north-tower fire at rot([dT+5.5,0],3)); give world approximations.
const MALACHI = { x: AED.x + (AED.dT - 6.8), y: AED1, z: AED.z - 2.2 - 0.8, ry: 0, seat: true }; // on his chair, facing the table

// --- REFECTORY (aedificium.js east half) -------------------------------
// tables run along the NE wall, direction (1,-1); rows at d = 9.5,12.6,15.7
// with benches at ±0.72; dais toward the east tower.
function refectorySlots() {
  // aedificium.js refectory(): trestles 6 m long at rows d, s = ±5.2, ry
  // along = -π/4, so a table's long axis runs along (1,1)/√2 in plan. The
  // diners sit along both long sides facing the board.
  const out = [], along = -Math.PI / 4;
  const ax = [Math.cos(along), -Math.sin(along)], nx = [Math.sin(along), Math.cos(along)];
  for (const d of [9.5, 12.6, 15.7]) {
    for (const s of [-5.2, 5.2]) {
      const cx = d * Math.SQRT1_2 + s * Math.SQRT1_2, cz = -d * Math.SQRT1_2 + s * Math.SQRT1_2;
      for (let i = -2; i <= 2; i++) for (const side of [-1, 1]) {
        const x = cx + ax[0] * i * 1.1 + nx[0] * side * 0.78, z = cz + ax[1] * i * 1.1 + nx[1] * side * 0.78;
        out.push({ x: AED.x + x, y: AED0, z: AED.z + z, ry: Math.atan2(-nx[0] * side, -nx[1] * side), seat: true });
      }
    }
  }
  return out.map((s, i) => [s, (i * 7) % out.length]).sort((a, b) => a[1] - b[1]).map(a => a[0]);
}
const REFECT = refectorySlots();
const DAIS = { x: AED.x + 19.5 + 0.95, y: AED0 + 0.4, z: AED.z + (3.2 - 3.5), ry: -Math.PI / 2, seat: true }; // abbot
const READER = { x: AED.x - 3.0, y: AED0 + 1.4, z: AED.z - 19.5, ry: Math.PI * 0.25 };                 // pulpit

// --- KITCHEN (west half) ----------------------------------------------
// work tables at local [-15.5,6.2],[-9.5,12.5],[5.5,15.8]; hearth in the
// south tower, oven in the west tower.
const KITCHEN = {
  tables: [[-15.5, 6.2, 0.5], [-9.5, 12.5, 0.95], [5.5, 15.8, 1.4]].map(([x, z, r]) => ({ x: AED.x + x + Math.sin(r) * 0.9, y: AED0, z: AED.z + z + Math.cos(r) * 0.9, ry: r + Math.PI, work: 'knead' })),
  // before the hearth's front (its bed is 1.8 deep) and at the oven's mouth
  // (aedificium.js kitchen(): hearth at dT-3.95 in the south tower, oven at
  // dT-4.0 in the west tower, mouth 1.55 toward the hall), facing the fire
  hearth: { x: AED.x + rotX(AED.dT - 5.45, 1), y: AED0, z: AED.z + rotZ(AED.dT - 5.45, 1), ry: 0, work: 'stir' },
  oven: { x: AED.x + rotX(AED.dT - 6.5, 2), y: AED0, z: AED.z + rotZ(AED.dT - 6.5, 2), ry: -Math.PI / 2, work: 'stir' },
};
function rotX(x, k) { const a = k * Math.PI / 2; return x * Math.cos(a); }
function rotZ(x, k) { const a = k * Math.PI / 2; return x * Math.sin(a); }

// --- CLOISTER walk (claustrum) ----------------------------------------
const CLOIS = (() => {
  const cx = (CLOISTER.x0 + CLOISTER.x1) / 2, cz = (CLOISTER.z0 + CLOISTER.z1) / 2;
  const w = (CLOISTER.x1 - CLOISTER.x0) / 2 - CLOISTER.walk / 2, h = (CLOISTER.z1 - CLOISTER.z0) / 2 - CLOISTER.walk / 2;
  const out = [];
  const n = 10;
  for (let i = 0; i < n; i++) {
    const t = i / n * Math.PI * 2;
    out.push({ x: cx + Math.cos(t) * w, z: cz + Math.sin(t) * h, ry: t + Math.PI / 2, walk: t });
  }
  return { cx, cz, w, h, out, porch: { x: CLOISTER.x0 + 1.2, z: cz, ry: Math.PI / 2 } };
})();

// --- CHAPTER house -----------------------------------------------------
const CHAP = { x: (CHAPTER.x0 + CHAPTER.x1) / 2, z: (CHAPTER.z0 + CHAPTER.z1) / 2 };

// --- FARMYARD, gardens, workshops (outdoors; y from terrain at runtime) -
const VAT = { x: BLOOD_JAR[0], z: BLOOD_JAR[1] };
const STABLE = { x: (STABLES.x0 + STABLES.x1) / 2, z: (STABLES.z0 + STABLES.z1) / 2 };
const THRESH = { x: (THRESHING.x0 + THRESHING.x1) / 2, z: (THRESHING.z0 + THRESHING.z1) / 2 };
const GRAN = { x: (GRANARY.x0 + GRANARY.x1) / 2, z: (GRANARY.z0 + GRANARY.z1) / 2 };
// the forge hall (outbuildings.js smithy(): local frame = world axes, floor
// at 0.25): each smith stands at the north face of his anvil, between it and
// his hearth, facing the work (anvils at local x = -hl+3.7 / -hl+9.7, z 0.2,
// turned 0.2 / 0.5 rad)
const SMITHS = (() => {
  const s = SOUTH_RANGE.find(o => o.id === 'smithy'), cx = (s.x0 + s.x1) / 2, cz = (s.z0 + s.z1) / 2, hl = (s.x1 - s.x0) / 2;
  return [[-hl + 3.7, 0.2], [-hl + 9.7, 0.5]].map(([lx, ry]) => ({ x: cx + lx - 0.72 * Math.sin(ry), y: 0.25, z: cz + 0.2 - 0.72 * Math.cos(ry), ry }));
})();
// the horse stable (outbuildings.js: 14 stalls along the east wall, mangers
// at x1-3.75 opening on the aisle, floor 0.25). A groom forks hay into
// Brunellus's manger (stall 0, the first from the left seen from the grille)
// and another beds down a stall further along, both facing the horses.
const GROOMS = (() => {
  const W = STABLES.z1 - STABLES.z0, dz = (W - 2) / 14, xm = STABLES.x1 - 3.75, zc = i => STABLES.z0 + 1 + (i + 0.5) * dz;
  return [{ x: xm - 0.62, y: 0.25, z: zc(0) + 0.15, ry: Math.PI / 2, work: 'fodder' }, { x: xm - 1.5, y: 0.25, z: zc(5), ry: Math.PI / 2 + 0.25, work: 'sweep' }];
})();
const MILL = (() => { const s = SOUTH_RANGE.find(o => o.id === 'mill'); return { x: (s.x0 + s.x1) / 2, z: s.z0 - 3 }; })();
const HERB = { x: (HERB_GARDEN.x0 + HERB_GARDEN.x1) / 2, z: (HERB_GARDEN.z0 + HERB_GARDEN.z1) / 2 };
const VEG = { x: (VEG_GARDEN.x0 + VEG_GARDEN.x1) / 2, z: (VEG_GARDEN.z0 + VEG_GARDEN.z1) / 2 };

// the procession route: the monks leave the refectory (Aedificium, south
// side) and file across the cemetery into the church by the north door.
// (BOOK #000592–#000594.) The cemetery lies between the Aed and the
// church's north side; the north door is at ~ (xChoir+4, chN).
const PROCESSION = [
  [AED.x, AED.z + 24],                       // out of the Aed south side
  [AED.x - 6, AED.z + 32],
  [C.xChoir + 6, zc - 24],                    // into the cemetery
  [C.xChoir + 4.0, (zc - 4.6) - 2.0],         // the church north door
];

// ----------------------------------------------------------------------
// The spawn table. groupsFor(phase, office) → array of groups:
//   { id, kind, zone, surface, slots|area, pose|work, cap, indoor }
// slots: explicit positions. area: {x,z,r,n} random scatter (outdoors).
// The runtime resolves outdoor y from terrain; indoor y is in the slot.
// ----------------------------------------------------------------------
export function scene(phase, office, time = phase.t0) {
  const p = phase.id;
  const G = [];
  const inOffice = p === 'office';
  const full = office?.full;

  // ---- CHURCH: occupied according to the hour ----
  if (inOffice) {
    // full community at Matins/Lauds/Prime/Vespers/Compline; a smaller
    // group at Terce/Sext/None (scriptorium monks excused). BOOK #000635.
    const n = full ? CHOIR.length : Math.min(10, CHOIR.length);
    // they stand in their stalls for the psalms, hands in their sleeves; at
    // Matins they prostrate at first, then sit for the lessons
    const pose = office.id === 'matins' ? (time <= 2.75 ? 'prostrate' : 'sit') : 'pray';
    G.push({ id: 'choir', kind: 'monk', zone: 'church', surface: 'stone', indoor: true, slots: CHOIR.slice(0, n), pose });
    // a few novices behind, standing (BOOK #000635)
    if (full) G.push({ id: 'choir-novice', kind: 'novice', zone: 'church', surface: 'stone', indoor: true, slots: CHOIR.slice(2, 8).map(s => ({ ...s, z: s.z + (s.ry === 0 ? -1.0 : 1.0), seat: false })), pose: 'pray' });
    if (office.id === 'matins') G.push({ id: 'waker', kind: 'monk', zone: 'church', surface: 'stone', indoor: true, slots: [{ x: C.xCross + 3, y: CHURCH_FLOOR, z: zc, ry: Math.PI / 2, lamp: true }], pose: 'stand' });
    if (office.id === 'sext') G.push({ id: 'acolytes', kind: 'novice', zone: 'church', surface: 'stone', indoor: true, slots: [{ ...ALTAR, x: ALTAR.x - 1.4, z: ALTAR.z - 0.8, ry: -Math.PI / 2 }, { ...ALTAR, x: ALTAR.x - 1.4, z: ALTAR.z + 0.8, ry: -Math.PI / 2 }], pose: 'bow' });
  } else if (p === 'night' && phase.t0 >= 19) {
    // empty at night, only the tripod (no figures)
  } else {
    // off-hours: Ubertino at the Virgin, 1–3 praying monks. BOOK #000212/#000988.
    G.push({ id: 'ubertino', named: 'ubertino', kind: 'monk', zone: 'church', surface: 'stone', indoor: true, slots: [{ ...VIRGIN, x: VIRGIN.x + 0.6, z: VIRGIN.z + 1.2, ry: -Math.PI / 2 }], pose: 'kneel' });
    if (p !== 'waking' && p !== 'night') G.push({ id: 'prayers', kind: 'monk', zone: 'church', surface: 'stone', indoor: true, slots: [{ ...NAVE, z: zc - 2 }, { ...NAVE, x: NAVE.x + 5, z: zc + 2 }], pose: 'kneel' });
  }

  // ---- CLOISTER: between Matins and Lauds and before supper. BOOK #000645/#000986 ----
  if (p === 'vigil' || p === 'supper' || (p === 'work' && office === null && phase.t0 > 13)) {
    G.push({ id: 'cloister-walk', kind: 'monk', zone: 'cloister', surface: 'stone', indoor: false, walkers: CLOIS, pose: 'walk', cap: p === 'vigil' ? 6 : 4 });
    // Alinardo on the porch (BOOK #000989)
    G.push({ id: 'alinardo', named: 'alinardo', kind: 'monk', zone: 'cloister', surface: 'stone', indoor: false, slots: [{ x: CLOIS.porch.x, z: CLOIS.porch.z, ry: CLOIS.porch.ry, ground: true }], pose: 'sit' });
  }

  // ---- CHAPTER: novices with masters between Matins and Lauds. BOOK #000643 ----
  if (p === 'vigil') {
    const cs = [];
    for (let i = 0; i < 6; i++) cs.push({ x: CHAP.x - 6 + i * 2.2, z: CHAP.z, ry: 0, ground: true });
    G.push({ id: 'chapter-novices', kind: 'novice', zone: 'chapter', surface: 'stone', indoor: false, slots: cs, pose: 'sit' });
  }

  const day = isDay(phase, office);

  // ---- SCRIPTORIUM: ~30 monks by day until Vespers. BOOK #000403 ----
  if (day && p !== 'meal') {
    G.push({ id: 'scriptorium', kind: 'monk', zone: 'scriptorium', surface: 'straw', indoor: true, slots: SCRIPT.slice(0, 26), pose: 'write' });
    G.push({ id: 'malachi', named: 'malachi', kind: 'monk', zone: 'scriptorium', surface: 'straw', indoor: true, slots: [MALACHI], pose: 'write' });
  } else if (office?.id === 'vespers') {
    // Malachi and Berengar tidy at Vespers. BOOK #000456/#000526
    G.push({ id: 'malachi', named: 'malachi', kind: 'monk', zone: 'scriptorium', surface: 'straw', indoor: true, slots: [{ ...MALACHI, seat: false }], pose: 'stand' });
    G.push({ id: 'tidy', kind: 'monk', zone: 'scriptorium', surface: 'straw', indoor: true, slots: [{ ...MALACHI, x: MALACHI.x + 3, z: MALACHI.z + 2, seat: false }], pose: 'stand' });
  }

  // ---- REFECTORY: the two meals; seated, hooded, silent. BOOK D1 AKŞAM ----
  if (p === 'meal' || p === 'supper') {
    G.push({ id: 'refectory', kind: 'monk', zone: 'refectory', surface: 'stone', indoor: true, slots: REFECT.slice(0, 24), pose: 'dine' });
    G.push({ id: 'abbot', named: 'abbot', kind: 'abbot', zone: 'refectory', surface: 'stone', indoor: true, slots: [DAIS], pose: 'dine' });
    G.push({ id: 'reader', kind: 'monk', zone: 'refectory', surface: 'stone', indoor: true, slots: [READER], pose: 'read' });
  }

  // ---- KITCHEN: cooks & servants by day, until Compline. BOOK #000359 ----
  if (day || p === 'meal' || p === 'supper') {
    const ks = KITCHEN.tables.map(t => ({ ...t }));
    G.push({ id: 'kitchen', kind: 'servant', zone: 'kitchen', surface: 'stone', indoor: true, slots: ks, pose: 'knead' });
    G.push({ id: 'cook', kind: 'servant', zone: 'kitchen', surface: 'stone', indoor: true, slots: [{ ...KITCHEN.hearth }, { ...KITCHEN.oven }], pose: 'stir' });
  }

  // ---- FARMYARD (outdoors) ----
  if (day) {
    // swineherds stirring the blood vat at None (BOOK #000375)
    G.push({ id: 'swineherds', kind: 'herd', zone: null, surface: 'snow', indoor: false, slots: [{ x: VAT.x - 1.3, z: VAT.z, ry: Math.PI / 2, ground: true }, { x: VAT.x + 1.3, z: VAT.z - 0.3, ry: -Math.PI / 2, ground: true }], pose: 'stir' });
    // grooms/cowherds about the stables and threshing floor
    G.push({ id: 'grooms', kind: 'herd', zone: 'stables', surface: 'straw', indoor: true, slots: GROOMS, pose: 'stand', perSlot: true });
    G.push({ id: 'threshers', kind: 'servant', zone: null, surface: 'straw', indoor: false, area: { x: THRESH.x, z: THRESH.z - 4, r: 5, n: 2 }, pose: 'sweep', hits: 'sweep' });
    // peasants with sacks at the granary/mill (BOOK #001714)
    G.push({ id: 'peasants-gran', kind: 'peasant', zone: null, surface: 'snow', indoor: false, area: { x: GRAN.x - 3, z: GRAN.z - 3, r: 4, n: 2 }, pose: 'carry', carry: true });
    G.push({ id: 'peasants-mill', kind: 'peasant', zone: null, surface: 'snow', indoor: false, area: { x: MILL.x, z: MILL.z, r: 4, n: 2 }, pose: 'carry', carry: true });
    // smiths until Vespers (BOOK #000513)
    if (!(office?.id === 'vespers')) G.push({ id: 'smiths', kind: 'servant', zone: 'smithy', surface: 'earth', indoor: true, slots: SMITHS, pose: 'hammer', hits: 'hot' });
    // Severinus / a novice in the herb garden (BOOK #000309)
    G.push({ id: 'gardener', named: 'severinus', kind: 'monk', zone: null, surface: 'snow', indoor: false, slots: [{ x: HERB.x, z: HERB.z, ry: 0, ground: true }], pose: 'bow' });
    void VEG;
  }

  // ---- VESPERS transition: animals to mangers, everyone walks to church ----
  // (handled by the choir at office; grooms already present.)

  // ---- PROCESSION after supper: hooded file to the north door. BOOK #000592 ----
  if (p === 'procession') {
    G.push({ id: 'procession', kind: 'monk', zone: null, surface: 'snow', indoor: false, file: PROCESSION, pose: 'walk', cap: 10 });
  }

  return G;
}

function isDay(phase, office) {
  const p = phase.id;
  if (p === 'work' || p === 'dawn') return true;
  if (p === 'office' && !office?.full) return true; // Terce/Sext/None: work continues
  return false;
}

export const ANCHORS = { CHOIR, ALTAR, VIRGIN, TRIPOD, NAVE, SCRIPT, REFECT, KITCHEN, CLOIS, PROCESSION };
