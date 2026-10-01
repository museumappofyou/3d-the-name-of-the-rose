class_name RoomClassifier
extends RefCounted
## Explicit room volumes (shared/data/locations.json), tested in priority
## order with the browser's test point (feet + 0.3 m). Deterministic and
## independent of render cells.

var rooms: Array = []        # sorted by priority, highest first
var fallback: Dictionary = {}
var by_id: Dictionary = {}

func _init(locations_doc: Dictionary) -> void:
	for r: Dictionary in locations_doc.get("rooms", []):
		by_id[r["id"]] = r
		if r.get("fallback", false):
			fallback = r
		else:
			rooms.append(r)
	rooms.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return int(a["priority"]) > int(b["priority"]))

func classify_feet(feet: Vector3) -> Dictionary:
	return classify(feet + Vector3(0, 0.3, 0))

func classify(p: Vector3) -> Dictionary:
	for r: Dictionary in rooms:
		for b: Array in r["boxes"]:
			if p.x >= float(b[0]) and p.x <= float(b[3]) and p.y >= float(b[1]) and p.y <= float(b[4]) and p.z >= float(b[2]) and p.z <= float(b[5]):
				return r
	return fallback

func room(id: String) -> Dictionary:
	return by_id.get(id, fallback)
