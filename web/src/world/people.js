import * as THREE from 'three';
import { phaseAt, officeAt } from '../systems/horarium.js';
import { height, baseHeight } from './terrain.js';
import { makeFigure, setPose, updateFigure, setHood, sackMesh, loadFigures, personFor, setDetail, lookAt } from './people/figure.js';
import { scene as sceneFor } from './people/schedule.js';
import { cloisterRoute, fileRoute } from '../data/peopleRoutes.js';

// The inhabitants of the abbey: monks, novices, lay brothers, cooks,
// servants, herdsmen and peasants, placed and moved by the horarium.
//
// A capped pool of authored MakeHuman bodies and fitted garments is
// reassigned each cycle to the slots
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
// Who is who. Named people have a rig of their own and always the same
// designed person (scripts/people/cast.json), so Malachi or Alinardo keep one
// face at every hour and after a reload. Every other place is filled by a
// member of the community with a stable identity: the brother at desk 5 is
// always the same brother (a hash of the place), and a brother is never in
// two places at once. Rigs are pooled per designed person; a rig only ever
// shows the person it was dressed as.
const COMMUNITY = { monk: 48, novice: 8, servant: 14, herd: 6, peasant: 6, abbot: 1 };
const PER_TEMPLATE = 18;  // rigs of one designed person drawn at once
const NAMED = {
  abbot: { kind: 'abbot', person: 'abbot', seed: 11 },
  malachi: { kind: 'monk', person: 'malachi', seed: 23, hood: true },
  ubertino: { kind: 'monk', person: 'ubertino', seed: 37 },
  alinardo: { kind: 'monk', person: 'alinardo', seed: 41 },
  severinus: { kind: 'monk', person: 'severinus', seed: 53 },
};
// the seat heights the task loops were authored for (scripts/people/tasks.py)
const SEAT_H = { write: 0.5, dine: 0.46, sit: 0.46 };
function hash(str) { let a = 2166136261; for (let i = 0; i < str.length; i++) a = Math.imul(a ^ str.charCodeAt(i), 16777619); return a >>> 0; }

