// The library labyrinth on the top floor of the Aedificium.
//
// Third Day, Vespers fixes the counts: "fifty-six rooms, four of them
// heptagonal and fifty-two more or less square; eight have no windows,
// twenty-eight face the outside and sixteen the inside." Each tower has
// five four-walled rooms and one seven-walled room; each wall between two
// towers has two outward rooms; each side of the central octagon has two
// inward rooms; and in each tower two blind rooms lie beside the heptagon,
// opening on to rooms that face the octagon.
//
// Fourth Day, After Compline gives the words spelled by the rooms'
// initial letters. The assignment below satisfies FONS ADAE(U), LEONES,
// YSPANIA, HIBERNIA, ACAIA (four rooms in a square), ANGLIA, GERMANI,
// GALLIA, ROMA and AEGYPTUS exactly and IUDAEA as a circular reading. It
// keeps the finis Africae walled off behind the mirror in room S of the
// south tower, whose four passages lead to Y, P, E and U as in the book.
//
// Coordinates are local to the Aedificium centre, in the "east" frame
// (+x toward the tower), and are rotated into the four sectors.

import { AED } from './plan.js';

export const TOWERS = ['E', 'S', 'W', 'N'];
export const WALLS = ['SE', 'SW', 'NW', 'NE']; // wall k lies between tower k and k+1
const DEG = Math.PI / 180;

// rotate a local east-frame point by k quarter turns (E→S→W→N)
export const rot = ([x, z], k) => {
  k = ((k % 4) + 4) % 4;
  return [[x, z], [-z, x], [-x, -z], [z, -x]][k];
};
const polar = (r, a, c = [0, 0]) => [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
export const centroid = poly => {
  let a = 0, cx = 0, cz = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x0, z0] = poly[i], [x1, z1] = poly[(i + 1) % poly.length];
    const f = x0 * z1 - x1 * z0; a += f; cx += (x0 + x1) * f; cz += (z0 + z1) * f;
  }
  a *= 0.5; return [cx / (6 * a), cz / (6 * a)];
};
export const area = poly => {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x0, z0] = poly[i], [x1, z1] = poly[(i + 1) % poly.length]; a += x0 * z1 - x1 * z0;
  }
  return a / 2;
};

// ---------------------------------------------------------------------
// Key points of the east sector
// ---------------------------------------------------------------------
export function sectorPoints(a = AED) {
  const { dT, Rt, rh, a0, a1 } = a;
  const Tc = [dT, 0];
  const hep = r => Array.from({ length: 7 }, (_, k) => polar(r, Math.PI + k * 2 * Math.PI / 7, Tc));
  const t = hep(Rt), h = hep(rh);
  const oct = (ap, ang) => polar(ap / Math.cos(22.5 * DEG), ang * DEG);
  return {
    Tc, t, h,
    A0: [a0, 0], A1: [a1, 0],
    P0p: oct(a0, 22.5), P1p: oct(a1, 22.5), P0m: oct(a0, -22.5), P1m: oct(a1, -22.5),
    M0: polar(a0, 45 * DEG), M1: polar(a1, 45 * DEG),
  };
}

