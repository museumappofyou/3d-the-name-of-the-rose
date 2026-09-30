# Abbey overview (from *Gülün Adı* / The Name of the Rose)

All statements below are extracted from the novel only. Claim IDs point to `../../../book_details/output/claims.jsonl`; fact IDs point to `../../../book_details/output/facts.json`.

## Totals
- claims: 3114
- consolidated facts: 2799
- entities/spaces: 233
- spatial relations: 856
- movement relations: 360
- visibility relations: 90
- access relations: 81
- reconstruction constraints: HARD 1406 / MEDIUM 820 / SOFT 171

## Most evidenced entities

- LIBRARY: 404 facts
- ABBEY: 281 facts
- CHURCH: 277 facts
- AEDIFICIUM: 151 facts
- SCRIPTORIUM: 146 facts
- KITCHEN: 131 facts
- INFIRMARY: 88 facts
- REFECTORY: 62 facts
- CELL: 59 facts
- COURTYARD: 47 facts
- WALL: 46 facts
- MEETING_HALL: 43 facts
- GARDEN: 40 facts
- CEMETERY: 38 facts
- ROOM: 35 facts
- WORKSHOP: 32 facts
- STABLES: 30 facts
- DORMITORY: 30 facts
- CELLAR: 29 facts
- STAIRCASE: 29 facts
- GATE: 28 facts
- CRYPT: 26 facts
- GUEST_HOUSE: 23 facts
- SOUTH_TOWER: 19 facts
- VAT: 19 facts
- FINIS_AFRICAE: 19 facts
- LABORATORY: 18 facts
- TOWER: 17 facts
- ROAD: 16 facts
- CHAPEL: 16 facts

## Containment hierarchy (best supported)

