#!/usr/bin/env python3
"""Read-only local EPUB research. No full book is copied into the web app."""
from pathlib import Path
from html.parser import HTMLParser
import argparse
import re
import zipfile

class Text(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
    def handle_data(self, data):
        self.parts.append(data)
    def handle_starttag(self, tag, attrs):
        if tag in ('p', 'h1', 'h2', 'h3', 'div', 'br'):
            self.parts.append('\n')
    def handle_endtag(self, tag):
        if tag in ('p', 'h1', 'h2', 'h3', 'div'):
            self.parts.append('\n')

def chapters(path):
    with zipfile.ZipFile(path) as archive:
        for name in sorted(archive.namelist()):
            if name.endswith(('.html', '.xhtml')):
                reader = Text()
                reader.feed(archive.read(name).decode('utf-8'))
                yield name, re.sub(r'\n\s*\n', '\n', ''.join(reader.parts)).strip()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('query', nargs='?', help='Turkish text to find, e.g. "elli altı"')
    parser.add_argument('--epub', type=Path)
    parser.add_argument('--chapter', type=int, help='Read a numbered index_split chapter')
    parser.add_argument('--context', type=int, default=350)
    args = parser.parse_args()
    path = args.epub or next(Path(__file__).resolve().parents[1].glob('*.epub'), None)
    if not path:
        raise SystemExit('No local EPUB found. Supply --epub PATH.')
    for name, text in chapters(path):
        if args.chapter is not None:
            if name.endswith(f'index_split_{args.chapter:03}.html'):
                print(f'{name}\n{text}')
        elif args.query:
            for match in re.finditer(re.escape(args.query), text, re.IGNORECASE):
                a, b = max(0, match.start()-args.context), min(len(text), match.end()+args.context)
                print(f'\n{name}\n{text[a:b]}')
        else:
            print(name, ' / '.join(text.splitlines()[:4]))
