# Reconstruction notes

Source: *Gülün Adı*, translated by Şadan Karadeniz (Can Yayınları, 1999 printing), the EPUB in this folder. The whole text was read chapter by chapter for every physical detail. The plan printed in the book (`assets/plan.png`) fixes the layout. File numbers refer to the EPUB’s `index_split_NNN.html`; chapter names are the canonical hours.

## Scale and orientation

The plan has no scale bar. One plan pixel is taken as **0.42 m**, which makes the church ≈ 64 m long and the Aedificium ≈ 63 m across its towers. North is up on the plan and −z in the model. The church’s “main door opens due west, choir and altar face east” (006), and the Aedificium’s towers stand on the cardinal axes exactly as drawn.

## The Aedificium

| Fact | Source |
|---|---|
| An octagon that looks like a square from afar. The southern walls rise from the plateau and the northern ones grow out of the mountainside; the rock turns into bastions “without changing colour or texture”. | 006 First Day, Prime |
| A heptagonal tower at each corner, five sides visible outside. Three rows of windows. The north tower juts out over the precipice. | 006 |
| The windows are large, of opaque glass, and not set at a man’s height. | 008 Terce |
| Kitchen and refectory below; the scriptorium and library on the two floors above. | 008 |
| The kitchen fills the west half. A bread oven in the west tower, a hearth in the south tower. The garden door opens into the kitchen; the south entrance has doors to both halves. | 010 Nones |
| An octagonal well, open through every floor, with no entrance and wide windows onto it. | 010 |
| The refectory is in the east half. A fireplace in the north tower, a spiral stair in the east tower. The only ground-floor windows facing the precipice are the refectory’s. | 010, 011 |
| The scriptorium is undivided, with low curved vaults: **3 huge windows in each great wall, 1 in each of the 5 outer faces of every tower, 8 tall narrow ones on the well = 40, a desk under each**. Clear glass in lead. | 011 after Nones |
| Heated stairs wind round the flue columns in the west and south towers. The north tower has a fireplace and no stair. Only the east stair reaches the library. Straw lies on the floor. | 018 Second Day, Terce |
| The catalogue is chained to Malachi’s desk. Venantius’s desk backs onto the flue. | 011, 018 |
| The ossuary passage ends behind the kitchen chimney, at the foot of the spiral stair. The door is iron-clad wood. | 022 Compline |
| A hidden stair runs in the wall thickness between the kitchen and the south tower, from the ossuary to the finis Africae. | 055, 057 |

**Interpreted.**
- Storey heights and roof form. The fire “reached the eaves” and the wooden frameworks (058), so the building has pitched timber roofs with tiles.
- The kitchen/refectory divide runs through the south entrance. Its vestibule opens into both halves, as 010 requires.
- The scriptorium’s columns and arches carry the library walls above them.

## The library

Third Day, Vespers (029): **56 rooms**: 4 heptagonal and 52 more or less square, of which 8 have no windows, 28 face outward and 16 face inward. Each tower has five four-walled rooms and one seven-walled room. Two blind rooms lie beside each heptagon and open onto rooms facing the octagon. Windows are two per wall and five per tower.

Second Day, Night (023):
- The entrance heptagon has no windows. Only 4 of its 7 walls open, each an arch between two small columns.
- The scrolls over the arches are cut into the stone and painted, some in red.
- The panes are of alabaster (“a beautiful light by day, at night not even moonlight”), and each room has two vent slits at man height.
- The east room has no books, only a stone altar under the window, lit at dawn.
- There is a distorting mirror, and a smouldering censer beside an Apocalypse.

Fourth Day, After Compline (039) gives the letters: FONS ADAE in the east, then AEGYPTUS and IUDAEA interwoven, LEONES in the south tower (from room S to the dead-end L), YSPANIA and ROMA toward the south wall, HIBERNIA in the west tower, GALLIA along the west wall, GERMANI and ANGLIA in the north, and ACAIA as four rooms in a square between east and north, where the labyrinth ends. **Room S** has four passages, to Y, P, E and U, and a blind wall. **Room U** opens only on T and S. The south heptagon cannot be reached.

The model satisfies all of this:

- **Topology.** The heptagon, five tower rooms, two blind rooms and two inward rooms of each tower form one sector. Two outward and two inward rooms make each wall sector. This gives exactly the book’s counts (`tests/library.test.js`).
- **Letters.** Every word above is spelled by a chain of adjacent rooms. IUDAEA closes as a circular reading, which the book allows: “sometimes backward, sometimes in a circle”.
- **Doors.** Every passage the book describes is present. The way from FONS to ANGLIA leads through AEGYPTUS, YSPANIA, GALLIA and GERMANI. The remaining doors are reconstructed; the text says they follow “no mathematical law”.
- **The mirror.** Taller than a man and set in oak, it hangs on the wall of room S that faces the walled heptagon. The letters q and r of *quatuor* open it; it swings toward you (056).
- **The finis Africae** is heptagonal, vaulted and windowless. It has shelves along the walls, a table heaped with papers, a stool, a chair by the door, and a cupboard hiding a door with a weighted wheel beside it (057).

