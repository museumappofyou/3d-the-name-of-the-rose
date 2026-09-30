// The sound of the abbey. Every source is a real recording — footsteps on
// stone, snow, straw and boards, the bell, the horses, pigs, hens and sheep,
// fire, wind, quills, pots, the anvil, doors, and human voices singing the
// office — cut into small banks (./audio/banks.js, assets/audio/) that load
// by proximity. Each space adds its own reverberation — the long dark tail
// of the church, the dead small rooms of the library, the damp crypt.
// Silence is part of the design: most things happen rarely and quietly.
//
//   sound.start() / stop() / toggle()
//   sound.update(dt, { listener, acoustic, indoor, zone, time, hour, office, night, weather, fireDist, library })
//   sound.step(surface, run, opts)          player footsteps
//   sound.addEmitter({ x, y, z, kind, radius, gain, zone }) -> handle (.pos, .gain, .remove())
//   sound.npcSound(kind, x, y, z, gain)     positional one-shots for the monks
//   sound.bell(n, base) / chime() / creak()

import { BankLibrary, STEP_BANKS } from './audio/banks.js';
import { SURFACES, SURFACE_ALIAS, STEP_PLAY } from './audio/steps.js';
import { SPACES, ZONE_ACOUSTIC, makeIR } from './audio/reverb.js';
import { KINDS } from './audio/emitters.js';
import { rand, dB } from './audio/dsp.js';

export { SURFACES, KINDS, SPACES };
export const BELL_TOWER = { x: 34.4, y: 19.5, z: -5.46 };   // the belfry of the ×0.8 church (ctx.anchors.church.belfry)

const CAP = 24;            // simultaneous one-shot voices
const TICK = 1 / 15;       // control rate for ambience, emitters, reverb switching (s)
const LOOK = 0.15;         // scheduler lookahead (s)
const XFADE = 0.8;         // reverb crossfade (s)
const STEP_LEVEL = 0.32;
const NPC = {
  'step-stone': ['step:stone', 0.3], 'step-snow': ['step:snowPacked', 0.3], 'step-wood': ['step:wood', 0.3], 'step-straw': ['step:straw', 0.3],
  cough: ['cough', 0.45], pageTurn: ['pageTurn', 0.4], pour: ['pour', 0.45], clank: ['metal', 0.35], chop: ['chop', 0.5],
  dig: ['dig', 0.5], hoof: ['hoof', 0.55], snort: ['snort', 0.45], breath: ['breath', 0.4], chew: ['chew', 0.4],
  grunt: ['grunt', 0.5], cluck: ['cluck', 0.45], bleat: ['bleat', 0.45], low: ['low', 0.5], cowChew: ['cowChew', 0.4],
  meow: ['meow', 0.35], sweep: ['sweep', 0.45], scratch: ['scratch', 0.5], anvil: ['anvil', 0.6], hot: ['hot', 0.6],
  tap: ['tap', 0.4], latch: ['latch', 0.5], doorCreak: ['doorCreak', 0.45], doorThud: ['doorThud', 0.5], ladle: ['ladle', 0.45],
  pot: ['pot', 0.45], metal: ['metal', 0.4], whinny: ['whinny', 0.45], strawRustle: ['strawRustle', 0.4], bray: ['bray', 0.45],
};
const WEATHER_WIND = { clear: 0.8, snow: 1.2, fog: 0.45 };
const smooth = (p, v, t, tau) => p.setTargetAtTime(v, t, tau);
function hold(p, t) { if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t); else { const v = p.value; p.cancelScheduledValues(t); p.setValueAtTime(v, t); } }
function setPos(node, x, y, z) {
  if (node.positionX) { node.positionX.value = x; node.positionY.value = y; node.positionZ.value = z; } else node.setPosition(x, y, z);
}

// An ambient source. Nodes exist only while the listener is within `radius`.
class Emitter {
  constructor(snd, o) {
    this.snd = snd; this.kind = o.kind; this.K = KINDS[o.kind];
    this._pos = { x: o.x ?? 0, y: o.y ?? 0, z: o.z ?? 0 };
    this.gain = o.gain ?? 1; this.radius = o.radius ?? 25; this.zone = o.zone ?? null;
    this.indoor = o.indoor ?? this.K.indoor; this.ref = o.ref ?? this.K.ref ?? 3; this.flat = !!o.flat;
    this.active = false; this.n = null; this.ev = []; this.mem = {}; this.live = null; this.cache = [-1, -1, -1];
    this.far = o.far ?? this.K.far ?? 0; this.spot = o.spot || null; this.onHit = o.onHit || null; this.lead = o.lead ?? 0.3; this.dist = 99;
  }
  get pos() { return this._pos; }
  set pos(p) { if (Array.isArray(p)) { this._pos.x = p[0]; this._pos.y = p[1]; this._pos.z = p[2]; } else { this._pos.x = p.x; this._pos.y = p.y; this._pos.z = p.z; } }
  remove() { this.snd.removeEmitter(this); }
}