// ---------------------------------------------------------------------
// Room polygons (counter-clockwise when seen from above with +z down)
// ---------------------------------------------------------------------
export function buildRooms(a = AED) {
  const s = sectorPoints(a);
  const { t, h, A0, A1, P0p, P1p, P0m, P1m, M0, M1 } = s;
  // the long wall runs from t6 (east tower) to the south tower's t1;
  // its midpoint lies on the 45° diagonal at distance W/√2
  const Mw = polar(a.W / Math.SQRT2, 45 * DEG);
  const P0q = polar(a.a0 / Math.cos(22.5 * DEG), 67.5 * DEG);
  const P1q = polar(a.a1 / Math.cos(22.5 * DEG), 67.5 * DEG);
  const tS1 = rot(t[1], 1); // south tower's first outer vertex, on the same wall

  const local = {
    hall: { kind: 'hall', poly: h.slice() },
    T1: { kind: 'tower', poly: [h[1], t[1], t[2], h[2]], window: [t[1], t[2]] },
    T2: { kind: 'tower', poly: [h[2], t[2], t[3], h[3]], window: [t[2], t[3]] },
    T3: { kind: 'tower', poly: [h[3], t[3], t[4], h[4]], window: [t[3], t[4]] },
    T4: { kind: 'tower', poly: [h[4], t[4], t[5], h[5]], window: [t[4], t[5]] },
    T5: { kind: 'tower', poly: [h[5], t[5], t[6], h[6]], window: [t[5], t[6]] },
    Bp: { kind: 'blind', poly: [A1, P1p, t[6], h[6], h[0]] },
    Bm: { kind: 'blind', poly: [A1, h[0], h[1], t[1], P1m] },
    Ip: { kind: 'inner', poly: [A0, P0p, P1p, A1], window: [A0, P0p] },
    Im: { kind: 'inner', poly: [A0, A1, P1m, P0m], window: [P0m, A0] },
  };
  const wall = {
    Ja: { kind: 'inner', poly: [P0p, M0, M1, P1p], window: [P0p, M0] },
    Jb: { kind: 'inner', poly: [M0, P0q, P1q, M1], window: [M0, P0q] },
    Xa: { kind: 'outer', poly: [P1p, M1, Mw, t[6]], window: [Mw, t[6]] },
    Xb: { kind: 'outer', poly: [M1, P1q, tS1, Mw], window: [tS1, Mw] },
  };
  const rooms = [];
  TOWERS.forEach((sec, k) => {
    for (const [name, r] of Object.entries(local)) {
      rooms.push({ id: `${sec}.${name}`, sector: sec, name, kind: r.kind, k,
        poly: r.poly.map(p => rot(p, k)), window: r.window ? r.window.map(p => rot(p, k)) : null });
    }
  });
  WALLS.forEach((sec, k) => {
    for (const [name, r] of Object.entries(wall)) {
      rooms.push({ id: `${sec}.${name}`, sector: sec, name, kind: r.kind, k,
        poly: r.poly.map(p => rot(p, k)), window: r.window ? r.window.map(p => rot(p, k)) : null });
    }
  });
  rooms.forEach((r, i) => { r.index = i; r.center = centroid(r.poly); });
  return rooms;
}

// ---------------------------------------------------------------------
// Letters, verses and doors
// ---------------------------------------------------------------------
export const LETTERS = {
  'E.hall': 'A', 'E.T1': 'F', 'E.T2': 'O', 'E.T3': null, 'E.T4': 'N', 'E.T5': 'S',
  'E.Bm': 'U', 'E.Bp': 'D', 'E.Im': 'I', 'E.Ip': 'A',
  'SE.Ja': 'E', 'SE.Xa': 'G', 'SE.Xb': 'Y', 'SE.Jb': 'P',
  'S.hall': 'A', 'S.T1': 'L', 'S.T2': 'E', 'S.T3': 'O', 'S.T4': 'N', 'S.T5': 'E',
  'S.Bm': 'U', 'S.Bp': 'S', 'S.Im': 'T', 'S.Ip': 'Y',
  'SW.Ja': 'R', 'SW.Jb': 'O', 'SW.Xa': 'P', 'SW.Xb': 'A',
  'W.hall': 'A', 'W.T1': 'R', 'W.T2': 'E', 'W.T3': 'B', 'W.T4': 'I', 'W.T5': 'H',
  'W.Bm': 'N', 'W.Bp': 'I', 'W.Im': 'M', 'W.Ip': 'A',
  'NW.Ja': 'L', 'NW.Jb': 'A', 'NW.Xa': 'L', 'NW.Xb': 'G',
  'N.hall': 'A', 'N.T1': 'N', 'N.T2': 'G', 'N.T3': 'L', 'N.T4': 'I', 'N.T5': 'N',
  'N.Bm': 'E', 'N.Bp': 'A', 'N.Im': 'R', 'N.Ip': 'M',
  'NE.Ja': 'I', 'NE.Jb': 'A', 'NE.Xa': 'A', 'NE.Xb': 'C',
};
// the first letter of each word is painted red
export const RED = new Set(['E.T1', 'E.Ip', 'E.Im', 'S.T1', 'S.Ip', 'SW.Ja', 'W.T5', 'NW.Xb', 'N.hall', 'NE.Jb']);

