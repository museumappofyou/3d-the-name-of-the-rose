// Routes inside the Aedificium and the church (see routes.js).
// Waypoints [x, feetY, z] walked by the audit bot (?debug, __audit.routes()).
// On stairs the y of each waypoint tracks the ramp (spirals: helix()).
// Claim ids for the major routes are in shared/provenance/reconstruction-decisions.json.
// World frame: Aedificium centre (42, −66.36); S-tower spiral (42, −38.86),
// W-tower spiral (14.5, −66.36), E-tower spiral (67.7, −66.36).

// points along a newel stair: centre (cx, cz), walking radius r, from angle
// a0 at y0 through `turns` turns to y1 (angles as in kit.js spiral())
function helix(cx, cz, r, a0, turns, y0, y1, perTurn = 12) {
  const n = Math.max(2, Math.ceil(Math.abs(turns) * perTurn)), out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = a0 + turns * 2 * Math.PI * t;
    out.push([+(cx + r * Math.cos(a)).toFixed(2), +(y0 + (y1 - y0) * t).toFixed(2), +(cz + r * Math.sin(a)).toFixed(2)]);
  }
  return out;
}
const rev = pts => pts.slice().reverse();
const Y0 = 0.35, Y1 = 8.2, Y2 = 15.6;
// S and W tower hearth spirals (STAIR_WS: rIn 0.55, rOut 1.7, 2.25 turns)
const S_UP = helix(42, -38.86, 1.12, 0.35 + Math.PI / 2, 2.25, Y0, Y1);
const W_UP = helix(14.5, -66.36, 1.12, 0.35 + Math.PI, 2.25, Y0, Y1);
// E tower: ground → scriptorium (STAIR_E f1) and scriptorium → library (f2)
const E_UP1 = helix(67.7, -66.36, 0.87, Math.PI, 2.52, Y0, Y1);
const E_UP2 = helix(67.7, -66.36, 0.87, 0.0, 2.75, Y1, Y2);

// kitchen ↔ S-tower foot (east of the hearth, by the ossuary door)
const KITCHEN = [36, Y0, -60.4];
// round the hearth's east end, between the spiral and the ossuary stair house
const K_TO_S = [KITCHEN, [39, Y0, -50.4], [47.5, Y0, -45.4], [46.2, Y0, -40.9], [44.7, Y0, -38.0], [43.25, Y0, -38.5], [42.6, Y0, -37.9]];
const S_TOP_OUT = [[40.93, Y1, -39.2], [39.56, Y1, -39.77], [37.5, Y1, -46.5], [33, Y1, -56]];
// the refectory
const REFECTORY = [49.8, Y0, -74.2];   // between two rows of benches