export class Sound {
  constructor(opts = {}) {
    this.on = false; this.ctx = null; this.opts = opts;
    this.emitters = []; this.bellPos = null;
    this.banks = new Map(); this.irs = new Map(); this.queue = []; this.synthMs = {}; this.lib = null;
    this.voices = 0; this.errors = 0;
    this.S = { x: 0, y: 1.6, z: 0, fx: 0, fz: -1, zone: null, indoor: 0, acoustic: 'exterior', time: 12, hour: null, office: false, night: 0, weather: 'clear', fireDist: 99, library: false, wind: 0.5 };
    this.gust = 0.6; this.gustT = 0.6; this.gustNext = 0; this.windAmt = 0.5;
    this._acc = 0; this._lp = [NaN, NaN, NaN, NaN, NaN];
    const self = this;
    // the object handed to emitter gestures
    this.api = { t: 0, e: null, s: this.S, hit(b, g, r) { return self._hit(this.e, b, this.t, g, r); } };
    this.ambApi = { t: 0, s: this.S, shot(b, x, y, z, g, o) { return self._shot(b, x, y, z, g, { ...o, when: this.t }); } };
  }

  // --- lifecycle -------------------------------------------------------------------
  start() {
    if (this.ctx) {
      clearTimeout(this._susp);
      if (this.ctx.state === 'suspended' && !this.offline) this.ctx.resume();
      this.on = true; hold(this.master.gain, this.ctx.currentTime); smooth(this.master.gain, 0.9, this.ctx.currentTime, 0.4);
      return;
    }
    const C = this.ctx = this.opts.context || new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
    this.offline = typeof OfflineAudioContext !== 'undefined' && C instanceof OfflineAudioContext;
    this.sr = C.sampleRate;
    const t = C.currentTime;
    this.master = C.createGain(); this.master.gain.value = 0;
    // a gentle safety limiter; it should almost never act
    const lim = C.createDynamicsCompressor();
    lim.threshold.value = -6; lim.knee.value = 4; lim.ratio.value = 8; lim.attack.value = 0.002; lim.release.value = 0.2;
    this.master.connect(lim); lim.connect(C.destination);
    this.out = lim;
    smooth(this.master.gain, 0.9, t, 0.6);
    this.dry = C.createGain(); this.dry.connect(this.master);
    this.send = C.createGain();
    // the rooms ring in the voice and the step, not in the sub-bass: the
    // stone IRs would otherwise pile up a boom below ~100 Hz under footsteps
    this.revIn = C.createBiquadFilter(); this.revIn.type = 'highpass'; this.revIn.frequency.value = 130; this.revIn.Q.value = 0.6;
    this.send.connect(this.revIn);
    this.slots = [0, 1].map(() => { const wet = C.createGain(); wet.gain.value = 0; wet.connect(this.master); return { wet, conv: null, name: null }; });
    this.cur = 0; this.space = null; this.want = 'exterior'; this.wantT = 0; this.lastSwitch = -9;
    this.amb = C.createGain(); this.amb.connect(this.master);
    this.ui = C.createGain(); this.ui.connect(this.master);
    this.stepBus = C.createGain(); this.stepBus.gain.value = STEP_LEVEL;
    // the body of a step, not the rumble of the room it was recorded in
    const stepHP = C.createBiquadFilter(); stepHP.type = 'highpass'; stepHP.frequency.value = 75; stepHP.Q.value = 0.6;
    // and the room answers the listener's own feet more softly than it
    // does the choir, without the low-mid bloom stone rooms give a tread
    const stepSend = C.createBiquadFilter(); stepSend.type = 'peaking'; stepSend.frequency.value = 170; stepSend.Q.value = 0.8; stepSend.gain.value = -8;
    const stepSendG = C.createGain(); stepSendG.gain.value = 0.5;
    this.stepBus.connect(stepHP); stepHP.connect(this.dry); stepHP.connect(stepSend); stepSend.connect(stepSendG); stepSendG.connect(this.send);

    this.lib = new BankLibrary(C);
    this.banks = this.lib.banks;
    this._buildAmbience();
    this._setSpace('exterior', true);
    // the fire fallback for callers that only pass fireDist
    this.fireEm = new Emitter(this, { kind: 'hearth', flat: true, radius: 9 });
    this.on = true;
    // loading order: the feet first, the winter wind, the bell, the rooms; the
    // rest of the abbey is fetched as the walker comes near it
    this.lib.ready.then(() => {
      this._enqueue(['wind', 'windTrees', ...STEP_BANKS, 'bell', 'doorCreak', 'handbell']);
      this._enqueue(['ir:cloister', 'ir:room', 'ir:church']);
      this._enqueue(Object.keys(SPACES).map(s => 'ir:' + s));
    });
  }
  stop() {
    if (!this.ctx) return;
    this.on = false;
    const t = this.ctx.currentTime; hold(this.master.gain, t); smooth(this.master.gain, 0, t, 0.3);
    if (!this.offline) this._susp = setTimeout(() => { if (!this.on) this.ctx.suspend(); }, 1500);
  }
  toggle() { this.on ? this.stop() : this.start(); return this.on; }

