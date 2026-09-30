// The sung office. Recordings of human voices singing Latin plainchant
// (banks named `chant:*`, see docs/assets/AUDIO_SOURCES.md) are played as an
// event with a beginning, rests between the pieces and an end, rather than
// as an endless pad: when an office begins the choir starts after a short
// silence, one piece follows another with the pauses of the liturgy, and
// when the office is over the last phrase is let die away. "...the voices
// of the monks rose toward the vaults, like a single soul."

import { rand } from './dsp.js';

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
    const names = Object.keys(snd.lib.man?.banks || {}).filter(n => n.startsWith('chant:') && !OUT_OF_SEASON.has(n));
    this.all = names;
    for (const n of names) snd.lib.want(n);
  }
  list(hour) {
    return (CHANT_FOR[hour] || ['chant:deus']).filter(n => this.all.includes(n));
  }
  tick(now, on, S) {
    const C = this.C;
    if (!on) {
      // let the phrase in progress die away over a few seconds
      if (!this.dying) { this.dying = true; this.out.gain.setTargetAtTime(0, now, 2.2); }
      return;
    }
    if (this.dying) { this.dying = false; this.next = Math.max(this.next, now + rand(2, 4)); }
    if (S.hour !== this.hour) { this.hour = S.hour; this.k = 0; this.cycle = 0; }
    this.out.gain.setTargetAtTime(1, now, 1.2);   // the office swells in rather than switching on
    if (now < this.next || (this.src && now < this.endAt)) return;
    const list = this.list(S.hour);
    if (!list.length) return;
    const name = list[this.k % list.length], b = this.snd.lib.get(name);
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
    const endOfCycle = this.k % list.length === 0;
    if (endOfCycle) this.cycle = (this.cycle || 0) + 1;
    this.next = this.endAt + (endOfCycle ? rand(45, 95) : rand(3.5, 8));
  }
  stop() {
    const s = this.src, o = this.out, t = this.C.currentTime;
    o.gain.cancelScheduledValues(t); o.gain.setTargetAtTime(0, t, 0.6);
    setTimeout(() => { try { s?.stop(); } catch (e) { /* ended */ } o.disconnect(); }, 3000);
  }
}
