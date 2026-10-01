// Engine-independent rule references computed by the BROWSER'S OWN modules,
// for the native parity tests (native/tests/run_tests.gd).
//
//   node scripts/migration/rule_references.mjs
// -> shared/data/manifests/rule_references.json
//
// Imports unchanged web/src/systems/horarium.js, web/src/world/people/schedule.js
// and web/src/systems/audio/churchPaths.js (all pure modules).
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { phaseAt, officeAt, aedificiumBarred, isDaylight } from '../../web/src/systems/horarium.js';
import { scene } from '../../web/src/world/people/schedule.js';
import { churchPath } from '../../web/src/systems/audio/churchPaths.js';
import { aedificiumExitPermit } from '../../web/src/systems/worldState.js';
import { canAskAlinardo, knowsAltar } from '../../web/src/data/discovery.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, f))).digest('hex');
const exportRep = JSON.parse(fs.readFileSync(path.join(ROOT, 'shared/data/export/slice_export.report.json'), 'utf8')).result;

// --- horarium + Alinardo availability -------------------------------------
const times = [];
for (let i = 0; i <= 480; i++) times.push(+(i * 0.05).toFixed(4));
const H = JSON.parse(fs.readFileSync(path.join(ROOT, 'shared/data/horarium.json'), 'utf8'));
for (const p of H.phases) for (const d of [-1e-6, 0, 1e-6]) { const t = +(p.t0 + d).toFixed(7); if (t >= 0 && t < 24) times.push(t); }
const horarium = times.map(t => {
  const ph = phaseAt(t), of = officeAt(t);
  const groups = scene(ph, of, t).map(g => g.id);
  return { t, phase: ph.id, phase_t0: ph.t0, office: of?.id ?? '', barred: aedificiumBarred(t), daylight: isDaylight(t), alinardo: groups.includes('alinardo') };
});

// --- discovery predicates ----------------------------------------------------
const sets = [[], ['altar-feature'], ['barred'], ['alinardo-hint'], ['altar-passage'], ['altar-feature', 'alinardo-hint']];
const predicates = sets.map(ids => { const n = new Set(ids); return { known: ids, can_ask_alinardo: canAskAlinardo(n), knows_altar: knowsAltar(n) }; });

// --- church acoustic path ------------------------------------------------------
const doorList = exportRep.doors.filter(d => ['church:westN', 'church:westS', 'church:north', 'church:cloister'].includes(d.id));
const src = { x: 35.44, y: 2.4, z: -5.46 };
const listeners = [
  // Agent B route telemetry points (ears ≈ feet + 1.62)
  { x: 20.03, y: 1.92, z: 4.898, zone: 'cloister', inside: false },
  { x: 28.105, y: 1.97, z: 2.496, zone: 'church', inside: true },
  // Alinardo's porch, the cloister walks, the doorway, the nave, the chapel, the stair, the landing
  { x: -9.2, y: 1.92, z: 14.1, zone: 'cloister', inside: false },
  { x: 5.0, y: 1.92, z: 5.2, zone: 'cloister', inside: false },
  { x: 28.08, y: 1.97, z: 3.6, zone: 'cloister', inside: false },
  { x: 28.08, y: 1.97, z: 1.4, zone: 'church', inside: true },
  { x: 22.0, y: 1.97, z: -5.46, zone: 'church', inside: true },
  { x: 15.37, y: 1.97, z: -12.4, zone: 'skull', inside: true },
  { x: 15.37, y: 0.9, z: -15.8, zone: 'ossuary', inside: true },
  { x: 15.37, y: -0.4, z: -18.0, zone: 'ossuary', inside: true },
  { x: 15.372, y: -1.18, z: -20.64, zone: 'ossuary', inside: true },
  { x: 33.0, y: 1.97, z: -5.46, zone: 'choir', inside: true },
];
const church = [];
for (const altarOpen of [0, 0.5, 1]) for (const doorOpen of [1, 0]) for (const L of listeners) {
  const doors = new Map(doorList.map(d => [d.id, { ...d, open: d.id === 'church:cloister' ? doorOpen : 1, blocked: false }]));
  const r = churchPath(L, src, { doors, altar: { open: altarOpen } });
  church.push({ listener: L, altar_open: altarOpen, cloister_door_open: doorOpen, pos: [r.pos.x, r.pos.y, r.pos.z], level: r.level, lp: r.lp, inside: r.inside, distance: r.distance });
}

// --- curfew exit permit ----------------------------------------------------------
const door = { x: 0, z: 0, nx: 0, nz: -1, th: 0.7 };
const permits = [];
for (const [x, z, inside, prev] of [[0, 2, true, false], [0, 0.9, true, false], [0, 0.4, true, true], [0, -0.5, false, true], [0, -1.5, false, true], [0, -3, false, true], [0, -3, false, false], [0, 6, true, false], [3, 3, true, false]]) {
  permits.push({ feet: [x, 0, z], inside, previous: prev, door, permit: aedificiumExitPermit({ x, y: 0, z }, inside, [door], prev) });
}

const out = {
  schema_version: 1,
  generator: 'scripts/migration/rule_references.mjs',
  sources: Object.fromEntries(['web/src/systems/horarium.js', 'web/src/world/people/schedule.js', 'web/src/systems/audio/churchPaths.js', 'web/src/systems/worldState.js', 'web/src/data/discovery.js'].map(f => [f, sha(f)])),
  horarium, predicates, church_doors: doorList, church_source: src, church, permits,
};
const dst = path.join(ROOT, 'shared/data/manifests/rule_references.json');
fs.writeFileSync(dst, JSON.stringify(out) + '\n');
console.log('wrote', path.relative(ROOT, dst), horarium.length, 'hours', church.length, 'paths', permits.length, 'permits');
