// The observation notebook: a few things seen in the abbey, remembered
// between visits. Not a quest log — no points, no count of what is left.
// Each note keeps its evidence internally (claim ids from
// book_details/output/claims.jsonl, and whether the book states it outright
// or it is our reading); the page shows only what was seen and, where the
// book itself supports it, a line of interpretation.
//
// Also kept here: the library rooms physically walked through (the
// labyrinth chart of the small map) and how far along the passage under the
// church the player has actually gone (the one route drawn on the plan).

export const KEY = 'abbey.notebook.v2';
const OLD_KEY = 'abbey.notebook.v1';
import { SHELF_EXAMPLE } from '../data/discovery.js';

export const NOTES = {
  'shelf-marks': {
    place: 'scriptorium', where: 'Malachi’s desk, the scriptorium', title: 'Numbers in the catalogue',
    seen: 'Each entry in the chained catalogue ends in a string of numbers and names: “iii, IV gradus, V in prima graecorum”.',
    reading: 'Adso works them out as a book’s place: its position on the shelf, the shelf, and the case.',
    evidence: [{ id: 'claim_000423', status: 'EXPLICIT' }],
    // added only once the shelves themselves have been seen, in the library
    more: { id: 'shelf-labels', where: 'the entrance heptagon', seen: `The catalogue’s worked example “${SHELF_EXAMPLE.text}” points to place ii on gradus III in cabinet I. You compared it with that physical shelf. This address is an illustrative reconstruction; the notation and matching labels are described in the novel.`, evidence: [{ id: 'claim_001153', status: 'EXPLICIT' }, { id: 'shelf-example-placement', status: 'RECONSTRUCTION' }] },
  },
  barred: {
    place: 'aedificium', where: 'the doors of the Aedificium', title: 'Barred after supper',
    seen: 'After the evening meal the doors of the Aedificium are barred from within.',
    reading: 'The Abbot says it plainly: after supper the Aedificium is locked.',
    evidence: [{ id: 'claim_000173', status: 'EXPLICIT' }],
    // the same door by day (the one observation that changes with the hour)
    more: { id: 'open-by-day', where: 'the same door, by day', seen: 'By day the same door stands open, and the kitchen and refectory are busy beyond it.', evidence: [{ id: 'claim_000173', status: 'EXPLICIT' }, { id: 'schedule:kitchen-by-day', status: 'RECONSTRUCTION' }] },
  },
  'herb-jars': {
    place: 'infirmary', where: 'Severinus’s laboratory', title: 'Herbs kept ready',
    seen: 'Rows of stoppered jars on the laboratory shelves, each holding a dried herb.',
    reading: 'Severinus gathers his herbs and keeps them ready in jars here.',
    evidence: [{ id: 'claim_000309', status: 'EXPLICIT' }, { id: 'claim_000303', status: 'EXPLICIT' }],
  },
  'blood-vat': {
    place: 'blood-jar', where: 'behind the choir, before the henhouses', title: 'Blood in the great jar',
    seen: 'Fresh pig’s blood in a great jar outside the pens, stirred so that it will not clot.',
    reading: 'It is the season of the pig slaughter; the swineherds keep the blood from setting.',
    evidence: [{ id: 'claim_000375', status: 'EXPLICIT' }, { id: 'claim_000664', status: 'EXPLICIT' }],
  },
  'altar-passage': {
    place: 'skull-chapel', where: 'the chapel of skulls', title: 'The way under the altar',
    seen: 'The altar turned on its pivot, and you went down the damp steps behind it into the dark.',
    reading: 'A passage runs from the church down among the bones — toward the Aedificium.',
    evidence: [{ id: 'claim_001047', status: 'EXPLICIT' }, { id: 'ROUTES.md: CHAPEL → CRYPT via ALTAR_OPENING + STAIRCASE', status: 'EXPLICIT' }],
  },
  'altar-feature': {
    place: 'skull-chapel', where: 'the chapel of skulls', title: 'Eyes in the stone',
    seen: 'A row of carved skulls stands above the shin bones. Their eye sockets are deeply recessed.',
    evidence: [{ id: 'claim_001047', status: 'EXPLICIT' }],
  },
  'alinardo-hint': {
    place: 'cloister', where: 'Alinardo, on the porch', title: 'Alinardo’s recollection',
    seen: 'Alinardo recalls a way beneath the church: press the eyes of the fourth skull from the right.',
    reading: 'The old monk’s instruction makes the carved altar worth returning to.',
    evidence: [{ id: 'claim_001026', status: 'EXPLICIT' }, { id: 'claim_001047', status: 'EXPLICIT' }],
  },
};

const fresh = () => ({ version: 2, notes: {}, rooms: [], route: -1 });
export function restoreNotebook(v) {
  const s = fresh();
  if (!v || typeof v !== 'object') return s;
  const allowed = new Set([...Object.keys(NOTES), ...Object.values(NOTES).map(n => n.more?.id).filter(Boolean), 'shelf-example-seen']);
  for (const [id, n] of Object.entries(v.notes && typeof v.notes === 'object' ? v.notes : {})) {
    if (!allowed.has(id) || !n || typeof n !== 'object') continue;
    // Earlier builds awarded this line just for entering any library room.
    // Keep the observations and chart, but earn the new comparison in situ.
    if (id === 'shelf-labels' && (v.version !== 2 || !v.notes['shelf-example-seen'])) continue;
    s.notes[id] = { at: Number.isFinite(n.at) ? n.at : 0, ...(typeof n.by === 'string' ? { by: n.by } : {}) };
  }
  s.rooms = Array.isArray(v.rooms) ? [...new Set(v.rooms.filter(x => typeof x === 'string'))].slice(0, 56) : [];
  s.route = Number.isInteger(v.route) ? Math.max(-1, Math.min(100, v.route)) : -1;
  return s;
}

export class Notebook {
  constructor(key = KEY) {
    this.key = key;
    this.s = fresh();
    try { this.s = restoreNotebook(JSON.parse(localStorage.getItem(key) || (key === KEY && localStorage.getItem(OLD_KEY)) || 'null')); } catch (e) { /* private window */ }
    this.rooms = new Set(this.s.rooms);
  }
  save() {
    this.s.rooms = [...this.rooms];
    try { localStorage.setItem(this.key, JSON.stringify(this.s)); } catch (e) { /* not persisted */ }
  }
  has(id) { return !!this.s.notes[id]; }
  // record a note (or the extra line of one); true if it is new
  add(id, extra = {}) {
    if (this.s.notes[id]) return false;
    this.s.notes[id] = { at: Date.now(), ...extra };
    this.save();
    return true;
  }
  // in the order they were noticed
  list() {
    const out = [];
    for (const [id, n] of Object.entries(NOTES)) {
      if (!this.s.notes[id]) continue;
      out.push({ id, ...n, at: this.s.notes[id].at, by: this.s.notes[id].by, moreSeen: n.more && this.s.notes[n.more.id] ? n.more : null });
    }
    return out.sort((a, b) => a.at - b.at);
  }
  addRoom(id) { if (!id || this.rooms.has(id)) return false; this.rooms.add(id); this.save(); return true; }
  // how far along the passage under the church (index into the route
  // points) the player has physically walked
  routeTo(i) { if (i <= this.s.route) return false; this.s.route = i; this.save(); return true; }
  get route() { return this.s.route; }
  clear() { this.s = fresh(); this.rooms = new Set(); this.save(); }
}
