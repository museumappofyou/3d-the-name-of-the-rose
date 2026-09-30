import test from 'node:test';
import assert from 'node:assert/strict';
import { createLibrary, area, WORDS } from '../src/core/library.js';

const L = createLibrary();
const kinds = k => L.rooms.filter(r => r.kind === k).length;

test('the counts of Third Day, Vespers', () => {
  assert.equal(L.rooms.length, 56);
  assert.equal(kinds('hall'), 4);
  assert.equal(kinds('blind'), 8);
  assert.equal(kinds('tower') + kinds('outer'), 28);
  assert.equal(kinds('inner'), 16);
  for (const r of L.rooms.filter(r => r.kind === 'hall')) assert.equal(r.poly.length, 7);
  for (const r of L.rooms.filter(r => r.kind !== 'hall')) assert(r.poly.length >= 4);
  // 28 outside windows + 16 on the octagon
  assert.equal(L.rooms.filter(r => r.window).length, 44);
});

test('rooms tile the floor without degenerate polygons', () => {
  for (const r of L.rooms) assert(Math.abs(area(r.poly)) > 6, `${r.id} area ${area(r.poly)}`);
  // every interior edge is shared by exactly two rooms
  const shared = L.edges.filter(e => e.rooms.length === 2).length;
  const single = L.edges.filter(e => e.rooms.length === 1).length;
  assert(shared > 80, `shared ${shared}`);
  assert(single > 40);
  for (const e of L.edges) assert(e.rooms.length <= 2);
});

test('every room is reachable from the east tower except the finis Africae', () => {
  const seen = new Set([L.entry]), stack = [L.entry];
  while (stack.length) for (const n of L.neighbors.get(stack.pop())) {
    if (n.edge.mirror) continue;
    if (!seen.has(n.id)) { seen.add(n.id); stack.push(n.id); }
  }
  assert.equal(seen.size, 55);
  assert(!seen.has(L.secret));
  const into = L.edges.filter(e => e.rooms.includes(L.secret) && (e.door || e.mirror));
  assert.equal(into.length, 1);
  assert(into[0].mirror);
});

test('room S has passages to Y, P, E and U, and U only to T and S', () => {
  const nb = id => L.neighbors.get(id).filter(n => !n.edge.mirror).map(n => L.byId.get(n.id).letter).sort().join('');
  assert.equal(nb('S.Bp'), 'EPUY');
  assert.equal(nb('S.Bm'), 'ST');
  assert.equal(L.neighbors.get('E.hall').length, 4); // four of seven walls open
  assert.equal(L.neighbors.get('E.T1').length, 1);   // Facta est grando: dead end
  assert.equal(L.neighbors.get('S.T1').length, 1);   // red L: dead end
});

test('each word is spelled by a chain of adjacent rooms', () => {
  const adjacent = (x, y) => L.edges.some(e => e.rooms.includes(x) && e.rooms.includes(y));
  for (const w of WORDS) {
    const letters = w.rooms.map(id => L.byId.get(id).letter).filter(Boolean).join('');
    assert.equal(letters, w.word.replace(/ /g, ''), w.word);
    for (let i = 1; i < w.rooms.length; i++) assert(adjacent(w.rooms[i - 1], w.rooms[i]), `${w.word}: ${w.rooms[i - 1]}→${w.rooms[i]}`);
  }
});

test('from FONS the way to ANGLIA leads round by the south and west', () => {
  // shortest path from the east hall to the north hall must visit S and W sectors
  const prev = new Map([[L.entry, null]]), q = [L.entry];
  while (q.length) { const c = q.shift(); for (const n of L.neighbors.get(c)) if (!n.edge.mirror && !prev.has(n.id)) { prev.set(n.id, c); q.push(n.id); } }
  const path = []; for (let c = 'N.hall'; c; c = prev.get(c)) path.push(c);
  const sectors = new Set(path.map(id => id.split('.')[0]));
  for (const s of ['SE', 'S', 'SW', 'W', 'NW', 'N']) assert(sectors.has(s), `path misses ${s}: ${path.reverse().join(' ')}`);
  assert(!sectors.has('NE'));
});
