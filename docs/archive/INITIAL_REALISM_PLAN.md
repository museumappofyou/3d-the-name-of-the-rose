# Archived initial realism plan and inventory

The original transformation plan and generator inventory are kept together as the baseline before recorded audio and imported models. They are superseded by the [implementation reports](../realism/REPORT.md), [follow-up review](../realism/RE_AUDIT.md) and [30 September report](../realism/NEXT_PASS_REPORT.md).

## Transformation plan

The priority order uses **visible improvement × encounter frequency × feasible web implementation**, not code novelty. A smaller number of excellent, well-integrated assets beats a scene filled with mismatched models.

### Decisions

#### KEEP AS-IS

| System | Reason |
|---|---|
| Site composition and building placement | Aerial view immediately communicates abbey, church, cloister, service ranges, gardens and winter mountain setting. |
| Aedificium core mass and labyrinth topology | Strong visual anchor and important book architecture; present structure supports story navigation. |
| Main church and cloister footprints; most wall and arcade geometry | Spatial proportions and cadence read well. Local defects do not justify wholesale replacement. |
| Canonical-hour/horarium, weather state, map/folio navigation and walk/fly flow | Functional and narratively valuable; the next pass should decorate and tune their output. |
| Walker BVH, floor/surface zones, static batches, distance/frustum culling, audio routing/reverb architecture | Strong engineering base; preserve while integrating imported assets. |

#### MINOR POLISH

| System | Action |
|---|---|
| Distant mountains, outer pines and low-importance walls | Leave near current quality, fix only obvious repeating silhouettes, snow seams or stretching. |
| Cloister arcades and winter garth | Vary edge wear, contact shadows, a few near-view trees and snow drift; keep arches. |
| Working snow, smoke and flame particles | Retain effects; tie them to refined surfaces, lighting and sound. |
| UI and place signs | Keep style; resolve the portal `Via arborum` overlap if reproducible. |

#### MAJOR POLISH

| System | Action |
|---|---|
| Masonry/wood/roof/ground materials | Correct AO/roughness assignment, physically scale maps, break tiled expanses, add region-specific PBR materials and weathered transitions. |
| Interior lighting | Preserve narrative darkness while recovering readable forms; reduce amber clipping and abrupt point-light falloff; test hour/lantern transitions. |
| Church portal relief, nave choir/altar and crypt vaults | Selective hero mesh, joinery, colored glass and geometry refinement; no full church rebuild. |
| Chapter-house entrance relief and library shelving/books | Give the twelve-panel/thirty-roundel doorway aged sculptural depth; vary medieval bound volumes and strengthen the Finis Africae focal book while preserving the labyrinth. |
| Scriptorium/refectory/kitchen/stable/forge | Character action, appropriate object density, contact, micro-detail and zone sound. |
| Vegetation nearest to paths | Better winter silhouettes/species variation; keep distant procedural/LOD forest. |
| Gate avenue, goat path and walk spawns | Vary near-view branches and bark, close the pale terrain/horizon gap, and correct smithy/hospice viewpoints that face or touch walls. |

#### REPLACE

| System | Action |
|---|---|
| All player-visible procedural humans | Consistent rigged cast, period clothes and animations. |
| All player-visible procedural livestock | Suitable real species meshes and idle/feeding/pecking/walk clips; same visual style. |
| Close work/service props | Prioritize carts, mangers, tables, books, vessels, kitchen tools, anvil, infirmary beds, baths tubs. |
| All recognizable synthetic foreground sounds | Replace generated steps, chant, bell, animal calls, fire, wind, doors and work Foley with real recordings or a newly recorded human chant performance. Keep spatial routing and schedules; see [audio audit](../realism/AUDIO_REALISM_AUDIT.md). |

#### REBUILD

