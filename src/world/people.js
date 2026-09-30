import * as THREE from 'three';
import { phaseAt, officeAt } from '../systems/horarium.js';
import { height, baseHeight } from './terrain.js';
import { makeFigure, setPose, updateFigure, setHood, sackMesh, loadFigures } from './people/figure.js';
import { scene as sceneFor } from './people/schedule.js';

// The inhabitants of the abbey: monks, novices, lay brothers, cooks,
// servants, herdsmen and peasants, placed and moved by the horarium.
//
// A capped pool of skinned characters (people/figure.js: scanned heads and
// hands, fitted habits, recorded motion) is reassigned each cycle to the slots
// the current canonical hour calls for, nearest the camera first, so the
// scene is populated where you are looking without ever animating a crowd.
// Distance activation: rigs animate only within ~60 m; beyond that they
// freeze (still drawn) and past ~150 m the whole population is hidden. In
// the aerial far view only a few distant walkers remain.
//
// Evidence: evidence_life.md §0–§2, §9. Figures are not walker colliders
// (no collision); they stand on real floors (indoor y from the builders)
// or on the terrain (height() outdoors).

const ACTIVE_R = 60;      // animate within this radius
const DRAW_R = 155;       // beyond this, hide on foot
const LIVE = 46;          // hard cap on figures drawn at once
const RECYCLE = 0.45;     // seconds between reassignments
// The wardrobe: rigs are permanently dressed, so each kind has its own
// pool, sized for the largest call on it (the full choir: 36 monks in the
// stalls, the waker and a few at the altar; six novices). Named people have
// a rig of their own, so Malachi or Alinardo keep one face at every hour.
const POOLS = { monk: 40, novice: 6, servant: 10, herd: 4, peasant: 4 };
// the head each named person wears (figure.js HEADS), and his kind
const NAMED = {
  abbot: { kind: 'abbot', head: 'male_32', seed: 11 },
  malachi: { kind: 'monk', head: 'male_10', seed: 23, hood: true },
  ubertino: { kind: 'monk', head: 'male_5', seed: 37 },
  alinardo: { kind: 'monk', head: 'male_32', seed: 41, hood: true },
  severinus: { kind: 'monk', head: 'male_6', seed: 53 },
};

