class_name KnowledgeState
extends RefCounted
## Persistent knowledge (native counterpart of src/systems/notes.js): notes
## earned once each, the notebook route index along the ossuary passage and
## rooms physically visited. Additions are idempotent; unknown ids are
## rejected so a scene can never invent a discovery.

signal noted(id: String, extra: Dictionary)
signal route_advanced(index: int)

var allowed: PackedStringArray = []
var notes: Dictionary = {}     # id -> {"at": unix ms, "by": String?, "day": int, "hours": float}
var route: int = -1
var rooms: PackedStringArray = []

func _init(allowed_ids: PackedStringArray) -> void:
	allowed = allowed_ids

func has(id: String) -> bool:
	return notes.has(id)

## Record a note; true only the first time.
func add(id: String, extra: Dictionary = {}, at_ms: int = -1, day: int = 0, hours: float = -1.0) -> bool:
	if not allowed.has(id):
		push_warning("[knowledge] unknown discovery id rejected: " + id)
		return false
	if notes.has(id):
		return false
	var n: Dictionary = {"at": at_ms if at_ms >= 0 else int(Time.get_unix_time_from_system() * 1000.0)}
	if extra.has("by") and extra["by"] is String:
		n["by"] = extra["by"]
	if hours >= 0.0:
		n["day"] = day
		n["hours"] = hours
	notes[id] = n
	noted.emit(id, n)
	return true

func route_to(i: int) -> bool:
	if i <= route:
		return false
	route = clampi(i, -1, 100)
	route_advanced.emit(route)
	return true

func add_room(id: String) -> bool:
	if id == "" or rooms.has(id):
		return false
	rooms.append(id)
	return true

## Notes in the order they were noticed.
func ordered() -> Array:
	var ids: Array = notes.keys()
	ids.sort_custom(func(a: String, b: String) -> bool: return int(notes[a]["at"]) < int(notes[b]["at"]))
	return ids

func to_dict() -> Dictionary:
	return {"notes": notes.duplicate(true), "route": route, "rooms": Array(rooms)}

## notes.js restoreNotebook(): keep only known ids and well-formed fields.
func restore(d: Dictionary) -> PackedStringArray:
	var warnings: PackedStringArray = []
	notes.clear()
	var src: Variant = d.get("notes", {})
	if src is Dictionary:
		for id: Variant in (src as Dictionary).keys():
			var n: Variant = src[id]
			if not (id is String) or not allowed.has(id) or not (n is Dictionary):
				warnings.append("dropped note %s" % str(id))
				continue
			var at: Variant = (n as Dictionary).get("at", 0)
			var rec: Dictionary = {"at": int(at) if (at is int or at is float) else 0}
			if (n as Dictionary).get("by") is String:
				rec["by"] = n["by"]
			if (n as Dictionary).get("day") is int or (n as Dictionary).get("day") is float:
				rec["day"] = int(n["day"])
			if (n as Dictionary).get("hours") is int or (n as Dictionary).get("hours") is float:
				rec["hours"] = float(n["hours"])
			notes[id] = rec
	var r: Variant = d.get("route", -1)
	route = clampi(int(r), -1, 100) if (r is int or (r is float and is_equal_approx(r, roundf(r)))) else -1
	rooms.clear()
	var rr: Variant = d.get("rooms", [])
	if rr is Array:
		for x: Variant in rr:
			if x is String and not rooms.has(x) and rooms.size() < 56:
				rooms.append(x)
	return warnings
