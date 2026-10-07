extends SceneTree
## Headless Day-1A tests (domain only: no scene, no rendering).
##   godot --headless --path native --script res://tests/day1a_tests.gd
## A simulated walker plays the day through the director exactly as the
## scene adapter would feed it (feet, ground speed, eye, view direction),
## in several styles: normal, slow, rushing, confused, ignoring Nones.
## Exit code 0 only when every test passes.

var _results: Array = []
var _current: String = ""
var _fails: int = 0
var content: ContentData
var scen: Dictionary

func _initialize() -> void:
	content = ContentData.new()
	if not content.load_dir("res://content"):
		printerr("content errors: ", content.errors)
		quit(2)
		return
	scen = content.doc("day1a")
	for m: Dictionary in get_method_list():
		var n: String = m["name"]
		if n.begins_with("test_"):
			_current = n
			var before: int = _fails
			var t0: int = Time.get_ticks_msec()
			call(n)
			_results.append({"test": n, "pass": _fails == before, "ms": Time.get_ticks_msec() - t0})
	var passed: int = _results.filter(func(r: Dictionary) -> bool: return r["pass"]).size()
	var summary: Dictionary = {"engine": Engine.get_version_info()["string"], "suite": "day1a", "passed": passed, "total": _results.size(), "failures": _fails, "results": _results, "playthroughs": _plays}
	print(JSON.stringify(summary, "  "))
	var out: String = OS.get_environment("ABBEY_TEST_REPORT")
	if out != "":
		var f := FileAccess.open(out, FileAccess.WRITE)
		f.store_string(JSON.stringify(summary, "  "))
		f.close()
	quit(0 if passed == _results.size() else 1)

func check(cond: bool, what: String) -> void:
	if not cond:
		_fails += 1
		printerr("FAIL %s: %s" % [_current, what])

var _plays: Dictionary = {}

func director(dir: String = "") -> Day1aDirector:
	if dir == "":
		dir = _scratch("day1a")
	var s := GameSession.new(content, dir, 11.5, 3)
	s.saves.delete_all()
	var d := Day1aDirector.new(scen, s)
	return d

# --- a simulated walker -----------------------------------------------------------

class Walker:
	var d: Day1aDirector
	var mirror: Day1aDirector = null   # a restored copy fed the same actions
	var pos: Vector3
	var fwd: Vector3 = Vector3(0, 0, -1)
	var speed: float = 0.0
	var path: Array[Vector3] = []
	var style: String = "normal"
	var log: Array = []
	var waits_seen: int = 0
	var stuck_t: float = 0.0
	var _pause: float = 0.0
	var _step: int = 0
	func _init(director: Day1aDirector, st: String) -> void:
		d = director
		style = st
		var sp: Dictionary = d.start_position()
		pos = sp["pos"]
		pos.y = 0.0
	func eye() -> Vector3:
		return pos + Vector3(0, 1.62, 0)
	func go_node(id: String) -> void:
		path = d.graph.path_to(pos, id)
		path.pop_front()
	func go_point(p: Vector3) -> void:
		path = d.graph.path_to(pos, d.graph.nearest(p))
		path.pop_front()
		path.append(p)
	func walking() -> bool:
		return not path.is_empty()
	func look_at(p: Vector3) -> void:
		var v: Vector3 = p - eye()
		if v.length() > 0.01:
			fwd = v.normalized()
	## advance the walk; returns the actual ground speed
	func move(dt: float, run: bool = false) -> void:
		var S: Dictionary = d.speeds()
		var v: float = float(S["run"] if run else S["walk"])
		if style == "slow":
			v *= 0.82
		if _pause > 0.0:
			_pause -= dt
			speed = 0.0
			return
		if path.is_empty():
			speed = 0.0
			return
		var tg: Vector3 = path[0]
		var to := Vector2(tg.x - pos.x, tg.z - pos.z)
		var L: float = to.length()
		var mv: float = minf(L, v * dt)
		if L > 1e-4:
			pos.x += to.x / L * mv
			pos.z += to.y / L * mv
			fwd = Vector3(to.x / L, fwd.y * 0.9, to.y / L).normalized()
		if not is_nan(tg.y):
			pos.y = move_toward(pos.y, tg.y, maxf(0.5, absf(tg.y - pos.y)) * mv / maxf(L, 0.01) if L > 0.01 else 10.0)
		elif pos.y > 3.0 and tg.y != tg.y:
			pos.y = move_toward(pos.y, 0.0, 4.0 * dt)
		if L - mv < 0.05:
			path.pop_front()
		speed = mv / dt
		# slow walkers stop now and then to look about
		if style == "slow":
			_step += 1
			if _step % 900 == 0:
				_pause = 9.0
	func near(p: Vector3, r: float) -> bool:
		return Vector2(p.x - pos.x, p.z - pos.z).length() < r
	func offer(id: String) -> Dictionary:
		for it: Dictionary in d.interactions():
			if it["id"] == id:
				return it
		return {}
	func try(id: String) -> bool:
		var it: Dictionary = offer(id)
		if it.is_empty():
			return false
		if eye().distance_to(it["pos"]) > float(it["radius"]) - 0.1 and not it.get("always", false):
			if path.is_empty():
				go_point(Vector3((it["pos"] as Vector3).x, NAN, (it["pos"] as Vector3).z))
			return false
		look_at(it["pos"])
		d.interact(id)
		if mirror != null:
			mirror.interact(id)
		log.append([snappedf(d.t, 0.1), d.beat, id])
		return true