- ABBEY [EXPLICIT] — Root: most-supported top-level entity. Reverse relation WALL CONTAINS ABBEY (9) also attested; treated as enclosure instead.
  - COURTYARD [EXPLICIT] — MEETING_HALL CONTAINS COURTYARD(1) weaker than ABBEY(7).
    - COLUMN_CAPITAL [AMBIGUOUS]
    - COLUMN [EXPLICIT]
      - CHIMNEY [AMBIGUOUS]
    - PARAPET_WALL [AMBIGUOUS]
  - AEDIFICIUM [EXPLICIT] — Also attested under AEDIFICIUM: INFIRMARY(3), COURTYARD(1), CEMETERY(1), FINIS_AFRICAE(1); those placed by higher parent counts.
    - KITCHEN [EXPLICIT]
      - HEARTH [AMBIGUOUS] — KITCHEN(3) over SCRIPTORIUM(1).
      - BREAD_OVEN [AMBIGUOUS]
      - DISHWASHING_PIT [AMBIGUOUS]
    - EAST_TOWER [AMBIGUOUS] — SCRIPTORIUM/LIBRARY containment(1 each) weaker than AEDIFICIUM(7).
    - LIBRARY [EXPLICIT] — EAST/SOUTH/WEST/NORTH towers also attested under LIBRARY but placed under AEDIFICIUM by higher support.
      - FINIS_AFRICAE [EXPLICIT] — LIBRARY(3) over AEDIFICIUM(1). TABLE(3) placed under SCRIPTORIUM.
        - TABLE [AMBIGUOUS] — Parent tie FINIS_AFRICAE(3)/LABORATORY(3)/SCRIPTORIUM(3), also REFECTORY(2), MIRROR_ROOM(2), YSPANIA_Y_ROOM(2), INFIRMARY(1), KITCHEN(1), LIBRARY(1), WORKSHOP(1).
        - CUPBOARD [AMBIGUOUS]
      - GREAT_HALL [AMBIGUOUS]
      - MIRROR [AMBIGUOUS]
      - SCENTED_ROOM [AMBIGUOUS]
      - CENTRAL_HEPTAGON [AMBIGUOUS]
      - OCTAGON [AMBIGUOUS]
    - REFECTORY [EXPLICIT] — ABBEY CONTAINS REFECTORY(4) tied with AEDIFICIUM(4).
      - DOOR [AMBIGUOUS] — Parents REFECTORY(3), GUEST_HOUSE(1 strong), INFIRMARY(1), KITCHEN(1).
      - FAUCET [AMBIGUOUS]
    - SCRIPTORIUM [EXPLICIT] — Parent AEDIFICIUM(4) over ABBEY(3). TABLE parent tie FINIS_AFRICAE(3)/LABORATORY(3).
      - VENANTIUS_DESK [AMBIGUOUS]
      - ADELMO_WORK_DESK [AMBIGUOUS]
      - CATALOG [AMBIGUOUS]
      - WORK_DESK [AMBIGUOUS]
    - WEST_TOWER [STRONG_INFERENCE]
      - BLIND_ROOM [AMBIGUOUS]
    - SOUTH_TOWER [EXPLICIT] — LIBRARY CONTAINS SOUTH_TOWER(1) weaker than AEDIFICIUM(2).
      - ROOM_OF_ARABIC_WORKS [AMBIGUOUS]
    - UPPER_FLOOR [AMBIGUOUS]
    - NORTH_TOWER [AMBIGUOUS] — LIBRARY CONTAINS NORTH_TOWER(1) explicit alternative.
    - CEMETERY [AMBIGUOUS] — AEDIFICIUM CONTAINS CEMETERY(1) tie.
    - SOUTH_WING [AMBIGUOUS]
    - SOUTH_WALL [AMBIGUOUS]
  - CHURCH [EXPLICIT] — TOWER parent ties CHURCH(1) vs INFIRMARY(1). MARY_STATUE inferred from CHURCH CONTAINS VIRGIN_MARY_STATUE(3).
    - CHOIR [AMBIGUOUS]
    - NAVE [EXPLICIT]
      - CANDELABRA [AMBIGUOUS]
    - ALTAR [AMBIGUOUS] — CHAPEL CONTAINS ALTAR(2) weaker than CHURCH(8).
    - VIRGIN_MARY_STATUE [AMBIGUOUS]
    - CHURCH_DOOR [AMBIGUOUS]
    - APSE [AMBIGUOUS]
    - CHAPEL [AMBIGUOUS]
    - CROSS [AMBIGUOUS]
    - SIDE_NAVE [AMBIGUOUS]
    - MAIN_ALTAR [AMBIGUOUS]
    - PORTAL [AMBIGUOUS]
    - WINDOWS [AMBIGUOUS]
    - LEFT_NAVE [AMBIGUOUS]
    - MIDDLE_NAVE [AMBIGUOUS]
    - NORTH_DOOR [AMBIGUOUS]
    - LEFT_WALL [AMBIGUOUS]
    - GREAT_DOOR [AMBIGUOUS]
    - CENTRAL_DOOR [AMBIGUOUS]
    - TRANSEPT [AMBIGUOUS]
    - CHURCH_FACADE [AMBIGUOUS]
    - SOUTH_DOOR [AMBIGUOUS]
    - PULPIT [AMBIGUOUS]
    - REAR_PART [AMBIGUOUS]
    - NORTH_GATE [AMBIGUOUS]
    - BELL_TOWER [AMBIGUOUS]
    - TOWER [EXPLICIT] — Parent tie CHURCH(1) vs INFIRMARY(1). TOWER CONTAINS LIBRARY(1) AMBIGUOUS, not used.
      - SPIRAL_STAIRCASE [AMBIGUOUS]
    - CHURCH_TOWER [AMBIGUOUS]
  - INFIRMARY [EXPLICIT] — ABBEY(4) vs AEDIFICIUM(3) parent; ABBEY chosen by count.
    - LABORATORY [EXPLICIT]
      - GLOBE [AMBIGUOUS]
    - BOOK [AMBIGUOUS]
  - STABLES [AMBIGUOUS]
  - CELL [EXPLICIT] — Other parents: GUEST_HOUSE(2), WORKSHOP(1).
    - BED [AMBIGUOUS]
    - STRAW_MATTRESS [AMBIGUOUS]
  - GARDEN [AMBIGUOUS]
  - CELLAR [AMBIGUOUS] — CELLAR CONTAINS WORKSHOP(1) unmapped; WORKSHOP placed under ABBEY.
  - MEETING_HALL [AMBIGUOUS]
  - BATH [STRONG_INFERENCE]
    - FOUNTAIN [AMBIGUOUS]
  - WORKSHOP [AMBIGUOUS] — CELLAR CONTAINS WORKSHOP(1) explicit alternative; ABBEY placement has 2 claims.
  - WINDOW [AMBIGUOUS] — Other parents: SCRIPTORIUM(1 strong), STAIRCASE(1).
  - SHEEPFOLDS [AMBIGUOUS]
  - DORMITORY [EXPLICIT]
    - LOWER_FLOOR [EXPLICIT]
      - JORGE_CELL [AMBIGUOUS]
  - SMITHY [AMBIGUOUS]
  - OCTAGONAL_COURTYARD [AMBIGUOUS]
  - TORTURE_ROOM [AMBIGUOUS]
  - SHEEPFOLD [AMBIGUOUS]
  - TREASURY [AMBIGUOUS]
  - WATER_RESERVOIRS [AMBIGUOUS]
