# Realism pass — report

The architecture, the plan, the systems and the horarium logic are unchanged. What changed is what you hear,
who walks about, the animals, the focal rooms, and the surfaces and light. All comparison shots are from player height
(`shots/`: left = before, right = after). The walkthrough recording is `audio/walkthrough.m4a`.

> **Rights: one open decision.** Three of the five chant recordings are **CC BY-SA 3.0**:
> *Deus in adjutorium*, the *Magnificat* (Schola Gregoriana, Ołtarzew) and the Sant'Antimo psalmody (Zyance).
> The brief allows only CC0 / CC BY. BY-SA is not NC or ND, and the trimmed excerpts are credited and shared under the same licence
> (Credits folio, `docs/assets/AUDIO_SOURCES.md`). Still, it is outside the letter of the brief.
> A search of Wikimedia Commons' Gregorian chant category found no CC0 or PD **choral** psalmody. The free alternatives are
> **solo** voices (e.g. Membeth's PD *Johannes hymnus*, alongside the CC0/PD lesson and hymn already used)
> or are themselves BY-SA/GFDL.
> Options: (a) keep the three BY-SA choir excerpts; (b) use solo PD/CC0 voices only, which gives a cantor, not a choir;
> (c) license a choir recording after a rights check. Nothing has been bought.

## 1. Replaced vs polished

**Replaced**

| Area | Before | Now |
|---|---|---|
| Sound | Synthesised in the browser (noise and oscillators) | **68 recorded banks, 363 clips** cut from **77 CC0 field/Foley recordings** plus **5 chant recordings**. Everything is recorded: 14 step surfaces, fire, wind, the bell, doors, scriptorium, stable, farm, smithy, kitchen, water and work Foley. The engine's routing, zones, HRTF emitters and convolution rooms are kept. |
| Chant | A synthesised drone "chant" | A recorded Latin office **per canonical hour** (`src/systems/audio/chant.js`, `CHANT_FOR`). Every hour opens with *Deus in adjutorium*; Matins adds the lesson; Vespers ends with the *Magnificat*. |
| People | Procedural primitives | One rigged cast: the Mesh2Motion/Quaternius 66-joint skeleton with **31 clips** (walks, idles, kneeling, sitting, harvest, chop, push, pick-up, sleep…) and 6 CC0 photoscanned heads and hands. Skinned procedural habits in the right colours per order, hood up or down, with a cowl. Mixer LOD, and Foley on the impact frame (chop, harvest, pick-up, hammer). |
| Animals | Primitive shapes | Quaternius CC0 rigged horse, donkey/mule, cow/calf, bull/ox, pig, sheep/lamb, dog and cat; Poly (CC BY 3.0) hen, rooster and goat with runtime neck rigs. Coats come from the book: **Brunellus black, first from the left**, then bay, grey and chestnut. Animal sounds are spotted to a visible animal, which moves first. |

**Rebuilt / dressed** (visible in `shots/*.jpg`)

- **Stable** (`stables_14`, `stable_stall_brunellus_row`)
  - 14 plank stalls, each with a manger (rim at 1 m), a slatted hayrack, bedding and droppings.
  - An aisle with buckets, fork, shovel, tack on pegs and a saddle on its trestle; the great door is the **iron grille**.
  - 9 horses (Brunellus first) and 2 mules stand at their mangers and can be seen through the grille.
  - Today's fixes:
    - removed a second set of racks, left over from the old dressing, that sat inside the horses' heads;
    - moved a mule that stood inside a horse;
    - filled the two stalls that face the grille.
- **Cemetery, ossuary, skull chapel, infirmary, blood-jar tableau**: rebuilt or dressed.
  - Examples: skull pyramids in the ossuary niches; beds and an herb cabinet in the infirmary; a textured jar, bench and basin at the pig-killing.
- **West portal** (First Day, Sext; `portal_tympanum*.jpg`, `portal_spawn.jpg`): now real carved geometry, about 95 k triangles, replacing the painted height-field.
  - Tympanum: the Seated One with his sealed book and raised hand in a mandorla, the sea of crystal, and the four winged creatures with books. The 24 crowned elders sit on thrones in rows of 7+7, 3+3 and 2+2, heads turned to the throne, with viols and cups.
  - A vine archivolt and lintel.
  - The trumeau with three pairs of crossed lions.
  - Peter, Paul, Jeremiah and Isaiah on the jambs, with the scenes of the vices beneath them.
  - Grotesque capitals.
  - The walk spawn now stands under the porch looking up into the tympanum, as Adso does.
- **Choir** (`choir_*.jpg`):
  - A bronze tripod "twice a man's height" on lion's paws, with an oil lamp.
  - Two iron chandeliers.
  - Stall backs with round-arched arcades, cresting and scrolled end panels.
  - At every office except Matins the monks **stand** in their stalls for the psalms, hands in their sleeves. At Matins they prostrate first, then sit for the lessons.
- **Baths** (Third Day, night; `baths_*.jpg`):
  - Four stave tubs in bays "separated by thick curtains". The first three hold only a little water; the last, "hidden by a drawn curtain", is full.
  - A heap of clothes (a black habit and sandals) lies beside it.
  - A stone basin with a spout "in another corner".
  - A cauldron on the hearth, benches and towels.
- **Dormitory** (`dormitory_*.jpg`):
  - Every cell has a shelf with its clay lamp ("a lamp is indispensable in the cells"), and every other cell a cowl on a peg.
  - Berengar's cell stands open after the search: the mattress pulled half off, the blanket thrown down, the blood-stained cloth on the slats.
  - Benno's door stands ajar; lamps hang in the corridors.
- **Hospice** (`hospice_*.jpg`): a pilgrims' hall with straw pallets and blankets, staffs by the door, a pilgrim's hat and scrip on a peg rail, and a lamp on the table.
- **Vaults**
  - Rebuilt as smooth surfaces (`vaultSmooth`).
  - Today their UVs are unfolded radially by arc length from the crown, so the plaster no longer fans out in streaks along the ribs (`shots/vaults_after.jpg`, scriptorium pair).
- **Rooms read by function**: the scriptorium now has straw thick by the desks and thinning to bare boards. The patches feather into the boards through a non-tiling falloff texture instead of ending on polygon edges.

**People and animals, follow-up**

- **Tonsure** (`monk_tonsure_*.jpg`): monks, novices and the abbot wear the corona of 1327, a shaven crown ringed with hair.
  - It is painted per texel into a copy of each scanned head's texture, in the skin tone of that head. Servants and peasants keep their hair.
  - The scans' modern shirt collar no longer shows at the nape.
- **Walking fowl and goats** (`hens_walking.jpg`, `goat_walking.jpg`): the runtime rig now has leg bones: two for the fowl, four for the goat.
  - Hens step with alternating legs, waddle, and thrust the head forward at each step. They peck only when standing.
  - Goats walk about their own pen with a diagonal gait. Both turn smoothly toward where they go.

**Polished**

- Surfaces:
  - ARM roughness is read from the right channel.
  - Winter fleece and hens are desaturated to farmyard colours, not the source's toy paint.
  - Distant snow is matte, so the far slopes don't glint.
  - The far terrain has forest on its mid slopes and aerial perspective.
- Fog and overcast: the reflection environment now carries the same veil, so wet stone and snow reflect a milky sky. Sun shadows fade to 30% in fog.
- Far terrain: normals come from the height field, smoothed over one cell, so the far slopes no longer shade as flat facets.
- Sky and horizon:
  - The white void below the horizon is gone. A lowland dome now fades out of the sky's own haze, so there is no seam.
  - Fog weather is **milky**: a veil of the fog colour over the sky, where before it was deep blue. Snow weather gets a grey overcast.
- Light:
  - A navigable night fill indoors.
  - Softer, warmer flame pools with a long falloff.
  - The lantern (F).
- Spawns: hospice yaw; the smithy walk offset.
- Mix:
  - All low-frequency rumble removed. The church steps, dig, hoof, timber and chop sources had a 20–60 Hz room or handling rumble; they now use a 48 dB/oct high-pass.
  - The reverb send is high-passed at 130 Hz.
  - The listener's own steps feed the room at half level, with a dip at 170 Hz. The choir now leads in the church and the steps sit under it (`audio/walkthrough_spectrogram.png`).
- Credits: an in-app Credits folio (help sheet) generated from what ships (`assets/credits.json`, 90 entries).

## 2. Provenance

The exact per-clip tables are in **`docs/assets/AUDIO_SOURCES.md`**: bank, source, author, licence and crop seconds for every clip.
The model tables are in **`docs/assets/MODEL_SOURCES.md`**.

- **Audio, 82 sources.**
  - **Field and Foley**: 77, all CC0 1.0 on Freesound.
  - **Chant**:
    - `chant:deus`: Schola Gregoriana (Ołtarzew), CC BY-SA 3.0, 0.00–55.99 s.
    - `chant:magnificat`: same schola, CC BY-SA 3.0, 29.50–185.99 s.
    - `chant:psalm`: Zyance / the monks of Sant'Antimo, CC BY-SA 3.0, 1.00–98.49 s.
    - `chant:hymn`: Membeth, *Veni creator*, PD, 1.40–30.19 s.
    - `chant:lesson`: Membeth, *Lamentation III*, CC0, 0.00–75.00 s.
  - **Examples** (all CC0 1.0):
    - bell: bruno.auzet, *Angelus Chartres Cathedral*, 796547, 4.75–14.11 s;
    - church steps: 235438;
    - fire: BonnyOrbit 484337, 20–52 s, and 484338, 30–62 s;
    - anvil: ldezem 386119 / 386130.
- **People** (`human_anims.glb`, 1.9 MB; `head_*.glb`, 107–137 KB each):
  - Mesh2Motion (CC0): Quaternius *Universal Animation Library* plus CMU motion capture;
  - photoscanned heads and hands by elbolilloduro (CC0).
- **Animals**:
  - Quaternius *Ultimate Animated Animals* and *Farm Animals* (CC0);
  - Poly by Google hen, rooster and goat (CC BY 3.0, credited).
- **Textures**: Poly Haven (CC0), unchanged set.
- **Build**: `scripts/audio/build.py` (sprites, cuts, levels), `scripts/models/build_*.mjs` (gltf-transform + meshopt),
  `scripts/audio/sources_md.py`, `scripts/credits.py`.

## 3. Declined candidates

- **Audio**: 16 recordings were auditioned and rejected. Reasons include HVAC or visitor noise, mains hum, an electric bellows, a rice cooker, road and city hum, a bell that never decays freely, and wind rumble. The list, with reasons, is in `docs/assets/AUDIO_SOURCES.md`. BOOM *Medieval Life* and *Horses* were not purchased.
- **Models**:
  - J-Toastie chicken and the voxel dog: cartoon style.
  - Mesh2Motion horse: stylised proportions.
  - CDmir monk and Lyndon Daniels' horse: `.blend` sources that need Blender.
  - Realistic CC BY Sketchfab animals: they need an account to download. They can replace the Quaternius files one-for-one through `scripts/models/build_animals.mjs`. The coat and clip maps are in `src/world/animals.js` (`KIND`, `COATS`).

## 4. Performance

- **Setup**: headless Chrome with ANGLE/Metal, 1280×720, Apple M1 Pro.
- **Frame time**: the mean of 40 update-plus-render frames, GPU-synced.
- **Draw calls and triangles**: include the shadow passes.
- **Before**: the source snapshot from the start of the people and animal work. The untouched original had no measurements recorded; its load time was 5.8 s.

| View | Calls before → now | Triangles before → now | Frame ms before → now |
|---|---|---|---|
| Stable 14h | 2720 → 1678 | 2.76 M → 4.58 M | 11.0 → 15.0 |
| Nave 10:30 | 1522 → 1335 | 5.74 M → 7.44 M | 11.4 → 13.0 |
| Scriptorium 15:12 | 2776 → 1909 | 6.40 M → 7.52 M | 16.0 → 20.1 |
| Cemetery 14h | 2516 → 2076 | 5.61 M → 8.70 M | 12.9 → 17.1 |
| Ossuary 21h | 2922 → 1567 | 5.39 M → 7.23 M | 11.4 → 13.0 |
| Infirmary 14h | 702 → 668 | 3.18 M → 4.22 M | 9.5 → 10.4 |
| Road 12h | 426 → 472 | 2.98 M → 3.27 M | 11.6 → 13.1 |
| Cloister 12h | 1174 → 1086 | 3.74 M → 6.21 M | 12.7 → 14.1 |
| Library 23h | 1684 → 1391 | 4.18 M → 4.97 M | 14.6 → 17.4 |
| Refectory 18:12 | 1681 → 1528 | 3.42 M → 5.69 M | 10.2 → 13.7 |

- **Summary**: numbers are re-measured after the portal, choir, baths, dormitory and hospice work. The heaviest view is the scriptorium at 20 ms (about 50 fps). Draw calls fell in 9 of 10 views. Triangles rose and frame time rose by 1–4.5 ms. The new carving costs about 0.4 M triangles in the nave view; the rooms added about 30 k triangles and 7 lamps.
- **Memory**: JS heap 360–390 MB → 517–536 MB. GPU textures 110–153 → 445–511.
- **Load**: about 7 s to interactive.
- **Download**:
  - audio 9.0 MB, loaded lazily; about 7.5 MB during the walkthrough;
  - models 6.1 MB;
  - textures 6.7 MB (unchanged).
- **Fixed today**:
  - The ossuary's 0.77 M triangles were drawn from anywhere in the abbey. Its bounding sphere contained half the abbey, and the scriptorium lies above its kitchen end. It is now drawn only from its stairs or from below ground, and interiors are culled by distance to their box.
  - Habit mesh reduced from 56×46 to 44×36: people went from 450 k to 356 k triangles.

## 5. Verification

- **Hours** (`shots/canonical_hours_cloister.jpg`): Matins, Lauds, Prime, Vespers, Compline and night, lantern off and on. At night the columns are silhouettes; under the lantern they are warm at arm's length.
- **Weather** (`shots/weather_snow_fog.jpg`): clear, snow (falling flakes, grey overcast) and fog (milky sky, fogged far walls).
- **Rooms**: all 22 canonical spawns rendered with no console or page errors. `npm test`: 9 of 9 pass.
- **Church office** (`shots/church_office_*`): 44 monks at Vespers, the choir stalls full, lamps lit.
- **Sound**: a 106 s walkthrough recorded from the master bus, with no audio or bank errors.
  - Levels: median −36 dBFS RMS, p95 −28, peak −10. The limiter never engages.

| Time | Place | What you hear |
|---|---|---|
| 0:00–0:14 | Stable, 9h, beside the horses | breathing, chewing, hoof shifts in straw, snorts, a creak of timber |
| 0:14–0:55 | Church, Vespers | the bell, footsteps on the nave slabs, then *Deus in adjutorium* and the psalm in the choir |
| 0:55–1:10 | Scriptorium, 15h | steps on straw, quills scratching word by word, page turns, a bench creak |
| 1:10–1:24 | Smithy, 11h | hammer on hot iron with ringing taps between blows, the forge fire |
| 1:24–1:37 | Snow road → church portal | steps on packed snow, then on stone at the threshold (about 1:32), the room closing in |
| 1:37–1:47 | Folds and pigs | bleats, grunts |

## 6. Remaining limitations

- **Chant licence**: three BY-SA excerpts; see the box at the top.
- **Animals**:
  - The models are stylised low-poly CC0.
  - The fowl and goat walk on runtime-fitted leg bones, so the gait is simple.
  - Realistic CC BY Sketchfab replacements need an account to download.
- **People**:
  - The faces are still scans of modern men, now tonsured.
  - Habits are procedural and skinned, without cloth simulation.
  - Monks do not speak, by choice.
- **Carving**: the portal figures are made of simple forms; faces are only suggested, with no carved eyes or mouths. The lions read mainly as crossed bodies with heads.
- **Rooms**:
  - The bath curtains fold too regularly.
  - The cell shelves are plain boxes.
  - No body is placed in the last tub; it is full, as the book says.
- **Choir lighting**: at Matins other candle emitters still light the choir besides the tripod.
- **Far terrain**: shading is now smooth, but the ridged hills keep sharp crests and low-poly silhouettes. Beyond the modelled land the lowlands are a shaded dome.
- **Performance**: frame time rose by 1–4.5 ms. Lower-end GPUs may need the image-quality seal.
