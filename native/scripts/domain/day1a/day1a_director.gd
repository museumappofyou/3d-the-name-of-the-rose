class_name Day1aDirector
extends RefCounted
## The first half of Day 1 as a deterministic simulation (no scene): beats,
## the clock, stable actors on authored routes, William's walking order,
## lines and choices, the internal observation log, people memory, props
## and local telemetry. The scene adapter feeds Adso's real physical state
## (feet, speed, eye, view direction) every frame and presents what this
## reports; headless tests drive the same object with simulated walks.
##
## Beats: road → sext_gate → gate_open → reception → to_cell →
## second_bundle → meal → free → nones → after_nones → end.
## The clock is moved by events during set pieces and runs (compressed)
## through the free period and the office; Nones rings on the clock wherever
## Adso is, and the office proceeds without him.

signal say(speaker: String, line_id: String, text: String, label: String)
signal caption(text: String)
signal choice(prompt_id: String, options: Array)
signal choice_closed(prompt_id: String)
signal bell(office: String, strokes: int, interval: float)
signal sfx(id: String, pos: Vector3)
signal beat_changed(old: String, new: String)
signal autosave(reason: String)
signal ended()

const BEATS: PackedStringArray = ["road", "sext_gate", "gate_open", "reception", "to_cell", "second_bundle", "meal", "free", "nones", "after_nones", "end"]
const NAMED: PackedStringArray = ["william", "fazio", "cellarer", "tebaldo", "nuto", "fulco", "rainaldo", "mule_w", "mule_a"]

var data: Dictionary
var session: GameSession
var graph: WayGraph
var actors: Dictionary = {}
var lead: LeadWait
var people: PeopleMemory
var obs: ObservationLog
var tel: Day1aTelemetry
var beat: String = ""
var beat_t: float = 0.0
var t: float = 0.0
## benchmarks only: keep the hour still (residency cycles)
var hold_clock: bool = false
var flags: Dictionary = {}
var props: Dictionary = {}
var gate: Dictionary = {"open": 0.0, "target": 0.0, "bar": "down"}
var carrying: String = ""
var seated: String = ""
var holding: String = ""
var lines_said: Dictionary = {}
var line_queue: Array = []
var talking_until: float = 0.0
var pending_choice: String = ""
var pending_options: Array = []
var player_pos: Vector3 = Vector3.ZERO
var player_speed: float = 0.0
var player_eye: Vector3 = Vector3.ZERO
var player_fwd: Vector3 = Vector3.FORWARD
var player_look: Variant = null
var dwell: Dictionary = {}
var trails: Dictionary = {}          # follower id -> {"leader": id, "pts": Array[Vector3], "gap": m}
var _sub: Dictionary = {}            # beat-local state
## ground height at (x, z); the scene supplies the exported terrain/floors,
## headless tests use the plateau's level (≈ 0)
var ground_fn: Callable = func(_x: float, _z: float) -> float: return 0.0

func _init(scenario: Dictionary, s: GameSession) -> void:
	data = scenario
	session = s
	graph = WayGraph.new(data)
	people = PeopleMemory.new(data.get("people", {}))
	obs = ObservationLog.new(data.get("observations", {}))
	tel = Day1aTelemetry.new()
	lead = LeadWait.new()
	lead.state_changed.connect(_on_lead_state)
	for id: String in (data.get("people", {}) as Dictionary).keys():
		var a := Actor.new(id)
		a.speed = float(data["people"][id].get("speed", 1.4))
		a.present = false
		actors[id] = a
	for id: String in ["mule_w", "mule_a"]:
		var m := Actor.new(id)
		m.present = false
		actors[id] = m
	for b: Dictionary in data.get("anonymous", []):
		var a2 := Actor.new(String(b["id"]))
		a2.speed = 1.05
		a2.present = false
		actors[a2.id] = a2
	for b: Dictionary in data.get("sext_leavers", []):
		var a3 := Actor.new(String(b["id"]))
		a3.speed = 1.05
		a3.present = false
		actors[a3.id] = a3
	for pid: String in (data.get("props", {}) as Dictionary).keys():
		props[pid] = {"where": "mule", "pos": Vector3.ZERO}

func a(id: String) -> Actor:
	return actors[id]

func node(id: String) -> Vector3:
	return graph.pos(id)

func speeds() -> Dictionary:
	var S: Dictionary = data.get("speeds", {})
	match carrying:
		"bedding", "bucket", "hose":
			return {"walk": float(S.get("adso_carry", 1.35)), "run": float(S.get("adso_carry_run", 2.2))}
		"chest":
			return {"walk": float(S.get("chest_walk", 1.2)), "run": float(S.get("chest_run", 1.8))}
	return {"walk": float(S.get("adso_walk", 1.6)), "run": float(S.get("adso_run", 3.0))}

# --- start, beats -------------------------------------------------------------

func start() -> void:
	var st: Dictionary = data.get("start", {})
	session.clock.rate = 0.0
	session.clock.set_time(float(st.get("hours", 11.5)), true)
	_goto("road")

func _goto(b: String) -> void:
	var old: String = beat
	beat = b
	beat_t = 0.0
	_sub = {}
	tel.beat(t, old, b)
	beat_changed.emit(old, b)
	call("_enter_" + b)

func start_position() -> Dictionary:
	var p: Vector3 = node(String(data.get("start", {}).get("node", "r22")))
	var nxt: Vector3 = node("r20")
	return {"pos": p, "yaw": atan2(-(nxt.x - p.x), -(nxt.z - p.z))}

func _route(name: String) -> Array[Vector3]:
	var out: Array[Vector3] = []
	for id: String in data["routes"][name]:
		out.append(node(id))
	return out

func _look_points(route_name: String) -> Array:
	var out: Array = []
	for lp: Dictionary in data.get("look_points", []):
		if lp.get("route", "") == route_name:
			var st: Array = lp["stand"]
			var at: Array = lp["at"]
			out.append({"id": lp["id"], "stand": Vector3(float(st[0]), NAN, float(st[1])), "at": Vector3(float(at[0]), float(at[1]), float(at[2])), "dwell": float(lp.get("dwell", 2.2)), "pose": String(lp.get("pose", "look"))})
	return out

func _enter_road() -> void:
	var sp: Dictionary = start_position()
	var w: Actor = a("william")
	var route: Array[Vector3] = _route("road")
	lead.setup(route, _look_points("road"), data.get("lead", {}))
	var ws: Vector3 = lead.point_at(lead.progress(sp["pos"]) + 6.5)
	w.place(ws, float(sp["yaw"]), t, "road start (6.5 m ahead of Adso)")
	w.present = true
	_place_mule("mule_w", "william", 2.2)
	var ma: Actor = a("mule_a")
	var r22: Vector3 = node("r22")
	var r20: Vector3 = node("r20")
	var back: Vector2 = Vector2(r22.x - r20.x, r22.z - r20.z).normalized() * 2.2
	ma.place(Vector3(r22.x + back.x, NAN, r22.z + back.y), float(sp["yaw"]), t, "road start, on Adso's lead")
	ma.present = true
	trails["mule_a"] = {"leader": "adso", "pts": [], "gap": 2.3}
	props["bedding"] = {"where": "mule", "pos": Vector3.ZERO, "on": "mule_a"}
	props["chest"] = {"where": "mule", "pos": Vector3.ZERO, "on": "mule_a"}
	holding = "lead"
	_sub["started"] = false

func _place_mule(mid: String, leader: String, gap: float) -> void:
	var l: Actor = a(leader)
	var m: Actor = a(mid)
	var back := Vector3(sin(l.yaw), 0, cos(l.yaw)) * -gap
	m.place(Vector3(l.pos.x + back.x, NAN, l.pos.z + back.z), l.yaw, t, "on %s's lead" % leader)
	m.present = true
	trails[mid] = {"leader": leader, "pts": [], "gap": gap}

func _tick_road(_dt: float) -> void:
	var w: Actor = a("william")
	if not bool(_sub.get("started", false)):
		w.face_target = null
		if player_speed > 0.3 or beat_t > 3.0:
			_sub["started"] = true
		else:
			return
	var remark: String = lead.tick(_dt_last, w, player_pos, player_speed, player_look)
	if remark == "share":
		_line("w_share_valley" if String(lead.target_lp.get("id", "")) == "lp_valley" else "w_share_generic")
	if lead.state == "WAIT" and String(lead.target_lp.get("id", "")) == "lp_wall" and _near(w.pos, 6.0):
		_line_once("w_wall")
	if (lead.state == "DONE" and _near(node("g_fore"), 11.0)) or (_near(node("g_fore"), 4.0) and _dist2(w.pos, node("g_fore")) < 6.0):
		_goto("sext_gate")

func _enter_sext_gate() -> void:
	session.clock.set_time(11.85, true)
	bell.emit("sext", int(data["bells"]["sext"]["strokes"]), float(data["bells"]["sext"]["interval_s"]))
	caption.emit("[A bell rings from inside the walls.]")
	tel.event(t, "bell", {"office": "sext"})
	_line("w_sext_1", 4.0)
	_line("w_sext_2", 0.6)
	var w: Actor = a("william")
	var G: Dictionary = data["gate"]
	w.go(_typed([w.pos, node("g_out"), _xz(G["hinges_stand"])]), 1.0, "hinges")
	_sub["hinges"] = false

