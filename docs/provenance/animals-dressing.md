# Provenance — animals & service-space dressing

Files: `src/world/animals.js`, `src/world/dressing.js`.
Legend: **BOOK** = stated in the novel; **RECON** = a reconstruction choice made to
place a stated thing coherently; **AMBIENT** = plausible 14th‑c. Benedictine/Ligurian
detail the novel does not state. Claim ids = `claim_00NNNN` in
`book_details/output/claims.jsonl`.

## Animals

| Object / decision | Ids | Class | Note |
|---|---|---|---|
| Brunellus: black, five spans, small head, sharp ears, big eyes, full tail; first stall from the left | claim_000060–claim_000086 | BOOK | Placed as the black horse at the north (low‑z) end of the stall row; the west door with its grille is the "left" as you enter. Interaction label quotes the description. |
| Other horses in a row behind the metal grille at the main door | claim_002603, claim_002606 | BOOK | 6 further horses (bay/grey) in the stall row; the grille itself is built in outbuildings.js. |
| Guests' mules ("küçük katırlarımız"), abbey mules | D1 TANSÖKÜMÜ; D7 GECE | BOOK | Two mules at the door end of the stalls; one loose in the stable yard. |
| Donkeys in the farmyard | D7 GECE (katır ve eşekler) | BOOK | One donkey grazing in the stable yard. |
| Oxen, heifers/cows, calves in the ox shed after the horse stables | claim_000371, claim_001701, claim_001710 | BOOK | 5 oxen/cows at the ox‑shed mangers, 2 calves in the corner. |
| Sheep and lambs in the folds | claim_000373, claim_001706 | BOOK | 9 sheep + 3 lambs in the fold building. |
| Goats | claim_000151, claim_000168 | BOOK | 3 goats with the flock (goatherds are named). |
| Pigs in pens by the folds/blood vat; "the season when they kill the pigs" | claim_000217, claim_000375 | BOOK | 6 pigs rooting in the fenced pens in front of the folds; one by the blood vat behind the choir. |
| Hens & one black rooster in the henhouse yard; blacksmith steals hens at night; a dead black rooster | claim_000372, claim_001647 | BOOK | 13 fowl (one black = the rooster) wandering and pecking in the henhouse yard; 3 more by the granary door. |
| Sheepdogs with the flocks | D4 SABAH (shepherds shout to their dogs) | BOOK | Two dogs, one by the folds, one lying in the stable yard. |
| Salvatore's black cat | D4 AKŞAM / GECE | BOOK | One black cat by the granary (mouse‑hunting is AMBIENT on claim_000864 rats). |
| Cats hunting mice in the granary/kitchen | claim_000864 (rats) | AMBIENT | Only the granary cat is placed. |
| Animal placement concentrated east behind the walls & threshing floor | claim_000366–claim_000375 | BOOK | Order granary→horses→oxen→coops→folds→pigs respected via plan.js zones. |
| Subtle idle animation (breathing, head turn/graze, ear/tail flick, hens peck & wander, pigs root, cattle chew) | — | AMBIENT | Behaviour only; distance‑gated (animate < ~40 m walk / 55 m aerial, hidden > 80/130 m). |
| Sparse hoof/snort one‑shots near the listener | claim_002606 (neighing), soundscape.js emitters | AMBIENT | Triggered rarely (every 5–13 s) via ctx.sound.npcSound to answer the existing stable emitters. |

## Service‑space dressing

| Object / decision | Ids | Class | Note |
|---|---|---|---|
| Stable mangers / hay racks | claim_001712 (mangers) | BOOK | Hay racks + straw bedding along the stall line; grooms lead the animals to the mangers at Vespers (claim_000508). |
| Straw bedding in stalls & ox shed | claim_001712; farmyard straw & dung | BOOK/AMBIENT | Straw scatter in each stall and the ox shed. |
| Water troughs & buckets in the stables/yard/folds/ox shed | — | AMBIENT | Working watering; plausible for a stocked stable. |
| Harness pegs with a saddle, halters/ropes; pitchforks; feed sacks | — | AMBIENT | Signs of use on the door wall; no claim, but standard stable furniture. |
| A hung lantern in the stables | claim_000904/claim_001020 (lamps kept about the abbey) | AMBIENT | One oil lamp by the door. |
| Dung heaps by the sheds; a secluded orchard dung heap exists in the book | claim_001792, claim_000504 (waste slope) | AMBIENT | Small dung heaps outside the stable yard, ox shed and folds. |
| Blood‑vat stirring stool & bucket | claim_000375 (swineherds stir the blood) | BOOK | A stool and bucket by the great jar behind the choir. |
| Cart(s), baskets, woodpiles in the yards & threshing floor | claim_000366 (threshing floor) | AMBIENT | Carts on the threshing floor and stable yard; loose straw heap on the threshing floor. |
| Granary grain measures / bin | claim_001684 (Remigio and the seed sacks) | AMBIENT | Wooden measures by the granary door (sacks themselves built in outbuildings.js). |
| Mill sacks; smithy‑yard woodpile, charcoal heap, water trough | claim_000513 (forges), claim_001714 (grain to the mills) | AMBIENT | Placed on the lane in front of the smithy (its yard south side is over the cliff, so props sit north on solid ground). |

## Notes / uncertainties
- The kitchen, refectory and scriptorium are already richly dressed by `aedificium.js`
  (oven, hearth, work tables, dough, herbs, barrels, dish pit; the dais, pulpit, torches;
  40 desks with inkhorns/quills/parchment). No props were added there to avoid clutter.
- Animals inside sheds stand on the laid floor (y = 0.25); the terrain is sunk under the
  buildings, so `baseHeight` is only correct out of doors — this was the one placement
  hazard and is handled per‑animal (`floorY`).
- `F.sacks` (linen) reads as bright white orbs in low interior light; this is the shared
  material's look, not specific to this work.

## Later fixes (grounds pass)

| Object / decision | Ids | Class | Note |
|---|---|---|---|
| `F.sacks` rebuilt as slumped, lumpy, neck-tied sacks of dark rough cloth standing in rows (one in four lying), with a little spilt grain | c1684 | AMBIENT | Replaces the bright linen spheres stacked in the air. It is the shared helper, so every sack pile changes (granary, granaries, mill, stables, Aedificium). |
| Pigs kept inside the fenced pen (x0…x0+5 of the folds) | c0217, c0375 | BOOK | The old range reached x ≈ 92, which put a pig inside the stables. |
| Sheepdog moved off the pen's corner post; sheep and lambs kept clear of the fold partitions; granary hens clear of the door steps; the granary cat on the boards (y 0.25), not the sunk terrain | — | AMBIENT | Found by a feet-vs-collider check of all 59 animals. |
