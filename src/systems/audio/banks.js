// Recorded sound banks. Every sound of the abbey is cut from a real field
// or Foley recording (CC0 Foley, CC BY-SA/public-domain chant; sources and cut times in
// docs/assets/AUDIO_SOURCES.md and scripts/audio/cuts.json). The clips of a bank
// share one MP3 sprite that starts with a sync click at `manifest.sync`
// seconds: the decoder's priming delay is measured on that click, so clip
// offsets stay exact whichever browser decodes the file.
//
//   const lib = new BankLibrary(ctx)
//   await lib.ready               // the manifest
//   lib.has(name) / lib.get(name) // { bufs: AudioBuffer[], loop } once loaded
//   lib.load(name)                // -> Promise (deduplicated)

import { SURFACES } from './steps.js';

export const STEP_BANKS = SURFACES.map(s => 'step:' + s);
const BASE = new URL('../../../assets/audio/', import.meta.url);
const PARALLEL = 4;

export class BankLibrary {
  constructor(ctx) {
    this.ctx = ctx; this.man = null; this.banks = new Map(); this.pending = new Map(); this.queue = []; this.active = 0;
    this.bytes = 0; this.errors = [];
    this.ready = fetch(new URL('manifest.json', BASE)).then(r => r.json()).then(m => { this.man = m; this._pump(); return m; })
      .catch(e => { this.errors.push(String(e)); console.warn('[audio] no sound manifest', e); });
  }
  has(name) { return !!this.man?.banks[name]; }
  get(name) { return this.banks.get(name); }
  // request without waiting; `front` jumps the queue
  want(name, front = false) {
    if (this.banks.has(name) || this.pending.has(name) || this.queue.includes(name)) return;
    if (this.man && !this.man.banks[name]) return;
    front ? this.queue.unshift(name) : this.queue.push(name);
    this._pump();
  }
  load(name) {
    if (this.banks.has(name)) return Promise.resolve(this.banks.get(name));
    this.want(name, true);
    return new Promise(res => { const t = setInterval(() => { const b = this.banks.get(name); if (b || (this.man && !this.man.banks[name]) || this.errors.length > 20) { clearInterval(t); res(b); } }, 50); });
  }
  _pump() {
    if (!this.man) return;
    while (this.active < PARALLEL && this.queue.length) {
      const name = this.queue.shift(), d = this.man.banks[name];
      if (!d || this.banks.has(name)) continue;
      this.active++;
      const p = this._fetch(name, d).catch(e => { this.errors.push(name + ': ' + e); console.warn('[audio] bank', name, e); })
        .finally(() => { this.active--; this.pending.delete(name); this._pump(); });
      this.pending.set(name, p);
    }
  }
  async _fetch(name, d) {
    const r = await fetch(new URL(d.file, BASE));
    const ab = await r.arrayBuffer();
    this.bytes += ab.byteLength;
    const C = this.ctx;
    const src = await new Promise((res, rej) => { const p = C.decodeAudioData(ab, res, rej); if (p?.then) p.then(res, rej); });
    const sr = src.sampleRate, ch = src.numberOfChannels, x0 = src.getChannelData(0);
    // where did the sync click land?
    let at = 0, best = 0;
    for (let i = 0, n = Math.min(x0.length, Math.round(sr * 0.18)); i < n; i++) { const a = Math.abs(x0[i]); if (a > best) { best = a; at = i; } }
    const shift = at / sr - (this.man.sync ?? 0.05);
    const bufs = d.clips.map(([t, dur]) => {
      const i0 = Math.max(0, Math.round((t + shift) * sr)), n = Math.min(Math.round(dur * sr), src.length - i0);
      const b = C.createBuffer(ch, Math.max(1, n), sr);
      for (let c = 0; c < ch; c++) b.copyToChannel(src.getChannelData(c).subarray(i0, i0 + n), c);
      return b;
    });
    const bank = { bufs, last: -1, loop: !!d.loop, name };
    this.banks.set(name, bank);
    return bank;
  }
}
