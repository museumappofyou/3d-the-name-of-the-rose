class_name Benchmark
extends Node
## Scenario runner for the packaged proof (rendered, not headless).
##   route       ≥120 s walking/looking along the real slice route (autopilot
##               input through the physics controller; no teleport while
##               measuring) with per-frame telemetry
##   crowd       the 46-presentation choir, walking the nave/crossing
##   cycles      ten residency cycles (stair + context cells unload/reload)
##   soak        20 min: route loops, hour changes, saves/loads, crowd
##   shots       fixed screenshots (character gate, altar, stair, day/night)
##   functional  the acceptance route with normal interactions, then save
##   functional-reload  relaunch check: load the save, verify, debug-jump and
##               invalid-save checks
## Writes <out>/<scenario>_<label>.json (+ .csv per frame) and quits.

var main: Node3D
var scenario: String
var args: Dictionary
var out_dir: String
var label: String
var duration: float = 120.0
var warmup: float = 5.0
var t: float = 0.0
## per-frame telemetry as packed columns (bounded memory: a 20-min soak at
## ~100 fps would otherwise hold ~120k dictionaries and mask real leaks)
const COLS: PackedStringArray = ["t", "ms", "cpu_render_ms", "gpu_ms", "process_ms", "physics_ms", "draws", "prims", "objects", "x", "y", "z", "anim_us", "anim_n", "vram", "mem_static", "cells", "focused", "room"]
## per-frame telemetry, one flat row-major buffer (a member Packed array
## appends in place; a Packed array read out of a Dictionary is a copy)
var frame_data := PackedFloat64Array()
## engine ticks (ms since process start): scene ready, first and playable frame
var _startup: Dictionary = {}
var _startup_frames: int = 0
var cols: Dictionary = {}
var room_names: PackedStringArray = []
var frame_count: int = 0
var stalls: Array = []
var waypoints: Array[Vector3] = []
var wp: int = 0
var stuck_t: float = 0.0
var last_pos: Vector3
var events: Array = []
var steps_done: Array = []
var _last_us: int = 0
var _vp_rid: RID
var _phase: int = 0
var _phase_t: float = 0.0
var _cycle: int = 0
var _cycle_mem: Array = []
var _look_t: float = 0.0
var _shots: Array = []
var _shot_i: int = 0
var _func_state: Dictionary = {}
var _next_switch: float = 0.0
var _saves: int = 0
var finished: bool = false
var _route_loops: int = 0
var run_name: String = ""
var _rec: AudioEffectRecord
var _audio_marks: Array = []

const ROUTE: Array = [
	[-7.4, 0.3, 14.1], [-8.6, 0.3, 9.0], [-8.4, 0.3, 5.6], [5.0, 0.3, 5.3], [20.0, 0.3, 4.9], [27.6, 0.3, 4.6],
	[28.08, 0.3, 3.4], [28.08, 0.35, 1.4], [25.0, 0.35, -5.46], [19.0, 0.35, -9.6], [15.37, 0.35, -12.3],
	[15.37, 0.35, -13.55], [15.37, -0.4, -15.9], [15.37, -1.8, -18.2], [15.37, -2.8, -19.9], [15.6, -2.8, -20.6],
	[15.37, -2.8, -19.7], [15.37, -1.6, -17.9], [15.37, 0.35, -13.6], [15.37, 0.35, -12.0], [21.0, 0.35, -7.0],
	[27.5, 0.35, -1.5], [28.08, 0.35, 1.6], [28.08, 0.3, 4.4], [20.0, 0.3, 5.0], [0.0, 0.3, 5.3], [-8.4, 0.3, 6.0], [-8.4, 0.3, 12.0],
]
## nave → round the great tripod (centre aisle at x 28.46) → the choir's
## centre aisle between the stalls (to the lectern at x ≈ 34.3) and back,
## then the south nave aisle
const CROWD_ROUTE: Array = [
	[20.0, 0.35, -5.46], [26.5, 0.35, -5.46], [27.6, 0.35, -7.2], [29.6, 0.35, -7.2], [30.6, 0.35, -5.46], [33.4, 0.35, -5.46],
	[30.6, 0.35, -5.46], [29.6, 0.35, -3.7], [27.6, 0.35, -3.7], [24.0, 0.35, -3.2], [20.0, 0.35, -4.0],
]

func setup(m: Node3D, sc: String, a: Dictionary) -> void:
	_startup["scene_ready_ms"] = Time.get_ticks_msec()
	main = m
	scenario = sc
	args = a
	out_dir = String(a.get("out", OS.get_user_data_dir().path_join("bench")))
	DirAccess.make_dir_recursive_absolute(out_dir)
	label = String(a.get("label", OS.get_name().to_lower()))
	run_name = String(a.get("name", sc))
	duration = float(a.get("duration", {"soak": 1200.0, "cycles": 60.0, "shots": 1.0, "functional": 600.0, "functional-reload": 120.0}.get(sc, 120.0)))
	_vp_rid = main.get_viewport().get_viewport_rid()
	RenderingServer.viewport_set_measure_render_time(_vp_rid, true)
	main.player.input_enabled = false
	main.player.autopilot_active = true
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	# measured runs: keep the window unoccluded (macOS throttles drawable
	# presentation for covered windows); focus is recorded per frame
	if not DisplayServer.get_name().begins_with("headless"):
		DisplayServer.window_set_flag(DisplayServer.WINDOW_FLAG_ALWAYS_ON_TOP, true)
		DisplayServer.window_move_to_foreground()
	match sc:
		"route", "soak":
			_use_route(ROUTE)
			_open_altar_for_benchmark()
		"crowd":
			main.session.clock.set_time(7.66)
			_use_route(CROWD_ROUTE)
			main.player.teleport(Vector3(20.0, 0.35, -5.46), -PI / 2.0, "benchmark start")
		"cycles":
			_open_altar_for_benchmark()
		"functional":
			main.session.saves = SaveService.new(String(a.get("save-dir", "user://functional")))
			main.session.saves.delete_all()
			main.session.knowledge.restore({})
			main.session.clock.set_time(15.0)
		"functional-reload":
			main.session.saves = SaveService.new(String(a.get("save-dir", "user://functional")))
		"audio":
			duration = 600.0
			main.session.clock.set_time(7.40)
			main.player.teleport(Vector3(31.0, 0.35, -5.46), -PI / 2.0, "audio start (choir)")
			_rec = AudioEffectRecord.new()
			AudioServer.add_bus_effect(0, _rec)
			_rec.set_recording_active(true)
		"fixture":
			duration = 600.0
	_last_us = Time.get_ticks_usec()

