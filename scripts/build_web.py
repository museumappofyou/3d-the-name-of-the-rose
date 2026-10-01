#!/usr/bin/env python3
"""Stage the current browser reference for static hosting; no private research."""
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'dist/web-reference'


def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    shutil.copy2(ROOT / 'web/index.html', OUT / 'index.html')
    for name in ('src', 'lib'):
        shutil.copytree(ROOT / 'web' / name, OUT / name)
    shutil.copytree(ROOT / 'shared/assets', OUT / 'assets',
                    ignore=shutil.ignore_patterns('music', '.DS_Store', 'README.md'))
    files = [p for p in OUT.rglob('*') if p.is_file()]
    manifest = {'product': 'browser-reference', 'lightweight_explorer': False,
                'files': len(files), 'bytes': sum(p.stat().st_size for p in files),
                'excluded': ['book_details', '.local', 'native', 'docs', 'unassigned review music']}
    (OUT / 'build-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps({'output': str(OUT.relative_to(ROOT)), **manifest}, indent=2))


if __name__ == '__main__':
    main()
