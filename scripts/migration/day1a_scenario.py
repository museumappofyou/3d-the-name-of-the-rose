#!/usr/bin/env python3
"""Author the Day-1A scenario overlay: shared/scenarios/day1a/day1a.json.

    python3 scripts/migration/day1a_scenario.py

Coordinates are world metres (+X east, +Z south) taken from the exported
Day-1A anchors (road polyline, gate, hospice stair/cell, doors) and the
phase-1 choir slots; every walkable leg was checked against plan captures of
the native world. People, lines and events are ORIGINAL GAME FICTION unless
marked; the cellarer appears only in his public function (claim_000142).
The output is reviewed data: build_content.py validates and publishes it.
"""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
W = json.loads((ROOT / 'shared/data/manifests/world_day1a_derivatives.json').read_text())
CROWD = json.loads((ROOT / 'shared/data/bench/crowd.json').read_text())
road = W['anchors']['road']
r = lambda i: [round(road[i][0], 2), round(road[i][1], 2)]

H1 = 6.2           # guest floor (claustrum.js hospice: boards top h1 + 0.3)
X0, X1, Z0, Z1 = -19.32, -13.02, 4.2, 23.52
CD = (Z1 - Z0) / 4
WZ = Z0 + 2.5 * CD   # William's cell centre z
SZ = Z0 + CD * 2 + 0.65

nodes = {
    # road (terrain.js ROAD): last bend under the pine roof, up to the gate
    'r22': r(22), 'r20': r(20), 'r18': r(18), 'r16': r(16), 'r14': r(14), 'r12': r(12), 'r10': r(10), 'r8': r(8), 'r6': r(6),
    'g_fore': [-111.6, -8.5], 'g_out': [-109.6, -8.6], 'g_mid': [-105.0, -8.6], 'g_in': [-100.4, -8.6],
    'g_court': [-96.0, -8.4], 'g_house': [-94.0, -5.2], 'g_chest': [-92.6, -4.75], 'g_wait': [-98.5, -6.6],
    # the avenue to the church (plan.js PATHS[0])
    'a1': [-88.0, -8.3], 'a2': [-75.0, -8.1], 'a3': [-62.0, -8.0], 'a4': [-49.0, -7.9], 'a5': [-38.0, -7.8], 'a6': [-28.35, -7.7], 'a7': [-21.0, -7.6], 'a_end': [-16.5, -7.6],
    # the flower garden (claustrum.js flowerGarden: alley entrances, round centre)
    'fg_n_out': [-28.35, 1.2], 'fg_n': [-28.35, 3.36], 'fg_na': [-28.35, 7.6], 'fg_rn': [-28.35, 11.05],
    'fg_re': [-26.62, 13.44], 'fg_rs': [-28.35, 15.85], 'fg_sa': [-28.35, 19.5], 'fg_s': [-28.35, 23.52], 'fg_s_out': [-28.35, 25.0],
    'fg_rw': [-30.08, 13.44], 'fg_wa': [-33.6, 13.44], 'fg_w': [-36.54, 13.44], 'fg_w_out': [-38.0, 13.44],
    's1': [-24.2, 25.05],
    # the outside stair of the pilgrims' hospice and William's cell
    'st_foot': [-20.32, 25.0, -0.2], 'st_mid': [-20.32, 19.7, 2.97], 'st_top': [-20.32, 15.35, H1], 'landing': [-20.3, 14.55, H1],
    'c_door': [-18.95, 14.55, H1], 'c_in': [-18.1, 15.05, H1], 'c_mid': [-16.9, 16.3, H1], 'c_niche': [-17.7, 16.75, H1],
    'c_stool': [-16.32, 16.2, H1], 'c_bed': [-14.6, 16.3, H1], 'c_east': [-14.2, 16.3, H1], 'c_chest': [-14.2, 17.4, H1],
    'c_wwin': [-18.6, 17.45, H1], 'c_tray': [-16.9, 15.3, H1],
    # south of the hospice, the passage to the lane, the cloister west doors
    'sp_w': [-17.2, 24.75], 'sp_e': [-12.35, 24.7], 'ln_s': [-12.35, 22.3], 'ln_16': [-12.35, 19.27], 'ln_8': [-12.35, 8.27],
    # the cloister west doors stand three steps above the lane (thresholds.js):
    # the lane's walking line passes west of the steps; one climbs them facing east
    'cd_16': [-9.6, 19.27], 'cd_8': [-9.6, 8.27],
    # cloister walks (claustrum.js: walk 3.6 m)
    'cw_16': [-8.6, 19.27], 'cw_8': [-8.6, 8.27], 'cw_nw': [-8.6, 5.5], 'cw_sw': [-8.6, 23.35], 'cw_w14': [-8.6, 13.39],
    'cw_n1': [2.0, 5.4], 'cw_n11': [10.63, 5.4], 'cw_n2': [14.0, 5.35], 'cw_n3': [22.0, 5.3], 'cw_ne': [28.3, 5.4],
    'cw_s1': [2.0, 23.35], 'cw_s9': [9.11, 23.35], 'cw_s2': [14.0, 23.35], 'cw_se': [28.3, 23.35], 'cw_e2': [28.3, 16.77], 'cw_e15': [28.3, 14.88], 'cw_e1': [28.3, 7.27],
    'cal_14': [30.9, 16.77], 'cal_4': [30.9, 7.27],
    # garth (the well) and its gaps
    # garth (claustrum.js: parapet gaps at the middle bay of each side; the well
    # at the garth centre; fruit trees on the cross paths at gcx ± 9)
    'gt_w': [-5.7, 13.39], 'gt_w2': [0.87, 12.5], 'gt_n': [10.63, 7.9], 'gt_s': [9.11, 20.4], 'gt_e': [25.4, 14.88], 'gt_e2': [18.87, 12.5],
    'gt_wn': [9.87, 11.7], 'gt_ws': [9.87, 16.6], 'gt_ww': [7.4, 14.135], 'gt_we': [12.35, 14.135], 'gt_well': [8.15, 12.95],
    # church: cloister door, nave, the guests' place, crossing, choir, north door
    'ch_out': [28.08, 4.25], 'ch_in': [28.08, 0.9], 'nv_s': [25.0, -2.6], 'nv_c': [25.0, -5.46], 'nv_w': [10.0, -5.46], 'nv_ww': [-6.0, -5.46],
    'guests': [23.4, -2.2], 'tr_s1': [27.6, -3.7], 'tr_s2': [29.6, -3.7], 'ch_choir': [30.6, -5.46], 'lect_s': [34.45, -4.3], 'ch_lect': [35.3, -5.46], 'ch_lamp1': [37.4, -5.46], 'ch_lamp2': [40.5, -5.46], 'row_n': [30.95, -7.52, 0.55], 'row_s': [30.95, -3.4, 0.55],
    'wd_in': [-11.6, -6.58], 'wd_out': [-14.6, -6.58], 'wd_w': [-19.4, -6.6], 'wd_nw': [-19.6, -15.6], 'aed_path': [-4.0, -22.5], 'aed_path2': [6.3, -29.4],
}
# choir stalls: the phase-1 choir slots' front rows (north z -7.69 facing south,
# south z -3.23 facing north); anonymous brothers and named monks take these
# the standing strip between the seats and the desks (church.js stalls:
# row 0 at zc ∓ 2.45, desks 0.66 m toward the aisle), entered from the west end
north_row = sorted({(round(s['x'], 2), -7.52) for s in CROWD['slots'] if abs(s['z'] + 7.69) < 0.01})
south_row = sorted({(round(s['x'], 2), -3.4) for s in CROWD['slots'] if abs(s['z'] + 3.23) < 0.01})
for i, (x, z) in enumerate(north_row):
    nodes[f'stall_n{i}'] = [x, z, 0.55]