func _open_altar_for_benchmark() -> void:
	# benchmark-only session state (never written to a normal save)
	main.session.knowledge.add("alinardo-hint", {"by": "alinardo"})
	main.session.portals.set_target("church:altar", 1)
	main.session.portals.snap("church:altar")

func _use_route(r: Array) -> void:
	waypoints.clear()
	for p: Array in r:
		waypoints.append(Vector3(p[0], p[1], p[2]))
	wp = 1
	main.player.teleport(waypoints[0], PI / 2.0, "benchmark start")
	last_pos = waypoints[0]

func _process(dt: float) -> void:
	if finished:
		return
	if not _startup.has("first_frame_ms"):
		_startup["first_frame_ms"] = Time.get_ticks_msec()
	var now_us: int = Time.get_ticks_usec()
	var frame_ms: float = (now_us - _last_us) / 1000.0
	_last_us = now_us
	t += dt
	match scenario:
		"route", "crowd":
			_steer(dt)
			_record(frame_ms)
		"soak":
			_steer(dt)
			_record(frame_ms)
			_soak_events()
		"cycles":
			_cycles(dt, frame_ms)
		"shots":
			_shots_step()
			return
		"functional":
			_functional(dt)
		"functional-reload":
			_functional_reload(dt)
		"audio":
			_audio(dt)
		"fixture":
			_fixture(dt)
		"startup":
			# playable: the third rendered frame with the starting cells resident
			_startup_frames += 1
			if _startup_frames >= 3 and main.cells.cells.size() > 0:
				_startup["playable_ms"] = Time.get_ticks_msec()
				_startup["cells_resident"] = main.cells.cells.size()
				_finish()
				return
	if t >= duration + (warmup if scenario in ["route", "crowd", "soak"] else 0.0):
		_finish()

## Autopilot: face the next waypoint, walk forward through the physics
## controller, glance around a little (walking/looking).
func _steer(dt: float) -> void:
	var p: PlayerController = main.player
	if waypoints.is_empty():
		return
	var target: Vector3 = waypoints[wp]
	var to := Vector2(target.x - p.global_position.x, target.z - p.global_position.z)
	if to.length() < 0.55:
		wp = (wp + 1) % waypoints.size()
		if wp == 0:
			_route_loops += 1
			wp = 1
		stuck_t = 0.0
		return
	var want_yaw: float = atan2(-to.x, -to.y)
	p.yaw = lerp_angle(p.yaw, want_yaw, 1.0 - exp(-6.0 * dt))
	_look_t += dt
	p.pitch = sin(_look_t * 0.37) * 0.18 - 0.05
	var facing: float = cos(angle_difference(p.yaw, want_yaw))
	p.autopilot = Vector2(0, clampf(facing, 0.2, 1.0))
	if p.global_position.distance_to(last_pos) > 0.3:
		last_pos = p.global_position
		stuck_t = 0.0
	else:
		stuck_t += dt
		if stuck_t > 4.0:
			events.append({"t": t, "event": "stuck", "at": [p.global_position.x, p.global_position.y, p.global_position.z], "waypoint": wp})
			wp = (wp + 1) % waypoints.size()
			stuck_t = 0.0

func _record(frame_ms: float) -> void:
	if t < warmup:
		return
	var cpu: float = RenderingServer.viewport_get_measured_render_time_cpu(_vp_rid) + RenderingServer.get_frame_setup_time_cpu()
	var gpu: float = RenderingServer.viewport_get_measured_render_time_gpu(_vp_rid)
	var p: Vector3 = main.player.global_position
	var ri: int = room_names.find(main.session.room_id)
	if ri < 0:
		room_names.append(main.session.room_id)
		ri = room_names.size() - 1
	var v: Array = [t, frame_ms, cpu, gpu, Performance.get_monitor(Performance.TIME_PROCESS) * 1000.0, Performance.get_monitor(Performance.TIME_PHYSICS_PROCESS) * 1000.0,
		Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME), Performance.get_monitor(Performance.RENDER_TOTAL_PRIMITIVES_IN_FRAME), Performance.get_monitor(Performance.RENDER_TOTAL_OBJECTS_IN_FRAME),
		p.x, p.y, p.z, main.crowd.anim_usec_last if main.crowd else 0, main.crowd.anim_updates_last if main.crowd else 0,
		Performance.get_monitor(Performance.RENDER_VIDEO_MEM_USED), Performance.get_monitor(Performance.MEMORY_STATIC), main.cells.cells.size(), 1.0 if DisplayServer.window_is_focused() else 0.0, ri]
	for x: Variant in v:
		frame_data.append(float(x))
	frame_count += 1
	if frame_ms > 100.0:
		stalls.append({"t": t, "ms": frame_ms, "room": main.session.room_id, "x": p.x, "y": p.y, "z": p.z, "draws": v[6], "cells": v[16]})

