class_name Day1aRunner
extends Node
## Day-1A scenarios (rendered):
##   day1-shots   fixed views for visual review
##   day1-walk    the whole day played through the real physics controller
##                by a walker of a given --style (normal | slow | rush |
##                confused | ignore_nones): interactions only through what
##                the probe offers, frame times per beat, review captures
##                (--captures=on) and the director's telemetry
##   day1-cycles  plays to the free period (accelerated, unmeasured), holds
##                the hour, then times --cycles=10 real-time loops gate →
##                guest cell → well → nave → garth → gate (one extra warm-up loop),
##                with frame times per leg and memory after each loop
## Writes <out>/<scenario>_<label>.json (+ .csv frames) and quits.

var main: Node3D
var scenario: String
var args: Dictionary
var out_dir: String
var label: String
var t: float = 0.0
var _shots: Array = []
var _i: int = 0
var _pt: float = 0.0
var events: Array = []

func setup(m: Node3D, sc: String, a: Dictionary) -> void:
	main = m
	scenario = sc
	args = a
	out_dir = String(a.get("out", OS.get_user_data_dir().path_join("day1a")))
	DirAccess.make_dir_recursive_absolute(out_dir)
	label = String(a.get("label", OS.get_name().to_lower()))
	main.player.input_enabled = false
	main.player.autopilot_active = true
	if not DisplayServer.get_name().begins_with("headless"):
		DisplayServer.window_set_flag(DisplayServer.WINDOW_FLAG_ALWAYS_ON_TOP, true)
		DisplayServer.window_move_to_foreground()

func _process(dt: float) -> void:
	t += dt
	match scenario:
		"day1-shots":
			_shots_step(dt)
		"day1-walk":
			_walk_frame(dt)
		"day1-probe":
			_probe_frame(dt)
		"day1-graph-audit":
			_graph_audit()
		"day1-cast":
			_cast_frame(dt)
		"day1-cycles":
			_cycles_frame(dt)

func _shots_step(dt: float) -> void:
	if _shots.is_empty():
		_shots = [
			{"name": "road_start", "time": 11.5, "eye": Vector3(-96.0, 0.0, 60.0), "look": Vector3(-116.0, 2.0, 34.0)},
			{"name": "road_bend", "time": 11.5, "eye": Vector3(-117.0, 0.0, 30.0), "look": Vector3(-110.0, 4.0, -8.6)},
			{"name": "gate_outside", "time": 11.6, "eye": Vector3(-118.0, 0.0, -6.0), "look": Vector3(-105.0, 4.0, -8.6)},
			{"name": "aed_from_road", "time": 11.6, "eye": Vector3(-118.0, 0.0, 6.0), "look": Vector3(42.0, 20.0, -66.0)},
			{"name": "gate_court", "time": 11.9, "eye": Vector3(-99.0, 0.0, -8.6), "look": Vector3(-17.0, 6.0, -8.0)},
			{"name": "avenue_mid", "time": 12.2, "eye": Vector3(-60.0, 0.0, -8.2), "look": Vector3(-17.0, 5.0, -7.6)},
			{"name": "garden_turn", "time": 12.2, "eye": Vector3(-30.0, 0.0, -6.0), "look": Vector3(-22.0, 3.0, 20.0)},
			{"name": "stair_foot", "time": 12.3, "eye": Vector3(-23.5, 0.0, 26.5), "look": Vector3(-20.3, 4.0, 15.0)},
			{"name": "cell_east_window", "time": 12.6, "eye": Vector3(-18.3, 6.2, 16.3), "look": Vector3(-13.0, 7.6, 16.3)},
			{"name": "cell_niche", "time": 12.6, "eye": Vector3(-14.6, 6.2, 15.0), "look": Vector3(-18.5, 6.6, 16.7)},
			{"name": "garth_aed", "time": 14.0, "eye": Vector3(8.0, 0.3, 18.0), "look": Vector3(42.0, 20.0, -66.0)},
			{"name": "cloister_west_door", "time": 14.0, "eye": Vector3(-8.0, 0.3, 16.5), "look": Vector3(-12.0, 1.4, 16.5)},
		]
		# review-only views (not part of the default set)
		var extra: Array = [
			{"name": "aerial_west", "time": 12.0, "eye": Vector3(-200.0, 140.0, 120.0), "look": Vector3(-40.0, 0.0, -20.0)},
			{"name": "aerial_far", "time": 12.0, "eye": Vector3(-60.0, 60.0, 40.0), "look": Vector3(-600.0, -80.0, 400.0)},
			{"name": "top_hospice", "time": 12.0, "eye": Vector3(-20.0, 48.0, 13.0), "look": Vector3(-20.0, 0.0, 12.99), "ortho": 46.0},
			{"name": "top_gate", "time": 12.0, "eye": Vector3(-100.0, 48.0, -4.0), "look": Vector3(-100.0, 0.0, -4.01), "ortho": 46.0},
			{"name": "top_cloister", "time": 12.0, "eye": Vector3(8.0, 70.0, 6.0), "look": Vector3(8.0, 0.0, 5.99), "ortho": 70.0},
			{"name": "top_avenue", "time": 12.0, "eye": Vector3(-60.0, 90.0, -6.0), "look": Vector3(-60.0, 0.0, -6.01), "ortho": 100.0},
			{"name": "top_road", "time": 12.0, "eye": Vector3(-112.0, 70.0, 20.0), "look": Vector3(-112.0, 0.0, 19.99), "ortho": 80.0},
			{"name": "horizon_north", "time": 12.0, "eye": Vector3(-20.0, 30.0, 0.0), "look": Vector3(-20.0, 60.0, -2000.0)},
			{"name": "horizon_south", "time": 12.0, "eye": Vector3(-60.0, 10.0, 40.0), "look": Vector3(-60.0, -50.0, 2000.0)},
			{"name": "pines_close", "time": 11.5, "eye": Vector3(-113.0, 0.0, 44.0), "look": Vector3(-116.0, 7.0, 30.0)},
		]
		if args.has("shots"):
			_shots.append_array(extra)
		if args.has("shots"):
			var only: PackedStringArray = String(args["shots"]).split(",")
			_shots = _shots.filter(func(x: Dictionary) -> bool: return only.has(x["name"]))
	var s: Dictionary = _shots[_i]
	if _pt == 0.0:
		main.session.clock.set_time(float(s["time"]))
		var eye: Vector3 = s["eye"]
		if eye.y == 0.0:
			var h: float = main.cells.terrain_height_at(eye.x, eye.z)
			eye.y = (h if not is_nan(h) else 0.3) + 0.05
		var look: Vector3 = s["look"]
		var d: Vector3 = look - (eye + Vector3(0, 1.62, 0))
		main.player.frozen = true
		main.player.teleport(eye, atan2(-d.x, -d.z), "screenshot", atan2(d.y, Vector2(d.x, d.z).length()))
		var cam: Camera3D = main.player.camera
		if s.has("ortho"):
			cam.projection = Camera3D.PROJECTION_ORTHOGONAL
			cam.size = float(s["ortho"])
		else:
			cam.projection = Camera3D.PROJECTION_PERSPECTIVE
	_pt += dt
	if _pt > 2.5:
		# an occluded macOS window stops presenting: draw this frame
		# explicitly so the capture is never the previous image
		RenderingServer.force_draw(false)
		var img: Image = main.get_viewport().get_texture().get_image()
		var f: String = out_dir.path_join("%s_%s.png" % [s["name"], label])
		img.save_png(f)
		events.append({"shot": s["name"], "file": f, "room": main.session.room_id, "eye": [main.player.global_position.x, main.player.global_position.y, main.player.global_position.z]})
		_i += 1
		_pt = 0.0
		if _i >= _shots.size():
			_finish()

