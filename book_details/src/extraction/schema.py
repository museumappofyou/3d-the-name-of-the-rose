"""Structured-output parsing, salvage repair and schema validation."""

from __future__ import annotations

import json
import re

from ..util import clamp_text, norm_key
from .prompts import CATEGORIES, CERTAINTIES, RELATIONS

FENCE_RE = re.compile(r"```(?:json)?\s*(.*?)```", re.S)


# --------------------------------------------------------------------------
# JSON extraction / repair
# --------------------------------------------------------------------------

def _balanced_object(text: str, start: int) -> str | None:
    """Return the balanced {...} substring starting at `start` (string-aware)."""
    depth = 0
    in_str = False
    esc = False
    for i in range(start, len(text)):
        ch = text[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
    return None


def strip_fences(text: str) -> str:
    m = FENCE_RE.search(text or "")
    if m:
        return m.group(1).strip()
    return (text or "").strip()


def parse_json_object(text: str) -> dict | None:
    """Best-effort parse of a JSON object from model output.

    Objects that actually contain a "claims" key win over nested fragments
    (important when the model output is truncated mid-array).
    """
    cleaned = strip_fences(text)
    first_dict = None
    for m in re.finditer(r"\{", cleaned):
        candidate = _balanced_object(cleaned, m.start())
        if not candidate:
            continue
        try:
            obj = json.loads(candidate)
        except ValueError:
            continue
        if not isinstance(obj, dict):
            continue
        if "claims" in obj or "unresolved_references" in obj:
            return obj
        if first_dict is None:
            first_dict = obj
    if first_dict is not None:
        return first_dict
    try:
        obj = json.loads(cleaned)
        return obj if isinstance(obj, dict) else None
    except ValueError:
        return None


def salvage_claims(text: str) -> dict | None:
    """Recover complete claim objects from a truncated JSON array.

    Safe structured repair: only syntactically complete objects are kept.
    """
    cleaned = strip_fences(text)
    m = re.search(r'"claims"\s*:\s*\[', cleaned)
    if not m:
        return None
    i = m.end()
    claims = []
    while i < len(cleaned):
        while i < len(cleaned) and cleaned[i] in " \t\r\n,":
            i += 1
        if i >= len(cleaned) or cleaned[i] == "]":
            break
        if cleaned[i] != "{":
            break
        obj_text = _balanced_object(cleaned, i)
        if not obj_text:
            break
        try:
            obj = json.loads(obj_text)
            if isinstance(obj, dict):
                claims.append(obj)
        except ValueError:
            break
        i += len(obj_text)
    if not claims:
        return None
    unresolved = []
    um = re.search(r'"unresolved_references"\s*:\s*\[', cleaned[m.end() :] if False else cleaned)
    if um:
        # salvage complete objects inside the unresolved array as well
        j = um.end()
        while j < len(cleaned):
            while j < len(cleaned) and cleaned[j] in " \t\r\n,":
                j += 1
            if j >= len(cleaned) or cleaned[j] != "{":
                break
            obj_text = _balanced_object(cleaned, j)
            if not obj_text:
                break
            try:
                obj = json.loads(obj_text)
                if isinstance(obj, dict):
                    unresolved.append(obj)
            except ValueError:
                break
            j += len(obj_text)
    return {"claims": claims, "unresolved_references": unresolved, "_salvaged": True}


# --------------------------------------------------------------------------
# Validation
# --------------------------------------------------------------------------

def _canon_entity(value) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    text = norm_key(text).replace(" ", "_")
    return text or None


def _clean_relation(value):
    if not isinstance(value, dict):
        return None
    subject = _canon_entity(value.get("subject"))
    obj = _canon_entity(value.get("object"))
    relation = norm_key(str(value.get("relation") or "")).lower().replace(" ", "_")
    if not (subject and obj and relation in RELATIONS):
        return None
    return {"subject": subject, "relation": relation, "object": obj}


def _clean_movement(value):
    if not isinstance(value, dict):
        return None
    frm = _canon_entity(value.get("from"))
    to = _canon_entity(value.get("to"))
    if not (frm or to):
        return None
    via = value.get("via") or []
    if isinstance(via, str):
        via = [via]
    return {
        "from": frm,
        "to": to,
        "via": [e for e in (_canon_entity(v) for v in via) if e][:8],
        "direction": str(value.get("direction")) if value.get("direction") else None,
        "level_change": str(value.get("level_change")) if value.get("level_change") else None,
        "route_text": clamp_text(value.get("route_text"), 200),
    }


def _clean_visibility(value):
    if not isinstance(value, dict):
        return None
    obs = value.get("observer_location")
    observed = value.get("observed")
    obs = str(obs).strip() if obs else None
    observed = str(observed).strip() if observed else None
    if not (obs or observed):
        return None
    return {
        "observer_location": obs,
        "observed": observed,
        "kind": str(value.get("kind") or "visible_from"),
    }


def _clean_access(value):
    if not isinstance(value, dict):
        return None
    space = value.get("space")
    rule = norm_key(str(value.get("rule") or "")).lower()
    if not space and not rule:
        return None
    return {
        "space": str(space).strip() if space else None,
        "rule": rule or None,
        "who": str(value.get("who")).strip() if value.get("who") else None,
        "when": str(value.get("when")).strip() if value.get("when") else None,
    }


def _clean_geometry(value):
    if not isinstance(value, dict):
        return None
    measurement = value.get("measurement")
    if isinstance(measurement, str):
        m = re.search(r"-?\d+(?:[.,]\d+)?", measurement)
        measurement = m.group(0).replace(",", ".") if m else None
    if measurement is not None:
        try:
            measurement = float(measurement)
        except (TypeError, ValueError):
            measurement = None
    shape = value.get("shape")
    unit = value.get("unit")
    rel = value.get("relative_size")
    if all(x is None for x in (shape, measurement, unit, rel)):
        return None
    return {
        "shape": str(shape).strip() if shape else None,
        "measurement": measurement,
        "unit": str(unit).strip() if unit else None,
        "relative_size": str(rel).strip() if rel else None,
    }


def validate_claim(raw: dict, *, chunk: dict, seq: int) -> tuple[dict | None, str | None]:
    """Return (claim, warning). claim is None when the record is unusable."""
    if not isinstance(raw, dict):
        return None, "claim is not an object"
    entity = _canon_entity(raw.get("entity"))
    if not entity:
        return None, "missing entity"

    warnings = []
    category = str(raw.get("category") or "").strip().lower().replace(" ", "_")
    if category not in CATEGORIES:
        warnings.append(f"unknown category '{category}' -> other")
        category = "other"
    certainty = str(raw.get("certainty") or "").strip().upper()
    if certainty not in CERTAINTIES:
        warnings.append(f"unknown certainty '{certainty}' -> AMBIGUOUS")
        certainty = "AMBIGUOUS"

    valid_paras = set(chunk.get("paragraph_indices") or [])
    raw_paras = raw.get("paragraph_indices")
    if isinstance(raw_paras, (int, str)):
        raw_paras = [raw_paras]
    paragraph_indices = []
    for p in raw_paras or []:
        try:
            pi = int(p)
        except (TypeError, ValueError):
            continue
        if pi in valid_paras and pi not in paragraph_indices:
            paragraph_indices.append(pi)
    if raw_paras and not paragraph_indices:
        warnings.append("paragraph_indices do not belong to this chunk")
    if not paragraph_indices:
        warnings.append("no paragraph_indices")

    evidence = clamp_text(raw.get("evidence_fragment"), 300)
    if not evidence:
        warnings.append("empty evidence_fragment")

    relation = _clean_relation(raw.get("normalized_relation"))
    if relation is None and isinstance(raw.get("normalized_relation"), dict):
        warnings.append("dropped invalid normalized_relation")
    movement = _clean_movement(raw.get("movement"))
    if category == "movement" and movement is None:
        warnings.append("movement category without valid movement object")
    visibility = _clean_visibility(raw.get("visibility"))
    access = _clean_access(raw.get("access_rule"))
    geometry = _clean_geometry(raw.get("geometry"))

    sub_entity = _canon_entity(raw.get("sub_entity"))
    claim = {
        "local_id": str(raw.get("claim_local_id") or f"c{seq}"),
        "entity": entity,
        "sub_entity": sub_entity,
        "entity_original": clamp_text(raw.get("entity_original"), 120),
        "category": category,
        "attribute": norm_key(str(raw.get("attribute") or "")).lower().replace(" ", "_") or None,
        "value": clamp_text(raw.get("value"), 300),
        "normalized_relation": relation,
        "geometry": geometry,
        "movement": movement,
        "visibility": visibility,
        "access_rule": access,
        "function": clamp_text(raw.get("function"), 200),
        "sensory_detail": raw.get("sensory_detail") if isinstance(raw.get("sensory_detail"), dict) else (
            clamp_text(raw.get("sensory_detail"), 200) if raw.get("sensory_detail") else None
        ),
        "temporal_state": clamp_text(raw.get("temporal_state"), 200),
        "certainty": certainty,
        "paragraph_indices": paragraph_indices,
        "evidence_fragment": evidence,
        "notes": clamp_text(raw.get("notes"), 300),
        "validation_warnings": warnings,
    }
    return claim, ("; ".join(warnings) if warnings else None)


def validate_payload(payload: dict, chunk: dict) -> dict:
    """Validate a parsed payload against the chunk. Returns a normalized result."""
    if not isinstance(payload, dict):
        return {"claims": [], "rejected": [{"reason": "payload is not an object"}],
                "unresolved_references": [], "warnings": ["payload is not an object"]}
    raw_claims = payload.get("claims")
    if not isinstance(raw_claims, list):
        raw_claims = []
    claims, rejected, warnings = [], [], []
    if payload.get("_salvaged"):
        warnings.append("payload was salvaged from truncated output")
    for i, rc in enumerate(raw_claims, start=1):
        claim, warning = validate_claim(rc, chunk=chunk, seq=i)
        if claim is None:
            rejected.append({"reason": warning or "invalid", "raw": rc})
        else:
            claims.append(claim)

    unresolved = []
    for ref in payload.get("unresolved_references") or []:
        if isinstance(ref, dict) and ref.get("reference"):
            unresolved.append(
                {
                    "reference": clamp_text(ref.get("reference"), 200),
                    "context": clamp_text(ref.get("context"), 300),
                    "reason": clamp_text(ref.get("reason"), 200),
                }
            )
        elif isinstance(ref, str):
            unresolved.append({"reference": clamp_text(ref, 200), "context": None,
                               "reason": None})
    return {
        "claims": claims,
        "rejected": rejected,
        "unresolved_references": unresolved,
        "warnings": warnings,
    }