func _soak_events() -> void:
	if t < _next_switch:
		return
	_next_switch = t + 120.0
	var hours: Array = [15.0, 7.66, 20.0, 16.66, 9.5, 2.9, 15.0, 18.3, 12.0, 15.0, 7.66]
	var h: float = hours[_phase % hours.size()]
	main.session.clock.set_time(h, true)
	events.append({"t": t, "event": "time", "hours": h, "office": main.session.clock.office()})
	if _phase % 2 == 1:
		var err: String = main.session.save_now()
		var r: Dictionary = main.session.saves.read(main.content.discovery_ids(), ["church:altar"])
		_saves += 1
		events.append({"t": t, "event": "save+verify", "error": err, "read_source": r["source"]})
	_phase += 1

func _cycles(dt: float, frame_ms: float) -> void:
	_phase_t += dt
	if frame_ms > 100.0 and t > 2.0:
		stalls.append({"t": t, "ms": frame_ms, "cycle": _cycle, "cells": main.cells.cells.size()})
	if _phase_t < 2.5:
		return
	_phase_t = 0.0
	var p: PlayerController = main.player
	if _cycle >= 10:
		duration = 0.0
		return
	if p.global_position.z > 0.0:
		p.teleport(Vector3(15.372, -2.8, -20.3), PI, "residency cycle")
	else:
		p.teleport(content_anchor("cloister.porch") + Vector3(2.4, -0.05, 0), PI / 2.0, "residency cycle")
		_cycle += 1
		_cycle_mem.append({"cycle": _cycle, "mem_static": int(Performance.get_monitor(Performance.MEMORY_STATIC)), "vram": int(Performance.get_monitor(Performance.RENDER_VIDEO_MEM_USED)), "texture_mem": int(Performance.get_monitor(Performance.RENDER_TEXTURE_MEM_USED)), "buffer_mem": int(Performance.get_monitor(Performance.RENDER_BUFFER_MEM_USED)), "objects": int(Performance.get_monitor(Performance.OBJECT_COUNT)), "nodes": int(Performance.get_monitor(Performance.OBJECT_NODE_COUNT)), "resources": int(Performance.get_monitor(Performance.OBJECT_RESOURCE_COUNT)), "cells_loaded": main.cells.cells.size(), "load_ms": main.cells.load_times_ms.duplicate()})

func content_anchor(id: String) -> Vector3:
	return main.content.anchor_pos(id)

# --- screenshots -------------------------------------------------------------------

func _shots_step() -> void:
	if _shots.is_empty():
		_shots = [
			{"name": "alinardo_front", "time": 15.0, "eye": Vector3(-8.25, 0.3, 14.135), "look": Vector3(-9.88, 1.0, 14.135)},
			{"name": "alinardo_side", "time": 15.0, "eye": Vector3(-9.6, 0.3, 12.2), "look": Vector3(-9.88, 0.95, 14.135)},
			{"name": "alinardo_stand_sleeves", "time": 15.0, "eye": Vector3(-7.6, 0.3, 14.135), "look": Vector3(-8.9, 1.1, 14.135), "pose": "stand"},
			{"name": "alinardo_kneel_bow", "time": 15.0, "eye": Vector3(-7.4, 0.3, 13.2), "look": Vector3(-8.9, 0.6, 14.135), "pose": "kneelBow"},
			{"name": "alinardo_stand_bow_side", "time": 15.0, "eye": Vector3(-8.9, 0.3, 11.9), "look": Vector3(-8.9, 1.0, 14.135), "pose": "bow"},
			{"name": "porch_wide", "time": 15.0, "eye": Vector3(-6.2, 0.3, 17.5), "look": Vector3(-9.6, 1.2, 13.4)},
			{"name": "cloister_day", "time": 15.0, "eye": Vector3(-8.0, 0.3, 6.0), "look": Vector3(10.0, 2.5, 14.0)},
			{"name": "church_door", "time": 15.0, "eye": Vector3(28.08, 0.3, 6.2), "look": Vector3(28.08, 1.6, 0.0)},
			{"name": "nave_north_aisle", "time": 15.0, "eye": Vector3(25.0, 0.35, -5.46), "look": Vector3(15.37, 1.2, -13.0)},
			{"name": "altar_closed", "time": 15.0, "eye": Vector3(15.372, 0.35, -11.9), "look": Vector3(15.372, 0.6, -14.2)},
			{"name": "altar_open", "time": 15.0, "eye": Vector3(15.372, 0.35, -11.9), "look": Vector3(15.372, 0.0, -15.0), "open": true},
			{"name": "stair_down", "time": 15.0, "eye": Vector3(15.372, 0.35, -13.4), "look": Vector3(15.372, -2.0, -19.0), "open": true},
			{"name": "landing_boundary", "time": 15.0, "eye": Vector3(15.1, -2.8, -19.7), "look": Vector3(16.7, -1.6, -21.2), "open": true, "lantern": true, "banner": false},
			{"name": "choir_prime", "time": 7.66, "eye": Vector3(27.0, 0.35, -5.46), "look": Vector3(40.0, 2.0, -5.46)},
			{"name": "cloister_night", "time": 20.0, "eye": Vector3(-8.0, 0.3, 6.0), "look": Vector3(10.0, 2.5, 14.0)},
			{"name": "nave_night_lamps", "time": 20.0, "eye": Vector3(20.0, 0.35, -5.46), "look": Vector3(30.0, 2.0, -5.46)},
			{"name": "fixture_night", "time": 20.0, "eye": Vector3(200.0, 0.0, 194.5), "look": Vector3(200.0, 1.4, 201.0), "banner": false},
		]
		if args.has("crowd"):
			_shots.append({"name": "crowd_choir", "time": 7.66, "eye": Vector3(29.0, 0.35, -5.46), "look": Vector3(36.0, 1.3, -5.46)})
		if args.has("shots"):
			var only: PackedStringArray = String(args["shots"]).split(",")
			_shots = _shots.filter(func(x: Dictionary) -> bool: return only.has(x["name"]))
		_phase_t = 0.0
	var s: Dictionary = _shots[_shot_i]
	if _phase_t == 0.0:
		main.session.clock.set_time(float(s["time"]))
		main.session.portals.set_target("church:altar", 1 if s.get("open", false) else 0)
		main.session.portals.snap("church:altar")
		main.lighting.set_lantern(bool(s.get("lantern", false)))
		# native-only label shots: the room banner would cover the 3D label
		main.hud.banner.visible = bool(s.get("banner", true))
		# character gate (QA only): show Alinardo's other fitted tasks on the
		# porch floor in front of the bench; the routine itself always sits
		var fig: CharacterPresentation = main.alinardo.figure
		if s.has("pose"):
			fig.position = Vector3(0.0, 0.3 - main.alinardo.position.y, 0.95)   # local +z = model front (east, off the bench)
			fig.clip = ""
			fig.play_pose(String(s["pose"]), 0.35)
		elif fig.position != Vector3.ZERO:
			fig.position = Vector3.ZERO
			fig.clip = ""
			fig.play_pose("sit", 0.338)
		var eye: Vector3 = s["eye"]
		var look: Vector3 = s["look"]
		var d: Vector3 = look - (eye + Vector3(0, 1.62, 0))
		var yaw: float = atan2(-d.x, -d.z)
		var pitch: float = atan2(d.y, Vector2(d.x, d.z).length())
		main.player.teleport(eye, yaw, "screenshot", pitch)
		main.player.autopilot = Vector2.ZERO
	_phase_t += get_process_delta_time()
	if _phase_t > 2.2:
		var img: Image = main.get_viewport().get_texture().get_image()
		var f: String = out_dir.path_join("%s_%s.png" % [s["name"], label])
		img.save_png(f)
		events.append({"shot": s["name"], "file": f, "size": [img.get_width(), img.get_height()], "room": main.session.room_id, "alinardo_present": main.session.available("alinardo")})
		_shot_i += 1
		_phase_t = 0.0
		if _shot_i >= _shots.size():
			_finish()

