# Provenance: grounds, cloister ranges, outbuildings, enclosure

Files: `src/world/claustrum.js`, `src/world/outbuildings.js`, `src/world/furniture.js`,
`src/world/thresholds.js`, `src/core/plan.js` (everything except the AED and CHURCH blocks),
`src/data/routes_grounds.js`.

Legend: **BOOK** means the novel states it. **RECON** is a reconstruction choice needed to
make incomplete text physically coherent. **AMBIENT** is period detail the novel does not
claim. `cNNNN` = `claim_00NNNN` (book_details/output/claims.jsonl); `kNNNN` = `con_00NNNN`
(reconstruction_constraints.json); H/M/S = HARD/MEDIUM/SOFT.

## Buildings and openings

| Object / decision | Ids | Class | Note |
|---|---|---|---|
| Hospice guest floor raised 2 m (h1 5.9), William's cell (3rd of 4) with a broad east window | c0187/c0188 k0970 H, k1745 M, k1351 H | BOOK + RECON | So that the Aedificium rises "like a crown above the church" from the cell (F2). The height itself is RECON. |
| Hospice outside steps on the west side, 9 m flight from the flower-garden ground (−0.25) to a landing level with the guest floor (6.2), stepped parapet | c2312/c2313 k1635/k1636 M, c2321, c0634 | BOOK (steps) / RECON (placement, run) | The flight used to start 0.41 m above the trodden ground, too high for a first tread. Walked up and down (R2b, R3). |
| Hospice upper door, moved clear of the cell partition and registered (`hospice:upper`, 1.1 × 2.0 m) | c0142–c0144 k0760/k0761 H, c2698 k0140 H | BOOK | The door opens from the landing straight into William's cell. |
| Hospice ground door and threshold (`hospice:west`) | c0953 k0763 H, c1290 k1692 M | BOOK | Unchanged. |
| Abbot's upper hall raised 2 m (h1 6.2), internal stair | c2504–c2508 k1348, k0590 H, k1732/k1733 M, k0024 H | BOOK + RECON | F2. |
| Abbot's hall door ajar at the stairhead (plaster lobby partition, leaf swung 75°) | c2513/c2514 k1856 M, k0591 H | BOOK | F15 option: Adso hides behind the hall door. Leaf is non-colliding. |
| Dormitory night passage: new east door (`dormitory:passage-east`, 1.0 m) and a paved apron in the angle of apse and gable | c0886–c0891 k1972 M, k0667 H | RECON | "Left the dormitory, went round the apse, entered the choir by the north door". Before this the dormitory had no outdoor exit except through the church or the latrine. The apron also closes a terrain pit left by the church's rectangular sink (see open issues). |
| Dormitory stair moved into the stair hall (west-rising flight along the north wall, stairwell rail upstairs) | c0880, c0881–c0885 k1970/k1971 M | BOOK (two floors) / RECON (stair) | The old flight ran through the first east cell and its partition wall, and that cell had no door, so the upper floor could not be reached. |
| One door per dormitory cell (0.9 m) on both floors, including Jorge's cell off the lower corridor | c0883–c0885 k0737/k0715/k0621 H | BOOK | The doors were offset by one bay: the first cell (Jorge's) had none, and the last door fell outside the wall. |
| Latrine doorway aligned with the dormitory south door | c0510 k1572 M | BOOK/RECON | Done by the previous wave; verified. |
| Cloister garth: step block in each parapet gap (garth ≈ 0.6 m below the walk) | c0713/c0714 k0877/k0027 H, c0985 | RECON | The garth could be entered but not left (0.6 m > 0.42 m step-up). |
| Chapter house old-portal leaves hinged open | k0532 H, k2067/k2068 M | BOOK | F15. |
| Chapter house low slit in the north wall | c2280/c2281 k0867 H, k1784 M | BOOK/RECON | F16: the novices watch "through windows and cracks". |
| Chapter house garden (hedged herb plot on the south lane) | c0542 k0051 H | BOOK/RECON | F13. |
| Smithy basement: cells with wall rings, reached by a stair from the forge hall | c2017–c2021 k0146, k0967, k0624, k0625 H; c2248 k0931 H; c2153 | BOOK/RECON | F7. Checked sealed (leak test, 265 points). |
| Laboratory: curtained bed inside the lab, armillary sphere left of the door | c2156/c2157 k2183/k2184 M, c2119 k0039 H | BOOK | F11. The S18 door opens into the lab (R19c). |
| Stables great door with metal grille, not walkable (`noWalk`), side doors W20/W80 used | c2603/c2604 k1309 H, k1800 M | BOOK | Horses are seen through the grille. |
| Henhouse hatch 0.8 × 1.4 m (`noWalk`) | — | AMBIENT | A hen hatch, not a door. |
| Threshing floor moved beside the kitchen-yard side of the Aedificium | c0364–c0366 k0490 H, k2155 M, k1342 H | BOOK/RECON | F9. |
| Stone cistern by the kitchen yard | c2835 k0955 H | BOOK/RECON | F14: "the wells and water reservoirs" used in the fire. |
| Low parapet at the east-tower junction and behind the stables; refuse slope beyond | c0497/c0501 k0976 H, c0505 k2189 M, c0560 k0876 H, c0552 k1563 M | BOOK | F10 (`LOW_WALL`). |
| Secret postern (1.0 × 1.95 m wicket) in the NW wall behind the infirmary, walkable | c1670 k1535 M, c2265 k0947 H, c2266 k1691 M, c1553 k1559 M, c2013 k0079 H | BOOK/RECON | F5. It conflicts with k0756 H ("only opening"). That is read as "the only open entrance"; the postern is hidden. |
| Trodden paths to the Aedificium SW garden door and SE south entrance; procession across the cemetery | c0330 k0502 H, c0335 k1621 M, c0592 k1623 M, c0611 k1914 M, c1014 k1931 M, k0014 H | BOOK | F6 (`PATHS`). |
| Girl's track: vegetable garden → orchard → round the infirmary's west end → along its blind back → postern | c1549–c1553 k0457 H, k1558/k1559 M | BOOK/RECON | Replaces a track that ended against the infirmary's rear wall. |
| Sacks: slumped, lumpy, neck-tied cloth sacks standing in rows (one in four lying flopped), dark rough cloth, a little spilt grain | c1684 (Remigio's seed sacks) | AMBIENT | Replaces bright linen spheres stacked in the air. |
| Door steps from the registry (`thresholds.js`) | — | RECON | Unchanged. Every walked door rises ≤ 0.55 m and gets steps. |

## Routes (`src/data/routes_grounds.js`)

The audit bot walks at 2.7 m/s and times out at 40 s, so book routes longer than about 100 m are split into consecutive legs.

| Route | Ids | Physical path |
|---|---|---|
| R2a / R2b gate → courtyard → flower garden → hospice door; up the outside steps → William's cell | c0095, c0115 k1984 M, c0142, c2312/c2313 k1635/k1636 M | Avenue, open court, hedged garden, ground door; garden → steps → landing → upper door |
| R3 cell → down the steps → round the hospice → cloister west door → north walk → church south door | c0247, c0634, c2321, k1553 M | West portal still unused (arch-core) |
| R10 dormitory → night passage → east door → round the apse → north door → choir | c0886–c0891 k1972 M, k0667 H | Via the new passage door |
| R30a / R30b dormitory corridor → stair → upper corridor → a cell; lower corridor → Jorge's cell | c1022, c1041/c1042 k1877 M, c0632 k1967 M; c0883–c0885 H | Monks retire to their cells |
| R11 church south door → cloister walk → parapet gap → garth | c0710/c0711, c0713/c0714 k0877 H, k1187 H | Uses the new garth step |
| R19a–c blood vat → cemetery → vegetable garden (east gate) → herb garden → bath; bath → laboratory (S18) | chunk_0025; c0698–c0703 k1618 M, k1637 M | Three legs, ≈170 m in all |
| R20 infirmary (S62) → bath | c1579 k0011 H, c2080, c2721 | |
| R21a / R21b infirmary (lab door) → orchard → chapter outer door | c2190 k2007 M | Split in two; one leg was 37.9 s, close to the limit |
| R22 chapter outer door → narthex court → old portal → hall benches | c2036–c2069 k0532 H, k2066–k2068 M | Ends in front of the bench rows |
| R24a / R24b refectory (SE door) → round the apse → east of the dormitory → south lane → Abbot's south door → stair → lobby → hall door → hall | c2503–c2514 k1855/k1856 M, k0591 H | The Abbot's house has no door on the cloister |
| R26 stables W20 → round the pigsty pen → threshing floor → Aedificium SE door | c1436, c0675 k0553 H | The pen is a real obstacle, so the route goes round it |
| R28a / R28b kitchen garden door → vegetable garden (east gate, along the cross path) → herb garden → orchard → round the infirmary's west end → postern → out | c1549–c1553 k0457 H, k1558/k1559 M | The girl's route |

## Uncertain or unrepresentable

- None of the Abbot's house, the hospice or the dormitory is given a door toward the cloister walk. The book says only that they lie "around the cloister" (c0113 k0088 H, c0114 k0251 H), so they are reached from the outside ground.
- The dormitory's way out (passage east door) is RECON. The book gives only "left the dormitory ... round the apse".
- The postern's exact wall segment and its outside descent to Ubertino's road bend (R29, k0947 H) are not modelled beyond the wicket itself.

## Open issues for other owners

- **church.js (arch-core):** the terrain sink `foot` is a rectangle round the apse (`[xA + APSE_R + 0.5, chN − 0.5] … [xA + APSE_R + 0.5, zS + 1.2]`). Its corners leave pits to −9 m between the round apse and the rectangle, at about x 47–51, z −2…+2 (SE) and x 49–50, z −9…−9.5 (NE), and the walker can fall into them. The SE pit is covered by the paved apron in claustrum.js. A proper fix is to replace the two apse corners of `foot` with a polygonal semicircle about (xA, zc) of radius APSE_R + 0.5.
- **zones.js (arch-core):** the smithy, novices' house, lodgings, cellars, granaries, mill and press have no indoor zone, so `__audit.leaks` never tests them. They were checked with a zone-free ray test instead (harness `probe_g.js __leakRects`). The smithy basement (y ≈ −3.1) is also still classified by the `y < −1` ossuary/crypt catch-alls.
