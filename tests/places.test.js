import test from 'node:test';
import assert from 'node:assert/strict';
import { PLACES, JOURNEY, CATEGORIES, byId } from '../src/data/places.js';

test('every place has a folio, a view and a walking spawn', () => {
  const ids = new Set();
  for (const p of PLACES) {
    assert(!ids.has(p.id), `duplicate ${p.id}`); ids.add(p.id);
    assert(CATEGORIES.some(c => c.id === p.cat), p.id);
    assert(p.text.length > 80, p.id);
    assert(p.quotes.length >= 1, p.id);
    for (const q of p.quotes) assert(q.tr && q.en && q.ref, p.id);
    assert(p.view.t.every(Number.isFinite) && p.view.p.every(Number.isFinite), p.id);
    assert(p.walk.road || [p.walk.x, p.walk.z].every(Number.isFinite), p.id);
  }
});

test('the plan key letters of the novel are all present', () => {
  const keys = new Set(PLACES.map(p => p.key).filter(Boolean));
  for (const k of ['A', 'B', 'D', 'F', 'H', 'J', 'K', 'N', 'R']) assert(keys.has(k), k);
});

test('the journey visits real places in the order of the days', () => {
  const days = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh'];
  let last = 0;
  for (const j of JOURNEY) {
    assert(byId[j.id], j.id);
    const d = days.findIndex(x => j.day.startsWith(x));
    assert(d >= last, j.day); last = d;
    assert(j.hour >= 0 && j.hour < 24);
  }
});
