#!/usr/bin/env python3
"""Read-only asset/architecture inventory. No engine or optional Python packages required."""
from pathlib import Path
from collections import Counter, defaultdict
import datetime
import hashlib
import json
import re
import shutil
import struct
import subprocess

ROOT = Path(__file__).resolve().parents[2]

# Attribution is transcribed from the existing authored source report, not newly
# inferred from a download site's current availability.
MODEL_SOURCES = {
    "animal_horse_rancher.glb": ("Lyndon Daniels; ChadM", "CC0 1.0", "https://opengameart.org/content/rigged-horse"),
    "animal_horse.glb": ("Quaternius", "CC0 1.0", "https://poly.pizza/m/qvTrSG9pZF"),
    "animal_donkey.glb": ("Quaternius", "CC0 1.0", "https://poly.pizza/m/qmX6nhnvp7"),
    "animal_cow.glb": ("Quaternius", "CC0 1.0", "https://poly.pizza/m/26zM1outCr"),
    "animal_bull.glb": ("Quaternius", "CC0 1.0", "https://poly.pizza/m/a8PIIYwF7r"),
    "animal_husky.glb": ("Quaternius", "CC0 1.0", "https://poly.pizza/m/wcWiuEqwzq"),
    "animal_cat.glb": ("Quaternius", "CC0 1.0", "https://poly.pizza/m/qKICY6xla2"),
    "animal_hen1.glb": ("Poly by Google", "CC BY 3.0", "https://poly.pizza/m/8Unya0rw9tR"),
    "animal_rooster.glb": ("Poly by Google", "CC BY 3.0", "https://poly.pizza/m/6NTegstc5Jy"),
    "animal_goat1.glb": ("Poly by Google", "CC BY 3.0", "https://poly.pizza/m/d7dImmjtF8E"),
    "animal_pig.glb": ("BojanBabic / bokadigimon", "CC BY 4.0", "https://sketchfab.com/3d-models/pig-6d78fe9cec03483ba6d3e4ff30dc6265"),
    "animal_sheep.glb": ("hendrikReyneke", "CC BY 4.0", "https://sketchfab.com/3d-models/sheep-67abff7459f34afca11e3effab62c761"),
}

def load(path):
    return json.loads((ROOT / path).read_text())

