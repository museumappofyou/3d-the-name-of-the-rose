"""EPUB/PDF/TXT ingestion into a normalized paragraph stream (stdlib only)."""

from __future__ import annotations

import html
import re
import shutil
import subprocess
import zipfile
from html.parser import HTMLParser
from pathlib import Path

from ..util import log

CHAPTER_RE = re.compile(
    r"^\s*(BİRİNCİ|İKİNCİ|ÜÇÜNCÜ|DÖRDÜNCÜ|BEŞİNCİ|ALTINCI|YEDİNCİ)\s+GÜN\s*$",
    re.I,
)
HOUR_RE = re.compile(r"^\s*(SABAH|ÖĞLE|İKİNDİ|İKİNDİDEN SONRA|AKŞAM|GÜNBATIMI|TANSÖKÜMÜ|GECE|GECELEYİN)\b", re.I)
PARATEXT_LABEL_RE = re.compile(
    r"(?i)(üzerine|sonsöz|sunuş|kaynakça|çevirmenin|editör|biyografi|teşekkür)"
)


class _ParaParser(HTMLParser):
    """Collect <p>/<h1..h6> text with the element id when present."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.blocks: list[dict] = []
        self._depth = 0
        self._tag: str | None = None
        self._id: str | None = None
        self._buf: list[str] = []
        self._skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self._skip += 1
            return
        if self._depth == 0 and tag in ("p", "h1", "h2", "h3", "h4", "h5", "h6", "div"):
            self._tag = tag
            self._id = dict(attrs).get("id")
            self._buf = []
            self._depth = 1
            return
        if self._depth:
            self._depth += 1
            if tag == "br":
                self._buf.append(" ")

    def handle_endtag(self, tag):
        if self._skip:
            if tag in ("script", "style"):
                self._skip -= 1
            return
        if self._depth:
            self._depth -= 1
            if self._depth == 0:
                text = " ".join("".join(self._buf).split())
                if text:
                    self.blocks.append(
                        {"tag": self._tag, "id": self._id, "text": html.unescape(text)}
                    )
                self._tag = None
                self._id = None
                self._buf = []

    def handle_data(self, data):
        if self._skip:
            return
        if self._depth:
            self._buf.append(data)


def parse_xhtml_paragraphs(raw: str) -> list[dict]:
    parser = _ParaParser()
    parser.feed(raw)
    # keep only paragraph-like blocks; drop layout-only divs with no id
    blocks = [
        b
        for b in parser.blocks
        if b["text"].strip() and (b["tag"].startswith("h") or b["tag"] == "p" or b["id"])
    ]
    for i, b in enumerate(blocks):
        b["index_in_doc"] = i
    return blocks


def _parse_container(epub: zipfile.ZipFile) -> str:
    raw = epub.read("META-INF/container.xml").decode("utf-8", "replace")
    m = re.search(r'full-path="([^"]+)"', raw)
    if not m:
        raise ValueError("EPUB container.xml has no rootfile")
    return m.group(1)


def _parse_opf(epub: zipfile.ZipFile, opf_path: str) -> tuple[list[str], dict[str, str]]:
    raw = epub.read(opf_path).decode("utf-8", "replace")
    manifest = {}
    for item in re.findall(r"<item\b[^>]*>", raw):
        idm = re.search(r'id="([^"]+)"', item)
        href = re.search(r'href="([^"]+)"', item)
        media = re.search(r'media-type="([^"]+)"', item)
        if idm and href:
            manifest[idm.group(1)] = (href.group(1), media.group(1) if media else "")
    spine = re.findall(r'<itemref\b[^>]*idref="([^"]+)"', raw)
    # resolve hrefs relative to the OPF directory
    base = str(Path(opf_path).parent)
    resolved = {}
    for idm, (href, media) in manifest.items():
        full = str(Path(base) / href) if base not in (".", "") else href
        resolved[idm] = (full.replace("\\", "/"), media)
    return spine, resolved


def _parse_toc(epub: zipfile.ZipFile, opf_path: str, manifest: dict) -> list[dict]:
    """Return ordered navPoints with label + file + anchor."""
    ncx_path = None
    for href, media in manifest.values():
        if media == "application/x-dtbncx+xml" or href.endswith(".ncx"):
            ncx_path = href
            break
    if not ncx_path:
        return []
    try:
        raw = epub.read(ncx_path).decode("utf-8", "replace")
    except KeyError:
        return []
    entries = []
    order = 0
    for nav in re.findall(r"<navPoint\b[^>]*>.*?</navPoint>", raw, re.S):
        label = re.search(r"<text>(.*?)</text>", nav, re.S)
        src = re.search(r'src="([^"]+)"', nav)
        if not src:
            continue
        file_part, _, anchor = src.group(1).partition("#")
        base = str(Path(ncx_path).parent)
        full = str(Path(base) / file_part).replace("\\", "/") if base not in (".", "") else file_part
        entries.append(
            {
                "order": order,
                "label": html.unescape(label.group(1)).strip() if label else "",
                "file": full,
                "anchor": anchor or None,
            }
        )
        order += 1
    return entries


def ingest_epub(path: Path) -> tuple[list[dict], dict]:
    path = Path(path)
    with zipfile.ZipFile(path) as epub:
        opf_path = _parse_container(epub)
        spine_ids, manifest = _parse_opf(epub, opf_path)
        toc = _parse_toc(epub, opf_path, manifest)

        toc_by_file: dict[str, list[dict]] = {}
        for entry in toc:
            toc_by_file.setdefault(entry["file"], []).append(entry)

        # The narrative proper ends with the "SON YAPRAK" section; everything in
        # the spine after that document is back matter (Eco's postscript and the
        # endnotes) and must not be treated as the novel's abbey description.
        narrative_end_href = None
        for entry in toc:
            if re.search(r"SON\s*YAPRAK", entry["label"], re.I):
                narrative_end_href = entry["file"]

        paragraphs: list[dict] = []
        doc_index = 0
        docs_meta = []
        narrative_end_seen = False
        for idm in spine_ids:
            href, media = manifest.get(idm, (None, ""))
            if not href or not (href.endswith(".xhtml") or href.endswith(".html") or href.endswith(".htm")):
                continue
            try:
                raw = epub.read(href).decode("utf-8", "replace")
            except KeyError:
                log(f"[ingest] missing spine item {href}; skipped")
                continue
            blocks = parse_xhtml_paragraphs(raw)
            if not blocks:
                doc_index += 1
                continue
            after_narrative = bool(
                narrative_end_href and narrative_end_seen and href != narrative_end_href
            )
            if narrative_end_href and href == narrative_end_href:
                narrative_end_seen = True
            # anchor -> paragraph position (for TOC sub-entries)
            anchor_pos = {}
            for b in blocks:
                if b["id"]:
                    anchor_pos[b["id"]] = b["index_in_doc"]
            file_entries = sorted(toc_by_file.get(href, []), key=lambda e: e["order"])
            docs_meta.append(
                {"doc_index": doc_index, "href": href, "paragraphs": len(blocks),
                 "toc_labels": [e["label"] for e in file_entries]}
            )
            for b in blocks:
                # find the closest preceding TOC entry within this file
                chapter = None
                section = None
                for entry in file_entries:
                    if entry["anchor"]:
                        pos = anchor_pos.get(entry["anchor"])
                        if pos is not None and pos <= b["index_in_doc"]:
                            chapter = entry["label"]
                            section = None
                        elif pos is None:
                            pass
                    else:
                        chapter = entry["label"]
                # day-level chapter if this block is a "BİRİNCİ GÜN" heading
                if CHAPTER_RE.match(b["text"]):
                    chapter = b["text"].strip()
                elif HOUR_RE.match(b["text"]) and chapter:
                    section = b["text"].strip()
                paragraphs.append(
                    {
                        "source_file": path.name,
                        "source_format": "epub",
                        "doc_index": doc_index,
                        "doc_href": href,
                        "chapter": chapter,
                        "section": section,
                        "paragraph_index": len(paragraphs),
                        "index_in_doc": b["index_in_doc"],
                        "anchor": b["id"],
                        "text": b["text"],
                        "is_heading": b["tag"].startswith("h") or bool(CHAPTER_RE.match(b["text"])),
                        "paratext_doc": after_narrative,
                    }
                )
            doc_index += 1

    meta = {
        "source_file": str(path),
        "source_format": "epub",
        "opf": opf_path,
        "spine_items": len(spine_ids),
        "documents": docs_meta,
        "toc": toc,
        "paragraph_count": len(paragraphs),
    }
    return paragraphs, meta


def ingest_pdf(path: Path) -> tuple[list[dict], dict]:
    """Extract paragraphs per page; requires pdftotext (poppler) when scanned text is absent."""
    path = Path(path)
    if not shutil.which("pdftotext"):
        raise SystemExit(
            "PDF ingestion needs the `pdftotext` binary (poppler). "
            "Install it, or provide an EPUB/TXT source."
        )
    proc = subprocess.run(
        ["pdftotext", "-layout", "-enc", "UTF-8", str(path), "-"],
        capture_output=True,
        text=True,
        timeout=600,
    )
    if proc.returncode != 0:
        raise SystemExit(f"pdftotext failed: {proc.stderr[:300]}")
    paragraphs = []
    for page_no, page_text in enumerate(proc.stdout.split("\f"), start=1):
        for block in re.split(r"\n\s*\n", page_text):
            text = " ".join(block.split())
            if len(text) < 2:
                continue
            paragraphs.append(
                {
                    "source_file": path.name,
                    "source_format": "pdf",
                    "doc_index": page_no - 1,
                    "doc_href": f"page={page_no}",
                    "chapter": None,
                    "section": None,
                    "paragraph_index": len(paragraphs),
                    "index_in_doc": len(paragraphs),
                    "anchor": None,
                    "page": page_no,
                    "text": text,
                    "is_heading": False,
                }
            )
    meta = {
        "source_file": str(path),
        "source_format": "pdf",
        "paragraph_count": len(paragraphs),
        "note": "pdftotext -layout; page numbers preserved",
    }
    return paragraphs, meta


def ingest_txt(path: Path) -> tuple[list[dict], dict]:
    path = Path(path)
    text = path.read_text(encoding="utf-8", errors="replace")
    paragraphs = []
    for block in re.split(r"\n\s*\n", text):
        t = " ".join(block.split())
        if not t:
            continue
        paragraphs.append(
            {
                "source_file": path.name,
                "source_format": "txt",
                "doc_index": 0,
                "doc_href": None,
                "chapter": None,
                "section": None,
                "paragraph_index": len(paragraphs),
                "index_in_doc": len(paragraphs),
                "anchor": None,
                "text": t,
                "is_heading": False,
            }
        )
    meta = {"source_file": str(path), "source_format": "txt",
            "paragraph_count": len(paragraphs)}
    return paragraphs, meta


def ingest(path: Path) -> tuple[list[dict], dict]:
    suffix = Path(path).suffix.lower()
    if suffix == ".epub":
        return ingest_epub(path)
    if suffix == ".pdf":
        return ingest_pdf(path)
    if suffix in (".txt", ".md"):
        return ingest_txt(path)
    raise SystemExit(f"unsupported source format: {suffix}")