- WALL [EXPLICIT] — WALL CONTAINS ABBEY(9) contradicts ABBEY CONTAINS WALL(7). WALL CONTAINS LIBRARY(1) not used (LIBRARY placed higher).
  - GATE [AMBIGUOUS] — WALL(2) over ABBEY(1).
  - OUTBUILDINGS [AMBIGUOUS]
  - WALL_PASSAGE [AMBIGUOUS]
  - PLAQUE [AMBIGUOUS]
- YSPANIA_Y_ROOM [EXPLICIT] — No CONTAINS parent; itself contains BOOK_CABINET(4), TABLE(2), WALL(1).
  - BOOK_CABINET [AMBIGUOUS] — YSPANIA_Y_ROOM(4) over LIBRARY(1).
- CORRIDOR [EXPLICIT] — Tie CRYPT(1)/LIBRARY(1).
  - BONE_CEMETERY [EXPLICIT]
    - BONE_CEMETERY_PASSAGE [AMBIGUOUS]
  - NICHE [AMBIGUOUS]
- STAIRCASE_HALL [EXPLICIT]
  - STAIRCASE [AMBIGUOUS] — Parent TOWER(2); also EAST/SOUTH/WEST_TOWER, SEVEN_SIDED_HALL (1 each).
- ABBOT_HOUSE [EXPLICIT] — No CONTAINS parent.
  - HALL [AMBIGUOUS]
- CENTRAL_OPENING [WEAK_INFERENCE] — No CONTAINS parent; CENTRAL_OPENING CONTAINS ROOM (weak).
  - ROOM [AMBIGUOUS] — Tie TOWER(1)/LIBRARY(1); CENTRAL_OPENING(1 weak).
- CRYPT [EXPLICIT] — Given as CRYPT BELOW ABBEY; no CONTAINS relation.
- GUEST_HOUSE [EXPLICIT] — ADJACENT_TO SOUTH_PATH; no CONTAINS parent.
  - THRESHOLD [AMBIGUOUS]
- LAMP_ROOM [EXPLICIT]
  - LAMP [AMBIGUOUS]
- MOUNTAIN [EXPLICIT] — No CONTAINS parent; contains FOREST(1).
  - FOREST [AMBIGUOUS]
- VALLEY [EXPLICIT] — No CONTAINS parent; contains VILLAGE(1).
  - VILLAGE [AMBIGUOUS]