# --- functional acceptance route -------------------------------------------------------

func _step_ok(name: String, ok: bool, detail: Variant = null) -> void:
	steps_done.append({"step": name, "pass": ok, "detail": detail, "t": snappedf(t, 0.01)})

func _walk_to(target: Vector3, dt: float) -> bool:
	var p: PlayerController = main.player
	var to := Vector2(target.x - p.global_position.x, target.z - p.global_position.z)
	if to.length() < 0.5:
		p.autopilot = Vector2.ZERO
		return true
	var want_yaw: float = atan2(-to.x, -to.y)
	p.yaw = lerp_angle(p.yaw, want_yaw, 1.0 - exp(-8.0 * dt))
	p.autopilot = Vector2(0, clampf(cos(angle_difference(p.yaw, want_yaw)), 0.15, 1.0))
	return false

func _face(point: Vector3) -> void:
	var p: PlayerController = main.player
	var d: Vector3 = point - p.eye_position()
	p.yaw = atan2(-d.x, -d.z)
	p.pitch = atan2(d.y, Vector2(d.x, d.z).length())

## Each leg is a list of on-foot waypoints; actions use normal interaction.
func _functional(dt: float) -> void:
	var S: GameSession = main.session
	var st: int = int(_func_state.get("s", 0))
	var legs: Dictionary = {
		"to_altar": [Vector3(-8.4, 0.3, 9.0), Vector3(-8.4, 0.3, 5.6), Vector3(20.0, 0.3, 4.9), Vector3(28.08, 0.3, 3.4), Vector3(28.08, 0.35, 1.4), Vector3(25.0, 0.35, -5.46), Vector3(19.0, 0.35, -9.6), Vector3(15.372, 0.35, -12.4)],
		"to_alinardo": [Vector3(19.0, 0.35, -9.6), Vector3(25.0, 0.35, -5.46), Vector3(28.08, 0.35, 1.4), Vector3(28.08, 0.3, 4.4), Vector3(20.0, 0.3, 4.9), Vector3(-8.4, 0.3, 5.6), Vector3(-8.4, 0.3, 12.0), Vector3(-8.25, 0.3, 14.135)],
		"descend": [Vector3(15.372, 0.35, -13.6), Vector3(15.372, -0.4, -15.9), Vector3(15.372, -1.8, -18.2), Vector3(15.372, -2.8, -19.9), Vector3(15.372, -2.8, -20.5)],
	}
	match st:
		0:
			_step_ok("15:00 Alinardo seated and present", S.available("alinardo") and main.alinardo.visible, {"hours": S.clock.hours})
			_func_state = {"s": 1, "w": 0}
		1:
			_face(main.content.anchor_pos("alinardo.interact"))
			if _interact_when_ready("alinardo"):
				_step_ok("asked without observation: no hint", not S.knowledge.has("alinardo-hint"), S.knowledge.notes.keys())
				_func_state = {"s": 2, "w": 0}
		2:
			if _follow("to_altar", legs, dt):
				_func_state = {"s": 3, "w": 0}
		3:
			_face(main.content.anchor_pos("altar.interact"))
			if _interact_when_ready("skull-altar"):
				_step_ok("altar inspected: altar-feature once, still closed", S.knowledge.has("altar-feature") and S.portals.target("church:altar") == 0, S.knowledge.notes.keys())
				_func_state = {"s": 4, "w": 0, "probe_t": 0.0}
		4:
			# try to descend through the closed altar: the collider must stop us
			main.player.yaw = 0.0
			main.player.autopilot = Vector2(0, 1)
			_func_state["probe_t"] = float(_func_state["probe_t"]) + dt
			if float(_func_state["probe_t"]) > 3.0:
				main.player.autopilot = Vector2.ZERO
				_step_ok("closed altar blocks the descent", main.player.global_position.y > 0.2 and not S.knowledge.has("altar-passage"), [main.player.global_position.y, main.player.global_position.z])
				_func_state = {"s": 5, "w": 0}
		5:
			if _follow("to_alinardo", legs, dt):
				_func_state = {"s": 6, "w": 0}
		6:
			_face(main.content.anchor_pos("alinardo.interact"))
			if _interact_when_ready("alinardo"):
				var by: String = String(S.knowledge.notes.get("alinardo-hint", {}).get("by", ""))
				_step_ok("hint granted with by: alinardo", S.knowledge.has("alinardo-hint") and by == "alinardo", S.knowledge.notes.get("alinardo-hint"))
				_func_state = {"s": 7, "w": 0}
		7:
			if _follow("to_altar", legs, dt):
				_func_state = {"s": 8, "w": 0}
		8:
			_face(main.content.anchor_pos("altar.interact"))
			if _interact_when_ready("skull-altar"):
				_func_state = {"s": 9, "w": 0, "wait": 0.0}
		9:
			_func_state["wait"] = float(_func_state["wait"]) + dt
			if float(_func_state["wait"]) > 3.0:
				_step_ok("altar opened by normal input; no passage knowledge yet", S.portals.target("church:altar") == 1 and S.portals.open_amount("church:altar") > 0.9 and not S.knowledge.has("altar-passage"), {"open": S.portals.open_amount("church:altar")})
				_func_state = {"s": 10, "w": 0, "rooms": []}
		10:
			var rooms: Array = _func_state["rooms"]
			if rooms.is_empty() or rooms[-1] != S.room_id:
				rooms.append(S.room_id)
			if _follow("descend", legs, dt):
				_step_ok("walked down: altar-passage and route 0 earned", S.knowledge.has("altar-passage") and S.knowledge.route == 0, {"route": S.knowledge.route, "feet": [main.player.global_position.x, main.player.global_position.y, main.player.global_position.z]})
				var from_chapel: Array = rooms.slice(maxi(0, rooms.find("skull")))
				_step_ok("room classification skull → ossuary (no cemetery flash)", from_chapel == ["skull", "ossuary"], rooms)
				_func_state = {"s": 11}
		11:
			var err: String = S.save_now()
			_step_ok("saved (player, time, altar, knowledge)", err == "", {"path": ProjectSettings.globalize_path(S.saves.path()), "error": err})
			var snap: Dictionary = S.snapshot()
			var f := FileAccess.open(out_dir.path_join("functional_expected_%s.json" % label), FileAccess.WRITE)
			f.store_string(JSON.stringify({"knowledge": snap["knowledge"], "portals": snap["portals"], "clock": snap["clock"], "player": snap["player"]}, "  "))
			f.close()
			_func_state = {"s": 12}
			duration = 0.0

