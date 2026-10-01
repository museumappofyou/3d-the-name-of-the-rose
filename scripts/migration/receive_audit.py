#!/usr/bin/env python3
"""Optional loopback-only receiver for the existing browser review panel."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[2] / ".local/browser-review"
ORIGIN = "http://localhost:8000"

class Receiver(BaseHTTPRequestHandler):
    def do_POST(self):
        name = self.path.lstrip("/")
        length = int(self.headers.get("Content-Length", "0"))
        if self.headers.get("Origin") != ORIGIN or not re.fullmatch(r"[A-Za-z0-9_-]+\.(png|json)", name) or not 0 < length < 10000000:
            self.send_error(400)
            return
        data = self.rfile.read(length)
        if name.endswith(".png") and not data.startswith(b"\x89PNG\r\n\x1a\n"):
            self.send_error(400)
            return
        if name.endswith(".json"):
            try:
                json.loads(data)
            except (ValueError, UnicodeDecodeError):
                self.send_error(400)
                return
        ROOT.mkdir(parents=True, exist_ok=True)
        (ROOT / name).write_bytes(data)
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", ORIGIN)
        self.end_headers()
        self.wfile.write(b"saved")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", ORIGIN)
        self.send_header("Access-Control-Allow-Methods", "POST")
        self.send_header("Access-Control-Allow-Headers", "content-type")
        self.end_headers()

if __name__ == "__main__":
    print(f"Audit receiver: 127.0.0.1:8124 -> {ROOT}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", 8124), Receiver).serve_forever()
