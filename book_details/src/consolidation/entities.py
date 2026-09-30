"""Entity alias normalization (second pass over all entities)."""

from __future__ import annotations

from ..config import Paths
from ..extraction.prompts import ENTITY_ALIAS_PROMPT, render
from ..extraction.schema import parse_json_object
from ..llm import LLMClient, LLMError
from ..util import atomic_write_json, log, norm_key, read_json, sha1

BATCH = 160


def _resolve_chains(mapping: dict[str, str]) -> dict[str, str]:
    """Collapse A->B, B->C chains; drop self loops."""
    out = {}
    for key in mapping:
        seen = set()
        cur = key
        while cur in mapping and mapping[cur] != cur and cur not in seen:
            seen.add(cur)
            cur = mapping[cur]
        out[key] = cur
    return {k: v for k, v in out.items() if k != v}


def normalize_entities(paths: Paths, claims: list[dict], client: LLMClient,
                       model: str, *, use_llm: bool = True) -> tuple[list[dict], dict]:
    """Return (claims with canonical_entity, aliases payload)."""
    inventory = {}
    for c in claims:
        ent = c["entity"]
        entry = inventory.setdefault(ent, {"count": 0, "originals": {}})
        entry["count"] += 1
        if c.get("entity_original"):
            entry["originals"][c["entity_original"]] = (
                entry["originals"].get(c["entity_original"], 0) + 1
            )
    items = sorted(inventory.items(), key=lambda kv: -kv[1]["count"])

    alias_map: dict[str, str] = {}
    alias_groups: list[dict] = []
    possible_merges: list[dict] = []

    for start in range(0, len(items), BATCH):
        batch = items[start : start + BATCH]
        lines = []
        for ent, info in batch:
            originals = ", ".join(
                f"{o} ({n})" for o, n in sorted(info["originals"].items(),
                                               key=lambda kv: -kv[1])[:4]
            )
            lines.append(f"{ent} | {originals} | {info['count']}")
        inventory_text = "\n".join(lines)
        if not use_llm:
            continue
        cache_file = paths.cache_consolidation / f"aliases_{sha1(inventory_text)[:16]}.json"
        payload = read_json(cache_file)
        if payload is None:
            try:
                result = client.complete(
                    render(ENTITY_ALIAS_PROMPT, inventory=inventory_text),
                    model=model,
                    label="consolidate:aliases",
                    temperature=0.0,
                )
            except LLMError as exc:
                log(f"[aliases] LLM unavailable ({exc}); keeping raw entities for this batch")
                continue
            payload = parse_json_object(result.text)
            if not payload:
                log("[aliases] could not parse alias response; skipping batch")
                continue
            atomic_write_json(cache_file, payload)
        known = {ent for ent, _ in batch}
        for group in payload.get("aliases") or []:
            if not isinstance(group, dict):
                continue
            canonical = norm_key(str(group.get("canonical_entity") or "")).replace(" ", "_")
            if canonical not in known:
                continue
            aliases = []
            for a in group.get("aliases") or []:
                alias = norm_key(str(a)).replace(" ", "_")
                if alias and alias != canonical and alias in known:
                    aliases.append(alias)
            if not aliases:
                continue
            for a in aliases:
                # never silently overwrite a different mapping
                if a in alias_map and alias_map[a] != canonical:
                    possible_merges.append(
                        {
                            "entities": sorted({alias_map[a], canonical}),
                            "confidence": "low",
                            "reason": f"{a} mapped to two canonicals",
                        }
                    )
                else:
                    alias_map[a] = canonical
            alias_groups.append(
                {
                    "canonical_entity": canonical,
                    "aliases": aliases,
                    "confidence": str(group.get("confidence") or "medium"),
                    "reason": group.get("reason"),
                }
            )
        for pm in payload.get("possible_merges") or []:
            if not isinstance(pm, dict):
                continue
            ents = [norm_key(str(e)).replace(" ", "_") for e in pm.get("entities") or []]
            ents = [e for e in ents if e in known]
            if len(ents) >= 2:
                possible_merges.append(
                    {
                        "entities": ents,
                        "confidence": str(pm.get("confidence") or "low"),
                        "reason": pm.get("reason"),
                    }
                )

    alias_map = _resolve_chains(alias_map)

    # apply to claims
    for c in claims:
        c["canonical_entity"] = alias_map.get(c["entity"], c["entity"])
        if c.get("sub_entity"):
            c["canonical_sub_entity"] = alias_map.get(c["sub_entity"], c["sub_entity"])
        else:
            c["canonical_sub_entity"] = None

    payload = {
        "generated_by": model,
        "alias_groups": alias_groups,
        "alias_map": alias_map,
        "possible_merges": possible_merges,
        "n_aliases": len(alias_map),
    }
    atomic_write_json(paths.entity_aliases, payload)
    atomic_write_json(
        paths.possible_merges,
        {
            "note": "uncertain merges - NOT applied automatically",
            "possible_merges": possible_merges,
        },
    )
    log(f"[aliases] {len(alias_map)} alias mappings, "
        f"{len(possible_merges)} uncertain merges (kept separate)")
    return claims, payload
