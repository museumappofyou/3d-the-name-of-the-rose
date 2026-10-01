#!/usr/bin/env python3
"""Reviewed anchors for the phase-1 slice (shared/data/anchors.json).

Every anchor is derived from the browser builders through the section export
(shared/data/export/slice_export.report.json) or from plan constants, with
its source recorded. Route waypoints from the Agent B audit are kept as
verification references only, not as plan data.
    python3 scripts/migration/build_anchors.py
"""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
r = json.loads((ROOT / 'shared/data/export/slice_export.report.json').read_text())['result']
A = r['anchors']
plan = A['plan']
C = plan['CHURCH']
seat = A['alinardo.seatRoot']
path = A['ossuary.path']
d = [path[1][0] - path[0][0], path[1][1] - path[0][1]]
L = math.hypot(*d)
dirv = [d[0] / L, d[1] / L]
boundary_along = 2.2
bnd = [path[0][0] + dirv[0] * boundary_along, path[0][1] + dirv[1] * boundary_along]
top, tunnel = 0.35, -2.8
zTop, zBot = -13.44 - 0.55 - 0.1, C['zN'] - 6.0
doors = {x['id']: x for x in r['doors']}
probes = {f"{p['x']},{p['z']}": p for p in r['probes']}
anchors = {
    'schema_version': 1,
    'id': 'anchors',
    'coordinate_convention': r['coordinate_convention'],
    'source': {'export': 'shared/data/export/slice_export.report.json', 'builders': ['web/src/core/plan.js', 'web/src/world/church.js', 'web/src/world/claustrum.js', 'web/src/world/people/schedule.js', 'web/src/world/people.js']},
    'plan': plan,
    'anchors': {
        'cloister.porch': {**A['cloister.porch']},
        'cloister.porchBenchTop': {**A['cloister.porchBenchTop']},
        'alinardo.seatRoot': {**A['alinardo.seatRoot']},
        'alinardo.interact': {'x': seat['x'], 'y': seat['y'] + 1.1, 'z': seat['z'], 'source': 'main.js: Severinus/Alinardo interaction at rig position + 1.1 m'},
        'church.skullChapel': {'x': A['church.skullChapel'][0], 'z': A['church.skullChapel'][1], 'source': 'church.js ctx.anchors.church.skullChapel'},
        'church.choir': {'x': A['church.choir'][0], 'z': A['church.choir'][1], 'source': 'church.js ctx.anchors.church.choir'},
        'altar.hinge': {'x': A['altar.hinge'][0], 'y': A['altar.hinge'][1], 'z': A['altar.hinge'][2], 'source': 'church.js skullAltarPivot: group at (skull.x0, y0, skull.z1)'},
        'altar.interact': {'x': A['altar.interact']['pos'][0], 'y': A['altar.interact']['pos'][1], 'z': A['altar.interact']['pos'][2], 'radius': A['altar.interact']['radius'], 'source': 'church.js ctx.interact skull-altar'},
        'altar.collider': {**A['altar.collider'], 'source': 'church.js ctx.addDynamic(pivot, box(w, 1.05, d))'},
        'ossuary.stairTop': {'x': plan['SKULL_CHAPEL'], 'y': top, 'z': zTop, 'source': 'church.js ossuary(): zTop = skull.z1 − 0.1'},
        'ossuary.stairFoot': {'x': path[0][0], 'y': tunnel, 'z': path[0][1], 'source': 'church.js OSSUARY_PATH[0] = [SKULL_CHAPEL, zN − 6]'},
        'ossuary.chapelBottom': {'x': A['ossuary.chapelBottom'][0], 'y': tunnel, 'z': A['ossuary.chapelBottom'][1], 'source': 'church.js ctx.anchors.ossuary.chapelBottom; y = TUNNEL_Y'},
        'ossuary.path': {'points': path, 'source': 'church.js OSSUARY_PATH (only point 0 lies inside the phase-1 slice)'},
        'boundary.ossuary': {'x': bnd[0], 'y': tunnel, 'z': bnd[1], 'normal': dirv, 'along_from_stair_foot_m': boundary_along, 'label': 'Temporary phase-1 test boundary — the passage continues to the kitchen in the browser reference', 'source': 'phase-1 scope: 2.2 m along the passage from the stair foot, 1.3 m beyond ossuary.chapelBottom'},
        'door.church:cloister': {**doors['church:cloister'], 'source': 'church.js south door to the cloister (ctx.door)'},
        'chant.source': {'x': 35.44, 'y': 2.4, 'z': -5.46, 'source': 'soundscape.js: (xCross + xChoir)/2 + 1, 2.4, zc'},
        'fixture.origin': {'x': 200.0, 'y': 0.0, 'z': 200.0, 'source': 'phase-1 noncanonical fixture area (outside the abbey)'},
        'fixture.door': {'x': 200.0, 'y': 0.0, 'z': 201.0, 'nx': 0, 'nz': -1, 'w': 1.6, 'th': 0.7, 'source': 'fixture: door in the north wall of a 4.8 × 4.8 m room'},
    },
    'stair': {'steps': 12, 'top_y': top, 'bottom_y': tunnel, 'z_top': zTop, 'z_bottom': zBot, 'rise_m': (top - tunnel) / 12, 'run_m': (zTop - zBot) / 12, 'width_m': 1.2, 'collision': 'browser ramp collider (quad from top to foot), surface stoneWet', 'source': 'church.js ossuary()'},
    'doors_in_slice': r['doors'],
    'probes': r['probes'],
    'anchor_checks': [
        {'id': 'bench-contact', 'check': 'Godot collision ray at the porch slot returns the bench top; Alinardo seat root = bench top − 0.46', 'expect_y': A['cloister.porchBenchTop']['y'], 'at': [seat['x'], seat['z']], 'from_y': 1.07},
        {'id': 'cloister-walk-floor', 'check': 'cloister north walk floor', 'expect_y': probes['20,4.9']['y'], 'at': [20.0, 4.9], 'from_y': 1.5},
        {'id': 'skull-chapel-floor', 'check': 'church floor at the skull-chapel anchor', 'expect_y': probes['15.372,-12.24']['y'], 'at': [15.372, -12.24], 'from_y': 1.5},
        {'id': 'landing-floor', 'check': 'floor at ossuary.chapelBottom (first landing)', 'expect_y': probes['15.372,-20.64']['y'], 'at': [15.372, -20.64], 'from_y': -1.0},
        {'id': 'church-door-floor', 'check': 'church floor inside the cloister door', 'expect_y': probes['28.076,1.2']['y'], 'at': [28.076, 1.2], 'from_y': 1.5},
    ],
    'route_references': {
        'note': 'Agent B real-controller routes (docs/evidence/browser-baseline/reviews.json): verification references, not plan data',
        'cloister_approach': [[20, 0.30, 4.9], [28.08, 0.30, 4.4], [28.08, 0.35, 2.5], [28.08, 0.35, 0.5], [25, 0.35, -5.46]],
        'altar_route_start': [15.37, 0.35, -14.10],
    },
}
(ROOT / 'shared/data/anchors.json').write_text(json.dumps(anchors, indent=1) + '\n')
print('anchors', len(anchors['anchors']), 'boundary', [round(x, 3) for x in bnd], 'stair rise/run', round(anchors['stair']['rise_m'], 4), round(anchors['stair']['run_m'], 4))