func _finish() -> void:
	var f := FileAccess.open(out_dir.path_join("%s_%s.json" % [scenario, label]), FileAccess.WRITE)
	f.store_string(JSON.stringify({"scenario": scenario, "label": label, "events": events}, " "))
	f.close()
	get_tree().quit()

# --- the whole day through the real controller ---------------------------------

var style: String = "normal"
var _path: Array[Vector3] = []
var _want: String = ""
var _want_t: float = 0.0
var _misses: Array = []
var _frames := PackedFloat32Array()
var _frame_beats := PackedInt32Array()
var _beat_names: PackedStringArray = []
var _last_us: int = 0
var _captured: Dictionary = {}
var _cap_dir: String = ""
var _stuck_t: float = 0.0
var _last_p: Vector3 = Vector3.INF
var _pause_t: float = 0.0
var _wrong_done: bool = false
var _look_override: Variant = null
var _done_t: float = -1.0
var _step: int = 0

func _d() -> Day1aDirector:
	return main.day1.director

func _walk_frame(dt: float) -> void:
	if _last_us == 0:
		style = String(args.get("style", "normal"))
		# functional runs may be accelerated; performance runs never are
		Engine.time_scale = float(args.get("timescale", 1.0))
		_cap_dir = out_dir.path_join("captures_" + style)
		if String(args.get("captures", "off")) == "on":
			DirAccess.make_dir_recursive_absolute(_cap_dir)
		main.player.autopilot_active = true
		_last_us = Time.get_ticks_usec()
		return
	var now: int = Time.get_ticks_usec()
	var ms: float = (now - _last_us) / 1000.0
	_last_us = now
	var d: Day1aDirector = _d()
	var bi: int = _beat_names.find(d.beat)
	if bi < 0:
		_beat_names.append(d.beat)
		bi = _beat_names.size() - 1
	if t > 3.0:
		_frames.append(ms)
		_frame_beats.append(bi)
	_bot(dt)
	_capture_moments()
	if String(args.get("record", "")) == "nones":
		_record_nones()
	_step += 1
	if _step % 1800 == 0:
		var pp: Vector3 = main.player.global_position
		print("[walk] t=%.0f beat=%s carry=%s seated=%s pos=(%.1f,%.1f,%.1f) path=%d want=%s prompt=%s" % [t, d.beat, d.carrying, d.seated, pp.x, pp.y, pp.z, _path.size(), _want, main.day1._prompt_id])
	if d.beat == "end":
		if _done_t < 0.0:
			_done_t = t
		if t - _done_t > 3.0:
			_finish_walk(true)
	elif t > float(args.get("max_s", 3000.0)):
		_finish_walk(false)

static func _xz(a: Vector3, b: Vector3) -> float:
	return Vector2(a.x - b.x, a.z - b.z).length()

func _goto_node(id: String) -> void:
	_path = _d().graph.path_to(main.player.global_position, id)
	_path.pop_front()

func _goto_point(p: Vector3) -> void:
	var g: WayGraph = _d().graph
	_path = g.path_to(main.player.global_position, g.nearest(p))
	_path.pop_front()
	_path.append(p)

func _steer(dt: float, run: bool = false) -> void:
	var pl: PlayerController = main.player
	pl.autopilot_run = run
	if _pause_t > 0.0:
		_pause_t -= dt
		pl.autopilot = Vector2.ZERO
		return
	if _path.is_empty():
		pl.autopilot = Vector2.ZERO
		return
	var tg: Vector3 = _path[0]
	var to := Vector2(tg.x - pl.global_position.x, tg.z - pl.global_position.z)
	if to.length() < 0.45:
		_path.pop_front()
		return
	var want_yaw: float = atan2(-to.x, -to.y)
	pl.yaw = lerp_angle(pl.yaw, want_yaw, 1.0 - exp(-7.0 * dt))
	if _look_override == null:
		pl.pitch = lerpf(pl.pitch, -0.08, 1.0 - exp(-3.0 * dt))
	var k: float = clampf(cos(angle_difference(pl.yaw, want_yaw)), 0.1, 1.0)
	pl.autopilot = Vector2(0, k * (0.82 if style == "slow" else 1.0))
	if _last_p != Vector3.INF and pl.global_position.distance_to(_last_p) < 0.01 and not pl.autopilot.is_zero_approx():
		_stuck_t += dt
		if _stuck_t > 3.0:
			events.append({"t": snappedf(t, 0.1), "event": "stuck", "at": [pl.global_position.x, pl.global_position.y, pl.global_position.z], "beat": _d().beat, "target": [tg.x, tg.z]})
			_path.pop_front()
			_stuck_t = 0.0
	else:
		_stuck_t = 0.0
	_last_p = pl.global_position

## a reader takes a moment over the replies before choosing (rush: less)
var _choice_t: float = 0.0
func _read_choice(dt: float) -> bool:
	main.player.autopilot = Vector2.ZERO
	_choice_t += dt
	if _choice_t < (0.8 if style == "rush" else 2.2):
		return false
	_choice_t = 0.0
	return true