  // --- background synthesis --------------------------------------------------------
  _enqueue(names, front = false) {
    for (const n of names) {
      if (!n.startsWith('ir:')) { this.lib?.want(n, front); continue; }
      if (this.irs.has(n.slice(3)) || this.queue.includes(n)) continue;
      front ? this.queue.unshift(n) : this.queue.push(n);
    }
    if (!this._pumping && this.ctx) { this._pumping = true; setTimeout(() => this._pump(), 30); }
  }
  _pump() {
    const t0 = performance.now();
    while (this.queue.length && performance.now() - t0 < 6) this._job(this.queue.shift());
    if (this.queue.length) setTimeout(() => this._pump(), 20); else this._pumping = false;
  }
  _job(n) { this._ir(n.slice(3)); }
  _ir(name) {
    let b = this.irs.get(name);
    if (!b) { const t = performance.now(); b = makeIR(this.ctx, name); this.irs.set(name, b); this.synthMs['ir:' + name] = performance.now() - t; }
    return b;
  }
  // a recorded bank if it has arrived (else ask for it and stay quiet)
  _bank(n) { const b = this.banks.get(n); if (!b) this.lib?.want(n, true); return b; }
  _ready(n) { return this._bank(n); }
  _pick(b) {
    let i = Math.floor(Math.random() * b.bufs.length);
    if (b.bufs.length > 1 && i === b.last) i = (i + 1 + Math.floor(Math.random() * (b.bufs.length - 1))) % b.bufs.length;
    b.last = i; return b.bufs[i];
  }
  // fetch every bank and build every room now (tests, or a loading screen)
  async prepareAll() {
    if (!this.ctx) return;
    await this.lib.ready;
    for (const s in SPACES) this._ir(s);
    this.queue.length = 0;
    await Promise.all(Object.keys(this.lib.man?.banks || {}).map(n => this.lib.load(n)));
  }

  // --- acoustics -------------------------------------------------------------------
  // two convolvers, A and B: the new room fades in as the old one fades out
  _setSpace(name, instant = false) {
    const C = this.ctx, t = C.currentTime, P = SPACES[name];
    const cur = this.slots[this.cur], nxt = this.slots[1 - this.cur];
    if (nxt.name !== name) {
      if (nxt.conv) { nxt.conv.disconnect(); this.revIn.disconnect(nxt.conv); }
      const cv = C.createConvolver(); cv.normalize = false; cv.buffer = this._ir(name);
      this.revIn.connect(cv); cv.connect(nxt.wet); nxt.conv = cv; nxt.name = name;
    }
    const T = instant ? 0.01 : XFADE;
    for (const [s, v] of [[nxt, P.wet], [cur, 0]]) { hold(s.wet.gain, t); s.wet.gain.linearRampToValueAtTime(v, t + T); }
    hold(this.dry.gain, t); this.dry.gain.linearRampToValueAtTime(P.dry, t + T);
    this.cur = 1 - this.cur; this.space = name; this.lastSwitch = t;
  }

  // --- ambience: the winter wind, and its moan in the library ----------------------
  _buildAmbience() {
    const C = this.ctx;
    const filt = (type, f, Q) => { const b = C.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = Q; return b; };
    const gain = v => { const g = C.createGain(); g.gain.value = v; return g; };
    // two recorded winds: a cold whistling one over open ground and a
    // broader one in the trees; gusts lean on the first, walls darken both
    this.windLP = filt('lowpass', 16000, 0.5); this.windG = gain(0);
    this.windA = gain(0.5); this.windB = gain(0.6);
    this.windA.connect(this.windLP); this.windB.connect(this.windLP);
    this.windLP.connect(this.windG).connect(this.amb);
    // the library's moan, used when no wind-slit emitters are registered
    this.moanF = filt('bandpass', 800, 0.8); this.moanG = gain(0);
    this.moanF.connect(this.moanG).connect(this.amb);
    this.beds = {};
    // sporadic exterior events at random bearings
    this.ambEv = AMBIENCE.map(d => ({ d, next: rand(5, d.gap[1]), gen: null }));
  }
  // start a looping recorded bed once its bank has arrived
  _bed(name, dest) {
    if (this.beds[name]) return;
    const b = this._bank(name); if (!b) return;
    const C = this.ctx, s = C.createBufferSource();
    s.buffer = b.bufs[0]; s.loop = true; s.connect(dest); s.start(C.currentTime, rand(0, s.buffer.duration));
    this.beds[name] = s;
  }

