# Development and validation

Run commands from the repository root unless noted. `README.md` gets you running; `PROJECT.md` holds current PM state, the active mission and ownership; `PLATFORMS.md` qualifies the evidence; `GAME_DESIGN.md` holds product decisions; `ASSETS.md` protects sources/licences. Do not regenerate literary extraction to implement a game feature.

## Toolchain and setup

The native proof pins **Godot 4.7.2.stable.official.ed1daf0bf**, standard edition, with matching export templates. `shared/data/manifests/toolchain.json` contains download/executable SHA-256 pins; the original download SHA-512 was checked against the official release sums. Obtain editor/templates from the [pinned official release](https://github.com/godotengine/godot/releases/tag/4.7.2-stable), verify hashes and install templates through the editor or its documented user template directory. Set `GODOT_BIN` to the executable, not the `.app` directory.

On this Mac the existing tool is `.local/tools/godot-4.7.2/Godot.app/Contents/MacOS/Godot`. Normal builds use committed normalized assets, Python 3.9+ and Node 24+. The render-cell checker uses Node’s `registerHooks`, tested on 24.4.0. The browser itself uses vendored r180 Three.js and needs no npm install. Python extraction tests were also exercised on system 3.9.6; extraction backend/tool compatibility is a separate prerequisite for a new LLM run.

Authoring/conversion tools additionally use ffmpeg and pinned npm dependencies:

```sh
npm ci --prefix scripts/migration
```

Their lockfile pins glTF Transform 4.5.1, meshoptimizer 1.3.0, sharp 0.35.5 and puppeteer-core 23.11.1. Blender/MPFB and asset source packs are needed only for full character rebuilding. Never run that packer directly over the only known-good cast. Private masters are described in `ASSETS.md`.

## Routine checks

```sh
npm test
npm run check:render
npm run check:data
npm run test:book
python3 scripts/check_repository.py
```

Browser tests cover library topology, place IDs, discovery/notebook migration, mirror input, route continuity, access, acoustics and streamed-recording lifecycle. Render checks conserve positions/normals/UVs/colours/winding, collisions and shadow policy through batching. Book tests cover ingestion, chunking/recovery, schema, consolidation, graphs, verification and report generation; real-EPUB ingestion skips on checkouts without a local book.

`build_content.py --check` validates without writing. Publishing generates `native/content/`, validates ten schema domains and cross-references, and strips literary evidence fragments for packaging. It never modifies `book_details/output/`. `build_manifest.py` verifies 154 known output/font hashes and records current runtime-content hashes. Changing a derivative requires a deliberate recipe/manifest update, not merely accepting a changed checksum.

Repository checks keep six canonical Markdown pages plus explicit operational/supporting sources, validate canonical links, literary hashes and relocated module imports, and ensure runtime routes do not expose research/private directories or accept unknown/symlink/traversal requests. The retained council/design files are supporting evidence, not additional active plans. Historical evidence/provenance can deliberately retain old paths.

## Native import, tests and exports

```sh
export GODOT_BIN=/absolute/path/to/Godot
bash scripts/migration/build_phase1.sh --fresh --functional
# Faster check after an unrelated docs change:
bash scripts/migration/build_phase1.sh --no-export
# Individual gates:
"$GODOT_BIN" --headless --path native --script res://tests/run_tests.gd
"$GODOT_BIN" --headless --path native --script res://tests/day1a_tests.gd
"$GODOT_BIN" --headless --path native --script res://tests/anchor_check.gd
"$GODOT_BIN" --headless --path native --script res://tests/pose_check.gd -- alinardo "$PWD/shared/data/manifests/pose_reference_alinardo.json"
```

Normal build order: literary hashes → browser-computed rule references → content publication → derivative verification → fresh import if requested → pinned import settings/re-import → 22 domain tests → 14 Day-1A domain tests (scenario consistency, William's lead/wait, five whole-day walker styles, getting up, naming, perception, save/restore) → thirteen fitted pose/normal checks → ten anchors → optional main-scene functional route/reload → Windows/macOS exports → package audit → literary hash comparison. Import errors are fatal. Domain negative-condition and known test-exit diagnostics are documented in `PLATFORMS.md`; an assertion pass is not a claim that the harness has no cleanup warnings.

Results/logs and packages go to ignored `builds/phase1/`; `EVIDENCE_OUT` can select an alternate check-output directory. Do not overwrite frozen `docs/evidence/phase1/` during routine checks. Original packages remain locally under `builds/phase1-original/`; new builds have their own hashes. Imported scene IDs can vary on fresh import, so compare resource content/behavior rather than requiring byte-identical PCKs.

Frozen large per-frame tables use `.csv.gz`; read them with `gzip.open(path, 'rt')` or `gzip -dc`. The consolidation manifest records uncompressed checksums. Reproducible comparison collages were removed; their original native/browser PNGs and comparison metadata remain.

The old pipeline’s local-master/raw-export dependency is now an **explicit regeneration** path:

```sh
bash scripts/migration/build_phase1.sh --regenerate-assets --no-export
# Also recreate ignored raw geometry from the running browser:
bash scripts/migration/build_phase1.sh --browser-export --no-export
```

The Day-1A world comes from a second section export (`shared/data/export/day1a_cells.json`: gate, guest house, flower garden, church west front, Aedificium exterior, terrain/walkable mask, tree tiles); `build_day1a_assets.py` derives it, `day1a_scenario.py` regenerates `shared/scenarios/day1a/day1a.json` and `normalize_animals.mjs` the mule. These need `.local/mh/cast-round3.glb`, pinned dependencies, ffmpeg and (for export) Chrome. Regeneration updates authored derivative manifests; inspect the diff and rerun pose/normal/anchor/functional gates. Normal native builds need none of those private regeneration inputs. `CHROME_BIN` selects Chrome; `BROWSER_VIEWPORT=1280x720` sets capture size. The driver intercepts only its served copy of `kit.js` to retain pre-merge parts; it does not modify the builder file or normal save.

```sh
# Optional browser captures/probe/export; config describes explicit shots/region:
node scripts/migration/browser_driver.mjs reference_shots.js path/to/shots.json --out .local/browser-shots
python3 scripts/migration/inventory.py
```

The CI recipe in `scripts/ci/github-actions-phase1.yml` remains inactive. It checks Linux/case-sensitive import and exports; it has not run. It must never stand in for Windows GPU/input/audio testing. Activate deliberately when a runner/toolchain setup is ready.

## Packaged scenarios and saves

```sh
APP="$PWD/builds/phase1/macos/AbbeySlice.app/Contents/MacOS/Abbey Slice"
"$APP" -- --mode=proof
"$APP" --resolution 1920x1080 -- --scenario=shots --out="$PWD/builds/phase1/evidence/visual" --label=mac
"$APP" -- --scenario=functional --out="$PWD/builds/phase1/evidence/functional" --label=mac --save-dir=user://functional_mac
"$APP" -- --scenario=functional-reload --out="$PWD/builds/phase1/evidence/functional" --label=mac --save-dir=user://functional_mac
"$APP" -- --scenario=fixture --out="$PWD/builds/phase1/evidence/fixture" --label=mac
"$APP" -- --scenario=audio --out="$PWD/builds/phase1/evidence/audio" --label=mac
scripts/migration/run_benchmarks.sh "$APP" mac route crowd cycles
# Day-1A (the default mode): the whole slice walked in real time, then ten residency loops
scripts/migration/run_benchmarks.sh "$APP" mac day1_walk day1_cycles
# Day-1A functional walks (may be accelerated; never used for performance):
"$GODOT_BIN" --path native -- --scenario=day1-walk --style=normal --timescale=3 --captures=on --record=nones --out="$PWD/builds/day1a" --label=functional
#   styles: normal | slow | rush | confused | ignore_nones; also day1-shots, day1-cast (close character review), day1-graph-audit (capsule sweep of every authored leg)
# Explicit longer qualification, when justified:
scripts/migration/run_package_evidence.sh "$APP" mac
```

Set `EVIDENCE_OUT` to change benchmark/evidence destination. Full evidence runs include high-resolution variants, startup and a twenty-minute soak. Baseline gates at physical 1920×1080: normal ≥60 FPS/p95 ≤25 ms; crowd ≥45 FPS/p95 ≤33.3 ms; no repeatable >100 ms stalls; ten residency cycles within 10% of warmed memory; twenty-minute soak without crash, graphics/audio/save failures. Record physical viewport, VSync/focus, hardware, driver, power and cache state. A short screenshot smoke is not a performance run.

Mac player saves: `~/Library/Application Support/AbbeySlice/saves/slot0.json`; Windows: `%APPDATA%\AbbeySlice\saves\slot0.json`. Day-1A writes `day1a_slot0.json` (format `abbey-day1a-save`) beside it, rejects a proof save offered to it and never overwrites one; its local telemetry goes to `user://day1a/telemetry/`. Automated scenarios use distinct save directories (scripted `day1-*` runs default to `user://day1a_runs/`). Current format validates version, body length/checksum, known IDs and values, writes `.tmp`, rotates `.bak`, then replaces. A corrupt save recovers with a report. Never overwrite a player save to run a test. Browser notebooks remain separate `abbey.notebook.v2` and QA `abbey.notebook.review.v2` storage.

To inspect package contents:

```sh
python3 scripts/migration/audit_package.py builds/phase1/windows/AbbeySlice.pck --json builds/phase1/pck-audit.json
python3 scripts/migration/audit_package.py --diff first.pck second.pck
python3 scripts/migration/analyze_audio.py builds/phase1/evidence/audio/audio_mac.json
```

The Mac-only portability helper creates a disposable case-sensitive APFS image, imports/tests/exports under a path with spaces/non-ASCII and compares package contents:

```sh
bash scripts/migration/check_portable_build.sh "$PWD/builds/portable" "$PWD/builds/portable/report.json"
```

This helper needs filesystem/mount permissions and is not a Windows test. Its original Phase-1 report remains frozen; this consolidation does not claim a second mounted-volume trial.

## Windows W1/W2 — still required

Use an actual Windows 11 x86_64 machine with a functioning integrated or discrete GPU. Test the packaged release, not only an editor or headless runner. Start with `builds/phase1/AbbeySlice-windows-x86_64.zip`; verify executable/PCK hashes against that build’s `pipeline/package_sha256.txt`. If testing the original package instead, use its frozen Phase-1 hashes, not new-build hashes.

Record OS build, CPU/RAM, GPU/driver, monitor resolution/refresh/scaling, power plan and mains status. Save a `dxdiag` report:

```powershell
Get-ComputerInfo -Property OsName,OsVersion,CsProcessors,CsTotalPhysicalMemory | Format-List
Get-CimInstance Win32_VideoController | Select Name,DriverVersion,AdapterRAM,VideoModeDescription
dxdiag /t "$env:TEMP\dxdiag.txt"
```

Extract to `C:\Test Ünïcode\Abbey Slice\`; run there throughout, and test a profile path with spaces if available. Preserve hashes and note any SmartScreen warning for the unsigned development executable.

**W1: Vulkan, then D3D12.**

```powershell
cd "C:\Test Ünïcode\Abbey Slice"
Get-FileHash .\AbbeySlice.exe, .\AbbeySlice.pck -Algorithm SHA256
foreach ($d in "vulkan","d3d12") {
  .\AbbeySlice.exe --rendering-driver $d -- --scenario=shots --out="$PWD\out_$d" --label=$d
  .\AbbeySlice.exe --rendering-driver $d
}
```

For each driver, check the log/JSON’s actual adapter/API/physical viewport, all 17 views and a crowd shot. Compare composition, faces, ledge snow, night lamps and landing label to Mac evidence. Check mouse capture/release by click/Esc; Alt-Tab away/back twice without stuck input; WASD/arrows/Shift/E/J/F and save/load; Turkish Q or another non-US physical layout; an Xbox-compatible controller (left/right sticks, A interact, Y notes, X lantern, Start pause). Record pad/layout and any missing mapping.

Listen: exterior wind, stone/snow footsteps, Prime chant from the church, doorway filtering without restart, office ending/reverb/creak and audio-device change/unplugging. Identify the click candidates in the recorded Mac route by ear. Objective playback position/gain is not approval of the mix.

**W2: functional/save, fixture and audio.**

```powershell
.\AbbeySlice.exe --rendering-driver vulkan -- --scenario=functional --out="$PWD\out" --label=win --save-dir=user://functional_win
.\AbbeySlice.exe --rendering-driver vulkan -- --scenario=functional-reload --out="$PWD\out" --label=win --save-dir=user://functional_win
.\AbbeySlice.exe --rendering-driver vulkan -- --scenario=fixture --out="$PWD\out" --label=win
.\AbbeySlice.exe --rendering-driver vulkan -- --scenario=audio --out="$PWD\out" --label=win
```

Require `pass: true`, earned observation/hint/descent with attribution, skull → ossuary classification, second-process persistence/no duplicates, teleport granting nothing and corrupted-save recovery. Confirm `functional_win/slot0.json` and `.bak` under the user directory. Then play the altar sequence manually, save, quit/relaunch/load and inspect the notebook. Run equivalent smoke/behavior under D3D12; document differences.

**W2: real GPU performance.** Set the desktop to 1920×1080 at 100% scaling, verify JSON texture size `[1920,1080]`, and run both drivers:

```powershell
foreach ($d in "vulkan","d3d12") {
  .\AbbeySlice.exe --rendering-driver $d --resolution 1920x1080 -- --scenario=route --vsync=off --duration=120 --name=route_$d --out="$PWD\perf" --label=win
  .\AbbeySlice.exe --rendering-driver $d --resolution 1920x1080 -- --scenario=crowd --vsync=off --duration=120 --name=crowd_$d --out="$PWD\perf" --label=win
  .\AbbeySlice.exe --rendering-driver $d --resolution 1920x1080 -- --scenario=cycles --vsync=off --name=cycles_$d --out="$PWD\perf" --label=win
}
.\AbbeySlice.exe --rendering-driver vulkan --resolution 1920x1080 -- --scenario=route --duration=120 --name=route_vsync --out="$PWD\perf" --label=win
.\AbbeySlice.exe --rendering-driver vulkan --resolution 1920x1080 -- --scenario=soak --vsync=off --duration=1200 --name=soak --out="$PWD\perf" --label=win
```

Sample process working set once per second in a separate PowerShell, with a separate timestamped file per run. Apply the Mac proof gates above; note focus/thermal/power conditions and API-specific failures. A D3D12 failure with a passing Vulkan run is a recorded compatibility result, not automatically total engine failure. Return raw JSON/CSV, memory samples, logs, hashes, dxdiag and human findings under `docs/evidence/windows/<build>/<machine>/`; update `PLATFORMS.md` only after real results exist. This repository currently contains none.

## Browser reference and future explorer

`python3 scripts/serve.py` maps `/` and `/index.html` to `web/index.html`, `/src` and `/lib` to `web/`, and `/assets` to `shared/assets`. It serves only files, rejects traversal/escape symlinks, disables directory listing and binds loopback. Public URLs and notebook storage are stable after the directory move.

```sh
npm run build:web:reference
python3 -m http.server 8002 --directory dist/web-reference
```

The static build includes only application/runtime assets and a size manifest. It excludes local audition music, books, native code and research. It is the existing heavier browser, not the budgeted lightweight explorer. Test deployment at a subpath too. The future viewer’s export/material/ID/budget gates are in `PROJECT.md#web_explorer_plan`.

`?debug&qa` opens the review panel with isolated notes. `__step`, `__view`, `__go`, people/task framing, walk checks and render profiling remain optional review tools. `?frame=640x360` fixes draw-buffer framing; `?quality=low|balanced|high` selects cost. GPU queries, all-pass draws and texture estimates must be interpreted separately from actual cadence. `enterWalk` is a study jump; physical passage recognition requires uninterrupted walking. QA controls are not player objectives.

## Research and repository conventions

From `book_details/`, `python3 main.py report` writes the eleven optional local Markdown reading views. `status` inspects extraction state. `scan`, `extract`, `consolidate`, `verify`, `all` are separate research operations and may invoke an LLM/change evidence; do not run them as game build steps. The current backend is `opencode-cli`; an OpenAI-compatible backend reads local environment/auth configuration. Credentials, raw EPUB/PDF/TXT, normalized full text, chunk/cache/log output stay ignored. The operational extractor definition is the one deliberately retained Markdown file outside canonical project docs.

Do not delete `.local/` for hygiene, commit raw books/private source packs, overwrite external visual notes, or silently change source authority. Keep IDs/metres/coordinate conventions stable. Put curated machine evidence in `docs/evidence`, routine outputs in `builds`/`.local`, and provenance in structured records. Keep the canonical six-page documentation set; update existing pages rather than appending pass reports or historical prompts. The finite council/design sources explicitly listed in `scripts/check_repository.py` preserve unique decision evidence. Their retention does not authorize a new report for every agent run. Inspect references, uniqueness, reproducibility and supersession before moving, consolidating or deleting other files.

## PM continuity and Git checkpoints

Use `PROJECT.md#pm-ledger` for current state, the active mission, roadmap and compact agent history; use `GAME_DESIGN.md#decision-history` for ACTIVE/EXPERIMENTAL/SUPERSEDED/REJECTED decisions. Do not create a parallel `project-management/` hierarchy. Each developer must be able to continue from these pages, the source and a fresh Git diff without private conversation context.

Before assignment or review, check the root, branch, status (including staged/untracked work), recent commits, remotes and ahead/behind state. Verify remote freshness when meaningful; a cached tracking ref alone is not a current remote check. Preserve the existing repository/history and branch. Never initialize nested repositories, reset unrelated work, merge automatically, rewrite history or force-push. If files are changing concurrently, establish who owns them before assigning overlapping work.

Give each mission a product question, scope, exclusions, acceptance criteria, validation requirements, developer/owner status and stop condition. The owner's notice that a developer has finished triggers the full [standing PM review protocol](PROJECT.md#standing-pm-review-protocol) before new development or phase advancement. Inspect the actual diff and appropriate checks/rendered result; track IMPLEMENTED, VERIFIED and EXPERIENTIALLY VALIDATED separately. Decide ACCEPT/FIX/ITERATE/REVERT/ADVANCE explicitly. Record evidence, remaining gaps and the resulting commit/range in the ledger. End every review with a concrete next action and a complete developer prompt when work remains. If interrupted, record completed/partial/untouched work, known failures and the next safe action.

Make coherent recovery checkpoints before risky work and after verified milestones, with messages describing intent. Stage only the reviewed mission files; inspect the staged diff, generated/binary eligibility and obvious credentials before committing. Do not bundle another developer's live implementation into a PM/documentation checkpoint or call an unfinished feature complete. Push normally when authorized and reviewed, keeping important local-only commits visible in the ledger. Periodically audit ignore rules, duplicate/dead systems/assets, generated outputs, documentation accuracy and pending platform/performance gates; update canonical state rather than adding another large report.