func _face(p: Vector3, dt: float) -> void:
	var pl: PlayerController = main.player
	if is_nan(p.y):
		var h: float = main.cells.terrain_height_at(p.x, p.z)
		p.y = (0.0 if is_nan(h) else h) + 1.4
	elif p.y < 3.0 and absf(p.y) < 1e-6:
		p.y = 1.4
	var v: Vector3 = p - pl.eye_position()
	pl.yaw = lerp_angle(pl.yaw, atan2(-v.x, -v.z), 1.0 - exp(-6.0 * dt))
	pl.pitch = lerpf(pl.pitch, atan2(v.y, Vector2(v.x, v.z).length()), 1.0 - exp(-6.0 * dt))

func _offer(id: String) -> Dictionary:
	for it: Dictionary in _d().interactions():
		if it["id"] == id:
			return it
	return {}

## Try an interaction the way a player does: walk into reach, face it, and
## press E only when the probe offers exactly it.
func _try(id: String, dt: float) -> bool:
	var it: Dictionary = _offer(id)
	if it.is_empty():
		return false
	var p: Vector3 = it["pos"]
	var eye: Vector3 = main.player.eye_position()
	if eye.distance_to(p) > float(it["radius"]) - 0.25 and not it.get("always", false):
		if _path.is_empty():
			_goto_point(Vector3(p.x, NAN, p.z))
		_steer(dt)
		return false
	main.player.autopilot = Vector2.ZERO
	if it.get("always", false):
		# offered only when nothing else is under the crosshair: look up
		main.player.pitch = lerpf(main.player.pitch, 0.45, 1.0 - exp(-6.0 * dt))
	else:
		_face(p, dt)
	if _want != id:
		_want = id
		_want_t = 0.0
	_want_t += dt
	if main.day1._prompt_id == id:
		main.day1._do(id)
		_want = ""
		return true
	if _want_t > 4.0:
		_misses.append({"t": snappedf(t, 0.1), "id": id, "beat": _d().beat, "prompt": main.day1._prompt_id})
		main.day1._do(id)
		_want = ""
		return true
	return false

func _bot(dt: float) -> void:
	var d: Day1aDirector = _d()
	var pl: PlayerController = main.player
	var rush: bool = style == "rush"
	match d.beat:
		"road":
			if style == "slow" and d.beat_t > 6.0 and d.beat_t < 34.0:
				_face(Vector3(-170, -45, 60), dt)
				pl.autopilot = Vector2.ZERO
				return
			if _path.is_empty() and Vector2(pl.global_position.x - d.node("g_fore").x, pl.global_position.z - d.node("g_fore").z).length() > 1.5:
				_goto_node("g_fore")
			_steer(dt, rush)
		"sext_gate":
			if _path.is_empty() and _xz(pl.global_position, d.node("g_out")) > 2.0:
				_goto_node("g_out")
			_steer(dt)
			if _path.is_empty():
				_face(Vector3(-102.75, 1.7, -10.3), dt)
		"gate_open":
			if not _offer("hold_mule").is_empty():
				_try("hold_mule", dt)
			elif d.holding == "steady":
				pl.autopilot = Vector2.ZERO
				var fzp: Vector3 = d.a("fazio").pos
				_face(Vector3(fzp.x, NAN, fzp.z), dt)
			else:
				if _path.is_empty() and Vector2(pl.global_position.x + 99.0, pl.global_position.z + 8.6).length() > 1.2:
					_goto_point(Vector3(-99.0, NAN, -8.6))
				_steer(dt)
				if _path.is_empty():
					_face(Vector3(42, 16, -66), dt)
		"reception", "to_cell":
			if d.carrying == "" and not _offer("take_bedding").is_empty():
				_try("take_bedding", dt)
			elif d.carrying == "bedding" and style in ["normal", "slow"] and d.beat == "reception":
				# a first-time guest waits for his hosts, then follows them
				pl.autopilot = Vector2.ZERO
				var wp: Vector3 = d.a("william").pos
				_face(Vector3(wp.x, NAN, wp.z), dt)
			elif d.carrying == "bedding":
				if not _try("place_bedding", dt):
					if _path.is_empty():
						_goto_node("c_niche")
					_steer(dt, rush)
			else:
				pl.autopilot = Vector2.ZERO
		"second_bundle":
			if d.carrying == "" and String(d.props["chest"]["where"]) == "ground":
				if style == "confused" and not _wrong_done and pl.global_position.z < -2.0 and pl.global_position.x > -40.0:
					# the wrong way: to the church's (closed) west doors
					var wrong := Vector3(-19.6, NAN, -8.0)
					if Vector2(pl.global_position.x - wrong.x, pl.global_position.z - wrong.z).length() > 1.0:
						# (in plan: graph nodes may carry y = NaN)
						if _path.is_empty() or Vector2(_path[-1].x - wrong.x, _path[-1].z - wrong.z).length() > 0.6:
							_goto_point(wrong)
						_steer(dt)
					else:
						_wrong_done = true
						_path.clear()
						_pause_t = 4.0
				elif not _try("take_chest", dt):
					if _path.is_empty():
						_goto_node("g_chest")
					_steer(dt, rush)
			elif d.carrying == "chest":
				if not _try("place_chest", dt):
					if _path.is_empty():
						_goto_node("c_chest")
					_steer(dt, rush)
		"meal":
			if d.pending_choice != "":
				if _read_choice(dt):
					main.day1.hud.pick(0)
			elif d.seated == "" and d.carrying == "":
				if not _offer("wring_hose").is_empty() and int(d.flags.get("eat_bread", 0)) > 0 and not rush:
					_try("wring_hose", dt)
				elif not _offer("sit_stool").is_empty():
					_try("sit_stool", dt)
				else:
					pl.autopilot = Vector2.ZERO
					_face(Vector3(d.a("william").pos.x, 7.4, d.a("william").pos.z), dt)
			elif d.carrying == "hose":
				if not _try("lay_hose", dt):
					if _path.is_empty():
						_goto_node("c_wwin")
					_steer(dt)
			elif d.seated != "":
				var order: Array = ["eat_bread", "pour_wine", "eat_olives", "raisins"] if not rush else ["eat_bread"]
				var done := false
				for id: String in order:
					var key: String = "raisins" if id == "raisins" else id
					if not d.flags.has(key) and not _offer(id).is_empty():
						_try(id, dt)
						done = true
						break
				if not done and not _offer("wring_hose").is_empty() and not rush:
					_try("stand", dt)
				elif not done:
					_face(Vector3(d.a("william").pos.x, 7.1, d.a("william").pos.z), dt)
		"free", "after_nones":
			if d.pending_choice != "":
				if _read_choice(dt):
					main.day1.hud.pick(d.pending_options.size() - 1)
			elif d.seated != "":
				# the bench lets the hour pass; the meal stool is left at once
				if d.seated == "stool" or main.session.clock.hours > 13.85:
					_try("stand", dt)
				else:
					_face(Vector3(10, 1.4, 14), dt)
			elif style == "ignore_nones":
				if _path.is_empty() and _xz(pl.global_position, d.node("c_mid")) > 1.2:
					_goto_node("c_mid")
				_steer(dt)
				if _path.is_empty():
					_face(Vector3(42, 18, -66), dt)
			elif style == "rush" and not _offer("sit_bench_porch").is_empty() and main.session.clock.hours < 13.4:
				_try("sit_bench_porch", dt)
			elif not d.flags.has("fulco_talked") and d.a("fulco").present:
				if not _try("talk_fulco", dt):
					if _path.is_empty():
						_goto_point(d.a("fulco").pos)
					_steer(dt)
			elif String(d._sub.get("water", "")) == "" and d.a("nuto").present and d.a("nuto").activity == "work_well":
				if not _try("help_nuto", dt):
					if _path.is_empty():
						_goto_point(d.a("nuto").pos)
					_steer(dt)
			elif d.carrying == "bucket":
				if not _try("set_bucket", dt):
					if _path.is_empty():
						_goto_node("st_foot")
					_steer(dt)
			else:
				# out on the garth: before the bell, watching the walks; after
				# Nones, by the well as the church empties
				var spot: String = "gt_w" if d.beat == "free" else "gt_well"
				if _xz(pl.global_position, d.node(spot)) > 1.4:
					if _path.is_empty():
						_goto_node(spot)
					_steer(dt)
				else:
					pl.autopilot = Vector2.ZERO
					_face(Vector3(28.08, 1.5, 4.6) if d.beat == "after_nones" else Vector3(12.0, 1.4, 4.0), dt)
		"nones":
			var watching: bool = style in ["normal", "slow"] and d.beat_t < 13.0
			if watching:
				# the bell: stop and watch the walks empty before following
				pl.autopilot = Vector2.ZERO
				for b: Dictionary in d.data["anonymous"]:
					var ab: Actor = d.a(String(b["id"]))
					if ab.present and _xz(pl.global_position, ab.pos) < 30.0:
						_face(Vector3(ab.pos.x, 1.5, ab.pos.z), dt)
						break
			elif style != "ignore_nones" and _xz(pl.global_position, d.node("guests")) > 1.4:
				if _path.is_empty():
					_goto_node("guests")
				_steer(dt)
			else:
				pl.autopilot = Vector2.ZERO
				var mover: Variant = null
				for b: Dictionary in d.data["anonymous"]:
					if d.a(String(b["id"])).moving:
						var mp: Vector3 = d.a(String(b["id"])).pos
						mover = Vector3(mp.x, 1.6, mp.z)
						break
				if mover != null:
					_face(mover, dt)
		"end":
			pl.autopilot = Vector2.ZERO

