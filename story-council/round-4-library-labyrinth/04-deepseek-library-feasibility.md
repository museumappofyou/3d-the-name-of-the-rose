# Round 4 — Repository-Grounded Library/Labyrinth Migration & Feasibility

**Author:** DeepSeek V4.1 Flash · **Role:** Repository-Grounded Library Migration & Feasibility Designer
**Date:** 2026-10-05 · **Repository:** `/Users/memre/Desktop/gulun_adı`
**Scope discipline:** read-only analysis. No code, assets, commits or pushes were touched. No other Round-4 report was read. No new literary extraction was run. Spoiler-sensitive elements are referenced generically as `[protected space]`, `[protected mechanism]`, `[protected event]`. This report never quotes the novel.

Method: the five canonical docs were read in full, then only the files relevant to library geometry, topology, movement, semantics, export, native systems and performance were inspected. Two additional read-only measurements were taken: (a) an analytic census that imports the repository's own pure ESM modules (`web/src/core/plan.js`, `web/src/core/library.js`) to count rooms/edges/doors and replicate the bookcase placement rules; (b) extraction of the library figures already present in committed evidence — the Phase-1 export census in `shared/data/manifests/world_derivatives.json` and the browser-baseline render profiles in `docs/evidence/browser-baseline/reviews.json`. No builds were run.

---

## 1. GROUND TRUTH: WHAT THE LIBRARY ACTUALLY IS TODAY

### 1.1 What library geometry exists, and where

The complete 56-room library exists **only as procedural Three.js source in this repository**, built at browser startup. It is not a committed asset and has never been exported as a GLB.

| Layer | File | Contents |
|---|---|---|
| Topology + semantics (data-in-code) | `web/src/core/library.js` | 56 room polygons, 4 heptagonal tower halls, room kinds, window edges, 59 door passages + 1 concealed [protected mechanism], room initials/verses/holdings/words, entrance and [protected space] IDs |
| Geometry builder | `web/src/world/aedLibrary.js` | Floor prism with two stair holes, 56 vaults, wall runs, 340 bookcase placements, tables, 36 verse-scroll textures, 3 painted pages, [protected mechanism] props, [protected event] prop and light, shelf-address labels |
| Architectural frame | `web/src/world/aedificium.js` | Floor levels (`y2 = 15.6 m`), the Aedificium exterior shell and glazing, the east-tower spiral stair (`f2` in the `aed-scriptorium` batch), stairhead shaft |
| Furniture + labels | `furniture.js`, `discoveryProps.js` | `bookcase()` with deterministic books; canvas catalogue/address labels and worked example |
| Runtime systems | `main.js`, `systems/*`, `ui/ui.js` | Zone classification, night access rule, library map drawing, notebook room discovery, ambience |

### 1.2 The decisive measurement: the entire library was already censused by the Phase-1 exporter

The Phase-1 semantic section export (`scripts/migration/browser/slice_export.js`, driven with `shared/data/export/slice_cells.json`) enumerates every `Batch` part before material merging and assigns parts to cells by explicit rules. Because no cell rule includes the `aed-library` batch, **all of its parts were recorded in the export report's `excluded` census**, which is committed in `shared/data/manifests/world_derivatives.json`:

> **`aed-library`: 2,332 parts, 189,708 triangles, 65 material keys.**

The largest contributors: bookcase carcasses (`woodDark` 414 parts / 44,500 tri), the 56 vaults (`plaster` 58 / 43,972 tri), book leather/vellum (~990 parts, ~71,500 tri), `aedIn` 282 / 15,916, interior walls (`plasterStone` 100 / 4,296), `wood` 55 / 3,948, four spine batches ≈ 842 tri, plus 36 `scroll_*`, 3 `page_*`, 3 labels and small props. My independent analytic replication of `aedLibrary.js` agrees: **340 bookcase runs** (average 2.41 m, range 0.8–9.1 m), 56 vault meshes, ~2,100 m² of room floor area.