  // --- per frame -------------------------------------------------------------------
  update(dt, s = {}) {
    if (!this.ctx || !this.on) return;
    const S = this.S, L = s.listener;
    if (L) { S.x = L.x ?? S.x; S.y = L.y ?? S.y; S.z = L.z ?? S.z; S.fx = L.fx ?? S.fx; S.fz = L.fz ?? S.fz; }
    S.zone = typeof s.zone === 'string' ? s.zone : s.zone?.id ?? null;
    S.indoor = typeof s.indoor === 'number' ? s.indoor : s.indoor ? 1 : 0;
    S.acoustic = SPACES[s.acoustic] ? s.acoustic : ZONE_ACOUSTIC[S.zone] || (S.indoor > 0.5 ? 'room' : 'exterior');
    S.time = s.time ?? S.time; S.hour = s.hour ?? null; S.night = s.night ?? 0; S.weather = s.weather || 'clear';
    S.office = !!(s.office ?? s.choir); S.fireDist = s.fireDist ?? 99; S.library = s.library ?? S.zone === 'library';
    S.inside = s.inside ?? S.indoor > 0.5;   // within a building (the zone's own flag, not the eye's adaptation)
    // the listener's ears
    const lp = this._lp, fl = Math.hypot(S.fx, S.fz) || 1, fx = S.fx / fl, fz = S.fz / fl;
    if (lp[0] !== S.x || lp[1] !== S.y || lp[2] !== S.z || lp[3] !== fx || lp[4] !== fz) {
      const Lr = this.ctx.listener;
      if (Lr.positionX) {
        Lr.positionX.value = S.x; Lr.positionY.value = S.y; Lr.positionZ.value = S.z;
        Lr.forwardX.value = fx; Lr.forwardY.value = 0; Lr.forwardZ.value = fz; Lr.upX.value = 0; Lr.upY.value = 1; Lr.upZ.value = 0;
      } else { Lr.setPosition(S.x, S.y, S.z); Lr.setOrientation(fx, 0, fz, 0, 1, 0); }
      lp[0] = S.x; lp[1] = S.y; lp[2] = S.z; lp[3] = fx; lp[4] = fz;
    }
    this._acc += dt;
    if (this._acc < TICK) return;
    const tdt = Math.min(this._acc, 0.5); this._acc = 0;
    try { this._tick(tdt); } catch (e) { if (this.errors++ < 3) console.error('[audio]', e); }
  }

  _tick(dt) {
    const C = this.ctx, now = C.currentTime, S = this.S;
    // the room: switch only once the new acoustic has held for a moment
    if (S.acoustic !== this.want) { this.want = S.acoustic; this.wantT = now; }
    if (this.want !== this.space && now - this.wantT > 0.25 && now - this.lastSwitch > XFADE + 0.05) this._setSpace(this.want);

    // gusts: a slow random wander with now and then a strong one
    if (now > this.gustNext) { this.gustT = Math.random() < 0.2 ? rand(0.95, 1.35) : rand(0.3, 0.8); this.gustNext = now + rand(1.5, 6); }
    this.gust += (this.gustT - this.gust) * Math.min(1, dt * 0.7);
    const fl = 1 + 0.12 * Math.sin(now * 1.7) * Math.sin(now * 0.53 + 1);
    const W = WEATHER_WIND[S.weather] ?? 0.8;
    this.windAmt = W * this.gust * fl;
    const ind = S.indoor, hush = 1 - 0.25 * S.night;
    S.wind = this.windAmt;
    this._bed('wind', this.windA); this._bed('windTrees', this.windB);
    const outW = 0.45 * this.windAmt, inW = (S.library ? 0.09 : 0.05) * this.windAmt;
    smooth(this.windG.gain, (outW * (1 - ind) + inW * ind) * hush, now, 0.35);
    smooth(this.windLP.frequency, 16000 * Math.pow(450 / 16000, ind), now, 0.3);
    smooth(this.windA.gain, 0.25 + 0.55 * Math.min(1.2, this.gust), now, 0.6);
    let slit = false;
    for (const e of this.emitters) if (e.active && e.kind === 'wind-slit') { slit = true; break; }
    if (S.library && !slit) this._bed('windSlit', this.moanF);
    smooth(this.moanG.gain, S.library && !slit ? 0.5 * W * Math.max(0, this.gust - 0.35) : 0, now, 0.8);

    // emitters
    let hearths = 0;
    for (const e of this.emitters) {
      if (e.kind === 'hearth') hearths++;
      const dx = e._pos.x - S.x, dy = e._pos.y - S.y, dz = e._pos.z - S.z;
      this._tickEmitter(e, Math.sqrt(dx * dx + dy * dy + dz * dz), now);
    }
    // callers that only report the distance to the nearest fire
    this._tickEmitter(this.fireEm, hearths ? 99 : S.fireDist, now);

    // the outdoor world beyond the walls
    const api = this.ambApi;
    for (const ev of this.ambEv) {
      while (ev.next < now + LOOK) {
        const t = Math.max(ev.next, now + 0.01);
        if (!ev.gen) { if (Math.random() > ev.d.act(S)) { ev.next = t + rand(...ev.d.gap); continue; } ev.gen = ev.d.run(api); }
        api.t = t;
        const r = ev.gen.next();
        if (r.done) { ev.gen = null; ev.next = t + rand(...ev.d.gap); } else ev.next = t + (r.value || 0.1);
      }
    }
  }

