# Previous reconstruction: guide and research notes

Historical documentation of the earlier reconstruction. Its source remains locally in `_legacy_gpt/`, excluded from Git because the active application is in `src/`. Commands and descriptions below belong to that version; use the [current README](../../README.md) to run the active app.

## Original guide

An interactive Three.js reconstruction of Umberto Eco’s monastery, researched from the Turkish EPUB and the plan supplied in this folder. It runs locally, without a build step, CDN, external fonts, or package installation.

### Open it

Double-click **start.command** on macOS, or run:

```sh
npm start
```

Visit **http://localhost:8000**. If that port is occupied:

```sh
python3 scripts/serve.py --port 8001
```

The launcher chooses the first available port starting at 8000. Close the server with Ctrl+C. Opening `index.html` directly with `file://` will not load ES modules. Python 3 is required for the server; Node is needed only for the optional npm commands and tests.

The included server exposes `index.html`, `src`, `lib`, and `assets` only. It does not expose the local EPUB, research notes, or screenshots. Do not deploy the repository root with a general file server; copy only the web application files if you publish it.

### Explore

- **Overview:** drag to orbit; scroll or use +/− to zoom. Shift-drag or right-drag pans.
- **Places:** choose one of ten lettered landmarks, or search all twenty spaces. Each has a description, book references and reconstruction notes.
- **Walk inside:** W/A/S/D or arrow keys move; Shift runs. Click for mouse look; dragging works when pointer lock is unavailable. Esc releases the cursor. P returns to the aerial view.
- **E:** use the skull altar, mirror or manuscript when nearby. **F:** toggle the carried lantern. **M:** open the original plan. **N:** switch between day and night.
- **Cutaway:** examine ground level, the scriptorium or the library. Windows, furniture, doors, floor plates and stairs are modelled inside.
- **Guided journey:** twelve stops with previous/next controls. It remains under your control rather than changing locations on a timer.
- **Atmosphere:** dawn, daylight, vespers and night, plus optional generated wind ambience.
- Touch devices have movement buttons and drag-to-look. WebGL is required.

Links such as `/?place=library` and `/?place=scriptorium&time=dusk` open a particular view.

### Reconstruction

The enclosure and principal building positions are traced into one coordinate system from `assets/plan.png`. The three-storey Aedificium has a central octagonal light well, forty scriptorium desks/windows and a tessellated library containing exactly **56 rooms**. These are **four heptagonal halls, 28 outward-facing rooms, 16 inward-facing rooms, and eight additional windowless rooms**. All ordinary rooms are connected; one operable mirror leads into the hidden south-tower chamber. The east-tower spiral stair is physically walkable between all three floors; narrower heated stairs connect the west and south towers to the scriptorium.

The church, cloister, individual dormitory cells, guest quarters, chapter house, abbot’s upper room and chapel, gardens, baths, infirmary laboratory, stables, animal folds, smithy, mills, oil press, stores and novices’ quarters are furnished. The skull altar opens an underground route toward the kitchens.

