// 46-presentation stress layout from the browser's own choir slots
// (web/src/world/people/schedule.js ANCHORS.CHOIR), with synthetic benchmark
// identities. Not story people: never saved, never named.
//   node scripts/migration/crowd_layout.mjs -> shared/data/bench/crowd.json
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ANCHORS } from '../../web/src/world/people/schedule.js';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const templates = ['monk_a', 'scribe_a', 'monk_b', 'novice_a'];
const poses = ['stand', 'stand', 'bow', 'kneel', 'stand', 'kneelBow'];
const slots = ANCHORS.CHOIR.slice(0, 46).map((s, i) => ({
  id: 'bench:' + String(i).padStart(2, '0'), template: templates[i % templates.length],
  x: s.x, y: s.y, z: s.z, ry: s.ry, row: s.row, pose: poses[i % poses.length], phase: +((i * 0.618) % 1).toFixed(4), seed: 1000 + i,
}));
const out = { schema_version: 1, id: 'crowd', source: 'web/src/world/people/schedule.js ANCHORS.CHOIR (first 46 of 48 slots)', note: 'Synthetic benchmark identities bench:00..45 over four fitted cast templates; varied fitted tasks (standSleeves, standBow, kneelPray, kneelBow) and phases. Matches the browser choir peak of 46 animated presentations.', templates, slots };
fs.writeFileSync(path.join(ROOT, 'shared/data/bench/crowd.json'), JSON.stringify(out, null, 1) + '\n');
console.log('slots', slots.length);
