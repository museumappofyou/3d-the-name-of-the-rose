class_name Actor
extends RefCounted
## One stable person of the Day-1A scenario as the simulation knows him:
## where he is, where he is going and what he is doing. Presentations
## (CharacterPresentation rigs) follow an Actor; hiding or freeing a rig never
## moves, deletes or re-identifies him, and save data stores Actors only.
## Movement is continuous along polylines; nothing ever teleports an actor
## except an explicit authored (re)placement recorded with a reason.

var id: String
var pos: Vector3 = Vector3.ZERO          # feet; y = NAN means "on the ground here"
var yaw: float = 0.0                     # facing (rad, model +Z = forward)
var speed: float = 1.4                   # m/s when walking
var path: Array[Vector3] = []
var path_i: int = 0
var moving: bool = false
var activity: String = "stand"           # stand, idle, sit, read, work, talk, look, kneel, carry...
var carrying: String = ""                # prop id held, "" if none
var face_target: Variant = null          # Vector3 to turn toward when still
var look_target: Variant = null          # head look target (Vector3)
var present: bool = true                 # in the scene's footprint (not inside a closed building)
var arrived_tag: String = ""             # set when a path completes (consumed by the director)
var travelled_m: float = 0.0
var placements: Array = []               # [{t, reason}] — authored placements, audited by tests

func _init(actor_id: String, at: Vector3 = Vector3.ZERO, facing: float = 0.0) -> void:
	id = actor_id
	pos = at
	yaw = facing

func go(points: Array[Vector3], walk_speed: float, tag: String = "") -> void:
	path = points.duplicate()
	path_i = 1 if path.size() > 1 and Vector2(path[0].x - pos.x, path[0].z - pos.z).length() < 0.05 else 0
	speed = walk_speed
	moving = path_i < path.size()
	arrived_tag = ""
	_tag = tag

var _tag: String = ""

func stop() -> void:
	moving = false
	path.clear()
	path_i = 0

## Advance along the path. Returns true on the step the path completes.
func step(dt: float) -> bool:
	if not moving:
		return false
	var left: float = speed * dt
	while left > 0.0 and path_i < path.size():
		var target: Vector3 = path[path_i]
		var to := Vector2(target.x - pos.x, target.z - pos.z)
		var d: float = to.length()
		if d <= left:
			pos.x = target.x
			pos.z = target.z
			if not is_nan(target.y):
				pos.y = target.y
			left -= d
			travelled_m += d
			path_i += 1
		else:
			var u: Vector2 = to / d
			pos.x += u.x * left
			pos.z += u.y * left
			travelled_m += left
			if not is_nan(target.y) and not is_nan(pos.y):
				pos.y = lerpf(pos.y, target.y, clampf(left / d, 0.0, 1.0))
			yaw = atan2(u.x, u.y)
			left = 0.0
	if path_i >= path.size():
		moving = false
		arrived_tag = _tag if _tag != "" else "arrived"
		return true
	return false

func remaining_m() -> float:
	if not moving:
		return 0.0
	var L := 0.0
	var p := pos
	for i: int in range(path_i, path.size()):
		L += Vector2(path[i].x - p.x, path[i].z - p.z).length()
		p = path[i]
	return L

## Authored placement (spawn at a door, a person entering from offstage).
func place(at: Vector3, facing: float, t: float, reason: String) -> void:
	pos = at
	yaw = facing
	stop()
	placements.append({"t": snappedf(t, 0.01), "reason": reason})

func to_dict() -> Dictionary:
	var pts: Array = []
	for i: int in range(path_i, path.size()):
		pts.append([path[i].x, path[i].y if not is_nan(path[i].y) else null, path[i].z])
	return {"pos": [pos.x, pos.y if not is_nan(pos.y) else null, pos.z], "yaw": yaw, "speed": speed, "path": pts, "moving": moving,
		"activity": activity, "carrying": carrying, "present": present, "tag": _tag, "travelled_m": travelled_m}

func restore(d: Dictionary) -> void:
	var p: Array = d.get("pos", [pos.x, null, pos.z])
	pos = Vector3(float(p[0]), NAN if p[1] == null else float(p[1]), float(p[2]))
	yaw = float(d.get("yaw", yaw))
	speed = float(d.get("speed", speed))
	activity = String(d.get("activity", activity))
	carrying = String(d.get("carrying", ""))
	present = bool(d.get("present", true))
	_tag = String(d.get("tag", ""))
	travelled_m = float(d.get("travelled_m", 0.0))
	path.clear()
	path.append(Vector3(pos))
	for q: Array in d.get("path", []):
		path.append(Vector3(float(q[0]), NAN if q[1] == null else float(q[1]), float(q[2])))
	path_i = 1
	moving = bool(d.get("moving", false)) and path.size() > 1