## The church

| Fact | Source |
|---|---|
| Italian in type, wider than it is tall. A first level of square crenellations; above it a “second church” with a pitched roof and severe windows; a recent pointed spire over the choir. | 009 Sext |
| Portal: two plain pillars, a silvery vault, and splayed receding arches. The tympanum shows the Seated One, the crystal sea, the four creatures, and **24 elders in rows of 7+7, 3+3, 2+2** with viols and phials. The trumeau carries three pairs of crossed lions. Peter, Paul, Jeremiah and Isaiah stand on the jambs. There are vices and monsters, and bands of vines and flowers. | 009 |
| The north door faces the Aedificium’s south tower; monks enter the choir by it. | 006, 013 |
| A bronze tripod “two men tall”, sixty in the stalls, blue glass above the altar, the altar gold on every side. | 013, 015, 012, 020 |
| A stone Virgin on a slender column beside the last chapel before the altar, in the left aisle. | 009 |
| The skull chapel is the third on the left. Its altar shows skulls above shin bones; pressing the eyes of the fourth skull from the right turns it. More than ten steps lead down to a corridor of niches holding pyramids of skulls, bones and hands. | 021, 022 |
| The treasury lies behind the high altar, down a small stair: a very low vault on rough columns, with dusty cases of reliquaries. | 049 |
| The bell tower is entered from inside the church. | 058 |

The tympanum and the altar are carved procedurally: the figures are painted into a height field, and a normal map and light polychromy are derived from it. The subjects and numbers follow the text; the forms are simplified.

## Around the cloister

- **Cloister (D):** walks round a garden with trees and a parapet between the columns (016, 021). The capitals carry apes, lions and centaurs (011).
- **Dormitory (F):** individual cells on an upper and a lower floor, with Jorge’s cell off the lower corridor (010, 019). It stands near the choir, with latrines (012).
- **Chapter house (H):** built on the ruins of an old church. A plain pointed door with coloured glass leads into a courtyard on the old narthex. The old portal shows Christ with the 12 apostles, an arch of 12 panels of peoples and an arch of 30 roundels of monstrous peoples. Inside, benches stand in a semicircle facing each other (041).
- **Abbot’s house:** a large cold hall upstairs, from whose window the Aedificium shows over the church roof (053). It burns together with the chapter house (059), so it is placed beside it; its chapel is below.
- **Pilgrims’ hospice:** reached across a flower garden (006), with outside steps (046). William’s cell has windows toward the Aedificium and a niche of straw for Adso (007, 008).

## Gardens, workshops, farmyard

- **Infirmary (K) and baths (J):** set in the botanical garden that follows the curve of the wall (006).
  - Severinus’s laboratory is “an alchemist’s shop”, with shelves of jars beside the door and 20–30 books. The armillary sphere of brass and silver rings stands left of the door (015, 032, 043).
  - The infirmary almost touches the wall behind it (043).
  - The baths have tubs parted by heavy curtains, an overturned cauldron and a basin (031). The book gives no number of tubs; four are shown.
- **Farmyard:** the order is granary, horse stables, ox stables, henhouses and sheepfolds, then pigsties (010). The blood jar stands behind the choir in front of the henhouses (015). The stable door is a metal grille, with Brunellus first from the left (055). Behind the stables the wall is lower (012).
- **Smithy (R):** “where the east wall turns north”, with the glassworks in the back (012, 027).
- **South range:** peasants’ quarters, mills, oil presses, granaries, cellars and the novices’ house (006, 012). The plan does not letter these; the assignments follow Adso’s order.

## The site and the season

- Late November 1327, with three fingers of snow on the first morning (006). Snow falls on the first night (012), and fog lies over days four and five (035, 041).
- A goat path winds round the mountain. At the last bend the road splits in three, and a row of evergreen pines white with snow forms a roof over the upper road (006).
- The sea can be seen from some bends, ten miles off or less (035). A higher, forested mountain rises to the north, and a range facing the sea lies to the south (010).

## Known translation slips

- **010:** the refectory half is called *hastane*.
- **023:** the heptagon is sometimes called *beşgen*.
- **012:** *yemekhane* appears among the southern workshops, probably for cellars.

The model follows the sense of the original in each case.