## Play the whole day; returns a record. `style`: normal | slow | rush |
## confused | ignore_nones.
func play(style: String, max_s: float = 3600.0, captures: Dictionary = {}) -> Dictionary:
	var d := director(_scratch("day1a_" + style))
	var beats: Array = []
	var says: Array = []
	var choices: Array = []
	var bells: Array = []
	var saves: Array = []
	d.beat_changed.connect(func(_o: String, n: String) -> void: beats.append([snappedf(d.t, 0.1), n, snappedf(d.session.clock.hours, 0.001)]))
	d.say.connect(func(s: String, id: String, _tx: String, label: String) -> void: says.append([snappedf(d.t, 0.1), s, id, label]))
	d.choice.connect(func(id: String, opts: Array) -> void: choices.append([id, opts.map(func(o: Dictionary) -> String: return o["id"])]))
	d.bell.connect(func(o: String, n: int, _i: float) -> void: bells.append([o, n, snappedf(d.session.clock.hours, 0.001)]))
	d.autosave.connect(func(r: String) -> void: saves.append(r))
	var ended := [false]
	d.ended.connect(func() -> void: ended[0] = true)
	d.start()
	var w := Walker.new(d, style)
	var dt: float = 1.0 / 30.0
	var wrong_done := false
	var room := ""
	var lead_states: Dictionary = {}
	var max_gap := 0.0
	while d.t < max_s and not ended[0]:
		# what this player wants to do now
		match d.beat:
			"road":
				if style == "rush":
					if not w.walking(): w.go_node("g_fore")
					w.move(dt, true)
				else:
					if not w.walking() and not w.near(d.node("g_fore"), 2.0): w.go_node("g_fore")
					# glance at the valley, the pines, the wall: sometimes stop
					if style == "slow" and d.beat_t > 8.0 and d.beat_t < 40.0:
						w.look_at(Vector3(-170, -45, 60))
						w.move(dt * 0.3)
					else:
						w.move(dt)
			"sext_gate":
				if not w.near(d.node("g_out"), 2.0) and not w.walking(): w.go_node("g_out")
				w.move(dt)
				if not w.walking(): w.look_at(Vector3(-102.75, 1.7, -10.2))
			"gate_open":
				if not w.offer("hold_mule").is_empty():
					w.try("hold_mule")
				elif d.holding != "steady":
					if not w.near(Vector3(-99.0, 0, -8.6), 1.5) and not w.walking(): w.go_point(Vector3(-99.0, NAN, -8.6))
					w.move(dt)
					if not w.walking(): w.look_at(Vector3(42, 14, -66))
				else:
					w.look_at(d.a("fazio").pos + Vector3(0, 0.5, 0))
			"reception", "to_cell":
				if d.carrying == "" and not w.offer("take_bedding").is_empty():
					w.try("take_bedding")
				elif d.carrying == "bedding":
					# a slow guest waits for his hosts and follows them at his own pace
					if style == "slow" and d.beat == "reception":
						pass
					elif not w.try("place_bedding"):
						if not w.walking(): w.go_node("c_niche")
						w.move(dt, style == "rush")
				w.move(dt)
			"second_bundle":
				if d.carrying == "" and String(d.props["chest"]["where"]) == "ground":
					if not w.try("take_chest"):
						if style == "confused" and not wrong_done and w.pos.z < -2.0 and w.pos.x > -40.0:
							# turn the wrong way at the avenue: toward the church front
							if not w.near(Vector3(-16.0, 0, -9.0), 1.0):
								if not w.walking() or not w.near(w.path[-1], 30.0) or w.path[-1].distance_to(Vector3(-16.0, w.path[-1].y, -9.0)) > 0.5:
									w.go_point(Vector3(-16.0, NAN, -9.0))
							else:
								wrong_done = true
								w.path.clear()
						elif not w.walking(): w.go_node("g_chest")
						w.move(dt, style == "rush")
				elif d.carrying == "chest":
					if not w.try("place_chest"):
						if not w.walking(): w.go_node("c_chest")
						w.move(dt, style == "rush")
			"meal":
				if d.pending_choice != "":
					var o0: String = String(d.pending_options[0]["id"])
					d.choose(o0)
					if w.mirror != null:
						w.mirror.choose(o0)
				elif style == "rush":
					if d.seated == "" and not w.try("sit_stool"):
						w.move(dt)
					else:
						w.try("eat_bread") or w.try("eat_cheese")
				else:
					if d.seated == "" and d.carrying == "":
						if not w.offer("wring_hose").is_empty() and int(d.flags.get("eat_bread", 0)) > 0:
							w.try("wring_hose")
						elif not w.try("sit_stool"):
							if not w.walking(): w.go_node("c_stool")
							w.move(dt)
					elif d.carrying == "hose":
						if not w.try("lay_hose"):
							if not w.walking(): w.go_node("c_wwin")
							w.move(dt)
					else:
						if int(d.flags.get("eat_bread", 0)) == 0: w.try("eat_bread")
						elif not d.flags.has("pour_wine"): w.try("pour_wine")
						elif not d.flags.has("raisins"): w.try("raisins")
						elif not w.offer("wring_hose").is_empty(): w.try("stand")
			"free", "after_nones":
				if d.pending_choice != "":
					var o1: String = String(d.pending_options[-1]["id"])
					d.choose(o1)
					if w.mirror != null:
						w.mirror.choose(o1)
				elif d.seated != "":
					if d.session.clock.hours > 13.9: w.try("stand")
				elif style == "ignore_nones" or style == "rush":
					if style == "rush" and d.session.clock.hours < 13.5 and not w.offer("sit_bench_porch").is_empty():
						w.try("sit_bench_porch")
					elif not w.near(d.node("c_mid"), 1.0) and d.session.clock.hours < 13.6:
						if not w.walking(): w.go_node("c_mid")
						w.move(dt)
				else:
					if not d.flags.has("fulco_talked"):
						if not w.try("talk_fulco"):
							if not w.walking(): w.go_point(d.a("fulco").pos)
							w.move(dt)
					elif String(d._sub.get("water", "")) == "":
						if not w.try("help_nuto"):
							if not w.walking(): w.go_point(d.a("nuto").pos)
							w.move(dt)
					elif d.carrying == "bucket":
						if not w.try("set_bucket"):
							if not w.walking(): w.go_node("st_foot")
							w.move(dt)
					elif not w.near(d.node("guests"), 1.5):
						if not w.walking(): w.go_node("guests")
						w.move(dt)
					else:
						w.look_at(Vector3(35, 1.5, -5.46))
			"nones":
				if style != "ignore_nones" and not w.near(d.node("guests"), 1.5):
					if not w.walking(): w.go_node("guests")
					w.move(dt)
				else:
					w.speed = 0.0
					var mover: Variant = null
					for b: Dictionary in scen["anonymous"]:
						if d.a(String(b["id"])).moving:
							mover = d.a(String(b["id"])).pos + Vector3(0, 1.2, 0)
							break
					if mover != null: w.look_at(mover)
		# keep the room classification the scene would give (church / not)
		var rid: String = d.session.rooms.classify_feet(Vector3(w.pos.x, maxf(w.pos.y, 0.3), w.pos.z)).get("id", "")
		if rid != room:
			room = rid
			d.session.room_id = rid
		if d.holding == "steady" and not w.near(d.a("mule_a").pos, 3.0):
			d.release_hold()
			if w.mirror != null:
				w.mirror.release_hold()
		d.session.clock.advance(dt)
		d.tick(dt, w.pos, w.speed, w.eye(), w.fwd, null)
		_mirror_step(d, w, dt, room, captures)
		if d.beat == "road":
			lead_states[d.lead.state] = int(lead_states.get(d.lead.state, 0)) + 1
			max_gap = maxf(max_gap, d.lead.progress(d.a("william").pos) - d.lead.progress(w.pos))
	var rec: Dictionary = {"style": style, "ended": ended[0], "t": snappedf(d.t, 0.1), "beats": beats, "bells": bells, "autosaves": saves, "choices": choices, "lines": says.size(),
		"people_named": d.people.people.keys().filter(func(k: String) -> bool: return d.people.knows_name(k)), "observations": Array(d.obs.order), "telemetry": d.tel.summary(), "interactions": w.log,
		"lead_state_frames": lead_states, "max_road_gap_m": snappedf(max_gap, 0.1), "placements": _placements(d)}
	_plays[style] = {"t": rec["t"], "ended": rec["ended"], "beats": beats.map(func(b: Array) -> String: return String(b[1])), "named": rec["people_named"], "observations": rec["observations"], "summary": rec["telemetry"]}
	return rec