The browser-baseline profiles in `docs/evidence/browser-baseline/reviews.json` independently confirm the scale: the `aed-library` render batch shows **23–91 draw calls and 100,004–188,818 triangles per frame** across profile scenes, with the ContactAO pass doubling every count. The library was submitted even from non-library viewpoints because merged per-material meshes have floor-spanning bounds.

This matters more than any estimate I could make: **the full-library geometry is roughly the same size as the entire six-cell native proof (210,975 triangles) and it already passes through the exporter's enumerator.** What does not yet exist is any cell rule that selects it.

### 1.3 Format and portability

- **Current format:** executable JavaScript; polygons computed from parameters, geometry generated at startup. No `library.json`, `library.glb` or committed scroll PNG exists.
- **Portable today:** coordinate conventions (metres, +X east/+Y up/+Z south, shared with Godot), material semantic keys and reconstruction provenance; geometry is *mechanically exportable* but not yet *data*.
- **Not portable:** `Reflector` glass, dynamic pivot groups, in-browser canvas textures, the map's canvas drawing and interaction state machines.

### 1.4 How much is procedural Three.js?

Effectively all library content is procedural: all geometry, 56 vaults, 340 bookcases, 36 scroll textures, painted pages, labels and both emitters. Only material texture sets (plaster, wood, leather, vellum) come from `shared/assets/textures` via `materials.js`.

### 1.5 Room and spatial entity census (verified)

| Entity | Count | Notes |
|---|---:|---|
| Rooms | **56** | 4 heptagonal halls, 20 tower rooms, 8 blind, 16 inner, 8 outer |
| Windowed rooms | 44 | 28 outward-facing, 16 inward-facing (matches the literary counts) |
| Polygon edges | 144 | 100 shared between two rooms, 44 exterior |
| Passages | **60** | 59 explicit door edges + 1 [protected mechanism] passage |
| Dead-end rooms | 4 | including one dead-end-side room pair at opposite ends |
| Rooms with letter + verse | 55 | exactly one room has neither (the non-shelf [protected space]) |
| Rooms with documented holdings | 13 | textual descriptions attached to specific rooms |
| Bookcase runs | ~340 | measured analytically; consistent with 336 `p.books.*` parts counted by the exporter |
| Book geometry parts | ~990 | ~247 parts each of vellum, black/red/brown leather |
| Material keys | 65 | including 36 scroll textures, 3 page textures, 3 label textures |
| Registered interactions | 8 | entrance scroll, shelf address, book table, [protected mechanism] ×2, [protected event], [protected space], poetics volume |
| Library emitters | 2 | [protected event] light, oil lamp |
| Shelves/address example | 1 | worked catalogue-notation example in the entrance area |

### 1.6 Topology information

Topology is real, tested and deterministic — but lives only in JS. `tests/library.test.js` asserts the literary counts (56/4/8/28/16), 44 windows, non-degenerate tiling, **reachability of 55 rooms with the [protected space] excluded**, the [protected mechanism] as its only access, the entrance heptagon's four-openings rule, specific dead ends, word-spelling adjacency chains and a canonical long path around south/west sectors. This is the best-tested non-native subsystem in the repository. `shared/data` contains **none** of it: `locations.json` has 9 proof rooms, `portals.json` 3 proof portals.

### 1.7 Movement and route data

- `web/src/data/routes_aed.js` includes **R7: scriptorium → east-tower spiral → library entrance** as an audit route, but **no routes inside the library floor**. The tour stops at the stairhead.
- `book_details/output/movement_graph.json` carries 360 route edges and 86 sequences; 7 edges have `LIBRARY` as origin (e.g., library→scriptorium, library→[protected space] style movements), and route-ordering constraints exist.
- Native domain has `passage_tracker.gd`, which records only the church→ossuary passage; there is no equivalent library route memory.

### 1.8 Labels and semantic metadata

Per room: initial, red-initial flag, Apocalypse verse line, region-word membership, holdings text. Per shelf: catalogue notation labels. Per room card: HUD display of letter/verse/word/holdings. Map: room initials, visited state, doors, current room. **All of this is browser JS.** The verses and words are also the most spoiler-dense content in the whole library; the letter meta-structure is a major reveal and must not be treated as ordinary UI copy.