func _tick_sext_gate(_dt: float) -> void:
	var w: Actor = a("william")
	if not w.moving and not bool(_sub["hinges"]):
		_sub["hinges"] = true
		w.face_target = _v3(data["gate"]["hinges_at"])
		w.look_target = _v3(data["gate"]["hinges_at"])
		w.activity = "look"
		_line("w_hinges", 1.2)
	if beat_t > 15.0 and not bool(_sub.get("cold", false)):
		_sub["cold"] = true
		_line("w_hungry" if randf_seeded(1) < 0.5 else "w_cold")
	# the porter opens once Adso is at the gate to see it
	if beat_t > 22.0 and _near(node("g_fore"), 18.0) and not bool(_sub.get("open", false)):
		_sub["open"] = true
		_sub["open_at"] = beat_t
		_line("fz_wait")
		caption.emit("[Someone moves behind the gate.]")
		sfx.emit("gate_bar", Vector3(-102.4, 1.1, -8.6))
	if bool(_sub.get("open", false)) and beat_t - float(_sub["open_at"]) > 2.6 and gate["target"] == 0.0:
		gate["bar"] = "up"
		gate["target"] = 1.0
		sfx.emit("gate_open", Vector3(-102.7, 1.8, -8.6))
		caption.emit("[The gate groans open.]")
	if float(gate["open"]) > 0.6:
		_goto("gate_open")

func _enter_gate_open() -> void:
	var fz: Actor = a("fazio")
	fz.place(_xz(data["gate"]["porter_start"]), -PI / 2.0, t, "the porter, behind the gate he has opened")
	fz.present = true
	people.seen("fazio", t)
	fz.go(_typed([fz.pos, node("g_mid"), Vector3(a("mule_w").pos.x + 1.0, NAN, a("mule_w").pos.z)]), 1.1, "to_mule_w")
	var w: Actor = a("william")
	w.look_target = null
	w.activity = "stand"
	_sub["phase"] = "porter_takes_mule"

func _tick_gate_open(_dt: float) -> void:
	var fz: Actor = a("fazio")
	var w: Actor = a("william")
	var ph: String = _sub["phase"]
	match ph:
		"porter_takes_mule":
			if not fz.moving:
				trails["mule_w"] = {"leader": "fazio", "pts": [], "gap": 1.9}
				fz.go(graph.path_to(fz.pos, "g_court"), 1.05, "court")
				w.go(_typed([w.pos, node("g_in"), _xz(data["gate"]["bar_stand"])]), 1.2, "bar")
				_sub["phase"] = "bar"
		"bar":
			if not w.moving and not bool(_sub.get("bar_seen", false)):
				w.face_target = _v3(data["gate"]["bar_at"])
				w.look_target = _v3(data["gate"]["bar_at"])
				w.activity = "look"
				if _near(w.pos, 7.0):
					_sub["bar_seen"] = true
					_line("w_bar_1")
					_line("w_bar_2", 0.5)
					_sub["bar_t"] = beat_t
			if bool(_sub.get("bar_seen", false)) and beat_t - float(_sub["bar_t"]) > 5.5 and not _talking():
				w.look_target = null
				w.go(_typed([w.pos, _xz(data["gate"]["reveal_stand"])]), 1.15, "reveal")
				_sub["phase"] = "reveal_walk"
		"reveal_walk":
			if not w.moving:
				var aed: Vector3 = _v3(data["gate"]["reveal_at"])
				w.face_target = aed
				w.look_target = aed
				w.activity = "look_long"
				if player_pos.x > -108.8:
					_sub["phase"] = "reveal"
					_sub["reveal_t"] = beat_t
					tel.event(t, "reveal", {"player_x": player_pos.x})
		"reveal":
			var rt: float = beat_t - float(_sub["reveal_t"])
			if rt > 2.8 and not lines_said.has("w_reveal_1"):
				_line("w_reveal_1")
				_line("w_reveal_2", 1.6)
			if rt > 11.0 and not _talking():
				w.look_target = null
				w.activity = "stand"
				_sub["phase"] = "shoe"
				fz.go(_typed([fz.pos, _beside(a("mule_a"), 0.9)]), 1.0, "shoe")
	# the loose shoe: the porter kneels at Adso's mule and nods at the halter
	if _sub.get("phase") == "shoe" and not fz.moving and not bool(_sub.get("kneel", false)):
		_sub["kneel"] = true
		_sub["kneel_t"] = beat_t
		fz.activity = "kneel_hoof"
		fz.face_target = a("mule_a").pos
		caption.emit("[The porter nods at your halter.]")
		holding = ""
		_sub["hold_offered"] = true
	if bool(_sub.get("kneel", false)) and not bool(_sub.get("shoe_done", false)):
		var kt: float = beat_t - float(_sub["kneel_t"])
		if holding == "steady":
			_sub["held"] = float(_sub.get("held", 0.0)) + _dt_last
			if _near(fz.pos, 2.4) and _looking_at(Vector3(fz.pos.x, NAN, fz.pos.z), 22.0):
				_watch_hit("porter_scar")
		if float(_sub.get("held", 0.0)) > 4.0 or kt > 16.0:
			_sub["shoe_done"] = true
			if float(_sub.get("held", 0.0)) > 4.0:
				obs.add("mule_shoe", t, "the gate", "while the porter held up the hoof")
				_line("fz_shoe")
				_line("fz_smith", 0.8)
			else:
				caption.emit("[The porter steadies the mule himself.]")
				_line("fz_shoe")
			holding = "lead" if carrying == "" else ""
			fz.activity = "stand"
			_goto("reception")
	if player_pos.x > -88.0 and not lines_said.has("fz_not_yet"):
		_line("fz_not_yet")

func _enter_reception() -> void:
	session.clock.set_time(12.25, true)
	tel.event(t, "office_end", {"office": "sext"})
	# the brothers leave the church for their meal, seen far off down the avenue
	var k := 0
	for b: Dictionary in data.get("sext_leavers", []):
		var ab: Actor = a(String(b["id"]))
		ab.place(node("wd_out") + Vector3(-0.4 * k, 0, 0.5 * (k % 2)), -PI / 2.0, t, "leaving the church after Sext")
		ab.present = false
		_sub["leave_%d" % k] = 1.5 + 2.2 * k
		k += 1
	var ce: Actor = a("cellarer")
	ce.place(node("wd_out"), -PI / 2.0, t, "comes out of the church after Sext")
	ce.present = false
	_sub["cellarer_at"] = 4.0
	# the porter unloads Adso's mule: the bedding to the ground, the chest to the lodge
	var ma: Actor = a("mule_a")
	var bp: Vector3 = _beside(ma, 1.1)
	props["bedding"] = {"where": "ground", "pos": Vector3(bp.x, float(ground_fn.call(bp.x, bp.z)), bp.z)}
	props["chest"] = {"where": "carried_by", "by": "fazio"}
	var fz: Actor = a("fazio")
	fz.carrying = "chest"
	fz.go(graph.path_to(fz.pos, "g_chest"), 0.95, "chest_down")
	trails.erase("mule_a")
	trails["mule_a"] = {"leader": "fazio", "pts": [], "gap": 2.1}
	_sub["phase"] = "wait_cellarer"

func _tick_reception(_dt: float) -> void:
	var k := 0
	for b: Dictionary in data.get("sext_leavers", []):
		var ab: Actor = a(String(b["id"]))
		var key := "leave_%d" % k
		if _sub.has(key) and beat_t > float(_sub[key]):
			_sub.erase(key)
			ab.present = true
			ab.go(_typed([ab.pos, node("wd_nw"), node("aed_path"), node("aed_path2")]), 1.0, "refectory")
		if ab.arrived_tag == "refectory":
			ab.present = false
			ab.arrived_tag = ""
		k += 1
	var ce: Actor = a("cellarer")
	var fz: Actor = a("fazio")
	var w: Actor = a("william")
	if _sub.has("cellarer_at") and beat_t > float(_sub["cellarer_at"]):
		_sub.erase("cellarer_at")
		ce.present = true
		people.seen("cellarer", t)
		ce.go(graph.path_to(ce.pos, "g_wait"), 1.55, "greet")
	_porter()
	match String(_sub["phase"]):
		"wait_cellarer":
			if ce.present and not ce.moving and ce.arrived_tag == "greet":
				ce.arrived_tag = ""
				ce.face_target = w.pos
				w.face_target = ce.pos
				_sub["phase"] = "greeting"
				_line("ce_greet")
				_line("w_greet", 0.4)
				_line("ce_office", 0.4)
				_line("ce_fazio", 0.3)
			elif ce.present and ce.moving and Vector2(ce.pos.x - w.pos.x, ce.pos.z - w.pos.z).length() < 12.0 and not bool(_sub.get("w_turn", false)):
				_sub["w_turn"] = true
				w.go(_typed([w.pos, Vector3(-97.2, NAN, -7.4)]), 1.0, "meet")
		"greeting":
			if lines_said.has("ce_office") and not people.knows_name("cellarer"):
				people.hear_name("cellarer", "cellarer", t)
			if lines_said.has("ce_fazio") and not people.knows_name("fazio"):
				people.hear_name("fazio", "cellarer", t)
			if not _talking() and lines_said.has("ce_fazio"):
				_sub["phase"] = "away"
				# the porter takes both mules round the church to the stables
				_porter_away()
				_sub["away_t"] = beat_t
		"away":
			var has_bedding: bool = carrying == "bedding" or String(props["bedding"]["where"]) == "placed"
			if has_bedding or beat_t - float(_sub["away_t"]) > 22.0:
				if not has_bedding and not lines_said.has("w_take_bedding"):
					_line("w_take_bedding")
				_goto("to_cell")

## The office heard from the choir: Sext is under way as the guests arrive;
## Nones is sung once the brothers have reached their stalls.
func office_sung() -> String:
	if beat == "nones":
		return "nones" if bool(_sub.get("office_begun", false)) else ""
	return session.clock.office()