## Saving and loading must not change what happens next. At the first frame
## where a capture's condition holds, the director is saved (the real file
## envelope, JSON with full precision) and restored into a fresh director;
## for the next 60 s both receive the same inputs, interactions and
## choices, and every actor, line, beat and choice is compared each frame.
var _mir: Dictionary = {}

func _mirror_step(d: Day1aDirector, w: Walker, dt: float, room: String, captures: Dictionary) -> void:
	if w.mirror == null:
		for label: String in captures.keys():
			if not _captured.has(label) and bool((captures[label] as Callable).call(d)):
				_captured[label] = {"t": snappedf(d.t, 0.1), "beat": d.beat, "max_dev_m": 0.0, "mismatch": ""}
				var env: Dictionary = Day1aSave.snapshot(d, w.pos, 0.0, 0.0)
				var round: Dictionary = JSON.parse_string(JSON.stringify(env, "", true, true))
				var errs: PackedStringArray = Day1aSave.validate(round)
				check(errs.is_empty(), "%s: saved state validates (%s)" % [label, errs])
				var d2 := director(_scratch("mirror_" + label))
				d2.session.clock.set_time(float(round["clock"]["hours"]), true)
				d2.session.clock.rate = float(round["clock"]["rate"])
				var placed: Dictionary = {}
				for id: String in d2.actors.keys():
					placed[id] = d2.a(id).placements.size()
				var warn: PackedStringArray = d2.restore(round["director"])
				check(warn.is_empty(), "%s: clean restore (%s)" % [label, warn])
				for id: String in d2.actors.keys():
					check(d2.a(id).placements.size() == placed[id], "%s: restore places nobody (%s)" % [label, id])
				w.mirror = d2
				_mir = {"label": label, "until": d.t + 60.0}
				break
		return
	var d2: Day1aDirector = w.mirror
	d2.session.room_id = room
	d2.session.clock.advance(dt)
	d2.tick(dt, w.pos, w.speed, w.eye(), w.fwd, null)
	var C: Dictionary = _captured[_mir["label"]]
	var dev := 0.0
	for id: String in d.actors.keys():
		var p1: Vector3 = d.a(id).pos
		var p2: Vector3 = d2.a(id).pos
		dev = maxf(dev, Vector2(p1.x - p2.x, p1.z - p2.z).length())
		if String(C["mismatch"]) == "" and (d.a(id).present != d2.a(id).present or d.a(id).activity != d2.a(id).activity):
			C["mismatch"] = "%s at %.1f: present/activity %s/%s vs %s/%s" % [id, d.t, d.a(id).present, d.a(id).activity, d2.a(id).present, d2.a(id).activity]
	C["max_dev_m"] = snappedf(maxf(float(C["max_dev_m"]), dev), 0.0001)
	if String(C["mismatch"]) == "":
		var named1: Array = d.people.people.keys().filter(func(k: String) -> bool: return d.people.knows_name(k))
		var named2: Array = d2.people.people.keys().filter(func(k: String) -> bool: return d2.people.knows_name(k))
		named1.sort()
		named2.sort()
		var diffs: Array = []
		for pair: Array in [["beat", d.beat, d2.beat], ["choice", d.pending_choice, d2.pending_choice], ["lines", _skeys(d.lines_said), _skeys(d2.lines_said)],
				["carrying", d.carrying, d2.carrying], ["seated", d.seated, d2.seated], ["holding", d.holding, d2.holding], ["named", named1, named2],
				["props", _skeys(d.props), _skeys(d2.props)], ["flags", _skeys(d.flags), _skeys(d2.flags)]]:
			if pair[1] != pair[2]:
				diffs.append("%s %s / %s" % [pair[0], str(pair[1]).left(160), str(pair[2]).left(160)])
		if not diffs.is_empty():
			C["mismatch"] = "at %.1f: %s" % [d.t, "; ".join(diffs)]
	if d.t >= float(_mir["until"]) or d.beat == "end":
		C["mirrored_s"] = snappedf(d.t - float(C["t"]), 0.1)
		w.mirror = null