## review captures at the moments that matter (only with --captures=on)
# --- optional master-bus recording around the Nones bell (--record=nones) ----
# Marks carry the office path state in the shape analyze_audio.py reads.
var _rec: AudioEffectRecord
var _rec_state: String = ""
var _rec_t0: float = 0.0
var _rec_in_church: bool = false
var _rec_chant: bool = false

func _rec_mark(what: String) -> void:
	var au: AudioDirector = main.audio
	events.append({"t": snappedf(t - _rec_t0, 0.01), "event": what, "room": main.session.room_id, "office": main.session.clock.office(), "hours": snappedf(main.session.clock.hours, 0.001),
		"playing": au.chant.playing, "position": au.chant.get_playback_position() if au.chant.playing else -1.0, "restarts": au.restarts,
		"level": float(au.path.get("level", 0.0)), "lp": float(au.path.get("lp", 0.0)), "player": [main.player.global_position.x, main.player.global_position.y, main.player.global_position.z]})

func _record_nones() -> void:
	var d: Day1aDirector = _d()
	match _rec_state:
		"":
			if d.beat == "free" and main.session.clock.hours >= 14.3:
				# the recorded window runs in real time even in an accelerated walk
				Engine.time_scale = 1.0
				_rec = AudioEffectRecord.new()
				AudioServer.add_bus_effect(0, _rec)
				_rec.set_recording_active(true)
				_rec_t0 = t
				_rec_state = "on"
				d.bell.connect(func(office: String, strokes: int, _iv: float) -> void: _rec_mark("bell %s (%d strokes)" % [office, strokes]))
				d.beat_changed.connect(func(_o: String, n: String) -> void: _rec_mark("beat " + n))
				_rec_mark("recording starts (free period)")
		"on":
			var inside: bool = main.session.room_id.begins_with("church") or main.session.room_id in ["choir", "nave"]
			if inside != _rec_in_church:
				_rec_in_church = inside
				_rec_mark("player enters the church" if inside else "player leaves the church")
			if main.audio.chant.playing != _rec_chant:
				_rec_chant = main.audio.chant.playing
				_rec_mark("chant starts" if _rec_chant else "chant stops")
			if d.beat in ["after_nones", "end"] or (d.beat == "nones" and d.beat_t > 90.0) or t - _rec_t0 > 240.0:
				_rec_mark("recording ends")
				_rec.set_recording_active(false)
				var wav: AudioStreamWAV = _rec.get_recording()
				if wav != null:
					wav.save_to_wav(out_dir.path_join("day1-walk_%s_%s.wav" % [style, label]))
				_rec_state = "done"