## The cellarer is on his way up to the cell with the guests behind him.
func _ce_escorting() -> bool:
	return a("cellarer")._tag == "cell" and not lines_said.has("ce_cell")

## The porter's chores that outlast the reception beat.
func _porter() -> void:
	var fz: Actor = a("fazio")
	if fz.arrived_tag == "chest_down":
		fz.arrived_tag = ""
		fz.carrying = ""
		var cp: Vector3 = node("g_chest")
		props["chest"] = {"where": "ground", "pos": Vector3(cp.x, float(ground_fn.call(cp.x, cp.z)), cp.z)}
		fz.face_target = node("g_chest") + Vector3(0, 0, 1)
		fz.activity = "stand"
		if bool(_sub.get("porter_leave_after_chest", false)):
			_porter_away()
	if fz.arrived_tag == "stables":
		_offstage_mules()

func _porter_away() -> void:
	var fz: Actor = a("fazio")
	if String(props["chest"].get("where", "")) == "carried_by":
		_sub["porter_leave_after_chest"] = true
		return
	trails["mule_w"] = {"leader": "fazio", "pts": [], "gap": 1.9}
	trails["mule_a"] = {"leader": "mule_w", "pts": [], "gap": 2.2}
	fz.go(graph.path_to(fz.pos, "wd_nw"), 1.05, "stables")

func _offstage_mules() -> void:
	var fz: Actor = a("fazio")
	fz.arrived_tag = ""
	fz.present = false
	for m: String in ["mule_w", "mule_a"]:
		a(m).present = false
		trails.erase(m)
	tel.event(t, "porter_offstage", {})

func _enter_to_cell() -> void:
	var ce: Actor = a("cellarer")
	var w: Actor = a("william")
	ce.go(graph.path_to(ce.pos, "c_mid"), 1.5, "cell")
	_sub["w_follow"] = true
	_sub["asked"] = false
	_sub["off_t"] = 0.0
	w.activity = "stand"
	w.look_target = null
	w.face_target = null

func _tick_to_cell(_dt: float) -> void:
	var ce: Actor = a("cellarer")
	var w: Actor = a("william")
	_porter()
	# the cellarer escorts without waiting long; at the garden gap he waits
	if ce.moving and Vector2(ce.pos.x - node("fg_n").x, ce.pos.z - node("fg_n").z).length() < 1.0 and _dist2(player_pos, ce.pos) > 26.0 and not bool(_sub.get("ce_waited", false)):
		_sub["ce_waited"] = true
		_sub["ce_hold"] = ce.path.duplicate()
		_sub["ce_hold_i"] = ce.path_i
		ce.stop()
		ce.face_target = player_pos
	# a host keeps his guest in sight: easing off when the boy lags, stopping
	# (turned towards him) when he falls well behind; never on the stair
	var gap: float = _dist2(player_pos, ce.pos)
	if gap > 8.0 and (ce.moving or bool(_sub.get("ce_pause", false))):
		# straight-line distance lies when the boy has gone on ahead
		var ahead: float = graph.length_of(graph.path_to(ce.pos, "c_mid")) - graph.length_of(graph.path_to(player_pos, "c_mid"))
		if ahead > -2.0:
			gap = 0.0
	if bool(_sub.get("ce_pause", false)):
		if gap < 8.0 or beat_t > 150.0:
			_sub.erase("ce_pause")
			if beat_t > 150.0:
				_sub["ce_pace_off"] = true
			ce.go(graph.path_to(ce.pos, "c_mid"), 1.5, "cell")
	elif ce.moving and ce.arrived_tag == "" and _ce_escorting() and not _sub.has("ce_pace_off"):
		if gap > 17.0 and (is_nan(ce.pos.y) or ce.pos.y < 1.0):
			_sub["ce_pause"] = true
			ce.stop()
			ce.face_target = player_pos
			tel.event(t, "escort_waits", {"gap_m": snappedf(gap, 0.1)})
		else:
			ce.speed = lerpf(1.5, clampf(player_speed, 0.8, 1.5), clampf((gap - 8.0) / 5.0, 0.0, 1.0))
	if bool(_sub.get("ce_waited", false)) and not ce.moving and ce.arrived_tag != "cell" and (_dist2(player_pos, ce.pos) < 12.0 or beat_t > 90.0):
		ce.go(graph.path_to(ce.pos, "c_mid"), 1.5, "cell")
		_sub["ce_waited"] = false
		_sub["ce_waited_done"] = true
	# William walks a little behind the cellarer, talking
	if bool(_sub["w_follow"]):
		var dw: float = _dist2(w.pos, ce.pos)
		if ce.arrived_tag == "cell" or (not ce.moving and _dist2(ce.pos, node("c_mid")) < 1.0):
			if not w.moving and _dist2(w.pos, node("c_bed")) > 0.6:
				w.go(graph.path_to(w.pos, "c_bed"), 1.3, "cell")
		elif dw > 3.2 and (not w.moving or w.arrived_tag != ""):
			w.go(graph.path_to(w.pos, graph.nearest(ce.pos)), minf(1.7, ce.speed * 1.1), "follow_cellarer")
		elif dw < 2.2:
			w.stop()
			w.face_target = ce.pos
	if not bool(_sub["asked"]) and w.pos.x > -55.0 and w.pos.z < -2.0:
		_sub["asked"] = true
		_line("w_ask_house")
		_line("ce_refuse_1", 0.3)
		_line("ce_refuse_2", 0.3)
		_line("w_fallen", 0.9)
	# a guest who wanders: the bedding before the sights
	var off: float = _off_route(player_pos, "reception")
	_sub["off_t"] = float(_sub["off_t"]) + _dt_last if off > 12.0 else 0.0
	if float(_sub["off_t"]) > 45.0:
		_line_once("w_bedding_first")
	# in the cell: the cellarer hands the guests over to Tebaldo and goes
	if ce.arrived_tag == "cell" and not _sub.has("ce_in_t"):
		_sub["ce_in_t"] = beat_t
	if ce.arrived_tag == "cell" and not lines_said.has("ce_cell") and (_dist2(player_pos, node("c_mid")) < 3.4 or beat_t - float(_sub["ce_in_t"]) > 30.0):
		ce.face_target = player_pos if _dist2(player_pos, ce.pos) < 6.0 else w.pos
		_line("ce_cell")
		_line("ce_leave", 0.4)
		people.hear_name("tebaldo", "cellarer", t)
	if lines_said.has("ce_leave") and not _talking() and ce.arrived_tag == "cell":
		ce.arrived_tag = ""
		ce.go(graph.path_to(ce.pos, "cw_16"), 1.5, "leave")
	if ce.arrived_tag == "leave":
		ce.arrived_tag = ""
		ce.present = false
	if String(props["bedding"]["where"]) == "placed" and lines_said.has("ce_leave") and not _talking():
		autosave.emit("cell")
		_goto("second_bundle")

func _enter_second_bundle() -> void:
	var w: Actor = a("william")
	if _dist2(w.pos, node("c_bed")) > 0.6:
		w.go(graph.path_to(w.pos, "c_bed"), 1.2, "sit")
	else:
		w.arrived_tag = "sit"
	var nu: Actor = a("nuto")
	nu.place(Vector3(-27.4, NAN, 0.4), PI, t, "sweeping by the garden gap")
	nu.present = true
	nu.activity = "work_sweep"
	tel.solo = {"started": -1.0, "left_cell": -1.0, "reached_chest": -1.0, "back_in_cell": -1.0, "hesitation_s": 0.0, "wrong_turns": [], "max_off_route_m": 0.0, "help_from_nuto": false}
	_sub["zone"] = ""

func _tick_second_bundle(_dt: float) -> void:
	var w: Actor = a("william")
	_porter()
	if w.arrived_tag == "sit":
		w.arrived_tag = ""
		w.activity = "sit"
		w.face_target = node("c_tray")
	# he asks as soon as he is in the cell; called after Adso if he is already
	# on his way down
	if not lines_said.has("w_chest") and not w.moving and _dist2(player_pos, w.pos) < 16.0 and not _talking():
		_line("w_chest", 0.8)
	var S: Dictionary = tel.solo
	var in_cell: bool = player_pos.y > 5.0 and _dist2(player_pos, node("c_mid")) < 4.0
	if float(S["left_cell"]) < 0.0 and not in_cell and lines_said.has("w_chest"):
		S["left_cell"] = snappedf(t, 0.1)
		S["started"] = snappedf(t, 0.1)
	if float(S["left_cell"]) >= 0.0 and float(S["back_in_cell"]) < 0.0:
		# hesitation: standing still or turning in place away from the cell and the chest
		if player_speed < 0.3 and not in_cell and _dist2(player_pos, node("g_chest")) > 4.0:
			S["hesitation_s"] = snappedf(float(S["hesitation_s"]) + _dt_last, 0.01)
		S["max_off_route_m"] = maxf(float(S["max_off_route_m"]), snappedf(_off_route(player_pos, "solo"), 0.1))
		var z: String = _zone(player_pos)
		if z != String(_sub["zone"]):
			_sub["zone"] = z
			if z != "":
				(S["wrong_turns"] as Array).append({"t": snappedf(t, 0.1), "zone": z, "carrying": carrying})
				tel.event(t, "wrong_turn", {"zone": z, "carrying": carrying})
				# Nuto, carrying wood, limps off toward the guest house: following him works
				if carrying == "chest" and not bool(_sub.get("nuto_goes", false)):
					_sub["nuto_goes"] = true
					S["help_from_nuto"] = true
					var nu: Actor = a("nuto")
					nu.carrying = "wood"
					nu.activity = "walk"
					nu.go(graph.path_to(nu.pos, "st_foot"), 0.9, "stair")
	if carrying == "chest" and float(S["reached_chest"]) < 0.0:
		S["reached_chest"] = snappedf(t, 0.1)
	var nu2: Actor = a("nuto")
	if nu2.arrived_tag == "stair":
		nu2.arrived_tag = ""
		nu2.carrying = ""
		nu2.activity = "work_sweep"
	if String(props["chest"]["where"]) == "placed":
		S["back_in_cell"] = snappedf(t, 0.1)
		S["out_s"] = snappedf(float(S["reached_chest"]) - float(S["left_cell"]), 0.1)
		S["back_s"] = snappedf(float(S["back_in_cell"]) - float(S["reached_chest"]), 0.1)
		_line("w_chest_back", 0.4)
		_goto("meal")

