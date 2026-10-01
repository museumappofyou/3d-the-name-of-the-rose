#!/usr/bin/env python3
"""Aggregate source → derivative → provenance manifest for phase 1.

    python3 scripts/migration/build_manifest.py

Reads the per-domain manifests (people, world, audio), the reviewed content
manifest and the pinned tool inputs, verifies every listed output hash
against the file on disk, and writes migration/data/manifests/phase1_manifest.json.
Exit 1 if any output no longer matches its recorded hash.
"""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
M = ROOT / 'migration/data/manifests'


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def main():
    people = json.loads((M / 'people_derivatives.json').read_text())
    world = json.loads((M / 'world_derivatives.json').read_text())
    audio = json.loads((M / 'audio_derivatives.json').read_text())
    content = json.loads((ROOT / 'migration/godot/content/content_manifest.json').read_text())
    entries, bad = [], []

    def add(output, out_sha, source, source_sha, licence, recipe, kind):
        p = ROOT / output
        now = sha(p) if p.exists() else None
        if now != out_sha:
            bad.append(output)
        entries.append({'kind': kind, 'output': output, 'output_sha256': out_sha, 'verified': now == out_sha, 'source': source, 'source_sha256': source_sha, 'licence': licence, 'recipe': recipe})

    src = people['sources']
    for pid, r in people['people'].items():
        add(r['output'], r['output_sha256'], ['assets/models/people/cast.glb', 'assets/models/people/tasks.glb', 'assets/models/people/cast.json'],
            [src['assets/models/people/cast.glb'], src['assets/models/people/tasks.glb'], src['assets/models/people/cast.json']],
            people['licence_note'], r['transformations'], 'character')
    for d in world['derivatives']:
        lic = d.get('licence') or ('project-authored procedural geometry (browser builders), see docs/RECONSTRUCTION.md and docs/provenance/' if d['output'].endswith('.glb') else 'project-authored')
        add(d['output'], d['sha256'], d['source'], d.get('source_sha256'), lic, d['recipe'], 'world')
    for sid, s in audio['streams'].items():
        c = s['credit']
        add(s['output'], s['output_sha256'], s['source'], s['source_sha256'], f"{c['licence']} — {c.get('title', '')} by {c.get('author', '')} ({c.get('url', '')})", s['recipe'], 'audio-stream')
    for bank, b in audio['clips'].items():
        c = b['credit']
        for clip in b['clips']:
            add(clip['output'], clip['sha256'], b['source'], b['source_sha256'], f"{c.get('licence', '')} — {c.get('title', '')} by {c.get('author', '')} ({c.get('url', '')})", f"{b['recipe']}; window {clip['window']}", 'audio-clip')
    fonts = ROOT / 'migration/godot/assets/fonts'
    for f in sorted(fonts.glob('*.woff2')):
        srcf = ROOT / 'assets/fonts' / f.name
        add(str(f.relative_to(ROOT)), sha(f), str(srcf.relative_to(ROOT)), sha(srcf), 'SIL Open Font License 1.1 (notice copied beside the font)', 'unchanged copy; Godot imports WOFF2 natively', 'font')
    tools = {
        'scripts/migration/vendor/three-r180/exporters/GLTFExporter.js': 'three.js r180 (MIT), mrdoob/three.js@r180 examples/jsm/exporters',
        'scripts/migration/vendor/three-r180/utils/TextureUtils.js': 'three.js r180 (MIT), unused (compressed textures only)',
        'scripts/migration/vendor/three-r180/LICENSE': 'three.js MIT licence',
    }
    out = {
        'schema_version': 1,
        'generator': 'scripts/migration/build_manifest.py',
        'engine': {'name': 'Godot', 'version': '4.7.2.stable.official.ed1daf0bf', 'licence': 'MIT (engine notices in the packaged templates)'},
        'pinned_tools': {k: {'sha256': sha(ROOT / k), 'note': v} for k, v in tools.items()},
        'reviewed_content': content['files'],
        'evidence_corpus': content['evidence_corpus'],
        'not_shipped': ['book_details/ (raw book, extraction caches; only a curated claim subset without fragments ships)', 'assets/audio/music/ and music/ (unassigned review music)', '.local/ masters (MakeHuman/Blender sources)', 'migration/data/export raw intermediates'],
        'entries': entries,
    }
    (M / 'phase1_manifest.json').write_text(json.dumps(out, indent=1, ensure_ascii=False) + '\n')
    kinds = {}
    for e in entries:
        kinds[e['kind']] = kinds.get(e['kind'], 0) + 1
    print('entries', len(entries), kinds, 'mismatched', bad)
    if bad:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
