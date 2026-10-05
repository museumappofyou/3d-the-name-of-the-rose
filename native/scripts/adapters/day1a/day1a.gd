class_name Day1a
extends Node3D
## Day-1A composition (arrival → Sext at the gate → reception → the cell →
## the second bundle → the meal → a short free period → Nones). Scene
## adapters only: the beats, actors, lines and records live in the domain
## (Day1aDirector), driven every physics frame with Adso's real state.

var main: Node3D
var data: Dictionary
var director: Day1aDirector
var world: Day1aWorld
var figures: Dictionary = {}        # actor id -> ActorFigure
var mule_nodes: Dictionary = {}     # mule id -> MuleFigure
var fp: FPBody
var hud: Day1aHud
var audio: Day1aAudio
var limits: WalkLimits
var saves: Day1aSave
var _prompt_id: String = ""
var _speaking: Dictionary = {}      # actor id -> until (s)
var _ended: bool = false
var _tel_written: bool = false
var _tel_path: String = ""
var session_id: String = ""

func setup(m: Node3D) -> void:
	main = m
	data = m.content.doc("day1a")
	director = Day1aDirector.new(data, m.session)
	director.ground_fn = func(x: float, z: float) -> float:
		var h: float = main.cells.terrain_height_at(x, z)
		return 0.0 if is_nan(h) else h
	limits = WalkLimits.new(data.get("walk_limits", []))
	saves = Day1aSave.new(String(m.args.get("save-dir", "user://saves")))
	session_id = Time.get_datetime_string_from_system(false, true).replace(":", "-").replace(" ", "_")
	# the office as Day 1 sings it (opening versicle, then a psalm)
	var D: Dictionary = m.content.doc("sounds").get("day1a", {})
	for o: String in (D.get("chant_for", {}) as Dictionary).keys():
		m.session.office.chant_for[o] = D["chant_for"][o]
	for sid: String in (D.get("streams", {}) as Dictionary).keys():
		m.session.office.streams[sid] = D["streams"][sid]
	m.audio.closed_doors = PackedStringArray(data.get("doors", {}).get("closed", []))
	m.audio.office_fn = director.office_sung
	world = Day1aWorld.new()
	add_child(world)
	world.setup(m, director)
	for id: String in (data["people"] as Dictionary).keys():
		_figure(id, data["people"][id], true)
	for b: Dictionary in data.get("anonymous", []):
		_figure(String(b["id"]), b.merged({"motion": "brother"}), false)
	for b: Dictionary in data.get("sext_leavers", []):
		_figure(String(b["id"]), b.merged({"motion": "brother"}), false)
	var A: Dictionary = m.content.doc("animals").get("animals", {}).get("mule", {})
	for mid: String in ["mule_w", "mule_a"]:
		var mf := MuleFigure.new()
		add_child(mf)
		mf.setup(director.a(mid), A.get("coat", {}), float(A.get("scale", 0.41)))
		mule_nodes[mid] = mf
		mf.leader_hand = _hand_for.bind(mid)
	fp = FPBody.new()
	add_child(fp)
	fp.setup(m.player, m.content)
	hud = Day1aHud.new()
	add_child(hud)
	hud.setup()
	audio = Day1aAudio.new()
	add_child(audio)
	audio.setup(m, director)
	# base HUD: no hour cartouche, no room banner, no stats in the game
	m.hud.clock_label.visible = false
	m.hud.banner.visible = false
	var pause_box: Container = m.hud.pause_panel.get_child(0)
	hud.add_options(pause_box, m.player)
	m.player.limit_fn = func(a: Vector3, b: Vector3) -> Vector3: return limits.allowed(a, b)
	director.say.connect(_on_say)
	director.caption.connect(func(t: String) -> void: hud.caption(t))
	director.choice.connect(func(_id: String, opts: Array) -> void: hud.show_choice(opts))
	director.choice_closed.connect(func(_id: String) -> void: hud.hide_choice())
	hud.chose.connect(func(o: String) -> void: director.choose(o))
	director.autosave.connect(_autosave)
	director.ended.connect(_on_end)
	director.beat_changed.connect(func(_o: String, n: String) -> void: print("[day1a] beat ", n, " t=", snappedf(director.t, 0.1), " h=", snappedf(main.session.clock.hours, 0.01)))

