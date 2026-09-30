# Gülün Adı — The Abbey

A walkable 3D reconstruction of the abbey in Umberto Eco’s *The Name of the Rose*, built from the Turkish edition in this folder and the plan printed in the novel. Every building on the plan is here, with the interiors Adso walks through. The library is the full 56-room labyrinth, and its room letters spell the book’s map of the world.

## Open it

Double-click **start.command** (macOS), or run

```sh
npm start            # or: python3 scripts/serve.py
```

and visit **http://localhost:8000**. The page needs a local server; opening `index.html` as a file will not load the 3D modules. No installation or internet connection is needed, because Three.js, the fonts and all the textures are included.

## Explore

| | |
|---|---|
| **Per aerem**: bird’s eye | Drag to turn, scroll to zoom, right-drag to glide. Pick a place in the **Index Locorum** (the book spine on the left) or on the **plan** (bottom right, or <kbd>M</kbd>). |
| **Pedibus**: on foot | <kbd>W A S D</kbd> / arrows to walk, <kbd>Shift</kbd> to hurry, mouse to look (click the view first). <kbd>E</kbd> looks closely at what is before you, <kbd>F</kbd> lights the lantern, <kbd>J</kbd> opens your notes, <kbd>P</kbd> switches between flying and walking, <kbd>Esc</kbd> releases the mouse. |
| **Notae** | A few things are worth remembering the first time you look closely at them (the catalogue's numbers, the barred doors after supper, Severinus's jars, the blood jar, the way under the altar once you have walked it). They are kept in the notebook seal (<kbd>J</kbd>) between visits, with no score; the one route you have walked yourself is drawn in red on the plan. |
| **Horarium** | The dial at the bottom turns the day through the canonical hours, from *Matutinum* to *Completorium*. Click an hour (the bells ring) or drag along the arc. <kbd>N</kbd> jumps between noon and night. |
| **Seals** | Sound, all of it recorded (wind, the bell, hearths, animals, work in the officinae, footsteps on fourteen grounds from fresh snow to the nave's slabs, the offices sung in Latin in the choir) · weather (clear, falling snow, the milky fog of the fourth day) · image quality · help · full screen. |
| **Floors** | For the Aedificium: open the library, scriptorium or ground floor from above. The library then shows itself as the labyrinth. |
| **Follow William** | Twenty stations through the seven days, each at its hour. |
| **Study navigation** | Choosing a place in the Index or on the plan carries you there directly: nothing on the way is walked or noted. Places from the end of the story are listed under *Loca arcana*, shown on request, and a place's later events wait behind its *Historia* line. |

Things to find on foot:

- The **skull altar**, the third chapel on the left. Press <kbd>E</kbd>: the altar turns and damp steps lead down into the **ossuary**, then along the bone-lined passage to the iron-clad door behind the kitchen hearth.
- The **library**, up the east-tower stair. Every room shows its letter and verse, and the small map draws the labyrinth as you go, as William’s did.
- The **mirror** in room S of the south tower. Press <kbd>E</kbd>, then the first and seventh letters of *quatuor*, and it opens onto the **finis Africae**.
- The **censer** among the Apocalypses of YSPANIA. Stand close and press <kbd>E</kbd> to see what Adso saw.
- The catalogue on Malachi’s desk, Adelmo’s psalter, Jorge’s stool, the armillary sphere in the infirmary, the jar of blood behind the choir, Brunellus in the stables…
- **The Burning** (in the index under *Loca arcana*): the seventh night, when the library becomes a pyre.

Links open a place directly: `?place=scriptorium`, `?place=mirror&mode=walk&time=23`, `?place=portal&time=12`, `?weather=fog`.

## What is reconstructed

Every physical detail in the novel was gathered chapter by chapter. See [docs/RECONSTRUCTION.md](docs/RECONSTRUCTION.md) for the evidence and the page each fact comes from.

- **Aedificium (A)**: an octagon that looks square from afar, with heptagonal towers showing five faces, three rows of windows and foundations growing out of the north precipice.
  - Ground floor: the kitchen in the west half (bread oven in the west tower, great hearth in the south tower, washing-up pit, iron-clad ossuary door) and the refectory in the east half (Abbot’s dais set perpendicular to the tables, reader’s pulpit, torches, north-tower fireplace, lavabo at the south entrance).
  - Scriptorium: one undivided floor under low vaults, straw on the floor, and **40 windows with 40 desks** (3 per great wall, 5 per tower, 8 on the octagonal well). The catalogue is chained to Malachi’s desk and Jorge’s stool stands by the fire.
  - Stairs: the east spiral stair, the only one reaching the library, and the two heated stairs round the oven flues.
  - Library: **56 rooms**, as the novel counts them: 4 heptagons, 28 outward, 16 inward and 8 blind. Every room has alabaster windows and vent slits, round arches between small columns, painted verses and bookcases, plus the east altar room, the distorting mirror and the walled finis Africae.
- **Church (B)**:
  - Exterior: crenellated first level, the “second church” above it, and the new spire over the choir.
  - West portal: the Apocalypse tympanum with the Seated One, the four creatures and the 24 elders (7+7, 3+3, 2+2). Crossed lions stand on the trumeau, with Peter, Paul, Jeremiah and Isaiah on the jambs.
  - Interior: north-aisle chapels, the stone Virgin, choir stalls for sixty, the golden altar, the bronze tripod lamp, blue choir glass and bell ropes.
  - Below: the treasury crypt, and the ossuary with bones sorted by kind leading to the kitchen.
- **Cloister (D)** with carved capitals, the **dormitory (F)** of individual cells on two floors, the **chapter house (H)** on the old church with the narthex courtyard and the old portal (Christ, 12 apostles, 12 panels of peoples, 30 roundels of monsters), the **Abbot’s house**, and the **pilgrims’ hospice** with its outside steps, William’s cell and Adso’s straw niche.
- **Infirmary (K)** with Severinus’s laboratory, **baths (J)**, the botanical, vegetable and flower gardens, the orchard, and the cemetery with its oak.
- **Folds (M)** and **stables (N)** with the metal grille and Brunellus. Also the granary, ox stable, henhouses and jar of blood, the threshing floor, mill, oil press, cellars, granaries, novices’ house, servants’ quarters, and the **smithy (R)** with its glassworks.
- The walls and the single west gate, the avenue, the goat path winding down between snow-laden pines, the mountains, and the sea far to the south.

## Verify

```sh
npm test
```

The tests check the library against the counts of Third Day, Vespers, and the reachability of every room except the finis Africae (reached only through the mirror). They also check room S’s passages to Y, P, E and U, that every word (FONS ADAE, LEONES, YSPANIA, HIBERNIA, ACAIA, …) is spelled by a chain of adjacent rooms, and that the way from FONS to ANGLIA runs round by the south and west, as the book says.

In the browser, `?debug` exposes `__audit.doors()` (walks every registered door in and out with the real capsule), `__audit.routes()` (walks the novel's routes in `src/data/routes*.js`, from `book_details/output/movement_graph.json`) and `__audit.leaks()` (rays up from enclosed floors to find sky holes). At the last check (30 September 2026), all 39 doors are walkable except the stable grille and the henhouse hatch, which are closed on purpose, and all 34 routes pass, including the stair down to the cells beneath the forge (R29a/b). See `docs/realism/NEXT_PASS_REPORT.md`.

## Why things are where they are

Each major spatial decision is traced to the novel's claims (`claim_NNNNNN`) and reconstruction constraints (`con_NNNNNN`) in `book_details/output/`. The tables in `docs/provenance/` mark every decision as BOOK (architecture or activity the text states), RECON (a choice needed to make incomplete text physically coherent) or AMBIENT (life added without claiming Eco described it):

- `arch-core.md`: Aedificium, library, hidden stair, church (×0.8 elevation), crypt and ossuary, bell tower, and the visibility deficit left on F2
- `arch-grounds.md`: cloister ranges, outbuildings, smithy cells, postern, paths and routes
- `environment.md`: materials, ground and snow, road re-route, lighting
- `vegetation.md`: trees, gardens, orchard
- `people.md`: the horarium, who is where at each canonical hour
- `animals-dressing.md`: stable life, animals and the dressing of service spaces

After Compline the Aedificium doors are barred from within. The only way in is under the church, from the skull altar through the ossuary (`main.js`, `setupCurfew`).

## Structure

```
index.html              the page and its manuscript interface
src/main.js             application: loading, modes, interaction, lighting
src/core/               plan coordinates, library model, geometry kit, materials, relief carving
src/world/              aedificium, library, church + ossuary + crypt, cloister ranges,
                        outbuildings + walls, gardens + trees, animals, terrain
src/systems/            sky & canonical hours, walker (capsule/BVH), aerial camera,
                        zones, effects (snow, smoke, flame glow), sound (recorded banks,
                        HRTF emitters, convolution rooms, the sung office)
src/ui/                 interface controller and stylesheet
src/data/places.js      the folio for every place, with quotations from the book
lib/                    Three.js r180 and three-mesh-bvh (MIT), vendored
assets/                 plan, fonts (EB Garamond, Grenze Gotisch, UnifrakturMaguntia — OFL),
                        CC0 textures from Poly Haven, recorded sound banks (audio/, see
                        audio/SOURCES.md), rigged people and animals (models/, see
                        models/SOURCES.md), credits.json (the in-app Credits folio)
scripts/audio/          builds the sound sprites from the source recordings (build.py)
scripts/models/         builds the GLB web derivatives (build_humans.mjs, build_animals.mjs)
docs/realism/           the realism pass: audits, plan, REPORT.md, comparison shots, walkthrough
_legacy_gpt/            the previous version, kept for reference
```

The EPUB is used only for research and is never served. The server exposes only `index.html`, `src/`, `lib/` and `assets/`.
