class_name ObservationLog
extends RefCounted
## Things Adso has perceived himself (not a notebook): id, place and an
## Adso-style vague time ("on the road", "at the gate, during the bell").
## Only physical perception adds an entry (a look held long enough, being
## present at the moment); loads and study jumps never fabricate one. The
## meal question draws its answers from here. No evidence taxonomy yet.

signal observed(id: String)

var allowed: Dictionary = {}     # id -> definition
var entries: Dictionary = {}     # id -> {"t", "place", "when"}
var order: PackedStringArray = []

func _init(defs: Dictionary = {}) -> void:
	allowed = defs.duplicate(true)

func add(id: String, t: float, place: String, when: String) -> bool:
	if not allowed.has(id):
		push_warning("[observations] unknown id " + id)
		return false
	if entries.has(id):
		return false
	entries[id] = {"t": snappedf(t, 0.1), "place": place, "when": when}
	order.append(id)
	observed.emit(id)
	return true

func has(id: String) -> bool:
	return entries.has(id)

func to_dict() -> Dictionary:
	return {"entries": entries.duplicate(true), "order": Array(order)}

func restore(d: Dictionary) -> PackedStringArray:
	var warnings: PackedStringArray = []
	entries.clear()
	order.clear()
	var e: Variant = d.get("entries", {})
	for id: Variant in (d.get("order", []) as Array):
		if id is String and allowed.has(id) and e is Dictionary and (e as Dictionary).has(id):
			entries[id] = (e[id] as Dictionary).duplicate()
			order.append(id)
		else:
			warnings.append("dropped observation %s" % str(id))
	return warnings
