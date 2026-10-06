# The Abbey Project

A first-person historical investigation game in which the player is **Adapted Adso**, arriving beside William and learning the abbey through residence. Umberto Eco’s *The Name of the Rose* supplies the architectural and literary foundation. A continuous multi-day campaign contains bounded authored investigations; knowledge of places, hours and people is the player's progression.

**Native is the primary product: Windows first, macOS second, developed on macOS in Godot. Web is an architectural explorer with a smaller scope.** Day-1A is implemented and published at `e223bc2`, but its PM review requires **FIX** before acceptance: menu save/load, interrupted meal/end reloads and Nones continuity fail independent probes. The browser remains the larger reference reconstruction; Day-1B and the lightweight viewer are plans.

Current state, the corrective Day-1A mission, roadmap and agent log live in [Project](docs/PROJECT.md#pm-ledger). Product decisions live in [Game design](docs/GAME_DESIGN.md); independent review evidence is [here](docs/evidence/day1a/pm_review.json). Check fresh Git before continuing.

## Run what exists

Browser reference, with Python 3 and no dependency install:

```sh
npm start
# or: python3 scripts/serve.py --port 8000
```

Open `http://localhost:8000`. `?quality=low` reduces rendering work; it does not guarantee smooth performance in populated interiors. WASD/arrows move, mouse looks, E examines, J opens notes, F lights the lantern; P switches aerial/walking view and M opens the plan. The current reference exposes novel secrets. It is not the proposed spoiler-safe web edition.

Native prototype, with **Godot 4.7.2 standard editor and matching export templates**:

```sh
export GODOT_BIN=/absolute/path/to/Godot
bash scripts/migration/build_phase1.sh --fresh --functional
"$GODOT_BIN" --path native -- --save-dir="$PWD/builds/day1a-review/saves" --telemetry-dir="$PWD/builds/day1a-review/telemetry"
# Day-1A default: road → gate → guest room → meal → free period → Nones; scratch saves for review
"$GODOT_BIN" --path native -- --mode=proof  # the frozen Phase-1 proof
```

The build uses committed derivatives and needs neither private masters nor Chrome. It validates content, imports, tests and exports development packages into ignored `builds/phase1/`. Proof controls: WASD/arrows, mouse, E interact, J notebook, F lantern, Esc pause, F5/F9 save/load, F12 QA. Day-1A uses movement/mouse, Shift, E, replies 1–4, Esc/options and F5/F9; the notebook is deferred. Its quick/autosave format uses `day1a_slot0.json`, but the pause-menu buttons incorrectly use the proof's `slot0.json` at the reviewed revision. Use scratch storage while reproducing; save isolation and reload safety await the corrective pass.

**Verified technical scope:** the proof route/relaunch and a fresh Git-only Day-1A build/export pass existing checks. The recorded final Day-1A Mac walk recomputes to 129.9 FPS / p95 10.75 ms at physical 1080p. Additional save probes fail; first-use stalls, William's gait and memory qualification need work. Owner/unfamiliar play, human listening/input and Windows runtime remain unvalidated. Resident Day-1A cells do not fix the proof's stair unload hitch.

## Verify and build

```sh
npm test                         # 29 browser/domain tests
npm run check:render              # render/collision conservation
npm run check:data                # reviewed schemas, IDs, literary references
npm run test:book                 # 21 extraction tests
python3 scripts/check_repository.py
npm run build:web:reference       # dist/web-reference; no research/private music
```

Full native commands and the Windows W1/W2 procedure are in [Development](docs/DEVELOPMENT.md).

## Repository

| Path | Responsibility |
|---|---|
| `native/` | Godot proof and future full game: domain, scene adapters, UI, tests, derivatives |
| `web/` | Current Three.js browser reference and vendored runtime; future small viewer belongs here |
| `shared/assets/` | Existing common source derivatives, credits, textures, recordings, fonts and plan |
| `shared/data/` | Reviewed slice data, schemas, semantic IDs, section-export rules and manifests |
| `shared/provenance/` | Reconstruction decisions, asset sources, character design notes, historical references |
| `book_details/output/` | Nine unchanged source-derived evidence files; extraction code/tests beside them |
| `scripts/` | Conversion, restricted serving, builds, validation and an inactive CI recipe |
| `docs/evidence/` | Structured measurements, captures and audit records; not another documentation hierarchy |
| `.local/`, `music/`, `builds/`, `dist/` | Ignored masters, checkpoints, source recordings and generated outputs |

Read [Project](docs/PROJECT.md) for PM state, the active mission, ownership and `WEB_EXPLORER_PLAN`, [Platforms](docs/PLATFORMS.md) for migration status, [Game design](docs/GAME_DESIGN.md) for the current experience and decision history, [Assets](docs/ASSETS.md) for provenance/licences, and [Development](docs/DEVELOPMENT.md) for maintenance. These five pages plus this README are the entire canonical project documentation. The explicitly retained `story-council/` files are supporting design evidence; their proposals and old implementation briefs do not override the active mission.

The extraction agent’s Markdown definition remains because the pipeline consumes it. Generated book reading reports are optional, local views in `book_details/reports/`; JSON/JSONL evidence is authoritative. `.local/` contains irreplaceable authored masters and recovery checkpoints: ignoring it is not a backup policy. The externally edited `VISUAL_BIBLE.txt` remains untouched and local.