- MARY_STATUE [WEAK_INFERENCE] — Relation attested as CHURCH CONTAINS VIRGIN_MARY_STATUE(3).
- MILL [WEAK_INFERENCE] — ADJACENT_TO SOUTH_PATH; no CONTAINS parent.
- GRANARY [WEAK_INFERENCE] — ADJACENT_TO SOUTH_PATH; no CONTAINS parent.
- NOVICE_HOUSE [WEAK_INFERENCE] — ADJACENT_TO SOUTH_PATH; no CONTAINS parent.
- MELK_MONASTERY [WEAK_INFERENCE] — No CONTAINS parent; contains LIBRARY(1).
- SEVEN_SIDED_HALL [WEAK_INFERENCE] — No CONTAINS parent; contains STAIRCASE(1).
- MIRROR_ROOM [WEAK_INFERENCE] — No CONTAINS parent; contains TABLE(2).
- ROAD [WEAK_INFERENCE] — No CONTAINS parent; ROAD OPENS_INTO HAYSTACK/CHURCH.
- HAYSTACK [WEAK_INFERENCE] — No CONTAINS parent; ROAD OPENS_INTO HAYSTACK; HAYSTACK BELOW ROCKS.
- OVEN [WEAK_INFERENCE] — No CONTAINS parent; OVEN BELOW WEST_TOWER. (KITCHEN CONTAINS BREAD_OVEN is a different key.)
- FIRST_BLIND_ROOM [WEAK_INFERENCE] — No attested containment relation.
- PRECIPICE [WEAK_INFERENCE] — No attested containment relation.
- RELIC_CONTAINER [WEAK_INFERENCE] — No attested containment relation.
- SAN_SALVATORE_CHURCH [WEAK_INFERENCE] — No attested containment relation.
- PLAIN [WEAK_INFERENCE] — No attested containment relation.
- HILL [WEAK_INFERENCE] — No attested containment relation.
- SLIT [WEAK_INFERENCE] — No attested containment relation.
- LUNETTE [WEAK_INFERENCE] — No attested containment relation.
- CLOISTER [WEAK_INFERENCE] — No attested containment relation.
- LAND [WEAK_INFERENCE] — No attested containment relation.
- ROOMS_ACAIA [WEAK_INFERENCE] — No attested containment relation.
- OLD_CHURCH_DOOR [WEAK_INFERENCE] — No attested containment relation.
- WELL [WEAK_INFERENCE] — No attested containment relation.
- VINEYARD [WEAK_INFERENCE] — No attested containment relation.
- ORCHARD [WEAK_INFERENCE] — No attested containment relation.
- SLOPE [WEAK_INFERENCE] — No attested containment relation.
- SEA [WEAK_INFERENCE] — No attested containment relation.
- CHICKEN_COOP [WEAK_INFERENCE] — No attested containment relation.
- PASSAGE [WEAK_INFERENCE] — No attested containment relation.
- PASSAGE_BETWEEN_ROOMS [WEAK_INFERENCE] — No attested containment relation.
- CAULDRON [WEAK_INFERENCE] — No attested containment relation.
- LAND_MEASURE [WEAK_INFERENCE] — No attested containment relation.
- ALAM [WEAK_INFERENCE] — No attested containment relation.
- GROVE [WEAK_INFERENCE] — No attested containment relation.
- BARRELS [WEAK_INFERENCE] — No attested containment relation.
- OPEN_AREA [WEAK_INFERENCE] — No attested containment relation.
- WOOD_PILE [WEAK_INFERENCE] — No attested containment relation.
- MOUNTAIN_RANGE [WEAK_INFERENCE] — No attested containment relation.
- THRESHING_FLOOR [WEAK_INFERENCE] — No attested containment relation.
- PIG_PENS [WEAK_INFERENCE] — No attested containment relation.
- LANDSCAPE [WEAK_INFERENCE] — No attested containment relation.
- ABBOT_TABLE [WEAK_INFERENCE] — No attested containment parent; ABBOT_TABLE ABOVE MONKS_TABLES.
- BELL [WEAK_INFERENCE] — No attested containment relation.
- PENTAGONAL_ROOM [WEAK_INFERENCE] — No attested containment relation.
- SNOW [WEAK_INFERENCE] — No attested containment relation.
- CURTAIN [WEAK_INFERENCE] — No attested containment relation.
- TREE [WEAK_INFERENCE] — No attested containment relation.
- SITE_LANDSCAPE [WEAK_INFERENCE] — No attested containment relation.
- GORGE [WEAK_INFERENCE] — No attested containment relation.
- AULA [WEAK_INFERENCE] — No attested containment relation.
- NOVARA_ABBEY [WEAK_INFERENCE] — No attested containment relation.
- MEETING_BUILDING [WEAK_INFERENCE] — No attested containment relation.
- UNDERGROUND_PASSAGE [WEAK_INFERENCE] — No attested containment relation.
- STOOL [WEAK_INFERENCE] — No attested containment relation.
- ADJACENT_ROOM [WEAK_INFERENCE] — No attested containment relation.
- VAT [WEAK_INFERENCE] — No attested containment relation.
- ROOM_S [WEAK_INFERENCE] — No attested containment relation.
- UNKNOWN [WEAK_INFERENCE] — Synthetic grouping for entities with no attested containment parent (only adjacency or vertical relations, or no relation at all).

## Site and landscape

