# Migration and platform state

**Godot remains the provisional native choice. The Mac proof and bounded Day-1A build work; actual Windows runtime and the campaign's product gates remain open.** Frozen proof evidence is under `docs/evidence/phase1/`; Day-1A implementation and independent PM review evidence are under `docs/evidence/day1a/`. Procedures live in `DEVELOPMENT.md`.

## Why Godot

The full experience needs reliable frame pacing, fitted humans/animation, spatial audio, stable NPCs, physics/access, saves and native profiling. The existing browser reference gives valuable architecture and data but has substantial geometry, shadows, submission and texture costs. Low quality reduces some costs without establishing smooth indoor play. An engine does not automatically repair bad normals, excessive assets or weak game design.

Godot’s standard, typed GDScript project provides scene tooling, desktop exports and a testable domain layer without the project/editor complexity of a larger engine. Mac results support this choice. Unity remains a fallback if Windows/import requirements fail or mature tooling needs dominate; Unreal’s production overhead and stronger-hardware demands do not fit this bounded project today. Reopening engine comparisons without a concrete failed gate would consume time better spent validating the platform and the game.

## What Agent A actually added

The phase-start checkpoint matches all prior dirty browser implementation files. Phase 1 added:

- A Godot 4.7.2 project, six render/collision cells, a pivoting altar, twelve steps, the first ossuary landing and a labelled temporary boundary.
- Testable domain services for hours, knowledge, interactions, room classification, access, audio transport and saves; scene/player/presentation/UI adapters.
- Five fitted templates (Alinardo, monk_a, scribe_a, monk_b, novice_a), nine task clips each, a 53-joint shared skin per person and lowered-hood morphs. The crowd fixture uses 46 synthetic `bench:*` IDs and four templates, not canonical identities or navigation AI.
- Section export, normalization, audio/material/field conversion, anchor extraction, reviewed JSON/schema contracts, manifests and browser-computed parity references.
- Headless and packaged functional checks, 72 acoustic path comparisons, pose/normal and anchor checks, a noncanonical door/nav/acoustic fixture, benchmark/soak/startup telemetry and visual/audio captures.
- macOS universal and Windows x86_64 development exports, a package privacy audit and a case-sensitive/non-ASCII Mac portability check. A Linux CI recipe was written but not installed or run.

Phase 1 did not replace the browser world, finish the Aedificium/library, migrate all animals/recordings, implement an investigation or create a production NPC simulation. `VISUAL_BIBLE.txt` changed externally; it is not Agent A’s native implementation. The original report’s “browser unchanged” statement is accurate relative to its phase-start checkpoint, not relative to the old Git HEAD.

The initial branch pointed at `213d9a2`, also `main`/`origin/main`; no Phase-1 commits existed. Agent B first preserved the pre-existing browser baseline separately, then the native proof, then its tooling/evidence. Reorganization and design follow those commits. No existing history was rewritten.

## Frozen Mac proof, 1–2 October 2026

Hardware recorded in each JSON: Apple M1 Pro (10 CPU / 16 GPU cores), 32 GB, macOS 26.5.2, native Metal. Engine executable: `4.7.2.stable.official.ed1daf0bf`. Standard edition, typed GDScript, Jolt at 60 Hz, Forward+, MSAA 2×, SSAO, 4096 directional shadows, no baseline GI or resolution scaling. VSync was off for primary measurements.

| Run | Measured duration | FPS average | p95 frame | Maximum | Frames >100 ms |
|---|---:|---:|---:|---:|---:|
| Normal route, 1920×1080 | 120 s | 104.6 | 11.05 ms | 64.04 ms | 0 |
| 46 presentations, 1920×1080 | 120 s | 100.5 | 11.21 ms | 17.84 ms | 0 |
| Route, requested 2304×1149 | 120 s | 84.2 | 13.32 ms | 70.05 ms | 0 |
| Crowd, requested 2304×1149 | 120 s | 82.5 | 13.42 ms | 19.12 ms | 0 |
| Twenty-minute soak | 1200 s | 104.4 | 11.47 ms | 70.30 ms | 0 |

