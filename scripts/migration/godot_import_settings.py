#!/usr/bin/env python3
"""Pin Godot scene-import settings for normalized character GLBs.

Godot writes a default `<file>.glb.import` on first import. For fitted task
clips the defaults are lossy: animations are resampled at 30 fps and the
AnimationPlayer keyframe optimizer drops keys (measured 4.9 mm hand drift
on alinardo:tend, docs/migration/phase-1/evidence/import/). This tool rewrites
the [params] so that:
  * animation/fps = 24  (the clips are keyed on exact multiples of 1/24 s)
  * the imported AnimationPlayer node: keyframe optimizer disabled (it is a
    node setting, `_subresources.nodes["PATH:AnimationPlayer"]`, not a
    per-animation one), compression disabled
  * every clip: loop mode linear (browser LoopRepeat), not saved separately
  * animation/remove_immutable_tracks stays true (Godot drops only tracks that
    equal the rest pose; the pose check proves the result)

World cell GLBs (migration/data/manifests/world_derivatives.json): every
placeholder material, named by its browser semantic key, is bound at import
time to the shared native material resource for that key; tangents are not
generated (the abbey shader builds its tangent frame from UV derivatives,
exactly as three does for these untangented meshes).

Usage: python3 scripts/migration/godot_import_settings.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / 'migration/data/manifests/people_derivatives.json'
WORLD = ROOT / 'migration/data/manifests/world_derivatives.json'


def subresources(clips):
    anims = {}
    for c in clips:
        anims[c['godot_name']] = {
            'save_to_file/enabled': False,
            'save_to_file/keep_custom_tracks': '',
            'save_to_file/path': '',
            'settings/loop_mode': 1,
            'slices/amount': 0,
        }
    nodes = {'PATH:AnimationPlayer': {'optimizer/enabled': False, 'compression/enabled': False}}
    return {'animations': anims, 'nodes': nodes}


def godot_value(v):
    # Godot's .import variant syntax is JSON-compatible for these types
    return json.dumps(v, indent=None, separators=(', ', ': '))


def main():
    m = json.loads(MANIFEST.read_text())
    for pid, rec in m['people'].items():
        imp = ROOT / (rec['output'] + '.import')
        if not imp.exists():
            print('skip (not yet imported by Godot):', imp.relative_to(ROOT))
            continue
        text = imp.read_text()
        text = re.sub(r'^animation/fps=.*$', 'animation/fps=24', text, flags=re.M)
        text = re.sub(r'^_subresources=.*?(?=^\w|\Z)', '_subresources=' + godot_value(subresources(rec['clips'])) + '\n', text, flags=re.M | re.S)
        imp.write_text(text)
        print('pinned', imp.relative_to(ROOT), len(rec['clips']), 'clips')
    if WORLD.exists():
        w = json.loads(WORLD.read_text())
        mats = {k: {'use_external/enabled': True, 'use_external/path': v['resource']} for k, v in w['materials'].items()}
        for d in w['derivatives']:
            out = d['output']
            if not out.endswith('.glb'):
                continue
            imp = ROOT / (out + '.import')
            if not imp.exists():
                print('skip (not yet imported by Godot):', out)
                continue
            text = imp.read_text()
            text = re.sub(r'^meshes/ensure_tangents=.*$', 'meshes/ensure_tangents=false', text, flags=re.M)
            sub = {} if '/collision/' in out else {'materials': mats}
            text = re.sub(r'^_subresources=.*?(?=^\w|\Z)', '_subresources=' + godot_value(sub) + '\n', text, flags=re.M | re.S)
            imp.write_text(text)
            print('pinned', out)


if __name__ == '__main__':
    main()