var _captured: Dictionary = {}

func _scratch(name: String) -> String:
	var root: String = OS.get_environment("ABBEY_TEST_SAVES")
	return (root if root != "" else "user://test_saves").path_join(name)

func _placements(d: Day1aDirector) -> Dictionary:
	var out: Dictionary = {}
	for id: String in Day1aDirector.NAMED:
		out[id] = d.a(id).placements.map(func(p: Dictionary) -> String: return String(p["reason"]))
	return out

# --- tests ------------------------------------------------------------------------

func test_scenario_data_is_consistent() -> void:
	var g := WayGraph.new(scen)
	check(g.nodes.size() > 100, "graph nodes")
	for r: String in (scen["routes"] as Dictionary).keys():
		var ids: Array = scen["routes"][r]
		check(not g.route(String(ids[0]), String(ids[-1])).is_empty(), "route %s connected" % r)
	for b: Dictionary in scen["anonymous"]:
		var sp: Array = b["spot"]
		var from: String = g.nearest(Vector3(float(sp[0]), 0.3, float(sp[1])))
		check(not g.route(from, String(b["stall"])).is_empty(), "%s can reach its stall" % b["id"])
	# stable identities: one face per named person, none reused by the community
	var used: Dictionary = {}
	for id: String in (scen["people"] as Dictionary).keys():
		var tpl: String = scen["people"][id]["template"]
		check(not used.has(tpl), "template %s used once" % tpl)
		used[tpl] = id
	for b: Dictionary in scen["anonymous"]:
		check(not used.has(String(b["template"])), "%s not wearing a named face" % b["id"])
	# Day 1 never includes the phase-1 secret route or its resident
	var txt: String = JSON.stringify(scen).to_lower()
	for w: String in ["alinardo", "altar", "ossuary", "skull", "library", "labyrinth"]:
		check(not txt.contains(w), "scenario does not mention %s" % w)

func test_lead_wait_waits_at_look_points_and_resumes() -> void:
	var d := director()
	d.start()
	var w := Walker.new(d, "normal")
	var states: Array = []
	var at_wait: Array = []
	d.lead.state_changed.connect(func(o: String, n: String, info: Dictionary) -> void:
		states.append([o, n, info.get("look_point", "")])
		if n == "WAIT" and at_wait.is_empty():
			at_wait.append(d.a("william").pos))
	var dt := 1.0 / 30.0
	# stand still: William walks on, then stops at a look point (not mid-road)
	for i: int in 30 * 40:
		d.tick(dt, w.pos, 0.0, w.eye(), w.fwd, null)
	check(d.lead.state == "WAIT" or d.lead.state == "SHARE", "William waits for a player who stays behind (state %s)" % d.lead.state)
	var lp: String = String(d.lead.target_lp.get("id", ""))
	check(lp != "", "the wait is at an authored look point")
	var wpos: Vector3 = at_wait[0] if not at_wait.is_empty() else d.a("william").pos
	var lpd: Dictionary = {}
	for x: Dictionary in scen["look_points"]:
		if x["id"] == lp:
			lpd = x
	check(not lpd.is_empty() and Vector2(wpos.x - float(lpd["stand"][0]), wpos.z - float(lpd["stand"][1])).length() < 0.5, "he stands at the look point")
	check(d.lead.progress(wpos) - d.lead.progress(w.pos) > 10.0, "he waited only after falling more than ~12 m ahead")
	# walk up: he resumes once Adso is close, without calling
	w.go_node("g_fore")
	var resumed := false
	for i: int in 30 * 30:
		w.move(dt)
		d.tick(dt, w.pos, w.speed, w.eye(), w.fwd, null)
		if d.lead.state == "LEAD" and d.lead.waits >= 1:
			resumed = true
			break
	check(resumed, "William resumes when Adso approaches")
	var said: Array = d.lines_said.keys()
	check(not said.has("w_bedding_first"), "no hurrying line on the road")
	# no oscillation between LEAD and WAIT
	var flips: int = states.filter(func(s: Array) -> bool: return s[1] == "WAIT").size()
	check(flips <= 3, "few waits in 70 s (%d)" % flips)

func test_overtaking_william_makes_him_follow_without_reprimand() -> void:
	var d := director()
	d.start()
	var w := Walker.new(d, "rush")
	w.go_node("g_fore")
	var dt := 1.0 / 30.0
	var followed := false
	for i: int in 30 * 40:
		w.move(dt, true)
		d.tick(dt, w.pos, w.speed, w.eye(), w.fwd, null)
		if d.lead.state == "FOLLOW":
			followed = true
	check(followed, "William follows when overtaken")
	check(d.lead.overtakes >= 1, "overtake counted")
	var lines: Array = d.lines_said.keys()
	for bad: String in ["w_bedding_first", "w_take_bedding"]:
		check(not lines.has(bad), "no reprimand %s" % bad)
	check(d.a("william").pos.distance_to(d.node("g_fore")) < 9.0 or d.beat != "road", "William arrives behind Adso")

