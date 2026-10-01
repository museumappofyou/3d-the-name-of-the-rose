import { PLACES, CATEGORIES, byId, JOURNEY } from '../data/places.js';
import { VERSE } from '../data/mirror.js';
import { HOURS, hourAt } from '../systems/sky.js';
import { toPlan, AED } from '../core/plan.js';
import { LIB } from '../world/aedLibrary.js';
import { OSSUARY_PATH } from '../world/church.js';

const $ = id => document.getElementById(id);
const ICON = {
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12 3v2M6 17h12l-1.6-2.2V10a4.4 4.4 0 0 0-8.8 0v4.8z"/><path d="M10.4 19.5a1.8 1.8 0 0 0 3.2 0"/></svg>',
  bellOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6 17h12l-1.6-2.2V10a4.4 4.4 0 0 0-8.8 0v4.8zM4 4l16 16"/></svg>',
  clear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/></svg>',
  snow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 6l2.5-1.5M9.5 19.5 12 18l2.5 1.5"/></svg>',
  fog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 9h13M7 13h13M4 17h12M9 5h8"/></svg>',
  quill: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M20 3c-7 1-11 6-13 13l-2 5M7 16c4 0 8-2 10-7"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4.5h9.5a2.5 2.5 0 0 1 2.5 2.5v12.5H7.5A2.5 2.5 0 0 1 5 17z"/><path d="M5 17a2.5 2.5 0 0 1 2.5-2.5H17M9 8h5M9 11h4"/></svg>',
  help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M9.2 9a3 3 0 1 1 4.3 2.7c-1 .5-1.5 1.2-1.5 2.3M12 18h.01"/></svg>',
  full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
};