### 1.9 What is missing for Godot

1. A shared, engine-neutral library dataset (rooms, polygons, edges, kinds, windows, labels, claims).
2. Library cell rules for the exporter and a storey-band selection solution for the Aedificium shell (see §2).
3. Library GLB + collision GLB cells.
4. Material conversion for 65 keys, including 36 canvas scroll textures and 3 page textures.
5. 56 location/room volumes with priority, darkness and acoustic class in `shared/data/locations.json` format (AABB-only today; heptagons need either loose boxes or a polygon-capable classifier).
6. Residency cells and a `NEEDS` extension in `native/scripts/adapters/world_cells.gd`.
7. Interaction/portal data for library props (domain supports it; content absent).
8. Library acoustics/emitters and one audio derivative for the wind moan bed.
9. Library anchors for the existing 10-check anchor harness.
10. A spoiler policy encoded in data (which labels/props may render in which product mode).

### 1.10 Evidence classification

| Status | Items |
|---|---|
| **CURRENTLY IMPLEMENTED** (browser only) | Full 56-room procedural floor; topology; 59+1 passages; 340 bookcases; 65 materials; 36 scrolls; 8 interactions; map; notebook room discovery; night access rule; wind-moan ambience; [protected mechanism] and [protected event] props |
| **DATA EXISTS BUT NOT RENDERED** | Library part/triangle census in `world_derivatives.json`; 856-edge `spatial_graph.json` (33 LIBRARY-subject edges); 361 library-related reconstruction constraints; 90-edge visibility graph; 81-edge access graph; 441 LIBRARY entities in `abbey_hierarchy.json`; movement/route edges; all unused by any renderer |
| **ONLY DOCUMENTED** | Native library migration is named only as a future web-explorer "optional library study view" (`PROJECT.md`); no native library spec; `GAME_DESIGN.md` deliberately excludes full library migration from the next mission |
| **ASPIRATIONAL** | Full-floor native migration; async whole-abbey streaming; NPC navigation in the labyrinth; catalogue-search system; scenario overlays; player map in native |

---

## 2. MIGRATION DIFFICULTY FOR A REPRESENTATIVE LIBRARY SLICE

Classification (LOW / MEDIUM / HIGH / VERY HIGH). "Slice" = 8–12 rooms plus the east-tower stair, exported through the existing pipeline.

| Aspect | Class | Grounded reason |
|---|---|---|
| Geometry | **MEDIUM** (interior-only: LOW) | Batch enumerated (2,332 parts / 189,708 tri); a cell rule selects it. Catches: the Aedificium shell is single full-height `aed-exterior` parts, so the library level needs a storey-band clip (or duplicated full-height walls, or a native shell); the east-tower stair lives in `aed-scriptorium`, so cells span three batches. |
| Materials | **MEDIUM** | `build_slice_assets.py` converts material records to `.tres`; keys are mostly plain `MeshStandardMaterial`s; 36 canvas scrolls, 3 pages, 3 labels use the proven `generated/*.png` path. Only the `Reflector` [protected mechanism] cannot convert. |
| Lighting | **LOW** | Interior with two emissive props; native rig, per-room darkness and office/night behaviour exist; add darkness values. |
| Collisions | **MEDIUM** | Exporter already emits separate collision per surface id; library colliders exist (bookcase boxes, walls, floor, stair ramp). Merging per cell plus the stair batch is the work. |
| Streaming / cells | **MEDIUM** | `world_cells.gd` is synchronous with a known 60–85 ms stair-head hitch; one 189k-tri `load_cell()` risks a visible stall. Multi-cell rules + residency are a bounded extension. |
| Room IDs | **MEDIUM** | IDs exist in JS; `locations.json` is AABB-only with 9 rooms. 56 volumes plus polygon/tighter tests is bounded domain work. |
| Labels | **MEDIUM** | Text in JS; 36 canvas scrolls. Exportable; spoiler partitioning and legibility must be decided; Godot needs baked textures or Label3D. |
| Books/shelves | **LOW** / **MEDIUM** | Static shelf meshes are ordinary merged geometry; semantic addressing is new data + interaction work. |
| Audio | **MEDIUM** | Director, paths and office transport exist; add a wind-moan derivative (source exists) and per-zone emitters. No new recording. |
| Interactions | **MEDIUM** | Allowlisted conditions/actions, portals and knowledge port ordinary interactions as data; protected state machines and reflective glass do not. |
| Mapping | **MEDIUM** | New native UI; geometry data and a small browser reference already exist. |
| Navigation | **LOW** (player) | Walking/collision and the stair work; NPC navmesh is out of scope for a first slice. |
| Performance | **MEDIUM** | Whole library ≈ the proof's triangle count; FPS risk low, stall/memory risks real. |