| System | Action |
|---|---|
| Cemetery grave meshes and ground transitions | Rework layout/form to match book's old/new markers protruding from shallow snow. |
| Ossuary/skull-chapel focal bone assemblage | Resolve camera/giant-geometry issue; build organic skull/bone display, retain passage. |
| Some close-up vault surfaces/ribs | Reconstruct faulty mesh section to remove faceted spikes and intersections, preserving room dimensions. |
| Blood-jar tableau and south-range press | Replace the giant polygon jar and rectangular blood patch with credible earthenware and stained snow; make the oversized T-beam press a legible working mechanism. |

### Recommended order

| Order | Work package | Why this order / acceptance image |
|---:|---|---|
| 0 | Establish asset selection, rights log and in-engine 1.7m human/horse/ox/door/furniture calibration rig | Prevent expensive imports that cannot ship or fit. Compare every chosen candidate under current site light first. |
| 1 | **Audio source overhaul:** real footsteps, bell, animals, fire/wind, doors, work Foley and human Latin chant | Footsteps accompany nearly every second of exploration and the user reports the current sound as terrible. Preserve the spatial engine but remove its synthetic foreground bank. Audition at normal volume in major rooms and record cue provenance. |
| 2 | **Humans:** monk, novice, worker and visitor archetypes; core locomotion and workplace idles | People appear almost everywhere and instantly signal placeholder quality. A close walk through scriptorium, cloister and refectory should reveal natural robes/heads/hands and grounded movement, with no seat penetrations. |
| 3 | **Animals:** black Brunellus, other horses, ox/cow, pig, hen, sheep/goat/donkey, then minor dogs/cat | The stable is a high-visibility showcase and current equines are unmistakably primitive. The stable must read as an inhabited horse space without UI. |
| 4 | **Focal failures:** cemetery, ossuary/skull chapel, infirmary bed run, bath tubs, blood-jar scene and the most visible vault spikes | These scenes contain immediate visual blockers; selective rebuild has huge benefit per hour. |
| 5 | **Functional dressing:** stable equipment, kitchen/forge/press, scriptorium, library, refectory, church choir/altar and portal, chapter entrance | A few real focal props and action/contact points make room purpose self-evident. Fix bench alignment before filling the refectory. |
| 6 | **Light/material/ground:** AO–roughness correction, separate masonry/plaster/wood/roof roles, snow and mud blends, interior tonal range | Apply after asset choices so stone/cloth/animal materials can be unified. Verify noon, dusk, Matins and lantern views. |
| 7 | **Action-sound contact:** subtle character/animal/fire/door/cloth/foliage movement and matching recorded cues | Close sounds should occur because something visible moves; ambient sources should stay sparse and place-specific. |
| 8 | **Web optimization and final walk:** LOD, KTX2, compression, texture atlas, shadows and collision; walk all places/hours/weather | Keep current responsiveness while the added assets are active. Regression check story topology, collision, story object visibility and full audible mix. |

### Visual acceptance targets

- From a normal player viewpoint at 1–3 m, human and animal anatomy does not resolve into primitive solids. Robes look like cloth forms with credible hood, hands, gait and rest poses; varied archetypes remain coherent together.
- Stable: horse muzzle lines up with manger, feet meet dirty straw/stone, grille and door are legible, groom has a plausible task, horse movement is sparse and calm, sound is spatial.
- Church: choir stalls, bronze tripod and altar are period-specific focal elements; daylight enters from windows, Matins stays dark but outlines remain readable, flame is not a giant orange floodlight.
- Cemetery: snow partially buries varied old and new markers, no repeated dark rectangular frames; one can read routes and grave shapes.
- Scriptorium: desks carry writing apparatus, books and scribes at correct scale; windows and roof remain structurally recognizable; vaults have no faceted sawtooth surfaces.
- Infirmary/baths/kitchen/smithy: room use is evident before UI; no plain blocks masquerade as beds/tubs/forges and no repeated modern props.
- Blood-jar scene and press: the jar, staining and pig-working area read as earthenware and used ground; the press has an understandable timber mechanism and product context.
- Gate avenue and goat path: near trees remain plausible from below, and no path edge opens onto a pale void; place spawns give an unobstructed first view.
- With sound enabled, no synthetic step, choir, bell, horse, pig, hen, quill, door or forge cue calls attention to itself. Real source recordings remain clean of traffic, power tools, modern speech and appliance noise, and close cues correspond to visible action.
- All imports: evidence-linked 1327-compatible form, author/license credit, fit scale, ground/furniture/wall contact, low-cost collision proxy, distance LOD and acceptable frame time/download size. No public paid source model without rights clearance.

