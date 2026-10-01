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
// church.js: two tiers a side, rows at zc ± 2.45 (platform 0.2) and ± 3.35
// (platform 0.55), stalls about 0.72 wide from xCross+0.6 to xChoir+3.4; each
// stall's seat centre 0.2 behind the row line, its top 0.48 above the
// platform. A brother stands on the platform before his seat (feet placed on
// it by people.js) and sits on the seat itself at the Matins lessons.
// Figures look along their local +z: ry = 0 faces south, π faces north.
function choirSlots() {
  const xs = C.xCross + 0.6, xe = C.xChoir + 3.4, L = xe - xs, n = Math.round(L / 0.72), w = L / n, out = [];
  for (const s of [-1, 1]) {
    for (const [off, rise] of [[2.45, 0], [3.35, 0.35]]) {
      const zz = zc + s * off, ry = s < 0 ? 0 : Math.PI;
      for (let k = 0; k < n; k++) {
        const x = xs + (k + 0.5) * w;
        // The crossing piers occupy part of the upper tier. Its joinery
        // meets the stone, but these narrow places cannot hold a person.
        if (rise && [C.xCross, C.xChoir].some(pier => Math.abs(x - pier) < 1.05)) continue;
        // Upper-row knees stay behind the lower row's bookboard. The
        // standing position is distinct from the sitting bones' seat.
        out.push({ x, y: CHURCH_FLOOR + 0.2 + rise, z: zz - s * (rise ? 0.035 : 0.22), seatZ: zz + s * 0.2, ry, row: rise ? 1 : 0 });
      }
    }
  }
  // interleave the rows and sides so a smaller choir still fills both sides
  return out.map((q, i) => [q, (i % n) * 4 + Math.floor(i / n)]).sort((a, b) => a[1] - b[1]).map(a => a[0]);
}
const CHOIR = choirSlots();
const ALTAR = { x: C.xChoir + 5.4, y: CHURCH_FLOOR, z: zc };     // high altar
// the acolytes serve on the altar's ashlar step (church.js: 3.8 × 2.6 m, 0.35 high)
const ALTAR_STEP = CHURCH_FLOOR + 0.35;
const VIRGIN = { x: (C.x0 + (C.xCross - C.x0) * 0.85) + 2.6, y: CHURCH_FLOOR, z: C.zN + 1.4 };
const TRIPOD = { x: C.xCross - 2.2, y: CHURCH_FLOOR, z: zc };
const NAVE = { x: C.x0 + 14, y: CHURCH_FLOOR, z: zc };
const PULPIT_CH = { x: C.x0 + (C.xCross - C.x0) * 0.7, y: CHURCH_FLOOR, z: zc - 6.6 }; // sermon pulpit

// --- SCRIPTORIUM DESKS -------------------------------------------------
// The 40 desks under the windows at AED.y1 (aedificium.js scriptorium()):
// the same construction is repeated here so that each monk sits on the
// bench of a real desk (furniture.js desk(): bench 0.75 m behind the desk
// in its local +z; 0.62 behind the desk's centre), facing the page.
// BOOK #000403: about thirty at work.
function scriptoriumSlots() {
  const A = AED, S = sectorPoints(A), out = [];
  const seat = (x, z, ry) => out.push({ x: A.x + x + Math.sin(ry) * 0.62, y: AED1, z: A.z + z + Math.cos(ry) * 0.62, ry: ry + Math.PI, seat: true });
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
    seat(mid[0] + toC[0] / L * off, mid[1] + toC[1] / L * off, Math.atan2(toC[0], toC[1]));
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
      // (each place centred on its bowl: aedificium.js lays it 0.18 along
      // the board from the place's line, 0.22 in from the board's axis)
      for (let i = -2; i <= 2; i++) for (const side of [-1, 1]) {
        const u = i * 1.1 + side * 0.18;
        const x = cx + ax[0] * u + nx[0] * side * 0.78, z = cz + ax[1] * u + nx[1] * side * 0.78;
        out.push({ x: AED.x + x, y: AED0, z: AED.z + z, ry: Math.atan2(-nx[0] * side, -nx[1] * side), seat: true });
      }
    }
  }
  return out.map((s, i) => [s, (i * 7) % out.length]).sort((a, b) => a[1] - b[1]).map(a => a[0]);
}
const REFECT = refectorySlots();
const DAIS = { x: AED.x + 19.5 + 0.95, y: AED0 + 0.4, z: AED.z + (3.2 - 3.5), ry: -Math.PI / 2, seat: true }; // abbot
// the reader stands on the pulpit behind its lectern (aedificium.js: lectern
// at the pulpit's centre, turned π/4, its book sloping down toward him)
const READER = { x: AED.x - 3.0 + Math.sin(Math.PI * 0.25) * 0.42, y: AED0 + 1.4, z: AED.z - 19.5 + Math.cos(Math.PI * 0.25) * 0.42, ry: Math.PI * 1.25 };