This is an architectural interpretation, not an exact historical survey or an assertion that every fictional detail can be recovered. The novel fixes counts, orientations and many functions; it leaves dimensions, many furnishings, unlettered building assignments and exact library door connections unstated. Those choices are documented in the page and [research notes](#reconstruction-notes). Decorative manuscript inscriptions and geographic regions are samples rather than a claim to reproduce every route-word in the novel. Sculptures and figures are stylised geometry.

### Verify

```sh
npm test
python3 scripts/research_epub.py 'elli altı'
python3 scripts/research_epub.py --chapter 11
```

The Node tests check room/window counts, all-room reachability, the single secret entrance, dead ends, non-overlapping floor polygons, coordinate transforms and collision/floor behaviour. Runtime diagnostics in the hidden `#diagnostics` output additionally check the built stair, forty desks/windows and safe spawn positions. They include frame rate and rendering statistics for browser testing.

### Structure

- `src/plan.js`: traced coordinates and the 56-room planar graph.
- `src/content.js`: place descriptions, evidence and source chapter references.
- `src/build.js`, `src/util.js`: architecture, furniture, textures and instanced geometry.
- `src/physics.js`, `src/controls.js`: polygonal floors, segment collisions, walking and orbital camera.
- `src/main.js`, `src/ui.js`, `src/style.css`: lighting, interactions, accessible UI and responsive layout.
- `lib/three.module.js`: locally vendored Three.js r160 (MIT).

The supplied plan and EPUB remain unchanged. The web application uses paraphrased research notes and does not read or distribute the full book.

## Reconstruction notes

Primary source: the supplied Turkish EPUB of Umberto Eco’s *Gülün Adı*, Şadan Karadeniz translation, Can Yayınları. Its OPF metadata identifies the 1999 edition. Architectural relationships are cross-checked against the supplied `assets/plan.png`. EPUB split numbers below are stable source locators, not printed page numbers. No external film set or real monastery is substituted for the book’s plan.

| Source locator | Architectural evidence used |
|---|---|
| `index_split_002.html` | Plan key: A Aedificium; B church; D cloister; F dormitory; H chapter house; J baths; K infirmary; M folds; N stables; R smithy. |
| `006` — First Day, Prime | Late-November arrival and light snow; single western gate; tree-lined approach; cultivated land to the left; infirmary/baths and botanical garden following the wall; cemetery between church and Aedificium; three ranks of windows; projecting towers; north cliff; church entrance west and altar east; southern service buildings. |
| `007` — First Day, Terce | Guest cells, straw-filled sleeping niche. |
| `008` — First Day, Terce, continued | Kitchens and refectory below the scriptorium and library. |
| `009` — First Day, Sext | Broad, grounded Italian church; crenellated lower level; later pointed spire above the choir; apocalyptic west portal and twenty-four elders; coloured glazing and chapels. |
| `010` — First Day, Nones | Separate monastic cells; herbalist’s laboratory; botanical work; huge west-tower bread oven, south-tower cooking hearth, north-tower hearth; ground-floor service doors; spiral stair in the east tower; additional heated stairs mentioned behind flues. |
| `011` — First Day, Toward Vespers | Open scriptorium, low curved vaults, clear leaded glazing. Twelve side windows, twenty tower windows, eight on the well: forty windows, each with a desk. Work materials and straw underfoot. |
| `013` — First Day, Compline | Refectory, abbot’s raised table, meal setting. |
| `015` — Second Day, Prime | Route between livestock vessel and refectory door on the northeast face. |
| `021`–`022` — Second Day, After Vespers/Compline | Fourth skull from the right opens the altar; stair and ossuary passage reach the kitchens; arranged bones and skulls. |
| `023` — Second Day, Night | Heptagonal entrance hall; arched doors; cupboards, tables and scriptural bands; translucent window sheets; mirror and misleading passages. |
| `029` — Third Day, Vespers | Explicit library enumeration: 56 rooms, four heptagonal halls, 52 other rooms; 28 facing outside, 16 inside, eight without windows. Door routes do not follow a simple mathematical law. |
| `031` — Third Day, Night | Bath tubs separated by heavy curtains, fresh hearth ashes, overturned cauldron and water basin. The narrator does not recall the number of tubs. |
| `039` — Fourth Day, After Compline | Geographical arrangement: Fons Adae in the east, Hibernia in the west, Leones in the south, and other regions. Room initials form names, sometimes reversing direction or sharing letters. |
| `041` — Fifth Day, Prime | Old church incorporated into chapter house; old rounded and newer pointed portals; apostles and creature medallions. |
| `053` — Sixth Day, Nones | Abbot’s spacious upper room above a chapel; view across the church roof to the Aedificium. |
| `056`–`057` — Sixth/Seventh Day, Night | Mirror mechanism using the first and seventh letters of “quatuor”; heptagonal finis Africae and its table of manuscripts. |

### Exact constraints and inferred geometry

The scanned plan is mapped by `x = (pixelX − 340) × 0.5`, `z = (pixelY − 250) × 0.5`. North is negative Z. This fixes relative locations; the plan supplies no metric scale. The word “metre” is an interpretive movement scale.

The library is a non-overlapping polygonal tiling with 16 rooms around the octagonal well, eight rooms along the four exterior side walls, twenty tower perimeter rooms, eight blind linking rooms and four seven-sided halls. Its 44 boundary segments each carry one library window. A deterministic connected graph gives loops and dead ends; the south hall has only the mirror entrance. The book does **not** provide enough information in the supplied plan to recover every doorway: the graph, inscription locations and regional boundaries are explicitly interpreted.

Forty desks are generated from the scriptorium window positions. The main stair uses 90 separately walkable wedge treads, a landing at the scriptorium and an opening through both upper floor plates. Two narrower, 45-tread heated service stairs connect the west and south towers from the kitchens to the scriptorium. The east stair continues to the library.

The church sculpture includes the stated number of elders and simplified representations of the throne and four creatures. The chapter-house portal includes twelve simplified apostles and thirty medallions. These are abstracted geometric reliefs, not claims to reproduce Eco’s full iconographic description.

### Interpretation boundaries

- Heights, exact roof shapes, vault details, masonry courses, colour and most furniture dimensions are inferred.
- The central cloister well and planting pattern are plausible additions. The plan establishes the garth and enclosure.
- The dormitory has individual cells, but their number and furnishing arrangement are inferred.
- Four bath tubs are shown; the narrator explicitly does not give a count.
- Unlettered southern buildings are assigned among the listed mills, oil presses, stores, cellars and novices’ house. The plan does not identify each individually.
- The smithy’s location and use are fixed by its plan key; most of its interior is invented to illustrate that use.
- The guest range and abbot’s residence are placed within the unlettered cloister ranges. The residence’s chapel and upper room follow the text; their exact plan is inferred.
- The main ossuary route and mirror are interactive. The separate trapped stair mechanism in the final chapters is not reproduced as another full route.
- This build does not simulate the murders, fire, complete cast, every manuscript, or every room-to-room episode. The aim is an explorable architectural reconstruction.
- A passage in `010` inconsistently uses “hastane” where the surrounding context describes the Aedificium’s refectory. The distinct plan-marked infirmary K remains in the west; meal scenes and `008`/`013` establish the refectory in the Aedificium.

### Validation

Node regression tests cover the exact library counts, geometric tiling, all-room graph connectivity, secret-door isolation and collision behaviour. Browser runtime checks inspect the generated desk/window counts, physical stair treads and safe floor positions at every place shortcut. The visual walkthrough checks overview, cutaways, indoor views, controls and responsive layout. The model is deliberately stylised to keep a large furnished monastery interactive in a browser.