**Overall: MEDIUM.** The geometry is not the problem — the missing library data contract and the cell/streaming plan are.

---

## 3. WHAT CAN BE REUSED

**For the Godot representation, reuse must flow through shared data, never through copied Godot scenes.** Concretely:

- **`web/src/core/library.js` is the single authoring source.** Room polygons (world metres), kinds, window edges, door adjacency, entry/secret IDs and letters/verses/holdings can be frozen once into `shared/data/library_topology.json` + `library_semantics.json` by a small generator, as `build_content.py` already freezes rule references. It must not be edited in parallel with a native copy.
- **The Phase-1 export pipeline is the migration vehicle.** `slice_export.js` + `build_slice_assets.py` + `world_cells.gd` already prove batch enumeration, per-cell merging, separate collision, material records, canvas-texture dumping, anchors and emitters — and the census proves the enumerator already sees every library part.
- **Coordinate frame and anchors:** both engines share metres and axes; `anchors.json` and the anchor harness can validate library anchors derived from the same polygons.
- **Evidence graphs as validation, not runtime:** `spatial_graph.json` (856 edges), `movement_graph.json` (360/86), `visibility_graph.json` (90), `access_graph.json` (81), `reconstruction_constraints.json` (2,397, of which 361 touch the library) and 441 LIBRARY hierarchy entities should generate *test assertions* (adjacency, containment, sight lines, access windows) — not navigation. They are sparse, ambiguous and cite the novel.
- **Labels and semantic IDs:** room IDs, initials, verses, holdings and the shelf-address notation become shared data with claim links and spoiler levels, feeding both native labels and the web explorer.
- **Native presentation patterns:** `RoomClassifier`/`GameSession` already emit room-change events, drive darkness and record rooms in `KnowledgeState.add_room`; `PassageTracker` demonstrates foot-verified route recording with anti-teleport safeguards. The library needs data, not new patterns.

**Shared vs engine-specific boundary:**

| Shared (engine-neutral) | Engine-specific |
|---|---|
| Room polygons, edges, kinds, windows, IDs | Meshes, GLBs, UVs, LOD/atlasing |
| Door/[protected mechanism] adjacency; entry/secret flags | Collision shapes and surface ids |
| Letter/verse/holdings text; shelf notation; spoiler level | Scroll texture baking; Label3D |
| Locations (priority, darkness, acoustic class) | Lighting rig, shaders, reflectance |
| Access rules by hour/office; interaction anchors | Interaction/state-machine implementation |
| Anchors, claim IDs, reconstruction provenance | Map UI, notebook UI, input |
| Evidence-derived test assertions | Streaming cell loading and budgets |

---

## 4. WHAT MUST BE REBUILT

- **The library data contract** — 56-room topology, labels and access rules in shared form; data work with parity tests.
- **Cell selection and the storey band** — export rules for `aed-library` + upper `aed-exterior` + the `aed-scriptorium` stair; a small y-band exporter extension or a native shell rebuild.
- **Dynamic/protected props** — the reflective [protected mechanism], its state machines, the [protected event] prop and the [protected space] contents have no export path; rebuild natively or omit.
- **Streaming plan** — a cell partition and residency policy; the one-cell framework must be extended before a large floor loads smoothly.
- **Native labyrinth map/notebook** — new UI; no native map renderer exists.
- **Library audio bed/emitters** — one derivative plus a per-sector acoustic policy.
- **Do not preserve implementation debt:** don't migrate the [protected mechanism]s, the full letter/word display, or all 56 rooms because the browser has them. The browser is a reference and export source, not the shipping specification.

