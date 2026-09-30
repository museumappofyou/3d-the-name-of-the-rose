# Provenance — trees, gardens, orchard (src/world/trees.js, src/core/barkTex.js, src/world/nature.js, src/world/gardens.js)

Classification: **BOOK** = the novel states it; **RECON** = a decision to make
the incomplete text physically coherent; **AMBIENT** = a plausible
14th-c. Ligurian-Apennine / Benedictine detail the novel does not state.
Claim ids are `claim_00NNNN` (#NNNNNN), constraints `con_00NNNN`.

| Object / decision | ids | class | note |
|---|---|---|---|
| Late November, snow on the ground, bare broadleaves | D1 TANSÖKÜMÜ, #001704 | BOOK | elms, fruit trees and the oak are leafless; twig cards grey-brown, snow only on upper faces |
| Evergreen pines on both sides of the upper road, "white with snow", forming a natural roof | #000056, #000080 | BOOK | umbrella pines at ±4–5 m either side of the road 22–95 m below the gate, crowns meeting overhead (nature.js) |
| Species of the roofing pines = stone pine (Pinus pinea) | — | RECON | the text says only "çam"; an umbrella crown is what makes a roof over a road. Firs/spruces line the rest of the road |
| Firs, spruces and windswept pines on the slopes and along the lower road | #000316, #002266, #002957 | BOOK/AMBIENT | forests and groves are named; species mix is ambient (silver fir, Norway spruce, a flagged pine at the cliff edge) |
| Pines below the east tower, where the building drops sheer | #000556 | BOOK | 26 conifers on the slope under the east tower |
| Tree-lined road from the gate to the church | #000098 | BOOK | the avenue; species unstated |
| Avenue species = elm | — | AMBIENT | vase-shaped pollard-free elms; could equally be planes |
| Oak at the edge of the cemetery (Benno hides against it) | #000894 | BOOK | one massive low oak, a few dead leaves kept (marcescence) |
| Orchard fruit trees; "cannot be crossed running" | #002092, #002176 | BOOK | pruned open-centre apple/pear forms with water sprouts, set close |
| Fruit trees in the cloister garth | — | AMBIENT | requested by claustrum.js |
| Dormant roses in the flower garden before the hospice | D1 TANSÖKÜMÜ ("güzel bir çiçek bahçesi") | BOOK/AMBIENT | a flower garden is stated; roses are the ambient choice |
| Chestnuts | — | not used | not mentioned in the book |
| Vegetable garden left of the road from the gate, with vegetables showing through the snow | #000099, #000304–#000306 | BOOK | VEG_GARDEN in plan.js; winter crops (kale, leeks, cabbage stumps, garlic, turnips) poke through the snow |
| Door from the vegetable garden to the kitchen; the well; cross paths | #001659 | BOOK/RECON | the main trodden path runs from the kitchen side to the well |
| Beds: irregular raised strips, wattle or plank edging, frozen earth, straw mulch, bean poles, dry stalks | #000308 ("dry branches") | AMBIENT | deliberately uneven sizes, skewed rows, harvest half done, some beds fallow |
| Named vegetables: squash, onion, garlic, beans; kitchen roots: radish, turnip, carrot | D1 İKİNDİ, #001714 | BOOK | onions/garlic as small shoots, beans as last summer's poles, turnip rosettes |
| Botanical garden follows the curve of the walls round the baths, infirmary and herb store | #000101–#000103, con_000031 | BOOK→RECON | beds laid in concentric arcs about the baths/infirmary corner, inside the HERB_GARDEN rectangle |
| Severinus's herbs: sage/rosemary-type sub-shrubs, dead umbels (valerian, fennel), rosettes (sorrel, coltsfoot, marshmallow), burdock, juniper, beds under straw | D1 İKİNDİ, #000695, #000901 | BOOK/AMBIENT | the list is the book's; which bed holds what is ambient |
| "The good herbs grow in winter too" | D1 İKİNDİ | BOOK | evergreen sub-shrubs are the green in the herb garden |
| Compost heap in a wattle bin in the far corner of the vegetable garden; tools, baskets, handbarrow, hoe, rake | — | AMBIENT | minor props |
| Dung heap in a secluded corner of the orchard "where no one passes" | #001792, #001793 | BOOK | in the orchard corner behind the infirmary end, by the west wall, away from the gate and avenue |
| Beds walkable (≤0.22 m high), plants and props non-colliding; hurdles leave gaps where the paths enter | — | RECON | the walker is never trapped |

## Rendering notes

- Trees are procedural instanced meshes, one draw call per variant and level
  of detail (conifers 3 LODs; broadleaves one), with an atlas of bark tiles and
  alpha-tested twig/needle cards.
- The floating blue-grey squares seen round every crown were not the cards
  themselves: the screen-space AO pass (GTAOPass) renders the scene with an
  override `MeshNormalMaterial` that cannot alpha-test the atlas, so every
  card entered the AO normal/depth buffers as an opaque quad and the AO then
  darkened those quads over the sky. `Geo.build()` now orders the index buffer
  bark-first and the forest meshes draw only the bark range while an override
  material is in use (`solidOnlyUnderOverride`, trees.js). Shadows are
  unaffected (they use the alpha-tested `customDepthMaterial`).