  // occlusion: 0 same space .. 1 behind a wall
  _occ(e) {
    const S = this.S;
    if (e.flat) return 0;
    const sameZone = e.zone && (Array.isArray(e.zone) ? e.zone.includes(S.zone) : e.zone === S.zone || (e.zone === 'church' && S.zone === 'choir') || (e.zone === 'choir' && S.zone === 'church'));
    if (e.zone) return sameZone ? 0 : S.indoor > 0.5 || e.indoor ? 1 : 0;
    return e.indoor ? 0 : S.indoor;
  }

  _tickEmitter(e, d, now) {
    const K = e.K, S = this.S;
    e.dist = d;
    if (!e.active) { if (d < e.radius) this._activate(e, now); else return; }
    else if (d > e.radius * 1.15 + 2) { this._deactivate(e); return; }
    const n = e.n;
    if (n.pan && (n.px !== e._pos.x || n.py !== e._pos.y || n.pz !== e._pos.z)) { setPos(n.pan, e._pos.x, e._pos.y, e._pos.z); n.px = e._pos.x; n.py = e._pos.y; n.pz = e._pos.z; }
    // occlusion 0 (same room) .. 1 (one wall or door) .. 2 (another building)
    const occ = K.occ ? K.occ(S) : this._occ(e);
    const act = K.act ? K.act(S) : 1;
    let lvl = e.gain * K.gain * (occ <= 1 ? 1 - 0.684 * occ : 0.316 * Math.max(0, 2 - occ) * 0.5), send;
    if (e.flat) { const u = Math.max(0, 1 - d / e.radius); lvl *= u * u; send = 0.7; }
    else send = Math.sqrt(e.ref / Math.max(d, e.ref));        // the room keeps sounding as the source recedes
    // air and walls
    const lpf = occ > 1 ? 420 : occ > 0.5 ? 700 + (1 - occ) * 1400 : occ > 0.3 ? 2200 : Math.max(1800, 18000 / (1 + d / 30));
    const c = e.cache;
    if (Math.abs(c[0] - lvl) > 0.002) { smooth(n.g.gain, lvl, now, 0.25); c[0] = lvl; }
    if (Math.abs(c[1] - send) > 0.01) { smooth(n.sg.gain, send, now, 0.25); c[1] = send; }
    if (Math.abs(c[2] - lpf) > 50) { smooth(n.lp.frequency, lpf, now, 0.25); c[2] = lpf; }
    // loops (created once their buffer exists)
    if (K.loop) {
      if (!n.loop) {
        const b = this._ready(K.loop.bank);
        if (b) {
          const s = this.ctx.createBufferSource(), g = this.ctx.createGain();
          s.buffer = b.bufs[0]; s.loop = true; g.gain.value = 0; s.connect(g); g.connect(n.inp); s.start(now, rand(0, s.buffer.duration));
          n.loop = { s, g };
        }
      }
      if (n.loop) smooth(n.loop.g.gain, K.loop.gain * (K.loopAct ? K.loopAct(S) : 1) * (1 + rand(-K.loop.flicker, K.loop.flicker)), now, 0.08);
    }
    // live voices (chant, the slit's moan)
    if (K.live) {
      const on = K.liveOn(S);
      if (on && !e.live) e.live = K.live(this, e);
      if (e.live) {
        e.live.tick(now, on, S, this);
        if (on) e.liveOff = null;
        else {
          if (e.liveOff == null) e.liveOff = now;
          if (now - e.liveOff > 8) { e.live.stop(); e.live = null; e.liveOff = null; }
        }
      }
    }
    // gestures
    const api = this.api; api.e = e;
    for (const ev of e.ev) {
      let guard = 0;
      while (ev.next < now + LOOK && guard++ < 16) {
        const t = Math.max(ev.next, now + 0.01);
        if (!ev.gen) {
          // too close for a sound that has no visible maker, or nobody to make it
          if (Math.random() > act || (e.far && d < e.far)) { ev.next = t + rand(...ev.d.gap); continue; }
          if (e.spot) { const p = e.spot(ev.d); if (!p) { ev.next = t + rand(...ev.d.gap); continue; } e.pos = p; }
          ev.gen = ev.d.run(api);
        }
        api.t = t;
        const r = ev.gen.next();
        if (r.done) { ev.gen = null; ev.next = t + rand(...ev.d.gap); } else ev.next = t + Math.max(0.02, r.value || 0);
      }
    }
  }

