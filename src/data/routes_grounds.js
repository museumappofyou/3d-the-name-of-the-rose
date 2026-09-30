// Routes across the grounds, the cloister ranges and the outbuildings (see routes.js).
// Waypoints [x, feetY, z] walked by the audit bot (?debug, __audit.routes()).
// On stairs the y of each waypoint tracks the ramp so the bot's height
// tolerance follows the climb (see the hospice and Abbot's stairs).
// The bot walks at 2.7 m/s and gives up after 40 s, so a book route longer
// than ~100 m is split into consecutive legs (R19a–c, R24a/b, R28a/b); each leg
// starts where the previous one ends.
//
// Claim ids for the major routes are in docs/provenance/arch-grounds.md.

export const ROUTES_GROUNDS = [
  // R2: gate → the great courtyard → the flower garden → the hospice door
  // (c0095, c0115 k1984 M, c0142, c0953 k0763 H threshold)
  { id: 'R2a gate→hospice door', pts: [
    [-96, -0.1, -8.6], [-80, -0.1, -6], [-55, -0.1, 2], [-36, -0.1, 5],
    [-28, -0.1, 6.6], [-21.8, -0.1, 6.6], [-19.3, 0.3, 6.6], [-17.3, 0.3, 6.6],  // in the ground door
  ] },
  // …and from the flower garden up the outside steps to William's cell
  // (c2312/c2313 k1635/k1636 M; c0142–c0144 k0760/k0761 H)
  { id: 'R2b flower garden→steps→cell', pts: [
    [-24, -0.2, 20], [-22, -0.2, 25.3], [-20.32, -0.2, 25.3], [-20.32, 0.0, 23.8],   // foot of the steps
    [-20.32, 3.0, 19.8], [-20.32, 6.2, 15.4], [-20.3, 6.2, 14.5],                     // up; the landing
    [-19.3, 6.2, 14.5], [-17.8, 6.2, 14.8], [-17.4, 6.2, 16.9],                       // into the cell
  ] },
  // R3: William's cell → down the steps → round the hospice → the cloister's west
  // door → the north walk → the church south door (c0247, c0634, c2321, k1553 M)
  { id: 'R3 cell→church', pts: [
    [-17.4, 6.2, 16.9], [-17.8, 6.2, 14.8], [-19.3, 6.2, 14.5], [-20.3, 6.2, 14.5],
    [-20.32, 6.1, 15.6], [-20.32, 3.0, 19.8], [-20.32, 0.0, 23.9], [-20.32, -0.2, 25.3],
    [-15.5, -0.2, 24.6], [-11.6, -0.2, 22], [-11.6, -0.2, 8.3],
    [-10.5, 0.3, 8.3], [-8.7, 0.3, 8.3], [-8.7, 0.3, 4.9],                            // cloister west door
    [26, 0.3, 4.9], [28.08, 0.3, 4.4], [28.08, 0.35, 2.5], [28.08, 0.35, 0.5],       // church south door
  ] },
  // R10/R12: the dormitory → the night passage → out beside the apse → round the
  // apse → the church north door, always open at night (c0886–c0891 k1972 M, k0667 H);
  // Berengar waits in the cemetery
  { id: 'R10 dormitory→apse→north door', pts: [
    [43.9, 0.3, 8], [43.33, 0.3, 5.2], [43.33, 0.3, 4.2], [44.3, 0.3, 3.2],          // out the north door
    [46.22, 0.3, 3.2], [48.2, -0.15, 2.4], [52.8, -0.15, 0], [54, -0.15, -5.5],       // east door, round the apse
    [53.2, -0.12, -10.8], [47, -0.12, -12.3], [42.22, -0.12, -12.4],
    [42.22, 0.35, -10.06], [42.22, 0.35, -8.2],                                       // in the north door
  ] },
  // R30: the monks retire to their cells: up the dormitory stair to a cell of the
  // upper corridor; and Jorge's cell off the lower corridor
  // (c1022, c1041/c1042 k1877 M, c0632 k1967 M; c0883–c0885 k0737/k0715/k0621 H)
  { id: 'R30a dormitory stair→upper cell', pts: [
    [43.9, 0.3, 12], [43.9, 0.3, 6.6], [49.2, 0.3, 6.5], [49.4, 0.6, 5.3],
    [47, 2.3, 5.16], [44.9, 4.3, 5.16], [43.8, 4.5, 5.2], [43.9, 4.5, 6.8],
    [43.9, 4.5, 15.2], [41.6, 4.5, 15.2],
  ] },
  { id: 'R30b corridor→Jorge’s cell', pts: [
    [43.9, 0.3, 12], [43.9, 0.3, 9.0], [41.6, 0.3, 9.0], [40, 0.3, 8.4],
  ] },
  // R11: the church south door → the cloister walk → through the parapet gap into
  // the garth, "on the inner side of the parapet between two columns"
  // (c0710/c0711, c0713/c0714 k0877/k0027 H, c1977–c2001 k1187 H)
  { id: 'R11 church→cloister', pts: [
    [28.08, 0.35, 0.5], [28.08, 0.35, 2.5], [28.08, 0.3, 4.9], [20, 0.3, 4.9],
    [10.6, 0.3, 4.9], [10.6, 0.3, 6.7], [10.6, -0.3, 8.6], [10.6, -0.3, 10.5],
  ] },
  // R19: the blood vat behind the choir → carry the body to the bath → the
  // laboratory (chunk_0025; c0698–c0703 k1618 M, k1637 M), in three legs
  { id: 'R19a vat→cemetery→garden', pts: [
    [56.5, -0.1, -14.5], [50, -0.1, -17], [36, -0.1, -23], [20, -0.1, -28],
    [5, -0.1, -33], [0.8, -0.1, -35.28], [-1.26, -0.1, -35.28], [-4, -0.1, -35.28],  // the garden's east gate
  ] },
  { id: 'R19b garden→bath', pts: [
    [-4, -0.1, -35.28], [-20, -0.1, -35.28], [-36, 0.0, -35.28], [-40, 0.0, -36],
    [-51.24, 0.1, -47.2], [-51.24, 0.25, -49.56], [-51.24, 0.25, -51.6],               // in the bath door
  ] },
  { id: 'R19c bath→laboratory', pts: [
    [-51.24, 0.25, -51.6], [-51.24, 0.25, -49.56], [-51.24, 0.1, -48.1], [-60, 0.05, -46.5],
    [-68.7, 0.0, -41.4], [-86.1, -0.1, -28.7], [-87.26, 0.25, -30.24], [-88.6, 0.25, -31.86], // the S18 door into the lab
  ] },
  // R20: infirmary ↔ bath (adjacent) (c1579 k0011 H, c2080, c2721)
  { id: 'R20 infirmary→bath', pts: [
    [-75.9, 0.25, -41.7], [-74.78, 0.25, -40.23], [-73.4, 0.0, -38.5], [-60, 0.05, -46.5],
    [-51.24, 0.1, -48.1], [-51.24, 0.25, -49.56], [-51.24, 0.25, -51.6],
  ] },
  // R21: leaving the infirmary → across the orchard → the chapter house
  // (c2190 k2007 M)
  { id: 'R21a infirmary→orchard', pts: [
    [-88.6, 0.25, -31.86], [-87.3, 0.25, -30.2], [-84, 0.0, -26], [-70, 0.0, -20], [-55, 0.0, -8],
  ] },
  { id: 'R21b orchard→chapter', pts: [
    [-55, 0.0, -8], [-45, 0.0, 4], [-40, 0.0, 18], [-30, -0.1, 26], [-18, -0.2, 30],
    [-14.3, 0.3, 31.1], [-11, 0.3, 31.1],                                    // in the chapter outer door
  ] },
  // R22: the chapter house — outer pointed door → the old-narthex courtyard →
  // the old portal → the hall, to the benches (chunk_0080/0084/0095; c2036–c2069 k0532 H)
  { id: 'R22 chapter narthex→hall', pts: [
    [-17, 0.3, 31.1], [-14.3, 0.3, 31.1], [-10, 0.3, 31.1],                  // outer door → narthex
    [-5.9, 0.3, 31.1], [-2, 0.3, 31.1], [1.6, 0.3, 31.1],                    // through the old portal into the hall
  ] },
  // R24: the refectory → the Abbot's house → up the stair → the upper hall
  // (c2503–c2514 k1855 M, k1856 M); round the east end of the church and the
  // dormitory, in two legs
  { id: 'R24a refectory→behind the dormitory', pts: [
    [55.4, 0.35, -52.96], [56.46, 0.35, -51.9], [59.3, 0.05, -49.1], [58, -0.05, -30],
    [56, -0.1, -16], [54.2, -0.15, -5], [53, -0.17, 5], [53, -0.2, 20],
  ] },
  { id: 'R24b dormitory→abbot hall', pts: [
    [53, -0.2, 20], [53, -0.25, 40], [50.5, -0.25, 47.2], [38, -0.25, 47.2], [31.3, -0.23, 43],
    [31.3, -0.23, 39.5], [31.32, 0.3, 36.96], [31.3, 0.3, 35.6],              // in the Abbot's south door
    [34.6, 0.3, 36.0], [35.66, 0.55, 36.1], [35.66, 2.1, 34.3], [35.66, 4.3, 31.7],
    [35.66, 6.45, 29.2], [35.4, 6.5, 28.05], [34.4, 6.5, 28.05], [33.3, 6.5, 28.05], [32, 6.5, 29.5], // up the stair, through the hall door
  ] },
  // R26: the stables → the kitchen, Salvatore's way, round the pigsty pen and over
  // the threshing floor to the south entrance (c1436, c0675 k0553 H)
  { id: 'R26 stables→kitchen', pts: [
    [93.6, 0.25, -36.12], [91.98, 0.25, -36.12], [89.6, -0.05, -36.1], [89.6, -0.05, -33.8],
    [84, -0.05, -33], [70, 0.0, -29], [62, 0.0, -44], [59.3, 0.05, -49.1],
    [56.46, 0.35, -51.9], [55.3, 0.35, -53.1],                               // in the SE south-entrance door
  ] },
  // R28: the kitchen garden door → through the vegetable garden → the orchard →
  // round the infirmary's end → the secret postern in the NW wall (the girl's
  // route; c1549–c1553 k0457 H, k1558/k1559 M), in two legs
  { id: 'R28a kitchen→vegetable garden', pts: [
    [28.6, 0.35, -52.96], [27.54, 0.35, -51.9], [25.8, 0.1, -50.1], [12, -0.1, -42],
    [0.8, -0.1, -35.28], [-1.26, -0.1, -35.28], [-10, -0.05, -35.28], [-36, 0.0, -35.28], [-44, 0.05, -33],
  ] },
  { id: 'R28b orchard→postern', pts: [
    [-44, 0.05, -33], [-62, 0.0, -29], [-80, -0.1, -25.5], [-93.4, -0.1, -24.0], [-97.35, -0.13, -26.8],
    [-96.1, -0.1, -34.8], [-87.7, -0.05, -41.2], [-78, 0.0, -48.06],
    [-79.22, 0.02, -49.82], [-80.6, 0.03, -51.8],                            // out the postern
  ] },
  // R29: the forge hall → down the stair between the forges → the cells beneath
  // the smithy (F7: c2017–c2021, c2248 k0931 H), and back up and out
  { id: 'R29a forge→cells beneath', pts: [
    [76.5, 0.3, 47.8], [76.5, 0.25, 51.6], [76.5, 0.25, 52.8], [76.5, -3.05, 59.4], [75.0, -3.05, 59.8],
  ] },
  { id: 'R29b cells→forge door', pts: [
    [75.0, -3.0, 59.8], [76.5, -3.05, 59.6], [76.5, 0.25, 52.4], [76.5, 0.25, 51.4], [76.5, 0.3, 47.8],
  ] },
];