export function buildPeople(M, ctx) {
  loadFigures();
  const root = new THREE.Group(); root.name = 'people';
  ctx.scene.add(root);

  // Each rig hides until assigned. Within a pool the scanned faces are dealt
  // round, so neighbours seldom share one (and assign() below avoids it).
  const rigs = [], byKind = {}, named = {};
  const addRig = (kind, seed, opts) => {
    const g = makeFigure(kind, seed, opts);
    g.visible = false; g.matrixAutoUpdate = true; root.add(g);
    const rig = { g, kind, busy: false, slot: null, key: null, phase: (seed * 0.618) % 1, pose: 'stand', group: null, idx: rigs.length };
    rigs.push(rig); return rig;
  };
  // rigs are dressed the first time a slot of their kind needs one (up to
  // the pool's size), so loading does not pay for the full choir up front
  const newOf = kind => { const pool = byKind[kind], i = pool.length; if (i >= (POOLS[kind] || 0)) return null; const r = addRig(kind, (i + 1) * 2654435761 % 100000 + kind.length * 7, { deal: i }); pool.push(r); return r; };
  for (const kind of Object.keys(POOLS)) byKind[kind] = [];
  const namedRig = name => { if (!named[name]) { const o = NAMED[name]; named[name] = addRig(o.kind, o.seed, { head: o.head, hood: o.hood }); named[name].named = name; } return named[name]; };
  // a few carried sacks, attached when a peasant carries
  const sacks = [];
  const stats = { wanted: 0, drawn: 0, short: {} };
  ctx.people = { rigs, stats };

  // resolve a slot's world y: indoor slots carry their own y; outdoor
  // (ground:true or area/file) sit on the terrain. Where a builder has
  // sunk the ground under a footprint (height ≪ base), fall back to the
  // true terrain so outdoor figures near a building don't drop into a pit.
  const groundY = (x, z) => {
    const h = height(x, z), b = baseHeight(x, z);
    return (h < b - 1.0 ? b : h) - 0.02;
  };

  // Outdoor figures must stand on the ground, not inside a straw heap, a
  // cart or a fence: once the colliders exist, look straight down at the
  // spot and, if something stands there, step aside to the nearest clear
  // ground. Results are cached (targets are rebuilt every recycle).
  const clearCache = new Map();
  const clearGround = (x, z) => {
    const key = Math.round(x * 10) + ',' + Math.round(z * 10);
    if (clearCache.has(key)) return clearCache.get(key);
    const app = globalThis.__abbey;
    if (!app?.walker?.colliders?.[0]?.mesh?.geometry?.boundsTree) return [x, z, groundY(x, z)];
    let res = null;
    for (let k = 0; k < 10 && !res; k++) {
      const a = k * 2.4, rr = k ? 0.5 + k * 0.3 : 0, px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr;
      const gy = groundY(px, pz), hy = app.groundY(px, pz, gy + 2.2);
      if (hy < gy + 0.3) res = [px, pz, Math.max(gy, hy - 0.02)];
    }
    res = res || [x, z, groundY(x, z)];
    clearCache.set(key, res);
    return res;
  };
  // Expand a group's declaration into concrete target slots, each with a
  // stable key (the same seat keeps the same person between reassignments)
  function targets(group) {
    const list = [];
    if (group.slots) {
      group.slots.forEach((s, i) => {
        const key = group.id + ':' + i;
        if (!s.ground) { list.push({ ...s, key }); return; }
        const [x, z, y] = clearGround(s.x, s.z);
        list.push({ ...s, x, z, y, key });
      });
    }
    if (group.walkers) {
      // monks pacing the cloister ring
      const w = group.walkers, cap = group.cap || 4;
      for (let i = 0; i < cap; i++) {
        const t = (i / cap) * Math.PI * 2;
        list.push({ x: w.cx + Math.cos(t) * w.w, z: w.cz + Math.sin(t) * w.h, ry: Math.atan2(-w.w * Math.sin(t), w.h * Math.cos(t)), y: groundY(w.cx + Math.cos(t) * w.w, w.cz + Math.sin(t) * w.h), ring: true, key: group.id + ':w' + i });
      }
    }
    if (group.file) {
      // a procession spaced along a polyline
      const pts = group.file, cap = group.cap || 8;
      const seg = [];
      let total = 0;
      for (let i = 0; i < pts.length - 1; i++) { const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); seg.push(d); total += d; }
      for (let i = 0; i < cap; i++) {
        const dist = (i + 0.5) / cap * total;
        let acc = 0, k = 0;
        while (k < seg.length - 1 && acc + seg[k] < dist) { acc += seg[k]; k++; }
        const f = seg[k] ? (dist - acc) / seg[k] : 0;
        const x = pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f, z = pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f;
        const ry = Math.atan2(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1]); // figures face local +z
        list.push({ x, z, ry, y: groundY(x, z), file: true, dist, seg, pts, total, key: group.id + ':f' + i });
      }
    }
    if (group.area) {
      const a = group.area, r = mul(group.id);
      for (let i = 0; i < a.n; i++) {
        const ang = r() * Math.PI * 2, rad = r() * a.r;
        const [x, z, y] = clearGround(a.x + Math.cos(ang) * rad, a.z + Math.sin(ang) * rad);
        // face the centre of the work, not a random wall
        const ry = Math.atan2(a.x - x, a.z - z) + (r() - 0.5) * 1.2;
        list.push({ x, z, ry, y, scatter: true, key: group.id + ':a' + i });
      }
    }
    return list;
  }

  // where each moving slot has got to (targets are rebuilt at every recycle)
  const motion = new Map();
  const mstate = t => { let m = motion.get(t.key); if (!m) { m = {}; motion.set(t.key, m); } return m; };

  // Assignment state
  let sinceRecycle = 1e3;
  let assigns = [];          // {rig, target, group}
  let lastKey = '';
  let held = new Map();      // slot key -> rig, from the previous reassignment

  function recycle(st) {
    const phase = st.phase, office = st.office;
    const groups = sceneFor(phase, office, st.time);
    const cam = st.cam;
    // build a flat list of (group, target) with distance, filter to draw radius
    const cands = [];
    for (const grp of groups) {
      for (const t of targets(grp)) {
        const d = Math.hypot(t.x - cam.x, t.z - cam.z);
        // aerial far: keep only outdoor walkers/processions
        if (st.mode === 'aerial') {
          const farCam = cam.y > 90 || d > 220;
          if (farCam && !(grp.walkers || grp.file || grp.area)) continue;
          if (d > 400) continue;
        } else if (d > DRAW_R) continue;
        cands.push({ grp, t, d });
      }
    }
    cands.sort((a, b) => a.d - b.d);
    const chosen = cands.slice(0, LIVE);
    stats.wanted = cands.length; stats.short = {};
    for (const r of rigs) r.busy = false;
    const next = new Map(), out = new Array(chosen.length).fill(null);
    const bind = (i, rig) => { const c = chosen[i]; rig.busy = true; rig.group = c.grp; rig.slot = c.t; rig.key = c.t.key; next.set(c.t.key, rig); out[i] = { rig, t: c.t, grp: c.grp }; };
    // 1. named people wear their own rig; 2. a seat keeps last cycle's person
    chosen.forEach((c, i) => { const n = c.grp.named && NAMED[c.grp.named] && namedRig(c.grp.named); if (n && !n.busy) bind(i, n); });
    chosen.forEach((c, i) => {
      if (out[i]) return;
      const r = held.get(c.t.key);
      if (r && !r.busy && !r.named && r.kind === c.grp.kind) bind(i, r);
    });
    // 3. the rest, nearest first, from the pool of their own dress: prefer a
    // rig that is hidden now (no one vanishes from view to reappear
    // elsewhere) and a face unlike those of the neighbours already seated
    chosen.forEach((c, i) => {
      if (out[i]) return;
      const pool = byKind[c.grp.kind] || [];
      let best = null, bs = Infinity;
      for (const r of pool) {
        if (r.busy) continue;
        let s = r.g.visible ? 4 : 0;
        const head = r.g.userData.head;
        for (const o of out) if (o && o.rig.g.userData.head === head && Math.hypot(o.t.x - c.t.x, o.t.z - c.t.z) < 3.4) s += 10;
        if (s < bs) { bs = s; best = r; if (s === 0) break; }
      }
      if (!best) best = newOf(c.grp.kind);
      if (best) bind(i, best);
      else stats.short[c.grp.kind] = (stats.short[c.grp.kind] || 0) + 1;   // better an empty place than the wrong dress
    });
    assigns = out.filter(Boolean);
    stats.drawn = assigns.length;
    held = next;
    // hide the rest
    for (const r of rigs) if (!r.busy) r.g.visible = false;
  }

  const _v = new THREE.Vector3();
  let soundClock = 0;

  ctx.onUpdate((dt, st) => {
    if (ctx.people.frozen) return;   // (debug: a posed figure held for inspection)
    sinceRecycle += dt;
    const key = st.phase.id + (st.office?.id || '') + st.mode + (st.office?.id === 'matins' && st.time > 2.75 ? ':lessons' : '');
    if (sinceRecycle > RECYCLE || key !== lastKey) { recycle(st); sinceRecycle = 0; lastKey = key; }

    const cam = st.cam;
    soundClock -= dt;
    for (const a of assigns) {
      const { rig, t, grp } = a;
      const g = rig.g;
      g.visible = true;
      // position
      g.position.set(t.x, t.y ?? 0, t.z);
      const d = Math.hypot(t.x - cam.x, t.z - cam.z);
      const active = d < ACTIVE_R && st.mode === 'walk';

      // movement for walkers / processions along their ring / file
      if (grp.walkers && active) {
        // pacing the cloister walk at an unhurried 1 m/s, the stride of the
        // recorded formal walk
        const w = grp.walkers;
        const m = mstate(t);
        const ang = m.ringAng ?? (m.ringAng = Math.atan2((t.z - w.cz) / w.h, (t.x - w.cx) / w.w));
        const na = ang + dt * 1.0 / ((w.w + w.h) / 2);
        m.ringAng = na;
        const nx = w.cx + Math.cos(na) * w.w, nz = w.cz + Math.sin(na) * w.h;
        g.position.set(nx, groundY(nx, nz), nz);
        g.rotation.y = Math.atan2(-w.w * Math.sin(na), w.h * Math.cos(na));
        setPose(g, 'walk', rig.phase, st.time);
      } else if (grp.file && active) {
        // a procession moves along its file (and comes round again)
        const m = mstate(t);
        m.dist = ((m.dist ?? t.dist) + dt * 0.95) % t.total;
        const dist = m.dist;
        let acc = 0, k = 0;
        while (k < t.seg.length - 1 && acc + t.seg[k] < dist) { acc += t.seg[k]; k++; }
        const f = t.seg[k] ? (dist - acc) / t.seg[k] : 0, P0 = t.pts[k], P1 = t.pts[k + 1];
        const nx = P0[0] + (P1[0] - P0[0]) * f, nz = P0[1] + (P1[1] - P0[1]) * f;
        g.position.set(nx, groundY(nx, nz), nz);
        g.rotation.y = Math.atan2(P1[0] - P0[0], P1[1] - P0[1]);
        setPose(g, 'walk', rig.phase, st.time);
      } else {
        g.rotation.y = t.ry || 0;
        const pose = t.work || grp.work || grp.pose || 'stand';
        setPose(g, active ? pose : staticPose(pose), rig.phase, st.time);
      }
      // hoods up at table and at Compline (BOOK, D1 AKŞAM)
      setHood(g, grp.zone === 'refectory' || st.office?.id === 'compline' || grp.hood === true || (rig.named && NAMED[rig.named].hood));
      // near figures move every frame, farther ones every other frame
      if (active) {
        rig.acc = (rig.acc || 0) + dt;
        if (d < 30 || (rig.tick = !rig.tick)) {
          const hit = updateFigure(g, rig.acc); rig.acc = 0;
          // a blow of the hammer on the anvil, a stroke of the broom, heard
          // on the frame the recorded motion strikes
          if (hit && grp.hits && d < 24 && ctx.sound) ctx.sound.npcSound(grp.hits, t.x, g.position.y + 0.9, t.z, 0.8);
        }
      }

      // carried sack for peasants
      const idx = rig.idx;
      if (grp.carry) {
        if (!sacks[idx]) { sacks[idx] = sackMesh(); g.add(sacks[idx]); }
        sacks[idx].visible = true;
        // held against the chest, as the recorded carrying walk holds it
        sacks[idx].position.set(0, g.userData.h * 0.62, 0.3);
      } else if (sacks[idx]) sacks[idx].visible = false;

      // sparse footstep / work sound near the camera
      if (soundClock <= 0 && active && d < 26 && ctx.sound) {
        const roll = Math.random();
        if (grp.walkers || grp.file) { if (roll < 0.5) ctx.sound.npcSound(surfaceStep(grp.surface), t.x, g.position.y, t.z, 0.5, { zone: grp.zone }); }
        else if (grp.zone === 'scriptorium') { if (roll < 0.4) ctx.sound.npcSound('pageTurn', t.x, g.position.y + 0.8, t.z, 0.5, { zone: grp.zone }); }
        else if (grp.zone === 'church' && st.office) { if (roll < 0.2) ctx.sound.npcSound('cough', t.x, g.position.y + 1.3, t.z, 0.4, { zone: grp.zone }); }
        else if ((t.work || grp.work || grp.pose) === 'knead' || (t.work || grp.work || grp.pose) === 'stir') { if (roll < 0.4) ctx.sound.npcSound(roll < 0.2 ? 'chop' : 'clank', t.x, g.position.y + 0.8, t.z, 0.5, { zone: grp.zone }); }
        else if (grp.id === 'swineherds') { if (roll < 0.4) ctx.sound.npcSound('pour', t.x, g.position.y + 0.6, t.z, 0.5); }
      }
    }
    if (soundClock <= 0) soundClock = 0.7 + Math.random() * 1.2;
    void _v; void phaseAt; void officeAt;
  });

  return { batches: [] };
}

// map a walking pose to a still one for out-of-range figures
function staticPose(pose) {
  if (pose === 'walk' || pose === 'carry') return 'stand';
  return pose;
}
function surfaceStep(surface) {
  return surface === 'straw' ? 'step-straw' : surface === 'wood' ? 'step-wood' : surface === 'snow' ? 'step-snow' : 'step-stone';
}
// deterministic per-group RNG so scattered figures keep their spots
function mul(str) {
  let a = 0; for (let i = 0; i < str.length; i++) a = (a * 31 + str.charCodeAt(i)) >>> 0;
  return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
