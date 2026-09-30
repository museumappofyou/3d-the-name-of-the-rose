# Gülün Adı — The Abbey

A walkable 3D reconstruction of the abbey in Umberto Eco’s *The Name of the Rose*, built from the Turkish edition and the plan printed in the novel. Explore the abbey, its working interiors and the 56-room library labyrinth through the canonical hours.

## Run

Double-click **start.command** on macOS, or run from the repository root:

```sh
npm start
# Alternatively, without Node:
python3 scripts/serve.py
```

Open **http://localhost:8000**. Python 3 is required for the server; Node is needed for npm commands and the app tests. No dependency installation or internet connection is needed to explore: Three.js, fonts, textures, models and audio are included. Opening `index.html` directly will not load the modules.

The macOS launcher finds the first available port starting at 8000. To choose another port manually:

```sh
python3 scripts/serve.py --port 8001
```

## Explore

Use the place index or plan to enter a location. On foot, **WASD / arrows** move, **Shift** hurries, the mouse looks, **E** examines, **F** lights the lantern and **J** opens your notes. **P** switches walking and aerial views, **M** opens the plan and **N** switches noon/night. The clock changes canonical hours; the seals control sound, weather and image quality.

See the [exploration guide](docs/EXPLORATION.md) for story routes, hidden mechanisms, study navigation and reconstructed spaces. The [documentation index](docs/README.md) gathers development notes, design direction, audits, provenance and research.

## Verify

```sh
npm test
(cd book_details && python3 -m unittest discover -s tests -v)
```

The app tests cover library topology, room counts, route words and place data. Pipeline tests cover ingestion, extraction recovery, consolidation, verification and report generation; the real-book ingestion check is skipped when no local book is present.

The latest recorded browser audit is in the [30 September implementation report](docs/realism/NEXT_PASS_REPORT.md). Debug controls and maintenance commands are in [Development](docs/DEVELOPMENT.md).

## Repository

| Path | Contents |
|---|---|
| `index.html`, `src/` | Application, geometry, world, systems and interface |
| `assets/` | Offline fonts, textures, models, audio, plan and in-app credits |
| `lib/` | Vendored Three.js and three-mesh-bvh with their licence files |
| `scripts/`, `start.command` | Restricted local server, launcher and asset/research tools |
| `tests/` | App tests |
| `book_details/` | Extraction pipeline, tests and structured evidence data |
| `docs/` | All project documentation, generated book reports and audit evidence |

Source books, full normalized text, extraction caches, logs, local assistant state and the earlier `_legacy_gpt/` source stay local through `.gitignore`. The server exposes only the web application: `index.html`, `src/`, `lib/` and `assets/`.

Asset authors, licences and conversion details are recorded in [audio sources](docs/assets/AUDIO_SOURCES.md), [model sources](docs/assets/MODEL_SOURCES.md) and the in-app Credits folio. Reconstruction decisions are traced in [Reconstruction](docs/RECONSTRUCTION.md) and the [provenance records](docs/provenance/).