---

## 5. PERFORMANCE

Measured/derived: the library batch is **189,708 triangles / 2,332 parts**, drawn as **23–91 calls** in browser profiles (ContactAO doubles submission); a `Reflector` (512×1024 RT) serves one [protected mechanism]; proof cells total 210,975 tri; native baseline is 160 average / 283 max draws, 631k average primitives, 104.6 FPS (M1 Pro, 1080p). The library adds about one proof-slice of triangles. **Do not extrapolate the benchmark blindly** — it validates a six-cell slice, not a 56-room floor with different boundaries, materials and a reflective mechanism.

Likely risks, in order:

1. **Synchronous load/unload hitch.** Entering or leaving a single 190k-tri cell with 65 materials plus collision in one `load_cell()` call is the likeliest visible failure; the existing 60–85 ms stair-head hitch is a warning.
2. **Frustum-culling defeat.** Floor-spanning merged meshes may submit most of the geometry from every room, wasting the low-end GPU budget and negating viewpoint locality. Cell partition is the fix.
3. **Texture/material count.** 36 scroll textures + 3 pages + 3 labels + material sets; without atlasing, draw calls, binds and texture memory climb against the ≤128 MiB web budget.
4. **Shadow casters and collision volume.** 340 bookcases and 56 vaults; bake/contact-shade interior shadows, merge collision per cell and tag surfaces for footsteps.
5. **[protected mechanism] reflection pass.** Any real-time reflector doubles submission for that view; use a bounded mirror camera, a distorted cubemap/parallax approximation, or omit the true reflection.
6. **Audio occlusion.** Per-room raycasts are expensive; use sector classes (four sectors + entrance + [protected space]) with crossfades and reserve acoustic paths for authored routes.

**Recommended cell/streaming strategy (concept):** treat the floor as **one "super-cell" of 4–8 sector cells** (E/S/W/N towers, optionally separating wall sectors), never one cell per room. Load the entrance sector at the stairwell; while the player is in the library, keep the whole floor resident if measurements allow (190k tri is small; textures dominate), and use the room graph only to *prefetch* the next sector. Unload on leaving the Aedificium, with disposal spread across frames rather than one synchronous free. If the first measurements show a stall above the existing 100 ms gate, split into two cells per sector before adding any further content. Keep collision separate per cell, exactly as the proof does.

---

## 6. THE 56-ROOM QUESTION

**Is 56 authoritative?** Yes as a literary constraint and repository invariant — the count, heptagonal halls, 28/16 window split and 8 blind rooms are explicit and asserted by `tests/library.test.js`. The specific adjacency graph and room shapes are a reconstruction constrained by described passages, not canonical: *56 yes; this exact door plan, provisionally.* **Do all need migrating?** No. No gameplay requirement yet demands the whole floor, and the project's own next milestone explicitly excludes library migration. Migrating all 56 now would freeze reconstruction choices and multiply validation cost for zero tested player value. **Can a prototype use a subset?** Yes — the east sector plus two wall rooms is 10–12 rooms with a four-door heptagon, dead ends, blind rooms, two exits and a clean boundary. **Is exporting the existing representation feasible?** Technically yes and half-proven: all 2,332 parts are already enumerated. Missing: cell rules (storey band; the stair's different batch), a decision on protected/dynamic props, material conversion. That is bounded pipeline work, not a redraw. **Would rebuilding from data be cleaner?** For semantics, yes; for geometry, no — regenerating 340 bookcases and 56 vaults by a second builder would fork the reconstruction and violate the single-authoring-source rule. Correct split: freeze geometry once through the proven export pipeline; move semantics and topology into shared data; rebuild only vendor-specific dynamics natively. The debt to retire is [protected mechanism] coupling and JS-only label authority, not the geometry.

---

## 7. GAMEPLAY LEVERAGE

