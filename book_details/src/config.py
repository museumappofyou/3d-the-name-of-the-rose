"""Configuration and paths for the abbey extraction pipeline (stdlib only)."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

DEFAULT_AGENT = "abbey-extractor"
DEFAULT_EXTRACTION_MODEL = "opencode-go/deepseek-v4.1-flash"
DEFAULT_CONSOLIDATION_MODEL = "opencode-go/deepseek-v4.1-flash"
DEFAULT_BACKEND = "opencode-cli"
ZEN_BASE_URL = "https://opencode.ai/zen/v1"

MAX_EVIDENCE_CHARS = 300


@dataclass
class Paths:
    root: Path

    data: Path = field(init=False)
    chunks: Path = field(init=False)
    cache: Path = field(init=False)
    cache_extraction: Path = field(init=False)
    cache_verify: Path = field(init=False)
    cache_consolidation: Path = field(init=False)
    output: Path = field(init=False)
    analysis: Path = field(init=False)
    reports: Path = field(init=False)

    def __post_init__(self) -> None:
        self.root = Path(self.root).resolve()
        self.data = self.root / "data"
        self.chunks = self.data / "chunks"
        self.cache = self.root / "cache"
        self.cache_extraction = self.cache / "extraction"
        self.cache_verify = self.cache / "extraction_verify"
        self.cache_consolidation = self.cache / "consolidation"
        self.output = self.root / "output"
        self.analysis = self.root / "analysis"
        # Generated reading views are local; structured output/ is canonical evidence.
        self.reports = self.root / "reports"
        for d in (
            self.data,
            self.chunks,
            self.cache,
            self.cache_extraction,
            self.cache_verify,
            self.cache_consolidation,
            self.output,
            self.analysis,
            self.reports,
        ):
            d.mkdir(parents=True, exist_ok=True)

    # convenience file paths
    @property
    def normalized_jsonl(self) -> Path:
        return self.data / "book_normalized.jsonl"

    @property
    def book_meta(self) -> Path:
        return self.data / "book_meta.json"

    @property
    def chunk_manifest(self) -> Path:
        return self.data / "chunk_manifest.jsonl"

    @property
    def entity_aliases(self) -> Path:
        return self.data / "entity_aliases.json"

    @property
    def possible_merges(self) -> Path:
        return self.data / "possible_entity_merges.json"

    @property
    def unresolved_references(self) -> Path:
        return self.data / "unresolved_references.json"

    @property
    def entity_inventory(self) -> Path:
        return self.data / "entity_inventory.json"

    @property
    def claims_jsonl(self) -> Path:
        return self.output / "claims.jsonl"

    @property
    def facts_json(self) -> Path:
        return self.output / "facts.json"

    @property
    def llm_usage(self) -> Path:
        return self.data / "llm_usage.jsonl"


def resolve_backend_api_key() -> str | None:
    """Find an API key for the OpenAI-compatible backend without hardcoding secrets."""
    for var in ("OPENCODE_ZEN_API_KEY", "OPENCODE_API_KEY", "OPENCODE_GO_API_KEY"):
        val = os.environ.get(var)
        if val:
            return val.strip()
    # fall back to the opencode local auth store (same account opencode itself uses)
    for candidate in (
        Path.home() / ".local/share/opencode/auth.json",
        Path.home() / ".config/opencode/auth.json",
    ):
        try:
            data = json.loads(candidate.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        entry = data.get("opencode-go") or data.get("opencode")
        if isinstance(entry, dict):
            key = entry.get("key") or entry.get("apiKey")
            if key:
                return str(key).strip()
    return None


def resolve_settings(args=None) -> "Settings":
    """Build Settings from CLI args and environment (no secrets logged)."""

    def arg(name, default=None):
        if args is None:
            return default
        val = getattr(args, name, None)
        return default if val is None else val

    def env(name, default=None):
        return os.environ.get(name, default)

    return Settings(
        backend=arg("backend") or env("ABBEY_LLM_BACKEND", DEFAULT_BACKEND),
        extraction_model=arg("model")
        or env("ABBEY_EXTRACTION_MODEL", DEFAULT_EXTRACTION_MODEL),
        consolidation_model=arg("consolidation_model")
        or env("ABBEY_CONSOLIDATION_MODEL", DEFAULT_CONSOLIDATION_MODEL),
        agent=arg("agent") or env("ABBEY_AGENT", DEFAULT_AGENT),
        chunk_size=int(arg("chunk_size") or env("ABBEY_CHUNK_SIZE", 3500)),
        overlap=int(arg("overlap") or env("ABBEY_OVERLAP", 600)),
        max_concurrency=int(
            arg("max_concurrency") or env("ABBEY_MAX_CONCURRENCY", 3)
        ),
        timeout=int(arg("timeout") or env("ABBEY_LLM_TIMEOUT", 900)),
        include_paratext=bool(arg("include_paratext", False)),
        api_base=env("OPENCODE_ZEN_BASE_URL", ZEN_BASE_URL),
        source=arg("source"),
        limit=int(arg("limit") or 0),
    )


@dataclass
class Settings:
    backend: str = DEFAULT_BACKEND
    extraction_model: str = DEFAULT_EXTRACTION_MODEL
    consolidation_model: str = DEFAULT_CONSOLIDATION_MODEL
    agent: str = DEFAULT_AGENT
    chunk_size: int = 3500
    overlap: int = 600
    max_concurrency: int = 3
    timeout: int = 900
    include_paratext: bool = False
    api_base: str = ZEN_BASE_URL
    source: str | None = None
    limit: int = 0
    api_key: str | None = None

    def as_dict(self) -> dict:
        d = dict(self.__dict__)
        d.pop("api_key", None)
        return d
