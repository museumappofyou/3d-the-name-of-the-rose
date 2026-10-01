#!/usr/bin/env python3
"""Write shared/assets/credits.json (shown in the help sheet) from the audio
sources actually shipped (scripts/audio/cuts.json) and the model list."""
import json, os, re
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
A = os.path.join(ROOT, 'scripts', 'audio')
src = json.load(open(os.path.join(A, 'sources.json')))
src.update(json.load(open(os.path.join(A, 'extra_sources.json'))))
cuts = json.load(open(os.path.join(A, 'cuts.json')))
man = json.load(open(os.path.join(ROOT, 'shared', 'assets', 'audio', 'manifest.json')))
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

]
# Non-audio credits are curated in the runtime manifest, not inferred from old recipes.
existing = json.load(open(os.path.join(ROOT, 'shared', 'assets', 'credits.json')))
groups.extend(g for g in existing['groups'] if g['title'] not in ('Chant (human voices)', 'Field and Foley recordings (Freesound)'))
json.dump({'groups': groups}, open(os.path.join(ROOT, 'shared', 'assets', 'credits.json'), 'w'), indent=1, ensure_ascii=False)
print(sum(len(g['items']) for g in groups), 'credits')