func _enter_meal() -> void:
	session.clock.set_time(12.6, true)
	var te: Actor = a("tebaldo")
	te.place(node("cd_16"), -PI / 2.0, t, "comes from the cloister with the tray")
	te.present = true
	te.carrying = "tray"
	te.go(graph.path_to(te.pos, "c_tray"), 1.55, "tray")
	people.seen("tebaldo", t)
	_line("w_wet", 3.0)
	_sub["phase"] = "tebaldo"
	_sub["acts"] = 0

func _tick_meal(_dt: float) -> void:
	var te: Actor = a("tebaldo")
	var w: Actor = a("william")
	var nu: Actor = a("nuto")
	var in_cell: bool = player_pos.y > 5.0 and _dist2(player_pos, node("c_mid")) < 4.2
	match String(_sub["phase"]):
		"tebaldo":
			if te.arrived_tag == "tray":
				te.arrived_tag = ""
				te.carrying = ""
				props["tray"] = {"where": "placed"}
				sfx.emit("tray", node("c_tray") + Vector3(0, 7.2, 0))
				te.face_target = w.pos
				_line("te_arrive_1")
				_line("te_name", 0.2)
				people.hear_name("tebaldo", "tebaldo", t)
				_line("te_arrive_2", 0.2)
				_line("te_rule_1", 0.1)
				_line("te_rule_2", 0.0)
				_line("te_sorry", 0.3)
				_sub["phase"] = "tebaldo_talk"
		"tebaldo_talk":
			if lines_said.has("te_sorry") and not _talking():
				te.go(graph.path_to(te.pos, "st_foot"), 1.75, "down")
				_sub["phase"] = "eat"
				_sub["eat_t"] = beat_t
				_line("w_meal_sit", 1.2)
				w.go(graph.path_to(w.pos, "c_bed"), 0.8, "sit")
		"eat":
			var acts: int = int(_sub["acts"])
			if (acts >= 2 and beat_t - float(_sub["eat_t"]) > 25.0) or (seated != "" and beat_t - float(_sub["eat_t"]) > 70.0) or beat_t - float(_sub["eat_t"]) > 120.0:
				if in_cell and not _talking():
					_sub["phase"] = "question"
					_line("w_question")
			if not in_cell and not lines_said.has("w_bread_cold") and lines_said.has("w_meal_sit"):
				_line("w_bread_cold")
				_sub["away_t"] = beat_t
			if lines_said.has("w_bread_cold") and not in_cell and beat_t - float(_sub.get("away_t", beat_t)) > 45.0:
				_sub["phase"] = "abbot"
				_sub["abbot_t"] = beat_t
				_nuto_brings_word()
			if acts >= 1 and not lines_said.has("w_hose") and beat_t - float(_sub["eat_t"]) > 12.0 and not _talking():
				_line("w_hose")
				props["hose"] = {"where": "bed", "pos": node("c_bed") + Vector3(0.1, 6.65, 0.5)}
		"question":
			if lines_said.has("w_question") and not _talking() and pending_choice == "":
				_ask("meal_question", _meal_options())
				_sub["phase"] = "answer"
		"answer":
			if pending_choice == "" and not _talking() and bool(_sub.get("answered", false)):
				_sub["phase"] = "abbot"
				_sub["abbot_t"] = beat_t
				_nuto_brings_word()
		"abbot":
			if nu.arrived_tag == "door" and not lines_said.has("nu_abbot"):
				nu.arrived_tag = ""
				nu.face_target = w.pos
				_line("nu_abbot")
				_line("w_leave_1", 0.6)
				_line("w_leave_2", 0.6)
			if lines_said.has("w_leave_2") and not _talking() and not bool(_sub.get("gone", false)):
				_sub["gone"] = true
				w.activity = "stand"
				w.go(graph.path_to(w.pos, "cal_14"), 1.55, "abbot")
				nu.go(graph.path_to(nu.pos, "gt_well"), 0.9, "well")
				autosave.emit("meal")
				session.clock.set_time(13.0, true)
				_goto("free")
	if te.arrived_tag == "down":
		te.arrived_tag = ""
		_line("te_call_nuto")
		people.hear_name("nuto", "tebaldo", t)
		te.go(graph.path_to(te.pos, "cd_16"), 1.7, "gone")
	if te.arrived_tag == "gone":
		te.arrived_tag = ""
		te.present = false
	if w.arrived_tag == "sit":
		w.arrived_tag = ""
		w.activity = "sit"
		w.face_target = node("c_tray")

func _nuto_brings_word() -> void:
	var nu: Actor = a("nuto")
	if not nu.present:
		nu.place(node("st_foot"), PI, t, "comes up the stair")
		nu.present = true
	nu.activity = "walk"
	nu.go(graph.path_to(nu.pos, "c_door"), 0.9, "door")

func _meal_options() -> Array:
	var defs: Dictionary = data.get("observations", {})
	var have: Array = []
	for id: String in obs.order:
		if defs.has(id):
			have.append(id)
	have.sort_custom(func(x: String, y: String) -> bool: return int(defs[x]["rank"]) < int(defs[y]["rank"]))
	var out: Array = []
	for id: String in have.slice(0, 3):
		out.append({"id": id, "text": String(defs[id]["text"])})
	out.append({"id": "nothing", "text": "Nothing much yet."})
	return out

func _enter_free() -> void:
	var c: Dictionary = data.get("clock", {})
	session.clock.rate = float(c.get("free_minutes_per_real_minute", 12.5)) / 3600.0
	tel.free = {"start": snappedf(t, 0.1), "talked": [], "sat_s": 0.0}
	var fu: Actor = a("fulco")
	fu.place(Vector3(-7.25, NAN, 17.4), PI / 2.0, t, "on the west walk, at his psalm")
	fu.present = true
	fu.activity = "read"
	var nu: Actor = a("nuto")
	if not nu.present:
		nu.place(node("gt_well"), 0.0, t, "at the well")
		nu.present = true
	var i := 0
	for b: Dictionary in data.get("anonymous", []):
		var ab: Actor = a(String(b["id"]))
		var sp: Array = b["spot"]
		ab.place(Vector3(float(sp[0]), NAN, float(sp[1])), float(b["ry"]), t, "reading in the cloister walk")
		ab.present = true
		ab.activity = String(b["pose"])
		i += 1
	_sub["tebaldo_pass"] = [13.25, 13.9]
	_sub["rainaldo"] = 13.75

func _tick_free(_dt: float) -> void:
	_free_life()
	if session.clock.hours >= 14.4 and t - float(tel.free.get("start", 0.0)) >= 0.0:
		_goto("nones")

func _free_life() -> void:
	var h: float = session.clock.hours
	var w: Actor = a("william")
	if w.arrived_tag == "abbot":
		w.arrived_tag = ""
		w.present = false
		tel.event(t, "william_offstage", {"to": "the Abbot"})
	var nu: Actor = a("nuto")
	if nu.arrived_tag == "well":
		nu.arrived_tag = ""
		nu.activity = "work_well"
		nu.face_target = node("gt_well") + Vector3(1.0, 0, 1.0)
	# Tebaldo's hurried crossings of the cloister
	var passes: Array = _sub.get("tebaldo_pass", [])
	var te: Actor = a("tebaldo")
	if not passes.is_empty() and h >= float(passes[0]) and not te.moving:
		passes.pop_front()
		te.place(node("cd_8"), PI / 2.0, t, "hurrying in from the guest house")
		te.present = true
		te.go(graph.path_to(te.pos, "cal_4"), 1.85, "east_range")
	if te.arrived_tag == "east_range":
		te.arrived_tag = ""
		te.present = false
	# Rainaldo brings a book down for the choir and lights the lamps
	var ra: Actor = a("rainaldo")
	if _sub.has("rainaldo") and h >= float(_sub["rainaldo"]):
		_sub.erase("rainaldo")
		# he comes in by the choir's north door (behind the stalls, out of
		# the guests' sight): an authored entrance at the east end of the aisle
		ra.place(node("ch_lamp2"), -PI / 2.0, t, "comes in by the north door with a book")
		ra.present = true
		ra.carrying = "book"
		ra.go(_typed([ra.pos, node("ch_lamp1"), node("ch_lect")]), 1.0, "lectern")
	if ra.arrived_tag == "lectern":
		ra.arrived_tag = ""
		ra.carrying = ""
		props["choir_book"] = {"where": "lectern"}
		ra.activity = "read"
		ra.face_target = Vector3(34.3, 1.2, -5.46)
	# Nuto's water carrying, with Adso
	if String(_sub.get("water", "")) == "walking":
		var p: float = nu.travelled_m - float(_sub["water_m0"])
		for pair: Array in [[6.0, "nu_walk_1"], [22.0, "nu_walk_3"], [34.0, "nu_walk_2"]]:
			if p > float(pair[0]):
				_line_once(String(pair[1]))
		if nu.arrived_tag == "water":
			nu.arrived_tag = ""
			_sub["water"] = "arrived"
			nu.carrying = ""
			nu.activity = "stand"
			props["bucket_nuto"] = {"where": "ground", "pos": Vector3(node("st_foot").x + 0.6, float(ground_fn.call(node("st_foot").x + 0.6, node("st_foot").z + 0.4)), node("st_foot").z + 0.4)}
	if String(_sub.get("water", "")) == "arrived" and carrying != "bucket" and not lines_said.has("nu_name"):
		_line("nu_name")
		people.hear_name("nuto", "nuto", t)
		_line("nu_done", 0.4)
		(tel.free["talked"] as Array).append("nuto")
		_sub["water"] = "done"
	if String(_sub.get("water", "")) == "done" and lines_said.has("nu_done") and not _talking() and not bool(_sub.get("nuto_back", false)):
		_sub["nuto_back"] = true
		nu.go(graph.path_to(nu.pos, "gt_well"), 0.9, "well")
	if seated == "bench":
		tel.free["sat_s"] = snappedf(float(tel.free["sat_s"]) + _dt_last, 0.01)
	# the free period: sitting on a bench lets the hour pass faster
	var c: Dictionary = data.get("clock", {})
	var base: float = float(c.get("free_minutes_per_real_minute", 12.5)) / 3600.0
	if beat in ["free", "after_nones"]:
		session.clock.rate = base * (float(c.get("sit_wait_factor", 6.0)) if seated == "bench" else 1.0)