Higher-resolution runs actually produced **2304×1150**, not 1149. Agent B recomputed frame counts/FPS and checked p95/max/stalls directly from all five CSVs: 12,554 / 12,066 / 10,110 / 9,901 / 125,244 frames. Results agree with the JSON. See `docs/evidence/consolidation/phase1-raw-audit.json`. Large frame tables are retained losslessly as `.csv.gz`, with original checksums in the consolidation manifest; RSS tables remain plain CSV. This is an audit of recorded performance, not a new 20-minute measurement after reorganization.

Ten residency cycles recorded RSS 387.1 → 387.5 MiB (+0.1%) and flat 351 MiB VRAM. The soak recorded 5/5 save read-backs, changing hours, crowd activation and no growing RSS trend. Packaged cold start was playable in 2.02 s, warm starts in 0.90/0.91 s; original fresh import took about 6.5 s. Logs/JSON/CSV are retained, including focus and exit diagnostics.

The normal route used about 160 average / 283 maximum all-pass draws and 631k average / 890k maximum primitives; textures peaked at about 217 MiB, total monitored VRAM at 355 MiB. Crowd animation averaged 1.41 ms; its peak 3.3M primitives and 1212 draws exceed the normal envelope. Do not compare browser and Godot counters as if they count identical passes. Metal GPU timing and release static-memory counters read zero; external RSS and renderer monitors supply the available memory evidence.

The VSync-on run lost focus in 6870/14030 frames, so the old table’s 98.8 FPS is the **focused subset**, not the whole run. Soak/SDFGI also contain unfocused frames; their focused/unfocused rates agree closely. Route, crowd and both high-resolution baseline runs were fully focused. SSIL measured about 90.6 FPS and SDFGI 69.7 FPS at 1080p; SDFGI adds roughly 380 MiB VRAM. Neither becomes the default before Windows validation.

## Behavior and data gates

| Gate | Evidence/result |
|---|---|
| Observe altar → ask available Alinardo → turn altar → physically descend | Packaged and headless functional/reload JSON pass |
| Inspecting never opens; opening never awards passage; teleport/load never invent traversal | Domain tests and real-physics main-scene route pass |
| Room transition skull → ossuary without cemetery flicker | Domain and functional path pass |
| Knowledge idempotence and attribution, versioned save, second-process reload, truncated-save recovery | Pass; snapshots store IDs/data, not rigs or NodePaths |
| Alinardo availability, Prime chant/light and night lamps | Tests/captures pass for slice |
| Door/curfew safe egress; collider/nav/acoustic state aligned | 8/8 fixture steps; fixture is not an implemented abbey doorway system |
| Schema, condition/action vocabulary and references | Ten reviewed data domains validated; book-derived IDs retained |
| Pose parity | 45 clips across five people; maximum 8.3 µm vs 1 mm tolerance |
| Anchors | Ten checks; floor errors around 0.4–1.2 µm vs 1 cm tolerance |
| Audio | Continuous office transport, paths/filtering and recorded output pass objective checks |
| Book preservation | All nine SHA-256 values match phase-start checkpoint |
| Browser and book tests | 29 and 21 passed independently; render-cell conservation passed |

The current “knowledge” system records discoveries; it does not yet distinguish an NPC’s disputed assertion from established truth. That distinction is required for original investigations.

## Day-1A completion review, 6 October 2026

Reviewed source `e223bc2` contains the five developer commits `1859082`, `aa033e9`, `269401f`, `6851034`, `e223bc2`; live origin matched it and the tree was clean. The developer package was exported from `6851034`; the later commit records evidence/docs. The original Windows ZIP hash is `ad43a3b4ab7568dc31d236f5b656059a9006e5ad318c13d02f9a759b51ec527e`. Its PCK is `f15e72ded5756764fd4486b94be57dd8f0c3e519c62c59c2bab2d0f0b1dba07a`; the unmodified Windows template has the same executable hash as the proof. Package identity is not runtime approval.

