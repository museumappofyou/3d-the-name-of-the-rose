import test from 'node:test';
import assert from 'node:assert/strict';
import { Sound } from '../web/src/systems/audio.js';

test('an unavailable animal position skips its call without poisoning subsequent audio ticks', () => {
  const sound = new Sound();
  let position = [98, NaN, -26], calls = 0;
  const e = sound.addEmitter({ kind: 'pigs', x: 98, y: 1, z: -26, spot: () => position });
  const param = { setTargetAtTime() {} };
  e.active = true;
  e.n = { g: { gain: param }, sg: { gain: param }, lp: { frequency: param } };
  e.ev = [{ next: 0, gen: null, d: { gap: [10, 10], *run() { calls++; } } }];
  sound._tickEmitter(e, 1, 0);
  assert.equal(calls, 0);
  assert.deepEqual(e.pos, { x: 98, y: 1, z: -26 });
  position = [98, 1.8, -26];
  sound._tickEmitter(e, 1, 11);
  assert.equal(calls, 1);
  assert.deepEqual(e.pos, { x: 98, y: 1.8, z: -26 });
});
