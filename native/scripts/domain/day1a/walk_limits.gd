class_name WalkLimits
extends RefCounted
## The Day-1A footprint as authored polygons (x/z, optional minimum height).
## A step that would leave every polygon is slid along the edge of the
## polygon Adso is in. Walls and terrain colliders still do the real work;
## these limits only close the open edges of the slice (the road shelf's
## drop, the gardens beyond the avenue, the far end of the gate court).

var polys: Array = []      # {"id", "pts": PackedVector2Array, "y_min"}

func _init(defs: Array = []) -> void:
	for d: Dictionary in defs:
		var pts := PackedVector2Array()
		for q: Array in d["poly"]:
			pts.append(Vector2(float(q[0]), float(q[1])))
		polys.append({"id": String(d["id"]), "pts": pts, "y_min": float(d.get("y_min", -INF))})

func inside(p: Vector3) -> String:
	for P: Dictionary in polys:
		if p.y >= float(P["y_min"]) - 0.5 and Geometry2D.is_point_in_polygon(Vector2(p.x, p.z), P["pts"]):
			return String(P["id"])
	return ""

## The allowed position for a step from `from` to `to`.
func allowed(from: Vector3, to: Vector3) -> Vector3:
	if polys.is_empty() or inside(to) != "":
		return to
	var home: String = inside(from)
	if home == "":
		return to          # placed outside (a load, a study jump): never trap
	for P: Dictionary in polys:
		if P["id"] != home:
			continue
		var pts: PackedVector2Array = P["pts"]
		var q := Vector2(to.x, to.z)
		var best := Vector2(from.x, from.z)
		var bd := INF
		for i: int in pts.size():
			var a: Vector2 = pts[i]
			var b: Vector2 = pts[(i + 1) % pts.size()]
			var c: Vector2 = Geometry2D.get_closest_point_to_segment(q, a, b)
			var d: float = c.distance_to(q)
			if d < bd:
				bd = d
				# a hair inside the edge
				var n: Vector2 = (b - a).orthogonal().normalized()
				var inward: Vector2 = n if Geometry2D.is_point_in_polygon(c + n * 0.05, pts) else -n
				best = c + inward * 0.03
		return Vector3(best.x, to.y, best.y)
	return to