The PM independently rebuilt an exact Git archive without `.local`, generated content/import cache or migration npm dependencies. Fresh import, all 339 derivative hashes, native domain 22/22, Day-1A domain 14/14, thirteen pose/normal checks, ten anchors, proof functional/relaunch, both exports and the Windows package audit (1,075 files) pass. Browser 29/29, book 21/21, render/data/repository checks and nine literary hashes pass. Known harness cleanup/negative-test diagnostics remain. The build does not exercise Day-1A menu or interrupted-scene saves.

Seven additional save probes against the actual Day-1A scene fail: pause Save overwrites the proof slot and pause Load uses it; meal reload drops pending lines or choices and stalls progression; end-card/stop flags do not follow restored state; at the Nones bell a brother jumps approximately 44 m into a stall. An eighth probe learns Fulco's name before his introduction is presented, retaining it even when the queued line is interrupted. The existing mid-route persistence test also contains an `or true` assertion. **Decision: FIX**, with reproductions and corrective scope in [PM evidence](evidence/day1a/pm_review.json) and [Project](PROJECT.md#corrective-mission--make-day-1a-safe-to-playtest). None of the player's real save files was used for PM checks.

The developer's final Mac package measurements use the same M1 Pro/32 GB/macOS 26.5.2/Metal setup, built-in Retina display, physical 1920×1080, VSync off. The generic report header's older external-display description is inconsistent with the detailed runtime JSON; use the latter's recorded viewport/display fields.

| Recorded Day-1A run | FPS average | p95 frame | Maximum | Frames >100 ms | PM verification |
|---|---:|---:|---:|---:|---|
| Final whole slice, 21.5 minutes | 129.9 | 10.75 ms | 59.6 ms | 0 | Recomputed from 167,167 raw frames |
| Ten measured resident traversal loops | 133.9 | 10.44 ms | 124.69 ms | 1 | Aggregate/row audit; no retained raw cycle frames |
| Earlier first-package walk | 120.6 | 11.17 ms | 591.5 ms | 2 | Recomputed from 155,202 raw frames; separate 541 ms stall |

The final road/gate portions average 91.7/84.7 FPS, so the overall rate is not every area's rate. Ten loop rows exist, but code and row 0 show a warm-up **gate approach only**, not a complete extra loop. Recorded RSS falls from about 482 MiB to 379 MiB, then rises roughly 3 MiB/loop to 400 MiB; loop FPS shifts from about 109 to 145. These changes were not diagnosed. A warm-up baseline, raw frames, aligned external RSS and a longer measured soak are required to qualify the trend. Shader compilation and operating-system reclamation are hypotheses; no successful corrective intervention has established them.

Day-1A keeps all cells resident. Its loops exercise traversal/visibility, not load/unload streaming, and do not fix or test the proof's stair hitch. PM's fresh rendered scripted package run is accelerated functional/capture review, not a new performance benchmark. An unfamiliar player has not tested route recall; listening, owner/external play, controller/focus/layout trials and Windows W1/W2 remain NOT RUN. Nones activity is implemented, but the approximately 65-second bell-to-chant delay and level remain unjudged by ear.

## Asset findings and rendering qualifications

Original `cast.glb` and `tasks.glb` cannot directly import with their required meshopt/quantization extensions. Decoded derivatives retain integer joint/weight encodings, topology, clothing, fitted keyframe timing and `bendDrape`; they bind clips by stable bone name. Authored browser normals were already corrupt on seven of nine parts. The normalized native copies restore them from the retained `.local/mh/cast-round3.glb`, with topology, per-index position and constant-bind checks. The browser source remains defective. Recomputing arbitrary smooth normals would lose authored splits; do not overwrite its cast without a separate validated repair.

Semantic native materials use captured browser keys rather than pretending an exported material placeholder equals the original shader. UV scales, vertex colour, snow/wetness, generated relief and terrain fields are adapted in native shaders/resources. Baseline is no GI beyond SSAO. Night/altar/stair views remain dark; visual parity is approximate, not a pixel match or final art approval. Inspect `visual/native`, `visual/browser`, shot metadata and comparison data in frozen evidence.

Audio contains streamed `chant_deus.mp3` and wind, cropped footstep banks and a creak. Objective recording is 51.2 s, 48 kHz stereo, peak about −4 dBFS; one office start persists through a doorway and same-office hour change. Four click candidates occur on the outdoor walk; they have not been identified by listening. Source timing and recording licences survive in structured manifests. Full room audio, all office pieces and device handling are not validated by this subset.