func mule_node(id: String) -> Node3D:
	return mule_nodes.get(id)

func _figure(id: String, d: Dictionary, named: bool) -> void:
	var f := ActorFigure.new()
	add_child(f)
	f.setup(director.a(id), d, main.content, main, named)
	figures[id] = f

func _hand_for(mid: String) -> Variant:
	var tr: Dictionary = director.trails.get(mid, {})
	if tr.is_empty() or not director.a(mid).present:
		return null
	var leader: String = tr["leader"]
	if leader == "adso":
		return fp.hand()
	if figures.has(leader) and director.a(leader).present:
		return (figures[leader] as ActorFigure).hand_world()
	return null

func start() -> void:
	director.start()
	var sp: Dictionary = director.start_position()
	var p: Vector3 = sp["pos"]
	var y: float = main.cells.terrain_height_at(p.x, p.z)
	main.player.teleport(Vector3(p.x, (0.0 if is_nan(y) else y) + 0.05, p.z), float(sp["yaw"]), "day1a start")

func _on_say(spk: String, _id: String, text: String, label: String) -> void:
	var dur: float = Day1aDirector.line_duration(text)
	hud.say(label, text, dur + 0.6, spk == "adso")
	_speaking[spk] = director.t + dur

func _physics_process(dt: float) -> void:
	if main.paused or _ended:
		return
	var pl: PlayerController = main.player
	var cam: Camera3D = pl.camera
	var eye: Vector3 = cam.global_position
	var fwd: Vector3 = -cam.global_transform.basis.z
	var hs: float = Vector2(pl.velocity.x, pl.velocity.z).length()
	var look_hit: Variant = null
	if director.lead.state == "WAIT" and director.beat == "road":
		var q := PhysicsRayQueryParameters3D.create(eye, eye + fwd * 80.0, 1)
		q.exclude = [pl.get_rid()]
		var hit: Dictionary = pl.get_world_3d().direct_space_state.intersect_ray(q)
		look_hit = hit.get("position", eye + fwd * 40.0)
	director.tick(dt, pl.global_position, hs, eye, fwd, look_hit)
	# what Adso carries sets his pace
	var S: Dictionary = director.speeds()
	pl.walk_speed = float(S["walk"])
	pl.run_speed = float(S["run"])
	fp.carrying = director.carrying
	fp.leading = String(director.trails.get("mule_a", {}).get("leader", "")) == "adso"
	fp.seated = director.seated != ""
	if director.holding == "steady" and Vector2(pl.global_position.x - director.a("mule_a").pos.x, pl.global_position.z - director.a("mule_a").pos.z).length() > 3.2:
		director.release_hold()
	for id: String in figures.keys():
		(figures[id] as ActorFigure).speaking = float(_speaking.get(id, -1.0)) > director.t
	_personal_space(dt)
	# the director let go of the seat (the bell, a reload): the body stands too
	if pl.seat != null and director.seated == "":
		var st: Variant = pl.seat
		pl.seat = null
		pl.global_position = _clear_floor_near(st)
	# seated: walking away stands Adso up (E on "Get up" works too)
	if pl.seat != null and pl.input_enabled and not pl.autopilot_active and Input.get_vector("move_left", "move_right", "move_back", "move_forward").length() > 0.5:
		_do("stand")
	_probe(eye, fwd)

## The interaction in reach (same rule as the proof's probe: radius, height,
## an unobstructed ray, and facing for small targets).
func _probe(eye: Vector3, fwd: Vector3) -> void:
	var best := ""
	var best_label := ""
	var best_score := -INF
	for it: Dictionary in director.interactions():
		var p: Vector3 = it["pos"]
		var d: float = p.distance_to(eye)
		var r: float = it["radius"]
		if bool(it.get("always", false)):
			if best == "":
				best = it["id"]
				best_label = it["label"]
				best_score = -1000.0
			continue
		if d > r or absf(p.y - eye.y) > 2.8 or not main.probe.visible_from(eye, p, d):
			continue
		var facing: float = (p - eye).normalized().dot(fwd) if d > 0.05 else 1.0
		if facing < 0.35 and d > 1.1:
			continue
		# what the crosshair is nearest wins; distance only breaks near-ties
		# (small things side by side on a tray)
		var score: float = -6.0 * acos(clampf(facing, -1.0, 1.0)) - d / r
		if score > best_score:
			best_score = score
			best = it["id"]
			best_label = it["label"]
	if best != _prompt_id:
		_prompt_id = best
		main.hud.set_prompt(best_label)

