// A long recording streamed from a media element rather than decoded into
// a buffer: two stereo tracks of 100 s would otherwise hold about 73 MB of
// float samples. One reviewed phrase (or a full audition) plays at a time. Fades follow the
// media clock (a seek or a network stall must not move a fade into the
// middle of a phrase), and the element is paused between phrases.

const FADE_IN = 0.8, FADE_OUT = 1.6;

export class Recording {
  constructor(ctx, dest, def, { audition = false } = {}) {
    this.C = ctx; this.def = def; this.el = null; this.node = null;
    this.g = ctx.createGain(); this.g.gain.value = 0; this.g.connect(dest);
    this.k = 0; this.state = 'idle'; this.win = null; this.startedAt = 0;
    this.phrases = audition ? [[0, def.duration]] : def.reviewed ? def.phrases : [];
    this.generation = 0; this.error = null;
  }
  get busy() { return this.state !== 'idle'; }
  _ensure() {
    if (this.el) return true;
    if (typeof Audio === 'undefined' || !this.C.createMediaElementSource) return false;
    const el = new Audio(); el.preload = 'metadata'; el.src = this.def.file;
    this.node = this.C.createMediaElementSource(el); this.node.connect(this.g);
    this.el = el;
    el.addEventListener('ended', () => { if (this.el === el) this._end(this.C.currentTime); });
    el.addEventListener('error', () => {
      if (this.el !== el) return;
      this.error = 'Media error ' + (el.error?.code ?? 'unknown'); this._end(this.C.currentTime);
    });
    return true;
  }
  // start the next phrase; returns its nominal length (s) or 0
  play(now) {
    const ph = this.phrases;
    if (!ph.length || !this._ensure()) return 0;
    this.win = ph[this.k++ % ph.length];
    const el = this.el;
    const generation = ++this.generation;
    this.state = 'seeking'; this.startedAt = now; this.error = null;
    this.g.gain.cancelScheduledValues(now); this.g.gain.setValueAtTime(0, now);
    // a seek before the metadata has arrived is ignored: repeat it then
    const a = this.win[0];
    const seek = () => {
      if (this.el !== el || this.generation !== generation || !this.busy) return;
      el.currentTime = a;
    };
    if (el.readyState >= 1) seek();
    else el.addEventListener('loadedmetadata', seek, { once: true });
    el.play()?.catch?.(e => {
      if (this.el !== el || this.generation !== generation) return;
      this.error = String(e); this._end(this.C.currentTime);
    });
    return this.win[1] - this.win[0];
  }
  // control rate: follow the media position through the phrase window
  tick(now) {
    if (!this.el || this.state === 'idle') return;
    const el = this.el, p = el.currentTime, [a, b] = this.win, g = this.g.gain;
    // Encoder duration estimates and browser media duration need not match.
    // An early ended/error event must release the slot in any fade state.
    if (el.ended || p >= b) { this._end(now); return; }
    if (this.state === 'seeking') {
      if (!el.paused && !el.seeking && p >= a - 0.05 && p < b) this.state = 'on';
      else { if (now - this.startedAt > 12) this._end(now); return; }
    }
    // Do not schedule an AudioContext-time fade over a stalled media stream.
    // The envelope only advances when the recording itself advances.
    const envelope = Math.max(0, Math.min(1, (p - a) / FADE_IN, (b - p) / FADE_OUT));
    g.setTargetAtTime(this.def.lvl * envelope, now, 0.035);
    this.state = p >= b - FADE_OUT ? 'out' : 'on';
  }
  _end(now) {
    this.g.gain.cancelScheduledValues(now); this.g.gain.setTargetAtTime(0, now, 0.05);
    this.el?.pause(); this.state = 'idle';
  }
  stop() {
    this.generation++;
    this._end(this.C.currentTime);
    try { this.node?.disconnect(); this.g.disconnect(); } catch (e) { /* already */ }
    if (this.el) { this.el.removeAttribute('src'); this.el.load(); }
    this.el = null; this.node = null;
  }
}