**A — prototype with existing systems (native systems already sufficient; content work only):**

- **Route memory / revisited route** — `PassageTracker` + clock + save. Walking a loop by day, returning at another office; proven pattern, needs only library route data and room IDs.
- **Room discovery** — `KnowledgeState.add_room` already exists and the browser shows the intended feel. Needs library room volumes.
- **Canonical-hour effects** — `horarium`, phases, office transport, night lamps and per-room darkness exist; the browser's library night rule maps to an `access_rules` record. Content work.
- **Access control** — allowlisted conditions/actions already support permission, curfew and portal targets.
- **Acoustic orientation (basic)** — acoustic paths, office transport and surface footsteps exist; a sector-level library bed is a content/derivative task.
- **Inscriptions (as readable objects)** — interactions + knowledge already handle "inspect and record"; only the label textures/data are new.

**B — require one bounded system addition:**

- **Player map** — a new native 2D renderer, but data already exists and the browser logic is small; bounded UI work.
- **Shelf/catalogue search (first version)** — one new data-backed interaction: read notation → find shelf → record comparison. The browser already has the worked example and label geometry; the system addition is a small lookup/match service.
- **Knowledge-based interaction gates** — extend existing conditions with library-specific knowledge IDs (already the intended pattern); bounded.
- **Multiple exit/one-way routes through the sector** — needs room-graph residency policy in `world_cells`; bounded extension.
- **Annotation (lightweight)** — notebook entries with attribution are planned and partially present; adding player notes is bounded but touches save versioning.
- **Day/night identity of a room** — one more observation plane (lamplight vs daylight) over existing light/time systems.

**C — substantial new architecture:**

- **Full-labyrinth navigation at production scale** — async streaming, priority loading, budgeted disposal, whole-Aedificium cells; the current synchronous framework is insufficient. New architecture.
- **NPC navigation inside the labyrinth** — no navmesh; 56-room path planning, patrols and escape logic are a new subsystem (correctly out of scope now).
- **Persistent hypotheses / player-authored reasoning graphs** — the event/evidence/claims model is documented as a planned contract, not implemented; substantial domain + UI + save work.
- **Full catalogue economy** — hundreds of addressable books, search results, document models, spoiler gating; not close today.
- **The [protected mechanism]s as generic systems** — the repository has one-off browser implementations; generalizing them is new architecture and should be avoided.

---

## 8. FIRST VERTICAL SLICE

**Definition and rooms:** the east sector of the floor plus the east-tower stair, entered from the scriptorium — 10–12 rooms: the entrance heptagon (4 doors), five tower rooms in a chain with a shortcut door, two blind rooms, two inner rooms (one leading to an adjacent wall sector), and optionally one wall-sector room as a second exit. Include one dead end, one non-shelf [protected space] treated as visually distinct, the stairhead and the working shelf-address example. **Exclude:** the [protected space] behind the [protected mechanism], both [protected mechanism]s, the [protected event] prop and the full letter meta-structure display.

**Systems and reused data:** native library cell export + residency extension; library room volumes/IDs in shared data; scroll/label data with baked textures for the sample; one knowledge chain for the clue; the existing clock, access, notebook and interaction systems; sector-level ambience. Reuse the exported geometry of the selected rooms, the room/edge JSON derived from `library.js`, the shelf-address data, the anchor harness, the lighting rig and the existing import pipeline. No NPCs, no scenario engine, no mandatory map.

**Disorientation + recognition + navigation test:** players must enter, get lost in 10 rooms for a bounded time, notice distinguishing features (window positions, blind rooms, door counts), find a recognizable landmark and return — measured by whether they build a mental model without a waypoint.

**One intellectual clue:** using the catalogue notation, the player finds a specific shelf by its address (place/gradus/cabinet) after seeing the notation in the entrance hall. It is repository-grounded and reconstruction-labelled, and it neither requires nor reveals the letter/word meta-structure.

**One revisited route:** the tower chain forms a loop with a shortcut; a second visit at a different canonical hour changes light/occupancy so the same corridor reads differently, or a shelf observed by day must be re-found by lamplight.