export const WORDS = [
  { word: 'FONS ADAE', rooms: ['E.T1', 'E.T2', 'E.T3', 'E.T4', 'E.T5', 'E.hall', 'E.Bp', 'E.Ip', 'SE.Ja'], region: 'The Earthly Paradise — Bibles and their commentaries' },
  { word: 'IUDAEA', rooms: ['E.Im', 'E.Bm', 'E.Bp', 'E.Ip', 'SE.Ja', 'E.Ip'], region: 'Judaea' },
  { word: 'AEGYPTUS', rooms: ['E.Ip', 'SE.Ja', 'SE.Xa', 'SE.Xb', 'SE.Jb', 'S.Im', 'S.Bm', 'S.Bp'], region: 'Egypt' },
  { word: 'LEONES', rooms: ['S.T1', 'S.T2', 'S.T3', 'S.T4', 'S.T5', 'S.Bp'], region: 'Africa — "hic sunt leones": the infidels, bestiaries, the African poets' },
  { word: 'YSPANIA', rooms: ['S.Ip', 'S.Bp', 'SW.Xa', 'SW.Xb', 'W.Bm', 'W.Bp', 'W.hall'], region: 'Spain — Apocalypses and the Beatus commentaries' },
  { word: 'ROMA', rooms: ['SW.Ja', 'SW.Jb', 'W.Im', 'W.Ip'], region: 'Rome — the paradise of the Latin classics' },
  { word: 'HIBERNIA', rooms: ['W.T5', 'W.T4', 'W.T3', 'W.T2', 'W.T1', 'W.Bm', 'W.Bp', 'W.hall'], region: 'Ireland — Bede, the grammarians, Irish gospel books' },
  { word: 'GALLIA', rooms: ['NW.Xb', 'NW.Jb', 'NW.Ja', 'NW.Xa', 'W.Bp', 'W.hall'], region: 'Gaul' },
  { word: 'GERMANI', rooms: ['NW.Xb', 'N.Bm', 'N.Im', 'N.Ip', 'N.Bp', 'N.T5', 'N.T4'], region: 'Germany' },
  { word: 'ANGLIA', rooms: ['N.hall', 'N.T1', 'N.T2', 'N.T3', 'N.T4', 'N.hall'], region: 'England' },
  { word: 'ACAIA', rooms: ['NE.Jb', 'NE.Xb', 'NE.Xa', 'NE.Ja', 'NE.Jb'], region: 'Achaea — pagan poets and philosophers' },
];

