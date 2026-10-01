#!/usr/bin/env python3
"""Audit an exported Godot .pck: list its files and check that nothing that
must not ship is inside (raw book text/sources, extraction caches, review
music, private masters, tests, absolute developer paths).

    python3 scripts/migration/audit_package.py <file.pck> [--json out.json]
    python3 scripts/migration/audit_package.py --diff <a.pck> <b.pck>   # per-file MD5 comparison
"""
import json
import re
import struct
import sys
from pathlib import Path

FORBIDDEN_PATHS = [r'\.epub$', r'book_details/', r'/music/', r'review\.mp3$', r'^res://tests/', r'\.blend$', r'/\.local/', r'claims\.jsonl$']
FORBIDDEN_BYTES = [b'Anna\xe2\x80\x99s Archive', b"Anna's Archive", b'evidence_fragment', b'/Users/memre', b'G\xc3\xbcl\xc3\xbcn Ad\xc4\xb1 (Turkish Edition)', b'cold_stone_prayer', b'beneath_the_vault', b'localhost', b'127.0.0.1', b'localStorage']


def parse(data):
    if data[:4] != b'GDPC':
        raise SystemExit('not a Godot pack')
    fmt, vmaj, vmin, vpat = struct.unpack_from('<4I', data, 4)
    off = 20
    flags = struct.unpack_from('<I', data, off)[0]; off += 4
    file_base = struct.unpack_from('<Q', data, off)[0]; off += 8
    if fmt >= 3:
        dir_off = struct.unpack_from('<Q', data, off)[0]
        off = dir_off
    else:
        off += 16 * 4
    count = struct.unpack_from('<I', data, off)[0]; off += 4
    files = []
    for _ in range(count):
        n = struct.unpack_from('<I', data, off)[0]; off += 4
        path = data[off:off + n].rstrip(b'\0').decode('utf-8'); off += n
        o, size = struct.unpack_from('<QQ', data, off); off += 16
        md5 = data[off:off + 16].hex(); off += 16
        fl = struct.unpack_from('<I', data, off)[0]; off += 4
        files.append({'path': path, 'size': size, 'flags': fl, 'md5': md5})
    return {'format': fmt, 'engine': f'{vmaj}.{vmin}.{vpat}', 'flags': flags, 'files': files}


def diff(a, b):
    fa = {f['path']: f for f in parse(Path(a).read_bytes())['files']}
    fb = {f['path']: f for f in parse(Path(b).read_bytes())['files']}
    changed = sorted(p for p in fa.keys() & fb.keys() if fa[p]['md5'] != fb[p]['md5'])
    out = {'a': a, 'b': b, 'files_a': len(fa), 'files_b': len(fb), 'only_a': sorted(fa.keys() - fb.keys()), 'only_b': sorted(fb.keys() - fa.keys()),
           'content_differs': [{'path': p, 'size_a': fa[p]['size'], 'size_b': fb[p]['size']} for p in changed]}
    out['identical_contents'] = not (out['only_a'] or out['only_b'] or changed)
    return out


def main():
    if sys.argv[1] == '--diff':
        print(json.dumps(diff(sys.argv[2], sys.argv[3]), indent=1))
        return
    pck = Path(sys.argv[1])
    data = pck.read_bytes()
    info = parse(data)
    bad_paths = [f['path'] for f in info['files'] if any(re.search(p, f['path']) for p in FORBIDDEN_PATHS)]
    bad_bytes = [b.decode('utf-8', 'replace') for b in FORBIDDEN_BYTES if b in data]
    by_dir = {}
    for f in info['files']:
        top = '/'.join(f['path'].replace('res://', '').split('/')[:2])
        d = by_dir.setdefault(top, [0, 0])
        d[0] += 1; d[1] += f['size']
    out = {'pck': str(pck), 'bytes': len(data), 'format': info['format'], 'engine': info['engine'], 'file_count': len(info['files']),
           'by_dir': {k: {'files': v[0], 'bytes': v[1]} for k, v in sorted(by_dir.items())}, 'forbidden_paths': bad_paths, 'forbidden_strings': bad_bytes,
           'pass': not bad_paths and not bad_bytes}
    if '--json' in sys.argv:
        Path(sys.argv[sys.argv.index('--json') + 1]).write_text(json.dumps({**out, 'files': info['files']}, indent=1) + '\n')
    print(json.dumps(out, indent=1))
    sys.exit(0 if out['pass'] else 1)


if __name__ == '__main__':
    main()
