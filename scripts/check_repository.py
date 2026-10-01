#!/usr/bin/env python3
"""Check repository boundaries, literary integrity, links and module relocation."""
import hashlib
import importlib.util
import json
import re
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
CANONICAL = {'README.md', 'docs/PROJECT.md', 'docs/PLATFORMS.md',
             'docs/GAME_DESIGN.md', 'docs/ASSETS.md', 'docs/DEVELOPMENT.md'}
OPERATIONAL = {'book_details/.opencode/agent/abbey-extractor.md'}


def require(ok, message):
    if not ok:
        raise SystemExit('FAIL: ' + message)


def main():
    names = subprocess.check_output(
        ['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], cwd=ROOT)
    files = {n.decode() for n in names.split(b'\0') if n and (ROOT / n.decode()).is_file()}
    md = {n for n in files if n.lower().endswith('.md')}
    require(md == CANONICAL | OPERATIONAL, 'unexpected Markdown set: ' + str(md ^ (CANONICAL | OPERATIONAL)))
    for name in CANONICAL:
        text = (ROOT / name).read_text()
        for target in re.findall(r'\]\(([^)]+)\)', text):
            if target.startswith(('https:', 'http:', '#')):
                continue
            path = unquote(target.split('#')[0].strip('<>'))
            require(((ROOT / name).parent / path).exists(), f'{name}: broken link {target}')
    evidence = json.loads((ROOT / 'shared/data/provenance.json').read_text())['corpus']['files']
    actual = {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
              for p in (ROOT / 'book_details/output').iterdir() if p.is_file()}
    require(len(actual) == 9 and actual == evidence, 'literary corpus hashes changed')
    for name in files:
        p = ROOT / name
        if p.suffix not in ('.js', '.mjs') or not name.startswith(('web/src/', 'tests/', 'scripts/')) or '/vendor/' in name:
            continue
        for target in re.findall(r"(?:from\s*|import\s*\()\s*['\"]([^'\"]+)['\"]", p.read_text()):
            if target.startswith('.'):
                require((p.parent / target).exists(), f'{name}: missing relative import {target}')
    spec = importlib.util.spec_from_file_location('abbey_server', ROOT / 'scripts/serve.py')
    server = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(server)
    for url, path in [('/', 'web/index.html'), ('/src/main.js', 'web/src/main.js'),
                      ('/lib/three/three.module.js', 'web/lib/three/three.module.js'),
                      ('/assets/credits.json', 'shared/assets/credits.json')]:
        require(server.app_file(url) == (ROOT / path).resolve(), 'public mapping: ' + url)
    for url in ['/book_details/output/claims.jsonl', '/.local/', '/native/project.godot', '/docs/ASSETS.md',
                '/src/', '/assets/%2e%2e/book_details/output/claims.jsonl', '/src/%5c..%5csecret', '/unknown']:
        require(server.app_file(url) is None, 'private/traversal route accepted: ' + url)
    # Check escaping symlinks without touching a real source directory.
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp)
        (base / 'web/src').mkdir(parents=True)
        (base / 'private.txt').write_text('private')
        (base / 'web/src/escape.js').symlink_to(base / 'private.txt')
        old = server.ROOT
        server.ROOT = base
        require(server.app_file('/src/escape.js') is None, 'escape symlink accepted')
        server.ROOT = old
    print(json.dumps({'pass': True, 'canonical_markdown': len(CANONICAL),
                      'operational_markdown': len(OPERATIONAL), 'book_evidence_files': len(actual),
                      'relative_module_imports': 'pass', 'public_boundaries': 'pass'}, indent=2))


if __name__ == '__main__':
    main()