func _follow(leg: String, legs: Dictionary, dt: float) -> bool:
	var pts: Array = legs[leg]
	var i: int = int(_func_state.get("w", 0))
	if i >= pts.size():
		return true
	if _walk_to(pts[i], dt):
		_func_state["w"] = i + 1
	var p: Vector3 = main.player.global_position
	if p.distance_to(last_pos) > 0.25:
		last_pos = p
		stuck_t = 0.0
	else:
		stuck_t += dt
		if stuck_t > 6.0:
			events.append({"t": t, "event": "stuck", "leg": leg, "waypoint": i, "at": [p.x, p.y, p.z]})
			_func_state["w"] = i + 1
			stuck_t = 0.0
	return false

## Presses the normal interaction action once the probe has the target in
## reach, then waits for the event to be handled before reporting done.
func _interact_when_ready(id: String) -> bool:
	var w: float = float(_func_state.get("ready", 0.0)) + get_process_delta_time()
	_func_state["ready"] = w
	if _func_state.has("sent"):
		if w - float(_func_state["sent"]) > 0.35:
			_func_state.erase("sent")
			_func_state["ready"] = 0.0
			return true
		return false
	if w < 0.4:
		return false
	if main.probe.current != id:
		if w > 5.0:
			_step_ok("interaction %s reachable" % id, false, {"current": main.probe.current})
			_func_state["ready"] = 0.0
			return true
		return false
	var ev := InputEventAction.new()
	ev.action = "interact"
	ev.pressed = true
	Input.parse_input_event(ev)
	_func_state["sent"] = w
	return false

static func _same_notes(a: Dictionary, b: Dictionary) -> bool:
	if a.size() != b.size():
		return false
	for id: String in a.keys():
		if not b.has(id):
			return false
		var x: Dictionary = a[id]
		var y: Dictionary = b[id]
		if int(x.get("at", 0)) != int(y.get("at", 0)) or String(x.get("by", "")) != String(y.get("by", "")) or int(x.get("day", 0)) != int(y.get("day", 0)) or absf(float(x.get("hours", 0.0)) - float(y.get("hours", 0.0))) > 1e-9:
			return false
	return true

