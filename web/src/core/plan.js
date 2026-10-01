// Every position below is traced from the abbey plan printed in the novel
// (assets/plan.png, 628×481 px). One plan pixel is taken as 0.42 m, which
// makes the church ≈64 m long and the Aedificium ≈63 m tower-to-tower.
// World axes: +x east, +z south (north is −z), +y up.

export const PX = 0.42;
export const ORIGIN = [330, 290];
export const P = (px, py) => [(px - ORIGIN[0]) * PX, (py - ORIGIN[1]) * PX];
export const toPlan = (x, z) => [x / PX + ORIGIN[0], z / PX + ORIGIN[1]];

/* ------------------------------------------------------------------ */
/*  Aedificium                                                         */
/* ------------------------------------------------------------------ */
// "An octagon that from afar looked like a tetragon… at each corner a
// heptagonal tower, five sides of which were visible from outside." The
// towers sit on the cardinal axes, exactly as on the plan.
const [aedX, aedZ] = P(430, 132);
export const AED = {
  x: aedX, z: aedZ,
  dT: 27.5,          // centre → tower centre
  Rt: 9.0,           // tower circumradius (outer face of wall)
  rh: 4.4,           // library heptagonal hall circumradius
  a0: 6.6,           // apothem of the central octagonal well (wall centreline)
  a1: 13.0,          // apothem of the inner ring of rooms
  wallOut: 1.5,      // outer wall thickness
  wallWell: 0.9,
  wallIn: 0.5,
  // floor levels (top of floor)
  y0: 0.35, y1: 8.2, y2: 15.6,
  h0: 7.2, h1: 6.6, h2: 4.9,   // clear storey heights (to vault crown)
  eave: 21.3, ridge: 25.2, towerTop: 24.6, towerPeak: 30.8,
  cliffDepth: -115,
  // the ossuary descent in the S tower lies east of the hearth spiral, so its
  // iron-clad door opens into the kitchen "behind the hearth, at the foot of
  // the spiral" (claim_002615/2617 k1270 H, k1323 H); S-tower frame x offset
  ossX: 2.6,
};
// Long walls pass exactly through the tower vertices adjacent to the body.
AED.W = AED.dT + (0.7818 - 0.6235) * AED.Rt;   // body half-diagonal

/* ------------------------------------------------------------------ */
/*  Enclosure                                                          */
/* ------------------------------------------------------------------ */
// The wall follows the plan. Between the west and east towers the
// Aedificium itself closes the circuit above the cliff.
export const WALL_WEST = [ // from the gate northwards to the Aedificium west tower
  [80, 262], [97, 202], [168, 153], [357, 140],
].map(p => P(...p));
export const WALL_EAST = [ // from the Aedificium east tower round to the gate
  [516, 142], [557, 151], [597, 382], [554, 448], [184, 452], [124, 431], [80, 277],
].map(p => P(...p));
export const GATE = { a: P(80, 262), b: P(80, 277), center: P(80, 269.5) };
// F5: a narrow disguised wicket in the NW wall behind the orchard — secret,
// not a second gate (con_001535, con_000947, con_001691, con_001559; the
// conflict with con_000756 "only opening" is resolved as a hidden postern).
// Placed on WALL_WEST segment 1, toward the orchard.
export const POSTERN = { seg: 1, t: 0.625, w: 1.0, h: 1.95 };
// the lower parapet stretch "behind the stables"
export const LOW_WALL = { from: 1, to: 2, t0: 0.08, t1: 0.52 };

/* ------------------------------------------------------------------ */
/*  Church (B)                                                         */
/* ------------------------------------------------------------------ */
// West front at plan x≈300, apse at x≈450; aisled nave with a north
// transept arm. "Its main door opened due west, so the choir and altar
// faced east."
export const CHURCH = {
  x0: P(299, 0)[0], xCross: P(403, 0)[0], xChoir: P(421, 0)[0], xApse: P(441, 0)[0],
  zN: P(0, 258)[1], zS: P(0, 296)[1],
  get zc() { return (this.zN + this.zS) / 2; },
  nave: 7.4,          // central vessel width between column centres
  aisleH: 8.6, naveH: 15.2, crossH: 17.5,
  spireTop: 44,
  // F2 (con_000970 H, con_001351 H, con_001732/1733 M; con_000646 H "often
  // wider than tall"): the heights above are the design section; church.js
  // builds the whole elevation ×vScale about the floor, so the Aedificium
  // rises "like a crown" over it from the hospice and the Abbot's hall.
  // As built: aisle wall 7.0, nave eave 12.2, nave ridge 15.7, crossing tower
  // top 21.3, spire tip 35.3 m.
  vScale: 0.8,
  transeptN: P(0, 244)[1],
};