func _enter_nones() -> void:
	session.clock.set_time(14.4, true)
	var c: Dictionary = data.get("clock", {})
	session.clock.rate = float(c.get("nones_minutes_per_real_minute", 7.0)) / 3600.0
	_interrupt()
	bell.emit("nones", int(data["bells"]["nones"]["strokes"]), float(data["bells"]["nones"]["interval_s"]))
	caption.emit("[The bell rings for Nones.]")
	tel.event(t, "bell", {"office": "nones"})
	tel.nones = {"bell_t": snappedf(t, 0.1), "player_room_at_bell": session.room_id, "entered_church_t": -1.0, "guests_place_t": -1.0, "watched_brothers_t": -1.0, "in_church_s": 0.0, "outside_s": 0.0}
	if seated == "bench":
		seated = ""
	var k := 0
	for b: Dictionary in data.get("anonymous", []):
		var ab: Actor = a(String(b["id"]))
		_sub["go_%s" % ab.id] = 0.8 + fmod(float(k) * 1.37, 3.6)
		ab.activity = "close_book"
		k += 1
	var fu: Actor = a("fulco")
	if _near(fu.pos, 9.0):
		_line("fu_bell")
	fu.activity = "walk"
	fu.go(graph.path_to(fu.pos, "stall_n6"), 1.6, "stall")
	var te: Actor = a("tebaldo")
	if not te.present:
		te.place(node("cal_4"), -PI / 2.0, t, "comes from the east range at the bell")
		te.present = true
	te.go(graph.path_to(te.pos, "stall_s6"), 1.8, "stall")
	if _near(te.pos, 8.0):
		_line("te_bell")
	var ce: Actor = a("cellarer")
	ce.place(node("cal_14"), -PI / 2.0, t, "comes from the east range at the bell")
	ce.present = true
	ce.go(graph.path_to(ce.pos, "stall_n7"), 1.25, "stall")
	var nu: Actor = a("nuto")
	nu.stop()
	nu.activity = "pause"
	_sub["nuto_resume"] = 4.5
	if _near(nu.pos, 9.0):
		_line("nu_bell", 1.0)

func _tick_nones(_dt: float) -> void:
	for b: Dictionary in data.get("anonymous", []):
		var ab: Actor = a(String(b["id"]))
		var key := "go_%s" % ab.id
		if _sub.has(key) and beat_t > float(_sub[key]):
			_sub.erase(key)
			ab.activity = "walk"
			ab.go(graph.path_to(ab.pos, String(b["stall"])), 1.05, "stall")
		if ab.arrived_tag == "stall":
			ab.arrived_tag = ""
			ab.activity = "choir"
			ab.face_target = Vector3(ab.pos.x, 0, -5.46)
	for id: String in ["fulco", "tebaldo", "cellarer"]:
		var p: Actor = a(id)
		if p.arrived_tag == "stall":
			p.arrived_tag = ""
			p.activity = "choir"
			p.face_target = Vector3(p.pos.x, 0, -5.46)
	if _sub.has("nuto_resume") and beat_t > float(_sub["nuto_resume"]):
		_sub.erase("nuto_resume")
		a("nuto").activity = "work_well"
	var N: Dictionary = tel.nones
	var in_church: bool = session.room_id in ["church", "choir"]
	if in_church:
		N["in_church_s"] = snappedf(float(N["in_church_s"]) + _dt_last, 0.01)
		if float(N["entered_church_t"]) < 0.0:
			N["entered_church_t"] = snappedf(t - float(N["bell_t"]), 0.1)
			tel.event(t, "entered_church_during_office", {})
	else:
		N["outside_s"] = snappedf(float(N["outside_s"]) + _dt_last, 0.01)
	if _dist2(player_pos, node("guests")) < 2.2 and float(N["guests_place_t"]) < 0.0:
		N["guests_place_t"] = snappedf(t - float(N["bell_t"]), 0.1)
	if float(N["watched_brothers_t"]) < 0.0:
		for b: Dictionary in data.get("anonymous", []):
			var ab: Actor = a(String(b["id"]))
			if ab.moving and _looking_at(Vector3(ab.pos.x, NAN, ab.pos.z), 9.0) and Vector2(player_eye.x - ab.pos.x, player_eye.z - ab.pos.z).length() < 40.0:
				_sub["watch_s"] = float(_sub.get("watch_s", 0.0)) + _dt_last / 2.0
				if float(_sub["watch_s"]) > 1.5:
					N["watched_brothers_t"] = snappedf(t - float(N["bell_t"]), 0.1)
				break
	# the office begins when the brothers are in their stalls
	if not bool(_sub.get("office_begun", false)):
		var all_in: bool = true
		for b: Dictionary in data.get("anonymous", []):
			var ab: Actor = a(String(b["id"]))
			if ab.present and ab.activity != "choir":
				all_in = false
				break
		for id: String in ["fulco", "tebaldo", "cellarer"]:
			if a(id).activity != "choir":
				all_in = false
		if all_in or beat_t > 70.0:
			_sub["office_begun"] = true
			N["office_begun_t"] = snappedf(t - float(N["bell_t"]), 0.1)
			tel.event(t, "office_begins", {"office": "nones", "all_in_stalls": all_in})
	_free_life_minimal()
	if session.clock.hours >= 14.75:
		_goto("after_nones")

func _free_life_minimal() -> void:
	var nu: Actor = a("nuto")
	if nu.arrived_tag == "well":
		nu.arrived_tag = ""
		nu.activity = "work_well"
	var w: Actor = a("william")
	if w.arrived_tag == "abbot":
		w.arrived_tag = ""
		w.present = false

func _enter_after_nones() -> void:
	var c: Dictionary = data.get("clock", {})
	session.clock.rate = float(c.get("free_minutes_per_real_minute", 12.5)) / 3600.0
	tel.event(t, "office_end", {"office": "nones"})
	var k := 0
	for b: Dictionary in data.get("anonymous", []):
		var ab: Actor = a(String(b["id"]))
		_sub["back_%s" % ab.id] = 1.0 + fmod(float(k) * 1.9, 6.0)
		k += 1
	_sub["fulco_back"] = 3.0
	_sub["te_go"] = 2.0
	_sub["ce_go"] = 4.0

func _tick_after_nones(_dt: float) -> void:
	for b: Dictionary in data.get("anonymous", []):
		var ab: Actor = a(String(b["id"]))
		var key := "back_%s" % ab.id
		if _sub.has(key) and beat_t > float(_sub[key]):
			_sub.erase(key)
			ab.activity = "walk"
			var sp: Array = b["spot"]
			var pts: Array[Vector3] = graph.path_to(ab.pos, graph.nearest(Vector3(float(sp[0]), 0.3, float(sp[1]))))
			pts.append(Vector3(float(sp[0]), NAN, float(sp[1])))
			ab.go(pts, 1.0, "spot")
		if ab.arrived_tag == "spot":
			ab.arrived_tag = ""
			ab.activity = String(b["pose"])
			ab.yaw = float(b["ry"])
			ab.face_target = null
	if _sub.has("fulco_back") and beat_t > float(_sub["fulco_back"]):
		_sub.erase("fulco_back")
		var fu: Actor = a("fulco")
		var pts2: Array[Vector3] = graph.path_to(fu.pos, "cw_16")
		pts2.append(Vector3(-7.25, NAN, 17.4))
		fu.go(pts2, 1.3, "psalm")
	if a("fulco").arrived_tag == "psalm":
		a("fulco").arrived_tag = ""
		a("fulco").activity = "read"
		a("fulco").yaw = PI / 2.0
	for pair: Array in [["te_go", "tebaldo", "cal_4"], ["ce_go", "cellarer", "cal_14"]]:
		if _sub.has(pair[0]) and beat_t > float(_sub[pair[0]]):
			_sub.erase(pair[0])
			a(pair[1]).go(graph.path_to(a(pair[1]).pos, String(pair[2])), 1.5, "east")
		if a(pair[1]).arrived_tag == "east":
			a(pair[1]).arrived_tag = ""
			a(pair[1]).present = false
	_free_life()
	if beat_t > 80.0 and not _talking():
		_goto("end")

func _enter_end() -> void:
	session.clock.rate = 0.0
	autosave.emit("end")
	tel.event(t, "end", {"hours": session.clock.hours})
	ended.emit()