func _functional_reload(dt: float) -> void:
	var S: GameSession = main.session
	var st: int = int(_func_state.get("s", 0))
	match st:
		0:
			var r: Dictionary = main.do_load()
			var exp_path: String = out_dir.path_join("functional_expected_%s.json" % String(args.get("expect-label", label)))
			var expect: Dictionary = JSON.parse_string(FileAccess.get_file_as_string(exp_path)) if FileAccess.file_exists(exp_path) else {}
			var snap: Dictionary = S.snapshot()
			_step_ok("relaunch: save loaded", r["source"] == "main", r["report"])
			_step_ok("knowledge survives exactly (no duplicates)", not expect.is_empty() and _same_notes(snap["knowledge"]["notes"], expect["knowledge"]["notes"]) and int(snap["knowledge"]["route"]) == int(expect["knowledge"]["route"]), snap["knowledge"]["notes"].keys())
			_step_ok("altar state survives", S.portals.target("church:altar") == int(expect.get("portals", {}).get("church:altar", {}).get("target", -1)), S.portals.to_dict())
			_step_ok("time survives", not expect.is_empty() and absf(S.clock.hours - float(expect["clock"]["hours"])) < 1e-6, S.clock.hours)
			_step_ok("player location survives", not expect.is_empty() and main.player.global_position.distance_to(Vector3(expect["player"]["position"][0], expect["player"]["position"][1], expect["player"]["position"][2])) < 0.05, [main.player.global_position.x, main.player.global_position.y, main.player.global_position.z])
			_func_state = {"s": 1, "wait": 0.0}
		1:
			# closing/reopening stays coherent after the load
			main.player.yaw = PI
			_func_state["wait"] = float(_func_state["wait"]) + dt
			if float(_func_state["wait"]) > 1.0:
				S.interact("skull-altar")
				S.interact("skull-altar")
				_step_ok("close/reopen coherent after load", S.portals.target("church:altar") == 1, S.portals.to_dict())
				_func_state = {"s": 2, "wait": 0.0}
		2:
			# fresh test save: debug jump below the altar fabricates nothing
			S.saves = SaveService.new("user://functional_jump")
			S.saves.delete_all()
			S.knowledge.restore({})
			S.knowledge.add("alinardo-hint", {"by": "alinardo"})
			S.portals.set_target("church:altar", 1)
			main.study_jump("landing")
			_func_state = {"s": 3, "wait": 0.0}
		3:
			main.player.autopilot = Vector2(0, 0.6)
			main.player.yaw = PI
			_func_state["wait"] = float(_func_state["wait"]) + dt
			if float(_func_state["wait"]) > 2.0:
				main.player.autopilot = Vector2.ZERO
				_step_ok("debug jump below the altar grants nothing", not S.knowledge.has("altar-passage"), S.knowledge.notes.keys())
				_func_state = {"s": 4}
		4:
			var err: String = S.save_now()
			var main_path: String = ProjectSettings.globalize_path(S.saves.path())
			var txt: String = FileAccess.get_file_as_string(main_path)
			var f := FileAccess.open(main_path, FileAccess.WRITE)
			f.store_string(txt.substr(0, txt.length() / 3))
			f.close()
			var r: Dictionary = S.load_now()
			_step_ok("truncated save recovered safely and reported", err == "" and r["source"] == "none" and (r["report"] as PackedStringArray).size() > 0, r["report"])
			duration = 0.0

## The office through the church's openings: choir → nave → cloister door →
## cloister walk and back, an in-office hour change, then the office ends.
func _audio(dt: float) -> void:
	var S: GameSession = main.session
	var st: int = int(_func_state.get("s", 0))
	var legs: Dictionary = {
		"out": [Vector3(27.0, 0.35, -5.46), Vector3(28.08, 0.35, 1.0), Vector3(28.08, 0.3, 4.6), Vector3(20.0, 0.3, 5.0), Vector3(12.0, 0.3, 5.2)],
		"back": [Vector3(20.0, 0.3, 5.0), Vector3(28.08, 0.3, 4.6), Vector3(28.08, 0.35, 1.0), Vector3(27.0, 0.35, -5.46), Vector3(31.0, 0.35, -5.46)],
	}
	var mark := func(what: String) -> void:
		_audio_marks.append({"t": t, "event": what, "room": S.room_id, "office": S.clock.office(), "playing": main.audio.chant.playing, "position": main.audio.chant.get_playback_position() if main.audio.chant.playing else -1.0, "restarts": main.audio.restarts, "level": main.audio.path.get("level", 0.0), "lp": main.audio.path.get("lp", 0.0)})
	match st:
		0:
			if main.audio.chant.playing and t > 8.0:
				mark.call("chant streaming in the choir")
				_func_state = {"s": 1, "w": 0, "t0": t}
		1:
			if _follow("out", legs, dt):
				mark.call("reached the cloister walk")
				_func_state = {"s": 2, "w": 0, "t0": t}
		2:
			if t - float(_func_state["t0"]) > 4.0:
				S.clock.set_time(7.62, true)
				mark.call("hour changed inside Prime (7:24 → 7:37)")
				_func_state = {"s": 3, "w": 0, "t0": t}
		3:
			if _follow("back", legs, dt):
				mark.call("back in the choir")
				_func_state = {"s": 4, "t0": t}
		4:
			if t - float(_func_state["t0"]) > 3.0:
				S.clock.set_time(8.2, true)
				mark.call("office ended (8:12, work)")
				_func_state = {"s": 5, "t0": t}
		5:
			if t - float(_func_state["t0"]) > 8.0:
				mark.call("after the die-away")
				_rec.set_recording_active(false)
				var wav: AudioStreamWAV = _rec.get_recording()
				if wav:
					wav.save_to_wav(out_dir.path_join("audio_%s.wav" % label))
				_step_ok("one office transport: no restart across doorways or the in-office hour change", _audio_marks.filter(func(m: Dictionary) -> bool: return int(m["restarts"]) != int(_audio_marks[0]["restarts"])).size() <= 1 and int(_audio_marks[3]["restarts"]) == int(_audio_marks[0]["restarts"]), _audio_marks.map(func(m: Dictionary) -> int: return int(m["restarts"])))
				_step_ok("chant level follows the openings (quieter in the cloister)", float(_audio_marks[1]["level"]) < float(_audio_marks[0]["level"]), _audio_marks.map(func(m: Dictionary) -> float: return float(m["level"])))
				_step_ok("office end fades the transport", main.audio.transport_target == 0.0, {"gain": main.audio.transport_gain})
				events.append_array(_audio_marks)
				duration = 0.0

