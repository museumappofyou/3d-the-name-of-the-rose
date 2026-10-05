class_name LeadWait
extends RefCounted
## William's walking order on Day 1 (OPUS_DAY1_DESIGN §8.3), as route
## intelligence rather than general pursuit:
##   LEAD    he walks the authored route ~8 % faster than Adso's walk; the
##           gap grows slowly, so he is usually 5–7 m ahead;
##   WAIT    when Adso falls more than `wait_gap` behind, he stops at the
##           next authored look point (a stone, a hinge, a view) — never in
##           the middle of nothing — inspects it, and walks on once Adso is
##           within `resume_gap` (after a minimum dwell);
##   SHARE   if Adso stays put a long time, William comes back a few steps
##           and looks where Adso is looking (one short remark, once);
##   FOLLOW  if Adso overtakes him, he lets him lead and keeps `follow_gap`
##           behind him along the route; no reprimand;
##   DONE    at the end of the route.
## Distances are measured along the route (projection), so a wrong turn
## does not make William chase the player: he keeps to the way, visibly.

signal state_changed(old: String, new: String, info: Dictionary)

var p: Dictionary = {
	"wait_gap": 12.0, "resume_gap": 5.0, "follow_gap": 4.0, "overtake_margin": 1.5,
	"min_dwell": 2.2, "speed": 1.72, "look_ahead": 14.0, "share_after": 22.0, "share_back": 2.6, "cooldown_m": 25.0,
}
var route: Array[Vector3] = []
var cum: PackedFloat32Array = []
var look_points: Array = []      # {id, s, stand: Vector3, at: Vector3, dwell, line}
var state: String = "LEAD"
var target_lp: Dictionary = {}
var t_state: float = 0.0
var player_still_t: float = 0.0
var shared: bool = false
var used: Dictionary = {}        # look point id -> s when used
var waits: int = 0
var overtakes: int = 0
var last_info: Dictionary = {}

func setup(points: Array[Vector3], lps: Array, params: Dictionary = {}) -> void:
	route = points.duplicate()
	cum = PackedFloat32Array([0.0])
	for i: int in range(1, route.size()):
		cum.append(cum[i - 1] + Vector2(route[i].x - route[i - 1].x, route[i].z - route[i - 1].z).length())
	for k: String in params.keys():
		p[k] = params[k]
	look_points.clear()
	for lp: Dictionary in lps:
		var stand: Vector3 = lp["stand"]
		var d: Dictionary = lp.duplicate()
		d["s"] = progress(stand)
		look_points.append(d)
	look_points.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return float(a["s"]) < float(b["s"]))
	state = "LEAD"
	t_state = 0.0
	shared = false
	target_lp = {}

func length() -> float:
	return cum[cum.size() - 1] if cum.size() > 0 else 0.0

## Distance along the route of the point's projection.
func progress(q: Vector3) -> float:
	var best := INF
	var bs := 0.0
	for i: int in range(1, route.size()):
		var a := Vector2(route[i - 1].x, route[i - 1].z)
		var b := Vector2(route[i].x, route[i].z)
		var ab: Vector2 = b - a
		var L2: float = ab.length_squared()
		var t: float = 0.0 if L2 < 1e-6 else clampf((Vector2(q.x, q.z) - a).dot(ab) / L2, 0.0, 1.0)
		var d: float = (a + ab * t).distance_to(Vector2(q.x, q.z))
		if d < best:
			best = d
			bs = cum[i - 1] + sqrt(L2) * t
	return bs

func point_at(s: float) -> Vector3:
	s = clampf(s, 0.0, length())
	for i: int in range(1, route.size()):
		if s <= cum[i] or i == route.size() - 1:
			var seg: float = cum[i] - cum[i - 1]
			var t: float = 0.0 if seg < 1e-6 else (s - cum[i - 1]) / seg
			return route[i - 1].lerp(route[i], clampf(t, 0.0, 1.0))
	return route[route.size() - 1]

## Path along the route from progress s0 to s1 (s1 > s0), starting at `from`.
func path_between(from: Vector3, s1: float) -> Array[Vector3]:
	var out: Array[Vector3] = [from]
	var s0: float = progress(from)
	for i: int in range(1, route.size() - 1):
		if cum[i] > s0 + 0.2 and cum[i] < s1 - 0.2:
			out.append(route[i])
	out.append(point_at(s1))
	return out

func _change(st: String, info: Dictionary = {}) -> void:
	if st == state:
		return
	var old: String = state
	state = st
	t_state = 0.0
	last_info = info
	state_changed.emit(old, st, info)