  _activate(e, now) {
    const C = this.ctx;
    const inp = C.createGain(), lp = C.createBiquadFilter(), g = C.createGain(), sg = C.createGain();
    lp.type = 'lowpass'; lp.frequency.value = 16000; lp.Q.value = 0.5; g.gain.value = 0; sg.gain.value = 0;
    inp.connect(lp); lp.connect(g); g.connect(sg); sg.connect(this.send);
    let pan = null;
    if (!e.flat) {
      pan = C.createPanner(); pan.panningModel = 'HRTF'; pan.distanceModel = 'inverse';
      pan.refDistance = e.ref; pan.rolloffFactor = 1; pan.maxDistance = 1000;
      setPos(pan, e._pos.x, e._pos.y, e._pos.z); g.connect(pan); pan.connect(this.dry);
    } else g.connect(this.dry);
    e.n = { inp, lp, g, sg, pan, loop: null, px: e._pos.x, py: e._pos.y, pz: e._pos.z };
    e.cache[0] = e.cache[1] = e.cache[2] = -1;
    // stagger first events so a room doesn't wake all at once
    e.ev = e.K.events.map(d => ({ d, next: now + 0.3 + rand(0, d.gap[1] * 0.6), gen: null }));
    e.active = true;
    this._enqueue(e.K.banks, true);
  }
  _deactivate(e) {
    const n = e.n, t = this.ctx.currentTime;
    e.active = false; e.n = null; e.ev = [];
    hold(n.g.gain, t); smooth(n.g.gain, 0, t, 0.15); hold(n.sg.gain, t); smooth(n.sg.gain, 0, t, 0.15);
    const live = e.live; e.live = null; e.liveOff = null;
    live?.stop();
    setTimeout(() => {
      if (n.loop) { try { n.loop.s.stop(); } catch (x) { /* stopped */ } n.loop.s.disconnect(); n.loop.g.disconnect(); }
      for (const k of ['inp', 'lp', 'g', 'sg', 'pan']) n[k]?.disconnect();
    }, 900);
  }

  addEmitter(o = {}) {
    if (!KINDS[o.kind]) { console.warn('[audio] unknown emitter kind', o.kind); return null; }
    const e = new Emitter(this, o);
    this.emitters.push(e);
    if (this.ctx) this._enqueue(e.K.banks);
    return e;
  }
  removeEmitter(e) {
    const i = this.emitters.indexOf(e); if (i < 0) return;
    this.emitters.splice(i, 1);
    if (e.active) this._deactivate(e);
  }