export function buildPeople(M, ctx) {
  loadFigures();
  const root = new THREE.Group(); root.name = 'people';
  ctx.scene.add(root);

  // Each rig hides until assigned; rigs are made the first time a place
  // needs one of their person (loading does not pay for the full choir)
  const rigs = [], byTpl = {}, named = {};
  const addRig = (kind, seed, opts) => {
    const g = makeFigure(kind, seed, opts);
    g.visible = false; g.matrixAutoUpdate = true; root.add(g);
    const rig = { g, kind, tpl: opts.person, busy: false, slot: null, key: null, phase: (seed * 0.618) % 1, pose: 'stand', group: null, idx: rigs.length };
    rigs.push(rig); return rig;
  };
  const newOf = (kind, tpl) => { const pool = byTpl[tpl] ||= []; if (pool.length >= PER_TEMPLATE) return null; const r = addRig(kind, (rigs.length + 1) * 2654435761 % 100000 + kind.length * 7, { person: tpl }); pool.push(r); return r; };
  const namedRig = name => { if (!named[name]) { const o = NAMED[name]; named[name] = addRig(o.kind, o.seed, { person: o.person, hood: o.hood }); named[name].named = name; } return named[name]; };
  // a few carried sacks, attached when a peasant carries
  const sacks = [];
  const stats = { wanted: 0, drawn: 0, short: {} };
  ctx.people = { rigs, stats };

  // resolve a slot's world y: indoor slots carry their own y; outdoor
  // (ground:true or area/file) sit on the terrain. Where a builder has
  // sunk the ground under a footprint (height ≪ base), fall back to the
  // true terrain so outdoor figures near a building don't drop into a pit.
  const terrainY = (x, z) => {
    const h = height(x, z), b = baseHeight(x, z);
    return (h < b - 1.0 ? b : h) - 0.02;
  };
  // what is really underfoot: the built floor (cloister flags, a threshold,
  // a path) where there is one over the terrain, else the terrain
  const groundY = (x, z) => {
    const h = terrainY(x, z), app = globalThis.__abbey;
    if (!app?.walker?.colliders?.[0]?.mesh?.geometry?.boundsTree) return h;
    const hit = app.groundY(x, z, h + 1.4);
    return hit > h - 0.6 && hit < h + 1.2 ? hit : h;
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
    if (!app?.walker?.colliders?.[0]?.mesh?.geometry?.boundsTree) return [x, z, terrainY(x, z)];
    let res = null;
    for (let k = 0; k < 10 && !res; k++) {
      const a = k * 2.4, rr = k ? 0.5 + k * 0.3 : 0, px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr;
      const gy = terrainY(px, pz), hy = app.groundY(px, pz, gy + 2.2);
      if (hy < gy + 0.3) res = [px, pz, Math.max(gy, hy - 0.02)];
    }
    res = res || [x, z, terrainY(x, z)];
    clearCache.set(key, res);
    return res;
  };
  // Indoor places stand on what is really built there: the floor or stall
  // platform under the feet, or for a seated task the seat itself (its top
  // found by a ray, the figure set so that its authored seat height meets it)
  const yCache = new Map();
  const resolveY = (s, pose) => {
    const app = globalThis.__abbey;
    if (!app?.walker?.colliders?.[0]?.mesh?.geometry?.boundsTree) return s.y;
    const key = Math.round(s.x * 20) + ',' + Math.round(s.z * 20) + ',' + Math.round((s.y || 0) * 20) + ',' + (SEAT_H[pose] ? pose : '');
    if (yCache.has(key)) return yCache.get(key);
    let y = s.y ?? 0;
    if (s.seat && SEAT_H[pose]) {
      // (from below any rail or bookboard over the seat, such as the lower
      // choir row's, whose top stands over its own seats)
      const hit = app.groundY(s.x, s.z, y + 0.72);
      if (hit > y + 0.25 && hit < y + 0.72) y = hit - SEAT_H[pose];
    } else if (!s.seat) {
      const hit = app.groundY(s.x, s.z, y + 0.7);
      // A floor correction can cover a small threshold, not a seat or
      // bookboard above the stated platform. The former 75 cm tolerance
      // put the last upper-row brothers on the lower row's rail.
      if (Math.abs(hit - y) < 0.18) y = hit;
    }
    yCache.set(key, y);
    return y;
  };
  // Expand a group's declaration into concrete target slots, each with a
  // stable key (the same seat keeps the same person between reassignments)
  function targets(group) {
    const list = [];
    if (group.slots) {
      group.slots.forEach((s, i) => {
        const key = group.id + ':' + i;
        if (!s.ground) { list.push({ ...s, y: group.indoor || s.y != null ? resolveY(s, group.pose) : s.y, key }); return; }
        const [x, z, y] = clearGround(s.x, s.z);
        list.push({ ...s, x, z, y, key });
      });
    }
    if (group.walkers) {
      // monks pacing the cloister ring
      const w = group.walkers, cap = group.cap || 4;
      const total = cloisterRoute(w).total;
      for (let i = 0; i < cap; i++) {
        const dist=i/cap*total, q=cloisterRoute(w,dist);
        list.push({x:q.x,z:q.z,ry:q.ry,y:groundY(q.x,q.z),dist,ring:true,key:group.id+':w'+i});
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
        const arrival = group.arrivals?.[i];
        const lane = arrival ? [...pts, ...(group.arrivalVia || []), [arrival.x, group.arrivalRowZ ?? arrival.z], [arrival.x, arrival.z]] : pts;
        list.push({ x, z, ry, y: groundY(x, z), file: true, dist, pts: lane, arriveRy: arrival?.ry, total, key: group.id + ':f' + i });
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
    return list.map(t => {
      const si=+(/(\d+)$/.exec(t.key)?.[1] || 0), n=COMMUNITY[group.kind] || 8;
      return {...t,member:group.kind+':'+t.key,person:group.cast?group.cast[si%group.cast.length]:personFor(group.kind,group.kind+((hash(group.id)+si)%n))};
    });
  }

  // Route phase continues even when no render rig is assigned. Selection,
  // floor/room visibility, sound reach and animation use the CURRENT point,
  // not the worker's initial anchor at the other end of a lane.
  let routeAge = 0, routePhase = '';
  const located = (t, group) => {
    const q = t.ring ? cloisterRoute(group.walkers, t.dist + routeAge) :
      t.file ? fileRoute(t.pts, t.dist + routeAge * 0.95, !!group.carry) : null;
    return q ? { ...t, ...q, ry: q.finished ? t.arriveRy ?? q.ry : q.ry, y: groundY(q.x, q.z) } : t;
  };

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
      for (const anchor of targets(grp)) {
        const t = located(anchor, grp);
        const d = Math.hypot(t.x - cam.x, t.z - cam.z);
        // aerial far: keep only outdoor walkers/processions
        if (st.mode === 'aerial') {
          const farCam = cam.y > 90 || d > 220;
          if (farCam && !(grp.walkers || grp.file || grp.area)) continue;
          if (d > 400) continue;
        } else if (d > DRAW_R) continue;
        // another floor of a building (the refectory under the scriptorium,
        // the scriptorium under the library) is neither drawn nor animated
        else if (grp.indoor && Math.abs((t.y ?? 0) - (cam.y - 1.6)) > 3.0) continue;
        // Do not spend a rig/animation/shadow on people beyond an opaque
        // room wall. The BVH includes the shared moving access barriers.
        if(st.mode==='walk' && (d>10 && grp.indoor || Math.abs((t.y ?? 0)-(cam.y-1.6))>3) && ctx.world?.canSee &&
          !ctx.world.canSee(new THREE.Vector3(t.x,(t.y ?? 0)+1.4,t.z),cam)) continue;
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
      if (r && !r.busy && !r.named && r.kind === c.grp.kind && r.tpl === c.t.person) bind(i, r);
    });
    // 3. the rest: each place's own member of the community (stable by the
    // place, never two places at once), shown by a rig of that person's
    // design; prefer the rig that showed this place last time, then a
    // hidden one (no one vanishes from view to reappear elsewhere)
    chosen.forEach((c, i) => {
      if (out[i]) return;
      // Logical cast IDs belong to places, never to pool assignment order.
      // Camera distance and reloads therefore cannot change a worker's face.
      const kind=c.grp.kind,member=c.t.member,tpl=c.t.person;
      const pool = byTpl[tpl] || [];
      let best = null, bs = Infinity;
      for (const r of pool) {
        if (r.busy) continue;
        const s2 = r.key === c.t.key ? -1 : r.g.visible ? 4 : 0;
        if (s2 < bs) { bs = s2; best = r; if (s2 < 0) break; }
      }
      if (!best) best = newOf(kind, tpl);
      if (best) { bind(i, best); best.member = member; }
      else stats.short[kind] = (stats.short[kind] || 0) + 1;   // better an empty place than the wrong person
    });
    assigns = out.filter(Boolean);
    stats.drawn = assigns.length;
    held = next;
    // hide the rest
    for (const r of rigs) if (!r.busy) r.g.visible = false;
  }

  const _v = new THREE.Vector3();

  ctx.onUpdate((dt, st) => {
    if (ctx.people.frozen) return;   // (debug: a posed figure held for inspection)
    const phaseKey = st.phase.id + ':' + st.phase.t0 + ':' + (st.office?.id || '');
    if (phaseKey !== routePhase) { routePhase = phaseKey; routeAge = 0; }
    else routeAge += dt;
    sinceRecycle += dt;
    const key = st.phase.id + (st.office?.id || '') + st.mode + (st.office?.id === 'matins' && st.time > 2.75 ? ':lessons' : '');
    if (sinceRecycle > RECYCLE || key !== lastKey) { recycle(st); sinceRecycle = 0; lastKey = key; }

    const cam = st.cam;
    let scratches = 0;
    for (const a of assigns) {
      const { rig, t, grp } = a;
      const g = rig.g;
      g.visible = true;
      // position
      const at = located(t, grp);
      g.position.set(at.x, at.y ?? 0, at.z);
      // A stair/study jump can change storeys before the next pool recycle.
      // Hide the old floor immediately, including its task sounds.
      if (st.mode === 'walk' && grp.indoor && Math.abs((at.y ?? 0) - (cam.y - 1.6)) > 3) { g.visible = false; continue; }
      const d = Math.hypot(at.x - cam.x, at.z - cam.z);
      const active = d < ACTIVE_R && st.mode === 'walk';

      // movement for walkers / processions along their ring / file
      if (grp.walkers) {
        // pacing the cloister walk at an unhurried 1 m/s, the stride of the
        // recorded formal walk
        g.rotation.y = at.ry;
        setPose(g, active ? 'walk' : 'stand', rig.phase, st.time);
      } else if (grp.file) {
        g.rotation.y = at.ry;
        setPose(g, at.finished ? 'stand' : grp.carry ? 'carry' : active ? 'walk' : 'stand', rig.phase, st.time);
      } else {
        g.rotation.y = t.ry || 0;
        const pose = t.work || grp.work || grp.pose || 'stand';
        setPose(g, active ? pose : staticPose(pose), rig.phase, st.time);
      }
      // detail by distance, with a little hysteresis: faces' small parts
      // within ~9 m; the sun's shadow outdoors within 45 m, indoors only near
      // and by day (the vaults keep the sun off them anyway)
      {
        const U = g.userData, dd = Math.hypot(g.position.x - cam.x, g.position.y - cam.y, g.position.z - cam.z);
        const face = U.face ? dd < 10 : dd < 8.5;
        const shadow = grp.indoor ? dd < (U.shadow ? 11 : 9) && st.night < 0.5 : dd < (U.shadow ? 48 : 44);
        setDetail(g, face, shadow);
      }
      // hoods up at table and at Compline (BOOK, D1 AKŞAM)
      setHood(g, grp.zone === 'refectory' || st.office?.id === 'compline' || grp.hood === true || (rig.named && NAMED[rig.named].hood));
      // near figures move every frame, farther ones every other frame
      if (active) {
        rig.acc = (rig.acc || 0) + dt;
        if (d < 30 || (rig.tick = !rig.tick)) {
          const evs = updateFigure(g, rig.acc);
          // Severinus and Alinardo look up at someone who comes close
          if (rig.named === 'severinus' || rig.named === 'alinardo') lookAt(g, d < 3.2 && st.mode === 'walk' ? cam : null, rig.acc);
          rig.acc = 0;
          // the sound of what the figure visibly does, on the frame it does
          // it: a footfall, the quill on the leaf, the hammer on the iron
          if (evs && ctx.sound) for (const ev of evs) {
            const snd = EVENT_SOUND[ev] === 'step' ? surfaceStep(grp.surface) : ev === 'hot' || ev === 'hit' ? (grp.hits || 'hot') : EVENT_SOUND[ev];
            if (!snd || d > (EVENT_REACH[ev] ?? 16)) continue;
            // a room of scribes: only the few nearest are heard one by one
            if (ev === 'scratch' && ++scratches > 3) continue;
            ctx.sound.npcSound(snd, g.position.x, g.position.y + (ev === 'step' ? 0.05 : 0.9), g.position.z, EVENT_GAIN[ev] ?? 0.5, { zone: grp.zone });
          }
        }
      }

      // carried sack for peasants
      const idx = rig.idx;
      if (grp.carry) {
        if (!sacks[idx]) { sacks[idx] = sackMesh(); g.add(sacks[idx]); }
        sacks[idx].visible = true;
        // held against the chest, as the recorded carrying walk holds it
        sacks[idx].position.set(0, (g.userData.h || 1.75) * 0.6, 0.3);
      } else if (sacks[idx]) sacks[idx].visible = false;

    }
    void _v; void phaseAt; void officeAt;
  });

  return { batches: [] };
}

// what each contact event of a figure sounds like, how far it carries, how loud
const EVENT_SOUND = { step: 'step', scratch: 'scratch', pageTurn: 'pageTurn', sweep: 'sweep', strawRustle: 'strawRustle', knead: null, spoon: null, stir: null, pour: 'pour' };
const EVENT_REACH = { step: 14, scratch: 7, pageTurn: 10, hot: 26, hit: 26, sweep: 14, strawRustle: 12, pour: 12 };
const EVENT_GAIN = { step: 0.35, scratch: 0.35, pageTurn: 0.4, hot: 0.8, hit: 0.8, sweep: 0.4, strawRustle: 0.35, pour: 0.3 };

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