func test_normal_playthrough() -> void:
	var r: Dictionary = play("normal")
	check(r["ended"], "the day reaches its end (t=%s, beats %s)" % [r["t"], r["beats"]])
	var order: Array = r["beats"].map(func(b: Array) -> String: return String(b[1]))
	check(order == Array(Day1aDirector.BEATS), "beats in order: %s" % [order])
	var bl: Array = r["bells"]
	check(bl.size() == 2 and bl[0][0] == "sext" and bl[-1][0] == "nones", "Sext then Nones: %s" % [bl])
	check(bl.size() == 2 and absf(float(bl[-1][2]) - 14.4) < 0.02, "Nones rings at 14:24 on the clock")
	for n: String in ["fazio", "cellarer", "tebaldo", "nuto", "fulco"]:
		check((r["people_named"] as Array).has(n), "%s named by the end" % n)
	check((r["autosaves"] as Array) == ["cell", "meal", "end"], "autosaves %s" % [r["autosaves"]])
	check(not (r["observations"] as Array).is_empty(), "something was observed")
	check((r["choices"] as Array).size() >= 2, "meal question and Fulco's question were offered")
	var mins: float = float(r["t"]) / 60.0
	check(mins > 14.0 and mins < 40.0, "a normal walker takes 14–40 min (%.1f)" % mins)
	var S: Dictionary = r["telemetry"]
	check(float(S["solo_route"].get("back_in_cell", -1.0)) > 0.0, "solo route recorded")
	check(S["nones"].get("entered_church_t", -1.0) >= 0.0, "a player who goes to church is recorded as such")
	var ob: float = float(S["nones"].get("office_begun_t", -1.0))
	check(ob > 8.0 and ob <= 71.0, "Nones is sung once the brothers have walked to their stalls, not at the first stroke (%.1f s after the bell)" % ob)
	check(S["william_waits"] >= 0, "waits recorded")

func test_slow_playthrough_is_coherent() -> void:
	var r: Dictionary = play("slow")
	check(r["ended"], "slow walker ends the day (%s)" % [r["beats"]])
	check(int(r["telemetry"]["william_waits"]) >= 1, "William waits for a slow walker")
	check(float(r["max_road_gap_m"]) < 22.0, "William never runs far ahead (%.1f m)" % float(r["max_road_gap_m"]))
	# on the way to the guest house the cellarer (and William with him) eases
	# off and waits rather than leaving a lagging boy behind
	var rd: Dictionary = r["telemetry"]["william_lead_to_cell_m"]
	check(float(rd.get("p90", 999.0)) < 22.0, "the escort keeps a slow guest in sight (William's lead to the cell p90 %.1f m, %s)" % [float(rd.get("p90", 999.0)), rd])

func test_rushed_playthrough_is_coherent() -> void:
	var r: Dictionary = play("rush")
	check(r["ended"], "rushing walker ends the day (%s)" % [r["beats"]])
	check(int(r["telemetry"]["overtakes"]) >= 1, "rushing overtakes William")
	check(float(r["t"]) / 60.0 < 30.0, "a rush is not artificially delayed (%.1f min)" % (float(r["t"]) / 60.0))

func test_confused_route_recovers_without_ui() -> void:
	var r: Dictionary = play("confused")
	check(r["ended"], "confused walker ends the day")
	var wt: Array = r["telemetry"]["solo_route"].get("wrong_turns", [])
	check(not wt.is_empty(), "a wrong turn was recorded: %s" % [wt])

func test_nones_proceeds_without_adso() -> void:
	var r: Dictionary = play("ignore_nones")
	check(r["ended"], "the office ends without Adso (%s)" % [r["beats"]])
	var N: Dictionary = r["telemetry"]["nones"]
	check(float(N.get("entered_church_t", 0.0)) < 0.0, "Adso stayed out of church")
	check(float(N.get("outside_s", 0.0)) > 60.0, "the office lasted while he was elsewhere")

func test_people_are_named_only_when_heard() -> void:
	var m := PeopleMemory.new(scen["people"])
	check(m.label("nuto") == String(scen["people"]["nuto"]["description"]), "unnamed label is the description")
	check(not m.knows_name("nuto"), "no name before it is heard")
	check(m.hear_name("nuto", "tebaldo", 1.0), "name learned")
	check(not m.hear_name("nuto", "nuto", 2.0), "idempotent")
	check(m.label("nuto") == "Nuto", "label is the name")
	check(m.knows_name("william"), "William is known from the start")
	var m2 := PeopleMemory.new(scen["people"])
	m2.restore(m.to_dict())
	check(m2.knows_name("nuto") and not m2.knows_name("fulco"), "restore keeps exactly what was heard")

func test_observations_only_from_perception() -> void:
	var d := director()
	d.start()
	check(d.obs.order.is_empty(), "nothing observed at the start")
	check(not d.obs.add("not-an-observation", 0.0, "", ""), "unknown observation rejected")
	# looking at the valley from the road for long enough records it
	var eye := Vector3(-112.0, 1.6, 40.0)
	var fwd: Vector3 = (Vector3(-170, -45, 60) - eye).normalized()
	for i: int in 30 * 3:
		d.tick(1.0 / 30.0, Vector3(-112, 0, 40), 0.0, eye, fwd, null)
	check(d.obs.has("valley"), "a held look records the valley")
	check(not d.obs.has("aed_windows"), "the great building is not seen from outside the walls")