func _capture_moments() -> void:
	if String(args.get("captures", "off")) != "on":
		return
	var d: Day1aDirector = _d()
	var w: Actor = d.a("william")
	var moments: Array = [
		["01_road_start", d.beat == "road" and d.beat_t > 4.0],
		["02_road_wait", d.beat == "road" and d.lead.state == "WAIT" and d.lead.t_state > 1.0],
		["03_sext_gate", d.beat == "sext_gate" and d.beat_t > 9.0],
		["04_gate_opens", d.beat == "sext_gate" and float(d.gate["open"]) > 0.3],
		["05_reveal", d.beat == "gate_open" and String(d._sub.get("phase", "")) == "reveal" and d.beat_t - float(d._sub.get("reveal_t", 0.0)) > 3.0],
		["06_hoof", d.beat == "gate_open" and d.holding == "steady"],
		["07_cellarer", d.beat == "reception" and String(d._sub.get("phase", "")) == "greeting"],
		["08_avenue", d.beat == "to_cell" and d.beat_t > 22.0],
		["09_garden", d.beat == "to_cell" and main.player.global_position.z > 6.0 and main.player.global_position.y < 2.0],
		["10_stair", d.beat == "to_cell" and main.player.global_position.y > 2.0 and main.player.global_position.y < 5.5],
		["11_cell", d.beat == "second_bundle" and d.beat_t > 3.0],
		["12_chest", d.beat == "second_bundle" and d.carrying == "chest"],
		["13_tebaldo", d.beat == "meal" and String(d._sub.get("phase", "")) == "tebaldo_talk"],
		["14_meal", d.beat == "meal" and d.seated != "" and d.beat_t > 40.0],
		["15_question", d.beat == "meal" and d.pending_choice != ""],
		["16_free_cloister", d.beat == "free" and d.beat_t > 20.0],
		["17_fulco", d.beat == "free" and d.pending_choice == "fulco"],
		["18_nuto", d.beat == "free" and String(d._sub.get("water", "")) == "walking"],
		["19_nones_bell", d.beat == "nones" and d.beat_t > 6.0],
		["20_nones_file", d.beat == "nones" and d.beat_t > 10.0],
		["21_choir", d.beat == "nones" and d.beat_t > 90.0],
		["22_after", d.beat == "after_nones" and d.beat_t > 20.0],
	]
	for m: Array in moments:
		if bool(m[1]) and not _captured.has(m[0]):
			_captured[m[0]] = t
			RenderingServer.force_draw(false)
			var img: Image = main.get_viewport().get_texture().get_image()
			var f: String = _cap_dir.path_join("%s.png" % m[0])
			img.save_png(f)
			events.append({"t": snappedf(t, 0.1), "capture": m[0], "beat": d.beat, "hours": snappedf(main.session.clock.hours, 0.01), "william": [w.pos.x, w.pos.z], "player": [main.player.global_position.x, main.player.global_position.y, main.player.global_position.z]})

func _finish_walk(ended: bool) -> void:
	var d: Day1aDirector = _d()
	var by_beat: Dictionary = {}
	for i: int in _frames.size():
		var b: String = _beat_names[_frame_beats[i]]
		# (a packed array read from a Dictionary is a copy: append to an Array)
		if not by_beat.has(b):
			by_beat[b] = []
		(by_beat[b] as Array).append(_frames[i])
	var stats: Dictionary = {"all": _fstats(_frames)}
	for b: String in by_beat.keys():
		stats[b] = _fstats(PackedFloat32Array(by_beat[b]))
	var tel_path: String = main.day1.write_telemetry("walk_" + style)
	var rep: Dictionary = {"scenario": scenario, "style": style, "label": label, "ended": ended, "real_s": snappedf(t, 0.1), "director_t": snappedf(d.t, 0.1), "beat": d.beat,
		"interaction_misses": _misses, "events": events, "frames": stats, "telemetry_file": ProjectSettings.globalize_path(tel_path), "summary": d.tel.summary(),
		"people_named": d.people.people.keys().filter(func(k: String) -> bool: return d.people.knows_name(k)), "observations": Array(d.obs.order), "system": Benchmark.system_info(),
		"memory": {"static": Performance.get_monitor(Performance.MEMORY_STATIC), "vram": Performance.get_monitor(Performance.RENDER_VIDEO_MEM_USED), "objects": Performance.get_monitor(Performance.OBJECT_COUNT)}}
	if _rec_state != "":
		rep["recording"] = {"state": _rec_state, "starts_at_runner_t": snappedf(_rec_t0, 0.01), "wav": "day1-walk_%s_%s.wav" % [style, label], "note": "master bus (AudioEffectRecord), real time (time scale 1) from the start of the recording; marks t are seconds into the recording"}
		rep["audio_telemetry_tail"] = main.audio.telemetry.slice(maxi(0, main.audio.telemetry.size() - 400))
	var f := FileAccess.open(out_dir.path_join("day1-walk_%s_%s.json" % [style, label]), FileAccess.WRITE)
	f.store_string(JSON.stringify(rep, " "))
	f.close()
	var csv := FileAccess.open(out_dir.path_join("day1-walk_%s_%s.csv" % [style, label]), FileAccess.WRITE)
	csv.store_line("i,ms,beat")
	for i: int in _frames.size():
		csv.store_line("%d,%.3f,%s" % [i, _frames[i], _beat_names[_frame_beats[i]]])
	csv.close()
	print("[day1a] walk ", style, " ended=", ended, " t=", snappedf(t, 0.1))
	get_tree().quit()

static func _fstats(a: PackedFloat32Array) -> Dictionary:
	if a.is_empty():
		return {}
	var s: PackedFloat32Array = a.duplicate()
	s.sort()
	var tot := 0.0
	var over50 := 0
	var over100 := 0
	for x: float in a:
		tot += x
		if x > 50.0: over50 += 1
		if x > 100.0: over100 += 1
	return {"frames": a.size(), "fps_avg": snappedf(a.size() / maxf(0.001, tot / 1000.0), 0.1), "ms_p50": snappedf(s[int(0.5 * (s.size() - 1))], 0.01), "ms_p95": snappedf(s[int(0.95 * (s.size() - 1))], 0.01), "ms_p99": snappedf(s[int(0.99 * (s.size() - 1))], 0.01), "ms_max": snappedf(s[-1], 0.01), "over_50ms": over50, "over_100ms": over100}

