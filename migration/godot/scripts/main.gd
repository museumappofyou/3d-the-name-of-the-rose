extends Node3D
## Phase-1 slice composition. User args after `--`:
##   --scenario=play|route|crowd|cycles|soak|shots|functional|functional-reload|fixture|startup
##   --gi=none|sdfgi|ssil   --vsync=off   --out=<absolute dir>   --duration=<s>
##   --time=<hours>   --save-dir=user://...   --crowd (add the 46-presentation choir)

var content: ContentData
var session: GameSession
var cells: WorldCells
var altar: AltarPortal
var lighting: LightingRig
var player: PlayerController
var alinardo: AlinardoPresence
var probe: InteractionProbe
var audio: AudioDirector
var hud: Hud
var fixture: DoorFixture
var crowd: CrowdFixture
var args: Dictionary = {}
var paused: bool = false
var boundary_points: Array = []

func _ready() -> void:
	args = Game.args
	content = Content.db
	session = Game.session
	if not content.errors.is_empty():
		push_error("content errors: %s" % [content.errors])
	if args.has("debug-draw"):
		get_viewport().debug_draw = {"lighting": Viewport.DEBUG_DRAW_LIGHTING, "unshaded": Viewport.DEBUG_DRAW_UNSHADED, "normal": Viewport.DEBUG_DRAW_NORMAL_BUFFER, "overdraw": Viewport.DEBUG_DRAW_OVERDRAW}.get(String(args["debug-draw"]), Viewport.DEBUG_DRAW_DISABLED)
	if args.has("msaa"):
		get_viewport().msaa_3d = {"0": Viewport.MSAA_DISABLED, "2": Viewport.MSAA_2X, "4": Viewport.MSAA_4X}.get(String(args["msaa"]), Viewport.MSAA_2X)
	if String(args.get("vsync", "on")) == "off":
		DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_DISABLED)
	cells = WorldCells.new()
	cells.name = "world"
	add_child(cells)
	cells.setup(content)
	altar = AltarPortal.new()
	altar.name = "skull_altar"
	add_child(altar)
	altar.setup(session, content)
	lighting = LightingRig.new()
	lighting.name = "lighting"
	add_child(lighting)
	lighting.setup(session, content, String(args.get("gi", "none")), args)
	player = PlayerController.new()
	player.name = "player"
	add_child(player)
	player.setup(session, cells)
	alinardo = AlinardoPresence.new()
	alinardo.name = "alinardo"
	add_child(alinardo)
	alinardo.player_eye = func() -> Variant: return player.eye_position()
	alinardo.setup(session, content)
	probe = InteractionProbe.new()
	probe.name = "interaction"
	add_child(probe)
	probe.setup(session, player, content)
	probe.set_presence("alinardo", func() -> bool: return session.available("alinardo"))
	probe.set_presence("fixture-door", func() -> bool: return session.room_id.begins_with("fixture"))
	audio = AudioDirector.new()
	audio.name = "audio"
	add_child(audio)
	audio.setup(session, content, player)
	hud = Hud.new()
	hud.name = "hud"
	add_child(hud)
	hud.setup(session, content)
	fixture = DoorFixture.new()
	fixture.name = "door_fixture"
	add_child(fixture)
	fixture.setup(session, content, player)
	_boundaries()
	if String(args.get("sun-shadow", "on")) == "off":
		lighting.sun.shadow_enabled = false
	if args.has("crowd") or String(args.get("scenario", "")) in ["crowd", "soak"]:
		add_crowd()
	probe.prompt_changed.connect(func(_id: String, label: String) -> void: hud.set_prompt(label))
	session.room_changed.connect(_on_room)
	session.clock.time_set.connect(func(h: float, _j: bool) -> void: lighting.apply_time(h))
	session.clock.phase_changed.connect(func(_a: String, _b: String) -> void: lighting.apply_time(session.clock.hours))
	hud.request.connect(_on_request)
	# start on the cloister walk before Alinardo's bench, looking at him
	var porch: Vector3 = content.anchor_pos("cloister.porch")
	player.teleport(Vector3(porch.x + 2.4, 0.3, porch.z), PI / 2.0, "start")
	lighting.apply_time(session.clock.hours)
	_on_room("", session.room_id)
	var sc: String = String(args.get("scenario", "play"))
	if sc != "play":
		var b := Benchmark.new()
		b.name = "benchmark"
		add_child(b)
		b.setup(self, sc, args)
	else:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func add_crowd() -> void:
	if crowd != null:
		return
	crowd = CrowdFixture.new()
	crowd.name = "crowd_benchmark"
	add_child(crowd)
	crowd.shadows = String(args.get("crowd-shadow", "on")) != "off"
	crowd.setup(session, content)

