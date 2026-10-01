class_name ChurchPath
extends RefCounted
## Port of src/systems/audio/churchPaths.js: the apparent position, level
## and low-pass of the choir's sound for a listener, through the church's
## openings (shared door/portal truth) and the skull-altar leak. Pure.

var C: Dictionary          # plan.CHURCH
var x0: float; var x_cross: float; var x_choir: float; var x_apse: float
var z_n: float; var z_s: float; var zc: float; var tn: float
var altar_src: Vector3
var altar_per_open: float = 0.025

func _init(anchors_doc: Dictionary, sounds_doc: Dictionary) -> void:
	C = anchors_doc["plan"]["CHURCH"]
	x0 = C["x0"]; x_cross = C["xCross"]; x_choir = C["xChoir"]; x_apse = C["xApse"]
	z_n = C["zN"]; z_s = C["zS"]; zc = C["zc"]; tn = C["transeptN"]
	var leak: Dictionary = sounds_doc.get("church_path", {}).get("altar_leak", {})
	var s: Array = leak.get("source", [x0 + 6.5 * (x_cross - x0) / 10.0, 0.35, z_n - 2.0])
	altar_src = Vector3(s[0], s[1], s[2])
	altar_per_open = float(leak.get("per_open", 0.025))

static func _clamp01(x: float) -> float: return clampf(x, 0.0, 1.0)
static func _fade(a: float, b: float, x: float) -> float:
	var t: float = _clamp01((x - a) / (b - a))
	return t * t * (3.0 - 2.0 * t)
static func _rect(p: Vector3, ax: float, bx: float, az: float, bz: float) -> float:
	return minf(minf(p.x - ax, bx - p.x), minf(p.z - az, bz - p.z))

## listener: {pos: Vector3 (ears), zone: String, inside: bool}
## doors: [{id, x, z, nx, nz, w, open, blocked}] (the four church openings)
func evaluate(listener_pos: Vector3, zone: String, zone_inside: bool, source: Vector3, doors: Array, altar_open: float, ref: float = 4.0) -> Dictionary:
	var L: Vector3 = listener_pos
	var field: float = maxf(maxf(_rect(L, x0, x_cross, z_n, z_s), _rect(L, x_cross, x_choir, tn, z_s)), maxf(_rect(L, x_choir, x_apse, zc - 4.6, zc + 4.6), minf(L.x - x_apse, 4.6 - Vector2(L.x - x_apse, L.z - zc).length())))
	var inside: float = 1.0 if field >= 0.0 else 0.0
	var nearest: float = INF
	var across: float = 0.0
	var paths: Array = []
	for d: Dictionary in doors:
		var dx: float = L.x - float(d["x"])
		var dz: float = L.z - float(d["z"])
		var outward: float = dx * float(d["nx"]) + dz * float(d["nz"])
		var lateral: float = absf(dx * float(d["nz"]) - dz * float(d["nx"]))
		var ld: float = Vector3(dx, L.y - 1.8, dz).length()
		var leg: float = Vector2(source.x - float(d["x"]), source.z - float(d["z"])).length()
		var open: float = _clamp01(0.0 if d.get("blocked", false) else float(d.get("open", 1.0)))
		if lateral < float(d["w"]) / 2.0 + 0.35 and absf(outward) < nearest:
			nearest = absf(outward)
			across = outward
		var facing: float = lerpf(0.10, 1.0, _fade(-1.2, 1.2, outward))
		var aperture: float = 1.0 / (1.0 + maxf(0.0, lateral - float(d["w"]) / 2.0) / 12.0)
		var transmission: float = (0.015 + 0.435 * open) * facing * aperture
		var total: float = leg + ld
		var amplitude: float = transmission * ref / maxf(ref, total)
		paths.append({"id": d["id"], "pos": Vector3(float(d["x"]), 1.8, float(d["z"])), "ld": ld, "total": total, "open": open, "amplitude": amplitude, "weight": pow(amplitude, 4.0)})
	if nearest < 1.5:
		inside = 1.0 - _fade(-1.5, 1.5, across)
	var floor_k: float = _fade(-0.5, 0.65, L.y) * (1.0 - _fade(4.2, 6.0, L.y))
	var direct_dist: float = source.distance_to(L)
	var direct: float = ref / maxf(ref, direct_dist)
	var p := source
	var external := 0.0
	var lp := 500.0
	var sum := 0.0
	var path_distance: float = direct_dist
	for q: Dictionary in paths:
		sum += float(q["weight"])
	if sum > 0.0:
		p = Vector3.ZERO
		path_distance = 0.0
		var open_w := 0.0
		var dist_w := 0.0
		for q: Dictionary in paths:
			var w: float = float(q["weight"]) / sum
			p += (q["pos"] as Vector3) * w
			external += float(q["amplitude"]) * w
			open_w += float(q["open"]) * w
			dist_w += float(q["ld"]) * w
			path_distance += float(q["total"]) * w
		lp = 420.0 + open_w * (800.0 + 1800.0 / (1.0 + dist_w / 5.0))
	if zone_inside and not ["church", "choir", "skull", "porch", "cloister", "narthex"].has(zone):
		external *= 0.025
	var pos: Vector3 = p.lerp(source, inside)
	var pan_distance: float = pos.distance_to(L)
	var wanted: float = lerpf(external, direct, inside) * floor_k
	var level: float = wanted / (ref / maxf(ref, pan_distance))
	# the skull altar is the only local route to the lower spaces
	if L.y < 0.65 and altar_open > 0.0:
		var dd: float = Vector3(L.x - altar_src.x, L.y - 0.35, L.z - altar_src.z).length()
		var leak: float = altar_open * altar_per_open * (1.0 - _fade(5.0, 14.0, dd))
		if leak > level:
			pos = altar_src
			level = leak
			lp = 650.0
	return {"pos": pos, "level": level, "lp": lerpf(lp, maxf(2400.0, 14000.0 / (1.0 + direct_dist / 35.0)), inside * floor_k), "inside": inside * floor_k, "distance": lerpf(path_distance, direct_dist, inside)}