func _tick_end(_dt: float) -> void:
	pass

# --- the frame -------------------------------------------------------------------

var _dt_last: float = 0.0

## One frame of Adso's real, physical state.
func tick(dt: float, feet: Vector3, speed: float, eye: Vector3, fwd: Vector3, look_hit: Variant) -> void:
	_dt_last = dt
	t += dt
	beat_t += dt
	player_pos = feet
	player_speed = speed
	player_eye = eye
	player_fwd = fwd
	player_look = look_hit
	_lines()
	if beat != "":
		call("_tick_" + beat, dt)
	for id: String in actors.keys():
		var ac: Actor = actors[id]
		if trails.has(id):
			_follow_trail(id, dt)
		elif ac.moving:
			ac.step(dt)
	_gate_step(dt)
	_watch(dt)
	_meet()
	if hold_clock:
		session.clock.rate = 0.0
	if beat in ["road", "reception", "to_cell"]:
		var w: Actor = a("william")
		if beat == "road":
			tel.sample(t, beat, lead.progress(w.pos) - lead.progress(player_pos), lead.state, speed)
		elif tel.due(t):
			var to_cell: float = graph.length_of(graph.path_to(player_pos, "c_mid")) - graph.length_of(graph.path_to(w.pos, "c_mid"))
			tel.sample(t, beat, _dist2(w.pos, player_pos), "walk", speed, to_cell)

func _gate_step(dt: float) -> void:
	var tg: float = float(gate["target"])
	var o: float = float(gate["open"])
	if absf(tg - o) > 1e-4:
		gate["open"] = move_toward(o, tg, dt / 4.5)

## Mules (and anything led) walk a breadcrumb trail of their leader.
func _follow_trail(id: String, dt: float) -> void:
	var tr: Dictionary = trails[id]
	var leader_pos: Vector3 = player_pos if tr["leader"] == "adso" else a(String(tr["leader"])).pos
	var pts: Array = tr["pts"]
	if pts.is_empty() or Vector2(leader_pos.x - (pts[-1] as Vector3).x, leader_pos.z - (pts[-1] as Vector3).z).length() > 0.25:
		pts.append(Vector3(leader_pos.x, NAN, leader_pos.z))
		if pts.size() > 400:
			pts.pop_front()
	var f: Actor = actors[id]
	# target: the trail point `gap` metres behind the leader along the trail
	var need: float = float(tr["gap"])
	var acc := 0.0
	var target: Vector3 = pts[-1]
	for i: int in range(pts.size() - 1, 0, -1):
		var seg: float = Vector2((pts[i] as Vector3).x - (pts[i - 1] as Vector3).x, (pts[i] as Vector3).z - (pts[i - 1] as Vector3).z).length()
		if acc + seg >= need:
			var u: float = (need - acc) / maxf(seg, 1e-4)
			target = (pts[i] as Vector3).lerp(pts[i - 1], u)
			break
		acc += seg
		target = pts[i - 1]
	var to := Vector2(target.x - f.pos.x, target.z - f.pos.z)
	var d: float = to.length()
	if d > 0.05:
		var v: float = clampf(d * 1.6, 0.0, 2.6)
		var mv: float = minf(d, v * dt)
		f.pos.x += to.x / d * mv
		f.pos.z += to.y / d * mv
		f.travelled_m += mv
		if mv > 0.002:
			f.yaw = lerp_angle(f.yaw, atan2(to.x / d, to.y / d), 1.0 - exp(-4.0 * dt))
		f.moving = mv > 0.004 * maxf(1.0, dt * 60.0)
	else:
		f.moving = false

func _lines() -> void:
	while not line_queue.is_empty() and t >= float(line_queue[0]["at"]):
		var q: Dictionary = line_queue.pop_front()
		var id: String = q["id"]
		var L: Dictionary = data["lines"].get(id, {})
		if L.is_empty():
			continue
		var spk: String = L["s"]
		lines_said[id] = snappedf(t, 0.1)
		var label: String = "Adso" if spk == "adso" else people.label(spk)
		if spk != "adso" and spk != "william" and actors.has(spk):
			people.seen(spk, t)
		say.emit(spk, id, String(L["t"]), label)
		tel.event(t, "line", {"id": id})

static func line_duration(text: String) -> float:
	return clampf(1.3 + 0.058 * text.length(), 1.8, 7.5)

func _line(id: String, delay: float = 0.0) -> void:
	var L: Dictionary = data["lines"].get(id, {})
	if L.is_empty():
		push_warning("[day1a] unknown line " + id)
		return
	var at: float = maxf(t + delay, talking_until + delay)
	line_queue.append({"id": id, "at": at})
	talking_until = at + line_duration(String(L["t"]))

func _line_once(id: String) -> void:
	if lines_said.has(id) or line_queue.any(func(q: Dictionary) -> bool: return q["id"] == id):
		return
	_line(id)

func _talking() -> bool:
	return t < talking_until or not line_queue.is_empty()

func _interrupt() -> void:
	line_queue.clear()
	talking_until = t
	if pending_choice != "":
		var pc: String = pending_choice
		pending_choice = ""
		pending_options = []
		choice_closed.emit(pc)

func _ask(id: String, options: Array) -> void:
	pending_choice = id
	pending_options = options
	choice.emit(id, options)

## The player picked an option of the open choice.
func choose(option_id: String) -> void:
	var pc: String = pending_choice
	if pc == "":
		return
	pending_choice = ""
	pending_options = []
	choice_closed.emit(pc)
	tel.event(t, "choice", {"prompt": pc, "option": option_id})
	match pc:
		"meal_question":
			var defs: Dictionary = data.get("observations", {})
			var reply: String = String(defs.get(option_id, {}).get("reply", "w_a_nothing")) if option_id != "nothing" else "w_a_nothing"
			flags["meal_answer"] = option_id
			_line(reply, 0.4)
			_sub["answered"] = true
		"fulco":
			match option_id:
				"loud":
					_line("ad_cities_loud")
					_line("fu_loud", 0.3)
				"dogs":
					_line("ad_cities_dogs")
					_line("fu_dogs", 0.3)
				"raisins":
					_line("ad_raisins")
					_line("fu_raisins", 0.3)
					flags["raisins_given"] = true
					flags["raisins"] = false
				"verse":
					_line("ad_verse")
					_line("fu_verse", 0.3)
					flags["verse_prompted"] = true
			_line("fu_name", 0.6)
			_line("ad_name", 0.2)
			people.hear_name("fulco", "fulco", t)
			(tel.free["talked"] as Array).append("fulco")

# --- interactions -------------------------------------------------------------

## Interactions on offer now: [{id, label, pos, radius}]. The adapter's probe
## checks reach and sight; the director decides what exists.
func interactions() -> Array:
	var out: Array = _interactions()
	for it: Dictionary in out:
		var p: Vector3 = it["pos"]
		if is_nan(p.y):
			it["pos"] = Vector3(p.x, float(ground_fn.call(p.x, p.z)) + 0.4, p.z)
	return out