const DOORS = [
  // east tower (entrance): four openings in the heptagon
  ['E.hall', 'E.T5'], ['E.hall', 'E.T3'], ['E.hall', 'E.Bp'], ['E.hall', 'E.Bm'],
  ['E.T5', 'E.T4'], ['E.T4', 'E.T3'], ['E.T3', 'E.T2'], ['E.T2', 'E.T1'],
  ['E.Bp', 'E.Ip'], ['E.Bm', 'E.Bp'], ['E.Bm', 'E.Im'], ['E.Ip', 'SE.Ja'], ['E.Im', 'NE.Jb'],
  // toward the south: AEGYPTUS zig-zags between the two rows
  ['SE.Ja', 'SE.Xa'], ['SE.Xa', 'SE.Xb'], ['SE.Xb', 'SE.Jb'], ['SE.Jb', 'S.Im'],
  // south tower: U opens only on T and S; S opens on Y, P, E and U
  ['S.Im', 'S.Bm'], ['S.Bm', 'S.Bp'], ['S.Bp', 'S.Ip'], ['S.Bp', 'SW.Xa'], ['S.Bp', 'S.T5'],
  ['S.T5', 'S.T4'], ['S.T4', 'S.T3'], ['S.T3', 'S.T2'], ['S.T2', 'S.T1'],
  ['S.Ip', 'SW.Ja'],
  // YSPANIA and ROMA
  ['SW.Xa', 'SW.Xb'], ['SW.Xb', 'W.Bm'], ['SW.Ja', 'SW.Jb'], ['SW.Jb', 'W.Im'],
  // west tower: the heptagon opens only on H and the blind room I
  ['W.Bm', 'W.Bp'], ['W.Bp', 'W.hall'], ['W.hall', 'W.T5'],
  ['W.T5', 'W.T4'], ['W.T4', 'W.T3'], ['W.T3', 'W.T2'], ['W.T2', 'W.T1'], ['W.T1', 'W.Bm'],
  ['W.Im', 'W.Ip'],
  // GALLIA along the north-west wall
  ['W.Bp', 'NW.Xa'], ['NW.Xa', 'NW.Ja'], ['NW.Ja', 'NW.Jb'], ['NW.Jb', 'NW.Xb'], ['NW.Xb', 'N.Bm'],
  // north tower: GERMANI and ANGLIA
  ['N.Bm', 'N.Im'], ['N.Im', 'N.Ip'], ['N.Ip', 'N.Bp'], ['N.Bp', 'N.T5'], ['N.T5', 'N.T4'],
  ['N.hall', 'N.T1'], ['N.T1', 'N.T2'], ['N.T2', 'N.T3'], ['N.T3', 'N.T4'], ['N.T4', 'N.hall'],
  // ACAIA, a dead-end square entered from the east
  ['NE.Jb', 'NE.Xb'], ['NE.Xb', 'NE.Xa'], ['NE.Xa', 'NE.Ja'], ['NE.Ja', 'NE.Jb'],
];
export const MIRROR = ['S.Bp', 'S.hall'];

// Apocalypse verses; only their initials matter (Third Day, Vespers)
export const VERSES = {
  A: ['Apocalypsis Iesu Christi', 'Agnus occisus est', 'Angelus fortis', 'Alpha et omega'],
  B: ['Babylon magna'], C: ['Cecidit de coelo stella magna'],
  D: ['Draco magnus rufus'], E: ['Equus albus', 'Ecce venio cito', 'Et vidi'],
  F: ['Facta est grando et ignis'], G: ['Gratia vobis et pax', 'Gog et Magog'],
  H: ['Hic sapientia est'], I: ['In diebus illis', 'Ite et effundite'],
  L: ['Lucerna eius est agnus'], M: ['Mulier amicta sole', 'Mare vitreum'],
  N: ['Nomen illi mors', 'Nolite nocere terrae'], O: ['Obscuratus est sol et aer', 'Omnis insula fugit'],
  P: ['Primogenitus mortuorum', 'Poenitentiam age'], R: ['Requiescant a laboribus suis', 'Rex regum'],
  S: ['Super thronos viginti quatuor', 'Stella de coelo cecidit'],
  T: ['Tertia pars terrae combusta est'], U: ['Unus de quatuor animalibus'],
  Y: ['Ymago bestiae'],
};
const FIXED_VERSE = {
  'E.hall': 'Apocalypsis Iesu Christi', 'E.T5': 'Super thronos viginti quatuor', 'E.T4': 'Nomen illi mors',
  'E.T2': 'Obscuratus est sol et aer', 'E.T1': 'Facta est grando et ignis', 'S.Bp': 'Super thronos viginti quatuor',
  'SW.Xb': 'Apocalypsis Iesu Christi',
};