- **WALL part_of ABBEY**  
  `fact_000035` | site_landscape | EXPLICIT | support 4 | claims: claim_000432, claim_001761, claim_002262, claim_002534
- **VALLEY below ABBEY**  
  `fact_000173` | site_landscape | EXPLICIT | support 2 | claims: claim_001728, claim_003092
- **VINEYARD east_of ABBEY**  
  `fact_000175` | site_landscape | EXPLICIT | support 2 | claims: claim_000845, claim_000851
- **VILLAGE below ABBEY**  
  `fact_000069` | site_landscape | STRONG_INFERENCE | support 2 | claims: claim_001560, claim_001569
- **ABBAYE_DE_LA_SOURCE near PASSY**  
  `fact_000182` | site_landscape | EXPLICIT | support 1 | claims: claim_003001
- **ABBEY adjacent_to HILLSIDE**  
  `fact_000280` | site_landscape | EXPLICIT | support 1 | claims: claim_001293
- **ABBEY far_from NOVARA_MOUNTAINS**  
  `fact_000266` | site_landscape | EXPLICIT | support 1 | claims: claim_000946
- **ABBEY far_from VERCELLI_BISHOP_LANDS**  
  `fact_000265` | site_landscape | EXPLICIT | support 1 | claims: claim_000945
- **ABBEY far_from WORLD**  
  `fact_000267` | site_landscape | EXPLICIT | support 1 | claims: claim_000947
- **ABBEY near HILL**  
  `fact_001392` | site_landscape | EXPLICIT | support 1 | claims: claim_002949
- **ABBEY near MOUNTAIN_SLOPE**  
  `fact_000233` | site_landscape | EXPLICIT | support 1 | claims: claim_000579
- **ABBEY near NOVARA_MOUNTAINS**  
  `fact_002128` | site_landscape | EXPLICIT | support 1 | claims: claim_000941
- **ABBEY near VERCELLI_LANDS**  
  `fact_002679` | site_landscape | EXPLICIT | support 1 | claims: claim_000940
- **ABBEY: atmospheric_condition = gray morning, almost milky blue; no horizon visible**  
  `fact_000321` | site_landscape | EXPLICIT | support 1 | claims: claim_001749
- **ABBEY: isolation = a monastery isolated from the world**  
  `fact_000380` | site_landscape | EXPLICIT | support 1 | claims: claim_002295
- **ABBEY: location = a Benedictine monastery on this edge/coast of Italy**  
  `fact_000251` | site_landscape | EXPLICIT | support 1 | claims: claim_000796
- **ABBEY: location = the abbey is located on a hill**  
  `fact_000191` | site_landscape | EXPLICIT | support 1 | claims: claim_000034
- **ABBEY: location_known = location of the abbey remains unknown/silent in the manuscript**  
  `fact_000184` | site_landscape | EXPLICIT | support 1 | claims: claim_000012
- **ABBEY: location_relative_to_travel_route = the place they would finally reach was in the east**  
  `fact_000189` | site_landscape | EXPLICIT | support 1 | claims: claim_000020
- **ABBEY: road_condition = the roads outside are not safe**  
  `fact_000400` | site_landscape | EXPLICIT | support 1 | claims: claim_002529
- **ABBEY: situation = abbey lies among mountains; news should not pass beyond these mountains**  
  `fact_000401` | site_landscape | EXPLICIT | support 1 | claims: claim_002532
- **ABBEY: surrounding_land = the lands around the abbey were uncultivated**  
  `fact_000425` | site_landscape | EXPLICIT | support 1 | claims: claim_002960
- **ABBEY: surrounding_terrain = the abbey is associated with a plain (ova) that would be covered by a white blanket**  
  `fact_000231` | site_landscape | EXPLICIT | support 1 | claims: claim_000565
- **ABBEY: surroundings = there is an area around the abbey where one can walk about**  
  `fact_000310` | site_landscape | EXPLICIT | support 1 | claims: claim_001696
- **ABBEY: terrain = buildings spread on a gently concave surface/pointed hill, on a slightly sloped flat cutting the mountain summit**  
  `fact_000204` | site_landscape | EXPLICIT | support 1 | claims: claim_000096
- **ABBEY: terrain = situated on a high plateau (yüksek yayla)**  
  `fact_000224` | site_landscape | EXPLICIT | support 1 | claims: claim_000311