func _interactions() -> Array:
	var out: Array = []
	var cell_y: float = node("c_mid").y
	if beat == "gate_open" and bool(_sub.get("hold_offered", false)) and not bool(_sub.get("shoe_done", false)) and holding != "steady":
		out.append({"id": "hold_mule", "label": "Hold the halter steady", "pos": a("mule_a").pos + Vector3(0, 1.3, 0), "radius": 2.6})
	if String(props.get("bedding", {}).get("where", "")) == "ground" and carrying == "":
		out.append({"id": "take_bedding", "label": "Take the bedding bundle", "pos": (props["bedding"]["pos"] as Vector3) + Vector3(0, 0.35, 0), "radius": 2.2})
	if carrying == "bedding" and _dist2(player_pos, node("c_niche")) < 3.0 and player_pos.y > 5.0:
		out.append({"id": "place_bedding", "label": "Put the bedding down on the straw", "pos": Vector3(-18.5, cell_y + 0.75, 16.65), "radius": 2.4})
	if beat in ["second_bundle", "meal", "free", "nones", "after_nones"] and carrying == "" and not flags.has("straw_tested"):
		out.append({"id": "straw", "label": "Try the straw", "pos": Vector3(-18.5, cell_y + 0.75, 16.3), "radius": 1.8})
	if beat in ["second_bundle"] and String(props["chest"]["where"]) == "ground" and carrying == "":
		out.append({"id": "take_chest", "label": "Lift the chest", "pos": (props["chest"]["pos"] as Vector3) + Vector3(0, 0.4, 0), "radius": 2.2})
	if carrying == "chest" and _dist2(player_pos, node("c_chest")) < 3.2 and player_pos.y > 5.0:
		out.append({"id": "place_chest", "label": "Set the chest down by the bed", "pos": Vector3(-14.25, cell_y + 0.4, 17.45), "radius": 2.6})
	if beat == "meal" and String(_sub.get("phase", "")) in ["eat", "question", "answer"]:
		if seated == "":
			out.append({"id": "sit_stool", "label": "Sit at the table", "pos": Vector3(-16.32, cell_y + 0.45, 16.2), "radius": 1.6})
		else:
			# the things on the tray where the cell's table shows them
			# (claustrum.js hospice(): bread, cheese, the olive bowl, raisins, the wine jar)
			for f: Array in [["eat_bread", "Take some bread", Vector3(-16.12, 0.95, 15.66)], ["eat_cheese", "Take some cheese", Vector3(-16.14, 0.88, 15.5)], ["eat_olives", "Take a few olives", Vector3(-15.87, 0.9, 15.42)], ["pour_wine", "Pour wine for William", Vector3(-16.62, 1.0, 15.58)]]:
				if not flags.has(f[0]) or f[0] != "pour_wine":
					var q: Vector3 = f[2]
					out.append({"id": f[0], "label": f[1], "pos": Vector3(q.x, cell_y + q.y, q.z), "radius": 1.35})
			if not flags.has("raisins") and not flags.has("raisins_given"):
				out.append({"id": "raisins", "label": "Slip a few raisins into your sleeve", "pos": Vector3(-15.87, cell_y + 0.95, 15.68), "radius": 1.35})
		if String(props.get("hose", {}).get("where", "")) == "bed" and carrying == "":
			out.append({"id": "wring_hose", "label": "Wring out William's hose", "pos": props["hose"]["pos"], "radius": 2.0})
		if carrying == "hose":
			out.append({"id": "lay_hose", "label": "Lay them on the window sill", "pos": Vector3(-19.0, cell_y + 1.3, 17.45), "radius": 2.0})
	if beat in ["free", "after_nones"]:
		var fu: Actor = a("fulco")
		if fu.present and not fu.moving and fu.activity == "read" and not flags.has("fulco_talked"):
			out.append({"id": "talk_fulco", "label": "Speak to the novice", "pos": fu.pos + Vector3(0, 1.5, 0), "radius": 2.6})
		elif fu.present and not fu.moving and flags.has("fulco_talked") and not flags.has("fulco_joke"):
			out.append({"id": "talk_fulco2", "label": "Speak to Fulco", "pos": fu.pos + Vector3(0, 1.5, 0), "radius": 2.6})
		var nu: Actor = a("nuto")
		if nu.present and not nu.moving and nu.activity == "work_well" and String(_sub.get("water", "")) == "":
			out.append({"id": "help_nuto", "label": "Offer to carry a bucket", "pos": nu.pos + Vector3(0, 1.2, 0), "radius": 2.6})
		var ra: Actor = a("rainaldo")
		if ra.present and not ra.moving and not flags.has("rainaldo_talked"):
			out.append({"id": "talk_rainaldo", "label": "Greet the monk at the lectern", "pos": ra.pos + Vector3(0, 1.5, 0), "radius": 2.8})
		var te: Actor = a("tebaldo")
		if te.present and _dist2(player_pos, te.pos) < 3.0 and not flags.has("tebaldo_busy_%d" % int(session.clock.hours * 4.0)):
			out.append({"id": "talk_tebaldo", "label": "Speak to Brother Tebaldo", "pos": te.pos + Vector3(0, 1.5, 0), "radius": 2.6})
		if seated == "":
			for bn: Array in [["bench_porch", Vector3(-9.88, 0.77, 14.135)], ["bench_garth", Vector3(-6.95, 0.75, 9.2)]]:
				out.append({"id": "sit_" + String(bn[0]), "label": "Sit for a while", "pos": bn[1] + Vector3(0, 0.3, 0), "radius": 1.8})
	# whatever the hour, a seated Adso can always get up
	if seated != "":
		out.append({"id": "stand", "label": "Get up", "pos": player_eye + player_fwd * 0.6 + Vector3(0, -0.5, 0), "radius": 3.0, "always": true})
	if carrying == "bucket" and String(_sub.get("water", "")) == "arrived":
		out.append({"id": "set_bucket", "label": "Set the bucket down", "pos": Vector3(node("st_foot").x - 0.6, NAN, node("st_foot").z + 0.4), "radius": 2.4})
	return out

func interact(id: String) -> Dictionary:
	tel.event(t, "interact", {"id": id})
	match id:
		"hold_mule":
			holding = "steady"
			var mp: Vector3 = a("mule_a").pos
			sfx.emit("snort", Vector3(mp.x, float(ground_fn.call(mp.x, mp.z)) + 1.4, mp.z))
			return {"hold": "mule_a"}
		"take_bedding":
			carrying = "bedding"
			holding = ""
			props["bedding"] = {"where": "carried"}
			sfx.emit("cloth", player_pos)
			return {"carry": "bedding"}
		"place_bedding":
			carrying = ""
			props["bedding"] = {"where": "placed", "pos": Vector3(-18.45, 7.2, 16.7)}
			sfx.emit("straw", Vector3(-18.5, 6.9, 16.6))
			return {"placed": "bedding"}
		"straw":
			flags["straw_tested"] = true
			obs.add("straw", t, "the cell", "after we came in")
			sfx.emit("straw", Vector3(-18.5, 6.9, 16.3))
			var w: Actor = a("william")
			if w.present and _dist2(w.pos, player_pos) < 5.0:
				_line_once("w_straw")
			return {}
		"take_chest":
			carrying = "chest"
			props["chest"] = {"where": "carried"}
			sfx.emit("chest", player_pos)
			return {"carry": "chest"}
		"place_chest":
			carrying = ""
			props["chest"] = {"where": "placed", "pos": Vector3(-14.25, 6.2, 17.45)}
			sfx.emit("chest_down", Vector3(-14.25, 6.4, 17.45))
			return {"placed": "chest"}
		"sit_stool":
			seated = "stool"
			return {"sit": Vector3(-16.32, node("c_mid").y + 0.0, 16.2), "yaw": 0.0}
		"stand":
			var was: String = seated
			seated = ""
			return {"stand": was}
		"eat_bread", "eat_cheese", "eat_olives":
			flags[id] = int(flags.get(id, 0)) + 1
			_sub["acts"] = int(_sub.get("acts", 0)) + 1
			sfx.emit("chew", player_eye)
			if int(flags[id]) == 1:
				_line_once({"eat_bread": "w_meal_bread", "eat_cheese": "w_meal_cheese", "eat_olives": "w_meal_olives"}[id])
			return {"eat": id.trim_prefix("eat_")}
		"pour_wine":
			flags["pour_wine"] = true
			_sub["acts"] = int(_sub.get("acts", 0)) + 1
			sfx.emit("pour", Vector3(-16.6, node("c_mid").y + 0.95, 15.6))
			_line_once("w_meal_wine")
			return {"pour": true}
		"raisins":
			flags["raisins"] = true
			_sub["acts"] = int(_sub.get("acts", 0)) + 1
			return {"pocket": "raisins"}
		"wring_hose":
			carrying = "hose"
			props["hose"] = {"where": "carried"}
			sfx.emit("wring", player_eye)
			return {"carry": "hose"}
		"lay_hose":
			carrying = ""
			props["hose"] = {"where": "sill", "pos": Vector3(-19.05, node("c_mid").y + 1.22, 17.45)}
			_line_once("w_hose_done")
			_sub["acts"] = int(_sub.get("acts", 0)) + 1
			return {"placed": "hose"}
		"talk_fulco":
			flags["fulco_talked"] = true
			var fu: Actor = a("fulco")
			fu.face_target = player_pos
			fu.activity = "talk"
			_line("fu_notice")
			_line("fu_city", 0.3)
			var opts: Array = [{"id": "loud", "text": "They're loud. Bells, carts, everybody shouting."}, {"id": "dogs", "text": "Some are. Ours had more dogs than people."}]
			if bool(flags.get("raisins", false)):
				opts.append({"id": "raisins", "text": "[Give him the raisins.]"})
			if lines_said.has("fu_psalm"):
				opts.append({"id": "verse", "text": "“… in protectione Dei caeli commorabitur.”"})
			_sub["fulco_opts"] = opts
			_sub["fulco_ask_at"] = talking_until
			return {"talk": "fulco"}
		"talk_fulco2":
			flags["fulco_joke"] = true
			_line("fu_joke")
			if a("rainaldo").present:
				_line("fu_rainaldo", 0.4)
				people.hear_name("rainaldo", "fulco", t)
			return {"talk": "fulco"}
		"help_nuto":
			_sub["water"] = "walking"
			var nu: Actor = a("nuto")
			nu.carrying = "bucket"
			carrying = "bucket"
			_line("nu_well")
			_line("ad_help_nuto", 0.3)
			_line("nu_help", 0.3)
			_sub["water_m0"] = nu.travelled_m
			nu.activity = "walk"
			nu.go(graph.path_to(nu.pos, "st_foot"), 0.92, "water")
			return {"carry": "bucket"}
		"set_bucket":
			carrying = ""
			props["bucket_adso"] = {"where": "ground", "pos": Vector3(node("st_foot").x - 0.6, float(ground_fn.call(node("st_foot").x - 0.6, node("st_foot").z + 0.4)), node("st_foot").z + 0.4)}
			sfx.emit("bucket", node("st_foot"))
			return {"placed": "bucket"}
		"talk_rainaldo":
			flags["rainaldo_talked"] = true
			var ra: Actor = a("rainaldo")
			ra.face_target = player_pos
			_line("ra_name")
			people.hear_name("rainaldo", "rainaldo", t)
			_line("ra_book", 0.4)
			_line("ra_lamps", 0.4)
			(tel.free["talked"] as Array).append("rainaldo")
			return {"talk": "rainaldo"}
		"talk_tebaldo":
			var k: int = int(session.clock.hours * 4.0)
			flags["tebaldo_busy_%d" % k] = true
			_line(["te_busy_1", "te_busy_2", "te_busy_3"][k % 3])
			(tel.free["talked"] as Array).append("tebaldo")
			return {"talk": "tebaldo"}
		"sit_bench_porch", "sit_bench_garth":
			seated = "bench"
			var at: Vector3 = Vector3(-9.6, 0.31, 14.135) if id == "sit_bench_porch" else Vector3(-6.6, 0.3, 9.2)
			return {"sit": at, "yaw": PI / 2.0 if id == "sit_bench_porch" else -PI / 2.0}
	return {}

## Adso walked away from a held halter.
func release_hold() -> void:
	if holding == "steady":
		holding = ""
		tel.event(t, "let_go", {})