func handle_input(event: InputEvent) -> bool:
	if event.is_action_pressed("interact"):
		if _prompt_id != "":
			_do(_prompt_id)
		return true
	if event is InputEventKey and (event as InputEventKey).pressed and not (event as InputEventKey).echo:
		var k: Key = (event as InputEventKey).physical_keycode
		if k >= KEY_1 and k <= KEY_4:
			return hud.pick(int(k - KEY_1))
	if event.is_action_pressed("save_game"):
		var err: String = saves.write(Day1aSave.snapshot(director, main.player.global_position, main.player.yaw, main.player.pitch))
		main.hud.show_toast("Saved." if err == "" else "Save failed: " + err, 2200)
		return true
	if event.is_action_pressed("load_game"):
		load_save()
		return true
	if event.is_action_pressed("notebook"):
		return true
	return false

func _do(id: String) -> void:
	var r: Dictionary = director.interact(id)
	var pl: PlayerController = main.player
	if r.has("sit"):
		var at: Vector3 = r["sit"]
		pl.seat = {"pos": Vector3(at.x, at.y if at.y > 3.0 else _floor_at(at), at.z), "eye": 1.18, "floor": pl.global_position.y}
		pl.yaw = float(r.get("yaw", pl.yaw))
	elif r.has("stand"):
		var s: Variant = pl.seat
		pl.seat = null
		if s != null:
			pl.global_position = _clear_floor_near(s)
	if r.has("eat"):
		fp.eat(String(r["eat"]))
	_prompt_id = ""
	main.hud.set_prompt("")

## People and mules have bodies: Adso is eased out of anyone he walks into
## (a soft push through move_and_collide, so walls and doors still hold;
## no hard colliders that could pin him in the gate passage or on the stair).
func _personal_space(dt: float) -> void:
	var pl: PlayerController = main.player
	if pl.seat != null or dt <= 0.0:
		return
	var me: Vector3 = pl.global_position
	var push := Vector3.ZERO
	for id: String in director.actors.keys():
		var ac: Actor = director.actors[id]
		if not ac.present:
			continue
		var f: Node3D = figures.get(id, mule_nodes.get(id, null))
		if f == null or not f.visible:
			continue
		var at: Vector3 = f.global_position
		if absf(at.y - me.y) > 1.2:
			continue
		# a person is one circle; a mule two, along its body
		var circles: Array = [[at, 0.32]]
		if id.begins_with("mule"):
			var ax := Vector3(sin(f.rotation.y), 0, cos(f.rotation.y))
			circles = [[at + ax * 0.45, 0.42], [at - ax * 0.45, 0.42]]
		for c: Array in circles:
			var d := Vector2(me.x - (c[0] as Vector3).x, me.z - (c[0] as Vector3).z)
			var need: float = PlayerController.RADIUS + float(c[1])
			if d.length() < need:
				var n: Vector2 = d.normalized() if d.length() > 1e-3 else Vector2(sin(pl.yaw), cos(pl.yaw))
				push += Vector3(n.x, 0, n.y) * (need - d.length())
	if push.length() > 1e-4:
		pl.move_and_collide(push.limit_length(2.5 * dt + 0.02))