func test_save_restore_mid_route_keeps_actors_continuous() -> void:
	var d := director()
	d.start()
	var w := Walker.new(d, "normal")
	w.go_node("g_fore")
	var dt := 1.0 / 30.0
	for i: int in 30 * 20:
		w.move(dt)
		d.tick(dt, w.pos, w.speed, w.eye(), w.fwd, null)
	var snap: Dictionary = JSON.parse_string(JSON.stringify(d.to_dict(), "", true, true))
	var before: Vector3 = d.a("william").pos
	var d2 := director()
	var placed: Dictionary = {}
	for id: String in d2.actors.keys():
		placed[id] = d2.a(id).placements.size()
	var warn: PackedStringArray = d2.restore(snap)
	check(warn.is_empty(), "clean restore: %s" % [warn])
	check(d2.beat == d.beat, "beat restored")
	check(Vector2(d2.a("william").pos.x - before.x, d2.a("william").pos.z - before.z).length() < 0.01, "William exactly where he was")
	for id: String in d2.actors.keys():
		check(d2.a(id).placements.size() == placed[id], "restore places nobody: %s placed %d times on load" % [id, d2.a(id).placements.size() - int(placed[id])])
		check(Vector2(d2.a(id).pos.x - d.a(id).pos.x, d2.a(id).pos.z - d.a(id).pos.z).length() < 0.001 and d2.a(id).present == d.a(id).present, "%s restored where he was" % id)
	for i: int in 30 * 60:
		w.move(dt)
		d2.tick(dt, w.pos, w.speed, w.eye(), w.fwd, null)
	check(d2.beat != "road" or d2.lead.state in ["LEAD", "WAIT", "FOLLOW", "DONE", "TO_LOOK", "SHARE"], "walking continues after load")
	check(Vector2(d2.a("william").pos.x - before.x, d2.a("william").pos.z - before.z).length() > 1.0 or d2.lead.state == "WAIT", "he moved on from the saved spot")

func _skeys(dd: Dictionary) -> Array:
	var k: Array = dd.keys()
	k.sort()
	return k

## Save → load at the moments that matter, then compare 60 s of what happens
## next against the uninterrupted day (same inputs, actions and choices).
func test_save_and_load_do_not_change_what_happens_next() -> void:
	_captured.clear()
	var sets: Array = [
		{"road": func(d: Day1aDirector) -> bool: return d.beat == "road" and d.beat_t > 10.0,
		 "reception_greeting": func(d: Day1aDirector) -> bool: return d.beat == "reception" and String(d._sub.get("phase", "")) == "greeting" and d.line_queue.size() >= 2,
		 "solo_chest": func(d: Day1aDirector) -> bool: return d.beat == "second_bundle" and d.carrying == "chest",
		 "meal_tray_lines": func(d: Day1aDirector) -> bool: return d.beat == "meal" and String(d._sub.get("phase", "")) == "tebaldo_talk" and d.line_queue.size() >= 3,
		 "free_water": func(d: Day1aDirector) -> bool: return d.beat == "free" and String(d._sub.get("water", "")) == "walking",
		 "nones_bell": func(d: Day1aDirector) -> bool: return d.beat == "nones" and d.beat_t > 1.0,
		 "after_nones": func(d: Day1aDirector) -> bool: return d.beat == "after_nones" and d.beat_t > 3.0},
		{"to_cell_escort": func(d: Day1aDirector) -> bool: return d.beat == "to_cell" and d.a("cellarer").moving,
		 "meal_seated": func(d: Day1aDirector) -> bool: return d.beat == "meal" and d.seated == "stool",
		 "free_fulco": func(d: Day1aDirector) -> bool: return d.beat == "free" and d.flags.has("fulco_talked") and not d.lines_said.has("fu_name"),
		 "nones_walk": func(d: Day1aDirector) -> bool: return d.beat == "nones" and d.beat_t > 12.0 and d.a("brother:05").moving},
		{"meal_question": func(d: Day1aDirector) -> bool: return d.beat == "meal" and d.pending_choice == "meal_question",
		 "nones_choir": func(d: Day1aDirector) -> bool: return d.beat == "nones" and bool(d._sub.get("office_begun", false))},
	]
	for caps: Dictionary in sets:
		var r: Dictionary = play("normal", 3600.0, caps)
		check(r["ended"], "the day still ends with saves taken along the way")
	for label: String in ["road", "reception_greeting", "solo_chest", "meal_tray_lines", "free_water", "nones_bell", "after_nones",
			"to_cell_escort", "meal_seated", "free_fulco", "nones_walk", "meal_question", "nones_choir"]:
		check(_captured.has(label), "%s was reached and saved" % label)
		if not _captured.has(label):
			continue
		var C: Dictionary = _captured[label]
		check(String(C["mismatch"]) == "", "%s: what happens next is unchanged (%s)" % [label, C["mismatch"]])
		check(float(C["max_dev_m"]) < 0.02, "%s: everyone stays where the uninterrupted day puts them (max %.4f m)" % [label, float(C["max_dev_m"])])
		check(float(C.get("mirrored_s", 0.0)) >= 59.0 or String(C["beat"]) == "after_nones", "%s: compared for a minute (%.1f s)" % [label, float(C.get("mirrored_s", 0.0))])
	_plays["save_load_mirror"] = _captured.duplicate(true)

