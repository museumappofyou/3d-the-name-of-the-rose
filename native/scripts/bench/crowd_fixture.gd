class_name CrowdFixture
extends Node3D
## 46-presentation stress mode (benchmark only, never saved, never a story
## identity): synthetic ids bench:00..45 in the browser's choir slots, four
## fitted cast templates, varied fitted tasks (standSleeves, standBow,
## kneelPray, kneelBow) and phases. Animation cadence follows the browser
## (people.js): every frame within 30 m, alternate frames to 60 m, frozen
## beyond; face parts within ~9 m, sun shadows indoors only near and by day.

var figures: Array[CharacterPresentation] = []
var slots: Array = []
var anim_usec_last: int = 0
var anim_updates_last: int = 0
var _tick: bool = false
var session: GameSession
var shadows: bool = true   # diagnostic knob (--crowd-shadow=off)

func setup(s: GameSession, content: ContentData) -> void:
	session = s
	var c: Dictionary = content.doc("crowd")
	if c.is_empty():
		c = JSON.parse_string(FileAccess.get_file_as_string("res://content/crowd.json"))
	slots = c["slots"]
	for sl: Dictionary in slots:
		var f := CharacterPresentation.new()
		f.content = content
		f.person_id = String(sl["template"])
		f.seed_value = int(sl["seed"])
		f.name = String(sl["id"]).replace(":", "_")
		f.position = Vector3(float(sl["x"]), float(sl["y"]), float(sl["z"]))
		f.rotation.y = float(sl["ry"])
		f.set_meta("benchmark_id", sl["id"])
		add_child(f)
		f.build()
		f.play_pose(String(sl["pose"]), float(sl["phase"]))
		figures.append(f)

func _process(dt: float) -> void:
	var cam: Camera3D = get_viewport().get_camera_3d()
	if cam == null:
		return
	var cp: Vector3 = cam.global_position
	var t0: int = Time.get_ticks_usec()
	var n: int = 0
	_tick = not _tick
	var night: bool = session != null and not session.horarium.is_daylight(session.clock.hours)
	for f: CharacterPresentation in figures:
		var d: float = Vector2(f.global_position.x - cp.x, f.global_position.z - cp.z).length()
		var dd: float = f.global_position.distance_to(cp)
		f.set_detail(dd < 9.0, shadows and dd < 10.0 and not night)
		if d < 30.0 or (d < 60.0 and _tick):
			f.advance_presentation(dt if d < 30.0 else dt * 2.0)
			n += 1
	anim_usec_last = Time.get_ticks_usec() - t0
	anim_updates_last = n

func census() -> Dictionary:
	var skins: Dictionary = {}
	var parts: int = 0
	for f: CharacterPresentation in figures:
		skins[f.skeleton.get_instance_id()] = true
		for p: String in f.parts.keys():
			var mi: MeshInstance3D = f.parts[p]
			if mi.visible:
				parts += 1
	var templates: Dictionary = {}
	var poses: Dictionary = {}
	for s: Dictionary in slots:
		templates[s["template"]] = int(templates.get(s["template"], 0)) + 1
		poses[s["pose"]] = int(poses.get(s["pose"], 0)) + 1
	var tris: int = 0
	for f: CharacterPresentation in figures:
		for p: String in f.parts.keys():
			var mi: MeshInstance3D = f.parts[p]
			if mi.visible:
				tris += _tris(mi.mesh)
	return {"presentations": figures.size(), "skeletons": skins.size(), "visible_skin_parts": parts, "visible_skinned_triangles": tris, "templates": templates, "poses": poses, "anim_us_last": anim_usec_last, "anim_updates_last": anim_updates_last}

static func _tris(m: Mesh) -> int:
	var n: int = 0
	for i: int in m.get_surface_count():
		var idx: PackedInt32Array = m.surface_get_arrays(i)[Mesh.ARRAY_INDEX]
		n += idx.size() / 3
	return n
