#!/usr/bin/env python3
"""Serve only the web application; research EPUBs and screenshots stay private."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit
import argparse

ROOT = Path(__file__).resolve().parents[1]


def app_file(url):
    """Keep public URLs stable while exposing only the two runtime directories."""
    path = unquote(urlsplit(url).path)
    if '..' in Path(path).parts or '\\' in path:
        return None
    if path in ('/', '/index.html'):
        return ROOT / 'web/index.html'
    for prefix, directory in [('/src/', 'web/src'), ('/lib/', 'web/lib'), ('/assets/', 'shared/assets')]:
        if path.startswith(prefix):
            base = (ROOT / directory).resolve()
            target = (base / path[len(prefix):]).resolve()
            if base not in target.parents or not target.is_file():
                return None
            return target
    return None


class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def translate_path(self, path):
        target = app_file(path)
        return str(target) if target is not None else str(ROOT / '.not-public')

    def send_head(self):
        if app_file(self.path) is None:
            self.send_error(404)
            return None
        return super().send_head()
    def list_directory(self, path):
        self.send_error(404)
        return None
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8000)
    args = parser.parse_args()
    try:
        server = ThreadingHTTPServer(('127.0.0.1', args.port), AppHandler)
    except OSError as exc:
        raise SystemExit(f'Port {args.port} is unavailable. Try: python3 scripts/serve.py --port 8001\n{exc}')
    print(f'The Abbey is ready at http://localhost:{args.port}', flush=True)
    print('Press Ctrl+C to stop.', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nThe Abbey server has stopped.')
    finally:
        server.server_close()