# --- collision probe: walk a short leg and log contacts ---------------------------
var _pr: Dictionary = {}
func _probe_frame(_dt: float) -> void:
	var pl: PlayerController = main.player
	if _pr.is_empty():
		var a: Array = String(args.get("from", "-20.32,25.4")).split(",")
		var b: Array = String(args.get("to", "-20.32,19.7")).split(",")
		var from := Vector3(float(a[0]), 0.0, float(a[1]))
		var h: float = main.cells.terrain_height_at(from.x, from.z)
		from.y = (0.0 if is_nan(h) else h) + 0.1
		_pr = {"to": Vector3(float(b[0]), 0.0, float(b[1])), "t": 0.0}
		pl.teleport(from, atan2(-(float(b[0]) - from.x), -(float(b[1]) - from.z)), "probe")
		pl.autopilot_active = true
		return
	_pr["t"] = float(_pr["t"]) + _dt
	var to: Vector3 = _pr["to"]
	var v := Vector2(to.x - pl.global_position.x, to.z - pl.global_position.z)
	pl.yaw = atan2(-v.x, -v.y)
	pl.autopilot = Vector2(0, 1)
	if int(float(_pr["t"]) * 4.0) != int((float(_pr["t"]) - _dt) * 4.0):
		var hits: Array = []
		for i: int in pl.get_slide_collision_count():
			var c: KinematicCollision3D = pl.get_slide_collision(i)
			var col: Object = c.get_collider()
			hits.append("%s n=(%.2f,%.2f,%.2f) at=(%.2f,%.2f,%.2f)" % [String((col as Node).name) if col is Node else str(col), c.get_normal().x, c.get_normal().y, c.get_normal().z, c.get_position().x, c.get_position().y, c.get_position().z])
		print("[probe] t=%.2f pos=(%.2f,%.2f,%.2f) floor=%s limit=%s hits=%s" % [float(_pr["t"]), pl.global_position.x, pl.global_position.y, pl.global_position.z, pl.is_on_floor(), main.day1.limits.inside(pl.global_position), hits])
	if float(_pr["t"]) > 6.0:
		get_tree().quit()

# --- the walking network against the world's colliders ---------------------------
## Sweep a person-sized capsule (r 0.26, waist to head) along every authored
## leg and report what blocks it. Steps and kerbs below 0.55 m are ignored.
func _graph_audit() -> void:
	if t < 1.0:
		return
	var d: Day1aDirector = _d()
	var g: WayGraph = d.graph
	var space: PhysicsDirectSpaceState3D = main.get_world_3d().direct_space_state
	var cap := CapsuleShape3D.new()
	cap.radius = 0.26
	cap.height = 1.0
	var ground := func(p: Vector3) -> float:
		# from just above the walking surface (never from above roofs)
		var th: float = main.cells.terrain_height_at(p.x, p.z)
		var top: float = (p.y + 1.0) if not is_nan(p.y) else maxf((0.0 if is_nan(th) else th) + 1.0, 1.3)
		var q := PhysicsRayQueryParameters3D.create(Vector3(p.x, top, p.z), Vector3(p.x, top - 4.0, p.z), 1)
		var hit: Dictionary = space.intersect_ray(q)
		return float((hit["position"] as Vector3).y) if not hit.is_empty() else (0.0 if is_nan(th) else th)
	var bad: Array = []
	var n := 0
	var seen: Dictionary = {}
	for a: String in g.adj.keys():
		for b: String in g.adj[a]:
			var key: String = a + "|" + b if a < b else b + "|" + a
			if seen.has(key):
				continue
			seen[key] = true
			n += 1
			var pa: Vector3 = g.pos(a)
			var pb: Vector3 = g.pos(b)
			var steps: int = maxi(1, int(Vector2(pb.x - pa.x, pb.z - pa.z).length() / 0.8))
			var blocked: Array = []
			for k: int in steps:
				var u0: float = float(k) / steps
				var u1: float = float(k + 1) / steps
				var q0: Vector3 = pa.lerp(pb, u0)
				var q1: Vector3 = pa.lerp(pb, u1)
				q0.y = float(ground.call(q0)) + 0.55 + 0.5 + 0.26
				q1.y = float(ground.call(q1)) + 0.55 + 0.5 + 0.26
				var params := PhysicsShapeQueryParameters3D.new()
				params.shape = cap
				params.transform = Transform3D(Basis(), q0)
				params.motion = q1 - q0
				params.collision_mask = 1 | 2
				var r: PackedFloat32Array = space.cast_motion(params)
				if r.size() == 2 and r[0] < 1.0:
					var at: Vector3 = q0.lerp(q1, r[1])
					params.transform = Transform3D(Basis(), at)
					params.motion = Vector3.ZERO
					var info: Dictionary = space.get_rest_info(params)
					var who: String = ""
					if info.has("collider_id"):
						var o: Object = instance_from_id(int(info["collider_id"]))
						who = String((o as Node).name) if o is Node else ""
					blocked.append({"at": [snappedf(at.x, 0.01), snappedf(at.y, 0.01), snappedf(at.z, 0.01)], "by": who})
					break
			if not blocked.is_empty():
				bad.append({"leg": [a, b], "blocked": blocked})
	var f := FileAccess.open(out_dir.path_join("day1-graph-audit_%s.json" % label), FileAccess.WRITE)
	f.store_string(JSON.stringify({"legs": n, "blocked": bad.size(), "details": bad}, " "))
	f.close()
	print("[audit] legs=%d blocked=%d" % [n, bad.size()])
	for b2: Dictionary in bad:
		print("[audit] ", b2["leg"], " ", b2["blocked"])
	get_tree().quit()