/* ------------------------------------------------------------------ */
/*  Cloister ranges                                                    */
/* ------------------------------------------------------------------ */
export const CLOISTER = { x0: P(305, 0)[0], x1: P(402, 0)[0], z0: P(0, 299)[1], z1: P(0, 350)[1], walk: 3.6 };
export const DORMITORY = { x0: P(419, 0)[0], x1: P(450, 0)[0], z0: P(0, 300)[1], z1: P(0, 391)[1] };
export const CHAPTER = { x0: P(296, 0)[0], x1: P(373, 0)[0], z0: P(0, 351)[1], z1: P(0, 377)[1], narthex: P(316, 0)[0] };
export const ABBOT = { x0: P(376, 0)[0], x1: P(418, 0)[0], z0: P(0, 353)[1], z1: P(0, 378)[1] };
export const HOSPICE = { x0: P(284, 0)[0], x1: P(299, 0)[0], z0: P(0, 300)[1], z1: P(0, 346)[1] };
export const FLOWER_GARDEN = { x0: P(243, 0)[0], x1: P(282, 0)[0], z0: P(0, 298)[1], z1: P(0, 346)[1] };
export const LATRINE = { x0: P(420, 0)[0], x1: P(447, 0)[0], z0: P(0, 380)[1], z1: P(0, 394)[1] };

/* ------------------------------------------------------------------ */
/*  West: infirmary, baths, gardens                                    */
/* ------------------------------------------------------------------ */
export const INFIRMARY = { a: P(101, 224), b: P(176, 164), width: 7.2 };
export const BATHS = { x0: P(190, 0)[0], x1: P(226, 0)[0], z0: P(0, 155)[1], z1: P(0, 172)[1] };
export const HERB_GARDEN = { x0: P(189, 0)[0], x1: P(238, 0)[0], z0: P(0, 176)[1], z1: P(0, 236)[1] };
export const VEG_GARDEN = { x0: P(242, 0)[0], x1: P(327, 0)[0], z0: P(0, 150)[1], z1: P(0, 232)[1] };
export const ORCHARD = { poly: [P(108, 232), P(186, 180), P(196, 250), P(116, 258)] };
export const CEMETERY = { poly: [P(332, 250), P(360, 222), P(410, 205), P(455, 190), P(462, 240), P(452, 256)] };
export const GATEHOUSE = { x0: P(88, 0)[0], x1: P(122, 0)[0], z0: P(0, 281)[1], z1: P(0, 300)[1] };

/* ------------------------------------------------------------------ */
/*  East: farmyard                                                     */
/* ------------------------------------------------------------------ */
export const FOLDS = { x0: P(528, 0)[0], x1: P(561, 0)[0], z0: P(0, 157)[1], z1: P(0, 184)[1] };   // M
export const STABLES = { x0: P(549, 0)[0], x1: P(571, 0)[0], z0: P(0, 186)[1], z1: P(0, 276)[1] }; // N
export const STABLE_YARD = { x0: P(529, 0)[0], x1: P(549, 0)[0], z0: P(0, 234)[1], z1: P(0, 276)[1] };
export const GRANARY = { x0: P(528, 0)[0], x1: P(573, 0)[0], z0: P(0, 285)[1], z1: P(0, 310)[1] };
export const OXSHED = { x0: P(528, 0)[0], x1: P(573, 0)[0], z0: P(0, 320)[1], z1: P(0, 351)[1] };
// F9: the threshing floor lies straight out of the kitchen-yard door, in the
// open ground between the Aedificium, the granary and the stables
// (c0364–c0366 k0490 H, k2155 M, k1342 H)
export const THRESHING = { x0: P(499, 0)[0], x1: P(523, 0)[0], z0: P(0, 190)[1], z1: P(0, 214)[1] };
export const HENHOUSE = { x0: P(485, 0)[0], x1: P(510, 0)[0], z0: P(0, 244)[1], z1: P(0, 306)[1] };
export const BLOOD_JAR = P(470, 262);