func _tick_choices() -> void:
	if _sub.has("fulco_ask_at") and t >= float(_sub["fulco_ask_at"]) and pending_choice == "":
		_sub.erase("fulco_ask_at")
		_ask("fulco", _sub["fulco_opts"])

# --- perception -------------------------------------------------------------

func _looking_at(p: Vector3, deg: float) -> bool:
	if is_nan(p.y):
		p.y = float(ground_fn.call(p.x, p.z)) + 1.2
	var d: Vector3 = p - player_eye
	if d.length() < 0.05:
		return true
	return rad_to_deg(player_fwd.angle_to(d.normalized())) < deg

func _watch_hit(id: String) -> void:
	dwell[id] = float(dwell.get(id, 0.0)) + _dt_last
	if float(dwell[id]) > 1.4:
		obs.add(id, t, "the gate", "while the porter knelt")

func _watch(dt: float) -> void:
	_tick_choices()
	for id: String in (data.get("watch", {}) as Dictionary).keys():
		if obs.has(id):
			continue
		var wd: Dictionary = data["watch"][id]
		var at_a: Array = wd["at"]
		var at := Vector3(float(at_a[0]), float(at_a[1]), float(at_a[2]))
		if player_eye.distance_to(at) > float(wd["max_m"]):
			dwell[id] = 0.0
			continue
		var region: String = wd.get("region", "any")
		var ok: bool = true
		match region:
			"road":
				ok = player_pos.x < -108.0
			"inside":
				ok = player_pos.x > -104.0 and player_pos.y < 3.0
			"cell":
				ok = player_pos.y > 5.0
		if ok and id == "gate_bar":
			ok = gate["bar"] == "up"
		if ok and _looking_at(at, float(wd["angle_deg"])):
			dwell[id] = float(dwell.get(id, 0.0)) + dt
			if float(dwell[id]) >= float(wd["dwell"]):
				var place: String = {"valley": "the road", "aed_windows": "the gate court", "gate_hinges": "the gate", "gate_bar": "the gate", "garden": "the flower garden", "crown": "our window"}.get(id, "here")
				var when: String = "on the way up" if beat == "road" else ("while they sang" if session.clock.office() != "" else "before we ate" if beat in ["reception", "to_cell", "second_bundle"] else "after the meal")
				obs.add(id, t, place, when)
				tel.event(t, "observation", {"id": id})
		else:
			dwell[id] = maxf(0.0, float(dwell.get(id, 0.0)) - dt * 2.0)
	if beat == "road" and player_pos.x < -108.0 and player_pos.z > 0.0 and player_pos.z < 46.0:
		dwell["pines"] = float(dwell.get("pines", 0.0)) + dt
		if float(dwell["pines"]) > 25.0:
			obs.add("pines", t, "the road", "on the way up")

func _meet() -> void:
	for id: String in ["fazio", "cellarer", "tebaldo", "nuto", "fulco", "rainaldo"]:
		var ac: Actor = a(id)
		if ac.present and _dist2(ac.pos, player_pos) < 4.0:
			tel.meet(t, id)
			people.seen(id, t)

# --- helpers -------------------------------------------------------------------

func _near(p: Vector3, r: float) -> bool:
	return _dist2(p, player_pos) < r

static func _dist2(p: Vector3, q: Vector3) -> float:
	return Vector2(p.x - q.x, p.z - q.z).length()

static func _xz(p: Array) -> Vector3:
	return Vector3(float(p[0]), NAN, float(p[1]))

static func _v3(p: Array) -> Vector3:
	return Vector3(float(p[0]), float(p[1]), float(p[2]))

static func _typed(pts: Array) -> Array[Vector3]:
	var out: Array[Vector3] = []
	for x: Variant in pts:
		out.append(x as Vector3)
	return out

func _beside(ac: Actor, d: float) -> Vector3:
	var side := Vector3(cos(ac.yaw), 0, -sin(ac.yaw))
	return Vector3(ac.pos.x + side.x * d, NAN, ac.pos.z + side.z * d)

func _off_route(p: Vector3, route: String) -> float:
	var pts: Array[Vector3] = _route(route)
	var best := INF
	for i: int in range(1, pts.size()):
		var a2 := Vector2(pts[i - 1].x, pts[i - 1].z)
		var b2 := Vector2(pts[i].x, pts[i].z)
		var ab: Vector2 = b2 - a2
		var tt: float = clampf((Vector2(p.x, p.z) - a2).dot(ab) / maxf(ab.length_squared(), 1e-6), 0.0, 1.0)
		best = minf(best, (a2 + ab * tt).distance_to(Vector2(p.x, p.z)))
	return best

func _zone(p: Vector3) -> String:
	if p.y > 3.0:
		return ""
	for z: Dictionary in data.get("zones", {}).get("off_route", []):
		var b: Array = z["box"]
		if p.x >= float(b[0]) and p.z >= float(b[1]) and p.x <= float(b[2]) and p.z <= float(b[3]):
			return String(z["id"])
	return ""

## Deterministic per-scenario pseudo random (no global RNG state).
func randf_seeded(k: int) -> float:
	var x: float = sin(float(k) * 12.9898 + 78.233) * 43758.5453
	return x - floor(x)

func _on_lead_state(old: String, new: String, info: Dictionary) -> void:
	if new == "WAIT" and not info.get("after_share", false):
		tel.event(t, "william_wait", {"look_point": info.get("look_point", ""), "gap": snappedf(float(info.get("gap", 0.0)), 0.1)})
	if new == "FOLLOW":
		tel.event(t, "overtake", {})
		if beat == "road":
			_line_once("w_overtake")
	if old == "WAIT":
		tel.event(t, "william_resume", {"waited_s": snappedf(float(info.get("waited_s", 0.0)), 0.1)})

# --- persistence -------------------------------------------------------------

func to_dict() -> Dictionary:
	var ad: Dictionary = {}
	for id: String in NAMED:
		ad[id] = a(id).to_dict()
	var pr: Dictionary = {}
	for k: String in props.keys():
		var p: Dictionary = (props[k] as Dictionary).duplicate()
		if p.get("pos") is Vector3:
			var v: Vector3 = p["pos"]
			p["pos"] = [v.x, v.y if not is_nan(v.y) else null, v.z]
		pr[k] = p
	var sub: Dictionary = {}
	for k: String in _sub.keys():
		var v2: Variant = _sub[k]
		if v2 is float or v2 is int or v2 is bool or v2 is String:
			sub[k] = v2
	return {"beat": beat, "beat_t": beat_t, "t": t, "flags": flags.duplicate(true), "props": pr, "gate": gate.duplicate(), "carrying": carrying, "seated": seated,
		"lines_said": lines_said.duplicate(), "lead": lead.to_dict(), "actors": ad, "people": people.to_dict(), "observations": obs.to_dict(), "telemetry": tel.to_dict(), "sub": sub,
		"trails": trails.keys().map(func(k: String) -> Array: return [k, trails[k]["leader"], trails[k]["gap"]])}

func restore(d: Dictionary) -> PackedStringArray:
	var warnings: PackedStringArray = []
	var b: String = String(d.get("beat", "road"))
	if not BEATS.has(b):
		warnings.append("unknown beat " + b)
		return warnings
	beat = b
	beat_t = float(d.get("beat_t", 0.0))
	t = float(d.get("t", 0.0))
	flags = (d.get("flags", {}) as Dictionary).duplicate(true)
	gate = (d.get("gate", gate) as Dictionary).duplicate()
	carrying = String(d.get("carrying", ""))
	seated = ""
	lines_said = (d.get("lines_said", {}) as Dictionary).duplicate()
	for k: String in (d.get("props", {}) as Dictionary).keys():
		var p: Dictionary = (d["props"][k] as Dictionary).duplicate()
		if p.get("pos") is Array:
			var q: Array = p["pos"]
			p["pos"] = Vector3(float(q[0]), NAN if q[1] == null else float(q[1]), float(q[2]))
		props[k] = p
	for id: String in NAMED:
		if (d.get("actors", {}) as Dictionary).has(id):
			a(id).restore(d["actors"][id])
	warnings.append_array(people.restore(d.get("people", {})))
	warnings.append_array(obs.restore(d.get("observations", {})))
	tel.restore(d.get("telemetry", {}))
	# routes and look points are data: rebuild, then the saved walking state
	if beat == "road":
		lead.setup(_route("road"), _look_points("road"), data.get("lead", {}))
	lead.restore(d.get("lead", {}))
	_sub = (d.get("sub", {}) as Dictionary).duplicate()
	trails.clear()
	for tr: Array in d.get("trails", []):
		trails[String(tr[0])] = {"leader": String(tr[1]), "pts": [], "gap": float(tr[2])}
	line_queue.clear()
	talking_until = t
	pending_choice = ""
	# the community is never saved: rebuild it from the beat
	if beat in ["free", "nones", "after_nones", "end"]:
		for bdef: Dictionary in data.get("anonymous", []):
			var ab: Actor = a(String(bdef["id"]))
			var sp: Array = bdef["spot"]
			if beat == "nones":
				var st: Vector3 = node(String(bdef["stall"]))
				ab.place(st, 0.0 if st.z < -5.46 else PI, t, "restored in choir (office in progress)")
				ab.activity = "choir"
			else:
				ab.place(Vector3(float(sp[0]), NAN, float(sp[1])), float(bdef["ry"]), t, "restored at reading place")
				ab.activity = String(bdef["pose"])
			ab.present = true
	if beat == "nones":
		for k: String in _sub.keys():
			if k.begins_with("go_"):
				_sub.erase(k)
	return warnings