## Packaging and reproducibility

Original proof PCK: 45,646,600 bytes / 561 files, SHA-256 `b8655a6904d858a4c2135a2dbd9f041642b6b25875e7430a73a965ae5ba8344e`. Windows executable is the official unmodified release template, SHA-256 `d34d36f3be1a6c49c56525ae86469b92e4f417ddf0b43cf00dd80c385c4b0562`. Other hashes are in `docs/evidence/phase1/package/package_sha256.txt`; their recorded paths refer to the old tree. Original packages remain locally in ignored `builds/phase1-original/`. All original package hashes were checked before any rebuild.

The Mac package is universal/ad-hoc signed and not notarized; only Apple silicon was exercised. Windows export succeeding on Mac is W0 only. Original portability evidence used a fresh case-sensitive APFS volume and `Test Ünïcode/Abbey Slice`; 541/561 PCK entries were identical, the 20 differences were imported scene node IDs. Byte-identical PCK hashes are not a clean-import acceptance rule.

After consolidation, normal `build_phase1.sh` publishes data, verifies committed derivative hashes, imports/tests and exports without ignored masters, raw-export cache or migration npm dependencies. `--regenerate-assets` and `--browser-export` are explicit authoring paths with additional prerequisites. Import errors now stop the pipeline, `build_content.py --check` performs no writes, and new checks go to ignored build output rather than overwriting frozen Phase-1 evidence. The inactive CI recipe’s former private-master dependency is removed; the recipe itself remains unexecuted.

Agent B also tested a temporary copy containing only Git-eligible files: no `.local`, raw section cache, migration dependencies, native import cache or generated content. Fresh import, 154 derivative checks, 22 domain tests, all five pose/normal checks, ten anchors and functional/second-process reload passed under a path with spaces/non-ASCII. Both exports passed in the main tree, and the staged browser loaded at a static subpath without missing requests. This is recorded in [consolidation validation](evidence/consolidation/validation.json); it is not a new Windows or case-sensitive-volume trial.

## Remaining gates and next decision

| Open item | Consequence / bounded response |
|---|---|
| Real Windows W1/W2, Vulkan and D3D12 | Engine commitment is conditional; run packaged GPU/input/audio/save/performance checks before broad migration |
| Stair-head 60–85 ms unload frame | Visible repeated hitch despite passing 100 ms gate; profile releasing cells/collision/resources and budget disposal across frames |
| Human listening | Listen to current Mac/Windows package; identify click candidates, balance, doorway/reverb behavior |
| Mouse/focus, controller, keyboard layouts, audio-device change | Bindings/objective events do not validate interactive feel; record real trials |
| Browser cast normals | Separate repaired derivative and visual/pose/topology regression proof required |
| Screenshot capture reliability | One new filtered multi-shot run repeated the previous image for `cloister_day`; an independent single-shot run matched the frozen cloister view. Harden capture synchronization/pose metadata before accepting automated visual parity |
| Mac Intel, signing/notarization, public asset/novel/plan clearance | Development proof only; no public native release established |
| Test exit diagnostics | Domain/anchor/pose harnesses emit known ObjectDB/resource-at-exit warnings; invalid-condition negative test intentionally emits an error; investigate cleanup without calling this an error-free test run |
| Full-world rendering/NPCs/audio/save | Outside proof; do not extrapolate slice performance or synthetic crowd to production |

The active gate remains **Day-1A: William, learned routes, ordinary life and Nones**. Initial implementation is complete, but the PM decision is **FIX** before a safe playtest candidate and independent player/listening review. Day-1B is held. [Project](PROJECT.md#active-mission--day-1a) owns the corrective mission; [Game design](GAME_DESIGN.md) records the Adapted Adso campaign decision. The Leaf Before Vespers remains a later idea.

Actual Windows W1/W2 still gates broad migration/final engine commitment. Fresh export/PCK audit is W0 only. The Phase-1 stair hitch, browser normals, subjective audio and close-character/input questions remain open; no subsequent hash-identified human/Windows trial was provided at this review.
