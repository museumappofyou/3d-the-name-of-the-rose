// The sung office. Recordings of human voices singing Latin plainchant
// (banks named `chant:*`, see docs/assets/AUDIO_SOURCES.md) are played as an
// event with a beginning, rests between the pieces and an end, rather than
// as an endless pad: when an office begins the choir starts after a short
// silence, one piece follows another with the pauses of the liturgy, and
// when the office is over the last phrase is let die away. "...the voices
// of the monks rose toward the vaults, like a single soul."

import { rand } from './dsp.js';
import { Recording } from './recording.js';
import { SUPPLIED, suppliedFor } from '../../data/music.js';

// which pieces suit which hour (ids from systems/horarium.js). Late
// November, ordinary time: every office opens with "Deus in adjutorium"
// (said at all the hours); psalmody at the major hours; the Magnificat only
// at Vespers. Not used in routine offices: the Holy Saturday Lamentation
// (`chant:lesson`, wrong season: the lessons of Matins are left to silence)
// and the Pentecost hymn *Veni Creator* (`chant:hymn`, wrong feast). Both
// stay listed in docs/assets/AUDIO_SOURCES.md as source material only.
export const CHANT_FOR = {
  matins: ['chant:deus', 'chant:psalm'],
  lauds: ['chant:deus', 'chant:psalm'],
  prime: ['chant:deus'],
  terce: ['chant:deus'],
  sext: ['chant:deus'],
  nones: ['chant:deus'],
  vespers: ['chant:deus', 'chant:psalm', 'chant:magnificat'],
  compline: ['chant:deus', 'chant:psalm'],
};
const OUT_OF_SEASON = new Set(['chant:lesson', 'chant:hymn']);

export class Office {
  constructor(snd, e) {
    this.snd = snd; this.C = snd.ctx;
    this.out = this.C.createGain(); this.out.gain.value = 0; this.out.connect(e.n.inp);
    this.src = null; this.endAt = 0; this.next = this.C.currentTime + rand(2, 4); this.k = 0; this.hour = null; this.dying = false;
    this.all = []; this.recs = new Map(); this.hear = snd.hear ?? null;
    // Audio can be enabled before the manifest arrives. A silent office
    // must not permanently cache that empty list.
    snd.lib.ready.then(() => {
      this.all = Object.keys(snd.lib.man?.banks || {}).filter(n => n.startsWith('chant:') && !OUT_OF_SEASON.has(n));
    });
  }
  list(hour) {
    // a supplied recording (data/music.js) joins only the offices it has
    // been assigned to after a listening review; a ?hear= test plays it
    // alone, so it is heard at once and not after the recorded pieces
    const rec = suppliedFor('church', hour, this.hear);
    if (this.hear && rec.length) return rec;
    return [...(CHANT_FOR[hour] || ['chant:deus']).filter(n => this.all.includes(n)), ...rec];
  }
  tick(now, on, S) {
    const C = this.C;
    for (const r of this.recs.values()) r.tick(now);
    if (this.recordingList && !this.src?.busy) {
      // Rest from the actual end, including a slow load/network stall.
      this.endAt = now; this._rest(this.recordingList); this.recordingList = null;
    }
    if (!on) {
      // let the phrase in progress die away over a few seconds
      if (!this.dying) { this.dying = true; this.out.gain.setTargetAtTime(0, now, 2.2); }
      return;
    }
    if (this.dying) { this.dying = false; this.next = Math.max(this.next, now + rand(2, 4)); }
    if (S.hour !== this.hour) { this.hour = S.hour; this.k = 0; this.cycle = 0; }
    const list = this.list(S.hour);
    // Fetch only the material for this office. Prime does not need the
    // much longer Magnificat bank (28.65 MiB decoded) used at Vespers.
    for (const n of list) if (!n.startsWith('rec:')) this.snd.lib.want(n);
    this.out.gain.setTargetAtTime(1, now, 1.2);   // the office swells in rather than switching on
    if (now < this.next || (this.src && (now < this.endAt || this.src.busy))) return;
    if (!list.length) return;
    const name = list[this.k % list.length];
    if (name.startsWith('rec:')) return this._recording(now, name, list);
    const b = this.snd.lib.get(name);
    if (!b) { this.snd.lib.want(name, true); this.next = now + 0.5; return; }
    this.k++;
    // a different cut each time where the bank has several, never the one just heard
    let bi = Math.floor(Math.random() * b.bufs.length);
    if (b.bufs.length > 1 && bi === this.lastBuf?.[name]) bi = (bi + 1) % b.bufs.length;
    (this.lastBuf ||= {})[name] = bi;
    const buf = b.bufs[bi];
    const s = C.createBufferSource(); s.buffer = buf;
    const g = C.createGain(); g.gain.value = 0;
    s.connect(g); g.connect(this.out);
    const t = now + 0.05;
    // phrases begin and end softly (the cuts are not all at a breath)
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 0.6);
    g.gain.setValueAtTime(1, t + Math.max(0.7, buf.duration - 1.4)); g.gain.linearRampToValueAtTime(0, t + buf.duration);
    s.start(t);
    s.onended = () => { s.disconnect(); g.disconnect(); };
    this.src = s; this.endAt = t + buf.duration;
    // the pause between the pieces; once the hour's pieces have all been
    // sung, a long silence (the lessons, the psalms said low) before any
    // voice rises again — the same phrase is not heard every half minute
    this._rest(list);
  }
  _rest(list) {
    const endOfCycle = this.k % list.length === 0;
    if (endOfCycle) this.cycle = (this.cycle || 0) + 1;
    this.next = this.endAt + (endOfCycle ? rand(45, 95) : rand(3.5, 8));
  }
  // a streamed phrase of a supplied recording, in the same order and with
  // the same rests as the recorded pieces
  _recording(now, name, list) {
    const id = name.slice(4);
    let r = this.recs.get(id);
    if (!r) { r = new Recording(this.C, this.out, SUPPLIED[id], { audition: this.hear === id }); this.recs.set(id, r); }
    const dur = r.play(now);
    if (!dur) { this.next = now + 8; return; }
    this.k++;
    this.src = r; this.endAt = now + dur + 0.5;
    this.recordingList = list; this.next = Infinity;
  }
  stop() {
    const s = this.src, o = this.out, t = this.C.currentTime, recs = [...this.recs.values()];
    o.gain.cancelScheduledValues(t); o.gain.setTargetAtTime(0, t, 0.6);
    setTimeout(() => { try { if (!recs.includes(s)) s?.stop(); } catch (e) { /* ended */ } for (const r of recs) r.stop(); o.disconnect(); }, 3000);
  }
}