**One Adso/William progression moment:** a two-step knowledge gate — observe and record the notation, then apply it at the shelf and record the comparison. Entering rooms grants nothing; the notebook entry proves the inference.

**Acceptance criteria:**
1. An unfamiliar player enters from the scriptorium, explores, and can describe where they got lost and how they recovered — no developer teleportation.
2. The clue is solvable via the notation and not by inspect-spam; at least one playtester finds it and one fails initially.
3. A second visit at a different hour changes at least one observable consistently.
4. The knowledge gate never fires from proximity, teleport or load.
5. Save/reload preserves visited rooms and the knowledge chain mid-progression.

**Performance measurements:** entry load stall p95 ≤ 100 ms (measured separately from the known stair-head unload); steady 1080p ≥ 60 FPS / p95 ≤ 25 ms at proof defaults; added VRAM ≤ ~150 MiB; ten enter/exit cycles with no repeatable stall growth and RSS within 10% after warming; visible primitives against the 631k-average envelope. Record in the existing telemetry; do not compare browser and native counters directly.

**What would invalidate the approach:** if fun requires the whole 56-room system; if the loop reads as corridors rather than a labyrinth; if the clue is unreadable or trivial; if browser/native data parity cannot hold; if streaming cannot be bounded; or if orientation only works with an always-on map.

---

## 9. WEB EXPLORER CONSEQUENCE

Recommendation: a small, spoiler-safe library sample (entrance heptagon plus 4–6 rooms, genericized labels, no protected props) in the default explorer; the full simplified labyrinth only as an explicit spoiler opt-in after budget gates. The floor is ~190k triangles — most of the ≤250k visible-triangle target — and it carries the spoiler-dense meta-structure and the [protected mechanism], so it cannot be a default public path. An opt-in study view should simplify geometry (books baked to textures, no per-book meshes, reduced vault rings), carry its own download budget and a spoiler declaration, and never expose the [protected mechanism] by default. If a strictly spoiler-free build is the priority, "no library, exterior silhouette only" is also defensible; decide before export effort, since the same shared data serves either outcome.

---

## REPOSITORY REALITY

The library exists, completely, as **executable Three.js source and nowhere else**. `web/src/core/library.js` is a thoroughly tested 56-room reconstruction (59 doors + 1 [protected mechanism], 44 windows, 340 bookcases); `web/src/world/aedLibrary.js` builds it procedurally. The Phase-1 export already enumerated it: **2,332 parts / 189,708 triangles / 65 material keys** sit in `world_derivatives.json` as excluded parts, and browser profiles confirm 23–91 draws / 100k–189k triangles for that batch. No library cell, GLB, shared JSON, native room, interaction, map or audio exists. The literary evidence (856 spatial edges, 361 library constraints, 441 entities) is unwired to runtime. The browser has the wider representation; Godot has six proof cells. That is the gap.

## MIGRATION DIFFICULTY

**MEDIUM** for a representative slice. Geometry is measured and pipeline-compatible; materials, lighting, player navigation and performance are easy. The real cost is the missing engine-neutral data contract, the storey-band/shell and stair batch boundaries, and a cell plan that avoids reloading one 190k-triangle floor synchronously. MEDIUM holds only if the first move is data extraction + a 10–12 room slice; attempting the full floor first becomes HIGH.

## WHAT CAN BE REUSED

`web/src/core/library.js` outputs (room polygons, doors, kinds, windows, letters/verses/holdings, entry/secret IDs) frozen once into shared JSON; the Phase-1 export pipeline (`slice_export.js`, `build_slice_assets.py`, `world_cells.gd` collision/residency pattern); coordinate conventions and anchors; `furniture.js` bookcase geometry via the export; canvas texture export path for 36 scrolls/3 pages/3 labels; native domain systems (hours, access, knowledge, interactions, portals, passage tracking, audio director, lighting rig); the evidence graphs as test assertions; and the browser's map/notebook logic as a reference for data-driven native UI.

## WHAT MUST BE REBUILT

