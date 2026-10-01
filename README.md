# The Abbey Project

A reconstructed abbey becomes a place for observation, manuscript investigations and discovery. Umberto Eco’s *The Name of the Rose* supplies the architectural and literary foundation. The recommended game is a series of authored investigations in a consistent monastery, alongside optional novel-derived scenarios and free study.

**Native is the primary product: Windows first, macOS second, developed on macOS in Godot. Web is an architectural explorer with a smaller scope.** Today the native build is a bounded migration proof; the browser still runs the larger, heavier reference reconstruction. The future lightweight viewer and the first original investigation are plans, not implemented features.

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
"$GODOT_BIN" --path native
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

Read [Project](docs/PROJECT.md) for ownership and `WEB_EXPLORER_PLAN`, [Platforms](docs/PLATFORMS.md) for migration status, [Game design](docs/GAME_DESIGN.md) for the recommended experience and next Agent A mission, [Assets](docs/ASSETS.md) for provenance/licences, and [Development](docs/DEVELOPMENT.md) for maintenance. These five pages plus this README are the entire canonical project documentation.

The extraction agent’s Markdown definition remains because the pipeline consumes it. Generated book reading reports are optional, local views in `book_details/reports/`; JSON/JSONL evidence is authoritative. `.local/` contains irreplaceable authored masters and recovery checkpoints: ignoring it is not a backup policy. The externally edited `VISUAL_BIBLE.txt` remains untouched and local.
