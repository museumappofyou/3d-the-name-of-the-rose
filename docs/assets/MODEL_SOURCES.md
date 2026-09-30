# Imported models: sources, licences, conversion

Every GLB in `assets/models/` is a web derivative (GLB, meshopt-compressed where noted) of a model released under
**CC0** (no conditions) or **CC BY** (credit required, given here and in the in-app Credits folio). No paid,
NC/ND, "personal use only" or ripped assets are used. Build scripts: `scripts/models/build_humans.mjs`,
`scripts/models/build_animals.mjs` (run with `@gltf-transform/core|functions|extensions` and `meshoptimizer`).

## People

| File | Source | Author | Licence | What we use / changes |
|---|---|---|---|---|
| `human_anims.glb` (1.9 MB) | [Mesh2Motion](https://github.com/Mesh2Motion/mesh2motion-app) `static/animations/human-base-animations.glb`, `human-addon-animations.glb`, `human-mocap-animations.glb` ([LICENSE-CC0.MD](https://github.com/Mesh2Motion/mesh2motion-app/blob/main/LICENSE-CC0.MD)) | Quaternius ([Universal Animation Library](https://quaternius.com/packs/universalanimationlibrary.html)), Carnegie Mellon University motion capture, retargeted by Scott Petrovic / Mesh2Motion | CC0 1.0 | 31 clips kept and renamed (walk, formal walk, carrying walk, idles, folded arms, sitting, kneeling, harvest, chop, push, pick-up, nod, sleep …); mannequin mesh, skin and textures removed; limb translation/scale channels dropped; resampled; meshopt (filter) compression. |
| `head_male_5.glb`, `head_male_6.glb`, `head_male_10.glb`, `head_male_15.glb`, `head_male_32.glb`, `head_police_male.glb` (107–137 KB each) | Mesh2Motion `static/models-variation/human/*.glb` (listed as CC0 in `src/lib/RigModelVariations.ts`) | elbolilloduro (photoscanned characters) | CC0 1.0 | Texture re-encoded PNG → JPEG; material extensions removed. At runtime only the head, hands and a generated neck are drawn: the scans' modern clothes are cut away and replaced by the habits of `src/world/people/habit.js`, skinned to the same 66-joint skeleton. |

## Animals

| File | Source | Author | Licence | Changes |
|---|---|---|---|---|
| `animal_horse.glb` (horses, Brunellus), `animal_donkey.glb` (donkey, mules), `animal_cow.glb` (cows, calves), `animal_bull.glb` (oxen), `animal_husky.glb` (sheepdogs) | [poly.pizza/m/qvTrSG9pZF](https://poly.pizza/m/qvTrSG9pZF), [qmX6nhnvp7](https://poly.pizza/m/qmX6nhnvp7), [26zM1outCr](https://poly.pizza/m/26zM1outCr), [a8PIIYwF7r](https://poly.pizza/m/a8PIIYwF7r), [wcWiuEqwzq](https://poly.pizza/m/wcWiuEqwzq) — *Ultimate Animated Animals* | Quaternius | CC0 1.0 | Vertices welded and smooth normals computed (the source is flat-shaded); clips kept: Idle, Idle_2, Idle_Headlow, Eating, Walk (duplicates removed); meshopt. Coats (black, bay, grey, chestnut, mule, ox …) and a fine hair normal map are applied at runtime (`src/world/animals.js`). |
| `animal_pig.glb`, `animal_sheep.glb` (sheep, lambs) | Quaternius *Farm Animals* via poly.pizza (`static.poly.pizza/665ee586…`, `a4bd2c4e…`) | Quaternius | CC0 1.0 | As above; Idle clip only. |
| `animal_cat.glb` | [poly.pizza/m/qKICY6xla2](https://poly.pizza/m/qKICY6xla2) | Quaternius | CC0 1.0 | As above; Idle, Idle_Eating, Walk. |
| `animal_hen1.glb` (hens) | [poly.pizza/m/8Unya0rw9tR](https://poly.pizza/m/8Unya0rw9tR) "Hen" | Poly by Google | CC BY 3.0 | Welded/smoothed, meshopt. Static in the source: a body–neck–head skeleton is fitted at runtime so the hens peck and look about. |
| `animal_rooster.glb` | [poly.pizza/m/6NTegstc5Jy](https://poly.pizza/m/6NTegstc5Jy) "Rooster" | Poly by Google | CC BY 3.0 | As the hen. |
| `animal_goat1.glb` (goats) | [poly.pizza/m/d7dImmjtF8E](https://poly.pizza/m/d7dImmjtF8E) "Goat" | Poly by Google | CC BY 3.0 | As the hen (neck and head rig). |

Declined: the J-Toastie chicken and the voxel dog (cartoon style); Mesh2Motion's horse (stylized proportions); the
CDmir monk and Lyndon Daniels' rigged horse (CC0, but `.blend` sources that need Blender to convert); the realistic
CC BY Sketchfab animals of the audit (downloads need an account; see the report for how to swap them in).
