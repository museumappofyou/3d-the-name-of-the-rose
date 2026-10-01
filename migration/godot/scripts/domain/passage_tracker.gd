class_name PassageTracker
extends RefCounted
## The passage under the altar is noted only when walked (main.js
## trackPassage): the altar turned, the player seen standing by it on foot,
## then going down the steps without any study jump/teleport/load in
## between, within the approach window. Each later point of the passage
## reached on foot extends the notebook route.
##
## Times are seconds of a monotonic session clock supplied by the caller.

var path: Array[Vector2] = []
var start_radius: float = 4.5
var point_radius: float = 2.6
var below_y: float = -1.0
var at_altar_max_y: float = -0.4
var window_s: float = 45.0
var at_altar_time: float = -INF
var invalidated_at: float = 0.0
var active: bool = false
var index: int = -1

func _init(discoveries_doc: Dictionary, anchors_doc: Dictionary) -> void:
	var r: Dictionary = discoveries_doc.get("routes", {}).get("ossuary-passage", {})
	start_radius = float(r.get("start_radius_m", 4.5))
	point_radius = float(r.get("point_radius_m", 2.6))
	below_y = float(r.get("below_y", -1.0))
	at_altar_max_y = float(r.get("at_altar_max_feet_y", -0.4))
	window_s = float(r.get("approach_window_s", 45.0))
	for p: Array in anchors_doc.get("anchors", {}).get("ossuary.path", {}).get("points", []):
		path.append(Vector2(float(p[0]), float(p[1])))

## Any placement that is not a walk: study jump, debug teleport, save load.
func invalidate(now: float) -> void:
	invalidated_at = now
	active = false
	index = -1

## Returns the notebook events this step produced.
func update(now: float, feet: Vector3, room_id: String, altar_target: int, knowledge: KnowledgeState) -> Array[String]:
	var events: Array[String] = []
	if room_id == "skull" and altar_target == 1 and feet.y > at_altar_max_y:
		at_altar_time = now
	var below: bool = feet.y < below_y
	var f2 := Vector2(feet.x, feet.z)
	if not active and below and at_altar_time > invalidated_at and now - at_altar_time < window_s and path.size() > 0 and f2.distance_to(path[0]) < start_radius:
		active = true
		index = 0
		if knowledge.add("altar-passage"):
			events.append("altar-passage")
		if knowledge.route_to(0):
			events.append("route:0")
	if active and below:
		var i: int = index + 1
		if i < path.size() and f2.distance_to(path[i]) < point_radius:
			index = i
			if knowledge.route_to(i):
				events.append("route:%d" % i)
	return events
