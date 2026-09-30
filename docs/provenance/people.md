# Provenance — the population (src/world/people.js, src/world/people/*)

The inhabitants: monks, novices, lay brothers, cooks, servants, herdsmen,
peasants. A capped pool of ~46 procedural rigs is reassigned each cycle to
the slots the current canonical hour calls for (nearest the camera first),
so the abbey is peopled where you look without ever animating a crowd.

Classification: **BOOK** = the novel states the activity/appearance;
**RECON** = a decision to make the incomplete text physically coherent;
**AMBIENT** = a 14th-c. Benedictine detail added for life, not claimed.
Claim ids (claim_00NNNN) and constraints as in evidence_life.md.

| Object / decision | ids | class | note |
|---|---|---|---|
| 60 monks + 150 servants total (never all shown; spawned per zone by hour) | #000166, #000167 | BOOK | cap POOL=46; sparse, disciplined |
| Full community 40–60 in the choir stalls at Matins/Lauds/Prime/Vespers/Compline | D2 GECEYARISI ("altmış kişi"), #000635 | BOOK | `office.full` → all choir slots filled |
| Smaller choir at Terce/Sext/None (scriptorium monks excused) | D1 İKİNDİDEN SONRA | BOOK | non-full offices cap the choir at ~10 |
| Prostration singing the first psalms at Matins | D2 GECEYARISI | BOOK | pose `prostrate` before 3:00 |
| Novices in the choir behind their masters | #000635 | BOOK | `choir-novice`, standing/praying |
| A waker with a small hand lamp between the stalls at Matins | #002336, D2 GECEYARISI | BOOK | `waker` slot at Matins |
| Acolytes at the altar just before Sext | #000912, #000922 | BOOK | `acolytes` at Sext |
| Ubertino praying before the stone Virgin | #000212, #001439 | BOOK | `ubertino` kneeling by the Virgin |
| Alinardo on the cloister porch, feeling no cold | #000989 | BOOK | `alinardo` seated on the porch |
| 1–3 monks praying off-hours; church empty late at night | #000988; #001025, #001040 | BOOK | `prayers`; no figures 19:00→ |
| Monks walking the cloister in silence between Matins and Lauds and before supper | #000645, #000986 | BOOK | `cloister-walk`, pose `walk` on the garth ring |
| Novices to the chapter house to study psalms between Matins and Lauds | #000643 | BOOK | `chapter-novices`, seated |
| ~30 monks at the scriptorium desks by day, until Vespers | #000402, #000403 | BOOK | `scriptorium`, pose `write` |
| Malachi at his desk (chained catalogue) | #000421 | BOOK | `malachi` |
| Malachi & Berengar tidy the scriptorium at Vespers | #000456, #000526 | BOOK | `tidy` at Vespers |
| Refectory: monks seated in silence, hooded; abbot on the dais; reader at the pulpit | D1 AKŞAM, #000567–#000570, #000582–#000584 | BOOK | `refectory`, `abbot`, `reader`; hoods-up favoured |
| Two meals: Sext (winter midday) and supper before dark | editor's NOT; D1 AKŞAM | BOOK | phases `meal`, `supper` |
| Kitchen full of servants and cooks by day; kneading at the great table, a cook at the hearth | #000359, #000778, #000782 | BOOK | `kitchen` (knead), `cook` (stir) |
| Kitchen usable until Compline | #000527 | BOOK | kitchen figures through supper |
| Swineherds stirring the blood vat so it won't clot | #000375, #000670 | BOOK | `swineherds` at the BLOOD_JAR, pose `stir` |
| Grooms leading animals to the mangers; cowherds at the stables | #000508, #001701 | BOOK | `grooms` about the stables |
| Peasants carrying spelt/millet sacks to the mills; bargaining at the granaries | #001714, #001631, #001684 | BOOK | `peasants-mill`, `peasants-gran`, pose `carry` + sack |
| Blacksmiths and glaziers work until Vespers, then quench the forges | #000513, #000517 | BOOK | `smiths` cease at Vespers |
| Severinus / a novice gathering herbs in the garden | #000309, #000303 | BOOK | `gardener` in the herb garden |
| Hooded file across the cemetery to the north door after supper | #000592–#000594 | BOOK | `procession` phase 17.85–18.0 |
| Library stays empty (at most a librarian with a lamp by day) | #000204, #000206, #001063 | BOOK | no library group |
| Black cowled Benedictine habits; scapular, rope belt | — | AMBIENT | the Order's dress; the novel gives hoods (below) not colour |
| Hoods up in the refectory and at Compline | D1 AKŞAM (#000592, "başlıklarını taktılar") | BOOK | monks favour hood-up (0.7) |
| Servants and herdsmen in sheepskin cloaks | D2 SABAH #000788 | BOOK | `sheep` cloak on servant/herd/peasant |
| Novices smaller than the monks | #000635 (novices as a group) | RECON | scaled to ~1.42 m for silhouette |
| Peasants with hoods and sacks | #001714 | BOOK | peasant kind carries a sack |
| Threshers sweeping the threshing floor; grooms in the yard | #000366 | AMBIENT | plausible farm work at Terce–None |
| Footsteps / coughs / page turns / kneading clank / pouring near the camera | §4 sounds | AMBIENT+BOOK | via ctx.sound.npcSound, within 26 m, sparse |

## Placement

Real floors and free space are read from the builders:
- Choir stalls: church.js rows at z = zc ± 2.55 / ± 3.25, floor 0.35, outer
  row +0.35 riser; figures face across the choir (church:north side).
- Scriptorium: seats on a ring inside the octagon at AED.y1 (8.2) — the desks
  themselves are built in aedificium.js; the figures sit at that floor.
- Refectory: benches along the NE-wall tables (dir (1,−1)), abbot on the dais
  toward the east tower, reader at the north-tower pulpit, floor AED.y0.
- Kitchen: the three great work tables and the south-tower hearth / west-tower
  oven, floor AED.y0.
- Outdoors: y from terrain.js `height()` (read-only). Farmyard, gardens,
  granary/mill, smithy, cloister garth ring, procession polyline.

Figures are **not** walker colliders (`ctx.addDynamic` is not used) and carry
no collision; they stand on the real floors and do not block doors.

## Performance / LOD

- Pool cap 46 live rigs; a handful of shared MeshStandardMaterials.
- Reassigned every 0.45 s (or on phase change) to the nearest called-for
  slots; animated only within 60 m on foot; frozen (still drawn) to 155 m;
  hidden beyond. In the aerial far view only outdoor walkers/processions
  remain. Verified 60 fps, 1 draw call reported by the merged batches (the
  people are separate skinned-free Groups; measured fps 60.3).

## Verified

- `npm test` — 9/9 pass (library topology, places).
- Screenshots (FPS=1, 60.3 fps): /tmp/kabbey/shots/people{,2}/ — Matins choir
  (prostrate + waker lamp), scriptorium (26 monks writing), kitchen (cooks),
  refectory (meal), Vespers choir, procession/cemetery, night (empty church),
  cloister vigil, herb garden, aerial.
- Audit: visible figures — Matins 43, midday 34, work 46, **night 0** (church
  empty as the book says). Rigs are children of the `people` group, not
  dynamic colliders.

## Uncertain / unrepresentable

- Exact per-desk identities (only Malachi, Jorge, Adelmo, Venantius are placed
  by the builders' interact points; the writing monks are anonymous).
- The Day-4 legations and archers are not spawned (out of the everyday
  horarium; a later "days" layer could add them — flagged for the integrator).
- Finger-alphabet signing, the reader's specific gestures: abstracted to poses.

## Notes for files I do not own

- systems/horarium.js: I only read `phaseAt`/`officeAt`. No changes needed. If
  a per-day event layer (legations D4, curfew D6) is wanted, it would belong in
  horarium plus a `day` field on the state passed to updaters.

## Revision (vegetation-people wave): figure look and seating

| Object / decision | ids | class | note |
|---|---|---|---|
| Black habit falling in folds to the ankle, fuller at the hem, mud on the hem | — | AMBIENT | folded lathe skirt, vertex-colour dirt fading up from the hem |
| Scapular front and back, cord girdle with a hanging end | — | AMBIENT | Benedictine dress; the book only says the monks wear the Order's habit |
| Cowl: raised hood framing a shadowed face, or fallen on the back over a shoulder cape | D1 AKŞAM (hoods up in the refectory, at Compline) | BOOK/AMBIENT | hood is a two-sided shell; the face is darkened inside it |
| Wide monastic sleeves, hands half inside; hands folded in the sleeves at rest | — | AMBIENT | `fold()` rest pose for monks |
| Tonsure (crown shaved, ring of hair); older monks grey/white or bald | — | AMBIENT | vertex-coloured head; Jorge/Alinardo-age monks exist in the book |
| Faces: nose, brow ridge, eye shadow, chin, ears; skin weathered, varied | — | AMBIENT | no bare spheres; not bright (no "glow" under torches) |
| Novices smaller (≈1.45 m), habit browner, no scapular | #000635 | BOOK/AMBIENT | |
| Servants/herdsmen/peasants: dun/brown/grey tunic to the knee, leather belt, hose, shoes, leg wrappings; greasy sheepskin cloaks; hoods up outdoors | #000788, #001714 | BOOK/AMBIENT | fleece darkened to dirty grey-brown (the old off-white read as a paper doll) |
| Cooks with a stained linen apron | #000573, #001310 | BOOK (cooks)/AMBIENT (apron) | |
| Abbot with a small gold pectoral cross | — | AMBIENT | |
| Scriptorium monks sit on the benches of the real desks (the 40 desks of aedificium.js), facing the page | #000402, #000403 | BOOK/RECON | desk construction mirrored in schedule.js; subset interleaved long-wall/tower/well desks |
| Malachi on his chair at his table by the catalogue | #000421 | BOOK | chair is 0.8 m north of the table |
| Refectory diners seated along both long sides of the trestles, facing the board | D1 AKŞAM | BOOK | seats follow the trestle axis as built (see note below) |
| Kitchen workers stand at the long side of each trestle, facing it; the oven cook faces the west-tower oven | #000359 | BOOK | |
| Choir: the two sides face each other across the choir | D2 GECEYARISI | BOOK | fixed a facing bug (north rows looked at the wall) |
| Matins prostration face down, arms before the head | D2 GECEYARISI | BOOK | fixed: they had been lying on their backs |
| Swineherds stand beside the blood jar (not inside it), stirring | #000375 | BOOK | |
| Outdoor figures step aside from props (straw heaps, carts, fences) onto clear ground | — | RECON | a downward ray against the colliders at the spot, cached |

Rendering: each figure is ~9 meshes (one per rigid part), all sharing one
vertex-coloured material; the previous rigs had ~15 meshes and ~12 materials.
Figures face local +z; `ry` in schedule.js slots follows that convention.

Note for aedificium.js (arch-core): in `refectory()` the trestles are placed
with `ry = -π/4`, which runs their long axis along (1,1)/√2, and the benches
are offset along the same axis (`cx + off·√½, cz + off·√½`), i.e. under the
tables. The seated diners are placed beside the tables (offset along
(−1,1)/√2), so the benches should move to `cx − off·√½, cz + off·√½` to sit
under them.