func _on_room(_old: String, new_id: String) -> void:
	var r: Dictionary = session.rooms.room(new_id)
	lighting.set_room_darkness(float(r.get("darkness", 0.0)) if bool(r.get("indoor", false)) else 0.0)
	cells.apply_residency(new_id)

## Temporary phase-1 boundaries: the labelled ossuary limit, and quiet
## barriers in doorways that lead to spaces outside the exported slice.
func _boundaries() -> void:
	var b: Dictionary = content.anchor("boundary.ossuary")
	var n := Vector2(float(b["normal"][0]), float(b["normal"][1]))
	var wall := StaticBody3D.new()
	wall.name = "boundary_ossuary"
	wall.collision_layer = 1
	var cs := CollisionShape3D.new()
	var bs := BoxShape3D.new()
	bs.size = Vector3(3.2, 3.0, 0.2)
	cs.shape = bs
	wall.add_child(cs)
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = bs.size
	mi.mesh = bm
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(0.05, 0.045, 0.04)
	m.roughness = 1.0
	mi.material_override = m
	mi.layers = 2
	wall.add_child(mi)
	var lbl := Label3D.new()
	lbl.text = "TEMPORARY PHASE-1 TEST BOUNDARY\nossuary.chapelBottom — the passage continues\nto the kitchen in the browser reference"
	lbl.font_size = 40
	lbl.pixel_size = 0.0022   # longest line ≈ 2.2 m on the 3.2 m wall
	lbl.position = Vector3(0, 0.3, -0.12)
	lbl.rotation.y = PI
	lbl.modulate = Color(0.95, 0.82, 0.55)
	lbl.layers = 2
	wall.add_child(lbl)
	wall.position = Vector3(float(b["x"]), float(b["y"]) + 1.5, float(b["z"]))
	wall.rotation.y = atan2(n.x, n.y)
	add_child(wall)
	boundary_points.append({"pos": wall.position, "text": "Temporary phase-1 test boundary (ossuary.chapelBottom)"})
	for d: Dictionary in content.doc("anchors").get("doors_in_slice", []):
		if String(d["id"]) == "church:cloister":
			continue
		var bar := StaticBody3D.new()
		bar.name = "boundary_" + String(d["id"]).replace(":", "_")
		bar.collision_layer = 1
		var c2 := CollisionShape3D.new()
		var s2 := BoxShape3D.new()
		s2.size = Vector3(float(d["w"]) + 0.4, 3.0, 0.3)
		c2.shape = s2
		bar.add_child(c2)
		var veil := MeshInstance3D.new()
		var vm := QuadMesh.new()
		vm.size = Vector2(float(d["w"]), 2.6)
		veil.mesh = vm
		var vmat := StandardMaterial3D.new()
		vmat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		vmat.albedo_color = Color(0.02, 0.018, 0.015)
		veil.material_override = vmat
		veil.position = Vector3(0, -0.2, 0.18)
		bar.add_child(veil)
		var nx: float = float(d["nx"])
		var nz: float = float(d["nz"])
		bar.position = Vector3(float(d["x"]) + nx * 0.4, float(d.get("y", 0.35)) + 1.5, float(d["z"]) + nz * 0.4)
		bar.rotation.y = atan2(nx, nz) + PI
		add_child(bar)
		boundary_points.append({"pos": bar.position, "text": "Outside the phase-1 slice (%s)" % d["id"]})