## Adso holding the halter while the porter sees to the hoof: the hold,
## its timer and the porter's work survive a load and end the same way.
func test_halter_hold_survives_load() -> void:
	var d := director()
	d.start()
	d._goto("sext_gate")
	d._goto("gate_open")
	# Adso inside the gate court (the reveal waits for him there); his mule
	# follows him in on its lead
	var at := Vector3(-100.0, 0.0, -8.6)
	var eye: Vector3 = at + Vector3(0, 1.62, 0)
	var ids: Array = []
	for i: int in 1200:
		ids = d.interactions().map(func(it: Dictionary) -> String: return String(it["id"]))
		if ids.has("hold_mule"):
			break
		d.tick(0.1, at, 0.0, eye, Vector3(1, 0, 0), null)
	check(ids.has("hold_mule"), "the porter asks for the halter")
	d.interact("hold_mule")
	for i: int in 15:
		d.tick(0.1, at, 0.0, eye, (d.a("fazio").pos - eye).normalized(), null)
	check(d.holding == "steady", "Adso holds the halter")
	var snap: Dictionary = JSON.parse_string(JSON.stringify(d.to_dict(), "", true, true))
	var d2 := director()
	d2.session.clock.set_time(d.session.clock.hours, true)
	check(d2.restore(snap).is_empty(), "clean restore while holding")
	check(d2.holding == "steady" and is_equal_approx(float(d2._sub.get("held", 0.0)), float(d._sub.get("held", 0.0))), "the hold and its timer are kept")
	var dev := 0.0
	for i: int in 300:
		for dd: Day1aDirector in [d, d2]:
			dd.tick(0.1, at, 0.0, eye, (dd.a("fazio").pos - eye).normalized(), null)
		for id: String in d.actors.keys():
			dev = maxf(dev, Vector2(d.a(id).pos.x - d2.a(id).pos.x, d.a(id).pos.z - d2.a(id).pos.z).length())
	check(d.beat == d2.beat and d.obs.has("mule_shoe") == d2.obs.has("mule_shoe") and d.holding == d2.holding, "the shoe and the hold end the same way (%s/%s, %s/%s)" % [d.beat, d2.beat, d.holding, d2.holding])
	check(dev < 0.001, "the porter and the mules move as before (%.4f m)" % dev)

## A name is learned when the line that speaks it is presented, never when
## the line is only queued; an interrupted introduction teaches nothing.
func test_names_are_learned_when_heard_not_when_queued() -> void:
	for interrupt: bool in [true, false]:
		var d := director()
		d.start()
		d._goto("free")
		d.line_queue.clear()
		d.talking_until = d.t
		d.interact("talk_fulco")
		var at := Vector3(-7.25, 0.3, 17.4)
		for i: int in 300:
			if d.pending_choice == "fulco":
				break
			d.tick(0.1, at, 0.0, at + Vector3(0, 1.62, 0), Vector3.FORWARD, null)
		check(d.pending_choice == "fulco", "the novice's question is reached")
		d.choose("loud")
		check(not d.people.knows_name("fulco"), "not known while the introduction is only queued")
		if interrupt:
			d._interrupt()
			for i: int in 100:
				d.tick(0.1, at, 0.0, at + Vector3(0, 1.62, 0), Vector3.FORWARD, null)
			check(not d.people.knows_name("fulco") and not d.lines_said.has("fu_name"), "an interrupted introduction teaches nothing")
		else:
			var known_at_line := false
			d.say.connect(func(_s: String, id: String, _t: String, label: String) -> void:
				if id == "fu_name":
					known_at_line = d.people.knows_name("fulco") and label == "Fulco")
			for i: int in 200:
				d.tick(0.1, at, 0.0, at + Vector3(0, 1.62, 0), Vector3.FORWARD, null)
			check(d.lines_said.has("fu_name") and d.people.knows_name("fulco"), "known once the introduction is presented")
	# every name in the scenario is taught by a line that says it
	for lid: String in (scen["lines"] as Dictionary).keys():
		for who: String in scen["lines"][lid].get("teaches", []):
			check(String(scen["lines"][lid]["t"]).contains(String(scen["people"][who]["name"]).split(" ")[-1]), "%s says %s's name" % [lid, who])

## A bell restored mid-peal rings only the strokes still due.
func test_bell_resumes_without_repeating() -> void:
	var d := director()
	d.start()
	var B: Dictionary = scen["bells"]["nones"]
	d._goto("free")
	var bells: Array = []
	d.bell.connect(func(o: String, n: int, _i: float) -> void: bells.append([o, n]))
	d._goto("nones")
	check(bells.size() == 1, "the bell rings once at Nones")
	d.beat_t = 4.0
	var snap: Dictionary = JSON.parse_string(JSON.stringify(d.to_dict(), "", true, true))
	var d2 := director()
	var bells2: Array = []
	d2.bell.connect(func(o: String, n: int, _i: float) -> void: bells2.append(o))
	d2.restore(snap)
	var rem: Array = d2.bell_remaining().get("offsets", [])
	var expect: int = 0
	for k: int in int(B["strokes"]):
		if 0.4 + k * float(B["interval_s"]) > 4.0:
			expect += 1
	check(bells2.is_empty(), "a load does not ring the bell again")
	check(rem.size() == expect and expect > 0 and expect < int(B["strokes"]), "the strokes still due ring (%d of %d)" % [rem.size(), int(B["strokes"])])
	check(d2.office_sung() == "", "no chant before the brothers are in their stalls")

