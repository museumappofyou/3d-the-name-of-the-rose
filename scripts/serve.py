#!/usr/bin/env python3
"""Serve only the web application; research EPUBs and screenshots stay private."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit
import argparse

ROOT = Path(__file__).resolve().parents[1]
class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def do_GET(self):
        path = unquote(urlsplit(self.path).path)
        allowed = path in ('/', '/index.html') or path.startswith(('/src/', '/lib/', '/assets/'))
        relative = Path(path.lstrip('/'))
        if not allowed or '..' in relative.parts or (ROOT / relative).is_dir() and path != '/':
            self.send_error(404)
            return
        super().do_GET()
    def do_HEAD(self):
        path = unquote(urlsplit(self.path).path)
        if not (path in ('/', '/index.html') or path.startswith(('/src/', '/lib/', '/assets/'))) or '..' in Path(path).parts:
            self.send_error(404)
            return
        super().do_HEAD()
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