- **ABBEY: terrain = the terrain is vaguely undulating yet regular**  
  `fact_000206` | site_landscape | EXPLICIT | support 1 | claims: claim_000124
- **ABBEY: weather = wind was blowing outside the abbey that night**  
  `fact_000414` | site_landscape | EXPLICIT | support 1 | claims: claim_002776
- **AEDIFICIUM adjacent_to CLIFF**  
  `fact_002194` | site_landscape | EXPLICIT | support 1 | claims: claim_001375
- **AEDIFICIUM near HIGH_PLATEAU**  
  `fact_001388` | site_landscape | EXPLICIT | support 1 | claims: claim_001734
- **AEDIFICIUM: location = its inaccessible location makes it appear more venerable and inspires fear in the approaching traveller**  
  `fact_000480` | site_landscape | EXPLICIT | support 1 | claims: claim_000053
- **AEDIFICIUM: north_walls_position = its north walls seem to emerge from the folds of the mountain that rises directly above them**  
  `fact_000474` | site_landscape | EXPLICIT | support 1 | claims: claim_000046
- **AEDIFICIUM: south_walls_position = its south walls rise on the flat ground where the monastery stands**  
  `fact_000473` | site_landscape | EXPLICIT | support 1 | claims: claim_000045
- **BOTANICAL_GARDEN near AEDIFICIUM**  
  `fact_001274` | site_landscape | EXPLICIT | support 1 | claims: claim_000344
- **CASALE_ABBEY: other_monastery = Remigio took refuge in the monastery of Casale**  
  `fact_000653` | site_landscape | EXPLICIT | support 1 | claims: claim_002221
- **CEMETERY contains GRAVE**  
  `fact_000764` | site_landscape | EXPLICIT | support 1 | claims: claim_000892
- **CEMETERY: existence = a cemetery exists at the abbey grounds**  
  `fact_000760` | site_landscape | EXPLICIT | support 1 | claims: claim_000751
- **CROWD in_front_of SAN_SALVATORE_CHURCH**  
  `fact_002341` | site_landscape | EXPLICIT | support 1 | claims: claim_003028
- **DUNGHILL: existence = a dunghill near the preachers' monastery anecdote**  
  `fact_001206` | site_landscape | EXPLICIT | support 1 | claims: claim_003097
- **FONDAMENTI_DI_SANTA_LIPERATA: named_location = a named place where someone shouted that Michele was mad**  
  `fact_001252` | site_landscape | EXPLICIT | support 1 | claims: claim_003043

## General layout

- **ABBEY inside WALL**  
  `fact_000004` | general_layout | EXPLICIT | support 6 | claims: claim_000575, claim_001301, claim_001346, claim_001551 +2 more
- **ABBEY contains AEDIFICIUM**  
  `fact_000011` | general_layout | EXPLICIT | support 5 | claims: claim_000001, claim_000131, claim_000140, claim_000574 +1 more
- **ABBEY contains CHURCH**  
  `fact_000036` | general_layout | EXPLICIT | support 3 | claims: claim_000288, claim_001353, claim_002030
- **ABBEY contains COURTYARD**  
  `fact_000104` | general_layout | EXPLICIT | support 2 | claims: claim_000095, claim_001721
- **AEDIFICIUM contains KITCHEN**  
  `fact_000076` | general_layout | EXPLICIT | support 2 | claims: claim_000469, claim_001548
- **CHURCH contains NAVE**  
  `fact_000093` | general_layout | EXPLICIT | support 2 | claims: claim_000290, claim_000297
- **KITCHEN part_of AEDIFICIUM**  
  `fact_000124` | general_layout | EXPLICIT | support 2 | claims: claim_000347, claim_000683
- **WALL inside ABBEY**  
  `fact_000176` | general_layout | EXPLICIT | support 2 | claims: claim_000148, claim_000286
- **ABBEY contains MEETING_HALL**  
  `fact_000349` | general_layout | EXPLICIT | support 1 | claims: claim_002032
- **ABBEY/UPPER_FLOOR: existence = the abbey has an upper floor above the level where William and Adso sit**  
  `fact_000249` | general_layout | EXPLICIT | support 1 | claims: claim_000791
- **ABBEY: characterization = described as a real world / a world in itself**  
  `fact_000282` | general_layout | EXPLICIT | support 1 | claims: claim_001325