Shared library topology/semantics/spoiler data; export cell rules including the storey-band decision for the Aedificium shell and the east-tower stair; native library cells + residency; material/label baking decisions; 56 location volumes (or a polygon-capable classifier); library acoustic bed and emitter config; native map and notebook presentation for rooms; native reimplementation of the reflective [protected mechanism], [protected event] and [protected space] props — or their deliberate exclusion; and validation anchors. Nothing about the browser implementation should be imported as a Godot scene.

## PROTOTYPE SCOPE

10–12 rooms: the east heptagon, five tower rooms, two blind rooms, two inner rooms, one optional wall room, entered via the east-tower stair from the scriptorium. Systems: library cell export + residency, room IDs, sample labels, one notation-based clue, hour variation, save-safe knowledge chain. Excluded: [protected space], both [protected mechanism]s, [protected event], full letter meta-structure, NPCs, map (stretch), scenario engine, whole floor.

## GAMEPLAY WE CAN TEST CHEAPLY

Route memory and route verification; room discovery and notebook recall; hour-gated access and atmosphere; inscriptions as readable objects; basic acoustic orientation; one notation-based catalogue lookup; knowledge-gated progression; day/night re-recognition of the same route.

## GAMEPLAY THAT IS CURRENTLY EXPENSIVE

Whole-labyrinth streaming; NPC navigation; persistent hypotheses/reasoning graphs; large-scale catalogue search; generic [protected mechanism] systems; production-grade acoustics per room; player-authored annotation with versioned saves; the full 56-room migration itself.

## PERFORMANCE RISKS

Synchronous entry/exit load hitch on a 190k-triangle floor; frustum-culling defeat from floor-spanning merged meshes; 65 material keys and 36 scroll textures (draw calls, texture memory); shadow casters (340 bookcases, 56 vaults); the real-time reflection pass for the [protected mechanism]; hundreds of small collision shapes; per-room acoustic raycasts; and the temptation to read the proof's 104 FPS as a guarantee for a different cell topology.

## WEB VERSION RECOMMENDATION

Default web explorer: a small, spoiler-safe library sample (entrance heptagon plus 4–6 rooms), genericized labels, no [protected mechanism]s, no [protected space]. Treat the full simplified labyrinth as an opt-in study view only, with simplified geometry baked to textures, its own download/prefetch budget, and an explicit spoiler declaration; it cannot be a default public path because the full floor is structurally the reveal. If the labyrinth must headline the web product, the honest options are a dedicated spoiler-gated edition or accepting that the web promise becomes "see the outside of the labyrinth" — decide before spending export effort, because the same shared library data can serve either outcome.

## NEXT AGENT-A TASK IF LIBRARY IS APPROVED

One bounded mission: **"Library Data Contract + East-Sector Slice."** Freeze the browser library topology and semantics into reviewed shared JSON (rooms, edges, labels, claim links, spoiler levels) with generator, schema and parity tests against `library.js`; add cell rules for the 10–12 room east sector, the east-tower stair and exactly the Aedificium shell band needed; extend the exporter only for storey-band selection and publish through the existing native pipeline; add room volumes and residency so native room-change, lighting and knowledge recording work; measure entry/exit stalls, frame budget and memory against the proof gates. Exclude the full floor, all [protected mechanism]/[protected space]/[protected event] content, gameplay, NPCs, map UI and web changes. Acceptance: a walkable, measurable slice plus the shared data contract a later full-floor or web decision can reuse.

## BIGGEST TECHNICAL RISK

**The library has no engine-neutral data contract, only executable builder code.** Because of that, the natural first move — exporting meshes into a Godot scene — would freeze an underdetermined reconstruction, an unreviewed label system and a spoiler policy into engine-specific files, while leaving the topology, access and semantics to fork between browser and native. Every other cost (cell rules, room IDs, labels, map, parity drift) is downstream of this. The raw geometry is not the risk: it is measured at ~190k triangles and already passes through the exporter. The risk is migrating the *building* before extracting the *data*.

---

*End of report. No repository files were modified; the only artifacts written were this report and a temporary read-only census script outside the repository.*
