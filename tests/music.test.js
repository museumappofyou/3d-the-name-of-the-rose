import test from 'node:test';
import assert from 'node:assert/strict';
import { SUPPLIED, suppliedFor, hearingParam } from '../web/src/data/music.js';
import { Office } from '../web/src/systems/audio/chant.js';
import { Recording } from '../web/src/systems/audio/recording.js';

test('unauditioned music has no invented phrase edits or approved placement', () => {
  for (const [id, d] of Object.entries(SUPPLIED)) {
    assert.equal(d.reviewed, false, id);
    assert.deepEqual(d.phrases, [], id);
    assert.equal(d.place, null, id);
  }
});

test('supplied recordings stay out of the abbey until assigned or asked for', () => {
  for (const h of ['matins', 'prime', 'vespers', 'compline']) assert.deepEqual(suppliedFor('church', h), []);
  assert.deepEqual(suppliedFor('church', 'vespers', 'cold_stone_prayer'), ['rec:cold_stone_prayer']);
  assert.deepEqual(suppliedFor('church', 'vespers', 'beneath_the_vault'), ['rec:beneath_the_vault']);
  assert.deepEqual(suppliedFor('library', 'vespers', 'cold_stone_prayer'), []);
  assert.equal(hearingParam('?hear=cold_stone_prayer'), 'cold_stone_prayer');
  assert.equal(hearingParam('?hear=../music/x'), null);
});

function rig(hear, t) {
  const els = [];
  const previous = globalThis.Audio;
  t.after(() => { if (previous) globalThis.Audio = previous; else delete globalThis.Audio; });
  globalThis.Audio = class {
    constructor() { this.currentTime = 0; this.paused = true; this.seeking = false; this.readyState = 1; this.events = {}; els.push(this); }
    addEventListener(name, fn) { (this.events[name] ||= []).push(fn); }
    fire(name) { for (const fn of this.events[name] || []) fn(); }
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; } load() {} removeAttribute() {}
  };
  const param = () => ({ value: 0, targets: [], setTargetAtTime(v) { this.targets.push(v); }, setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} });
  const node = () => ({ gain: param(), connect() {}, disconnect() {} });
  const ctx = { currentTime: 0, createGain: node, createMediaElementSource: node, createBufferSource: () => ({ connect() {}, disconnect() {}, start() {}, stop() {} }) };
  const lib = { man: { banks: {} }, ready: Promise.resolve(), want() {}, get: () => null };
  return { office: new Office({ ctx, lib, hear }, { n: { inp: {} } }), els, ctx };
}

test('a full streamed audition keeps its time while walking and rests after its actual ending', async t => {
  const r = rig('cold_stone_prayer', t); await Promise.resolve();
  r.office.next = 0;
  r.office.tick(1, true, { hour: 'vespers', zone: 'court' });
  const rec = r.office.recs.get('cold_stone_prayer'), el = r.els[0];
  assert.ok(rec && el, 'phrase started');
  assert.equal(el.currentTime, 0);
  assert.deepEqual(rec.win, [0, SUPPLIED.cold_stone_prayer.duration]);
  const end = r.office.endAt;
  // media time advances with the phrase whatever the listener does
  for (const [now, zone] of [[5, 'porch'], [20, 'choir'], [40, 'cemetery'], [104.8, 'library']]) {
    el.currentTime = now;
    r.office.tick(now, true, { hour: 'vespers', zone });
    assert.equal(r.office.src, rec); assert.equal(r.office.endAt, end);
  }
  assert.equal(rec.state, 'out');
  // A stall made the media end later than the nominal AudioContext end.
  el.currentTime = SUPPLIED.cold_stone_prayer.duration;
  r.office.tick(150, true, { hour: 'vespers' });
  assert.equal(rec.state, 'idle'); assert.ok(el.paused);
  assert.ok(r.office.next >= 195, 'a real rest follows the actual end');
});

test('media stalls do not run an ending fade ahead of the recording, and early endings release it', async t => {
  const r = rig('beneath_the_vault', t); await Promise.resolve();
  r.office.next = 0; r.office.tick(1, true, { hour: 'vespers' });
  const rec = r.office.recs.get('beneath_the_vault'), el = r.els[0];
  assert.deepEqual(rec.win, [0, SUPPLIED.beneath_the_vault.duration]);
  el.currentTime = rec.win[1] - 0.8; rec.tick(100);
  const gain = rec.g.gain.targets.at(-1);
  rec.tick(110);
  assert.equal(rec.g.gain.targets.at(-1), gain, 'fade stays at the stalled media position');
  el.currentTime = 20; rec.state = 'on'; el.ended = true;
  r.office.tick(111, true, { hour: 'vespers' });
  assert.equal(rec.state, 'idle'); assert.ok(el.paused); assert.ok(r.office.next >= 156);
});

test('a rejected play or a late metadata callback cannot revive a disposed recording', async t => {
  const r = rig(null, t);
  const rec = new Recording(r.ctx, {}, SUPPLIED.cold_stone_prayer, { audition: true });
  rec._ensure(); const el = r.els[0];
  el.readyState = 0; el.play = () => Promise.reject(new Error('blocked playback'));
  rec.play(0); await Promise.resolve();
  assert.equal(rec.state, 'idle'); assert.match(rec.error, /blocked/);
  rec.stop(); el.currentTime = 7; el.fire('loadedmetadata');
  assert.equal(el.currentTime, 7); assert.equal(rec.el, null);
  const unreviewed = new Recording(r.ctx, {}, SUPPLIED.cold_stone_prayer);
  assert.equal(unreviewed.play(0), 0);
});
