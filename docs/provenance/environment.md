# Provenance — environment (materials, terrain, ground, sky, effects, lighting)

Legend: BOOK = stated by Eco; RECON = reconstruction to make the text physically
coherent; AMBIENT = historical detail added for life, not claimed by Eco.

| Object / decision | Claim / constraint ids | Class | Note |
|---|---|---|---|
| Goat path passes a bend **below the east tower** | c0551, con_001355 (H) | BOOK | ROAD in terrain.js: eastern-cliff-foot bend ~(116,−54) under E tower (69.5,−66). |
| Lower bend **below the south side** | c0083/c0084, con_001400 (H), con_000537 (H) | BOOK | ROAD lower bend ~(112,56) below the S tower (42,−39). |
| Road forks **three ways** at the last bend | con_001097 (H) | BOOK | ROAD fork ~(30,84); ROAD_SPUR is the right branch; main road = the descent + the (implicit) upper branch to the gate. |
| Right branch dead-ends at the **straw-and-dung refuse slope** under the E tower | c0061/c0062, con_001562 (M), con_001563 (M) | BOOK/RECON | ROAD_SPUR ends ~(104,−52) at the refuse slope; outbuildings.js `soil` plot (72–98,−74…−50) sits there. |
| **Roof of snowy pines** over the road at the fork | c-road (places.js), First Day Prime | BOOK | nature.js plants umbrella pines at ROAD end + pines on the E-tower slope (unchanged). |
| Aedificium stone = the mountain's own grey rock | con_000969 (H), claim_000047 (H) | BOOK | M.aed dressed grey, tinted toward the cliff rock; matches terrain rock tone. |
| Straw **strewn** on the scriptorium floor to muffle footsteps | places.js scriptorium; First Day | BOOK | M.straw now reads as scattered dry golden straw over grey stone flags (was a green mat). |
| Snow patchy, trodden near buildings; fog days 4–5 | brief; First Day (snow), Fourth Day (fog) | BOOK | ground.js features + terrain shader; sky.js fog/exposure. |
| Late-November cold, overcast, restrained winter sun | brief | AMBIENT/BOOK | sky.js winter sun colour/intensity; interiors darker with warm local fire pools. |

## Coordination notes (files I do not own)
- `nature.js` already plants umbrella/stone pines at `ROAD.length-9 .. -2` (the fork) and pines on the E-tower slope (x 84–118, z −86…−56). The re-routed ROAD keeps its end at the fork, so these still land correctly. Verified in aerial shots.
- `outbuildings.js` line 82 refuse `soil` plot `{x0:72,x1:98,z0:-74,z1:-50}`: the brief asks the arch-grounds agent to move it to ~x (east wall … wall+25), z −60…−20. ROAD_SPUR ends near (104,−52) and works with either placement.
- `main.js` `spawnOf` uses `ROAD[12]` and yaws toward the gate (−105,−8.6); ROAD[12] is still on the upper walkable stretch near the gate — verified spawn lands in the "road" zone at y≈0.
- `places.js` 'road' spawn text ("at the last bend the road splits in three… pines form a natural roof… sea to the south") matches the new geometry.