export class UI {
  constructor(app) {
    this.app = app;
    this.placeId = null;
    this.journey = -1;
    this.planImg = new Image(); this.planImg.src = './assets/plan.png';
    // library rooms walked through, remembered between visits (systems/notes.js)
    this.visited = app.notes ? app.notes.rooms : new Set();
    this.buildIndex();
    this.bindSeals();
    this.bindModes();
    this.bindPlan();
    this.buildHorarium();
    this.bindMirror();
    $('homeBtn').onclick = () => app.home();
    $('folioClose').onclick = () => this.closeFolio();
    $('walkHere').onclick = () => { const p = byId[this.placeId]; if (p) app.walkTo(p); };
    $('journeyBtn').onclick = () => this.startJourney();
    $('jPrev').onclick = () => this.stepJourney(-1);
    $('jNext').onclick = () => this.stepJourney(1);
    $('helpBtn').onclick = () => { $('helpSheet').hidden = false; this.credits(); };
    $('notesBtn').onclick = () => this.toggleNotes();
    $('helpClose').onclick = () => { $('helpSheet').hidden = true; };
    $('helpSheet').onclick = e => { if (e.target.id === 'helpSheet') $('helpSheet').hidden = true; };
    addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT') return;
      if (e.code === 'Escape') { $('planSheet').hidden = true; $('helpSheet').hidden = true; }
      if (e.code === 'KeyM') this.togglePlan();
      if (e.code === 'KeyI' && app.mode === 'aerial') this.toggleIndex();
      if (e.code === 'KeyJ') this.toggleNotes();
    });
  }

  // --- index ----------------------------------------------------------------
  buildIndex() {
    const list = $('indexList');
    const late = [];
    for (const c of CATEGORIES) {
      const h = document.createElement('div'); h.className = 'cat'; h.innerHTML = `<b>${c.latin}</b><i>${c.en}</i>`;
      list.append(h);
      for (const p of PLACES.filter(p => p.cat === c.id)) {
        if (p.late) { late.push(p); continue; }
        const b = document.createElement('button');
        b.className = 'place' + (p.sub ? ' sub' : '');
        b.dataset.id = p.id;
        b.innerHTML = `<span class="key ${p.key ? '' : 'none'}">${p.key || '·'}</span><span class="nm">${p.en}<small>${p.tr}</small></span>`;
        b.onclick = () => { this.journey = -1; this.select(p.id); if (innerWidth < 760) this.toggleIndex(false); };
        list.append(b);
      }
    }
    // places that belong to the end of the story are listed only on request
    if (late.length) {
      const t = document.createElement('button'); t.className = 'late-toggle'; t.setAttribute('aria-expanded', 'false');
      t.innerHTML = '<b>Loca arcana</b><i>places revealed later in the story — show</i>';
      const box = document.createElement('div'); box.className = 'late-list'; box.hidden = true;
      for (const p of late) {
        const b = document.createElement('button');
        b.className = 'place sub'; b.dataset.id = p.id;
        b.innerHTML = `<span class="key none">·</span><span class="nm">${p.en}<small>${p.tr}</small></span>`;
        b.onclick = () => { this.journey = -1; this.select(p.id); if (innerWidth < 760) this.toggleIndex(false); };
        box.append(b);
      }
      t.onclick = () => { box.hidden = !box.hidden; t.setAttribute('aria-expanded', !box.hidden); t.querySelector('i').textContent = box.hidden ? 'places revealed later in the story — show' : 'places revealed later in the story'; };
      list.append(t, box);
    }
    $('spineBtn').onclick = () => this.toggleIndex();
  }
  toggleIndex(force) {
    const idx = $('index'), sp = $('spineBtn');
    const open = force ?? idx.hidden;
    idx.hidden = !open; sp.setAttribute('aria-expanded', open);
  }

  // --- folio ------------------------------------------------------------------
  select(id, { fly = true } = {}) {
    const p = byId[id]; if (!p) return;
    this.placeId = id;
    document.querySelectorAll('.place').forEach(b => b.classList.toggle('active', b.dataset.id === id));
    const cat = CATEGORIES.find(c => c.id === p.cat);
    $('folioKicker').textContent = `${cat.latin}${p.key ? ' · ' + p.key : ''}`;
    $('folioTitle').textContent = p.en;
    $('folioTr').textContent = p.tr;
    const body = $('folioBody'); body.innerHTML = '';
    const para = document.createElement('p'); para.className = 'first'; para.textContent = p.text; body.append(para);
    for (const q of p.quotes || []) {
      const d = document.createElement('div'); d.className = 'quote';
      d.innerHTML = `<span class="q-tr"></span><span class="q-en"></span><span class="q-ref"></span>`;
      d.querySelector('.q-tr').textContent = q.tr; d.querySelector('.q-en').textContent = q.en; d.querySelector('.q-ref').textContent = q.ref;
      body.append(d);
    }
    if (p.note) { const g = document.createElement('p'); g.className = 'glossa'; g.innerHTML = '<b>Glossa</b>'; g.append(document.createTextNode(p.note)); body.append(g); }
    // what happens here later in the story waits behind a deliberate choice
    if (p.later) {
      const d = document.createElement('details'); d.className = 'later';
      d.innerHTML = '<summary>Historia <i>— what happens here later in the story</i></summary>';
      const t = document.createElement('p'); t.textContent = p.later; d.append(t); body.append(d);
    }
    $('folio').hidden = false;
    document.body.classList.add('reading');
    $('folio').style.animation = 'none'; void $('folio').offsetWidth; $('folio').style.animation = '';
    $('journeyNav').hidden = this.journey < 0;
    if (this.journey >= 0) {
      const j = JOURNEY[this.journey];
      $('jCount').textContent = `${j.day} · ${this.journey + 1} / ${JOURNEY.length}`;
      $('folioKicker').textContent = j.day;
      const line = document.createElement('p'); line.className = 'glossa'; line.innerHTML = '<b>Iter</b>'; line.append(document.createTextNode(j.line));
      body.prepend(line);
    }
    $('floors').hidden = p.cat !== 'aedificium';
    $('walkHere').hidden = false; $('folio').classList.remove('notes');
    if (fly) this.app.showPlace(p, this.journey >= 0 ? JOURNEY[this.journey].hour : null);
  }

  // --- the notebook: what has been seen, in the order it was seen -------------
  toggleNotes(force) {
    const open = force ?? !($('folio').classList.contains('notes') && !$('folio').hidden);
    if (!open) { this.closeFolio(); return; }
    this.showNotes();
  }
  showNotes() {
    const nb = this.app.notes, list = nb ? nb.list() : [];
    this.placeId = null; this.journey = -1;
    $('folioKicker').textContent = 'Notae';
    $('folioTitle').textContent = 'What you have seen';
    $('folioTr').textContent = 'Gördükleriniz';
    const body = $('folioBody'); body.innerHTML = '';
    if (!list.length) {
      const p = document.createElement('p'); p.className = 'first';
      p.textContent = 'Nothing yet. Look closely at things (E) as you walk: what is worth remembering is written here.';
      body.append(p);
    }
    for (const n of list) {
      const art = document.createElement('section'); art.className = 'nota';
      art.dataset.evidence = n.evidence.map(e => `${e.id} (${e.status})`).join('; ');
      const h = document.createElement('h3'); h.textContent = n.title; art.append(h);
      const w = document.createElement('p'); w.className = 'where'; w.textContent = n.by === 'severinus' ? 'the herb garden, from Severinus' : n.where; art.append(w);
      const seen = document.createElement('p'); seen.textContent = n.seen; art.append(seen);
      if (n.reading) { const r = document.createElement('p'); r.className = 'reading'; r.textContent = n.reading; art.append(r); }
      if (n.moreSeen) {
        const m = document.createElement('p'); m.className = 'more'; m.dataset.evidence = n.moreSeen.evidence.map(e => `${e.id} (${e.status})`).join('; ');
        const lab = document.createElement('span'); lab.className = 'where'; lab.textContent = n.moreSeen.where + ' — ';
        m.append(lab, document.createTextNode(n.moreSeen.seen)); art.append(m);
      }
      body.append(art);
    }
    if (nb?.route >= 0) { const r = document.createElement('p'); r.className = 'glossa'; r.innerHTML = '<b>In mappa</b>'; r.append(document.createTextNode('The way you walked under the church is drawn on the plan in red.')); body.append(r); }
    $('walkHere').hidden = true; $('journeyNav').hidden = true; $('floors').hidden = true;
    $('folio').classList.add('notes'); $('folio').hidden = false;
    document.body.classList.add('reading');
    $('folio').style.animation = 'none'; void $('folio').offsetWidth; $('folio').style.animation = '';
  }
  // the quiet mark of a first observation: a slip in the margin, no more
  noteCue(title) {
    const c = $('notaCue');
    c.innerHTML = '<span class="mark">✠</span><span><b>Nota</b> ' + title.replace(/[<>&]/g, '') + '</span><small>J — the notebook</small>';
    c.classList.add('on'); $('notesBtn').classList.add('fresh');
    clearTimeout(this._nc); this._nc = setTimeout(() => c.classList.remove('on'), 4200);
    if ($('folio').classList.contains('notes') && !$('folio').hidden) this.showNotes();
  }
  closeFolio() { $('folio').hidden = true; $('folio').classList.remove('notes'); $('notesBtn').classList.remove('fresh'); document.body.classList.remove('reading'); this.placeId = null; this.journey = -1; document.querySelectorAll('.place').forEach(b => b.classList.remove('active')); }
  startJourney() { this.journey = 0; this.toggleIndex(false); this.select(JOURNEY[0].id); }
  stepJourney(d) {
    this.journey = (this.journey + d + JOURNEY.length) % JOURNEY.length;
    const j = JOURNEY[this.journey];
    this.select(j.id);
  }

  // --- credits: every recording and model, with author and licence ----------
  async credits() {
    if (this._credits) return;
    this._credits = true;
    const el = $('creditsBody');
    try {
      const c = await (await fetch('./assets/credits.json')).json();
      const esc = t => String(t).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
      el.innerHTML = c.groups.map(g => `<h4>${esc(g.title)}</h4><ul>${g.items.map(i =>
        `<li><a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.title)}</a> — ${esc(i.author)} · <span class="lic">${esc(i.license)}</span>${i.note ? ` · ${esc(i.note)}` : ''}</li>`).join('')}</ul>`).join('');
    } catch (e) { el.textContent = 'See docs/assets/AUDIO_SOURCES.md and docs/assets/MODEL_SOURCES.md.'; }
  }

  // --- seals ----------------------------------------------------------------
  bindSeals() {
    const s = $('soundBtn'), w = $('weatherBtn'), q = $('qualityBtn'), f = $('fullBtn');
    s.innerHTML = ICON.bellOff; $('helpBtn').innerHTML = ICON.help; f.innerHTML = ICON.full; $('notesBtn').innerHTML = ICON.book;
    s.onclick = () => { const on = this.app.toggleSound(); s.innerHTML = on ? ICON.bell : ICON.bellOff; s.setAttribute('aria-pressed', on); this.toast(on ? 'The bells, the wind and the fire can be heard' : 'Silence, as in the refectory'); };
    const weathers = [['clear', ICON.clear, 'Clear winter sky'], ['snow', ICON.snow, 'Light snow, as on the first night'], ['fog', ICON.fog, 'The milky fog of the fourth and fifth days']];
    let wi = 0;
    const setW = () => { const [id, ic, label] = weathers[wi]; w.innerHTML = ic + `<span class="badge">${id}</span>`; w.title = label; this.app.setWeather(id); };
    w.onclick = () => { wi = (wi + 1) % weathers.length; setW(); this.toast(weathers[wi][2]); };
    setW();
    this.setWeatherIndex = id => { wi = weathers.findIndex(x => x[0] === id); if (wi < 0) wi = 0; setW(); };
    const qualities = [['high', 'Fine'], ['balanced', 'Balanced'], ['low', 'Swift']];
    let qi = this.app.qualityIndex ?? 0;
    const setQ = () => { q.innerHTML = ICON.quill + `<span class="badge">${qualities[qi][1]}</span>`; this.app.setQuality(qualities[qi][0]); };
    q.onclick = () => { qi = (qi + 1) % qualities.length; setQ(); this.toast(`Image quality: ${qualities[qi][1].toLowerCase()}`); };
    setQ();
    f.onclick = () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {}); else document.exitFullscreen?.(); };
  }
  bindModes() {
    $('aerialBtn').onclick = () => this.app.setMode('aerial');
    $('walkBtn').onclick = () => this.app.setMode('walk');
    document.querySelectorAll('#floors button').forEach(b => b.onclick = () => this.app.setCut(+b.dataset.cut));
  }
  setMode(mode) {
    $('aerialBtn').classList.toggle('active', mode === 'aerial'); $('aerialBtn').setAttribute('aria-pressed', mode === 'aerial');
    $('walkBtn').classList.toggle('active', mode === 'walk'); $('walkBtn').setAttribute('aria-pressed', mode === 'walk');
    $('crosshair').hidden = mode !== 'walk';
    $('gloss').hidden = mode !== 'walk';
    if (mode === 'walk') { $('gloss').classList.remove('fade'); clearTimeout(this._gt); this._gt = setTimeout(() => $('gloss').classList.add('fade'), 9000); }
    if (mode === 'walk') { this.toggleIndex(false); $('floors').hidden = true; }
    $('touch').hidden = !(mode === 'walk' && matchMedia('(pointer: coarse)').matches);
    if (mode !== 'walk') { this.prompt(null); $('roomCard').hidden = true; }
  }
  setCut(level) { document.querySelectorAll('#floors button').forEach(b => b.classList.toggle('active', +b.dataset.cut === level)); }

  // --- horarium -----------------------------------------------------------------
  buildHorarium() {
    const svg = $('horaSvg'), NS = 'http://www.w3.org/2000/svg';
    const cx = 180, cy = 112, R = 92;
    const ang = t => Math.PI - (t / 24) * Math.PI;
    const pt = (t, r = R) => [cx + Math.cos(ang(t)) * r, cy - Math.sin(ang(t)) * r];
    const arc = (t0, t1, r) => { const [x0, y0] = pt(t0, r), [x1, y1] = pt(t1, r); return `M${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1}`; };
    const el = (tag, attrs, parent = svg) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.append(e); return e; };
    el('path', { d: arc(0, 24, R + 10), stroke: 'rgba(20,10,4,.55)', 'stroke-width': 26, fill: 'none', 'stroke-linecap': 'round' });
    el('path', { d: arc(0, 7.3, R), stroke: '#1f3a7a', 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round' });
    el('path', { d: arc(7.3, 16.8, R), stroke: '#e2bd62', 'stroke-width': 5, fill: 'none' });
    el('path', { d: arc(16.8, 24, R), stroke: '#1f3a7a', 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round' });
    for (let h = 0; h < 24; h++) { const [x0, y0] = pt(h, R - 5), [x1, y1] = pt(h, R + 5); el('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: 'rgba(241,226,191,.5)', 'stroke-width': 1 }); }
    this.ticks = HOURS.map(h => {
      const g = el('g', { class: 'hora-tick', tabindex: 0, role: 'button', 'aria-label': `${h.latin} — ${h.en}` });
      const [x, y] = pt(h.t, R); const [lx, ly] = pt(h.t, R + 22);
      el('circle', { cx: x, cy: y, r: 5, 'stroke-width': 1.5 }, g);
      const t = el('text', { x: lx, y: ly + 4, 'text-anchor': 'middle' }, g); t.textContent = h.latin.slice(0, h.latin === 'Completorium' ? 5 : 4);
      g.addEventListener('click', e => { e.stopPropagation(); this.app.setTime(h.t, true); });
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') this.app.setTime(h.t, true); });
      return { g, h };
    });
    this.sun = el('g', {});
    el('circle', { r: 11, fill: '#e2bd62', stroke: '#6b4d12', 'stroke-width': 1.5 }, this.sun);
    this.sunFace = el('path', { d: 'M-4 -2 h1 M3 -2 h1 M-3.5 3 q3.5 2.5 7 0', stroke: '#6b4d12', 'stroke-width': 1.4, fill: 'none', 'stroke-linecap': 'round' }, this.sun);
    this.moon = el('path', { d: 'M3 -10 a10 10 0 1 0 0 20 a7.5 7.5 0 1 1 0 -20z', fill: '#e8e2d0', stroke: '#1f3a7a', 'stroke-width': 1.2 }, this.sun);
    this.pt = pt;
    // drag along the arc
    let drag = false;
    const toT = e => {
      const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 360, y = (e.clientY - r.top) / r.height * 120;
      let a = Math.atan2(cy - y, x - cx); if (a < 0) a = a < -Math.PI / 2 ? Math.PI : 0;
      return (Math.PI - a) / Math.PI * 24;
    };
    svg.addEventListener('pointerdown', e => { drag = true; svg.setPointerCapture(e.pointerId); this.app.setTime(toT(e)); });
    svg.addEventListener('pointermove', e => { if (drag) this.app.setTime(toT(e)); });
    svg.addEventListener('pointerup', () => { drag = false; });
  }
  updateTime(t) {
    const [x, y] = this.pt(t);
    this.sun.setAttribute('transform', `translate(${x} ${y})`);
    const day = t > 7.3 && t < 16.8;
    this.sunFace.style.display = day ? '' : 'none';
    this.sun.firstChild.style.display = day ? '' : 'none';
    this.moon.style.display = day ? 'none' : '';
    const h = hourAt(t);
    if (h !== this._hour) {
      this._hour = h;
      $('horaLatin').textContent = h.latin; $('horaTr').textContent = `${h.tr} · ${h.en}`;
      this.ticks.forEach(k => k.g.classList.toggle('on', k.h === h));
    }
  }

  // --- plan / map -------------------------------------------------------------------
  bindPlan() {
    $('mappa').onclick = () => this.togglePlan(true);
    $('planClose').onclick = () => this.togglePlan(false);
    $('planSheet').onclick = e => { if (e.target.id === 'planSheet') this.togglePlan(false); };
    const c = $('planCanvas');
    c.addEventListener('mousemove', e => { this.planHover = this.hitPlan(e); this.drawPlanSheet(); c.style.cursor = this.planHover ? 'pointer' : 'crosshair'; });
    c.addEventListener('click', e => { const p = this.hitPlan(e); if (p) { this.togglePlan(false); this.journey = -1; this.select(p.id); } });
  }
  togglePlan(force) {
    const s = $('planSheet'); const open = force ?? s.hidden;
    s.hidden = !open;
    if (open) { this.app.releasePointer(); this.drawPlanSheet(); }
  }
  hitPlan(e) {
    const c = $('planCanvas'), r = c.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width * 628, py = (e.clientY - r.top) / r.height * 481;
    let best = null, bd = 22;
    for (const p of PLACES) {
      if (!p.view || p.sub) continue;
      const [x, y] = toPlan(p.view.t[0], p.view.t[2]);
      const d = Math.hypot(px - x, py - y);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }
  drawPlanSheet() {
    const c = $('planCanvas'), g = c.getContext('2d'), s = c.width / 628;
    g.fillStyle = '#efe4c8'; g.fillRect(0, 0, c.width, c.height);
    if (this.planImg.complete) { g.globalAlpha = 0.92; g.globalCompositeOperation = 'multiply'; g.drawImage(this.planImg, 0, 0, c.width, c.height); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; }
    for (const p of PLACES) {
      if (!p.view || p.sub) continue;
      const [x, y] = toPlan(p.view.t[0], p.view.t[2]);
      const hot = this.planHover === p;
      g.beginPath(); g.arc(x * s, y * s, hot ? 14 : 7, 0, 7);
      g.fillStyle = hot ? 'rgba(164,35,26,.85)' : 'rgba(164,35,26,.45)'; g.fill();
      if (hot) { g.font = '600 30px "Grenze Gotisch", serif'; g.fillStyle = '#2a1d12'; g.textAlign = 'center'; g.fillText(p.en, x * s, y * s - 22); }
    }
    this.drawRoute(g, s, 2);
    this.drawMarker(g, s, 2);
    $('planTitle').textContent = this.planHover ? this.planHover.en : 'The plan printed in the novel';
  }
  // the passage under the church, as far as it has been walked (drawn only
  // from the player's own steps: see main.js trackPassage())
  drawRoute(g, s, k = 1) {
    const n = this.app.notes?.route ?? -1; if (n < 0) return;
    const pts = OSSUARY_PATH.slice(0, Math.min(OSSUARY_PATH.length, n + 1)).map(([x, z]) => toPlan(x, z));
    if (pts.length < 2) { const [x, y] = pts[0]; g.fillStyle = 'rgba(164,35,26,.8)'; g.beginPath(); g.arc(x * s, y * s, 2.4 * k, 0, 7); g.fill(); return; }
    g.save(); g.strokeStyle = 'rgba(164,35,26,.82)'; g.lineWidth = 1.6 * k; g.setLineDash([4 * k, 3 * k]); g.lineCap = 'round';
    g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x * s, y * s) : g.moveTo(x * s, y * s)); g.stroke(); g.setLineDash([]);
    if (k > 1.5) { const [x, y] = pts[Math.floor(pts.length / 2)]; g.font = 'italic 22px Garamond, serif'; g.fillStyle = '#a4231a'; g.textAlign = 'left'; g.fillText('per ossuarium', x * s + 8, y * s - 8); }
    g.restore();
  }
  drawMarker(g, s, k = 1) {
    const m = this.app.marker(); if (!m) return;
    const [x, y] = toPlan(m.x, m.z);
    g.save(); g.translate(x * s, y * s); g.rotate(-m.yaw);
    g.fillStyle = 'rgba(164,35,26,.28)'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 30 * k, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5); g.closePath(); g.fill();
    g.fillStyle = '#a4231a'; g.strokeStyle = '#f5e9cc'; g.lineWidth = 1.5 * k;
    g.beginPath(); g.moveTo(0, -7 * k); g.lineTo(5 * k, 6 * k); g.lineTo(0, 3 * k); g.lineTo(-5 * k, 6 * k); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }
  // the small map: the plan, or in the library the chart William draws
  drawMappa(libraryRoom) {
    const c = $('mappaCanvas'), g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    if (libraryRoom !== undefined && libraryRoom !== null) { this.drawLibraryMap(g, c, libraryRoom); $('mappaLabel').textContent = 'Labyrinthus'; return; }
    $('mappaLabel').textContent = 'Planum Abbatiae';
    const m = this.app.marker();
    // zoomed plan centred on the viewer
    const zoom = 1.25;
    const [px, py] = m ? toPlan(m.x, m.z) : [314, 240];
    const s = c.width / 628 * zoom;
    const ox = Math.max(0, Math.min(628 - c.width / s, px - c.width / s / 2)), oy = Math.max(0, Math.min(481 - c.height / s, py - c.height / s / 2));
    g.fillStyle = '#efe4c8'; g.fillRect(0, 0, c.width, c.height);
    if (this.planImg.complete) { g.globalCompositeOperation = 'multiply'; g.drawImage(this.planImg, ox, oy, c.width / s, c.height / s, 0, 0, c.width, c.height); g.globalCompositeOperation = 'source-over'; }
    g.save(); g.translate(-ox * s, -oy * s); this.drawRoute(g, s, 1.1); this.drawMarker(g, s, 1.1); g.restore();
  }
  drawLibraryMap(g, c, current) {
    g.fillStyle = '#efe4c8'; g.fillRect(0, 0, c.width, c.height);
    const S = 3.9, cx = c.width / 2, cy = c.height / 2;
    const T = ([x, z]) => [cx + x * S, cy + z * S];
    g.lineJoin = 'round';
    for (const r of LIB.rooms) {
      const seen = this.visited.has(r.id);
      g.beginPath(); r.poly.forEach((p, i) => { const [a, b] = T(p); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.closePath();
      g.fillStyle = r.id === current ? 'rgba(164,35,26,.35)' : seen ? 'rgba(181,139,52,.22)' : 'rgba(90,60,30,.04)';
      g.fill();
      g.strokeStyle = seen ? 'rgba(42,29,18,.75)' : 'rgba(42,29,18,.12)'; g.lineWidth = seen ? 1.2 : 0.6; g.stroke();
      if (seen && r.letter) {
        const [a, b] = T(r.center);
        g.font = `${r.red ? '600 ' : ''}13px "Grenze Gotisch", serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = r.red ? '#a4231a' : '#2a1d12'; g.fillText(r.letter, a, b);
      }
    }
    // doorways of visited rooms as gaps
    for (const e of LIB.edges) {
      if (!(e.door || e.mirror) || !e.rooms.some(id => this.visited.has(id))) continue;
      const m = T([(e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2]);
      g.fillStyle = e.mirror ? '#1f3a7a' : '#efe4c8'; g.beginPath(); g.arc(m[0], m[1], e.mirror ? 2.2 : 1.8, 0, 7); g.fill();
    }
    const mk = this.app.marker();
    if (mk) {
      const [a, b] = T([mk.x - AED.x, mk.z - AED.z]);
      g.fillStyle = '#a4231a'; g.beginPath(); g.arc(a, b, 3, 0, 7); g.fill();
    }
  }

  // --- HUD -----------------------------------------------------------------------------
  banner(zone) {
    if (!zone) return;
    $('bannerLatin').textContent = zone.latin; $('bannerTr').textContent = `${zone.tr} · ${zone.en}`;
    const b = $('banner'); b.classList.add('on');
    clearTimeout(this._bt); this._bt = setTimeout(() => b.classList.remove('on'), 3800);
  }
  room(room) {
    const card = $('roomCard');
    if (!room) { card.hidden = true; return; }
    if (this.app.notes) this.app.notes.addRoom(room.id); else this.visited.add(room.id);
    card.hidden = false;
    const words = room.words?.length ? room.words.join(' · ') : (room.kind === 'blind' ? 'a blind room' : '');
    card.innerHTML = `<span class="letter ${room.red ? 'red' : ''}">${room.letter || '✠'}</span><span class="verse"></span><span class="words"></span>`;
    card.querySelector('.verse').textContent = room.verse || (room.id === 'E.T3' ? 'no scroll — a stone altar beneath the window' : '');
    card.querySelector('.words').textContent = words + (room.holdings ? ' — ' + room.holdings : '');
    clearTimeout(this._rt); this._rt = setTimeout(() => { card.hidden = true; }, 6500);
  }
  prompt(text) {
    const p = $('prompt');
    if (!text) { p.hidden = true; $('crosshair').classList.remove('hot'); return; }
    p.hidden = false; p.innerHTML = `<kbd>E</kbd> ${text}`;
    $('crosshair').classList.add('hot');
  }
  toast(text, ms = 3600) {
    const t = $('toast'); t.textContent = text; t.classList.add('on');
    clearTimeout(this._tt); this._tt = setTimeout(() => t.classList.remove('on'), ms);
  }
  loader(p, text) {
    $('loaderBar').style.width = `${Math.round(p * 100)}%`;
    if (text) $('loaderStatus').textContent = text;
    if (p >= 1) setTimeout(() => $('loader').classList.add('done'), 300);
  }

  // --- mirror verse --------------------------------------------------------------------
  bindMirror() {
    const box = $('verseLetters');
    [...VERSE].forEach((ch, i) => {
      const b = document.createElement('button'); b.textContent = ch; b.dataset.i = i;
      if (ch === ' ') { b.disabled = true; b.innerHTML = '&nbsp;'; }
      b.onclick = () => this.app.pressLetter(i, ch, b);
      box.append(b);
    });
  }
  showMirror(open) {
    $('mirrorVerse').hidden = !open;
    if (!open) document.querySelectorAll('#verseLetters button').forEach(b => b.classList.remove('pressed'));
  }
}
