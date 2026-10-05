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
# Finite supporting design evidence, never a second active roadmap. Additional
# task reports still fail this check unless their durable retention is reviewed.
SUPPORTING = {
    'story-council/round-1/council-generalist-systems-designer.md',
    'story-council/round-1/systems-and-structure.md',
    'story-council/round-1/unassigned-role.md',
    'story-council/round-3-adso/01-claude-literary.md',
    'story-council/round-3-adso/02-gpt-progression.md',
    'story-council/round-3-adso/03-grok-contrarian.md',
    'story-council/round-3-adso/04-deepseek-feasibility.md',
    'story-council/round-3-adso/05-gemini-experience.md',
    'story-council/round-4-library-labyrinth/01-claude-literary-labyrinth.md',
    'story-council/round-4-library-labyrinth/02-gpt-labyrinth-systems.md',
    'story-council/round-4-library-labyrinth/03-glm-contrarian-library.md',
    'story-council/round-4-library-labyrinth/04-deepseek-library-feasibility.md',
    'story-council/round-4-library-labyrinth/05-gemini-spatial-experience.md',
    'story-council/day-1/OPUS_DAY1_DESIGN.md',
}


def require(ok, message):
    if not ok:
        raise SystemExit('FAIL: ' + message)


def main():
    names = subprocess.check_output(
        ['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], cwd=ROOT)
    files = {n.decode() for n in names.split(b'\0') if n and (ROOT / n.decode()).is_file()}
    md = {n for n in files if n.lower().endswith('.md')}
    expected_md = CANONICAL | OPERATIONAL | SUPPORTING
    require(md == expected_md, 'unexpected Markdown set: ' + str(md ^ expected_md))
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
                      'operational_markdown': len(OPERATIONAL),
                      'supporting_markdown': len(SUPPORTING), 'book_evidence_files': len(actual),
                      'relative_module_imports': 'pass', 'public_boundaries': 'pass'}, indent=2))


if __name__ == '__main__':
    main()