## Door fixture (noncanonical): at curfew an outside approach is stopped by
## the bar; from inside the player walks out; by day the door is open.
func _fixture(dt: float) -> void:
	var S: GameSession = main.session
	var fx: DoorFixture = main.fixture
	var o: Vector3 = main.content.anchor_pos("fixture.origin")
	var st: int = int(_func_state.get("s", 0))
	match st:
		0:
			S.clock.set_time(20.0)
			main.study_jump("fixture_out")
			_func_state = {"s": 1, "w": 0, "t0": t}
		1:
			_walk_to(o + Vector3(0, 0, 3.4), dt)
			if t - float(_func_state["t0"]) > 6.0:
				main.player.autopilot = Vector2.ZERO
				_step_ok("curfew: outside entry denied (bar solid, player stays out)", not fx.player_inside() and fx.bar_shape.disabled == false and main.player.global_position.z < o.z + 1.0, {"z": main.player.global_position.z, "room": S.room_id, "transmission": fx.transmission, "nav_link": fx.nav_link.enabled})
				_step_ok("curfew: barred state synchronised (collider, nav link off, acoustic closed)", fx.nav_link.enabled == false and fx.transmission < 0.2, {"nav_link": fx.nav_link.enabled, "transmission": fx.transmission})
				main.study_jump("fixture_in")
				_func_state = {"s": 2, "t0": t}
		2:
			_walk_to(o + Vector3(0, 0, -4.0), dt)
			if t - float(_func_state["t0"]) > 7.0:
				main.player.autopilot = Vector2.ZERO
				_step_ok("curfew: safe inside exit permitted", main.player.global_position.z < o.z + 0.0 and not fx.player_inside(), {"z": main.player.global_position.z, "room": S.room_id})
				_func_state = {"s": 3, "t0": t}
		3:
			_walk_to(o + Vector3(0, 0, 3.4), dt)
			if t - float(_func_state["t0"]) > 6.0:
				main.player.autopilot = Vector2.ZERO
				_step_ok("curfew: re-entry after leaving is denied again", not fx.player_inside(), {"z": main.player.global_position.z})
				S.clock.set_time(15.0)
				_func_state = {"s": 4, "t0": t}
		4:
			_walk_to(o + Vector3(0, 0, 3.4), dt)
			if t - float(_func_state["t0"]) > 7.0:
				main.player.autopilot = Vector2.ZERO
				_step_ok("by day the door is open (entry allowed, nav link on)", fx.player_inside() and fx.nav_link.enabled and fx.transmission > 0.8, {"room": S.room_id, "nav_link": fx.nav_link.enabled, "transmission": fx.transmission})
				fx.send_actor(true)
				_func_state = {"s": 5, "t0": t}
		5:
			if t - float(_func_state["t0"]) > 9.0:
				var a_in: bool = S.rooms.classify_feet(fx.actor.global_position).get("id", "") == "fixture-inside"
				_step_ok("benchmark actor navigates in through the open door link", a_in, [fx.actor.global_position.x, fx.actor.global_position.z])
				S.clock.set_time(20.0)
				fx.send_actor(false)
				_func_state = {"s": 6, "t0": t}
		6:
			if t - float(_func_state["t0"]) > 9.0:
				var a_in2: bool = S.rooms.classify_feet(fx.actor.global_position).get("id", "") == "fixture-inside"
				_step_ok("at curfew the actor inside may still leave (egress link)", not a_in2, [fx.actor.global_position.x, fx.actor.global_position.z])
				_step_ok("the fixture never awards `barred`", not S.knowledge.has("barred"), S.knowledge.notes.keys())
				events.append_array(fx.state_log.slice(maxi(0, fx.state_log.size() - 30)))
				duration = 0.0

func _finish() -> void:
	finished = true
	main.player.autopilot = Vector2.ZERO
	var report: Dictionary = {"scenario": scenario, "label": label, "args": args, "system": system_info(), "duration_s": t, "warmup_s": warmup, "events": events, "route_loops": _route_loops, "startup_ms": _startup}
	if frame_count > 0:
		cols = columns(frame_data, frame_count)
		report["summary"] = summarize(cols, room_names)
		report["stalls_over_100ms"] = stalls
		var csv := FileAccess.open(out_dir.path_join("%s_%s.csv" % [run_name, label]), FileAccess.WRITE)
		csv.store_line(",".join(COLS))
		for i: int in frame_count:
			var row: PackedStringArray = []
			for c: String in COLS:
				var x: float = (cols[c] as PackedFloat64Array)[i]
				row.append(room_names[int(x)] if c == "room" else (str(snappedf(x, 0.001)) if c in ["t", "ms", "cpu_render_ms", "gpu_ms", "process_ms", "physics_ms", "x", "y", "z"] else str(int(x))))
			csv.store_line(",".join(row))
		csv.close()
	if scenario == "cycles":
		report["cycles"] = _cycle_mem
		report["stalls_over_100ms"] = stalls
	if not steps_done.is_empty():
		report["steps"] = steps_done
		report["pass"] = steps_done.all(func(s: Dictionary) -> bool: return s["pass"])
	if main.crowd:
		report["crowd"] = main.crowd.census()
	report["audio_telemetry_tail"] = main.audio.telemetry.slice(maxi(0, main.audio.telemetry.size() - 400))
	report["audio_restarts"] = main.audio.restarts
	report["fixture_log_tail"] = main.fixture.state_log.slice(maxi(0, main.fixture.state_log.size() - 50))
	var f := FileAccess.open(out_dir.path_join("%s_%s.json" % [run_name, label]), FileAccess.WRITE)
	f.store_string(JSON.stringify(report, " "))
	f.close()
	print("[bench] wrote ", out_dir.path_join("%s_%s.json" % [run_name, label]))
	get_tree().quit()

