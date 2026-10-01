import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VERSE, MIRROR_KEYS } from '../src/data/mirror.js';

// The verse's buttons (ui.js) and the Q / R keys (main.js) must name the same
// letters: the first and seventh of "quatuor" (a mismatch once made the
// displayed q and r reject themselves).
test('mirror keys are the q and r of quatuor, by position in the verse', () => {
  const w = VERSE.indexOf('quatuor');
  assert.ok(w > 0);
  assert.equal(VERSE[MIRROR_KEYS.q], 'q');
  assert.equal(VERSE[MIRROR_KEYS.r], 'r');
  assert.equal(MIRROR_KEYS.q, w);
  assert.equal(MIRROR_KEYS.r, w + 6);
  // the other r's of the verse are not the key
  const rs = [...VERSE].map((c, i) => c === 'r' ? i : -1).filter(i => i >= 0);
  assert.deepEqual(rs.filter(i => i !== MIRROR_KEYS.r).length, rs.length - 1);
});
