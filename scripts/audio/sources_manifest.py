#!/usr/bin/env python3
"""Generate a local structured attribution view from canonical sources and cuts."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
sources = json.loads((HERE / 'sources.json').read_text())
sources.update(json.loads((HERE / 'extra_sources.json').read_text()))
cuts = json.loads((HERE / 'cuts.json').read_text())
manifest = json.loads((ROOT / 'shared/assets/audio/manifest.json').read_text())
banks = {}
for name, bank in manifest['banks'].items():
    banks[name] = {'file': bank['file'], 'clips': bank['clips'],
                   'source_crops': [{'source_id': clip['id'], 'source': sources[clip['id']],
                                    'start': clip['start'], 'end': clip['end']}
                                   for clip in cuts.get(name, [])]}
out = ROOT / '.local/audio-attribution.json'
out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps({'schema_version': 1, 'banks': banks}, indent=2, ensure_ascii=False) + '\n')
print(out.relative_to(ROOT))
