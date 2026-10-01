class_name Horarium
extends RefCounted
## The canonical hours, from shared/data/horarium.json (a verbatim
## extraction of src/systems/horarium.js). Hours are decimal 0..24.

var offices: Array = []
var phases: Array = []
var curfews: Dictionary = {}
var daylight: Dictionary = {}

func _init(doc: Dictionary) -> void:
	offices = doc.get("offices", [])
	phases = doc.get("phases", [])
	curfews = doc.get("curfew_rules", {})
	daylight = doc.get("daylight", {"after": 7.3, "before": 16.8})

## horarium.js wrap(): ((t % 24) + 24) % 24, rounded to 1e-9
static func wrap_hours(t: float) -> float:
	return roundf(fposmod(t, 24.0) * 1e9) / 1e9

func phase_at(t: float) -> Dictionary:
	t = wrap_hours(t)
	for p: Dictionary in phases:
		if t >= float(p["t0"]) and t < float(p["t1"]):
			return p
	return phases[0]

func office_at(t: float) -> Dictionary:
	t = wrap_hours(t)
	for o: Dictionary in offices:
		if t >= float(o["t0"]) and t < float(o["t1"]):
			return o
	return {}

func office_id(t: float) -> String:
	return String(office_at(t).get("id", ""))

func office_def(id: String) -> Dictionary:
	for o: Dictionary in offices:
		if o["id"] == id:
			return o
	return {}

func is_daylight(t: float) -> bool:
	t = wrap_hours(t)
	return t > float(daylight["after"]) and t < float(daylight["before"])

## horarium.js aedificiumBarred(): from the end of supper until Lauds
func curfew_barred(rule_id: String, t: float) -> bool:
	var r: Dictionary = curfews.get(rule_id, {})
	if r.is_empty():
		return false
	t = wrap_hours(t)
	var from_t := 24.0
	for p: Dictionary in phases:
		if p["id"] == r["barred_from_phase_end"]:
			from_t = float(p["t1"])
			break
	return t >= from_t or t < float(r["barred_until_hour"])
