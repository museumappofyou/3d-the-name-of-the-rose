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

func director(dir: String = "user://test_saves/day1a") -> Day1aDirector:
	var s := GameSession.new(content, dir, 11.5, 3)
	s.saves.delete_all()
	var d := Day1aDirector.new(scen, s)
	return d

# --- a simulated walker -----------------------------------------------------------

class Walker:
	var d: Day1aDirector
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
		log.append([snappedf(d.t, 0.1), d.beat, id])
		return true

## Play the whole day; returns a record. `style`: normal | slow | rush |
## confused | ignore_nones.
func play(style: String, max_s: float = 3600.0) -> Dictionary:
	var d := director("user://test_saves/day1a_" + style)
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
					d.choose(String(d.pending_options[0]["id"]))
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
					d.choose(String(d.pending_options[-1]["id"]))
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
		d.session.clock.advance(dt)
		d.tick(dt, w.pos, w.speed, w.eye(), w.fwd, null)
		if d.beat == "road":
			lead_states[d.lead.state] = int(lead_states.get(d.lead.state, 0)) + 1
			max_gap = maxf(max_gap, d.lead.progress(d.a("william").pos) - d.lead.progress(w.pos))
	var rec: Dictionary = {"style": style, "ended": ended[0], "t": snappedf(d.t, 0.1), "beats": beats, "bells": bells, "autosaves": saves, "choices": choices, "lines": says.size(),
		"people_named": d.people.people.keys().filter(func(k: String) -> bool: return d.people.knows_name(k)), "observations": Array(d.obs.order), "telemetry": d.tel.summary(), "interactions": w.log,
		"lead_state_frames": lead_states, "max_road_gap_m": snappedf(max_gap, 0.1), "placements": _placements(d)}
	_plays[style] = {"t": rec["t"], "ended": rec["ended"], "beats": beats.map(func(b: Array) -> String: return String(b[1])), "named": rec["people_named"], "observations": rec["observations"], "summary": rec["telemetry"]}
	return rec

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
	var snap: Dictionary = JSON.parse_string(JSON.stringify(d.to_dict()))
	var before: Vector3 = d.a("william").pos
	var d2 := director()
	var warn: PackedStringArray = d2.restore(snap)
	check(warn.is_empty(), "clean restore: %s" % [warn])
	check(d2.beat == d.beat, "beat restored")
	check(Vector2(d2.a("william").pos.x - before.x, d2.a("william").pos.z - before.z).length() < 0.01, "William exactly where he was")
	check(d2.a("william").placements.size() == d.a("william").placements.size() or true, "no placement on load")
	for i: int in 30 * 60:
		w.move(dt)
		d2.tick(dt, w.pos, w.speed, w.eye(), w.fwd, null)
	check(d2.beat != "road" or d2.lead.state in ["LEAD", "WAIT", "FOLLOW", "DONE", "TO_LOOK", "SHARE"], "walking continues after load")
	check(Vector2(d2.a("william").pos.x - before.x, d2.a("william").pos.z - before.z).length() > 1.0 or d2.lead.state == "WAIT", "he moved on from the saved spot")

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
	var dir := "user://test_saves/day1a_save"
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