export const ROUTES_AED = [
  // R4: the avenue → the west portal (north opening) → the nave → the left
  // (north) aisle to the Virgin on her column → the choir
  // (c0270 k1905 M, c0277, c0278–c0281 k2178 M, k0020 H; c0638 k1181)
  { id: 'R4 portal→nave→Virgin→choir', pts: [
    [-24, -0.16, -6.58], [-16.5, 0.33, -6.58], [-13.02, Y0, -6.58], [-10, Y0, -6.8], [-9, Y0, -10.9],
    [12, Y0, -11.0], [25.2, Y0, -11.0], [29.2, Y0, -7.6], [31.2, Y0, -4.0], [40.2, Y0, -4.0] ] },
  // R5: choir → out by the entry door (south opening) → the avenue
  // (c0294 k0466 H, c1286/c1289 k0689 H)
  { id: 'R5 choir→west portal→out', pts: [
    [40.2, Y0, -4.0], [31.2, Y0, -4.0], [29.2, Y0, -7.6], [25.2, Y0, -11.0], [-9, Y0, -11.0],
    [-10, Y0, -4.3], [-13.02, Y0, -4.34], [-16.5, 0.33, -4.34], [-24, -0.16, -4.34] ] },
  // R5b: the garden door → the kitchen → through the partition → the refectory
  // (c0330 k0502 H, c0343 k1735 M; c1095–c1097 k1273 H)
  { id: 'R5b kitchen door→kitchen→refectory', pts: [
    [25.4, 0, -49.8], [27.54, Y0, -51.9], [29.5, Y0, -53.9], [30.5, Y0, -58.5], KITCHEN, [31.5, Y0, -66.4], [33.6, Y0, -72.5],
    [35.8, Y0, -74.7], [42, Y0, -74.6], [47.3, Y0, -71.7], REFECTORY ] },
  // R6: refectory → the E-tower spiral → the scriptorium, "the only stair to
  // the library" rises here (c0391, k0741/k0555/k0556 H, k0511 H)
  { id: 'R6 refectory→E stair→scriptorium', pts: [
    REFECTORY, [47.3, Y0, -71.7], [57, Y0, -60.9], [63.8, Y0, -62.4], [64.5, Y0, -64.6], [65.4, Y0, -65.2], [66.9, Y0, -65.95], ...E_UP1,
    [68.5, Y1, -66.05], [70.1, Y1, -65.3], [69.4, Y1, -63.4], [64, Y1, -63.6], [55, Y1, -70] ] },
  // R7: scriptorium → the E-tower spiral → the library's entrance heptagon
  // (c1139–c1255, c1241/c1242 k1644 M, k0231 H)
  { id: 'R7 scriptorium→E stair→library', pts: [
    [55, Y1, -70], [64, Y1, -63.6], [69.4, Y1, -63.4], [70.1, Y1, -65.3], [68.5, Y1, -66.05], ...E_UP2,
    [67.7, Y2, -68.5], [69.4, Y2, -68.2] ] },
  // R8: kitchen → S-tower hearth spiral → scriptorium, and down the W-tower
  // spiral behind the oven (c1091–c1095 k1276 H, c0490, c1308; k2193 M)
  { id: 'R8 kitchen→S stair→scriptorium', pts: [...K_TO_S, ...S_UP, ...S_TOP_OUT] },
  { id: 'R8b scriptorium→W stair→kitchen', pts: [
    [33, Y1, -56], [20, Y1, -62], [15.48, Y1, -68.77], [14.82, Y1, -67.43], ...rev(W_UP), [13.4, Y0, -66.05], [12.0, Y0, -65.6], [12.3, Y0, -62.8], [16.0, Y0, -60.8], [21, Y0, -61], [26.5, Y0, -63.4], KITCHEN ] },
  // R9: refectory → the south entrance vestibule → the cemetery → the church
  // north door → the choir: the monks' daily procession
  // (c0335 k1621 M, c0337/c0338 k0467/k0468 H; c0592 k1623 M, c0611 k1914 M)
  { id: 'R9 refectory→south door→cemetery→north door→choir', pts: [
    REFECTORY, [47.3, Y0, -71.7], [54, Y0, -64.4], [57.1, Y0, -56.2], [55.4, Y0, -54.5], [56.46, Y0, -51.9], [58.6, 0.06, -49.8],
    [54.6, 0, -33.6], [46.2, 0, -21], [42.22, -0.13, -13.2], [42.22, Y0, -10.06], [42.2, Y0, -7.8],
    [42.05, Y0, -6.1], [39.6, Y0, -5.8], [38, Y0, -5.8] ] },   // round the east end of the north stalls (x 41.62, z −7.1…−7.45) into the choir
  // R13: the skull-chapel stair (under the turned altar) → the ossuary
  // corridor → steps up → the iron-clad door → the kitchen behind the hearth
  // (c1047–c1076 k1445 M, k1165 H, k1965 M, k2016 M, k0799 H; claim_002615/2617)
  // The altar must be turned first (main.js act()), so the walk starts on the
  // stair just below it.
  { id: 'R13 skull chapel→ossuary→kitchen', pts: [
    [15.37, -0.9, -16.4], [15.37, -2.8, -19.4], [17.6, -2.8, -22.2], [30, -2.8, -25.6], [44.6, -2.8, -27.8],
    [44.6, -2.8, -32.4], [44.6, -1.3, -34.5], [44.6, Y0, -36.4], [44.6, Y0, -37.3], [46.2, Y0, -40.9], [47.5, Y0, -45.4], [39, Y0, -50.4], KITCHEN ] },
  // R14: back again: kitchen → ossuary → the chapel stair (c1259–c1289 k0716, k0475, k0470 H)
  { id: 'R14 kitchen→ossuary→skull chapel', pts: [
    KITCHEN, [39, Y0, -50.4], [47.5, Y0, -45.4], [46.2, Y0, -40.9], [44.6, Y0, -37.3], [44.6, Y0, -36.4], [44.6, -1.3, -34.5],
    [44.6, -2.8, -32.4], [44.6, -2.8, -27.8], [30, -2.8, -25.6], [17.6, -2.8, -22.2], [15.37, -2.8, -19.4], [15.37, -0.9, -16.4] ] },
  // F12: the south aisle → the low door of the bell-tower stair → up the newel
  // stair to the belfry floor (c2806/c2807 k1954 M, k0609 H)
  { id: 'F12 bell-tower stair', pts: [[26.5, Y0, 0.3], [31.4, Y0, 0.28], [33.4, Y0, 0.28], ...helix(36.22, 0.28, 0.67, Math.PI, 8.25, Y0 + 0.05, 17.67, 14)] },
  // the treasury crypt: behind the high altar, a small stair down under the
  // choir (c2367–c2372 k1657 M, k1893 M, k1004 H)
  { id: 'Crypt choir→treasury', pts: [[44, Y0, -8.2], [49.8, Y0, -7.4], [49.8, 0.1, -5.7], [47.5, -2.2, -5.46], [45.5, -3.0, -5.46], [44.2, -3.0, -4.2]] },
  { id: 'Crypt treasury→choir', pts: [[44.2, -3.0, -4.2], [45.5, -3.0, -5.46], [47.5, -2.2, -5.46], [49.0, -0.8, -5.46], [50.1, 0.1, -5.5], [50.1, Y0, -7.0], [46, Y0, -8.0]] },
];
