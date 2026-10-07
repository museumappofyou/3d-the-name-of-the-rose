#!/usr/bin/env python3
"""Gait metrics from the day1-gait scenario's per-frame rows.

    python3 scripts/migration/day1a_gait_metrics.py 'builds/day1a-gait/gait/rows_*_*.csv'
    python3 scripts/migration/day1a_gait_metrics.py 'docs/evidence/day1a/correction/gait/rows_*.csv.gz'

Each CSV (written by native/scripts/bench/day1a_runner.gd, day1-gait) holds,
per rendered frame, the walker's body x and both feet's world positions and
knee flexion. Only the steady middle of the 9 m line is used.

  * slide: a foot is planted while it is low (within 4 cm of its lowest) and
    moving backward relative to the body; its net world displacement over each
    planted span divided by the span's duration (0 = planted; the walking
    speed = gliding). Net displacement, not per-frame speed: the body moves on
    60 Hz physics ticks while frames render faster, so per-frame foot speeds
    alias.
  * cadence: each foot's lowest moments, one per step.
  * knee: flexion = angle between thigh and shin (0 = straight).
  * swing clearance: the foot's lowest height above its planted level while it
    swings forward.
"""
import csv
import glob
import gzip
import json
import statistics
import sys


def metrics(path):
    f = gzip.open(path, 'rt') if path.endswith('.gz') else open(path)
    rows = [list(map(float, r)) for r in list(csv.reader(f))[1:]]
    xs = [r[1] for r in rows]
    x0, x1 = min(xs) + 1.5, max(xs) - 1.5
    mid = [r for r in rows if x0 < r[1] < x1]
    T = mid[-1][0] - mid[0][0]
    v = (mid[-1][1] - mid[0][1]) / T
    slides, knees, clear, steps = [], [], [], 0
    for o in (2, 6):  # foot_l x, foot_r x (y, z, knee follow)
        ymin = min(r[o + 1] for r in mid)
        seg = []
        for i in range(4, len(mid)):
            a, b = mid[i - 4], mid[i]
            relv = ((b[o] - b[1]) - (a[o] - a[1])) / (b[0] - a[0])
            if b[o + 1] < ymin + 0.04 and relv < -0.2:
                seg.append(b)
            else:
                if len(seg) > 6:
                    d = ((seg[-1][o] - seg[0][o]) ** 2 + (seg[-1][o + 2] - seg[0][o + 2]) ** 2) ** 0.5
                    slides.append(d / (seg[-1][0] - seg[0][0]))
                seg = []
            if relv > 0.3:
                clear.append(b[o + 1] - ymin)
        knees += [r[o + 3] for r in mid]
        last = -9.0
        for i in range(1, len(mid) - 1):
            y = mid[i][o + 1]
            if y < ymin + 0.015 and y <= mid[i - 1][o + 1] and y <= mid[i + 1][o + 1] and mid[i][0] - last > 0.25:
                steps += 1
                last = mid[i][0]
    knees.sort()
    slide = statistics.median(slides)
    return {"file": path.split('/')[-1], "speed_mps": round(v, 2), "planted_foot_slide_mps": round(slide, 3), "slide_fraction_of_speed": round(slide / v, 3),
            "cadence_steps_per_min": round(60 * steps / T, 1), "step_length_m": round(v * T / max(1, steps), 2),
            "knee_flexion_max_deg": round(knees[-1], 1), "knee_flexion_p95_deg": round(knees[int(0.95 * (len(knees) - 1))], 1),
            "swing_clearance_min_m": round(min(clear), 3) if clear else None}


if __name__ == '__main__':
    print(json.dumps([metrics(f) for f in sorted(glob.glob(sys.argv[1]))], indent=1))
