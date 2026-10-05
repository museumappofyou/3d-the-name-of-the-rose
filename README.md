# The Abbey Project

A first-person historical investigation game in which the player is **Adapted Adso**, arriving beside William and learning the abbey through residence. Umberto Eco’s *The Name of the Rose* supplies the architectural and literary foundation. A continuous multi-day campaign contains bounded authored investigations; knowledge of places, hours and people is the player's progression.

**Native is the primary product: Windows first, macOS second, developed on macOS in Godot. Web is an architectural explorer with a smaller scope.** The last committed native checkpoint is a bounded migration proof. Day-1A implementation is underway in the working tree and awaits review. The browser still runs the larger reference reconstruction; the future lightweight viewer and Day-1B investigation are plans.

Current PM state, the active Day-1A brief, roadmap and agent log live in [Project](docs/PROJECT.md#pm-ledger). Product decisions live in [Game design](docs/GAME_DESIGN.md). Check Git before continuing: local implementation is not yet a verified checkpoint.

## Run what exists

Browser reference, with Python 3 and no dependency install:

```sh
npm start
# or: python3 scripts/serve.py --port 8000
```

Open `http://localhost:8000`. `?quality=low` reduces rendering work; it does not guarantee smooth performance in populated interiors. WASD/arrows move, mouse looks, E examines, J opens notes, F lights the lantern; P switches aerial/walking view and M opens the plan. The current reference exposes novel secrets. It is not the proposed spoiler-safe web edition.

Native proof, with the pinned **Godot 4.7.2 standard editor and matching export templates**:

```sh
export GODOT_BIN=/absolute/path/to/Godot
bash scripts/migration/build_phase1.sh --fresh --functional
"$GODOT_BIN" --path native -- --mode=proof
```

The build uses committed derivatives and needs neither private masters nor Chrome. It validates content, imports, tests and exports Windows/macOS development packages into ignored `builds/phase1/`. Native controls: WASD/arrows, mouse, E interact, J notebook, F lantern, Esc pause, F5 save, F9 load, F12 QA. Saves use the existing `AbbeySlice` user directory.

**Validated scope:** Alinardo’s porch → cloister → church → skull altar → first ossuary landing. Mac proof metrics: 104.6 FPS route / 100.5 FPS crowd at physical 1080p. Windows GPU runs, human audio/input review and the recurring stair unload hitch remain open. These measurements establish the slice’s feasibility, not whole-game performance.

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
