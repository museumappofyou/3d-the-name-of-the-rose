import test from 'node:test';
import assert from 'node:assert/strict';
import { Office } from '../src/systems/audio/chant.js';

function rig() {
  const made = [], wanted = [];
  const param = () => ({ value: 0, setTargetAtTime() {}, setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} });
  const ctx = { currentTime: 0, createGain: () => ({ gain: param(), connect() {}, disconnect() {} }), createBufferSource: () => {
    const s = { connect() {}, disconnect() {}, start(t) { this.started = t; }, stop() {} }; made.push(s); return s;
  } };
  let deliver;
  const lib = { man: null, ready: new Promise(r => { deliver = r; }), want: n => wanted.push(n), get: n => n === 'chant:deus' ? { bufs: [{ duration: 56 }] } : null };
  const snd = { ctx, lib };
  return { office: new Office(snd, { n: { inp: {} } }), made, wanted, deliver: () => { lib.man = { banks: { 'chant:deus': {}, 'chant:magnificat': {} } }; deliver(); } };
}

test('audio enabled before the bank manifest still starts the appropriate office', async () => {
  const r = rig();
  r.office.tick(5, true, { hour: 'prime' });
  assert.equal(r.made.length, 0);
  r.deliver(); await Promise.resolve();
  r.office.tick(6, true, { hour: 'prime' });
  assert.equal(r.made.length, 1);
  assert.deepEqual([...new Set(r.wanted)], ['chant:deus']);
  assert.equal(r.office.src.buffer.duration, 56);
});

test('listener movement leaves the phrase and its scheduled pause intact', async () => {
  const r = rig(); r.deliver(); await Promise.resolve();
  r.office.tick(5, true, { hour: 'prime', zone: 'court' });
  const source = r.office.src, end = r.office.endAt, next = r.office.next;
  for (const [t, zone] of [[10, 'porch'], [20, 'choir'], [40, 'cemetery'], [60, 'library']]) {
    r.office.tick(t, true, { hour: 'prime', zone });
    assert.equal(r.office.src, source);
    assert.equal(r.office.endAt, end);
    assert.equal(r.office.next, next);
  }
  r.office.tick(next + .1, true, { hour: 'prime', zone: 'court' });
  assert.equal(r.made.length, 2);
  assert.notEqual(r.office.src, source);
});
