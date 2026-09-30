#!/usr/bin/env python3
"""Write assets/credits.json (shown in the help sheet) from the audio
sources actually shipped (scripts/audio/cuts.json) and the model list."""
import json, os, re
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
A = os.path.join(ROOT, 'scripts', 'audio')
src = json.load(open(os.path.join(A, 'sources.json')))
src.update(json.load(open(os.path.join(A, 'extra_sources.json'))))
cuts = json.load(open(os.path.join(A, 'cuts.json')))
man = json.load(open(os.path.join(ROOT, 'assets', 'audio', 'manifest.json')))
used = []
for bank in man['banks']:
    for c in cuts.get(bank, []):
        if c['id'] not in used:
            used.append(c['id'])
lic = lambda s: s.split(' (')[0]
chant = [i for i in used if i.startswith('c_')]
rec = sorted([i for i in used if not i.startswith('c_')], key=lambda i: src[i]['author'].lower())
groups = [
    {'title': 'Chant (human voices)', 'items': [{'title': src[i]['title'], 'author': src[i]['author'], 'license': lic(src[i]['license']), 'url': src[i]['url'],
                                                  'note': ('excerpt; shared under the same licence' if 'SA' in src[i]['license'] else '') or
                                                          ('kept as source material; not sung in the November offices' if re.search(r'Holy Saturday|Veni creator', src[i]['title'], re.I) else '')} for i in chant]},
    {'title': 'Field and Foley recordings (Freesound)', 'items': [{'title': src[i]['title'], 'author': src[i]['author'], 'license': lic(src[i]['license']), 'url': src[i]['url']} for i in rec]},
    {'title': 'People', 'items': [
        {'title': 'Photoscanned characters (heads and hands)', 'author': 'elbolilloduro, via Mesh2Motion', 'license': 'CC0 1.0', 'url': 'https://github.com/Mesh2Motion/mesh2motion-app'},
        {'title': 'Universal Animation Library (motion clips)', 'author': 'Quaternius, via Mesh2Motion', 'license': 'CC0 1.0', 'url': 'https://quaternius.com/packs/universalanimationlibrary.html'},
        {'title': 'Motion capture', 'author': 'Carnegie Mellon University Graphics Lab, retargeted by Mesh2Motion', 'license': 'free for all uses', 'url': 'http://mocap.cs.cmu.edu/'},
    ]},
    {'title': 'Animals', 'items': [
        {'title': 'Ultimate Animated Animals, Farm Animals (horse, donkey, cow, bull, pig, sheep, dog, cat)', 'author': 'Quaternius', 'license': 'CC0 1.0', 'url': 'https://poly.pizza/u/Quaternius'},
        {'title': 'Hen', 'author': 'Poly by Google', 'license': 'CC BY 3.0', 'url': 'https://poly.pizza/m/8Unya0rw9tR'},
        {'title': 'Rooster', 'author': 'Poly by Google', 'license': 'CC BY 3.0', 'url': 'https://poly.pizza/m/6NTegstc5Jy'},
        {'title': 'Goat', 'author': 'Poly by Google', 'license': 'CC BY 3.0', 'url': 'https://poly.pizza/m/d7dImmjtF8E'},
    ]},
    {'title': 'Textures', 'items': [{'title': 'PBR scans', 'author': 'Poly Haven', 'license': 'CC0 1.0', 'url': 'https://polyhaven.com/license'}]},
]
json.dump({'groups': groups}, open(os.path.join(ROOT, 'assets', 'credits.json'), 'w'), indent=1, ensure_ascii=False)
print(sum(len(g['items']) for g in groups), 'credits')