func _process(_dt: float) -> void:
	var near := ""
	for b: Dictionary in boundary_points:
		if (b["pos"] as Vector3).distance_to(player.global_position + Vector3(0, 1.5, 0)) < 2.4:
			near = b["text"]
	hud.show_boundary(near)
	if hud.stats_label.visible:
		hud.set_stats("%d fps · %d draws · %dk prims · room %s · cells %d" % [Engine.get_frames_per_second(), Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME), int(Performance.get_monitor(Performance.RENDER_TOTAL_PRIMITIVES_IN_FRAME) / 1000), session.room_id, cells.cells.size()])

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("pause"):
		if hud.any_panel() and not hud.pause_panel.visible:
			hud.notebook.visible = false
			hud.debug_panel.visible = false
			_capture(true)
		else:
			set_paused(not paused)
	elif paused:
		return
	elif event.is_action_pressed("interact"):
		var r: Dictionary = probe.activate()
		if String(r.get("sound", "")) != "":
			audio.play_sound(r["sound"])
	elif event.is_action_pressed("notebook"):
		hud.toggle_notebook()
		_capture(not hud.notebook.visible)
	elif event.is_action_pressed("lantern"):
		lighting.set_lantern(not lighting.lantern_on)
	elif event.is_action_pressed("debug_panel"):
		hud.toggle_debug()
		_capture(not hud.debug_panel.visible)
	elif event.is_action_pressed("save_game"):
		_on_request("save", null)
	elif event.is_action_pressed("load_game"):
		_on_request("load", null)

func _capture(on: bool) -> void:
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED if on else Input.MOUSE_MODE_VISIBLE
	player.input_enabled = on

func set_paused(on: bool) -> void:
	paused = on
	get_tree().paused = false
	session.clock.paused = on
	player.input_enabled = not on
	hud.show_pause(on, "Saves: %s" % ProjectSettings.globalize_path(session.saves.path()))
	_capture(not on)

func do_load() -> Dictionary:
	var r: Dictionary = session.load_now()
	if r["snapshot"] != null:
		player.global_position = session.feet
		player.velocity = Vector3.ZERO
		player.yaw = session.yaw
		player.pitch = session.pitch
		lighting.apply_time(session.clock.hours)
	return r

func _on_request(action: String, arg: Variant) -> void:
	match action:
		"resume":
			set_paused(false)
		"save":
			var err: String = session.save_now()
			var msg: String = "Saved." if err == "" else "Save failed: " + err
			hud.show_toast(msg, 2500)
			hud.pause_status.text = msg + "  " + ProjectSettings.globalize_path(session.saves.path())
		"load":
			var r: Dictionary = do_load()
			var msg: String = ("Loaded (%s)." % r["source"]) if r["snapshot"] != null else "Nothing to load: %s" % ", ".join(r["report"])
			if r["source"] == "backup":
				msg = "Main save was invalid; recovered from the backup. " + ", ".join(r["report"])
			hud.show_toast(msg, 4000)
			hud.pause_status.text = msg
		"quit":
			get_tree().quit()
		"time":
			session.clock.set_time(float(arg), true)
		"rate":
			session.clock.rate = 0.0 if session.clock.rate > 0.0 else float(arg) / 3600.0
		"jump":
			study_jump(String(arg))
		"reset":
			session.saves.delete_all()
			session.knowledge.restore({})
			session.portals.restore({"church:altar": {"open": 0.0, "target": 0}})
			hud.show_toast("Test save and knowledge reset.", 2500)
		"stats":
			hud.stats_label.visible = not hud.stats_label.visible

## Study jumps (QA): placement, never traversal — the passage approach is
## invalidated exactly as by the browser's study jumps.
func study_jump(where: String) -> void:
	var a: Dictionary = {
		"porch": [content.anchor_pos("cloister.porch") + Vector3(2.4, -0.05, 0), PI / 2.0],
		"door": [Vector3(28.08, 0.35, 4.2), 0.0],
		"altar": [Vector3(15.372, 0.35, -12.4), 0.0],
		"landing": [Vector3(15.372, -2.8, -20.3), PI],
		"fixture_out": [content.anchor_pos("fixture.origin") + Vector3(0, 0, -4.0), PI],
		"fixture_in": [content.anchor_pos("fixture.origin") + Vector3(0, 0, 3.4), 0.0],
	}
	if not a.has(where):
		return
	player.teleport(a[where][0], a[where][1], "study jump: " + where)
	hud.show_toast("Study jump: %s. Nothing on the way is noted." % where, 3000)