for i, (x, z) in enumerate(south_row):
    nodes[f'stall_s{i}'] = [x, z, 0.55]

chain = lambda *ids: [[ids[i], ids[i + 1]] for i in range(len(ids) - 1)]
edges = []
edges += chain('r22', 'r20', 'r18', 'r16', 'r14', 'r12', 'r10', 'r8', 'r6', 'g_fore', 'g_out', 'g_mid', 'g_in', 'g_court', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a_end')
edges += chain('g_court', 'g_wait', 'g_house', 'g_chest') + [['g_in', 'g_wait'], ['g_court', 'g_house'], ['a1', 'g_house']]
edges += chain('a6', 'fg_n_out', 'fg_n', 'fg_na', 'fg_rn', 'fg_re', 'fg_rs', 'fg_sa', 'fg_s', 'fg_s_out', 's1', 'st_foot', 'st_mid', 'st_top', 'landing', 'c_door', 'c_in', 'c_mid')
edges += [['a5', 'fg_n_out'], ['a7', 'fg_n_out'], ['fg_rn', 'fg_rw'], ['fg_rw', 'fg_rs'], ['fg_rw', 'fg_wa'], ['fg_wa', 'fg_w'], ['fg_w', 'fg_w_out']]
edges += [['c_mid', x] for x in ('c_niche', 'c_stool', 'c_bed', 'c_east', 'c_chest', 'c_wwin', 'c_tray')] + [['c_in', 'c_niche'], ['c_in', 'c_tray']]
edges += chain('st_foot', 'sp_w', 'sp_e', 'ln_s', 'ln_16', 'ln_8') + [['s1', 'sp_w']]
edges += [['ln_16', 'cd_16'], ['cd_16', 'cw_16'], ['ln_8', 'cd_8'], ['cd_8', 'cw_8']]
edges += chain('cw_nw', 'cw_8', 'cw_w14', 'cw_16', 'cw_sw') + chain('cw_nw', 'cw_n1', 'cw_n11', 'cw_n2', 'cw_n3', 'cw_ne', 'cw_e1', 'cw_e15', 'cw_e2', 'cw_se') + chain('cw_sw', 'cw_s1', 'cw_s9', 'cw_s2', 'cw_se')
edges += [['cw_e2', 'cal_14'], ['cw_e1', 'cal_4'], ['cw_w14', 'gt_w'], ['gt_w', 'gt_w2'], ['gt_w2', 'gt_ww'], ['gt_e', 'gt_e2'], ['gt_e2', 'gt_we'], ['gt_e', 'cw_e15'], ['gt_n', 'gt_wn'], ['gt_s', 'gt_ws'], ['gt_n', 'cw_n11'], ['gt_s', 'cw_s9'],
          ['gt_wn', 'gt_we'], ['gt_we', 'gt_ws'], ['gt_ws', 'gt_ww'], ['gt_ww', 'gt_wn'], ['gt_well', 'gt_ww'], ['gt_well', 'gt_wn']]
edges += chain('cw_n3', 'ch_out', 'ch_in', 'tr_s1', 'tr_s2', 'ch_choir', 'lect_s', 'ch_lect', 'ch_lamp1', 'ch_lamp2') + [['cw_ne', 'ch_out'], ['nv_s', 'tr_s1'], ['nv_s', 'guests'], ['nv_s', 'nv_c'], ['nv_c', 'nv_w'], ['nv_w', 'nv_ww'], ['nv_ww', 'wd_in'], ['wd_in', 'wd_out'], ['wd_out', 'a_end'], ['wd_out', 'wd_w'], ['wd_w', 'wd_nw'], ['wd_nw', 'aed_path'], ['aed_path', 'aed_path2']]
# the stalls are entered from the west end of each row and walked along
# behind the desks (the desks stand between the aisle and the stalls)
edges += [['ch_choir', 'row_n'], ['ch_choir', 'row_s'], ['row_n', 'stall_n0'], ['row_s', 'stall_s0']]
for i in range(1, len(north_row)):
    edges += [[f'stall_n{i - 1}', f'stall_n{i}']]
for i in range(1, len(south_row)):
    edges += [[f'stall_s{i - 1}', f'stall_s{i}']]

# William's look points: authored things worth stopping for (stand, look-at)
look_points = [
    {'id': 'lp_valley', 'route': 'road', 'stand': [-112.6, 41.0], 'at': [-170.0, -45.0, 70.0], 'dwell': 3.0, 'pose': 'look', 'note': 'the mountain falling away to the valley (west)'},
    {'id': 'lp_trunk', 'route': 'road', 'stand': [-116.6, 30.0], 'at': [-121.0, 2.2, 28.6], 'dwell': 2.4, 'pose': 'look', 'note': 'a stone pine trunk, its bark, the snow on its roots'},
    {'id': 'lp_wall', 'route': 'road', 'stand': [-117.9, 15.0], 'at': [-100.0, 3.0, 18.0], 'dwell': 2.6, 'pose': 'fold', 'note': 'the enclosure wall: its height, its coursing'},
    {'id': 'lp_tower', 'route': 'road', 'stand': [-117.2, 2.0], 'at': [-105.0, 8.0, -8.6], 'dwell': 2.6, 'pose': 'look', 'note': 'the gate tower, first seen whole'},
    {'id': 'lp_avenue_tree', 'route': 'reception', 'stand': [-70.0, -9.4], 'at': [-70.4, 3.0, -11.6], 'dwell': 2.0, 'pose': 'look', 'note': 'a bare elm of the avenue'},
    {'id': 'lp_church_front', 'route': 'reception', 'stand': [-33.0, -7.2], 'at': [-13.0, 8.0, -5.5], 'dwell': 2.4, 'pose': 'look', 'note': 'the church west front at the end of the avenue'},
    {'id': 'lp_garden_column', 'route': 'reception', 'stand': [-28.0, 9.4], 'at': [-28.35, 0.8, 13.44], 'dwell': 2.0, 'pose': 'look', 'note': 'the column at the round centre of the garden'},
    {'id': 'lp_stair', 'route': 'reception', 'stand': [-22.3, 25.2], 'at': [-20.32, 5.0, 16.0], 'dwell': 2.0, 'pose': 'look', 'note': 'the outside stair climbing the hospice wall'},
]

people = {
    'william': {'name': 'William', 'description': 'William', 'known_at_start': True, 'template': 'monk_c', 'seed': 7101, 'hood': 'down', 'habit': 'franciscan', 'height_note': 'tall and narrow (cast monk_c), re-dressed in undyed Franciscan grey-brown',
                'class': 'SOURCE character; Day-1 behaviour ORIGINAL GAME FICTION (CANON CHECK)', 'speed': 1.72, 'motion': 'brother'},
    'fazio': {'name': 'Fazio', 'description': 'The porter', 'template': 'lay_herd', 'seed': 7201, 'class': 'ORIGINAL GAME FICTION (CANON CHECK against the reception party)', 'speed': 1.15, 'motion': 'lay', 'cap': 'hood'},
    'cellarer': {'name': 'The cellarer', 'description': 'A brisk monk', 'template': 'monk_e', 'seed': 7301, 'hood': 'down', 'class': 'SOURCE in public function only (claim_000142); no invented traits', 'speed': 1.55, 'motion': 'brother'},
    'tebaldo': {'name': 'Brother Tebaldo', 'description': 'A round monk with keys', 'template': 'monk_b', 'seed': 7401, 'hood': 'down', 'class': 'ORIGINAL GAME FICTION', 'speed': 1.62, 'motion': 'brother', 'gait': 'quick'},
    'nuto': {'name': 'Nuto', 'description': 'An old servant', 'template': 'lay_old', 'seed': 7501, 'class': 'ORIGINAL GAME FICTION', 'speed': 0.95, 'motion': 'lay', 'gait': 'limp'},
    'fulco': {'name': 'Fulco', 'description': 'A young novice', 'template': 'novice_a', 'seed': 7601, 'hood': 'down', 'class': 'ORIGINAL GAME FICTION', 'speed': 1.35, 'motion': 'brother'},
    'rainaldo': {'name': 'Brother Rainaldo', 'description': 'A tall monk with a book', 'template': 'scribe_a', 'seed': 7701, 'hood': 'down', 'class': 'ORIGINAL GAME FICTION (CANON CHECK: no canonical choir official displaced)', 'speed': 1.2, 'motion': 'brother'},
}
# the community as a body: never named, never saved as identities
templates = ['monk_a', 'monk_d', 'monk_g', 'novice_b']
readers = [
    # cloister readers before Nones: [x, z, ry, pose]  (walk centre lines)
    [-8.2, 11.2, math.pi / 2, 'read'], [-8.9, 21.0, math.pi / 2, 'read'], [4.5, 23.6, math.pi, 'read'], [11.0, 23.7, 0.0, 'stand'],
    [19.5, 23.5, math.pi, 'read'], [27.9, 19.5, -math.pi / 2, 'read'], [27.9, 10.5, -math.pi / 2, 'read'], [17.0, 5.2, 0.0, 'read'],
    [6.0, 5.6, 0.0, 'read'], [-3.0, 5.3, math.pi, 'stand'],
]
anonymous = []
for i, (x, z, ry, pose) in enumerate(readers):
    anonymous.append({'id': f'brother:{i + 1:02d}', 'template': templates[i % len(templates)], 'seed': 8100 + i * 17, 'hood': 'up' if i % 3 else 'down',
                      'spot': [x, z], 'ry': round(ry, 4), 'pose': pose, 'stall': (f'stall_n{i // 2}' if i % 2 == 0 else f'stall_s{i // 2}')})
sext_leavers = [{'id': f'brother:s{i + 1}', 'template': templates[(i + 1) % len(templates)], 'seed': 8600 + i * 13, 'hood': 'up'} for i in range(6)]

lines = {
    # William (about 40 lines in all; restrained; behaviour first)
    'w_overtake': {'s': 'william', 't': "Go on, then. You've younger knees."},
    'w_share_valley': {'s': 'william', 't': "The whole valley's under us. You can feel it in your ears."},
    'w_share_generic': {'s': 'william', 't': 'Hm. Yes. Worth stopping for.'},
    'w_wall': {'s': 'william', 't': 'Good dry walling. Someone here pays masons, and pays them on time.'},
    'w_sext_1': {'s': 'william', 't': 'Midday office. We have timed it badly.'},
    'w_sext_2': {'s': 'william', 't': 'No one will come to the gate while they sing.'},
    'w_hinges': {'s': 'william', 't': 'New pins in old hinges. They mind their gate.'},
    'w_hungry': {'s': 'william', 't': "They'll feed us after. Monks always feed guests after. Pray it's hot."},
    'w_cold': {'s': 'william', 't': 'My feet stopped speaking to me somewhere below the last bend.'},
    'w_bar_1': {'s': 'william', 't': "This bar's been dropped every evening for longer than anyone here has been alive."},
    'w_bar_2': {'s': 'william', 't': 'You can learn a house from its hinges.'},
    'w_reveal_1': {'s': 'william', 't': 'Well.'},
    'w_reveal_2': {'s': 'william', 't': "They didn't build that to keep the rain off."},
    'w_greet': {'s': 'william', 't': 'William, of Baskerville. And Adso, who carries what I forget.'},
    'w_ask_house': {'s': 'william', 't': 'And the great house there — where would a guest go in?'},
    'w_fallen': {'s': 'william', 't': 'Ah. Of course.'},
    'w_bedding_first': {'s': 'william', 't': 'Adso — the bedding before the sights.'},
    'w_take_bedding': {'s': 'william', 't': 'Bring the bedding, Adso. The chest can wait for you.'},
    'w_straw': {'s': 'william', 't': "A bed fit for a bishop's horse."},
    'w_chest': {'s': 'william', 't': "There's a chest still at the gate, and I'd like to see my ink again before night."},
    'w_chest_back': {'s': 'william', 't': 'Good. By the bed, where I can kick it in the dark.'},
    'w_wet': {'s': 'william', 't': 'I am wet to the knee. Half the mountain came up the road in my boots.'},
    'w_meal_sit': {'s': 'william', 't': 'Sit. Eat while it is warm, before Brother Tebaldo remembers a third rule.'},
    'w_meal_olives': {'s': 'william', 't': 'Their olives are better than their welcome.'},
    'w_meal_wine': {'s': 'william', 't': 'Thank you. Half that — the rest is for you.'},
    'w_meal_cheese': {'s': 'william', 't': 'Mountain cheese. It has been somewhere cold and thought about things.'},
    'w_meal_bread': {'s': 'william', 't': 'Still warm. Someone in this house knows what an oven is for.'},
    'w_meal_skip': {'s': 'william', 't': 'If you will not eat it, I will. I have no shame left after that road.'},
    'w_hose': {'s': 'william', 't': "Here — wring these out, would you, and lay them on the sill. They're more river than wool."},
    'w_hose_done': {'s': 'william', 't': 'Better. Now they can drip on the abbey instead of on me.'},
    'w_bread_cold': {'s': 'william', 't': "Your bread's going cold."},
    'w_question': {'s': 'william', 't': 'Well. What have you seen so far?'},
    'w_a_gate_bar': {'s': 'william', 't': 'Worn deep? Then it is lifted every morning and dropped every night, and has been for a long time. A house that keeps hours.'},
    'w_a_windows': {'s': 'william', 't': 'Three rows. Someone wanted a great deal of light in that house.'},
    'w_a_porter': {'s': 'william', 't': 'Did he? I was looking at his gate. You looked at the man. That is the better half of it.'},
    'w_a_shoe': {'s': 'william', 't': 'Is it? Then he noticed before we did. Remember that about him.'},
    'w_a_crown': {'s': 'william', 't': 'It sits on the church like a hat on a tall man. I saw it too.'},
    'w_a_garden': {'s': 'william', 't': 'Asleep under the snow. Someone will be cross with the frost in March.'},
    'w_a_valley': {'s': 'william', 't': 'It does go down. Everything here is uphill of everything else.'},
    'w_a_pines': {'s': 'william', 't': "Pines under snow. You'll smell them in your sleep tonight."},
    'w_a_nothing': {'s': 'william', 't': 'Nothing much? Then you were cold. Look again after you have eaten.'},
    'w_leave_1': {'s': 'william', 't': 'The Abbot. Of course. And my boots still wet.'},
    'w_leave_2': {'s': 'william', 't': "Unpack. Find out where we may and may not go. Don't let anyone frighten you about either."},
    # the porter
    'fz_wait': {'s': 'fazio', 't': 'Wait.'},
    'fz_shoe': {'s': 'fazio', 't': 'Shoe.'},
    'fz_smith': {'s': 'fazio', 't': 'Smith tomorrow.'},
    'fz_not_yet': {'s': 'fazio', 't': 'Not yet, boy.'},
    'fz_hold': {'s': 'fazio', 't': 'Hold him.'},
    # the cellarer (public function only)
    'ce_greet': {'s': 'cellarer', 't': 'Brother William. You are expected. The Abbot will receive you after the meal.'},
    'ce_office': {'s': 'cellarer', 't': "I am the cellarer of this house. Your cells are ready in the pilgrims' house. Come."},
    'ce_fazio': {'s': 'cellarer', 't': 'Fazio will see to your animals.'},
    'ce_refuse_1': {'s': 'cellarer', 't': 'Guests are taken up when they are invited.'},
    'ce_refuse_2': {'s': 'cellarer', 't': 'The upper floors are not for visitors. And after supper the whole building is barred.'},
    'ce_cell': {'s': 'cellarer', 't': 'Brother Tebaldo keeps the guest house. He will see to you.'},
    'ce_leave': {'s': 'cellarer', 't': 'God keep you.'},
    # Tebaldo
    'te_arrive_1': {'s': 'tebaldo', 't': 'Forgive me — forgive me, the office ran long, and then the cellarer wanted —'},
    'te_name': {'s': 'tebaldo', 't': 'Tebaldo. Brother Tebaldo. The guest house is mine, God help me.'},
    'te_arrive_2': {'s': 'tebaldo', 't': "Bread, cheese, olives. Wine. And raisins — the good ones, Brother, from the cellarer's own store."},
    'te_rule_1': {'s': 'tebaldo', 't': "Guests use the cloister's west door, and the church's door from the cloister, by daylight — not the great door —"},
    'te_rule_2': {'s': 'tebaldo', 't': '— and in church you stand behind the brothers, by the second pillar on the right, and speak to no one unless he speaks to you first, and —'},
    'te_sorry': {'s': 'tebaldo', 't': 'Forgive me. I will come back. I always come back.'},
    'te_call_nuto': {'s': 'tebaldo', 't': 'Nuto! The guests’ water, as I said!'},
    'te_busy_1': {'s': 'tebaldo', 't': 'Not now, boy — the candles — forgive me.'},
    'te_busy_2': {'s': 'tebaldo', 't': 'More blankets since Michaelmas, I asked. Blankets! In a house this size.'},
    'te_busy_3': {'s': 'tebaldo', 't': "Walk, boy, don't run. The brothers are reading."},
    'te_bell': {'s': 'tebaldo', 't': 'The bell — forgive me —'},
    # Nuto
    'nu_well': {'s': 'nuto', 't': 'Ice on the bucket again. My knee told me so this morning.'},
    'nu_help': {'s': 'nuto', 't': "If you like. Mind it, it's full."},
    'nu_walk_1': {'s': 'nuto', 't': 'The knee knows the snow before the sky does.'},
    'nu_walk_2': {'s': 'nuto', 't': 'That stair is the worst of it. When it ices I go up it like an old dog.'},
    'nu_walk_3': {'s': 'nuto', 't': "My girl's down the valley. Three little ones. The middle one bites."},
    'nu_name': {'s': 'nuto', 't': 'Nuto. Guests’ house. Water, wood, straw — whatever goes up that stair.'},
    'nu_done': {'s': 'nuto', 't': "There. You've a back on you, for a little brother."},
    'nu_bell': {'s': 'nuto', 't': '… and there they go.'},
    'nu_busy': {'s': 'nuto', 't': 'Mm.'},
    'nu_abbot': {'s': 'nuto', 't': 'The Abbot will see Brother William.'},
    # Fulco
    'fu_psalm': {'s': 'fulco', 't': '… qui habitat in adiutorio Altissimi … in … in …'},
    'fu_notice': {'s': 'fulco', 't': "You're the guest's boy. — I'm not supposed to talk to you."},
    'fu_city': {'s': 'fulco', 't': 'Is it true you come from beyond the mountains? Do the cities really never go quiet?'},
    'fu_loud': {'s': 'fulco', 't': 'Never? Not even at night? I would never sleep. I would never want to.'},
    'fu_dogs': {'s': 'fulco', 't': 'More dogs than people! Here we have more bells than people.'},
    'fu_raisins': {'s': 'fulco', 't': "From the guests' tray? You'll get me whipped. — Thank you."},
    'fu_verse': {'s': 'fulco', 't': 'Commorabitur! That is the one that runs away from me. Thank you.'},
    'fu_joke': {'s': 'fulco', 't': "Brother Tebaldo counts the guests' blankets twice a day. Lose one and he'll pray for you by name."},
    'fu_name': {'s': 'fulco', 't': 'Fulco. Novice. Very novice.'},
    'fu_rainaldo': {'s': 'fulco', 't': "That's Brother Rainaldo. He does the choir books. Don't touch them."},
    'fu_bell': {'s': 'fulco', 't': "— the bell! I'm late. I'm always late —"},
    # Rainaldo
    'ra_name': {'s': 'rainaldo', 't': 'Rainaldo. I keep the choir books — the ones that come down for the offices.'},
    'ra_book': {'s': 'rainaldo', 't': 'I bring only what the choir needs. Books do not go visiting.'},
    'ra_lamps': {'s': 'rainaldo', 't': 'Before every office. The candles get thinner every winter.'},
    # Adso (spoken choices)
    'ad_cities_loud': {'s': 'adso', 't': "They're loud. Bells, carts, everybody shouting."},
    'ad_cities_dogs': {'s': 'adso', 't': 'Some are. Ours had more dogs than people.'},
    'ad_raisins': {'s': 'adso', 't': 'Here — raisins.'},
    'ad_verse': {'s': 'adso', 't': '… in protectione Dei caeli commorabitur.'},
    'ad_name': {'s': 'adso', 't': "I'm Adso."},
    'ad_help_nuto': {'s': 'adso', 't': "I'll take one."},
}
# what Adso can answer at the meal: observation -> (choice text, William's reply)
observations = {
    'gate_bar': {'text': 'The gate bar is worn deep.', 'reply': 'w_a_gate_bar', 'rank': 1},
    'aed_windows': {'text': 'The great building has three rows of windows.', 'reply': 'w_a_windows', 'rank': 2},
    'porter_scar': {'text': 'The porter has an old scar across his hand.', 'reply': 'w_a_porter', 'rank': 3},
    'mule_shoe': {'text': 'My mule has a loose shoe.', 'reply': 'w_a_shoe', 'rank': 4},
    'crown': {'text': 'From our window the great building stands over the church.', 'reply': 'w_a_crown', 'rank': 5},
    'garden': {'text': 'The flower garden is asleep under the snow.', 'reply': 'w_a_garden', 'rank': 6},
    'valley': {'text': 'The valley, from the road. It goes down forever.', 'reply': 'w_a_valley', 'rank': 7},
    'pines': {'text': 'The pines over the road.', 'reply': 'w_a_pines', 'rank': 8},
    'gate_hinges': {'text': 'The gate has new pins in old hinges.', 'reply': 'w_a_gate_bar', 'rank': 9},
    'straw': {'text': 'My bed is a wall full of straw.', 'reply': 'w_straw', 'rank': 10},
}
# observation triggers: a look held at a point (angle, distance, dwell)
watch = {
    'valley': {'at': [-170.0, -45.0, 60.0], 'angle_deg': 20, 'max_m': 400, 'dwell': 2.2, 'region': 'road'},
    'aed_windows': {'at': [42.0, 14.0, -66.0], 'angle_deg': 11, 'max_m': 260, 'dwell': 2.2, 'region': 'inside'},
    'gate_hinges': {'at': [-102.75, 1.7, -10.3], 'angle_deg': 16, 'max_m': 6, 'dwell': 1.6, 'region': 'any'},
    'gate_bar': {'at': [-101.15, 1.0, -11.3], 'angle_deg': 18, 'max_m': 5, 'dwell': 1.4, 'region': 'any'},
    'garden': {'at': [-28.35, 0.8, 13.44], 'angle_deg': 16, 'max_m': 16, 'dwell': 1.8, 'region': 'any'},
    'crown': {'at': [42.0, 22.0, -66.0], 'angle_deg': 14, 'max_m': 200, 'dwell': 1.8, 'region': 'cell'},
}
walk_limits = [
    # the road shelf from the last bend to the gate (pine trunks at ~4 m)
    {'id': 'road', 'poly': [[-104.0, 52.0], [-109.6, 54.4], [-116.6, 44.6], [-120.6, 34.6], [-122.8, 21.0], [-122.6, 6.0], [-120.0, -4.0], [-116.0, -11.6], [-108.6, -13.6], [-108.4, -3.6], [-113.4, -3.8], [-115.6, 0.0], [-114.6, 14.0], [-114.8, 28.0], [-111.6, 38.0], [-104.0, 47.0]]},
    # the gate passage and the court, the avenue, the turn, the garden and the hospice side
    {'id': 'inside', 'poly': [[-108.6, -10.3], [-101.0, -10.3], [-99.0, -13.0], [-86.0, -13.4], [-60.0, -12.6], [-20.0, -12.4], [-13.4, -12.6], [-13.4, 2.4], [-13.2, 2.9], [-10.6, 2.9], [-10.6, 25.4], [-14.4, 25.4], [-14.4, 26.4], [-38.8, 26.4], [-38.8, 1.6], [-60.0, -3.4], [-86.0, -3.4], [-86.0, 5.4], [-101.6, 5.4], [-101.6, -6.9], [-108.6, -6.9]]},
    # the cloister (walks and garth), entered by its west doors
    {'id': 'cloister', 'poly': [[-11.0, 7.3], [-10.2, 7.3], [-10.2, 3.8], [30.4, 3.8], [30.4, 25.4], [-10.2, 25.4], [-10.2, 20.2], [-11.0, 20.2], [-11.0, 18.3], [-10.2, 18.3], [-10.2, 9.2], [-11.0, 9.2]]},
    # the church: nave, aisles, crossing and choir (not the sanctuary beyond the altar step)
    {'id': 'church', 'poly': [[27.3, 4.2], [28.9, 4.2], [28.9, 2.4], [30.6, 2.4], [30.6, -1.2], [41.6, -1.2], [41.6, -9.6], [30.6, -9.6], [30.6, -15.3], [-12.6, -15.3], [-12.6, 2.4], [27.3, 2.4]]},
    # the hospice upper floor: the landing and William's cell
    {'id': 'cell', 'poly': [[-21.0, 13.9], [-19.4, 13.9], [-19.4, 13.95], [-13.4, 13.95], [-13.4, 18.6], [-19.4, 18.6], [-19.4, 15.2], [-21.0, 15.2]], 'y_min': 5.0},
    {'id': 'stair', 'poly': [[-21.0, 13.9], [-19.65, 13.9], [-19.65, 25.4], [-21.0, 25.4]]},
]
# the lines that speak a name teach it to Adso when they are presented
# (never when merely queued)
TEACHES = {'ce_office': 'cellarer', 'ce_fazio': 'fazio', 'ce_cell': 'tebaldo', 'te_name': 'tebaldo', 'te_call_nuto': 'nuto', 'nu_name': 'nuto', 'fu_name': 'fulco', 'fu_rainaldo': 'rainaldo', 'ra_name': 'rainaldo'}
for _lid, _who in TEACHES.items():
    lines[_lid]['teaches'] = [_who]

doc = {
    'schema_version': 1,
    'id': 'day1a', 'version': 1,
    'title': 'Day 1, first half: the road, the gate, the guest house, the meal, Nones',
    'continuity': 'novel-derived episode; late November; Day 1 from ~11:30 to just after Nones',
    'spoiler_level': 'opening only (no protected events; the Abbot’s audience happens offstage)',
    'design': 'story-council/day-1/OPUS_DAY1_DESIGN.md S1–S5, reduced S8, Nones (Day-1A scope)',
    'classification': {'people': 'see people[].class', 'lines': 'ORIGINAL GAME FICTION (new, illustrative; subject to canon and forward-spoiler review)', 'routes': 'RECONSTRUCTION (browser plan/builders)', 'times': 'RECONSTRUCTION (horarium.json convention)'},
    'start': {'hours': 11.5, 'node': 'r22'},
    'gate': {'hinges_stand': [-105.0, -8.6], 'hinges_at': [-102.75, 1.7, -10.3], 'porter_start': [-101.0, -8.2], 'bar_stand': [-100.9, -9.8], 'bar_at': [-101.15, 1.0, -11.3],
             'leaves_x': -102.7, 'jambs_z': [-10.4, -6.8], 'leaf_w': 1.8, 'leaf_h': 5.0, 'leaf_t': 0.14, 'swing': 'into the passage (-x), clear of the arch reveals', 'bar_x': -102.5, 'bar_y': 1.15,
             'reveal_stand': [-97.4, -10.4], 'reveal_at': [42.0, 18.0, -66.0],
             'note': 'browser outbuildings.js gate tower: leaves 0.14 x 5.0 x 1.8 m at x = gx + td/2 - 0.9; the browser shows them standing open, the Day-1A overlay hinges them at the jambs (RECONSTRUCTION, scenario state)'},
    'speeds': {'adso_walk': 1.6, 'adso_run': 3.0, 'adso_carry': 1.35, 'adso_carry_run': 2.2, 'chest_walk': 1.2, 'chest_run': 1.8},
    'lead': {'wait_gap': 12.0, 'resume_gap': 5.0, 'follow_gap': 4.0, 'min_dwell': 2.2, 'speed': 1.72, 'look_ahead': 14.0, 'share_after': 22.0, 'share_back': 2.6, 'cooldown_m': 25.0},
    'clock': {'free_minutes_per_real_minute': 12.5, 'sit_wait_factor': 6.0, 'nones_minutes_per_real_minute': 7.0},
    'free_period_min_s': 300.0,
    'people': people,
    'anonymous': anonymous,
    'sext_leavers': sext_leavers,
    'nodes': nodes,
    'edges': edges,
    'look_points': look_points,
    'routes': {
        'road': ['r22', 'r20', 'r18', 'r16', 'r14', 'r12', 'r10', 'r8', 'r6', 'g_fore'],
        'reception': ['g_court', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'fg_n_out', 'fg_n', 'fg_na', 'fg_rn', 'fg_re', 'fg_rs', 'fg_sa', 'fg_s', 'fg_s_out', 's1', 'st_foot', 'st_mid', 'st_top', 'landing', 'c_door', 'c_in', 'c_mid'],
        'solo': ['c_mid', 'c_in', 'c_door', 'landing', 'st_top', 'st_mid', 'st_foot', 's1', 'fg_s_out', 'fg_s', 'fg_sa', 'fg_rs', 'fg_re', 'fg_rn', 'fg_na', 'fg_n', 'fg_n_out', 'a6', 'a5', 'a4', 'a3', 'a2', 'a1', 'g_court', 'g_house', 'g_chest'],
    },
    'zones': {
        # route-learning zones for telemetry (hesitation / wrong turns on the solo return)
        'off_route': [
            {'id': 'church_front', 'box': [-23.5, -14.0, -12.0, -2.4]},  # incl. the forecourt before the (closed) west doors
            {'id': 'lane', 'box': [-13.0, -2.4, -10.0, 24.0]},
            {'id': 'garden_west', 'box': [-38.8, 2.0, -31.0, 26.4]},
            {'id': 'gatehouse_back', 'box': [-101.6, -3.0, -86.0, 5.4]},
            {'id': 'avenue_north', 'box': [-90.0, -13.4, -20.0, -11.0]},
        ],
    },
    'walk_limits': walk_limits,
    'observations': observations,
    'watch': watch,
    'lines': lines,
    'bells': {'sext': {'strokes': 7, 'interval_s': 3.3}, 'nones': {'strokes': 6, 'interval_s': 3.3}},
    'doors': {
        'closed': ['church:westN', 'church:westS', 'church:north', 'church:sacristy-south', 'church:choir-sacristy', 'church:belltower', 'calefactory:west4.5', 'calefactory:west14',
                   'dormitory:north', 'dormitory:south', 'dormitory:passage-east', 'chapter:outer', 'chapter:old-portal', 'abbot:south', 'hospice:west', 'gatehouse:N55'],
        'open': ['church:cloister', 'cloister:west5.5', 'cloister:west16.5', 'hospice:upper'],
        'actors_pass': ['calefactory:west4.5', 'calefactory:west14', 'church:westN'],
        'cell_partitions': [[-17.77, 6.2, 13.86], [-17.77, 6.2, 18.69]],
        'note': 'Day 1: closed by custom and by people, as doors (no invisible walls); guests use the cloister west doors and the church door from the cloister (Tebaldo\u2019s rule)',
    },
    'sealed': [{'door': 'postern', 'why': 'spoiler policy: the reconstructed hidden wicket (plan.js POSTERN, F5) is not part of public Day 1; the opening is filled with wall'}],
    'table_food_box': [-16.95, 6.9, 15.1, -15.55, 7.45, 16.05],
    'props': {
        'bedding': {'start': [-97.6, -0.2, -6.4], 'carry': 'bundle', 'place': [-18.45, 7.2, 16.7]},
        'chest': {'start': [-92.6, -0.2, -4.75], 'carry': 'chest', 'place': [-14.25, 6.2, 17.45]},
        'satchel': {'owner': 'william'},
    },
}
out = ROOT / 'shared/scenarios/day1a/day1a.json'
out.write_text(json.dumps(doc, indent=1, ensure_ascii=False) + '\n')
nl = {k: sum(1 for v in lines.values() if v['s'] == k) for k in set(v['s'] for v in lines.values())}
print('nodes', len(nodes), 'edges', len(edges), 'lines', len(lines), nl)