# --- the people up close -------------------------------------------------------
## Each named person (and two of the community) walks a 7 m line in front of
## the camera in the gate court at noon: captures from the front, the side
## and the back while walking, then standing; William also sits.
var _cast: Dictionary = {}
func _cast_frame(dt: float) -> void:
	var d: Day1aDirector = _d()
	if _cast.is_empty():
		DirAccess.make_dir_recursive_absolute(out_dir.path_join("cast"))
		main.session.clock.set_time(12.1, true)
		main.session.clock.rate = 0.0
		main.player.frozen = true
		for id: String in d.actors.keys():
			d.a(id).present = false
		var all: Array = ["william", "nuto", "fulco", "tebaldo", "fazio", "cellarer", "rainaldo", "brother:01", "brother:04"]
		if args.has("only"):
			all = Array(String(args["only"]).split(","))
		_cast = {"list": all, "i": 0, "phase": 0, "t": 0.0}
		d.beat = "end"
	var id: String = _cast["list"][int(_cast["i"])]
	var a: Actor = d.a(id)
	var ph: int = int(_cast["phase"])
	var A := Vector3(-80.0, NAN, -9.6)
	var B := Vector3(-73.0, NAN, -9.6)
	var views: Array = [["front", Vector3(-71.6, 0, -9.6)], ["side", Vector3(-76.5, 0, -6.6)], ["back", Vector3(-81.4, 0, -9.6)]]
	if ph < 3 and float(_cast["t"]) == 0.0:
		a.present = true
		a.activity = "walk"
		var pts: Array[Vector3] = [A if ph != 2 else B, B if ph != 2 else A]
		a.place(pts[0], 0.0, d.t, "cast review")
		a.go(pts, float(d.data["people"].get(id, {}).get("speed", 1.05)), "cast")
	_cast["t"] = float(_cast["t"]) + dt
	# --heads=on: close views of the head (front, side, above-behind) after the stand
	if ph == 4:
		var hf: ActorFigure = main.day1.figures[id]
		var head: Vector3 = hf.fig.skeleton.global_transform * hf.fig.skeleton.get_bone_global_pose(hf.fig.skeleton.find_bone("head")).origin + Vector3(0, 0.08, 0)
		var fwd: Vector3 = hf.global_transform.basis.z.normalized()
		var right: Vector3 = hf.global_transform.basis.x.normalized()
		var k: int = clampi(int(float(_cast["t"]) / 0.8), 0, 2)
		var cam: Vector3 = [head + fwd * 0.75, head + right * 0.75, head - fwd * 0.55 + Vector3(0, 0.35, 0)][k]
		var vv: Vector3 = head - cam
		main.player.teleport(cam - Vector3(0, 1.62, 0), atan2(-vv.x, -vv.z), "cast head camera", atan2(vv.y, Vector2(vv.x, vv.z).length()))
		if fmod(float(_cast["t"]), 0.8) > 0.5 and not _cast.has("shot_h%d" % k):
			_cast["shot_h%d" % k] = true
			RenderingServer.force_draw(false)
			main.get_viewport().get_texture().get_image().save_png(out_dir.path_join("cast/%s_head_%s.png" % [id.replace(":", "_"), ["front", "side", "back"][k]]))
		if float(_cast["t"]) > 2.45:
			a.present = false
			_cast["phase"] = 0
			_cast["t"] = 0.0
			for kk: String in _cast.keys().filter(func(x: String) -> bool: return x.begins_with("shot_")):
				_cast.erase(kk)
			_cast["i"] = int(_cast["i"]) + 1
			if int(_cast["i"]) >= (_cast["list"] as Array).size():
				get_tree().quit()
		return
	var cam_at: Vector3 = (views[mini(ph, 2)] as Array)[1]
	if ph >= 3:
		cam_at = Vector3(-74.6, 0, -7.4)
	var h: float = main.cells.terrain_height_at(cam_at.x, cam_at.z)
	var eye := Vector3(cam_at.x, (0.0 if is_nan(h) else h), cam_at.z)
	var target := Vector3(a.pos.x, eye.y + 1.05, a.pos.z)
	var v: Vector3 = target - (eye + Vector3(0, 1.62, 0))
	main.player.teleport(eye, atan2(-v.x, -v.z), "cast camera", atan2(v.y, Vector2(v.x, v.z).length()))
	var mid: bool = ph < 3 and Vector2(a.pos.x - (A.x + B.x) / 2.0, a.pos.z - A.z).length() < 0.6
	# optional strip: --strip=<id> saves the side view every 0.12 s
	if ph == 1 and String(args.get("strip", "")) == id and int(float(_cast["t"]) / 0.12) != int((float(_cast["t"]) - dt) / 0.12) and absf(a.pos.x - (A.x + B.x) / 2.0) < 1.6:
		RenderingServer.force_draw(false)
		var im: Image = main.get_viewport().get_texture().get_image()
		im.save_png(out_dir.path_join("cast/strip_%s_%03d.png" % [id, int(float(_cast["t"]) * 100.0)]))
	if ph >= 3 and float(_cast["t"]) > 2.5:
		mid = true
	if mid and not _cast.has("shot_%d" % ph):
		_cast["shot_%d" % ph] = true
		RenderingServer.force_draw(false)
		var img: Image = main.get_viewport().get_texture().get_image()
		var nm: String = ["walk_front", "walk_side", "walk_back", "stand"][ph]
		img.save_png(out_dir.path_join("cast/%s_%s.png" % [id.replace(":", "_"), nm]))
	if (ph < 3 and not a.moving and float(_cast["t"]) > 1.0) or (ph >= 3 and float(_cast["t"]) > 3.2):
		_cast["phase"] = ph + 1
		_cast["t"] = 0.0
		for k: String in _cast.keys().filter(func(x: String) -> bool: return x.begins_with("shot_")):
			_cast.erase(k)
		if ph == 2:
			a.stop()
			a.activity = "stand"
			a.face_target = Vector3(-74.6, 0, -7.4)
		if ph >= 3 and String(args.get("heads", "off")) == "on":
			return
		if ph >= 3:
			a.present = false
			_cast["phase"] = 0
			_cast["i"] = int(_cast["i"]) + 1
			if int(_cast["i"]) >= (_cast["list"] as Array).size():
				get_tree().quit()

# --- residency cycles ---------------------------------------------------------
# (back out through the cloister: the church's west doors are shut to Adso)
const CYCLE_STOPS: PackedStringArray = ["g_court", "c_mid", "gt_well", "nv_c", "gt_n"]
const CYCLE_LEGS: PackedStringArray = ["to_gate", "gate_to_cell", "cell_to_well", "well_to_nave", "nave_to_garth"]
var _cyc: Dictionary = {}