## Getting up: step off the seat to the nearest floor a body fits on (the
## seat itself is furniture with a collider).
func _clear_floor_near(seat: Dictionary) -> Vector3:
	var pl: PlayerController = main.player
	# the seat in plan, at the floor Adso stood on when he sat down
	var sp: Vector3 = seat["pos"]
	var p := Vector3(sp.x, float(seat.get("floor", sp.y)), sp.z)
	var space: PhysicsDirectSpaceState3D = pl.get_world_3d().direct_space_state
	var cap := CapsuleShape3D.new()
	cap.radius = PlayerController.RADIUS
	cap.height = PlayerController.HEIGHT
	var q := PhysicsShapeQueryParameters3D.new()
	q.shape = cap
	q.collision_mask = pl.collision_mask
	q.exclude = [pl.get_rid()]
	for r: float in [0.55, 0.7, 0.9, 1.1]:
		for k: int in 12:
			# behind the seated facing first (away from the table)
			var a: float = pl.yaw + float(k) * TAU / 12.0
			var c := Vector3(p.x + sin(a) * r, p.y, p.z + cos(a) * r)
			# the same floor (not a bed or a chest beside the seat), reachable
			# from the seat at knee height, room for the whole body
			var fy: float = _floor_at(c)
			if absf(fy - p.y) > 0.08:
				continue
			var ray := PhysicsRayQueryParameters3D.create(Vector3(p.x, p.y + 0.5, p.z), Vector3(c.x, fy + 0.5, c.z), pl.collision_mask, [pl.get_rid()])
			if not space.intersect_ray(ray).is_empty():
				continue
			q.transform = Transform3D(Basis(), Vector3(c.x, fy + 0.06 + cap.height / 2.0, c.z))
			if space.intersect_shape(q, 1).is_empty():
				return Vector3(c.x, fy + 0.05, c.z)
	return p + Vector3(0, 0.05, 0)

func _floor_at(p: Vector3) -> float:
	var q := PhysicsRayQueryParameters3D.create(p + Vector3(0, 1.5, 0), p + Vector3(0, -2.0, 0), 1)
	var hit: Dictionary = main.player.get_world_3d().direct_space_state.intersect_ray(q)
	return float((hit["position"] as Vector3).y) if not hit.is_empty() else p.y

func _autosave(reason: String) -> void:
	var err: String = saves.write(Day1aSave.snapshot(director, main.player.global_position, main.player.yaw, main.player.pitch))
	print("[day1a] autosave ", reason, " ", "ok" if err == "" else err)

func load_save() -> void:
	var r: Dictionary = saves.read()
	if r["snapshot"] == null:
		main.hud.show_toast("Nothing to load: %s" % ", ".join(r["report"]), 3500)
		return
	var s: Dictionary = r["snapshot"]
	var warn: PackedStringArray = director.restore(s["director"])
	var c: Dictionary = s["clock"]
	main.session.clock.set_time(float(c["hours"]), true)
	main.session.clock.rate = float(c.get("rate", 0.0))
	var pp: Array = s["player"]["position"]
	main.player.seat = null
	main.player.teleport(Vector3(float(pp[0]), float(pp[1]), float(pp[2])), float(s["player"]["yaw"]), "load", float(s["player"].get("pitch", 0.0)))
	main.lighting.apply_time(main.session.clock.hours)
	main.hud.show_toast("Loaded (%s)%s" % [r["source"], "" if warn.is_empty() else ": " + ", ".join(warn)], 2800)

func _on_end() -> void:
	_ended = true
	hud.show_end()
	write_telemetry("end")

func write_telemetry(reason: String) -> String:
	if _tel_written and reason != "end":
		return _tel_path
	_tel_written = true
	var dir: String = String(main.args.get("telemetry-dir", "user://day1a/telemetry"))
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(dir))
	var path: String = dir.path_join("day1a_%s_%s.json" % [session_id, reason])
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f == null:
		return ""
	f.store_string(JSON.stringify({"scenario": "day1a", "reason": reason, "real_s": director.t, "beat": director.beat, "hours": main.session.clock.hours,
		"summary": director.tel.summary(), "people": director.people.to_dict(), "observations": director.obs.to_dict(), "telemetry": director.tel.to_dict(), "audio_events": audio.log.size()}, " "))
	f.close()
	_tel_path = path
	return path

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST or what == NOTIFICATION_PREDELETE:
		if director != null and not _tel_written and director.t > 5.0:
			write_telemetry("quit")
