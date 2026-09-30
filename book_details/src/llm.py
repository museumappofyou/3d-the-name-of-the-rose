"""LLM backends.

Two interchangeable backends:
  * ``opencode-cli``      - shells out to the local ``opencode run`` CLI, which
                            authenticates with the user's opencode account
                            (no API secret needed in the project).
  * ``openai-compatible`` - plain HTTP Chat Completions against any
                            OpenAI-compatible base URL (key from env).

Both return a CompletionResult with text + usage metadata.  Secrets are never
written to disk.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path

from .util import append_jsonl, log


class LLMError(RuntimeError):
    def __init__(self, message: str, *, retryable: bool = True, raw: str = ""):
        super().__init__(message)
        self.retryable = retryable
        self.raw = raw


@dataclass
class CompletionResult:
    text: str
    model: str
    backend: str
    usage: dict = field(default_factory=dict)
    duration_s: float = 0.0
    attempts: int = 1


class BaseBackend:
    name = "base"

    def complete(self, prompt: str, *, model: str, temperature: float | None = None,
                 system: str | None = None) -> CompletionResult:
        raise NotImplementedError


class OpenCodeCLIBackend(BaseBackend):
    """Runs ``opencode run`` as a subprocess and parses its JSON event stream."""

    name = "opencode-cli"

    def __init__(self, *, agent: str | None = None, cwd: Path | None = None,
                 timeout: int = 900, opencode_bin: str | None = None):
        self.agent = agent
        self.cwd = Path(cwd) if cwd else None
        self.timeout = timeout
        self.bin = opencode_bin or os.environ.get("OPENCODE_BIN") or shutil.which("opencode") or "opencode"

    def complete(self, prompt: str, *, model: str, temperature: float | None = None,
                 system: str | None = None) -> CompletionResult:
        if system:
            prompt = f"{system}\n\n{prompt}"
        cmd = [self.bin, "run", "--format", "json"]
        if self.agent:
            cmd += ["--agent", self.agent]
        if model:
            cmd += ["--model", model]
        cmd.append(prompt)

        start = time.time()
        try:
            proc = subprocess.run(
                cmd,
                cwd=str(self.cwd) if self.cwd else None,
                capture_output=True,
                text=True,
                timeout=self.timeout,
            )
        except subprocess.TimeoutExpired as exc:
            raise LLMError(
                f"opencode run timed out after {self.timeout}s",
                retryable=True,
                raw=(exc.stdout or "")[:2000] if isinstance(exc.stdout, str) else "",
            ) from exc

        duration = time.time() - start
        texts: list[str] = []
        usage: dict = {}
        errors: list[str] = []
        for line in (proc.stdout or "").splitlines():
            line = line.strip()
            if not line.startswith("{"):
                continue
            try:
                event = json.loads(line)
            except ValueError:
                continue
            etype = event.get("type")
            part = event.get("part") or {}
            if etype == "text":
                texts.append(part.get("text", ""))
            elif etype == "step_finish":
                toks = part.get("tokens") or {}
                usage = {
                    "input": toks.get("input"),
                    "output": toks.get("output"),
                    "reasoning": toks.get("reasoning"),
                    "total": toks.get("total"),
                    "cost": part.get("cost"),
                }
            elif etype == "error":
                err = event.get("error") or {}
                errors.append(json.dumps(err, ensure_ascii=False)[:500])

        text = "".join(texts).strip()
        if not text:
            raw = (proc.stderr or "")[-800:]
            detail = "; ".join(errors) if errors else raw
            raise LLMError(
                f"opencode run produced no text (exit={proc.returncode}): {detail}",
                retryable=True,
                raw=proc.stdout or "",
            )
        return CompletionResult(
            text=text,
            model=model,
            backend=self.name,
            usage=usage,
            duration_s=duration,
        )


class OpenAICompatBackend(BaseBackend):
    name = "openai-compatible"

    def __init__(self, *, api_base: str, api_key: str, timeout: int = 900):
        self.api_base = api_base.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout

    def complete(self, prompt: str, *, model: str, temperature: float | None = None,
                 system: str | None = None) -> CompletionResult:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        payload = {
            "model": model,
            "messages": messages,
            "temperature": 0.1 if temperature is None else temperature,
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            f"{self.api_base}/chat/completions",
            data=data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            },
            method="POST",
        )
        start = time.time()
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                body = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", "replace")
            # 4xx errors are usually fatal (auth/credit), 429/5xx retryable
            retryable = exc.code >= 500 or exc.code == 429
            raise LLMError(
                f"HTTP {exc.code} from {self.api_base}: {body[:300]}",
                retryable=retryable,
                raw=body,
            ) from exc
        except (urllib.error.URLError, TimeoutError) as exc:
            raise LLMError(f"network error: {exc}", retryable=True) from exc

        try:
            text = body["choices"][0]["message"]["content"] or ""
        except (KeyError, IndexError, TypeError) as exc:
            raise LLMError(
                f"unexpected response shape: {json.dumps(body)[:300]}",
                retryable=True,
                raw=json.dumps(body),
            ) from exc
        usage = body.get("usage") or {}
        return CompletionResult(
            text=text.strip(),
            model=model,
            backend=self.name,
            usage=usage,
            duration_s=time.time() - start,
        )


class LLMClient:
    """Retrying, usage-logging façade over a backend."""

    def __init__(self, backend: BaseBackend, *, usage_path: Path | None = None,
                 max_retries: int = 3, backoff_s: float = 3.0):
        self.backend = backend
        self.usage_path = Path(usage_path) if usage_path else None
        self.max_retries = max_retries
        self.backoff_s = backoff_s

    def complete(self, prompt: str, *, model: str, label: str = "",
                 temperature: float | None = None, system: str | None = None
                 ) -> CompletionResult:
        last_error: Exception | None = None
        for attempt in range(1, self.max_retries + 1):
            try:
                result = self.backend.complete(
                    prompt, model=model, temperature=temperature, system=system
                )
                result.attempts = attempt
                self._log_usage(label, result, error=None)
                return result
            except LLMError as exc:
                last_error = exc
                log(f"[llm] attempt {attempt}/{self.max_retries} failed ({label}): {exc}")
                if not exc.retryable or attempt == self.max_retries:
                    self._log_usage(label, None, error=str(exc))
                    raise
                time.sleep(self.backoff_s * attempt)
        raise last_error  # pragma: no cover

    def _log_usage(self, label: str, result: CompletionResult | None,
                   error: str | None) -> None:
        if not self.usage_path:
            return
        row = {
            "ts": time.time(),
            "label": label,
            "backend": self.backend.name,
            "model": result.model if result else None,
            "duration_s": round(result.duration_s, 2) if result else None,
            "attempts": result.attempts if result else None,
            "usage": result.usage if result else None,
            "error": error,
        }
        append_jsonl(self.usage_path, row)


def build_client(settings, paths) -> LLMClient:
    """Instantiate the configured backend."""
    backend_name = (settings.backend or "opencode-cli").lower()
    if backend_name == "opencode-cli":
        backend = OpenCodeCLIBackend(
            agent=getattr(settings, "agent", None),
            cwd=paths.root,
            timeout=settings.timeout,
        )
    elif backend_name in ("openai-compatible", "openai", "http"):
        from .config import resolve_backend_api_key

        key = settings.api_key or resolve_backend_api_key()
        if not key:
            raise SystemExit(
                "No API key found. Set OPENCODE_ZEN_API_KEY (or use "
                "--backend opencode-cli, which authenticates through opencode)."
            )
        backend = OpenAICompatBackend(
            api_base=settings.api_base, api_key=key, timeout=settings.timeout
        )
    else:
        raise SystemExit(f"unknown backend: {settings.backend}")
    return LLMClient(backend, usage_path=paths.llm_usage)
