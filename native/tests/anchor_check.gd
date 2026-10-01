extends SceneTree
## Transform/scale anchor checks of the imported slice against the browser
## (shared/data/anchors.json `anchor_checks`, surveyed by app.groundY in
## the running browser), plus character-forward and altar-hinge checks.
##   godot --headless --path native --script res://tests/anchor_check.gd
## Exit 0 only if every check is within tolerance.

const TOL := 0.01
var content: ContentData
var world: WorldCells
var session: GameSession
var altar: AltarPortal
var _f := 0
var results: Array = []

func _initialize() -> void:
	content = ContentData.new()
	content.load_dir()
	session = GameSession.new(content, "user://test_saves/anchor", 15.0, 1)
	var r3 := Node3D.new()
	root.add_child(r3)
	world = WorldCells.new()
	world.resident_policy = false
	r3.add_child(world)
	world.setup(content)
	altar = AltarPortal.new()
	r3.add_child(altar)
	altar.setup(session, content)

func _physics_process(_d: float) -> bool:
	_f += 1
	if _f < 3:
		return false
	var space: PhysicsDirectSpaceState3D = world.get_world_3d().direct_space_state
	for c: Dictionary in content.doc("anchors")["anchor_checks"]:
		var at: Array = c["at"]
		var q := PhysicsRayQueryParameters3D.create(Vector3(at[0], float(c["from_y"]), at[1]), Vector3(at[0], float(c["from_y"]) - 5.0, at[1]), 1 | 2)
		q.hit_back_faces = true
		var h: Dictionary = space.intersect_ray(q)
		var y: float = (h["position"] as Vector3).y if not h.is_empty() else NAN
		var err: float = absf(y - float(c["expect_y"]))
		results.append({"id": c["id"], "expect_y": c["expect_y"], "godot_y": y, "error_m": err, "surface": world.surface_of(h.get("collider")), "pass": err <= TOL})
	# Alinardo's seat: root = bench top − 0.46 (people.js resolveY), same frame
	var bench: float = float(content.anchor("cloister.porchBenchTop")["y"])
	var seat: float = float(content.anchor("alinardo.seatRoot")["y"])
	results.append({"id": "seat-root", "expect": bench - 0.46, "value": seat, "pass": absf(seat - (bench - 0.46)) < 1e-6})
	# the altar hinge sits at the skull chapel's (skull.x0, y0, skull.z1)
	var plan: Dictionary = content.doc("anchors")["plan"]
	var hx: float = float(plan["SKULL_CHAPEL"]) - 0.72
	var hz: float = float(plan["CHURCH"]["zN"]) - 0.55
	var hinge: Vector3 = altar.global_position
	results.append({"id": "altar-hinge", "expect": [hx, 0.35, hz], "value": [hinge.x, hinge.y, hinge.z], "pass": hinge.distance_to(Vector3(hx, 0.35, hz)) < 1e-4})
	# opened, the altar turns −1.45 rad about +Y (west end hinge): its far
	# east corner swings from +X toward +Z (south), as in three.js
	session.portals.set_target("church:altar", 1)
	session.portals.snap("church:altar")
	altar._apply()
	var corner: Vector3 = altar.pivot.global_transform * Vector3(1.44, 0, 0)
	results.append({"id": "altar-pivot-direction", "value": [corner.x, corner.z], "expect": "east corner south of the hinge, x < hinge.x + 0.2", "pass": corner.z > hinge.z + 1.3 and corner.x < hinge.x + 0.2})
	# character forward: imported model front is +Z (eyes ahead of the head
	# bone along +Z in model space), so slot ry is applied unchanged
	var ps: PackedScene = load("res://assets/characters/alinardo/alinardo.glb")
	var m: Node3D = ps.instantiate()
	root.add_child(m)
	var sk: Skeleton3D = m.find_children("*", "Skeleton3D", true, false)[0]
	# toes (ball_*) lie ahead of the ankles (foot_*) along +Z in the
	# character frame: the model faces +Z (Godot MODEL_FRONT)
	var pf: Node3D = sk.get_parent() as Node3D
	var tp: Transform3D = pf.global_transform.affine_inverse() * sk.global_transform
	var fwd_l: float = (tp * sk.get_bone_global_rest(sk.find_bone("ball_l"))).origin.z - (tp * sk.get_bone_global_rest(sk.find_bone("foot_l"))).origin.z
	var fwd_r: float = (tp * sk.get_bone_global_rest(sk.find_bone("ball_r"))).origin.z - (tp * sk.get_bone_global_rest(sk.find_bone("foot_r"))).origin.z
	results.append({"id": "character-forward", "toe_ahead_of_ankle_z_m": [fwd_l, fwd_r], "pass": fwd_l > 0.05 and fwd_r > 0.05})
	# metric scale from cast.json: pelvis and head bone heights in the
	# character frame (1.0 m world = 1.0 m model, no import scale)
	var person: Node3D = sk.get_parent() as Node3D
	var to_person: Transform3D = person.global_transform.affine_inverse() * sk.global_transform
	var pelvis_y: float = (to_person * sk.get_bone_global_rest(sk.find_bone("pelvis"))).origin.y
	var head_y: float = (to_person * sk.get_bone_global_rest(sk.find_bone("head"))).origin.y
	var info: Dictionary = content.doc("cast")["people"]["alinardo"]
	results.append({"id": "character-metric-scale", "pelvis_m": pelvis_y, "cast_pelvis_m": info["pelvis"], "head_m": head_y, "cast_head_m": info["head"], "cast_height_m": info["height"], "pass": absf(pelvis_y - float(info["pelvis"])) < 0.01 and absf(head_y - float(info["head"])) < 0.01})
	m.free()
	var ok: bool = results.all(func(r: Dictionary) -> bool: return r["pass"])
	print(JSON.stringify({"pass": ok, "tolerance_m": TOL, "checks": results}, "  "))
	quit(0 if ok else 1)
	return true