- **ABBEY: composition = the abbey is a whole made up of multiple buildings**  
  `fact_000346` | general_layout | EXPLICIT | support 1 | claims: claim_002014
- **ABBEY: existence = an abbey whose internal affairs the abbot governs and whose history is invoked**  
  `fact_000285` | general_layout | EXPLICIT | support 1 | claims: claim_001345
- **ABBEY: existence_of_passages = there are other passages besides the known ones**  
  `fact_000277` | general_layout | EXPLICIT | support 1 | claims: claim_001113
- **ABBEY: exits = the abbey has exits besides the guarded gate, known to the Abbot**  
  `fact_000374` | general_layout | EXPLICIT | support 1 | claims: claim_002264
- **ABBEY: has_a_comprehensible_plan = the abbey has a plan/layout that can be understood by walking everywhere**  
  `fact_000332` | general_layout | EXPLICIT | support 1 | claims: claim_001771
- **ABBEY: inside_outside_distinction = the monastery has an inside and an outside**  
  `fact_000327` | general_layout | EXPLICIT | support 1 | claims: claim_001758
- **ABBEY: monk_count = sixty monks reside in the abbey**  
  `fact_000287` | general_layout | EXPLICIT | support 1 | claims: claim_001352
- **ABBEY: plan = a diagram/plan of the abbey is provided and the narrator asserts it is reliable**  
  `fact_000429` | general_layout | EXPLICIT | support 1 | claims: claim_003003
- **ABBEY: plan_source = the plan is derived partly from the text and partly from comparing the Rule with Edouard Schneider's description of monastic life in Les Heures bénédictines**  
  `fact_000430` | general_layout | EXPLICIT | support 1 | claims: claim_003004
- **ABBEY: sacred_status = monasteries are holy places**  
  `fact_000447` | general_layout | EXPLICIT | support 1 | claims: claim_003088
- **ABBEY: size = small**  
  `fact_000207` | general_layout | EXPLICIT | support 1 | claims: claim_000164
- **ABBEY: wealth = a rich monastery; the abbot must like showy ceremonies**  
  `fact_000198` | general_layout | EXPLICIT | support 1 | claims: claim_000057
- **ABBEY: wealth = rich**  
  `fact_000208` | general_layout | EXPLICIT | support 1 | claims: claim_000165
- **AEDIFICIUM: full_of_passages = the Aedificium is full of passages**  
  `fact_000576` | general_layout | EXPLICIT | support 1 | claims: claim_002627
- **AEDIFICIUM: spatial_legibility = its position is well known from outside, but inside one understands nothing**  
  `fact_000543` | general_layout | EXPLICIT | support 1 | claims: claim_001366
- **BUILDINGS east_of CHURCH**  
  `fact_000205` | general_layout | EXPLICIT | support 1 | claims: claim_000110
- **CELL: arrangement = cells are arranged so that a waker can go from cell to cell**  
  `fact_000666` | general_layout | EXPLICIT | support 1 | claims: claim_000631
- **CHICKEN_COOP: sequence_order = after the ox stables come the chicken coops**  
  `fact_000805` | general_layout | EXPLICIT | support 1 | claims: claim_000372
- **COURTYARD between CHURCH_AND_GUEST_HOUSE**  
  `fact_001109` | general_layout | EXPLICIT | support 1 | claims: claim_001287
- **COURTYARD inside AEDIFICIUM**  
  `fact_000508` | general_layout | EXPLICIT | support 1 | claims: claim_000354
- **CRYPT contains DISPLAY_CASES_AND_RELIQUARIES**  
  `fact_001158` | general_layout | EXPLICIT | support 1 | claims: claim_002461
- **DESK adjacent_to OCTAGONAL_COURTYARD**  
  `fact_002389` | general_layout | EXPLICIT | support 1 | claims: claim_000835
- **DESK adjacent_to WALL**  
  `fact_002392` | general_layout | EXPLICIT | support 1 | claims: claim_000839
- **EAST_TOWER: external_features = seen from outside each tower shows five windows and five walls**  
  `fact_001214` | general_layout | EXPLICIT | support 1 | claims: claim_001174
- **INFIRMARY contains TOWER**  
  `fact_001404` | general_layout | EXPLICIT | support 1 | claims: claim_000377