// What the rooms hold, from the chapters where Adso reads the shelves
export const HOLDINGS = {
  'E.T3': 'No books and no scroll: a stone altar stands beneath the window, lit by the sun at dawn.',
  'S.Bp': 'Arabic books; al-Khwarizmi’s Tabulae, Isa ibn Ali’s De oculis, al-Kindi’s De radiis stellatis. On the table, De bestiis and the Liber monstrorum.',
  'S.T1': 'The “African poets”: Florus, Fronto, Apuleius, Martianus Capella, Fulgentius.',
  'S.T3': 'Avicenna’s Canon, a Qur’an, bestiaries with the unicorn.',
  'S.T4': 'Alhazen’s De aspectibus and Arabic optics full of strange drawings.',
  'SW.Xb': 'A vast collection of Apocalypses and the Beatus of Liébana commentaries. A smouldering censer of herbs stands on the table.',
  'S.Ip': 'Room Y of YSPANIA, where Jorge overturns the lamp on the last night.',
  'W.T5': 'Bede: Historia anglorum, De temporibus, Vita S. Cuthberti.',
  'W.T3': 'The grammarians: Priscian, Donatus, Victorinus, Phocas, Asper.',
  'W.T2': 'Hisperica famina, Aldhelm, Virgil of Toulouse — Irish books “with little blue and much green”.',
  'NE.Jb': 'Pagan poets and philosophers of antiquity.',
  'SE.Xb': 'Mathematics and astronomy.',
  'SE.Jb': 'Manuscripts in unknown letters, perhaps from India.',
};

export function createLibrary(a = AED) {
  const rooms = buildRooms(a);
  const byId = new Map(rooms.map(r => [r.id, r]));
  const key = p => p.map(v => (Math.round(v * 1000) / 1000).toFixed(3)).join(',');
  const edgeKey = (p, q) => [key(p), key(q)].sort().join('|');
  const edges = new Map();
  for (const r of rooms) {
    for (let i = 0; i < r.poly.length; i++) {
      const p = r.poly[i], q = r.poly[(i + 1) % r.poly.length];
      const k = edgeKey(p, q);
      if (!edges.has(k)) edges.set(k, { key: k, a: p, b: q, rooms: [] });
      edges.get(k).rooms.push(r.id);
    }
  }
  const pair = (x, y) => [...edges.values()].find(e => e.rooms.includes(x) && e.rooms.includes(y));
  const doors = new Set();
  for (const [x, y] of DOORS) {
    const e = pair(x, y);
    if (!e) throw new Error(`Rooms ${x} and ${y} do not share a wall`);
    e.door = true; doors.add(e.key);
  }
  const mirror = pair(...MIRROR);
  mirror.mirror = true;
  // letters, verses
  const count = {};
  for (const r of rooms) {
    r.letter = LETTERS[r.id];
    r.red = RED.has(r.id);
    if (r.letter) {
      const list = VERSES[r.letter];
      count[r.letter] = (count[r.letter] || 0) + 1;
      r.verse = FIXED_VERSE[r.id] || list[(count[r.letter] - 1) % list.length];
    } else r.verse = null;
    r.holdings = HOLDINGS[r.id] || null;
    r.words = WORDS.filter(w => w.rooms.includes(r.id)).map(w => w.word);
  }
  const neighbors = new Map(rooms.map(r => [r.id, []]));
  for (const e of edges.values()) if (e.rooms.length === 2 && (e.door || e.mirror)) {
    const [x, y] = e.rooms;
    neighbors.get(x).push({ id: y, edge: e }); neighbors.get(y).push({ id: x, edge: e });
  }
  return { rooms, byId, edges: [...edges.values()], doors, mirror, neighbors, entry: 'E.hall', secret: 'S.hall' };
}

export function pointInPoly([x, z], poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