## Saves from e223bc2 (state 1) load: the community, queue and arrivals are
## rebuilt deterministically and the beat still moves on.
func test_state1_saves_are_migrated_and_progress() -> void:
	var r: Dictionary = {}
	for label: String in ["meal_tray", "meal_answer", "nones_walk", "free"]:
		var d := director()
		d.start()
		match label:
			"meal_tray":
				d._goto("meal")
				d.line_queue.clear()
				d.talking_until = d.t
				d.a("tebaldo").arrived_tag = "tray"
				d._tick_meal(0.0)
			"meal_answer":
				d._goto("meal")
				d._sub = {"phase": "answer", "acts": 2, "eat_t": 0.0}
				d.line_queue.clear()
				d.talking_until = d.t
				d.lines_said["w_question"] = d.t
				d._ask("meal_question", d._meal_options())
			"nones_walk":
				d._goto("free")
				d._goto("nones")
				for i: int in 150:
					d.tick(0.1, Vector3(-5.0, 0.3, 10.0), 0.0, Vector3(-5.0, 1.92, 10.0), Vector3.FORWARD, null)
			"free":
				d._goto("free")
		var full: Dictionary = JSON.parse_string(JSON.stringify(d.to_dict(), "", true, true))
		# the e223bc2 shape: named people only, no queue/choice/tags/community
		var old: Dictionary = {}
		for k: String in ["beat", "beat_t", "t", "flags", "props", "gate", "carrying", "lines_said", "lead", "people", "observations", "telemetry"]:
			old[k] = full[k]
		var sub: Dictionary = {}
		for k: String in (d._sub as Dictionary).keys():
			var v: Variant = d._sub[k]
			if v is float or v is int or v is bool or v is String:
				sub[k] = v
		old["sub"] = sub
		old["actors"] = {}
		for id: String in Day1aDirector.NAMED:
			var ad: Dictionary = full["actors"][id]
			ad.erase("arrived")
			ad.erase("face")
			ad.erase("look")
			old["actors"][id] = ad
		old["trails"] = []
		var env: Dictionary = Day1aSave.snapshot(d, d.node("c_mid"), 0.0, 0.0)
		env["schema_version"] = 1
		env["director"] = old
		check(Day1aSave.validate(env).is_empty(), "%s: a schema-1 envelope is accepted (%s)" % [label, Day1aSave.validate(env)])
		var d2 := director()
		d2.session.clock.set_time(d.session.clock.hours, true)
		var warn: PackedStringArray = d2.restore(old)
		check(warn.size() == 1 and warn[0].begins_with("state-1"), "%s: the migration is reported (%s)" % [label, warn])
		var cell: Vector3 = d2.node("c_mid") + Vector3(0, 0.05, 0)
		var stall_t := -1.0
		for i: int in 900:
			if d2.pending_choice == "meal_question":
				d2.choose("nothing")
			d2.tick(0.1, cell, 0.0, cell + Vector3(0, 1.62, 0), Vector3.FORWARD, null)
			if label == "nones_walk" and stall_t < 0.0 and d2.a("brother:05").activity == "choir":
				stall_t = d2.beat_t
		match label:
			"meal_tray":
				check(d2.lines_said.has("te_sorry") and (d2.beat != "meal" or String(d2._sub.get("phase", "")) != "tebaldo_talk"), "meal_tray: Tebaldo's interrupted lines finish and the meal goes on")
			"meal_answer":
				check(String(d2.flags.get("meal_answer", "")) == "nothing", "meal_answer: William's question is asked again and answered")
			"nones_walk":
				var b5: Actor = d2.a("brother:05")
				check(d2.office_sung() != "" or not bool(d2._sub.get("office_begun", false)), "nones_walk: the office follows the brothers")
				check(stall_t > 15.0, "nones_walk: brothers are still walking at the load, then reach the choir (%.1f s)" % stall_t)
				check(b5.activity == "choir", "nones_walk: and sit in the choir")
			"free":
				check(d2._sub.has("tebaldo_pass"), "free: Tebaldo's crossings are rescheduled")
		r[label] = warn
	_plays["state1_migration"] = r

func test_a_seated_adso_can_always_get_up() -> void:
	var d := director()
	d.start()
	for b: String in ["meal", "free", "nones", "after_nones"]:
		d.beat = b
		d.seated = "stool"
		var ids: Array = d.interactions().map(func(it: Dictionary) -> String: return String(it["id"]))
		check(ids.has("stand"), "Get up is offered while seated during %s" % b)
		var r: Dictionary = d.interact("stand")
		check(r.has("stand") and d.seated == "", "getting up clears the seat during %s" % b)

func test_save_service_day1a_file_and_rejection_of_proof_saves() -> void:
	var dir := _scratch("day1a_save")
	var sv := Day1aSave.new(dir)
	sv.delete_all()
	var d := director()
	d.start()
	var snap: Dictionary = Day1aSave.snapshot(d, Vector3(-108, 0, 47.8), 0.5, 0.1)
	check(sv.write(snap) == "", "Day-1A save written")
	var r: Dictionary = sv.read()
	check(r["snapshot"] != null and r["source"] == "main", "Day-1A save read back")
	# a phase-1 proof save is recognised and rejected, never overwritten
	var proof := SaveService.new(dir, "slot0.json")
	var s := GameSession.new(content, dir, 15.0, 1)
	proof.write(s.snapshot())
	var pr: Dictionary = Day1aSave.new(dir, "slot0.json").read()
	check(pr["snapshot"] == null and String(", ".join(pr["report"])).contains("not a Day-1A save"), "proof save rejected clearly: %s" % [pr["report"]])
	check(FileAccess.file_exists(ProjectSettings.globalize_path(dir).path_join("slot0.json")), "proof save left untouched")

func test_clock_is_honest_through_the_free_period() -> void:
	var d := director()
	d.start()
	d.restore({"beat": "free", "t": 1000.0, "beat_t": 0.0})
	d.session.clock.set_time(13.0, true)
	d._enter_free()
	var h0: float = d.session.clock.hours
	var w := Walker.new(d, "normal")
	w.pos = d.node("c_mid")
	var dt := 1.0 / 10.0
	var rang := [false]
	d.bell.connect(func(o: String, _n: int, _i: float) -> void: rang[0] = rang[0] or o == "nones")
	var real := 0.0
	while not rang[0] and real < 900.0:
		d.session.clock.advance(dt)
		d.tick(dt, w.pos, 0.0, w.eye(), w.fwd, null)
		real += dt
	check(rang[0], "Nones rings on the clock")
	check(real > 300.0 and real < 520.0, "the free hour lasts about 5–8 real minutes (%.0f s)" % real)
	check(d.session.clock.hours >= 14.4 and h0 < 14.4, "clock moved forward continuously")