## One tick. `w` is William's actor, `pl` Adso's feet, `pl_speed` his ground
## speed, `pl_look` the point Adso is looking at (or null). Returns the
## remark id to speak (SHARE) or "".
func tick(dt: float, w: Actor, pl: Vector3, pl_speed: float, pl_look: Variant) -> String:
	t_state += dt
	var sw: float = progress(w.pos)
	var sp: float = progress(pl)
	var gap: float = sw - sp
	player_still_t = player_still_t + dt if pl_speed < 0.25 else 0.0
	var remark := ""
	match state:
		"LEAD":
			if sw >= length() - 0.3:
				_change("DONE")
				w.stop()
			elif sp > sw + float(p["overtake_margin"]) and Vector2(pl.x - w.pos.x, pl.z - w.pos.z).length() < 8.0:
				overtakes += 1
				_change("FOLLOW", {"s": sp})
			elif gap > float(p["wait_gap"]):
				var lp: Dictionary = _next_look_point(sw)
				if not lp.is_empty():
					target_lp = lp
					used[lp["id"]] = sw
					var pts: Array[Vector3] = [w.pos]
					if float(lp["s"]) > sw + 0.3:
						pts = path_between(w.pos, float(lp["s"]))
					pts.append(lp["stand"])
					w.go(pts, float(p["speed"]) * 0.8, "lp")
					_change("TO_LOOK", {"look_point": lp["id"], "gap": gap})
				else:
					# nothing worth stopping for here: slow to a stroll
					_walk_on(w, sw, 0.55)
			else:
				# he keeps about 5–7 m ahead of a walking Adso: past ~6.5 m he
				# eases toward Adso's pace (a stopped Adso still falls behind)
				var k: float = 1.0
				if gap > 6.5:
					var match_k: float = maxf(0.55, pl_speed / float(p["speed"]) * 0.97)
					k = lerpf(1.0, minf(1.0, match_k), clampf((gap - 6.5) / 2.0, 0.0, 1.0))
				_walk_on(w, sw, k)
		"TO_LOOK":
			if not w.moving:
				waits += 1
				w.face_target = target_lp.get("at")
				w.look_target = target_lp.get("at")
				w.activity = String(target_lp.get("pose", "look"))
				_change("WAIT", {"look_point": target_lp.get("id", ""), "gap": gap})
		"WAIT":
			var close: bool = Vector2(pl.x - w.pos.x, pl.z - w.pos.z).length() < float(p["resume_gap"]) or gap < float(p["resume_gap"])
			if close and t_state >= float(target_lp.get("dwell", p["min_dwell"])):
				w.look_target = null
				w.face_target = null
				w.activity = "stand"
				_change("LEAD", {"waited_s": t_state})
			elif sp > sw + float(p["overtake_margin"]):
				w.look_target = null
				w.activity = "stand"
				overtakes += 1
				_change("FOLLOW", {"s": sp})
			elif not shared and player_still_t > float(p["share_after"]) and t_state > float(p["share_after"]):
				shared = true
				var back: float = maxf(sp + 1.5, sw - float(p["share_back"]))
				var pts2: Array[Vector3] = [w.pos, point_at(back)]
				w.go(pts2, 0.9, "share")
				_change("SHARE", {"gap": gap})
		"SHARE":
			if not w.moving:
				if pl_look != null:
					w.look_target = pl_look
					w.face_target = pl_look
				remark = "share"
				w.activity = "look"
				t_state = 0.0
				_change("WAIT", {"after_share": true})
		"FOLLOW":
			var want: float = sp - float(p["follow_gap"])
			# Adso has reached the end of the way: William closes up to it
			if sp > length() - 2.5:
				want = length()
			if sw >= length() - 0.3:
				_change("DONE")
				w.stop()
			elif sw < want - 0.5:
				w.go(path_between(w.pos, minf(want, length())), clampf(pl_speed, 0.9, float(p["speed"]) * 1.15), "follow")
			elif not w.moving or sw > want + 0.5:
				w.stop()
				w.face_target = pl
			if gap > 1.0 and sp < sw - 1.0:
				# Adso dropped back behind him again: William leads once more
				_change("LEAD", {"from_follow": true})
		"DONE":
			pass
	return remark

func _walk_on(w: Actor, sw: float, k: float) -> void:
	var speed: float = float(p["speed"]) * k
	if not w.moving or absf(w.speed - speed) > 0.05 or w.path.is_empty() or w.path[w.path.size() - 1].distance_to(route[route.size() - 1]) > 0.2:
		w.go(path_between(w.pos, length()), speed, "lead")
	w.activity = "walk"

func _next_look_point(sw: float) -> Dictionary:
	for lp: Dictionary in look_points:
		var s: float = lp["s"]
		if s < sw - 1.0 or s > sw + float(p["look_ahead"]):
			continue
		if used.has(lp["id"]) and sw - float(used[lp["id"]]) < float(p["cooldown_m"]):
			continue
		if used.has(lp["id"]) and lp.get("once", true):
			continue
		return lp
	return {}

func to_dict() -> Dictionary:
	return {"state": state, "t_state": t_state, "target_lp": target_lp.get("id", ""), "used": used.duplicate(), "waits": waits, "overtakes": overtakes, "shared": shared}

func restore(d: Dictionary) -> void:
	state = String(d.get("state", "LEAD"))
	t_state = float(d.get("t_state", 0.0))
	used = (d.get("used", {}) as Dictionary).duplicate()
	waits = int(d.get("waits", 0))
	overtakes = int(d.get("overtakes", 0))
	shared = bool(d.get("shared", false))
	var lid: String = String(d.get("target_lp", ""))
	target_lp = {}
	for lp: Dictionary in look_points:
		if lp["id"] == lid:
			target_lp = lp
	if state in ["TO_LOOK", "SHARE"]:
		state = "LEAD"   # a reload resumes walking; the actor's saved path carries the motion
