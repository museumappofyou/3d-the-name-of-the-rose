class_name Routines
extends RefCounted
## Availability of stable logical actors by canonical phase (schedule.js
## scene()). Independent of presentations: a hidden or freed rig never
## changes who is where.

var defs: Dictionary = {}

func _init(routines_doc: Dictionary) -> void:
	for r: Dictionary in routines_doc.get("routines", []):
		defs[r["entity_id"]] = r

func available(entity_id: String, ctx: RuleContext) -> bool:
	var r: Dictionary = defs.get(entity_id, {})
	return not r.is_empty() and Conditions.eval(r["available_when"], ctx)

func slot(entity_id: String) -> Dictionary:
	return defs.get(entity_id, {}).get("slot", {})
