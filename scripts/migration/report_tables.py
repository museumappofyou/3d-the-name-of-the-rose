#!/usr/bin/env python3
"""Markdown tables for the phase-1 proof report, read from the evidence JSON.

    python3 scripts/migration/report_tables.py > .local/phase1-tables.txt
"""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EV = ROOT / 'docs/evidence/phase1'


def load(p):
    p = EV / p
    return json.loads(p.read_text()) if p.exists() else None


def rss(name):
    p = EV / 'performance' / f'{name}.rss.csv'
    if not p.exists():
        return None
    r = [int(x['rss_kib']) for x in csv.DictReader(open(p)) if x['rss_kib']]
    return r


def perf():
    rows = []
    for n, label in [('route_mac', 'Normal route, 1920×1080, VSync off'), ('route_vsync_mac', 'Normal route, 1920×1080, VSync on'), ('route_hires_mac', 'Normal route, 2304×1149 (browser comparison)'),
                     ('crowd_mac', '46-presentation crowd, 1920×1080'), ('crowd_hires_mac', '46-presentation crowd, 2304×1149'),
                     ('route_sdfgi_mac', 'Route + SDFGI (evaluation)'), ('route_ssil_mac', 'Route + SSIL (evaluation)'), ('soak_mac', '20-min soak (route, hours, saves, crowd)')]:
        d = load(f'performance/{n}.json')
        if not d or 'summary' not in d:
            continue
        s = d['summary']
        r = rss(n)
        rows.append(f"| {label} | {s['measured_s']:.0f} | {s['fps_avg']:.1f} | {s['ms_p50']:.2f} | {s['ms_p95']:.2f} | {s['ms_p99']:.2f} | {s['ms_max']:.1f} | {len(d.get('stalls_over_100ms', []))} | {s['draws']['avg']:.0f} / {s['draws']['max']:.0f} | {s['prims']['avg']/1e3:.0f}k / {s['prims']['max']/1e3:.0f}k | {s['vram']['max']/2**20:.0f} | {(max(r)/1024 if r else 0):.0f} | {s['anim_us']['avg']/1000:.2f} | {d['system']['viewport_texture_px'][0]}×{d['system']['viewport_texture_px'][1]} |")
    head = '| Run | s | FPS avg | p50 ms | p95 ms | p99 ms | max ms | >100 ms | draws avg/max | prims avg/max | VRAM MiB max | RSS MiB max | crowd anim ms | 3D px |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|'
    return head + '\n' + '\n'.join(rows)


def cycles():
    d = load('performance/cycles_mac.json')
    if not d:
        return ''
    rows = [f"| {c['cycle']} | {c['vram']/2**20:.1f} | {c['texture_mem']/2**20:.1f} | {c['buffer_mem']/2**20:.1f} | {c['objects']} | {c['nodes']} | {c['resources']} | {c['cells_loaded']} | {c['load_ms'].get('ossuary_stair', 0):.0f} |" for c in d['cycles']]
    r = rss('cycles_mac')
    return ('| Cycle | VRAM MiB | textures MiB | buffers MiB | objects | nodes | resources | cells | stair load ms |\n|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n' + '\n'.join(rows) +
            f"\n\nStalls >100 ms during cycles: {len(d['stalls_over_100ms'])}. RSS {min(r)/1024:.0f}–{max(r)/1024:.0f} MiB." if r else '')


def steps(name):
    d = load(f'functional/{name}.json') or load(f'audio/{name}.json') or load(f'fixture/{name}.json')
    if not d:
        return ''
    return '\n'.join(f"| {'PASS' if s['pass'] else 'FAIL'} | {s['step']} |" for s in d.get('steps', []))


if __name__ == '__main__':
    print('## Performance\n')
    print(perf())
    print('\n## Residency cycles\n')
    print(cycles())
    for n in ['functional_mac_package', 'functional-reload_mac_package', 'functional_headless', 'functional-reload_headless']:
        t = steps(n)
        if t:
            print(f'\n## {n}\n\n| Result | Step |\n|---|---|\n' + t)
