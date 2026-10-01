extends SceneTree
## Compares Godot's evaluated fitted-task poses with the engine-independent
## reference (scripts/migration/pose_reference.mjs). Exit 0 only if every
## sampled bone agrees within TOL metres.
## godot --headless --path native --script res://tests/pose_check.gd -- alinardo <reference.json>

const TOL := 0.001
var _id: String
var _ref: Dictionary
var _inst: Node3D
var _frames := 0

func _initialize() -> void:
	var args: PackedStringArray = OS.get_cmdline_user_args()
	_id = args[0] if args.size() > 0 else "alinardo"
	var ref_path: String = args[1] if args.size() > 1 else ""
	_ref = JSON.parse_string(FileAccess.get_file_as_string(ref_path))
	var ps: PackedScene = load("res://assets/characters/%s/%s.glb" % [_id, _id])
	_inst = ps.instantiate()
	root.add_child(_inst)

func _process(_dt: float) -> bool:
	_frames += 1
	if _frames < 2:
		return false
	var ap: AnimationPlayer = _inst.find_children("*", "AnimationPlayer", true, false)[0]
	var sk: Skeleton3D = _inst.find_children("*", "Skeleton3D", true, false)[0]
	var person: Node3D = sk.get_parent() as Node3D
	var worst := 0.0
	var worst_at := ""
	var checked := 0
	var report: Dictionary = {}
	for clip: String in (_ref["clips"] as Dictionary).keys():
		var c: Dictionary = _ref["clips"][clip]
		report[clip] = {"godot_length": ap.get_animation(clip).length, "ref_duration": c["duration"], "max_err_m": 0.0}
		for t_key: String in (c["samples"] as Dictionary).keys():
			ap.play(clip)
			ap.seek(float(t_key), true)
			var bones: Dictionary = c["samples"][t_key]
			for b: String in bones.keys():
				var i: int = sk.find_bone(b)
				var g: Transform3D = person.global_transform.affine_inverse() * sk.global_transform * sk.get_bone_global_pose(i)
				var r: Array = bones[b]
				var e: float = g.origin.distance_to(Vector3(r[0], r[1], r[2]))
				checked += 1
				report[clip]["max_err_m"] = maxf(report[clip]["max_err_m"], e)
				if e > worst:
					worst = e
					worst_at = "%s t=%s %s godot=%s ref=%s" % [clip, t_key, b, g.origin, r]
	# imported normals: no constant-+Z parts (the shipped cast's shared-skin
	# defect, restored by normalize_people.mjs), and every vertex normal on
	# the same side as its faces (Godot front faces wind clockwise)
	var normals: Dictionary = {}
	var normals_ok := true
	for mi: Node in sk.find_children("*", "MeshInstance3D", true, false):
		var arr: Array = (mi as MeshInstance3D).mesh.surface_get_arrays(0)
		var pos: PackedVector3Array = arr[Mesh.ARRAY_VERTEX]
		var nrm: PackedVector3Array = arr[Mesh.ARRAY_NORMAL]
		var idx: PackedInt32Array = arr[Mesh.ARRAY_INDEX]
		var face := PackedVector3Array()
		face.resize(pos.size())
		for t: int in range(0, idx.size(), 3):
			var f: Vector3 = (pos[idx[t + 2]] - pos[idx[t]]).cross(pos[idx[t + 1]] - pos[idx[t]])
			for k: int in 3: face[idx[t + k]] += f
		var plus_z := 0
		var agree := 0
		for i: int in nrm.size():
			if nrm[i].is_equal_approx(Vector3(0, 0, 1)): plus_z += 1
			if nrm[i].dot(face[i]) > 0.0: agree += 1
		var part: String = String(mi.name).trim_prefix(_id + "_")
		var pz: float = float(plus_z) / maxf(1.0, nrm.size())
		var ag: float = float(agree) / maxf(1.0, nrm.size())
		var part_ok: bool = pz < 0.5 and ag > 0.85   # authored habits 0.92; the +Z defect ~0.5
		normals[part] = {"vertices": nrm.size(), "plus_z_share": pz, "face_agreement": ag, "pass": part_ok}
		normals_ok = normals_ok and part_ok
	var ok: bool = worst <= TOL and normals_ok
	print(JSON.stringify({"person": _id, "checked_bone_samples": checked, "max_error_m": worst, "worst": worst_at, "tolerance_m": TOL, "pass": ok, "clips": report, "normals": normals, "normals_pass": normals_ok}, "  "))
	quit(0 if ok else 1)
	return true
