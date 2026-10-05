class_name PeopleMemory
extends RefCounted
## What Adso knows about each person: first a description ("an old lay
## servant, limping"), then a name once he has heard it — never before.
## Subtitles and any later people page read this; nothing else knows names.

signal learned(person_id: String, name: String)

var people: Dictionary = {}      # id -> {"description", "name", "seen", "named_by", "met_at"}
var allowed: Dictionary = {}     # id -> {"description", "name"} from the scenario

func _init(scenario_people: Dictionary = {}) -> void:
	for id: String in scenario_people.keys():
		var d: Dictionary = scenario_people[id]
		allowed[id] = {"description": String(d.get("description", id)), "name": String(d.get("name", id)), "known_at_start": bool(d.get("known_at_start", false))}
		if bool(d.get("known_at_start", false)):
			people[id] = {"description": allowed[id]["description"], "name": allowed[id]["name"], "seen": true, "named_by": "start", "met_at": -1.0}

func seen(id: String, t: float) -> void:
	if not allowed.has(id) or people.has(id):
		return
	people[id] = {"description": allowed[id]["description"], "name": "", "seen": true, "named_by": "", "met_at": snappedf(t, 0.1)}

## A name heard (from the person himself or from someone else). Idempotent.
func hear_name(id: String, by: String, t: float) -> bool:
	if not allowed.has(id):
		push_warning("[people] unknown person " + id)
		return false
	seen(id, t)
	if String(people[id]["name"]) != "":
		return false
	people[id]["name"] = allowed[id]["name"]
	people[id]["named_by"] = by
	learned.emit(id, String(people[id]["name"]))
	return true

func knows_name(id: String) -> bool:
	return people.has(id) and String(people[id]["name"]) != ""

## The label Adso would use for this speaker right now.
func label(id: String) -> String:
	if knows_name(id):
		return String(people[id]["name"])
	return String(allowed.get(id, {}).get("description", id))

func to_dict() -> Dictionary:
	return people.duplicate(true)

func restore(d: Dictionary) -> PackedStringArray:
	var warnings: PackedStringArray = []
	for id: String in allowed.keys():
		if not bool(allowed[id]["known_at_start"]):
			people.erase(id)
	for id: Variant in d.keys():
		if not (id is String) or not allowed.has(id) or not (d[id] is Dictionary):
			warnings.append("dropped person %s" % str(id))
			continue
		var r: Dictionary = d[id]
		var nm: String = String(r.get("name", ""))
		people[id] = {"description": allowed[id]["description"], "name": allowed[id]["name"] if nm != "" else "", "seen": true, "named_by": String(r.get("named_by", "")), "met_at": float(r.get("met_at", -1.0))}
	return warnings
