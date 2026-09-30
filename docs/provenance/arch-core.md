# Provenance: arch-core (Aedificium, library, church, crypt, ossuary)

Notation: `cNNNN` = claim_00NNNN, `kNNNN` = con_00NNNN (H/M/S = HARD/MEDIUM/SOFT).
Kinds: **BOOK** = stated by Eco; **RECON** = a reconstruction choice needed to make the text physically coherent; **AMBIENT** = added for life.

## Decisions

| Object / decision | Evidence | Kind | Note |
|---|---|---|---|
| West portal: two walkable openings either side of the trumeau, oak leaves swung back into the nave | c0230–c0269 k0171, k1011, k1012, k0172 H; c0270 k1905 M, c0294 k0466 H, c1286/c1289 k0689 H | BOOK | Doors `church:westN` / `church:westS`. The leaves stand open. |
| Church elevation ×0.8 about the floor (`CHURCH.vScale`) | k0970 H, k1745 M, k1351 H (Aedificium "like a crown above the church"); c2506/c2508 k1732/k1733 M, k0024 H (its outline over the church roof from the Abbot's hall); c1010 k0646 H ("often wider than tall") | RECON | Built heights: aisle wall 7.0 m, nave eave 12.2 m, nave ridge 15.7 m against a width of about 16 m, crossing-tower top 21.3 m, spire tip 35.3 m. Fittings keep true size (altars, stalls, pulpit, tripod, statues inside), and so do the door clear heights (`keepH`) and the newel stairs. |
| Crossing tower: square belfry with a recent pointed spire; square merlons on the first level | k1166 H, k1167/k1168 H, k1357/k1358 H | BOOK | Scaled with the rest. The spire stands over the crossing, next to the choir. |
| Bell-tower entrance: a newel-stair turret in the crossing's south bay, with a low door facing west, rising to the belfry floor | c2806/c2807 k1954 M, k0609 H; c2809 k0610 H | RECON | Moved out of the crossing so the choir, tripod and floor stay free. Route `F12` walks it to the top. |
| Crossing bays closed above the arcade (south bay wall, transept west wall) and a choir/apse arch | — | RECON | These close sky gaps that the leak audit found between the low bay vaults and the crossing. |
| West lancets glazed with plain glass | c0524 k1179 H ("recently repaired, of lesser quality"); c0272 | BOOK | |
| Apse terrain footprint now follows the half-circle | — | RECON | Removes the −9 m pits in the corners outside the apse. |
| Crypt stair: entered from the north side behind the high altar | c2367–c2372 k1657 M, k1893 M, k1004 H | BOOK/RECON | The old parapet shut the head of the stair. Crypt routes pass both ways. |
| **Jorge's secret stair (F4)**: a newel stair (clear radius 1.1 m) in a round pier engaged in the finis Africae's S.hall/S.T4 wall. It runs from the ossuary (−2.8 m) to the library floor (15.6 m), through the kitchen's S-tower bay and the scriptorium. | c2624/c2625 k1601 M, k0080 H (very thick wall between the kitchen and the S tower); c2629 k0562 H, c2632 k1155 H (parallel to the spiral, straight up to the blind room); c2687 k1145 H | BOOK + RECON | `HIDDEN_STAIR` in aedificium.js. The floors and vaults are cut round the shaft. The library wall stops at the pier. Bookcases stand clear of it. |
| Upper door: an oak cupboard that swings out from the pier; the weighted wheel stands beside it | c2686 k0530 H (a door behind the cupboard); c2688 (a wheel with weights, worked from above) | BOOK | The cupboard is `finis-cupboard`, a dynamic collider. |
| Lower door: the blind wall of great squared stones with the worn plaque, on the left of the ossuary passage near the kitchen end, sinks into the floor | c2619/c2620 (a blind wall at the last niche, plaque of monograms); c2621 (knocking in the wall to the left); c2685 (the plate below works the lever above); c2632 (one mechanism opens both passages) | BOOK | A short dog-leg passage links it to the foot of the shaft. The `plaque` interaction toggles the same state as the cupboard. |
| Closed by default | c2692/c2693 k0002 H (only Jorge knew it), k2253 S | BOOK | Both colliders block while closed. |
| Ossuary descent moved 2.6 m east of the S-tower spiral (`AED.ossX`); the iron-clad door opens into the kitchen, and the S spiral's foot door turns east beside it | c2615/c2617 k1270 H, k1323 H ("behind the hearth, at the foot of the spiral"); c1054–c1068 k0799 H | RECON | Before this change the door opened straight into the spiral shaft and the kitchen could not be reached from it. The door leaf, which had been standing shut, now swings back. The tunnel and the foundation opening moved with the descent. |
| Domed caps over the ossuary bends | — | RECON | They close the open wedges between the barrel vaults. |
| Kitchen ground windows removed on the precipice faces; kept ground windows widened to 1.3–1.5 m of opaque glass | k1806 M, k0098/k1147 H | BOOK | F8, done in the previous wave. |
| Refectory benches either side of each board (across the long axis) | c0582/c0584 | AMBIENT | So that seated diners line up with the tables. |
| Aedificium entrance leaves as separate pivots (`app.aed.doorLeaves`) | k0491/k0492 H, k1423/k1427/k1428 M (Malachi bars the doors after Compline) | BOOK (behaviour in main.js) | Both pivots take the same angle (`open` = 1.2 means open, `closed` = 0). The s=−1 leaf sits in a mirrored frame. |
| E-tower lower flight: 2.52 turns so it meets the upper flight at the scriptorium doorway | c0827–c0830 k0741/k0555/k0556 H | RECON | Makes R6 and R7 continuous. |

## Zones (src/systems/zones.js)

- `ossuary` is now bounded to its footprint: a 2.2 m band along `OSSUARY_PATH` (exported by church.js), the chapel stair, the kitchen descent and the hidden stair's foot passage, at depths from −1 m to −4.5 m. It no longer takes in every basement.
- `smithy-cells` (new): the smithy footprint below −1 m (F7, c2017–c2021, k0931 H).
- `secret-stair` (new): inside the shaft of Jorge's stair.
- `crypt` was already bounded.
- No existing ids were renamed.

## Routes (src/data/routes_aed.js)

All of these pass `__audit.routes()`:
R4, R5, R5b, R6, R7, R8, R8b, R9, R13, R14, F12, and the two crypt routes.

- **R13/R14** start and end on the chapel stair just below the skull altar, because the bot cannot turn the altar.
- **The hidden stair** is walked with it open, down and up, by the harness probe `__hsRoute`. It is not in the routes file, because it is closed by default.

## Visibility check (F2), measured with rays against the built scene

Eyes are placed in the actual window openings:
- the hospice cell's east window at (−13.1, 7.8, 16.3);
- the Abbot's hall north windows at (28.5, 8.1, 26.4).

| Observer | Visible over the church | Still hidden |
|---|---|---|
| William's cell | S-tower peak, down to about 2 m below it (the "crown" reads as the S tower's cap over the nave roof) | S-tower top edge, E-tower peak, the ridge and the eaves |
| Abbot's hall (west window) | E- and W-tower peaks | Tower tops, the ridge and the eaves. The crossing tower and spire hide the S and N towers. |

## Remaining unresolved HARD constraints

- **The "crown" is partial: only the tower peaks show.** The digest's full solution also raises the Aedificium platform by about 6 m (terrain and the whole building). That was not done: it touches terrain.js, plan.js AED levels, every route and the ossuary climb. Raising the observers another 1–2 m, or lowering the church to ×0.7, would show more.
- **The hidden stair is a round pier, not a stair buried in a solid wall.** It stands against the finis Africae's south-west wall and bulges into room S.T4 by about 0.8 m. The book's "wall thickness" is otherwise not modelled: the S-tower walls are 1.5 m thick.
- **The plaque, cupboard and skull altar share one toast text.** The toggle in main.js `act()` is keyed on `it.altar`, and its message is hard-coded for the skull altar.