def image_info(data):
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        w, h = struct.unpack_from(">II", data, 16)
        return {"format": "PNG", "width": w, "height": h}
    if data.startswith(b"\xff\xd8"):
        i = 2
        while i + 4 < len(data):
            if data[i] != 255:
                i += 1
                continue
            marker = data[i + 1]
            i += 2
            if marker in (0xd8, 0xd9) or marker == 0xff:
                continue
            length = struct.unpack_from(">H", data, i)[0]
            if marker in (0xc0, 0xc1, 0xc2, 0xc3):
                h, w = struct.unpack_from(">HH", data, i + 3)
                return {"format": "JPEG", "width": w, "height": h}
            if length < 2:
                break
            i += length
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        if data[12:16] == b"VP8X":
            w = 1 + int.from_bytes(data[24:27], "little")
            h = 1 + int.from_bytes(data[27:30], "little")
        elif data[12:16] == b"VP8L":
            v = int.from_bytes(data[21:25], "little")
            w, h = (v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1
        elif data[12:16] == b"VP8 " and len(data) > 30:
            w, h = struct.unpack_from("<HH", data, 26)
            w, h = w & 0x3fff, h & 0x3fff
        else:
            w = h = None
        return {"format": "WebP", "width": w, "height": h}
    return {"format": "unknown", "width": None, "height": None}

def gltf_info(path):
    blob = path.read_bytes()
    binary = b""
    if path.suffix.lower() == ".glb":
        magic, version, size = struct.unpack_from("<III", blob)
        if magic != 0x46546c67 or version != 2 or size != len(blob):
            raise ValueError("Invalid GLB header")
        length, kind = struct.unpack_from("<II", blob, 12)
        doc = json.loads(blob[20:20 + length])
        offset = 20 + length
        if offset + 8 <= len(blob):
            length, kind = struct.unpack_from("<II", blob, offset)
            binary = blob[offset + 8:offset + 8 + length]
    else:
        doc = json.loads(blob)
    accessors = doc.get("accessors", [])
    primitives, tris, vertices = 0, 0, 0
    bounds = []
    for mesh in doc.get("meshes", []):
        for p in mesh.get("primitives", []):
            primitives += 1
            a = accessors[p["attributes"]["POSITION"]]
            vertices += a["count"]
            n = accessors[p["indices"]]["count"] if "indices" in p else a["count"]
            mode = p.get("mode", 4)
            tris += n // 3 if mode == 4 else max(0, n - 2) if mode in (5, 6) else 0
            if "min" in a and "max" in a:
                bounds.append({"min": a["min"], "max": a["max"]})
    images = []
    for im in doc.get("images", []):
        record = {k: v for k, v in im.items() if k != "extras"}
        if "bufferView" in im and binary:
            view = doc["bufferViews"][im["bufferView"]]
            data = binary[view.get("byteOffset", 0):view.get("byteOffset", 0) + view["byteLength"]]
            record.update(image_info(data))
            record["encoded_bytes"] = len(data)
        images.append(record)
    animations = []
    for clip in doc.get("animations", []):
        end = [accessors[s["input"]].get("max", [None])[0] for s in clip.get("samplers", [])]
        animations.append({"name": clip.get("name"), "channels": len(clip.get("channels", [])), "duration_from_accessor_seconds": max([x for x in end if x is not None], default=None)})
    skins = doc.get("skins", [])
    joint_sets = {tuple(s["joints"]) for s in skins}
    root_nodes = doc.get("scenes", [{}])[doc.get("scene", 0)].get("nodes", [])
    roots = [{k: v for k, v in doc["nodes"][i].items() if k in ("name", "translation", "rotation", "scale", "matrix")} for i in root_nodes]
    return {"asset": doc.get("asset"), "meshes": len(doc.get("meshes", [])), "nodes": len(doc.get("nodes", [])),
        "primitives": primitives, "triangles_unique_mesh_definitions": tris, "vertices_unique_mesh_definitions": vertices,
        "materials": [{"name": m.get("name"), "alphaMode": m.get("alphaMode", "OPAQUE"), "doubleSided": m.get("doubleSided", False), "extensions": list(m.get("extensions", {}))} for m in doc.get("materials", [])],
        "images": images, "texture_slots": len(doc.get("textures", [])), "skin_definitions": len(skins),
        "joints_per_skin": [len(s["joints"]) for s in skins], "unique_joint_sets": len(joint_sets),
        "unique_joint_nodes": len(set().union(*(set(s["joints"]) for s in skins))) if skins else 0,
        "animations": animations, "morph_target_sets": sum(len(m.get("weights", [])) for m in doc.get("meshes", [])),
        "extensions_used": doc.get("extensionsUsed", []), "extensions_required": doc.get("extensionsRequired", []),
        "root_transforms": roots, "position_accessor_bounds": bounds,
        "orientation": "glTF right-handed, +Y up; forward/metric normalization must be checked against runtime placement",
        "count_limits": "Unique mesh primitive count, not scene instances. Bounds are accessor-local, possibly quantized; not a posed/world-space AABB. No mesh decoder executed."}

def main():
    sources = {str(p.relative_to(ROOT)): p.read_text() for p in (ROOT / "web/src").rglob("*.js")}
    graph = {}
    for path, text in sources.items():
        names = re.findall(r"(?:from\s*|import\s*\()\s*['\"]([^'\"]+)['\"]", text)
        graph[path] = [str((ROOT / path).parent.joinpath(q).resolve().relative_to(ROOT)) for q in names if q.startswith(".")]
    reachable = set()
    def visit(path):
        if path in reachable:
            return
        reachable.add(path)
        for child in graph.get(path, []):
            visit(child)
    visit("web/src/main.js")
    manifest = load("shared/assets/audio/manifest.json")["banks"]
    audio_sources = load("scripts/audio/sources.json")
    audio_sources.update(load("scripts/audio/extra_sources.json"))
    cuts = load("scripts/audio/cuts.json")
    banks_by_file = {v["file"]: (k, v) for k, v in manifest.items()}
    asset_paths = list((ROOT / "shared/assets").rglob("*")) + list((ROOT / "music").rglob("*")) + list((ROOT / "book_details/output").glob("*"))
    # Only project-specific source work, never Blender's bundled toolkit assets.
    for base in (".local/mh", ".local/animals", ".local/reference"):
        asset_paths += [p for p in (ROOT / base).rglob("*") if p.suffix.lower() in (".blend", ".fbx", ".gltf", ".glb", ".hdr", ".exr")]
    records, duplicates = [], defaultdict(list)
    ffprobe = shutil.which("ffprobe")
    for p in sorted(set(asset_paths)):
        if not p.is_file():
            continue
        path = str(p.relative_to(ROOT)); suffix = p.suffix.lower(); data = p.read_bytes(); digest = hashlib.sha256(data).hexdigest()
        record = {"path": path, "format": suffix.lstrip("."), "bytes": len(data), "sha256": digest,
            "domain": "runtime_metadata" if path.startswith("shared/assets/") and suffix == ".md" else "runtime" if path.startswith("shared/assets/") else "evidence" if path.startswith("book_details/output/") else "source_audio" if path.startswith("music/") else "local_source_or_experiment",
            "tracked": subprocess.run(["git", "ls-files", "--error-unmatch", "--", path], cwd=ROOT, capture_output=True).returncode == 0}
        duplicates[digest].append(path)
        if suffix in (".glb", ".gltf"):
            try:
                record["model"] = gltf_info(p)
            except Exception as exc:
                record["parse_error"] = str(exc)
            record["license_source_record"] = "docs/ASSETS.md; shared/assets/credits.json; model.asset.extras when present"
            record["direct_migration_suitability"] = "CONVERTIBLE: normalize required compression/quantization/image extensions; validate rig, morphs, materials, scale and clips"
            record["authorship"] = "externally authored + project-derived" if path.startswith("shared/assets/") else "source/intermediate; inspect source records before shipping"
            record["coordinate_orientation"] = {
                "format_convention": "glTF right-handed, +Y up, nominal metre units; root/node transforms may encode source conversion",
                "runtime_world": "+X east, +Y up, +Z south; character forward may be +Z and needs a presentation adapter",
                "verified_posed_bounds": False,
                "normalization_reference": "web/src/world/animals.js KIND/placement; web/src/world/people/figure.js and cast.json; asset recipes"
            }
            record["scale_record"] = "Not independently measured here; accessor bounds may be quantized/local. Verify runtime KIND/placement or character metadata before import."
            if path.startswith("shared/assets/") and p.name in MODEL_SOURCES:
                author, license_name, source_url = MODEL_SOURCES[p.name]
                record["license_details"] = {"author": author, "license": license_name, "source_url": source_url, "verification": "existing project attribution and embedded original metadata; not a new publisher licence verification"}
            if path.startswith("shared/assets/") and (p.name.startswith("head_") or p.name == "human_anims.glb"):
                record["license_details"] = {"author": "elbolilloduro scans" if p.name.startswith("head_") else "Quaternius / CMU / Mesh2Motion retargeting", "license": "CC0 1.0 as recorded in project source report", "source_url": "https://github.com/Mesh2Motion/mesh2motion-app", "verification": "existing project attribution; preserve original source notices"}
            if p.name.startswith("head_") or p.name in ("human_anims.glb", "animal_horse.glb") and path.startswith("shared/assets/"):
                record["runtime_status"] = "superseded live asset; retained as source/reference (human_anims also supports current motion conversion)"
            elif path.startswith("shared/assets/models/"):
                record["runtime_status"] = "loaded by current figure library or animal KIND mapping"
            if path.startswith("shared/assets/models/people/"):
                record["scale_record"] = "Current cast metadata heights in shared/assets/models/people/cast.json; metres after runtime normalization"
                record["license_details"] = "Mixed CC0 exported MakeHuman assets and CC BY apron/boots; motion origins Quaternius/CMU; preserve per-component credits"
            extras = record.get("model", {}).get("asset", {}).get("extras", {})
            if extras:
                record["embedded_provenance"] = extras
        elif suffix in (".png", ".jpg", ".jpeg", ".webp"):
            record["image"] = image_info(data)
            if path.startswith("shared/assets/textures/"):
                record["license_details"] = {"source": "Poly Haven PBR scans; see project credits", "license": "CC0 1.0", "record": "docs/ASSETS.md"}
                record["semantic_channel"] = "albedo (sRGB)" if p.stem.endswith("_d") else "normal (linear, verify OpenGL convention)" if p.stem.endswith("_n") else "packed ORM: occlusion R, roughness G, metalness B; current core material shares this map" if p.stem.endswith("_a") else "roughness" if p.stem.endswith("_r") else "inspect material mapping"
                record["runtime_mipmaps"] = "generated by Three TextureLoader defaults; anisotropy capped at 8"
        elif suffix in (".mp3", ".wav", ".ogg", ".flac", ".aif", ".aiff"):
            if ffprobe:
                r = subprocess.run([ffprobe, "-v", "error", "-show_entries", "format=duration:stream=codec_name,sample_rate,channels", "-of", "json", str(p)], capture_output=True, text=True)
                record["audio"] = json.loads(r.stdout) if r.returncode == 0 else {"probe_error": r.stderr[:300]}
            if p.name in banks_by_file and path.startswith("shared/assets/audio/"):
                bank, b = banks_by_file[p.name]; record["bank_id"] = bank; record["clips"] = b["clips"]
                record["playback"] = "streamed office music" if bank.startswith("chant:") else "decoded short bank, clips copied into separate buffers"
                record["sources"] = [dict(id=c["id"], crop=[c["start"], c["end"]], **audio_sources.get(c["id"], {"license": "not found; check source report"})) for c in cuts.get(bank, [])]
            elif "music" in path:
                record["playback"] = "original or complete review derivative; not assigned to normal gameplay"
                record["license_details"] = "User-supplied; distribution permission not recorded in repository"
        elif suffix == ".woff2":
            record["license_details"] = "SIL OFL; family notices under shared/assets/fonts/"
            record["direct_migration_suitability"] = "REUSABLE: Godot Phase 1 imports committed WOFF2; retain OFL notices and revalidate other engines"
        elif suffix in (".blend", ".fbx"):
            record["authorship"] = "project source/master or conversion intermediate; see recipes and licence records"
            record["direct_migration_suitability"] = "CONVERTIBLE: export a pinned runtime derivative; inspect rig, scale, axes, materials and clips in source tool"
            record["coordinate_orientation"] = "Source-tool axes/units not independently inspected by this inventory; no assumed metric native placement"
            record["license_source_record"] = "scripts/people/; scripts/models/; docs/ASSETS.md; source pack notices"
        elif record["domain"] == "evidence":
            record["direct_migration_suitability"] = "DIRECTLY REUSABLE as research; curate runtime subset, do not treat extracted graph as collision/navmesh"
            record["authorship"] = "generated extraction/consolidation with source citations and uncertainty"
            if suffix == ".jsonl":
                record["record_count"] = len(data.splitlines())
            elif suffix == ".json":
                doc = json.loads(data)
                record["keys"] = list(doc) if isinstance(doc, dict) else None
                record["record_count"] = len(doc) if isinstance(doc, list) else doc.get("edge_count", doc.get("total"))
        records.append(record)
    procedural = []
    for path, text in sources.items():
        if path.startswith(("web/src/world/", "web/src/core/")) and re.search(r"new THREE\.(?:\w*Geometry|Mesh|CanvasTexture|ShaderMaterial)|\bBatch\(|\bB\.(?:add|collider)\(", text):
            procedural.append({"path": path, "lines": len(text.splitlines()), "exported_definitions": re.findall(r"export\s+(?:async\s+)?(?:function|class|const)\s+(\w+)", text),
                "authorship": "project procedural", "migration_risk": "runtime geometry/shader/texture logic; no portable authored mesh exists for this definition", "sha256": hashlib.sha256(text.encode()).hexdigest()})
    data_paths = list((ROOT / "web/src/data").glob("*.js")) + [ROOT / p for p in ("web/src/core/plan.js", "web/src/systems/horarium.js", "web/src/systems/notes.js", "web/src/systems/worldState.js", "web/src/systems/zones.js", "web/src/world/people/schedule.js", "web/src/world/soundscape.js")]
    data_modules = [{"path": str(p.relative_to(ROOT)), "format": "JavaScript module", "classification": "CONVERTIBLE: export plain JSON, separate functions/Three vectors from declarative records"} for p in sorted(data_paths)]
    formats = Counter(r["format"] for r in records)
    runtime = [r for r in records if r["domain"] == "runtime"]
    result = {"schema_version": 1, "generated_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(), "root": str(ROOT),
        "head": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
        "method": "Read filesystem/GLB JSON/accessor counts/image headers; ffprobe local audio when available. Includes ignored project model masters, excludes toolkit/cache libraries and original books. No native import performed.",
        "summary": {"assets": len(records), "runtime_assets": len(runtime), "runtime_bytes": sum(r["bytes"] for r in runtime), "formats": dict(sorted(formats.items())), "runtime_formats": dict(sorted(Counter(r["format"] for r in runtime).items())),
            "no_project_assets_found_for": [x for x in ("fbx", "hdr", "exr", "ktx2", "gltf") if x not in formats], "procedural_definition_modules": len(procedural)},
        "assets": records, "procedural_definitions": procedural, "game_data_modules": data_modules,
        "architecture": {"import_graph": graph, "not_reachable_from_main": sorted(set(sources) - reachable), "known_cycle": ["web/src/world/aedificium.js", "web/src/world/aedLibrary.js", "web/src/world/aedificium.js"]},
        "exact_byte_duplicates": [v for v in duplicates.values() if len(v) > 1],
        "provenance_records": ["shared/assets/credits.json", "docs/ASSETS.md", "shared/provenance/model-sources.json", "scripts/audio/sources.json", "scripts/audio/extra_sources.json", "scripts/audio/cuts.json", "scripts/people/cast.json", "shared/provenance/"],
        "unresolved": ["Some per-model attribution is retained in structured legacy table rows, not GLB metadata", "Local source candidates do not inherit a shipping licence from neighbouring selected assets", "Whole-abbey procedural geometry and canvas textures are not yet portable section exports", "Current web GLBs are derivatives, not universally import-ready native assets", "No GPU, native importer, posed bounds or Blender topology validation in this filesystem inventory"]}
    (ROOT / "shared/provenance/asset-inventory.local.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(result["summary"], indent=2))

if __name__ == "__main__":
    main()