  // --- one-shots ---------------------------------------------------------------------
  _src(buf, when, rate) {
    const s = this.ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate;
    this.voices++;
    s.onended = () => { this.voices--; s.disconnect(); };
    s.start(when);
    return s;
  }
  // an emitter gesture: play a bank sample into the emitter's chain at time t
  _hit(e, bank, t, g = 1, rate = 1) {
    if (!e.n || this.voices >= CAP) return 0;
    const b = this._ready(bank); if (!b) return 0;
    // a visible animal or worker moves first, the sound follows
    if (e.onHit && e.onHit(bank, t - this.ctx.currentTime)) t += e.lead;
    const buf = this._pick(b), r = rate * rand(0.97, 1.03);
    const gn = this.ctx.createGain(); gn.gain.value = g * dB(rand(-1.5, 1.5)); gn.connect(e.n.inp);
    this._src(buf, t, r).connect(gn);
    return buf.duration / r;
  }
  // a free positional one-shot (NPCs, the far world outside)
  _shot(bank, x, y, z, g = 1, o = {}) {
    if (!this.ctx || !this.on || this.voices >= CAP) return 0;
    const b = this._ready(bank); if (!b) return 0;
    const C = this.ctx, S = this.S, buf = this._pick(b), r = (o.rate ?? 1) * rand(0.95, 1.05);
    const d = Math.hypot(x - S.x, y - S.y, z - S.z), ref = o.ref ?? 1.5;
    const gn = C.createGain(), lp = C.createBiquadFilter(), pan = C.createPanner(), sg = C.createGain();
    const occ = o.occ ?? 0;
    gn.gain.value = g * (1 - 0.684 * occ) * dB(rand(-1.5, 1.5));
    lp.type = 'lowpass'; lp.frequency.value = occ > 0.5 ? 700 : Math.min(o.lp ?? 18000, Math.max(1500, 18000 / (1 + d / 30)));
    pan.panningModel = 'equalpower'; pan.distanceModel = 'inverse'; pan.refDistance = ref; pan.rolloffFactor = 1; setPos(pan, x, y, z);
    sg.gain.value = Math.sqrt(ref / Math.max(d, ref));
    gn.connect(lp); lp.connect(pan); pan.connect(this.dry); lp.connect(sg); sg.connect(this.send);
    const s = this._src(buf, o.when ?? C.currentTime, r); s.connect(gn);
    s.addEventListener('ended', () => { gn.disconnect(); lp.disconnect(); pan.disconnect(); sg.disconnect(); });
    return buf.duration / r;
  }

  // the player's feet
  step(surface = 'stone', run = false, opts = {}) {
    if (!this.ctx || !this.on) return;
    let s = SURFACE_ALIAS[surface] || surface; if (!STEP_PLAY[s]) s = 'stone';
    if (this.voices >= CAP + 8) return;
    // one recorded bank per surface; running is the same foot, harder and quicker
    const b = this._bank('step:' + s);
    if (!b) return;
    const C = this.ctx, t = C.currentTime + (opts.delay || 0), buf = this._pick(b);
    const [lpf, trim] = STEP_PLAY[s];
    const f = C.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lpf * rand(0.8, 1.2); f.Q.value = 0.5;
    const g = C.createGain(); g.gain.value = trim * dB(rand(-2, 2)) * (run ? 1.3 : 1) * (opts.gain ?? 1);
    const src = this._src(buf, t, rand(0.97, 1.03) * (run ? 1.04 : 1) * (opts.rate ?? 1));
    src.connect(f); f.connect(g);
    const pan = opts.pan ?? (opts.foot === 'L' || opts.foot === 0 ? -0.06 : opts.foot === 'R' || opts.foot === 1 ? 0.06 : 0);
    if (pan && C.createStereoPanner) { const p = C.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(this.stepBus); src.addEventListener('ended', () => p.disconnect()); }
    else g.connect(this.stepBus);
    src.addEventListener('ended', () => { f.disconnect(); g.disconnect(); });
  }

  npcSound(kind, x, y, z, gain = 1, opts = {}) {
    if (!this.ctx || !this.on) return;
    const m = NPC[kind]; if (!m) return;
    const S = this.S, d = Math.hypot(x - S.x, y - S.y, z - S.z);
    if (d > 30) return;
    let bank = m[0];
    if (kind === 'chop' && S.indoor < 0.5) bank = 'axe';
    let occ = 0;
    if (opts.zone != null) occ = opts.zone !== S.zone && S.indoor > 0.5 ? 1 : 0;
    this._shot(bank, x, y, z, m[1] * gain, { ref: 1.5, occ, rate: kind.startsWith('step') ? rand(0.95, 1.08) : 1 });
  }