## split the row-major buffer into one array per COLS entry
static func columns(data: PackedFloat64Array, n: int) -> Dictionary:
	var out: Dictionary = {}
	var w: int = COLS.size()
	for j: int in w:
		var col := PackedFloat64Array()
		col.resize(n)
		for i: int in n:
			col[i] = data[i * w + j]
		out[COLS[j]] = col
	return out

static func percentile(sorted: Array, p: float) -> float:
	if sorted.is_empty():
		return 0.0
	var i: float = clampf(p * (sorted.size() - 1), 0.0, sorted.size() - 1.0)
	var lo: int = int(floor(i))
	var hi: int = mini(lo + 1, sorted.size() - 1)
	return lerpf(float(sorted[lo]), float(sorted[hi]), i - lo)

static func _stats(a: PackedFloat64Array) -> Dictionary:
	var s: PackedFloat64Array = a.duplicate()
	s.sort()
	var total := 0.0
	for x: float in a:
		total += x
	return {"avg": total / maxf(1.0, a.size()), "p95": percentile(Array(s), 0.95), "max": s[-1], "min": s[0]}

static func summarize(c: Dictionary, rooms_list: PackedStringArray) -> Dictionary:
	var ms: PackedFloat64Array = c["ms"]
	var sorted: PackedFloat64Array = ms.duplicate()
	sorted.sort()
	var total := 0.0
	for x: float in ms:
		total += x
	var sa: Array = Array(sorted)
	var out: Dictionary = {"frames": ms.size(), "measured_s": total / 1000.0, "fps_avg": ms.size() / maxf(0.001, total / 1000.0),
		"ms_p50": percentile(sa, 0.5), "ms_p95": percentile(sa, 0.95), "ms_p99": percentile(sa, 0.99), "ms_max": sorted[-1]}
	for k: String in ["cpu_render_ms", "gpu_ms", "process_ms", "physics_ms", "draws", "prims", "objects", "anim_us", "vram", "mem_static"]:
		out[k] = _stats(c[k])
	var rooms: Dictionary = {}
	for x: float in (c["room"] as PackedFloat64Array):
		var n: String = rooms_list[int(x)]
		rooms[n] = int(rooms.get(n, 0)) + 1
	out["frames_by_room"] = rooms
	var unfocused: int = 0
	for x: float in (c["focused"] as PackedFloat64Array):
		if x < 0.5:
			unfocused += 1
	out["unfocused_frames"] = unfocused
	return out

static func system_info() -> Dictionary:
	var vp_size: Vector2i = DisplayServer.window_get_size()
	var tex_size: Vector2i = (Engine.get_main_loop() as SceneTree).root.get_texture().get_size()
	return {
		"viewport_texture_px": [tex_size.x, tex_size.y], "screen": DisplayServer.window_get_current_screen(), "screen_count": DisplayServer.get_screen_count(),
		"screens": range(DisplayServer.get_screen_count()).map(func(i: int) -> Dictionary: return {"size": [DisplayServer.screen_get_size(i).x, DisplayServer.screen_get_size(i).y], "scale": DisplayServer.screen_get_scale(i), "refresh_hz": DisplayServer.screen_get_refresh_rate(i)}),
		"window_position": [DisplayServer.window_get_position().x, DisplayServer.window_get_position().y], "gi": String((Engine.get_main_loop() as SceneTree).root.get_node("Main").args.get("gi", "none")) if (Engine.get_main_loop() as SceneTree).root.has_node("Main") else "",
		"shadow_atlas": ProjectSettings.get_setting("rendering/lights_and_shadows/directional_shadow/size"), "ssao": true,
		"engine": Engine.get_version_info()["string"], "os": OS.get_name(), "os_version": OS.get_version(), "cpu": OS.get_processor_name(), "cpu_count": OS.get_processor_count(),
		"renderer": RenderingServer.get_current_rendering_method(), "driver": RenderingServer.get_current_rendering_driver_name(), "adapter": RenderingServer.get_video_adapter_name(),
		"vendor": RenderingServer.get_video_adapter_vendor(), "api": RenderingServer.get_video_adapter_api_version(), "adapter_type": RenderingServer.get_video_adapter_type(),
		"window_px": [vp_size.x, vp_size.y], "screen_scale": DisplayServer.screen_get_scale(), "vsync": DisplayServer.window_get_vsync_mode(),
		"scaling_3d_scale": ProjectSettings.get_setting("rendering/scaling_3d/scale"), "msaa_3d": ProjectSettings.get_setting("rendering/anti_aliasing/quality/msaa_3d"),
		"physics": ProjectSettings.get_setting("physics/3d/physics_engine"), "memory_info": OS.get_memory_info(), "executable": OS.get_executable_path(), "user_dir": OS.get_user_data_dir(),
	}
