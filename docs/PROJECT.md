# Project and product architecture

## PM ledger

**PM:** Codex. **Updated:** 2026-10-05. This section owns current state, the active mission, the near-term roadmap and compact agent history. Product decisions are in [Game design](GAME_DESIGN.md#decision-history); platform evidence and gates are in [Platforms](PLATFORMS.md). Supporting council reports retain their original recommendations, including superseded ones.

### Standing PM review protocol

Codex remains the Project Manager and Technical Reviewer. Whenever the owner says a developer has finished, treat that as a request for a full PM review before assigning more development or advancing a phase. Developer/model identity may change; continuity belongs to this ledger, repository evidence and Git, not a private chat.

Inspect the actual branch, recent commits, staged/unstaged diff, modified and untracked files, affected systems, tests/builds and rendered behavior where relevant. Compare them with the original mission, exclusions and acceptance criteria. Identify incomplete work, regressions, architecture and UX/design problems, performance concerns, documentation drift and claims whose validation was not actually run. A completion report alone is never acceptance.

Make an explicit **ACCEPT / FIX / ITERATE / REVERT / ADVANCE** decision, with remaining gates and evidence. Keep implementation, verification and experiential validation separate. Update canonical state/decisions and the agent log; make coherent reviewed implementation and PM checkpoints as appropriate. Check whether validated commits should be pushed to the intended branch and push when safe. Preserve unrelated/in-progress changes. Never force-push, rewrite history, reset unrelated work or make destructive Git changes without explicit instruction; a REVERT decision does not authorize those operations.

Every completed PM review ends with these sections: **PM Assessment**, **Git / Repository State**, **Decision**, **Next Step**, and **Developer Prompt**. The next step must be concrete. If more development is required, supply a complete ready-to-paste mission with scope, exclusions, files, acceptance checks and stop condition. If no developer task is needed, explicitly state the owner's next action instead. Do not end at analysis or accept/advance because the developer says the task is done.

### Current state

| Item | Verified repository state at PM intake |
|---|---|
| Branch / checkpoints | `migration/phase-1-godot`; last trusted gameplay checkpoint `7c6f836afd17a87d407172c9727e8d4e26818598`; PM/design checkpoint `373ee82`. The live remote matched the gameplay checkpoint at intake. Read fresh Git state for current HEAD and publication status |
| Authoritative remote | `origin` → `git@github-moy:museumappofyou/3d-the-name-of-the-rose.git` |
| Working tree | Active, uncommitted Day-1A implementation. Source files changed during inspection; treat it as concurrent work and inspect a fresh diff before any developer handoff |
| Last trusted native scope | Phase-1 porch/cloister/church/altar/first stair landing. Existing Mac measurements are historical proof evidence, not measurements of Day-1A |
| Day-1A | Partial world export/derivatives, optional content loading, terrain/tree residency, mode composition and new scene/capture scaffolding observed. Seven additional world cells are listed in the local manifest. Arrival-through-Nones gameplay has not been accepted |
| Story/design | Round-1, Round-3 Adso, Round-4 library and full Day-1 sources are preserved in `373ee82`; they were untracked at intake. The full-Day-1 minimum in the design is superseded by the A/B split below |
| Checks rerun at intake | Browser 29/29; extraction 21/21; render conservation; ten shared-data domains; all nine literary-output hashes unchanged. These checks do not validate the new Day-1A domain or presentation |
| Playable/buildable status | The committed proof has recorded build/functional evidence. No clean Day-1A build, packaged route, independent playtest or human listening was established by this intake audit |
| Important open gates | Actual Windows W1/W2; human audio/input/controller review; 60–85 ms stair unload hitch; browser cast normals; close-character quality; arrival-day canon review |

Structured inspection details and preservation hashes live in [PM evidence](evidence/pm-state.json). `IMPLEMENTED` means changes exist; `VERIFIED` means the relevant inspection/checks succeeded; `EXPERIENTIALLY VALIDATED` means a person played, listened or used the relevant input. Record these separately. No Day-1A acceptance follows from existing Phase-1 results.

### Active mission — Day-1A

**Status:** implementation in progress; PM review pending. **Developer:** owner/model unconfirmed at intake; do not start a competing implementation. Opus 5.5 xHigh is the owner's preferred implementer if available, not a verified assignment. **Product question:** does living in this abbey as Adso already feel worth continuing before a mystery begins?

**Scope:** a 20–30 minute foundation from the final road bend through arrival, Sext at the gate, reception, guest room, first repeated route, ordinary meal with William, a few recurring residents, a short free period and Nones. This is a target duration, not a measured playtime.

- Reuse the Phase-1 route and extend only the road/gate/avenue/flower garden/guest stair and one guest room. The Aedificium supplies low-detail exterior context; its interiors remain outside this mission.
- Give William coherent appearance and physical lead/wait behavior: he can notice, pause and let Adso catch up. Optional wandering must remain recoverable without arrows, repeated scolding or teleporting him. Restrained speech and silence are part of the scene.
- Establish Adso through first-person sleeves/hands and a few justified carry/place/sit actions. No generic inventory or new progression stats. Two mules/simple halter behavior are optional if they do not compromise the core proof.
- Use a small cast with recognizable roles, ordinary concerns and understandable whereabouts. Design names remain provisional until source-name/office review; absence from architectural extraction does not prove a name is unused.
- Make the meal an ordinary human scene and give the player a short independent period. A repeated route must be navigable from landmarks and memory.
- Nones must change visible activity, movement, church occupation and sound; access changes must permit safe egress. A bell alone does not satisfy the transition.
- Save/relaunch must preserve the bounded sequence, physical actors, carried/placed objects and time without duplicating events. Isolate proof and campaign saves; never overwrite a player's proof save to run checks.

**Relevant systems/files:** `native/scripts/main.gd`, `adapters/world_cells.gd`, `adapters/day1a/`, `domain/`, `ui/`, `bench/day1a_runner.gd`, `native/tests/`, `scripts/migration/build_day1a_assets.py`, `build_content.py`, `browser/slice_export.js`, `shared/data/export/day1a_cells.json`, `shared/data/manifests/world_day1a_derivatives.json` and the native Day-1A derivatives. The exact in-progress file list must be refreshed from Git. Treat the [full Day-1 design](../story-council/day-1/OPUS_DAY1_DESIGN.md) as scene intent; its 60–75 minute prototype and 280–330 line estimate are not this assignment.

**Acceptance and validation:**

1. Walk arrival → gate → guest room → repeated route → meal → free period → Nones without QA jumps or live coaching. Wandering, waiting, leaving/revisiting and reload remain recoverable.
2. Inspect William walking, waiting and sitting at normal conversational distance: coherent body/robe/face, feet on surfaces, pelvis on the seat, hands contacting props. Record whether he feels like a person and whether Adso feels like his young companion.
3. An unfamiliar player can retrace the first route and recognize a few residents. Record hesitation, hint dependence and whether ordinary life makes them want to continue. Developer completion is separate from player validation; the full Day-1 eight-person playtest comes after A/B.
4. Record Nones before/during/after: people visibly stop/relocate, church use and audio change, and affected thresholds agree with access/collision state. No identity swaps or unexplained position jumps.
5. Verify interrupted save/relaunch, object custody, event idempotence and proof-mode regression. Run the existing native domain/pose/anchor/functional checks plus meaningful Day-1A checks after implementation is stable; keep all nine literary hashes unchanged.
6. Capture the new route and hour transition on the Mac with hardware, engine, physical viewport and package/source identity: at 1920×1080, ≥60 FPS, p95 ≤25 ms, no repeatable >100 ms stalls, and ≤10% warmed memory growth over ten relevant residency cycles. Existing synthetic crowd results remain presentation evidence only.
7. Inspect actual rendered characters, guest stair/doors, meal contact and light. Listen by ear to bells, footsteps, chant and doorway changes; report human listening as NOT RUN if no person has listened. Likewise keep actual Windows W1/W2 and controller trials open until run on their target hardware.

**Exclusions and stop:** stop after Nones and its review evidence. Do not implement Snow in the Straw, notebook inference/claims, Vespers, the night ending, Day 2, library migration, full refectory/scriptorium/Aedificium interiors, production crowd AI, RPG systems, broad refactors or the lightweight web viewer. Preserve unrelated dirty work, literary outputs, private masters and frozen Phase-1 evidence.

**Blockers/dependencies:** Windows hardware and a finished-book canon reviewer are unconfirmed; human listening and external player evaluation remain open. These limit validation and broad migration commitment, but do not prohibit this already authorized bounded Mac foundation. Canon/source-sensitive scenes stay provisional; do not introduce protected events to bypass an unresolved decision.

**PM review:** inspect the actual diff and reproducible package/results; assess each criterion as implemented, verified and experientially validated. Choose FIX/ITERATE for failed relationship, route or ordinary-life gates. Advance to Day-1B only after the foundation passes its relevant product gates, with external/platform gaps explicitly recorded. A developer's completion report alone is not acceptance.

### Near-term roadmap

| Order | Work | Dependency / gate |
|---|---|---|
| Now | Finish and review Day-1A | Recover current developer assignment; preserve concurrent work; prove ordinary life through Nones |
| Parallel gate | Windows W1/W2, human listening/input, stair-hitch diagnosis and canon review | Real hardware/person/source review; preserve separate statuses |
| Next | Day-1B: Snow in the Straw; minimal seen/told/inference notebook; Vespers/night/Day-2 hook | Day-1A accepted; not started by this mission |
| Then | External full-Day-1 playtest, approximately eight unfamiliar players with reader/non-reader/investigation experience | A/B complete; decide fix/iterate/advance from observations |
| Later | 10–12 native library rooms, about seven as a cognitive core | Stable Day-1 foundation; test Remembered Labyrinth before migrating all 56 |

Day 2, delegation detail and the lightweight web viewer follow demonstrated needs. Campaign duration, final notebook/map UI and release controller scope remain unresolved. The Leaf Before Vespers is retained as a later case concept, not a competing active milestone.

### Compact agent log

| Stage / checkpoint | Agent role and result | PM assessment / remaining evidence |
|---|---|---|
| `af90d42` → `adfa003` | Prior Agent A: browser baseline preserved, bounded Godot proof added | Mac proof recorded; Windows/human review open; exact implementing model not re-established |
| `4cf0d3a` → `7c6f836` | Prior Agent B: conversion/evidence and product/document consolidation | Reproducible proof and evidence retained; design at this checkpoint was subsequently superseded |
| Round 3 / Round 4, pre-intake untracked sources | Claude/GPT/Grok/DeepSeek/Gemini; GLM took the Round-4 contrarian role | Owner selected Adapted Adso and a secondary Remembered Labyrinth pillar; disagreement retained |
| 2026-10-05 full Day-1 source | Claude Opus 5.5, lead campaign design (reported High) | Design exists; owner reduced implementation to A/B; no implementation acceptance implied |
| 2026-10-05 Day-1A working tree | Active implementer unconfirmed; world pipeline and scene/capture scaffolding observed changing | Partial implementation, no commit or completion claimed; review after a stable handoff |
| 2026-10-05 Codex PM intake, `373ee82` | Git/remote, docs, diffs, literary hashes and read-only regression checks inspected; canonical mission/governance repaired | Supporting sources preserved; no native/human/Windows rerun claimed. PM checkpoint is separate from unfinished implementation |
| 2026-10-05 owner standing instruction | Codex's continuous PM/reviewer role and completion-triggered review/report/prompt protocol made explicit | Governance only; Day-1A remains in progress. Reviewed PM checkpoints may be pushed safely without including the dirty implementation |

## Two products, one abbey

The native game owns investigations, stable people, canonical hours, restricted access, discovery, deduction and persistent state. Windows and macOS are its targets. The web explorer owns immediate architectural access: a URL, a readable monastery, basic traversal and a small amount of contextual inspection. It has no parity requirement with the game.

The current browser is a valuable construction/reference tool, not the finished lightweight product. It procedurally builds almost the whole abbey, including the 56-room library, grounds and service buildings. Its animation, shadows, composer, detailed geometry and textures make some views costly. The native proof migrates only six render/collision cells around the cloister/church/skull stair. A 46-person stress fixture is synthetic presentation load, not 46 independent inhabitants.

## Ownership and authority

| Layer | Current authority | Rule for future work |
|---|---|---|
| Literary evidence | `book_details/output/claims.jsonl`, facts, hierarchy, graphs, constraints | Read only during game work; retain claim IDs, certainty and citations |
| Reconstructed layout | `web/src/core/plan.js`, `library.js`, `web/src/world/` | Current single authoring source; export sections instead of redrawing them |
| Reviewed engine-independent rules | `shared/data/*.json`, `schemas/` | Native consumes generated runtime copies; browser parity references detect drift |
| Frozen architectural export | `shared/data/export/slice_cells.json`, census, native world GLBs | Manifest links the export to builder hashes; raw export cache is ignored |
| Common source derivatives | `shared/assets/` | Both products derive from these; engine-specific packing is allowed |
| Native presentation | `native/scripts/adapters/`, shaders, scenes | Bind semantic IDs; scene names/NodePaths are not literary or save IDs |
| Scenario overlays | Planned, described in `GAME_DESIGN.md` | Add events and objects without redefining the abbey’s base layout |

This is a transition, not a claim that both runtimes already read one complete shared world database. The browser still reads JS data and builder functions. Shared JSON covers the proof only. Its world manifests and imported native GLBs are generated products. Moving a folder does not complete system migration.

When architecture changes, change the authoritative builder, export the affected section once, validate anchors/collision/IDs, then produce separate native and web derivatives. If a later native editor workflow becomes the authoring authority, transfer a section explicitly: supply a neutral GLB plus semantic sidecar and retire that section’s procedural ownership. Never edit the browser builder and native reconstruction independently. Native `.tscn` files must not become the only portable record of layout.

## Native implementation

`native/scenes/main.tscn` boots `scripts/main.gd`. `Content` and `Game` are autoloads; domain classes accept explicit data/session objects so they can be tested without scenes.

- `scripts/domain/`: clock/horarium, allowlisted conditions/actions, knowledge, portals, passage tracking, room classification, access, routines, office transport, acoustic paths, interactions and versioned saves.
- `scripts/adapters/`: resident world cells and collision, player, interaction reach, altar pivot, Alinardo presence, fitted characters, lighting/audio, and a separate door fixture.
- `scripts/ui/`: HUD, notebook, pause/save/load, QA panel.
- `scripts/bench/`: automated functional routes, telemetry, 46 synthetic presentations, soak and visual captures.
- `assets/`: committed normalized GLBs, materials, fields, textures, recordings and fonts with import recipes. `.godot/` is a cache. `content/` is rebuilt from shared data and excluded from Git.

The normal proof loads/unloads section cells synchronously. It has no production NPC path planning, whole-world streaming, scenario engine or whole-game save. The door/nav/acoustic fixture is deliberately noncanonical and outside the abbey.

## Coordinates and reconstruction constraints

Metres; **+X east, +Y up, +Z south**, north = −Z. Browser and Godot use the same right-handed frame; no mirroring or rescaling occurs. The plan is interpreted at 0.42 m/pixel with origin at plan pixel (330, 290). The book gives no scale bar: absolute dimensions and storey heights are reconstruction choices. Characters face local +Z; preserve the same slot yaw. Export cells currently retain world-space vertices and identity root transforms.

`shared/data/anchors.json` records sources and ten checks. Important proof values: porch seat root (−9.88, 0.31, 14.135); altar hinge (14.652, 0.35, −13.99), swing −1.45 rad; twelve treads descend from 0.35 to −2.8 m. The book says more than ten steps; exactly twelve is reconstructed. Room volumes test feet +0.3 m in priority order. The native stair resolves skull → ossuary without the browser’s cemetery flicker.

The library topology is constrained to 56 rooms, four heptagons, eight blind rooms, 28 outward-windowed and 16 inward-windowed rooms. Counts and textual adjacency chains are tested; unmentioned openings and exact shapes remain reconstructed. The plan, textual descriptions and inferred circulation must not be treated as identical evidence.

Known reconstruction qualifications: the Aedificium “crown” silhouette is only partly achieved from the hospice/abbot views; the hidden wall stair occupies an engaged pier rather than fully modelled wall thickness; the postern interpretation conflicts with an “only opening” claim; upper guest-floor heights and many door placements are inferred. Translation slips and ambiguous entities remain in structured evidence/uncertainty records. Do not raise platforms or move passages casually: that changes routes, views, time and deduction possibilities.

Detailed legacy decision rows, including superseded implementations, survive in `shared/provenance/reconstruction-decisions.json`. Their statuses are not proof that the present code still behaves as described.

## WEB_EXPLORER_PLAN

### Purpose and audience

A fast, spoiler-aware architectural visit for curious readers, researchers, students, portfolio visitors and people who want to see the project without installing a game. The public promise is “walk through a simplified reconstruction and understand what supports it.” An original case is not required to enjoy it.

### Technical decision

**Build a small Three.js/WebGL2 viewer from optimized neutral scene exports, reusing selected existing controller/UI code. Keep the existing browser reference until that viewer passes its gates.** Preserve the current pinned r180 while preparing the exporter; upgrade only for a demonstrated need. No framework or WebGPU requirement is necessary.

| Option | Benefit | Cost in this repository | Decision |
|---|---|---|---|
| Trim the current app in place | Immediate reuse of full layout and UI | Expensive systems are woven into startup/builders; deleting NPCs alone does not solve geometry/shadow costs | Reference and export tool; temporary low-quality mitigation |
| Minimal Three viewer of exported sections | Small entry bundle, controlled loading/materials; independent product budget | Needs portable materials, collision/metadata and staged cell loading | Recommended destination |
| Web GLBs derived from native pipeline | One abbey and auditable derivative hashes | Godot shaders/material resources are not portable PBR; native GLBs use placeholder semantic materials | Use neutral pipeline inputs plus a web material conversion/bake |
| Godot web export | Reuses game code and scenes | Requires Compatibility rather than this proof’s Forward+; adds engine payload and separate rendering/audio compromises | No current advantage for an architectural viewer |
| Babylon.js / PlayCanvas / generic model viewer | Capable viewers and tooling | Rewrites controller/inspection/export assumptions without demonstrated benefit; generic viewers lack indoor traversal/accessibility UI | Reconsider only if a measured prototype beats the chosen path |

Godot’s current web docs require WebAssembly/WebGL2 and the Compatibility renderer; single-thread export avoids cross-origin-isolation headers. Thus “Godot web always requires SharedArrayBuffer” is outdated. Forward+/Mobile still cannot be reused on web. This is an architecture decision, not a claim that Godot web is unusable. [Godot web export](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html).

Three’s glTF loader supports meshopt and KTX2 via registered decoders/transcoders. Pin and ship those offline; benchmark download, decode and GPU residency separately. [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html), [KTX2Loader](https://threejs.org/docs/pages/KTX2Loader.html).

### Shared export contract

One exported section supplies render geometry, a simpler independent collision mesh, material semantic keys, metre transforms, bounds, room/portal/inspection IDs, source hashes and per-record content classification. Portable sidecars hold authored room volumes and text metadata. GLB `extras` may carry IDs, but must agree with the sidecar; array order and mesh names are not IDs.

Web derivatives merge by material **within sections**, instance repeat props, reduce hidden-detail geometry and atlas/bake procedural surfaces. Baking a neutral fixed daylight look is acceptable; it must not bake a moving portal closed. Use shared texture sources, capped atlases and measured meshopt/KTX2 variants. Native keeps dynamic shaders and richer materials. The existing export already proves section geometry, collision, texture/field capture and anchors; it does not yet supply an optimized whole-abbey web package.

### Deliberate feature scope

Include the exterior enclosure and grounds silhouette, church, cloister, selected service interiors, refectory/kitchen, scriptorium and an optional library study view as later sections. Start with the existing proof’s public areas; do not load every interior on entry. Include mouse/keyboard walking with collision, aerial overview or plan, place jumping, clear control help, basic daylight presets and 6–12 optional evidence/architecture inspection points. Optional ambient wind/bell/one room bed starts only after user input and respects mute.

Exclude the 46-person population, fitted high-end cast, NPC AI, full routines, case saves, deduction, secret-mechanism chains, combat, cloth, expensive GI/postprocessing and the complete acoustic simulation. Default paths must not reveal novel secret entrances or ending events. A library topology/secret overlay requires a separate spoiler opt-in; a study jump never masquerades as earned gameplay knowledge.

### Browser budgets (targets, not measurements)

| Gate | Initial target |
|---|---|
| Bootstrap transfer (compressed JS/CSS/fonts) | ≤1.5 MB |
| First walkable section, cumulative transfer | ≤10 MB, including bootstrap; optional sound excluded |
| Whole architectural visit downloaded on demand | ≤35 MB excluding optional audio; no cast/tasks download |
| Ready to walk | ≤6 s cold at 20 Mbps / 50 ms RTT on the declared reference laptop |
| Ground traversal | ≥30 FPS, p95 ≤33.3 ms at a 1280×720 draw buffer on ordinary integrated graphics; aim 60 on M1 Pro |
| Draws / visible geometry | ≤150 main-view draws; ≤250k visible triangles; separate shadow/all-pass counts |
| Residency | ≤128 MiB estimated texture storage; ≤350 MiB measured JS/process working set where observable |
| Continuous walk | No repeatable >100 ms loading hitch; no sustained growth over 10% after ten cell cycles |

Use DPR 1 by default, one modest shadow map or baked contact shading, fog/culling, section residency and distance detail. Ordinary current desktop Chrome, Edge, Firefox and Safari are test targets; record versions, devices, physical draw-buffer size and cold/warm cache state. Mobile is optional future work. Browser memory numbers are implementation estimates, not precise total VRAM claims. Revisit budgets only with measured results and an explicit product decision.

### Migration and coexistence

1. Extract one public cloister/church cell set into a separate small entry module; no current app replacement yet.
2. Export neutral geometry/materials/IDs from the same source used for native; validate 3+ anchors, floor heights, reachability and room IDs against native/reference.
3. Load the minimum section first and stream neighbours. Reuse or reduce controller/plan/inspection UI; do not import `web/src/main.js` and hope tree-shaking removes its game systems.
4. Test cold transfer, GPU frame cost, context restore, pointer lock/focus, mute and one static subpath deployment across the browser matrix.
5. Add interiors section by section only while budgets hold. Switch the default web build after public scope, spoiler controls and comparison evidence pass. Retain the procedural authoring source until ownership is explicitly transferred.

The two products share versioned geometry/data and provenance, not a live Godot runtime or every mechanic. A native case can add a temporary object/door-state overlay; the public architectural export omits it unless explicitly approved for that viewer’s purpose.

### Build and deployment

Now: `python3 scripts/build_web.py` stages the **existing reference** into `dist/web-reference`, excludes books, research, masters and unassigned review music, and emits its size manifest. It is about 52 MB uncompressed and has not met the lightweight targets. Serve that directory on any static HTTPS host; relative asset URLs support a project subpath.

Future: `dist/web-explorer` contains only the viewer, manifest, selected GLB/texture/collision cells, metadata, licences and optional audio. Use hashed assets and immutable caching, short-cache HTML/manifest, Brotli/gzip for text and suitable cache headers for GLBs. No server, account, COOP/COEP or secret API keys are needed for the proposed Three viewer. Deployment must publish the explicit build directory, never the repository root. This mission prepares the build boundary; it does not deploy a public site.
