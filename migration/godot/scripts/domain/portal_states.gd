class_name PortalStates
extends RefCounted
## Shared physical truth of portals (src/systems/worldState.js): target and
## eased open fraction. Collision, navigation and acoustic adapters all read
## this one record, so they cannot disagree.

signal target_changed(id: String, target: int)

var defs: Dictionary = {}
var state: Dictionary = {}   # id -> {"open": float, "target": int, "blocked": bool}

func _init(portals_doc: Dictionary) -> void:
	for p: Dictionary in portals_doc.get("portals", []):
		defs[p["id"]] = p
		var init: Dictionary = p.get("initial", {})
		state[p["id"]] = {"open": float(init.get("open", 1.0 if p.get("always_open", false) else 0.0)), "target": int(init.get("target", 1 if p.get("always_open", false) else 0)), "blocked": false}

func has(id: String) -> bool:
	return state.has(id)

func target(id: String) -> int:
	return int(state.get(id, {}).get("target", 0))

func open_amount(id: String) -> float:
	return float(state.get(id, {}).get("open", 0.0))

func set_target(id: String, t: int) -> void:
	if not state.has(id):
		return
	t = clampi(t, 0, 1)
	if int(state[id]["target"]) == t:
		return
	state[id]["target"] = t
	target_changed.emit(id, t)

## three MathUtils.damp: lerp toward target by 1 - exp(-rate * dt)
func update(dt: float) -> void:
	for id: String in state.keys():
		var rate: float = float(defs[id].get("damp_rate", 1.6))
		var s: Dictionary = state[id]
		s["open"] = lerpf(float(s["open"]), float(s["target"]), 1.0 - exp(-rate * dt))

## The altar's dynamic collider is solid until it has turned 40 % open.
func collider_enabled(id: String) -> bool:
	return open_amount(id) < float(defs.get(id, {}).get("collider_enabled_below_open", 0.4))

func snap(id: String) -> void:
	if state.has(id):
		state[id]["open"] = float(state[id]["target"])

func to_dict() -> Dictionary:
	var out: Dictionary = {}
	for id: String in state.keys():
		if defs[id].get("always_open", false) or defs[id].get("fixture", false):
			continue
		out[id] = {"open": float(state[id]["open"]), "target": int(state[id]["target"])}
	return out

func restore(d: Dictionary) -> PackedStringArray:
	var w: PackedStringArray = []
	for id: Variant in d.keys():
		if not (id is String) or not state.has(id) or not (d[id] is Dictionary):
			w.append("dropped portal %s" % str(id))
			continue
		var r: Dictionary = d[id]
		var t: int = int(r.get("target", 0))
		var o: float = float(r.get("open", t))
		if t < 0 or t > 1 or o < 0.0 or o > 1.0 or is_nan(o):
			w.append("invalid portal state %s" % id)
			continue
		state[id]["target"] = t
		state[id]["open"] = o
	return w