  // --- the bells ---------------------------------------------------------------------
  // "the bell rang for..." — inharmonic partials, a clapper transient, a long
  // hum; from the tower over the crossing when `bellPos` is set.
  bell(n = 3, base = 196) {
    if (!this.ctx || !this.on) return;
    const C = this.ctx, S = this.S, b = this._bank('bell'), t0 = C.currentTime + 0.05;
    if (!b) return;
    const g = C.createGain(), lp = C.createBiquadFilter(), sg = C.createGain();
    lp.type = 'lowpass';
    g.connect(lp); lp.connect(sg); sg.connect(this.send);
    let pan = null;
    if (this.bellPos) {
      const P = this.bellPos, px = P.x ?? P[0], py = P.y ?? P[1], pz = P.z ?? P[2];
      const d = Math.hypot(px - S.x, py - S.y, pz - S.z), ref = 14;
      // heard through the walls unless you stand under the tower's vault
      const occ = S.indoor > 0.5 && S.acoustic !== 'church' ? 1 : 0;
      pan = C.createPanner(); pan.panningModel = 'equalpower'; pan.distanceModel = 'inverse'; pan.refDistance = ref; pan.rolloffFactor = 1; setPos(pan, px, py, pz);
      g.gain.value = 1.3 * (occ ? 0.4 : 1);
      lp.frequency.value = occ ? 900 : Math.max(2500, 16000 / (1 + d / 60));
      sg.gain.value = 1.2 * Math.sqrt(ref / Math.max(d, ref));
      lp.connect(pan); pan.connect(this.dry);
    } else {
      g.gain.value = 0.8; lp.frequency.value = 12000; sg.gain.value = 0.6; lp.connect(this.dry);
    }
    // one cast bell: other callers may ask for a slightly different note,
    // never a cartoon transposition
    const buf = b.bufs[0], rate = Math.min(1.04, Math.max(0.92, base / 196));
    let last = null;
    for (let k = 0; k < n; k++) {
      const s = C.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate * (1 + rand(-0.002, 0.002));
      const sgk = C.createGain(); sgk.gain.value = dB(rand(-1.5, 0.5)); s.connect(sgk); sgk.connect(g);
      s.start(t0 + k * 3.2 + rand(-0.06, 0.06)); last = s;
      s.onended = () => { s.disconnect(); sgk.disconnect(); };
    }
    if (last) last.addEventListener('ended', () => { g.disconnect(); lp.disconnect(); sg.disconnect(); pan?.disconnect(); });
  }
  // the small hand bell of the interface (a struck bell, softly)
  chime() {
    if (!this.ctx || !this.on) return;
    const b = this._bank('handbell'); if (!b) return;
    const C = this.ctx, g = C.createGain(); g.gain.value = 0.35; g.connect(this.ui);
    const s = this._src(b.bufs[0], C.currentTime, rand(0.99, 1.01)); s.connect(g);
    s.addEventListener('ended', () => g.disconnect());
  }
  // a first observation noted: a quill's short scratch on the page, very
  // quiet — never a fanfare
  noteCue() {
    if (!this.ctx || !this.on) return;
    const b = this._bank('scratch'); if (!b) { this.lib?.want?.('scratch', true); return; }
    const C = this.ctx, g = C.createGain(); g.gain.value = 0.16; g.connect(this.ui);
    const f = C.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 900; f.connect(g);
    const s = this._src(this._pick(b), C.currentTime + 0.05, rand(1.0, 1.08)); s.connect(f);
    s.addEventListener('ended', () => { f.disconnect(); g.disconnect(); });
  }
  // a heavy hinge (the mirror door, the secret passages)
  creak() {
    if (!this.ctx || !this.on) return;
    const bk = this._bank('doorCreak'); if (!bk) return;
    const C = this.ctx, buf = bk.bufs[0];
    const g = C.createGain(); g.gain.value = 0.7; g.connect(this.dry); g.connect(this.send);
    const s = this._src(buf, C.currentTime, rand(0.9, 1.05)); s.connect(g);
    s.addEventListener('ended', () => g.disconnect());
  }
}

// the world beyond the walls, heard only outdoors: crows and far work
const around = (s, dmin, dmax, up) => { const a = Math.random() * 6.2832, d = rand(dmin, dmax); return [s.x + Math.cos(a) * d, s.y + up, s.z + Math.sin(a) * d]; };
const out = s => (s.indoor < 0.5 ? 1 : 0);
const AMBIENCE = [
  { gap: [20, 70], act: s => out(s) * (1 - 0.92 * s.night), *run(a) {
    const [x, y, z] = around(a.s, 35, 80, 15), r = rand(0.9, 1.1);
    for (let k = Math.floor(rand(1, 4)); k > 0; k--) { a.shot('caw', x, y, z, rand(0.5, 0.8), { ref: 8, rate: r, lp: 3500 }); yield rand(0.45, 0.75); }
  } },
  { gap: [45, 150], act: s => out(s) * (s.time > 7.5 && s.time < 16 ? 1 : 0), *run(a) {
    const [x, y, z] = around(a.s, 45, 80, 1), saw = Math.random() < 0.4;
    for (let k = Math.floor(rand(3, 8)); k > 0; k--) { const d = a.shot(saw ? 'saw' : 'axe', x, y, z, 0.6, { ref: 5, lp: 3000 }); yield saw ? Math.max(0.3, d * 0.9) : rand(1.4, 2); }
  } },
];
