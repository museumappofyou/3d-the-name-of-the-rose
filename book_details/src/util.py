"""Shared small utilities (stdlib only)."""

from __future__ import annotations

import hashlib
import json
import os
import re
import sys
import tempfile
import threading
from pathlib import Path

_LOCK = threading.Lock()


def log(msg: str) -> None:
    print(msg, file=sys.stderr, flush=True)


def sha1(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8")).hexdigest()


def atomic_write_text(path: Path | str, text: str) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), prefix=".tmp_")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(text)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            try:
                os.unlink(tmp)
            except OSError:
                pass


def atomic_write_json(path: Path | str, obj) -> None:
    atomic_write_text(path, json.dumps(obj, ensure_ascii=False, indent=2))


def read_json(path: Path | str, default=None):
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return default


def read_jsonl(path: Path | str) -> list[dict]:
    out = []
    p = Path(path)
    if not p.exists():
        return out
    with open(p, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                out.append(json.loads(line))
            except ValueError:
                continue
    return out


def write_jsonl(path: Path | str, rows) -> None:
    lines = [json.dumps(r, ensure_ascii=False) for r in rows]
    atomic_write_text(path, "\n".join(lines) + ("\n" if lines else ""))


def append_jsonl(path: Path | str, row: dict) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with _LOCK:
        with open(path, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")


def estimate_tokens(text: str) -> int:
    """Conservative token estimate for Turkish prose (no tokenizer dependency)."""
    if not text:
        return 0
    return max(len(text) // 3, int(len(text.split()) * 2.0))


def normalize_ascii(text: str) -> str:
    """Uppercase + strip diacritics for matching (Turkish aware)."""
    tr = {"ı": "i", "İ": "I", "ş": "s", "Ş": "S", "ğ": "g", "Ğ": "G",
          "ü": "u", "Ü": "U", "ö": "o", "Ö": "O", "ç": "c", "Ç": "C"}
    out = "".join(tr.get(ch, ch) for ch in text)
    return out.upper()


def norm_key(text: str) -> str:
    """Aggressive key for dedupe/alias matching."""
    text = normalize_ascii(text or "")
    text = re.sub(r"[^A-Z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def clamp_text(text: str | None, limit: int = 300) -> str | None:
    if text is None:
        return None
    text = " ".join(str(text).split())
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "\u2026"


def safe_int(value, default=None):
    try:
        if value is None or value == "":
            return default
        return int(value)
    except (TypeError, ValueError):
        return default


def find_book_source(root: Path, explicit: str | None = None) -> Path:
    """Locate the book file in the project root."""
    root = Path(root)
    if explicit:
        p = Path(explicit)
        if not p.is_absolute():
            p = root / explicit
        if not p.exists():
            raise FileNotFoundError(f"source not found: {p}")
        return p
    exts = {".epub": 0, ".pdf": 1, ".txt": 2}
    candidates = []
    for p in root.iterdir():
        if p.is_file() and p.suffix.lower() in exts:
            candidates.append((exts[p.suffix.lower()], -p.stat().st_size, p))
    if not candidates:
        raise FileNotFoundError(
            f"no .epub/.pdf/.txt book found in {root}; pass --source"
        )
    candidates.sort(key=lambda t: (t[0], t[1]))
    return candidates[0][2]
