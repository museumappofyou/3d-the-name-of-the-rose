# Project and product architecture

## PM ledger

**PM:** Codex. **Updated:** 2026-10-06. This section owns current state, the active mission, the near-term roadmap and compact agent history. Product decisions are in [Game design](GAME_DESIGN.md#decision-history); platform evidence and gates are in [Platforms](PLATFORMS.md). Supporting council reports retain their original recommendations, including superseded ones.

### Standing PM review protocol

Codex remains the Project Manager and Technical Reviewer. Whenever the owner says a developer has finished, treat that as a request for a full PM review before assigning more development or advancing a phase. Developer/model identity may change; continuity belongs to this ledger, repository evidence and Git, not a private chat.

Inspect the actual branch, recent commits, staged/unstaged diff, modified and untracked files, affected systems, tests/builds and rendered behavior where relevant. Compare them with the original mission, exclusions and acceptance criteria. Identify incomplete work, regressions, architecture and UX/design problems, performance concerns, documentation drift and claims whose validation was not actually run. A completion report alone is never acceptance.

Make an explicit **ACCEPT / FIX / ITERATE / REVERT / ADVANCE** decision, with remaining gates and evidence. Keep implementation, verification and experiential validation separate. Update canonical state/decisions and the agent log; make coherent reviewed implementation and PM checkpoints as appropriate. Check whether validated commits should be pushed to the intended branch and push when safe. Preserve unrelated/in-progress changes. Never force-push, rewrite history, reset unrelated work or make destructive Git changes without explicit instruction; a REVERT decision does not authorize those operations.

Every completed PM review ends with these sections: **PM Assessment**, **Git / Repository State**, **Decision**, **Next Step**, and **Developer Prompt**. The next step must be concrete. If more development is required, supply a complete ready-to-paste mission with scope, exclusions, files, acceptance checks and stop condition. If no developer task is needed, explicitly state the owner's next action instead. Do not end at analysis or accept/advance because the developer says the task is done.

### Current state

| Item | Verified repository state at the Day-1A completion review |
|---|---|
| Branch / checkpoints | `migration/phase-1-godot`; reviewed implementation `e223bc2` (five developer commits after `5b2a85a`), already published to origin. Last accepted gameplay baseline remains the Phase-1 proof at `7c6f836`; Day-1A is an implementation checkpoint, not an accepted product milestone. Read fresh Git state for the subsequent PM checkpoint |
| Authoritative remote | `origin` → `git@github-moy:museumappofyou/3d-the-name-of-the-rose.git` |
| Working tree at handoff | Clean, no staged or untracked work; live origin matched `e223bc2`. Independent builds/probes use ignored `builds/pm-review/day1a-2026-10-06/`; original developer packages were preserved |
| Native modes | Day-1A is the default. The proof remains behind `--mode=proof`; its functional route and second-process reload passed independently |
| Day-1A implementation | Arrival → Sext/gate → guest cell → solo chest route → meal → free period → physical Nones → end exists. Seven new world cells stay resident; authored cast, two mules, first-person carry/sit actions, description/name memory and internal observation log exist. Day-1B exclusions were respected |
| Story/design | Round-1, Round-3 Adso, Round-4 library and full Day-1 sources are preserved in `373ee82`; they were untracked at intake. The full-Day-1 minimum in the design is superseded by the A/B split below |
| Independent checks | Git-only fresh build: 339 derivative hashes, domain 22/22, Day-1A 14/14, thirteen pose/normal checks, ten anchors, proof functional/relaunch, both exports and Windows PCK audit pass. Browser 29/29, extraction 21/21, render/data/repository checks and nine literary hashes pass. Known harness exit diagnostics remain |
| Failed scene gates | Seven save probes fail: pause Save/Load dispatch to proof storage; meal dialogue/choice reloads lose progression; end reloads leave stop/card state inconsistent; Nones reload relocates the community. An eighth probe learns Fulco's name from a queued introduction even when interrupted before presentation. Passing domain tests miss these failures |
| Performance | Raw final 1080p walk confirms 129.9 FPS / p95 10.75 ms / maximum 59.6 ms. Cycle report: 133.9 FPS, one 124.69 ms frame; no retained raw cycle frames, and warm-up is only the initial gate leg. Cold 541–591 ms stalls and RSS drift remain unexplained; resident loops do not clear the proof's streaming hitch |
| Product validation | PM inspected source and rendered captures; fresh packaged scripted walking is functional evidence. Owner/unfamiliar-player play, listening, controller/focus/layout trials and actual Windows W1/W2 remain NOT RUN. Route learnability, William's relationship and ordinary-life appeal are unproven |
| Decision / focus | **FIX Day-1A**, then PM re-review and owner + unfamiliar-player/listening/canon review. Do not start Day-1B |

Structured intake history remains in [PM state](evidence/pm-state.json); independent completion findings are in [Day-1A PM evidence](evidence/day1a/pm_review.json). `IMPLEMENTED` means changes exist; `VERIFIED` means relevant checks succeeded; `EXPERIENTIALLY VALIDATED` means a person played, listened or used the relevant input. An uninterrupted scripted route does not establish save/relaunch safety or player enjoyment.

### Active mission — Day-1A

**Status:** initial implementation finished; completion review decision **FIX** on 2026-10-06. **Previous developer:** Claude Opus 5.5 xHigh, reported by the owner. **Next developer:** corrective pass unassigned; its brief below is independent of model/private context. **Product question:** does living in this abbey as Adso already feel worth continuing before a mystery begins?

**Scope:** a 20–30 minute foundation from the final road bend through arrival, Sext at the gate, reception, guest room, first repeated route, ordinary meal with William, a few recurring residents, a short free period and Nones. This is a target duration, not a measured playtime.

- Reuse the Phase-1 route and extend only the road/gate/avenue/flower garden/guest stair and one guest room. The Aedificium supplies low-detail exterior context; its interiors remain outside this mission.
- Give William coherent appearance and physical lead/wait behavior: he can notice, pause and let Adso catch up. Optional wandering must remain recoverable without arrows, repeated scolding or teleporting him. Restrained speech and silence are part of the scene.
- Establish Adso through first-person sleeves/hands and a few justified carry/place/sit actions. No generic inventory or new progression stats. Two mules/simple halter behavior are optional if they do not compromise the core proof.
- Use a small cast with recognizable roles, ordinary concerns and understandable whereabouts. Design names remain provisional until source-name/office review; absence from architectural extraction does not prove a name is unused.
- Make the meal an ordinary human scene and give the player a short independent period. A repeated route must be navigable from landmarks and memory.
- Nones must change visible activity, movement, church occupation and sound; access changes must permit safe egress. A bell alone does not satisfy the transition.
- Save/relaunch must preserve the bounded sequence, physical actors, carried/placed objects and time without duplicating events. Isolate proof and campaign saves; never overwrite a player's proof save to run checks.

**Relevant systems/files:** `native/scripts/main.gd`, `adapters/world_cells.gd`, `adapters/day1a/`, `domain/day1a/`, `ui/`, `bench/day1a_runner.gd`, `native/tests/`, `scripts/migration/build_day1a_assets.py`, `build_content.py`, `browser/slice_export.js`, `shared/scenarios/day1a/day1a.json`, `shared/data/export/day1a_cells.json`, `shared/data/manifests/world_day1a_derivatives.json` and the native Day-1A derivatives. Refresh Git before editing. Treat the [full Day-1 design](../story-council/day-1/OPUS_DAY1_DESIGN.md) as scene intent; its 60–75 minute prototype and 280–330 line estimate are not this assignment.

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

### Corrective mission — make Day-1A safe to playtest

Read the canonical docs and [independent PM review](evidence/day1a/pm_review.json), inspect fresh Git status/history, and reproduce before fixing. Reviewed source: `e223bc2`; keep this branch and preserve other work. This is a Day-1A correction, not a redesign.

1. **Protect every save entry point.** Route pause-menu Save/Load and its displayed path to Day-1A in that mode; retain proof behavior. Seed a proof slot in scratch storage and verify main/backup bytes survive repeated Day-1A saves/loads. Test actual HUD requests, F5/F9 and separate-process relaunch.
2. **Resume interrupted scenes.** Preserve or deterministically recover queued required dialogue, active choices/HUD, carried/placed objects, mule/hold state and actor paths. Reloading Tebaldo's meal lines or William's open question must permit progression. Learn names when the introduction is presented, not merely queued; interrupting an unheard introduction must not create identity memory. Restore an end autosave on a fresh launch and an earlier slot after the end card; synchronize `_ended`, HUD/prompts, body/audio and clock. Validate new saved fields and handle schema-1 data explicitly.
3. **Keep Nones physical.** Save/load before/at the bell, during movement, in choir and afterward must retain community position/activity/routes without teleporting to stalls, duplicate bells, premature chant or lost exits. Bounded actor persistence is sufficient. Replace the `or true` persistence assertion; add meaningful scene/relaunch regressions, including repeated loads into already-used objects.
4. **Make performance evidence reliable.** Warm up the complete benchmark loop; retain compressed per-frame cycle data and aligned RSS/object/resource samples. Investigate cold stalls before attributing them to shaders; use loading-time preparation only if measured to help. Run isolated cold/warm trials, the 1080p route, ten measured loops and at least twenty measured soak minutes after full warm-up. Report unexplained RSS/FPS shifts honestly; resident scenes do not validate streaming.
5. **Improve William's existing walk.** Calibrate stride/playback against movement and reduce slide/deep knee bend; inspect walking/talking distance with before/after captures. Preserve lead/wait and restrained dialogue. Keep the body as an explicit stand-in for this proof; a bespoke-model project is outside this fix mission.

Use isolated save/telemetry paths for all QA. Preserve literary outputs, private masters, supplied music, visual bible and frozen evidence. Rerun native domain/Day-1A/pose/anchor, proof functional/relaunch, clean build/package audit, browser/data/render/book/repository checks and nine literary hashes. Passing existing tests alone does not close the reproduced failures. Keep local raw artifacts ignored; retain concise structured evidence and update canonical docs, without new Markdown reports. Commit coherent fixes and push normally after checks; do not rewrite history or mark the PM gate accepted yourself.

**Stop:** return a hash-identified Day-1A playtest candidate and results/limitations for PM review. No Snow in the Straw, notebook inference, Vespers/night/Day 2, library/full interiors, population expansion, broad frameworks/refactors, asset-pipeline replacement or web viewer. Human listening, owner/unfamiliar play, finished-book canon/spoiler review and Windows W1/W2 require the person/hardware; remain NOT RUN until actual trials. Scripted walkers and waveform analysis do not fill those gaps.

**After corrective PM review:** the owner and at least one unfamiliar player play without coaching/markers, listen to bells/chant/doorway transitions, and record William's presence, route recall, resident recognition, Nones pacing and desire to continue. The roughly 65-second bell-to-chant delay remains provisional until experienced. A finished-book reviewer checks names/offices/lines without forward spoilers for the owner. Actual Windows trials gate broad migration; none is currently complete.

### Near-term roadmap

| Order | Work | Dependency / gate |
|---|---|---|
| Now | Correct save/reload/name memory, benchmark evidence and William's walk; PM re-review | Eight independent scene failures; corrective mission above |
| After fixes | Owner + one unfamiliar-player play/listening; finished-book canon/spoiler review | Safe identified package; no coaching; product-gate observations |
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
| `1859082` → `e223bc2`, 2026-10-05/06 | Claude Opus 5.5 xHigh: derivatives, arrival-to-Nones, scripted-save isolation, benchmarks and evidence; five commits pushed | IMPLEMENTED. Automated checks pass independently; save safety, interrupted progression and Nones continuity fail PM probes. Human/Windows gates NOT RUN |
| 2026-10-06 Codex review of `e223bc2` | Git-only rebuild/export, native/browser/book checks, raw-frame audit, isolated scene probes and rendered package/capture inspection | **FIX**; no Day-1B advancement. Eight failed scene probes and evidence limits recorded; no gameplay fixes or player-save changes by PM |

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
| Scenario overlays | Bounded `shared/scenarios/day1a/day1a.json` exists; general investigation contracts remain planned | Add events/objects without redefining the base layout; original lines/people remain marked internally |

This is a transition, not a claim that both runtimes already read one complete shared world database. The browser still reads JS data and builder functions. Shared JSON covers the proof and bounded Day-1A overlay. Its world manifests and imported native GLBs are generated products. Moving a folder does not complete system migration.

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