func _cycles_frame(dt: float) -> void:
	var d: Day1aDirector = _d()
	var pl: PlayerController = main.player
	if _cyc.is_empty():
		# (plain Arrays: a packed array read from a Dictionary is a copy)
		_cyc = {"phase": "setup", "cycle": 0, "stop": 0, "legs": {}, "all": [], "rows": [], "last_us": 0, "start_t": 0.0}
		style = "normal"
		Engine.time_scale = float(args.get("setup_timescale", 4.0))
		pl.autopilot_active = true
		return
	if _cyc["phase"] == "setup":
		if d.beat != "free":
			_bot(dt)
			return
		Engine.time_scale = 1.0
		d.hold_clock = true
		_path.clear()
		_cyc["phase"] = "loop"
		_cyc["hours"] = main.session.clock.hours
		_cyc["start_t"] = t
		_cyc["last_us"] = Time.get_ticks_usec()
		_cyc["legs"] = {}
		_cyc["rows"].append(_mem_row(-1))
		print("[cycles] free period reached at t=%.0f h=%.2f; measuring" % [t, main.session.clock.hours])
		return
	var now: int = Time.get_ticks_usec()
	var ms: float = (now - int(_cyc["last_us"])) / 1000.0
	_cyc["last_us"] = now
	var leg: String = CYCLE_LEGS[int(_cyc["stop"])]
	var legs: Dictionary = _cyc["legs"]
	if not legs.has(leg):
		legs[leg] = []
	(legs[leg] as Array).append(ms)
	(_cyc["all"] as Array).append(ms)
	var stop: String = CYCLE_STOPS[int(_cyc["stop"])]
	_cyc["leg_t"] = float(_cyc.get("leg_t", 0.0)) + dt
	if Engine.get_process_frames() % 1800 == 0:
		print("[cycles] t=%.0f loop=%d leg=%s pos=%s path=%d" % [t, int(_cyc["cycle"]), leg, pl.global_position, _path.size()])
	# a leg that takes over three minutes is recorded and abandoned
	var timed_out: bool = float(_cyc["leg_t"]) > 180.0
	if timed_out:
		_cyc["timeouts"] = (_cyc.get("timeouts", []) as Array) + [{"loop": int(_cyc["cycle"]), "leg": leg, "at": [pl.global_position.x, pl.global_position.y, pl.global_position.z]}]
		print("[cycles] leg timeout ", leg, " at ", pl.global_position)
	# step round anyone standing on the next waypoint (a reader in the walk)
	if _path.size() > 1:
		for aid: String in d.actors.keys():
			var ac: Actor = d.actors[aid]
			var fg: Node3D = main.day1.figures.get(aid, null)
			if ac.present and fg != null and _xz(fg.global_position, _path[0]) < 0.75:
				_path.pop_front()
				break
	# a stop someone is standing on (Nuto at the well) counts from further off
	var reach: float = 1.2
	for aid: String in d.actors.keys():
		var ac2: Actor = d.actors[aid]
		var fg2: Node3D = main.day1.figures.get(aid, null)
		if ac2.present and fg2 != null and _xz(fg2.global_position, d.node(stop)) < 0.75:
			reach = 1.8
			break
	if _xz(pl.global_position, d.node(stop)) <= reach:
		_path.clear()
	if _path.is_empty() or timed_out:
		if _xz(pl.global_position, d.node(stop)) > reach and not timed_out:
			_goto_node(stop)
			if _path.is_empty():
				_path.append(d.node(stop))
		else:
			if timed_out:
				pl.teleport(d.node(stop) if not is_nan(d.node(stop).y) else Vector3(d.node(stop).x, main.cells.terrain_height_at(d.node(stop).x, d.node(stop).z) + 0.1, d.node(stop).z), pl.yaw, "cycles: leg timeout")
			_path.clear()
			_cyc["leg_t"] = 0.0
			_cyc["stop"] = (int(_cyc["stop"]) + 1) % CYCLE_STOPS.size()
			if int(_cyc["stop"]) == 1:
				_end_cycle()
				return
	_steer(dt, true)

func _mem_row(cycle: int) -> Dictionary:
	return {"cycle": cycle, "t": snappedf(t, 0.1), "static_mib": snappedf(Performance.get_monitor(Performance.MEMORY_STATIC) / 1048576.0, 0.1),
		"vram_mib": snappedf(Performance.get_monitor(Performance.RENDER_VIDEO_MEM_USED) / 1048576.0, 0.1), "texture_mib": snappedf(Performance.get_monitor(Performance.RENDER_TEXTURE_MEM_USED) / 1048576.0, 0.1),
		"buffer_mib": snappedf(Performance.get_monitor(Performance.RENDER_BUFFER_MEM_USED) / 1048576.0, 0.1),
		"objects": Performance.get_monitor(Performance.OBJECT_COUNT), "resources": Performance.get_monitor(Performance.OBJECT_RESOURCE_COUNT), "nodes": Performance.get_monitor(Performance.OBJECT_NODE_COUNT),
		"orphans": Performance.get_monitor(Performance.OBJECT_ORPHAN_NODE_COUNT), "hours": snappedf(main.session.clock.hours, 0.001)}

## a loop ends on reaching the gate court again
func _end_cycle() -> void:
	var c: int = int(_cyc["cycle"])
	var row: Dictionary = _mem_row(c)
	var legs: Dictionary = _cyc["legs"]
	var lstats: Dictionary = {}
	var allc := PackedFloat32Array()
	for k: String in legs.keys():
		lstats[k] = _fstats(PackedFloat32Array(legs[k]))
		allc.append_array(PackedFloat32Array(legs[k]))
	row["frames"] = _fstats(allc)
	row["legs"] = lstats
	row["warmup"] = c == 0
	_cyc["rows"].append(row)
	_cyc["legs"] = {}
	if c == 0:
		_cyc["all"] = []
	print("[cycles] loop %d: %.1f fps avg, p95 %.1f ms, static %.1f MiB, vram %.1f MiB" % [c, row["frames"]["fps_avg"], row["frames"]["ms_p95"], row["static_mib"], row["vram_mib"]])
	_cyc["cycle"] = c + 1
	if c + 1 > int(args.get("cycles", 10)):
		_finish_cycles()

func _finish_cycles() -> void:
	var rows: Array = _cyc["rows"]
	var warm: Dictionary = rows[1]
	var last: Dictionary = rows[-1]
	var rep: Dictionary = {"scenario": scenario, "label": label, "cycles": int(args.get("cycles", 10)), "warmup_cycles": 1, "stops": Array(CYCLE_STOPS), "clock_held_at": _cyc["hours"],
		"rows": rows, "frames_all_measured": _fstats(PackedFloat32Array(_cyc["all"])), "leg_timeouts": _cyc.get("timeouts", []),
		"memory_growth": {"static_pct": snappedf(100.0 * (float(last["static_mib"]) / maxf(0.001, float(warm["static_mib"])) - 1.0), 0.01) if float(warm["static_mib"]) > 0.0 else null,
			"vram_pct": snappedf(100.0 * (float(last["vram_mib"]) / maxf(0.001, float(warm["vram_mib"])) - 1.0), 0.01), "objects_delta": int(last["objects"]) - int(warm["objects"]),
			"basis": "after warm-up loop (cycle 0) → after the last loop"},
		"residency": "Day-1A keeps every exported cell resident (world_cells resident_policy off); tree tiles and figures switch by visibility range only — no load/unload events occur in this slice",
		"system": Benchmark.system_info(), "warning": "external process RSS is sampled by scripts/migration/run_benchmarks.sh when run from a package"}
	var f := FileAccess.open(out_dir.path_join("day1-cycles_%s.json" % label), FileAccess.WRITE)
	f.store_string(JSON.stringify(rep, " "))
	f.close()
	print("[cycles] done")
	get_tree().quit()