## Generator inventory

This inventory is keyed to current generator families and what appears at walking height. “Replace” means replace the visible mesh/material, while preserving placement, schedules, story logic, interactions and collision unless the row says otherwise. Review candidates and licenses in [ASSET_RESEARCH.md](../realism/ASSET_RESEARCH.md).

| Current object / source | What is visible or missing | Recommended treatment | Priority |
|---|---|---|---|
| Monks, novices, clergy, workers, guests, scribes, grooms — `src/world/people/figure.js` | Rigid geometric head, hands, robes, hood, feet; same silhouette at scale | **REPLACE** with coherent rigged human archetypes in habits/period clothing; re-use `src/world/people.js` horarium. | Critical |
| Human motion/poses — `src/world/people.js` | Pivot-led locomotion, weak body mechanics, writing/sitting/prayer without reliable furniture contact | **REPLACE ANIMATION**, repair placement and pose-specific contact. | Critical |
| Horses including black Brunellus; mules/donkey — `src/world/animals.js` | Sphere/cylinder anatomy, rigid head/tail, limited hoof articulation | **REPLACE** with rigged equines; Brunellus remains black and first left stall. | Critical |
| Cows/oxen/calves, pigs — `src/world/animals.js` | Same constructed silhouette; feeding and mass unconvincing | **REPLACE** with correct species models, quiet idle/graze/walk loops. | Critical |
| Hens/rooster, sheep/lambs, goats, dogs, cat — `src/world/animals.js` | Small primitive animal forms repeated across yard | **REPLACE** nearest/most encountered with animated assets; distant instances may use simplified LOD derivative. | High |
| Ossuary skulls/bones; skull chapel frontal box — `src/world/church.js` | Flat cartoon skull repeat, bone sticks, possible huge mesh/camera intrusion | **REBUILD focal assemblage** using real skull/bone geometry; diagnose camera/mesh intersection. | Critical |
| Cemetery crosses, slabs, grave mounds — `src/world/gardens.js` or associated cemetery builder | Identical block markers, hard black rectangles and uniform elevation in snow | **REBUILD** varied period plausible grave set, snow burial and weathered stone; limited external scan-derived hero stones. | Critical |
| Infirmary beds and near-entry apparatus — `src/world/outbuildings.js` | Dark rectangular beds, light strips, sparse shelves/jars | **REPLACE/REFINE** bed forms, linens, vessels, herb/medical work surfaces. | Critical |
| Baths tubs and curtain — `src/world/outbuildings.js` | Plain dark cylinders, straight flat board-like separator | **REPLACE** tubs and fabric; add water/dampness/buckets. | High |
| Pig-blood jar, stained ground and nearby worker/pig — `src/world/outbuildings.js`, people/animals | Large polygon vat and rectangular red patch are focal blockouts | **REBUILD vat/ground**, replace figure and pig, add work props. | Critical |
| Choir seating and generic benches — `src/world/church.js` | Repeating flat bench/pew forms | **REBUILD seating distinction**: choir stalls, simpler congregation benches, carved wear; preserve nave footprint. | High |
| Refectory tables, benches, bowls — `src/world/aedificium.js` | Blocky furniture, clone props, bench alignment issue | **REPLACE visible furniture/props** and fix seated contact; use repeatable web-ready derivative. | High |
| Kitchen table, oven face, cooking equipment — `src/world/aedificium.js` | Box worktop, geometric vessels, flat bright orange fire aperture | **REPLACE hero props**, refine oven mesh and fire light; keep room shell. | High |
| Smithy/forge, tools and stock; cart/farmyard props — `src/world/outbuildings.js` | Sparse geometric work cues, underfurnished entrance | **REPLACE hero tools/cart/containers**, add working clutter and sound; preserve building shape. | High |
| Scriptorium desks, stools, lecterns, books, quills — `src/world/aedificium.js` | Repetition and little micro-detail at desks | **REPLACE hero stations**, vary small props; preserve 40-window/desk plan. | High |
| Library and Finis Africae shelves/volumes — `src/world/aedLibrary.js` | Repeated black rack and cream horizontal block-book patterns, flat focal tome | **REPLACE book silhouettes/textures selectively**, improve old wood shelving and hero secret book; keep labyrinth geometry/logic. | High |
| South-range press, vessels and storage — `src/world/outbuildings.js` | Giant black T-beam on rings, little workshop clutter | **REBUILD press mechanism**, add containers and product residue. | High |
| Treasury relic containers — `src/world/church.js` | Gridlike display cases and generic tiny objects | **IMPROVE/REPLACE selective hero objects** after checking extraction; reduce modern display-case feel. | Medium |
| Orchard/cemetery near trees; garden dead plants — `src/world/trees.js`, `gardens.js` | Repeat branch silhouette, sharp bed borders, flat plant clusters | **REPLACE selected near vegetation**, keep distant procedural forest and garden layout. | Medium |
| Church portal sculptural relief and door leaf — `src/world/church.js` | Relief flat and bright; coarse X joinery dominates first-person opening | **REFINE HERO GEOMETRY/MATERIAL** rather than swap whole portal. | High |
| Chapter-house tympanum — `src/world/claustrum.js` | Flat pastel figures/roundels read as pasted icon sheet | **REFINE RELIEF/MATERIAL** to support book-described program. | High |
| Scriptorium/treasury/kitchen vault undersides — procedural builders | Faceted or huge smooth triangles at eye level | **REFINE GEOMETRY** and intersections rather than use whole-room assets. | High |
| Long walls, floors, roofs, paths — `src/core/materials.js` and builders | Stronger than figures, but repeated pattern, wrong AO-as-roughness, planar snow and hard transitions | **IMPROVE MATERIALS/UVS/SNOW MASKS**; do not replace architectural topology. | High |
| Footsteps, chant, bells, animals, fire/wind, forge/kitchen/scriptorium/door/work sounds — `src/systems/audio/*` | Every recognizable source is synthesized; the user reports poor sound quality. The room/positional framework exists. | **REPLACE AUDIBLE SOURCE BANKS WITH RECORDINGS**; keep routing, surface switching and schedules. Tie near cues to visible action; use [audio audit](../realism/AUDIO_REALISM_AUDIT.md). | Critical |
| Gate avenue and goat-path near trees/terrain edge — `src/world/trees.js`, `terrain.js` | Repeated bark/tuft forms; path edge can reveal pale void | **REPLACE SELECTED NEAR TREES** and refine terrain/horizon blending. | High |

### Keep outright unless close inspection reveals a defect

Site footprint, building placement, Aedificium exterior mass, church shell, cloister arcade, 56-room labyrinth layout, mountain backdrop, sky and canonical hour logic, weather controller, map/folio UI, procedural collision/navigation network, zone definitions, spatial audio/reverb architecture, static batching and distance culling. Source being procedural is not sufficient reason to replace any of these.

### Remove / avoid

- Retire the procedural human and animal meshes once replacements are verified; do not leave the primitive version visible as an ambient duplicate.
- Remove the cartoon-style repeated skull panel and hard black grave outlines.
- Avoid heavy photogrammetry imports without a web-ready derivative, glossy modern glass furniture, contemporary tire-track mud, fantasy heraldry, post-medieval furniture forms and lush summer vegetation.