- **INFIRMARY part_of AEDIFICIUM**  
  `fact_001403` | general_layout | EXPLICIT | support 1 | claims: claim_000348
- **LEFT_NAVE part_of CHURCH**  
  `fact_000884` | general_layout | EXPLICIT | support 1 | claims: claim_000277
- **LIBRARY contains CORRIDOR**  
  `fact_001661` | general_layout | EXPLICIT | support 1 | claims: claim_000425
- **LIBRARY contains LABYRINTH**  
  `fact_001668` | general_layout | EXPLICIT | support 1 | claims: claim_000533
- **LIBRARY contains ROOM**  
  `fact_001660` | general_layout | EXPLICIT | support 1 | claims: claim_000424
- **LIBRARY/PASSAGE: passage_arrangement = the position of the passages follows no mathematical law; from some rooms one can pass to several other rooms, from some to only one**  
  `fact_001776` | general_layout | EXPLICIT | support 1 | claims: claim_001424
- **LIBRARY/PASSAGE: passages = has passages/corridors (geçitler)**  
  `fact_001795` | general_layout | EXPLICIT | support 1 | claims: claim_001521
- **LIBRARY/ROOM: arrangement = the letters marking the rooms, taken all together, form a text that has to be discovered**  
  `fact_002001` | general_layout | EXPLICIT | support 1 | claims: claim_003024
- **LIBRARY/YSPANIA_Y_ROOM: condition = this room was the most disordered room of the labyrinth**  
  `fact_001975` | general_layout | EXPLICIT | support 1 | claims: claim_002788
- **LIBRARY: absent_room = in this tower there should have been a heptagonal room, but there was none**  
  `fact_001881` | general_layout | EXPLICIT | support 1 | claims: claim_001925
- **LIBRARY: blind_rooms = there are three other blind rooms similar to this room**  
  `fact_001945` | general_layout | EXPLICIT | support 1 | claims: claim_002679
- **LIBRARY: book_arrangement = books are arranged according to the countries they come from or the author's birthplace**  
  `fact_001830` | general_layout | EXPLICIT | support 1 | claims: claim_001837
- **LIBRARY: book_arrangement = some rooms contain various books mixed together**  
  `fact_001840` | general_layout | EXPLICIT | support 1 | claims: claim_001847
- **LIBRARY: complexity_outside_tower = outside the tower the arrangement of rooms is more confused than expected**  
  `fact_001716` | general_layout | EXPLICIT | support 1 | claims: claim_001178
- **LIBRARY: count_of_windowless_rooms = eight rooms have no window**  
  `fact_001772` | general_layout | EXPLICIT | support 1 | claims: claim_001419
- **LIBRARY: count_of_windowless_rooms = there are eight windowless rooms altogether**  
  `fact_001765` | general_layout | EXPLICIT | support 1 | claims: claim_001412
- **LIBRARY: design_principle = the library is designed and arranged according to the orbit of the earth**  
  `fact_001886` | general_layout | EXPLICIT | support 1 | claims: claim_001941
- **LIBRARY: design_secrecy = built according to a design kept hidden for centuries from everyone and never learned by any monk**  
  `fact_001635` | general_layout | EXPLICIT | support 1 | claims: claim_000184
- **LIBRARY: existence = a labyrinth whose interior passages one can get lost in; the characters have learned how not to get lost in it**  
  `fact_001996` | general_layout | EXPLICIT | support 1 | claims: claim_003019
- **LIBRARY: existence_and_access = there is a labyrinth and a way to enter it**  
  `fact_001688` | general_layout | EXPLICIT | support 1 | claims: claim_000966
- **LIBRARY: features = open areas and dead ends (çıkmaz)**  
  `fact_001812` | general_layout | EXPLICIT | support 1 | claims: claim_001813
- **LIBRARY: features = passages and blind walls**  
  `fact_001811` | general_layout | EXPLICIT | support 1 | claims: claim_001812
- **LIBRARY: internal_structure = tangled paths (maze)**  
  `fact_001808` | general_layout | EXPLICIT | support 1 | claims: claim_001808
- **LIBRARY: layout = a network of interconnecting rooms and corridors**  
  `fact_001791` | general_layout | EXPLICIT | support 1 | claims: claim_001489