// --- KITCHEN (west half) ----------------------------------------------
// work tables at local [-15.5,6.2],[-9.5,12.5],[5.5,15.8]; hearth in the
// south tower, oven in the west tower.
const KITCHEN = {
  tables: [[-15.5, 6.2, 0.5], [-9.5, 12.5, 0.95], [5.5, 15.8, 1.4]].map(([x, z, r]) => ({ x: AED.x + x + Math.sin(r) * 0.9, y: AED0, z: AED.z + z + Math.cos(r) * 0.9, ry: r + Math.PI, work: 'knead' })),
  // the great pot hangs 0.9 to one side of the hearth's middle, 0.1 behind
  // it (furniture.js hearth(), turned π in the south tower); the cook stands
  // 1.1 before it, clear of the raised bed, stirring it with a long paddle
  hearth: (() => { const [hx, hz] = lrot([AED.dT - 3.95, 0], 1); return { x: AED.x + hx + 0.9, y: AED0, z: AED.z + hz - 1.2, ry: 0, work: 'stir' }; })(),
  // the baker kneads at the table by the oven (west tower: table 2.4 x 1.0,
  // turned π, at [dT-7.5, -2.6] in the tower's frame)
  oven: (() => { const [tx, tz] = lrot([AED.dT - 7.5, -2.6], 2); return { x: AED.x + tx, y: AED0, z: AED.z + tz - 0.9, ry: 0, work: 'knead' }; })(),
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
  // Alinardo's seat: the stone bench against the west walk's outer wall
  // (claustrum.js), facing the garth
  return { cx, cz, w, h, out, porch: { x: CLOISTER.x0 + 0.62, z: (C.zS + 0.55 + CLOISTER.z1) / 2, ry: Math.PI / 2 } };
})();

// --- CHAPTER house -----------------------------------------------------
const CHAP = { x: (CHAPTER.x0 + CHAPTER.x1) / 2, z: (CHAPTER.z0 + CHAPTER.z1) / 2 };
// the chapter house's inner ring of benches round the Abbot's table
// (claustrum.js chapterHouse(): table at x1 - 3.0, benches on an ellipse)
const CHAP_BENCHES = (() => {
  const tcx = CHAPTER.x1 - 3.0, zc2 = (CHAPTER.z0 + CHAPTER.z1) / 2, out = [];
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i + 0.5) / 7 * Math.PI, R = 5.2;
    const bx = tcx - 2.2 - Math.cos(a) * R * 1.35, bz = zc2 + Math.sin(a) * R * 0.78;
    // square to the plank: the ellipse's inward normal (claustrum.js benches)
    out.push({ x: bx, z: bz, ry: Math.atan2(Math.cos(a) * R * 0.78, -Math.sin(a) * R * 1.35), seat: true });
  }
  return out;
})();

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
const CARRY = [[-7.98, 51.2], [-7.98, 48.2], [18.9, 48.2], [18.9, 51.2]];
const MILL = (() => { const s = SOUTH_RANGE.find(o => o.id === 'mill'); return { x: (s.x0 + s.x1) / 2, z: s.z0 - 3 }; })();
const HERB = { x: (HERB_GARDEN.x0 + HERB_GARDEN.x1) / 2, z: (HERB_GARDEN.z0 + HERB_GARDEN.z1) / 2 };
const VEG = { x: (VEG_GARDEN.x0 + VEG_GARDEN.x1) / 2, z: (VEG_GARDEN.z0 + VEG_GARDEN.z1) / 2 };