/* ------------------------------------------------------------------ */
/*  South range                                                        */
/* ------------------------------------------------------------------ */
export const SOUTH_RANGE = [
  { id: 'novices', x0: P(136, 0)[0], x1: P(182, 0)[0], z0: P(0, 398)[1], z1: P(0, 436)[1], rot: -0.42 },
  { id: 'lodgings', x0: P(190, 0)[0], x1: P(235, 0)[0], z0: P(0, 402)[1], z1: P(0, 441)[1] },
  { id: 'cellars', x0: P(240, 0)[0], x1: P(272, 0)[0], z0: P(0, 402)[1], z1: P(0, 441)[1] },
  { id: 'granaries', x0: P(285, 0)[0], x1: P(337, 0)[0], z0: P(0, 409)[1], z1: P(0, 441)[1] },
  { id: 'mill', x0: P(349, 0)[0], x1: P(401, 0)[0], z0: P(0, 409)[1], z1: P(0, 441)[1] },
  { id: 'press', x0: P(405, 0)[0], x1: P(441, 0)[0], z0: P(0, 409)[1], z1: P(0, 441)[1] },
  { id: 'smithy', x0: P(497, 0)[0], x1: P(556, 0)[0], z0: P(0, 410)[1], z1: P(0, 441)[1] },
];

/* ------------------------------------------------------------------ */
/*  Paths trodden through the snow                                     */
/* ------------------------------------------------------------------ */
export const PATHS = [
  // the avenue from the gate to the church
  { w: 5.2, pts: [P(70, 269.5), P(299, 272)] },
  // F6: procession from the church north door across the cemetery, round behind
  // the choir, to the Aedificium SE south-entrance door (c0592 k1623 M, k0014 H)
  { w: 2.6, pts: [P(430, 266), P(440, 240), P(460, 210), P(470, 172)] },
  // round behind the apse to the same south entrance (c0335 k1621 M)
  { w: 2.2, pts: [P(455, 276), P(470, 230), P(470, 174)] },
  // west branch to the Aedificium SW garden door (c0330 k0502 H)
  { w: 2.4, pts: [P(299, 256), P(345, 220), P(388, 190), P(390, 172)] },
  // kitchen door to the gardens
  { w: 2.2, pts: [P(392, 179), P(340, 200), P(262, 206), P(232, 206)] },
  { w: 2.0, pts: [P(262, 206), P(262, 160)] },
  // to the baths and infirmary
  { w: 2.2, pts: [P(232, 206), P(205, 190), P(180, 196)] },
  { w: 2.0, pts: [P(205, 190), P(207, 173)] },
  // behind the choir to the farmyard
  { w: 3.0, pts: [P(455, 276), P(480, 262), P(520, 240), P(548, 222)] },
  { w: 2.6, pts: [P(470, 262), P(470, 180), P(500, 150)] },
  { w: 2.6, pts: [P(455, 290), P(520, 297), P(528, 297)] },
  // east yard lane
  { w: 3.2, pts: [P(520, 160), P(520, 400), P(505, 420)] },
  // south lane along the workshops
  { w: 3.4, pts: [P(150, 392), P(300, 396), P(470, 398), P(520, 400)] },
  { w: 2.4, pts: [P(299, 282), P(300, 350), P(300, 392)] },
  { w: 2.4, pts: [P(440, 380), P(440, 398)] },
  { w: 2.4, pts: [P(270, 300), P(270, 352), P(292, 352)] },
  { w: 2.4, pts: [P(120, 290), P(135, 392)] },
  // the girl's track: kitchen garden → orchard → round the infirmary's west end
  // → along its blind back to the postern in the NW wall (R28; k0457 H, k1559 M)
  { w: 1.4, pts: [P(262, 206), P(200, 218), P(140, 229), P(108, 233), P(98, 226), P(101, 207), P(121, 192), P(144, 176), P(141, 171)] },
];
