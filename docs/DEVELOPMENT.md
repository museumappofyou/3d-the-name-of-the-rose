# Development

No build step: `index.html` loads ES modules through an import map (`three`, `three/addons/`, `three-mesh-bvh` → `lib/`).

Run commands from the repository root unless stated otherwise. Python 3 runs the server; Node runs the app tests. The browser application uses vendored dependencies and needs no `npm install`.

```sh
npm start
npm test
(cd book_details && python3 -m unittest discover -s tests -v)
```

The extraction pipeline is independent of the web app. Its [guide](research/PIPELINE.md) describes source input and LLM configuration. Tests use temporary fixtures; the real-EPUB check is skipped when there is no local source book.

- `npm test` runs the Node tests for the pure modules (`src/core/library.js`, `src/data/places.js`).
- `?frame=640x360` renders at a fixed size, which helps when the browser window cannot be resized.
- `?debug` installs helpers on `window`:
  - `__step(n)` advances *n* frames (useful when the tab is throttled in the background)
  - `__go(target, position)` places the aerial camera
  - `__view(x, y, z, yaw, pitch)` places the walker, feet at *y*
  - `__shot(name)` renders 1280×720 and POSTs a JPEG to `http://127.0.0.1:8124/<name>`; any small receiver that writes the request body to disk will do.

Performance notes: static geometry is merged per material and per building (≈110 draw calls from the air). Interiors are drawn only within 45 m on foot or 150 m in the air, snow, smoke and flame glows are three point clouds, and the eight nearest flames share a pool of point lights.

The notebook (`src/systems/notes.js`) keeps its state in `localStorage` under `abbey.notebook.v1` (notes, library rooms walked, how far along the passage under the church). `__abbey.notes.clear()` resets it. Any `enterWalk()` (Index, plan, Walk here, the address, the audit bot) counts as a study jump: the walked-route note needs frames of real walking from the turned altar (the route bot calls `walker.update()` without `frame()`, so it never awards it).

`scaled()` in `src/core/materials.js` resets the `version` that `Texture.copy()` bumps when the shared image has not arrived yet, and marks the copies for upload from the loader's callback; without it every frame drawn before a texture download ends logs "Texture marked for update but no image data found".

## Maintaining assets and documentation

All documentation lives in `docs/`; [the index](README.md) distinguishes current implementation records from historical plans. Keep structured research in `book_details/output/`. Markdown reports are generated into `docs/research/book/`, while a pipeline run with a custom `--root` writes to its own `reports/` directory.

```sh
# Rebuild audio attribution from the checked-in source and crop records:
python3 scripts/audio/sources_md.py

# Regenerate book reports from existing research, without extraction or LLM calls:
(cd book_details && python3 main.py report)
```

The audio source generator writes `docs/assets/AUDIO_SOURCES.md`; model conversion and attribution are documented in [MODEL_SOURCES.md](assets/MODEL_SOURCES.md). Rebuilding audio sprites requires NumPy, ffmpeg and the original recordings. Model conversion requires the `@gltf-transform/core`, `@gltf-transform/extensions`, `@gltf-transform/functions` and `meshoptimizer` packages; the people builder also uses ffmpeg. These optional tools are not needed to run the app.

`.gitignore` excludes source books, normalized full text, chunk/cache data, usage logs, Python bytecode, installed dependencies, local assistant/editor state and `_legacy_gpt/`. It preserves the extraction agent definition and reviewed alias/uncertainty records. Local reference screenshots belong in `.local/`; curated audit evidence stays beside the reports.

The server in `scripts/serve.py` exposes only `index.html`, `src/`, `lib/` and `assets/`, with directory listings disabled. For a static deployment, publish those app paths. Source books and working research are not app assets.
