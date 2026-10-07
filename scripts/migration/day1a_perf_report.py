#!/usr/bin/env python3
"""Summarise Day-1A packaged benchmark runs from their raw files.

    python3 scripts/migration/day1a_perf_report.py <performance dir> > summary.json

For each run written by run_benchmarks.sh (day1_walk, day1_cycles,
day1_soak) it reads the per-frame CSV (wall clock, frame time, beat or
loop/leg, cumulative pipeline compilations), the per-second engine counters
(`*_mon.csv`) and the external RSS samples (`*.rss.csv`, epoch seconds), and
aligns them by wall clock. Reports frame statistics overall, per beat or per
loop, frames over 50/100 ms, pipeline compilations during measurement, and
RSS/objects/resources/VRAM at the start of measurement and at each loop end.
"""
import csv
import glob
import json
import os
import sys


def fstats(ms):
    if not ms:
        return {}
    s = sorted(ms)
    n = len(s)
    return {"frames": n, "fps_avg": round(n / (sum(ms) / 1000.0), 1), "ms_p50": round(s[n // 2], 2),
            "ms_p95": round(s[int(0.95 * (n - 1))], 2), "ms_p99": round(s[int(0.99 * (n - 1))], 2), "ms_max": round(s[-1], 2),
            "over_50ms": sum(x > 50 for x in ms), "over_100ms": sum(x > 100 for x in ms)}


def rss_at(rss, epoch_s):
    best = None
    for e, kib in rss:
        if e <= epoch_s:
            best = kib
        else:
            break
    return round(best / 1024.0, 1) if best is not None else None


def mon_at(mon, epoch_s):
    best = None
    for r in mon:
        if int(r["epoch_s"]) <= epoch_s:
            best = r
        else:
            break
    return best


def load(directory, run, label):
    base = os.path.join(directory, run)
    frames = list(csv.DictReader(open(base + '.csv')))
    mon = list(csv.DictReader(open(base + '_mon.csv'))) if os.path.exists(base + '_mon.csv') else []
    rssf = os.path.join(directory, label + '.rss.csv')
    rss = []
    if os.path.exists(rssf):
        for r in csv.DictReader(open(rssf)):
            if 'epoch_s' in r:
                rss.append((int(r['epoch_s']), int(r['rss_kib'])))
    return frames, mon, rss


def walk(directory, run, label):
    frames, mon, rss = load(directory, run, label)
    ms = [float(f['ms']) for f in frames]
    by = {}
    for f in frames:
        by.setdefault(f['beat'], []).append(float(f['ms']))
    pc = [int(f['pipeline_compilations']) for f in frames]
    e0, e1 = float(frames[0]['epoch_ms']) / 1000, float(frames[-1]['epoch_ms']) / 1000
    spikes = [{"t_s": round(float(f['epoch_ms']) / 1000 - e0, 1), "ms": float(f['ms']), "beat": f['beat'],
               "pipelines_before": pc[i - 1] if i else pc[0], "pipelines_after": pc[i]} for i, f in enumerate(frames) if float(f['ms']) > 50]
    out = {"run": run, "all": fstats(ms), "by_beat": {b: fstats(v) for b, v in by.items()},
           "pipeline_compilations_at_first_measured_frame": pc[0], "pipeline_compilations_during_measurement": pc[-1] - pc[0], "spikes_over_50ms": spikes,
           "rss_mib": {"start": rss_at(rss, int(e0)), "end": rss_at(rss, int(e1)), "max": round(max(k for _, k in rss) / 1024, 1) if rss else None}}
    if mon:
        out["counters_start_end"] = {k: [mon[0][k], mon[-1][k]] for k in ("objects", "resources", "nodes", "orphans", "vram_mib", "texture_mib", "buffer_mib")}
    return out


def loops(directory, run, label):
    frames, mon, rss = load(directory, run, label)
    rep = json.load(open(os.path.join(directory, run + '.json')))
    by = {}
    for f in frames:
        by.setdefault(int(f['cycle']), []).append(f)
    rows = []
    for c in sorted(by):
        fs = by[c]
        end_s = int(float(fs[-1]['epoch_ms']) / 1000)
        m = mon_at(mon, end_s) or {}
        rows.append({"loop": c, "kind": "approach" if c < 0 else ("warmup" if c == 0 else "measured"), "frames": fstats([float(f['ms']) for f in fs]),
                     "seconds": round((float(fs[-1]['epoch_ms']) - float(fs[0]['epoch_ms'])) / 1000, 1),
                     "pipeline_compilations": int(fs[-1]['pipeline_compilations']) - int(fs[0]['pipeline_compilations']),
                     "rss_mib_at_end": rss_at(rss, end_s), "objects": m.get("objects"), "resources": m.get("resources"), "nodes": m.get("nodes"),
                     "orphans": m.get("orphans"), "vram_mib": m.get("vram_mib"), "draw_calls": m.get("draw_calls"), "objects_in_frame": m.get("objects_in_frame"),
                     "figures_visible": m.get("figures_visible")})
    measured = [float(f['ms']) for c, fs in by.items() if c >= 1 for f in fs]
    warm = next(r for r in rows if r["kind"] == "warmup")
    last = rows[-1]
    growth = {}
    if warm["rss_mib_at_end"] and last["rss_mib_at_end"]:
        growth["rss_pct"] = round(100 * (last["rss_mib_at_end"] / warm["rss_mib_at_end"] - 1), 2)
        rs = [r["rss_mib_at_end"] for r in rows if r["kind"] == "measured" and r["rss_mib_at_end"]]
        growth["rss_measured_loop_ends_mib"] = rs
        growth["rss_max_over_warm_pct"] = round(100 * (max(rs) / warm["rss_mib_at_end"] - 1), 2) if rs else None
    for k in ("objects", "resources", "nodes", "vram_mib"):
        if warm.get(k) is not None and last.get(k) is not None:
            growth[k + "_delta"] = round(float(last[k]) - float(warm[k]), 2)
    return {"run": run, "measured_minutes": rep.get("measured_minutes"), "measured_loops": sum(r["kind"] == "measured" for r in rows),
            "all_measured": fstats(measured), "loops": rows, "growth_warmup_to_last": growth, "leg_timeouts": rep.get("leg_timeouts", []),
            "spikes_over_50ms": rep.get("spikes_over_50ms", [])}


if __name__ == '__main__':
    d = sys.argv[1]
    out = {}
    for path in sorted(glob.glob(os.path.join(d, 'day1-walk_normal_*.csv'))):
        if path.endswith('_mon.csv'):
            continue
        run = os.path.basename(path)[:-4]
        label = 'day1_walk_' + run.split('_')[-1]
        out[run] = walk(d, run, label)
    for kind in ('day1_cycles', 'day1_soak'):
        for path in sorted(glob.glob(os.path.join(d, kind + '_*.json'))):
            run = os.path.basename(path)[:-5]
            if os.path.exists(os.path.join(d, run + '.csv')):
                out[run] = loops(d, run, run)
    print(json.dumps(out, indent=1))
