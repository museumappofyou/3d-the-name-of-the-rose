class_name ContentData
extends RefCounted
## Reviewed, engine-independent phase-1 content (res://content/*.json,
## published by scripts/migration/build_content.py from shared/data/).
## Literary/access rules read ids from here; no rule depends on a scene
## node name.

const FILES: PackedStringArray = ["horarium", "locations", "entities", "portals", "routines", "discoveries", "interactions", "sounds", "anchors", "provenance", "world", "cast", "crowd"]

var docs: Dictionary = {}
var errors: PackedStringArray = []
var revision: String = ""

func load_dir(dir: String = "res://content") -> bool:
	errors.clear()
	for f: String in FILES:
		var path: String = dir.path_join(f + ".json")
		if not FileAccess.file_exists(path):
			errors.append("missing " + path)
			continue
		var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
		if not (parsed is Dictionary):
			errors.append("invalid JSON " + path)
			continue
		docs[f] = parsed
	var mp: String = dir.path_join("content_manifest.json")
	if FileAccess.file_exists(mp):
		revision = FileAccess.get_sha256(mp).substr(0, 16)
	_validate_refs()
	return errors.is_empty()

func _validate_refs() -> void:
	if not docs.has("interactions") or not docs.has("anchors"):
		return
	for it: Dictionary in docs["interactions"]["interactions"]:
		if not anchors().has(it["anchor_id"]):
			errors.append("interaction %s: unknown anchor %s" % [it["id"], it["anchor_id"]])
	for r: Dictionary in docs["routines"]["routines"]:
		if not anchors().has(r["slot"]["anchor_id"]):
			errors.append("routine %s: unknown anchor" % r["entity_id"])

func doc(name: String) -> Dictionary:
	return docs.get(name, {})

func anchors() -> Dictionary:
	return doc("anchors").get("anchors", {})

func anchor(id: String) -> Dictionary:
	return anchors().get(id, {})

## Anchor as a world position (x, y, z); a missing y defaults to `y_default`.
func anchor_pos(id: String, y_default: float = 0.0) -> Vector3:
	var a: Dictionary = anchor(id)
	return Vector3(float(a.get("x", 0.0)), float(a.get("y", y_default)), float(a.get("z", 0.0)))

func discovery(id: String) -> Dictionary:
	for d: Dictionary in doc("discoveries").get("discoveries", []):
		if d["id"] == id:
			return d
	return {}

func discovery_ids() -> PackedStringArray:
	var out: PackedStringArray = []
	for d: Dictionary in doc("discoveries").get("discoveries", []):
		out.append(d["id"])
	return out

func derived_rules() -> Dictionary:
	return doc("discoveries").get("derived", {})

func interaction(id: String) -> Dictionary:
	for d: Dictionary in doc("interactions").get("interactions", []):
		if d["id"] == id:
			return d
	return {}

func portal(id: String) -> Dictionary:
	for d: Dictionary in doc("portals").get("portals", []):
		if d["id"] == id:
			return d
	return {}

func routine(entity_id: String) -> Dictionary:
	for d: Dictionary in doc("routines").get("routines", []):
		if d["entity_id"] == entity_id:
			return d
	return {}

func person(id: String) -> Dictionary:
	for e: Dictionary in doc("entities").get("entities", []):
		if e["id"] == id:
			return e
	return doc("cast").get("people", {}).get(id, {})