// the procession route: the monks leave the refectory by the Aedificium's
// south door and file across the cemetery into the church by the north door
// (BOOK #000592–#000594). The points are those of the walked route R9
// (src/data/routes_aed.js). The file starts inside the south door and ends
// at distinct waiting places in the church; it does not wrap or teleport.
const PROCESSION = [
  [55.4, -54.5], [56.46, -51.9], [58.6, -49.8],   // out of the south door
  [54.6, -33.6], [46.2, -21.0],                     // across the cemetery
  [42.22, -13.2], [42.22, -10.06], [42.2, -8.4],   // in by the north door
];
// A bounded preview ends in separate standing places north of the altar,
// beyond the choir joinery. These are reconstructed waiting places; no
// complete day simulation or exact canonical arrival seating is implied.
const PROCESSION_ARRIVALS = Array.from({ length: 10 }, (_, i) => ({ x: 42.0 + (i % 5) * 0.65, z: -8.9 + Math.floor(i / 5) * 0.9, ry: 0 }));

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
    // The current authored opening gesture is a profound bow. The text's
    // full prostration is not yet represented by a fitted cloth pose.
    const lessons = office.id === 'matins' && time > 2.75;
    const pose = office.id === 'matins' ? (lessons ? 'sit' : 'bow') : 'pray';
    G.push({ id: 'choir', kind: 'monk', zone: 'church', surface: 'stone', indoor: true, slots: CHOIR.slice(0, n).map(q => lessons ? { ...q, z: q.seatZ, seat: true } : q), pose });
    // the novices, who enter after their masters (BOOK #000635), stand on the
    // floor before the lower row's desks
    if (full) G.push({ id: 'choir-novice', kind: 'novice', zone: 'church', surface: 'stone', indoor: true, slots: CHOIR.filter(q => !q.row).slice(0, 6).map(q => ({ ...q, y: CHURCH_FLOOR, z: q.z + (q.ry === 0 ? 1.0 : -1.0) })), pose: 'pray' });
    if (office.id === 'matins') G.push({ id: 'waker', kind: 'monk', zone: 'church', surface: 'stone', indoor: true, slots: [{ x: C.xCross + 3, y: CHURCH_FLOOR, z: zc, ry: Math.PI / 2, lamp: true }], pose: 'stand' });
    if (office.id === 'sext') G.push({ id: 'acolytes', kind: 'novice', zone: 'church', surface: 'stone', indoor: true, slots: [{ ...ALTAR, x: ALTAR.x - 1.4, y: ALTAR_STEP, z: ALTAR.z - 0.8, ry: -Math.PI / 2 }, { ...ALTAR, x: ALTAR.x - 1.4, y: ALTAR_STEP, z: ALTAR.z + 0.8, ry: -Math.PI / 2 }], pose: 'bow' });
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
  }
  // Alinardo on the porch (BOOK #000989). The short evening availability
  // is reconstructed so someone who has just found the barred doors can
  // consult him before the community retires.
  if (p === 'vigil' || p === 'supper' || p === 'procession' || p === 'retire' || (p === 'work' && office === null && phase.t0 > 13)) {
    G.push({ id: 'alinardo', named: 'alinardo', kind: 'monk', zone: 'cloister', surface: 'stone', indoor: false, slots: [{ x: CLOIS.porch.x, y: 0.35, z: CLOIS.porch.z, ry: CLOIS.porch.ry, seat: true }], pose: 'sit' });
  }

  // ---- CHAPTER: novices with masters between Matins and Lauds. BOOK #000643 ----
  if (p === 'vigil') {
    // on the inner ring of benches, facing the Abbot's table
    G.push({ id: 'chapter-novices', kind: 'novice', zone: 'chapter', surface: 'stone', indoor: true, slots: CHAP_BENCHES.slice(0, 6).map(b => ({ ...b, y: 0.35 })), pose: 'sit' });
  }

  const day = isDay(phase, office);

  // ---- SCRIPTORIUM: ~30 monks by day until Vespers. BOOK #000403 ----
  if (day && p !== 'meal') {
    G.push({ id: 'scriptorium', kind: 'monk', zone: 'scriptorium', surface: 'straw', indoor: true, slots: SCRIPT.slice(0, 26), pose: 'write' });
    G.push({ id: 'malachi', named: 'malachi', kind: 'monk', zone: 'scriptorium', surface: 'straw', indoor: true, slots: [MALACHI], pose: 'write' });
  } else if (office?.id === 'vespers') {
    // Malachi and Berengar tidy at Vespers. BOOK #000456/#000526
    G.push({ id: 'malachi', named: 'malachi', kind: 'monk', zone: 'scriptorium', surface: 'straw', indoor: true, slots: [{ ...MALACHI, seat: false, x: MALACHI.x - 0.7 }], pose: 'stand' });   // beside his chair at the table, not in it
    G.push({ id: 'tidy', kind: 'monk', zone: 'scriptorium', surface: 'straw', indoor: true, slots: [{ ...MALACHI, x: MALACHI.x + 2.3, z: MALACHI.z + 2.8, seat: false }], pose: 'stand' });
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
    G.push({ id: 'kitchen', kind: 'servant', cast: ['lay_youth', 'lay_scullion', 'lay_old'], zone: 'kitchen', surface: 'stone', indoor: true, slots: ks, pose: 'knead' });
    G.push({ id: 'cook', kind: 'servant', cast: ['lay_cook', 'lay_baker'], zone: 'kitchen', surface: 'stone', indoor: true, slots: [{ ...KITCHEN.hearth }, { ...KITCHEN.oven }], pose: 'stir' });
  }

  // ---- FARMYARD (outdoors) ----
  // Lay work is cast by role, not dealt from a list: each of these men has
  // one job at a time, so the same face is never at the vat and the forge
  // at once, and the smith is the smith whenever the player returns.
  if (day) {
    // swineherds stirring the blood vat at None (BOOK #000375)
    // (1.2 from the jar's centre, clear of its belly, the paddle over its lip)
    G.push({ id: 'swineherds', kind: 'herd', cast: ['lay_swine', 'lay_herd'], zone: null, surface: 'snow', indoor: false, slots: [{ x: VAT.x - 1.2, z: VAT.z, ry: Math.PI / 2, ground: true }, { x: VAT.x + 1.2, z: VAT.z, ry: -Math.PI / 2, ground: true }], pose: 'stirVat' });
    // grooms/cowherds about the stables and threshing floor
    G.push({ id: 'grooms', kind: 'herd', cast: ['lay_groom', 'lay_stableboy'], zone: 'stables', surface: 'straw', indoor: true, slots: GROOMS, pose: 'stand', perSlot: true });
    G.push({ id: 'threshers', kind: 'servant', cast: ['lay_thresher', 'lay_carter'], zone: null, surface: 'straw', indoor: false, area: { x: THRESH.x, z: THRESH.z - 4, r: 5, n: 2 }, pose: 'sweep', hits: 'sweep' });
    // peasants carrying sacks of grain from the granaries to the mill along
    // the south lane (BOOK #001714), door to door (a route checked against
    // the built geometry, see docs/realism/PASS3_PEOPLE.md)
    G.push({ id: 'carriers', kind: 'peasant', cast: ['lay_miller', 'lay_porter'], zone: null, surface: 'snow', indoor: false, file: CARRY, pose: 'carry', carry: true, cap: 2 });
    // smiths until Vespers (BOOK #000513)
    if (!(office?.id === 'vespers')) G.push({ id: 'smiths', kind: 'servant', cast: ['lay_smith', 'lay_striker'], zone: 'smithy', surface: 'earth', indoor: true, slots: SMITHS, pose: 'hammer', hits: 'hot' });
    // Severinus / a novice in the herb garden (BOOK #000309)
    G.push({ id: 'gardener', named: 'severinus', kind: 'monk', zone: null, surface: 'snow', indoor: false, slots: [{ x: HERB.x, z: HERB.z, ry: 0, ground: true }], pose: 'tend' });
    void VEG;
  }

  // ---- VESPERS transition: animals to mangers, everyone walks to church ----
  // (handled by the choir at office; grooms already present.)

  // ---- PROCESSION after supper: hooded file to the north door. BOOK #000592 ----
  if (p === 'procession') {
    G.push({ id: 'procession', kind: 'monk', zone: null, surface: 'snow', indoor: false, file: PROCESSION, arrivals: PROCESSION_ARRIVALS, arrivalVia: [[42.22, -8.9]], arrivalRowZ: -8.9, pose: 'walk', cap: 10 });
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
