extends SceneTree
## Day-1A regressions against the real main scene: the pause menu's HUD
## requests, F5/F9 key events, the adapter's one load path (HUD, body,
## figures, sound, end card), repeated loads into already-used scene objects,
## and a fresh process per case loading a save as a player's F9 after launch.
## Scratch storage only:
##   godot --headless --path native -s res://tests/day1a_scene_tests.gd -- \
##     --save-dir=<scratch>/saves --telemetry-dir=<scratch>/telemetry [--out=<dir>]
## The relaunch children (--phase=relaunch --case=<id>) are started by the
## parent. Exit code 0 only when every check passes.

var rows: Array = []
var args: Dictionary
var m: Node3D
var d: Day1aDirector
var bells: Array = []

func _initialize() -> void:
	call_deferred("run")

func check(id: String, ok: bool, details: Dictionary = {}) -> void:
	rows.append({"id": id, "pass": ok, "details": details})
	if not ok:
		printerr("FAIL ", id, " ", JSON.stringify(details))

func run() -> void:
	await process_frame
	args = root.get_node("Game").args
	if not args.has("save-dir") or not args.has("telemetry-dir"):
		printerr("scratch --save-dir and --telemetry-dir are required")
		quit(2)
		return
	m = (load("res://scenes/main.tscn") as PackedScene).instantiate()
	root.add_child(m)
	await physics_frame
	m.set_paused(true)
	d = m.day1.director
	d.bell.connect(func(o: String, _n: int, _i: float) -> void: bells.append(o))
	if String(args.get("phase", "")) == "relaunch":
		await relaunch_case(String(args.get("case", "")))
	else:
		await main_cases()
		await relaunch_parent()
	var failed: int = rows.filter(func(r: Dictionary) -> bool: return not r["pass"]).size()
	var report: Dictionary = {"suite": "day1a_scene", "engine": Engine.get_version_info()["string"], "phase": String(args.get("phase", "main")),
		"passed": rows.size() - failed, "total": rows.size(), "checks": rows}
	var out: String = String(args.get("out", ""))
	if String(args.get("phase", "")) == "relaunch":
		out = String(args["save-dir"])
	if out != "":
		DirAccess.make_dir_recursive_absolute(out)
		var f := FileAccess.open(out.path_join("day1a_scene_tests.json" if String(args.get("phase", "")) != "relaunch" else "relaunch_result.json"), FileAccess.WRITE)
		f.store_string(JSON.stringify(report, "  "))
		f.close()
	print(JSON.stringify({"suite": report["suite"], "phase": report["phase"], "passed": report["passed"], "total": report["total"]}))
	m.queue_free()
	await process_frame
	quit(1 if failed else 0)

# --- helpers --------------------------------------------------------------------

## The director as the adapter feeds it, Adso standing at `at`; the clock
## runs although the scene is paused (the menu's pause would hold it).
func tick(seconds: float, at: Vector3, step: float = 0.1) -> void:
	var was: bool = m.session.clock.paused
	m.session.clock.paused = false
	for i: int in int(round(seconds / step)):
		m.session.clock.advance(step)
		d.tick(step, at, 0.0, at + Vector3(0, 1.62, 0), Vector3.FORWARD, null)
	m.session.clock.paused = was

func key(action: String) -> void:
	var ev := InputEventAction.new()
	ev.action = action
	ev.pressed = true
	m._unhandled_input(ev)

func number(n: int) -> void:
	var ev := InputEventKey.new()
	ev.physical_keycode = KEY_1 + n - 1
	ev.pressed = true
	m._unhandled_input(ev)

func sha(path: String) -> String:
	return FileAccess.get_sha256(path) if FileAccess.file_exists(path) else ""

func cell() -> Vector3:
	return d.node("c_mid") + Vector3(0, 0.05, 0)

## Seed a proof slot with a main file and a backup (two writes rotate .bak).
func seed_proof(dir: String) -> Dictionary:
	var sv := SaveService.new(dir)
	var snap: Dictionary = m.session.snapshot()
	snap["player"]["position"] = [0.5, 0.35, 12.0]
	var e1: String = sv.write(snap)
	snap["player"]["position"] = [0.6, 0.35, 12.0]
	var e2: String = sv.write(snap)
	var p: String = ProjectSettings.globalize_path(sv.path())
	return {"main": p, "bak": p + ".bak", "main_sha": sha(p), "bak_sha": sha(p + ".bak"), "error": e1 + e2}

func meal_question() -> void:
	d._goto("meal")
	d._sub = {"phase": "answer", "acts": 2, "eat_t": 0.0}
	d.line_queue.clear()
	d.talking_until = d.t
	d.lines_said["w_question"] = d.t
	d._ask("meal_question", d._meal_options())

func meal_lines() -> void:
	d._goto("meal")
	d.line_queue.clear()
	d.talking_until = d.t
	d.a("tebaldo").arrived_tag = "tray"
	d._tick_meal(0.0)

func nones_walking() -> void:
	d._goto("free")
	d._goto("nones")
	tick(14.0, Vector3(-5.0, 0.35, 10.0))

func summary() -> Dictionary:
	var pos: Dictionary = {}
	for id: String in d.actors.keys():
		var p: Vector3 = d.a(id).pos
		pos[id] = [snappedf(p.x, 0.0001), snappedf(p.z, 0.0001), d.a(id).activity, d.a(id).present, d.a(id).moving]
	var ls: Array = d.lines_said.keys()
	ls.sort()
	return {"beat": d.beat, "beat_t": snappedf(d.beat_t, 0.0001), "t": snappedf(d.t, 0.0001), "choice": d.pending_choice, "queue": d.line_queue.map(func(q: Dictionary) -> String: return q["id"]),
		"lines": ls, "carrying": d.carrying, "seated": d.seated, "holding": d.holding, "actors": pos, "hours": snappedf(m.session.clock.hours, 0.0001)}

func save_snapshot() -> Dictionary:
	var e: String = m.day1.save_now()
	var r: Dictionary = m.day1.saves.read()
	return r["snapshot"] if e == "" and r["snapshot"] != null else {}

# --- cases in the running scene ---------------------------------------------------

func main_cases() -> void:
	var save_dir: String = String(args["save-dir"])
	m.session.saves.delete_all()
	m.day1.saves.delete_all()
	var P: Dictionary = seed_proof(save_dir)
	# 1. the pause menu and the keys save/load only the Day-1A slot
	m.set_paused(false)
	m.set_paused(true)
	var shown: String = m.hud.pause_status.text
	for i: int in 3:
		m.hud.request.emit("save", null)
	var after_save: String = m.hud.pause_status.text
	m.hud.request.emit("load", null)
	var after_load: String = m.hud.pause_status.text
	m.set_paused(false)
	for i: int in 2:
		key("save_game")
		key("load_game")
	m.set_paused(true)
	check("menu_and_keys_use_the_day1a_slot_and_never_the_proof_slot",
		P["error"] == "" and sha(P["main"]) == P["main_sha"] and sha(P["bak"]) == P["bak_sha"] and P["bak_sha"] != "" and FileAccess.file_exists(m.day1.save_path())
		and shown.contains(m.day1.save_path()) and after_save.contains(m.day1.save_path()) and after_load.begins_with("Loaded"),
		{"proof_main_unchanged": sha(P["main"]) == P["main_sha"], "proof_backup_unchanged": sha(P["bak"]) == P["bak_sha"], "day1a_slot": m.day1.save_path(),
		 "pause_shows": shown, "after_save": after_save, "after_load": after_load})
	# 2. the menu's Load restores the Day-1A director
	d.t = 31.0
	var e: String = m.day1.save_now()
	d.t = 10.0
	m.hud.request.emit("load", null)
	check("menu_load_restores_the_day1a_director", e == "" and is_equal_approx(d.t, 31.0), {"t": d.t, "status": m.hud.pause_status.text})
	# 3. Tebaldo's lines queued at the tray are still said after a load
	meal_lines()
	var q_before: Array = d.line_queue.map(func(q: Dictionary) -> String: return q["id"])
	m.day1.save_now()
	m.day1.load_save()
	var q_after: Array = d.line_queue.map(func(q: Dictionary) -> String: return q["id"])
	tick(90.0, cell(), 1.0)
	check("interrupted_meal_lines_finish_after_load", q_before == q_after and q_before.size() >= 5 and d.lines_said.has("te_sorry") and (d.beat != "meal" or String(d._sub.get("phase", "")) != "tebaldo_talk"),
		{"queued_before": q_before, "queued_after": q_after, "beat": d.beat, "phase": d._sub.get("phase", "")})
	# 4. William's open question is shown again and answered with a key
	meal_question()
	m.day1.save_now()
	m.day1.hud.hide_choice()
	m.day1.load_save()
	await process_frame
	var shown_opts: int = m.day1.hud.choice_list.get_child_count()
	m.set_paused(false)
	number(1)
	m.set_paused(true)
	tick(5.0, cell())
	check("open_meal_question_survives_load_and_a_key_answers_it", m.day1.hud.options.is_empty() and d.flags.has("meal_answer") and shown_opts == d._meal_options().size(),
		{"options_shown": shown_opts, "answer": d.flags.get("meal_answer", "")})
	# 5. the end card follows the save that is loaded
	d._goto("road")
	m.day1.save_now()
	m.day1._on_end()
	m.day1.load_save()
	var t0: float = d.t
	m.paused = false
	m.day1._physics_process(0.1)
	m.paused = true
	check("an_earlier_save_resumes_after_the_end", not m.day1._ended and not m.day1.hud.end_card.visible and d.t > t0, {"ended": m.day1._ended, "t0": t0, "t": d.t})
	d._goto("end")
	m.day1._ended = false
	m.day1.hud.set_end(false)
	d._goto("road")
	m.day1.load_save()
	var t1: float = d.t
	m.paused = false
	m.day1._physics_process(0.1)
	m.paused = true
	check("the_end_save_restores_the_end_card_and_stops", d.beat == "end" and m.day1._ended and m.day1.hud.end_card.visible and is_equal_approx(d.t, t1), {"beat": d.beat, "ended": m.day1._ended, "card": m.day1.hud.end_card.visible})
	# 6. repeated loads into the same, already-used scene objects
	var children: int = m.day1.get_child_count()
	meal_question()
	var A: Dictionary = save_snapshot()
	nones_walking()
	var B: Dictionary = save_snapshot()
	d._goto("end")
	var E: Dictionary = save_snapshot()
	m.day1.apply_snapshot(A)
	var first: Dictionary = summary()
	tick(3.0, cell())
	m.day1.apply_snapshot(B)
	tick(3.0, Vector3(-5.0, 0.35, 10.0))
	m.day1.apply_snapshot(E)
	var card_on_e: bool = m.day1.hud.end_card.visible and m.day1._ended
	m.day1.apply_snapshot(A)
	m.day1.apply_snapshot(A)
	await process_frame
	var again: Dictionary = summary()
	var t2: float = d.t
	m.paused = false
	m.day1._physics_process(0.1)
	m.paused = true
	check("repeated_loads_into_used_objects_leave_nothing_behind",
		first == again and card_on_e and not m.day1.hud.end_card.visible and not m.day1._ended and d.t > t2 and m.day1.get_child_count() == children
		and m.day1.hud.choice_list.get_child_count() == (A["director"]["pending_options"] as Array).size() and m.day1.hud.lines.is_empty(),
		{"same_state": first == again, "end_card_on_end_save": card_on_e, "children": [children, m.day1.get_child_count()],
		 "choices_shown": m.day1.hud.choice_list.get_child_count(), "subtitles": m.day1.hud.lines.size(), "first": str(first).left(300), "again": str(again).left(300)})
	# 7. Nones stays physical: at the bell, walking, in the choir, afterwards
	await nones_cases()
	# 8. a seat, a carried chest and a held halter survive a load
	d._goto("meal")
	d._sub = {"phase": "eat", "acts": 0, "eat_t": d.beat_t}
	m.player.teleport(cell(), 0.0, "test")
	m.day1._do("sit_stool")
	var sat: bool = d.seated == "stool" and m.player.seat != null
	m.day1.save_now()
	m.day1.load_save()
	var seated_after: bool = d.seated == "stool" and m.player.seat != null
	m.day1._do("stand")
	var floor_y: float = m.player.global_position.y
	d._goto("second_bundle")
	d.interact("take_chest")
	m.day1.save_now()
	d.carrying = ""
	m.day1.load_save()
	var chest: bool = d.carrying == "chest" and String(d.props["chest"].get("where", "")) == "carried"
	d._goto("gate_open")
	d.holding = "steady"
	d._sub["hold_offered"] = true
	m.day1.save_now()
	d.holding = ""
	m.day1.load_save()
	check("seat_carry_and_hold_survive_a_load", sat and seated_after and absf(floor_y - (d.node("c_mid").y + 0.05)) < 0.12 and chest and d.holding == "steady",
		{"sat": sat, "seated_after_load": seated_after, "stood_at_y": floor_y, "chest": chest, "holding": d.holding})
	# 9. the novice's name: not while queued, not when interrupted, only when heard
	var fresh_session := GameSession.new(m.content, String(args["save-dir"]).path_join("names"), 13.0, 7)
	var f := Day1aDirector.new(m.content.doc("day1a"), fresh_session)
	f.start()
	f._goto("free")
	f.line_queue.clear()
	f.talking_until = f.t
	f.interact("talk_fulco")
	for i: int in 300:
		if f.pending_choice == "fulco":
			break
		f.tick(0.1, Vector3(-7.25, 0.3, 17.4), 0.0, Vector3(-7.25, 1.92, 17.4), Vector3.FORWARD, null)
	var reached: bool = f.pending_choice == "fulco"
	f.choose("loud")
	var early: bool = f.people.knows_name("fulco")
	f._interrupt()
	check("a_queued_unheard_name_teaches_nothing", reached and not early and not f.people.knows_name("fulco"), {"choice_reached": reached, "known_while_queued": early})
	# proof slot still byte-identical after everything above
	check("proof_slot_byte_identical_after_all_day1a_saves_and_loads", sha(P["main"]) == P["main_sha"] and sha(P["bak"]) == P["bak_sha"], {"main": P["main"]})

func nones_cases() -> void:
	var stage_checks: Dictionary = {}
	d._goto("free")
	d._goto("nones")
	tick(0.5, Vector3(-5.0, 0.35, 10.0))
	for stage: String in ["bell", "walking", "choir", "after"]:
		match stage:
			"walking":
				tick(13.5, Vector3(-5.0, 0.35, 10.0))
			"choir":
				for i: int in 900:
					if bool(d._sub.get("office_begun", false)):
						break
					tick(0.1, Vector3(23.4, 0.35, -2.2))
			"after":
				d._goto("after_nones")
				tick(4.0, Vector3(23.4, 0.35, -2.2))
		var before: Dictionary = summary()
		var n_bells: int = bells.size()
		var due: int = d.bell_remaining().get("offsets", []).size()
		m.day1.save_now()
		m.day1.load_save()
		var after: Dictionary = summary()
		var queue: int = m.day1.audio._bell_queue.size()
		var ok: bool = before["actors"] == after["actors"] and bells.size() == n_bells and queue == due and not m.audio.chant.playing
		if stage in ["bell", "walking"]:
			ok = ok and d.office_sung() == ""
		var differ: Array = []
		for id: String in (before["actors"] as Dictionary).keys():
			if before["actors"][id] != after["actors"].get(id):
				differ.append([id, before["actors"][id], after["actors"].get(id)])
		stage_checks[stage] = {"same_actors": before["actors"] == after["actors"], "differ": differ.slice(0, 4), "bell_signals_on_load": bells.size() - n_bells, "strokes_due": due, "strokes_queued": queue, "office": d.office_sung()}
		check("nones_%s_survives_a_load_without_jumps_bells_or_chant" % stage, ok, stage_checks[stage])
	# after the office everyone finds his way back out
	tick(80.0, Vector3(23.4, 0.35, -2.2), 0.2)
	var in_choir: Array = []
	for b: Dictionary in m.content.doc("day1a")["anonymous"]:
		if d.a(String(b["id"])).activity == "choir":
			in_choir.append(b["id"])
	check("after_nones_the_brothers_leave_the_choir", in_choir.is_empty() and d.beat == "end", {"still_in_choir": in_choir, "beat": d.beat})

# --- a fresh process per case -----------------------------------------------------

const RELAUNCH_CASES: PackedStringArray = ["meal_lines", "meal_question", "end", "nones_walking", "fulco_queued", "seated"]

func relaunch_parent() -> void:
	var root_dir: String = ProjectSettings.globalize_path(String(args["save-dir"])).path_join("relaunch")
	for case: String in RELAUNCH_CASES:
		var dir: String = root_dir.path_join(case)
		DirAccess.make_dir_recursive_absolute(dir)
		for fn: String in ["day1a_slot0.json", "day1a_slot0.json.bak", "relaunch_result.json", "expect.json"]:
			if FileAccess.file_exists(dir.path_join(fn)):
				DirAccess.remove_absolute(dir.path_join(fn))
		d._goto("road")
		m.player.seat = null
		var feet: Vector3 = cell()
		match case:
			"meal_lines":
				meal_lines()
			"meal_question":
				meal_question()
			"end":
				d._goto("end")
			"nones_walking":
				nones_walking()
				feet = Vector3(-5.0, 0.35, 10.0)
			"fulco_queued":
				m.session.clock.set_time(13.0, true)
				d._goto("free")
				d.line_queue.clear()
				d.talking_until = d.t
				d.interact("talk_fulco")
				for i: int in 300:
					if d.pending_choice == "fulco":
						break
					tick(0.1, Vector3(-7.25, 0.3, 17.4))
				d.choose("loud")
				feet = Vector3(-7.25, 0.3, 17.4)
			"seated":
				d._goto("meal")
				d._sub = {"phase": "eat", "acts": 0, "eat_t": d.beat_t}
				m.player.teleport(cell(), 0.0, "test")
				m.day1._do("sit_stool")
				feet = m.player.global_position
		var P: Dictionary = seed_proof(dir)
		var err: String = Day1aSave.new(dir).write(Day1aSave.snapshot(d, feet, 0.0, 0.0, m.player.seat))
		var expect: Dictionary = {"case": case, "state": summary(), "bells_due": d.bell_remaining().get("offsets", []).size(), "proof": P,
			"fulco_known": d.people.knows_name("fulco")}
		var ef := FileAccess.open(dir.path_join("expect.json"), FileAccess.WRITE)
		ef.store_string(JSON.stringify(expect, " ", true, true))
		ef.close()
		var out: Array = []
		var code: int = OS.execute(OS.get_executable_path(), ["--headless", "--path", ProjectSettings.globalize_path("res://"), "-s", "res://tests/day1a_scene_tests.gd", "--",
			"--phase=relaunch", "--case=" + case, "--save-dir=" + dir, "--telemetry-dir=" + dir.path_join("telemetry")], out, true)
		var res: Variant = JSON.parse_string(FileAccess.get_file_as_string(dir.path_join("relaunch_result.json"))) if FileAccess.file_exists(dir.path_join("relaunch_result.json")) else null
		var child_rows: Array = res["checks"] if res is Dictionary else []
		check("relaunch_" + case, err == "" and code == 0 and not child_rows.is_empty() and child_rows.all(func(r: Dictionary) -> bool: return r["pass"]),
			{"exit": code, "checks": child_rows, "output_tail": ("".join(out)).right(600) if code != 0 else ""})
		if m.player.seat != null:
			m.day1._do("stand")

## In the child: a fresh launch (the day just started), then F9.
func relaunch_case(case: String) -> void:
	var dir: String = String(args["save-dir"])
	var expect: Dictionary = JSON.parse_string(FileAccess.get_file_as_string(dir.path_join("expect.json")))
	var S: Dictionary = expect["state"]
	var P: Dictionary = expect["proof"]
	check("fresh_launch_starts_at_the_road", d.beat == "road", {"beat": d.beat})
	m.set_paused(false)
	key("load_game")
	m.set_paused(true)
	await process_frame
	var got: Dictionary = summary()
	var differ: Array = []
	for id: String in (S["actors"] as Dictionary).keys():
		if str(S["actors"][id]) != str(got["actors"].get(id)):
			differ.append([id, S["actors"][id], got["actors"].get(id)])
	check("loaded_state_matches_the_saved_one", got["beat"] == S["beat"] and got["choice"] == S["choice"] and got["queue"] == S["queue"] and differ.is_empty() and got["seated"] == S["seated"],
		{"beat": [S["beat"], got["beat"]], "choice": [S["choice"], got["choice"]], "queue": [S["queue"], got["queue"]], "seated": [S["seated"], got["seated"]], "actors_differ": differ.slice(0, 4)})
	match case:
		"meal_lines":
			tick(90.0, cell(), 1.0)
			check("tebaldo_finishes_and_the_meal_goes_on", d.lines_said.has("te_sorry") and (d.beat != "meal" or String(d._sub.get("phase", "")) != "tebaldo_talk"), {"beat": d.beat})
		"meal_question":
			var shown: bool = m.day1.hud.choice_box.visible and m.day1.hud.choice_list.get_child_count() == d.pending_options.size()
			m.set_paused(false)
			number(1)
			m.set_paused(true)
			check("the_question_is_on_screen_and_answered_by_key", shown and d.flags.has("meal_answer"), {"shown": shown})
		"end":
			var t0: float = d.t
			m.paused = false
			m.day1._physics_process(0.1)
			m.paused = true
			check("the_end_card_shows_and_the_day_stays_ended", m.day1._ended and m.day1.hud.end_card.visible and is_equal_approx(d.t, t0), {"ended": m.day1._ended, "card": m.day1.hud.end_card.visible})
		"nones_walking":
			var n: int = bells.size()
			var queued: int = m.day1.audio._bell_queue.size()
			var walking: int = 0
			for b: Dictionary in m.content.doc("day1a")["anonymous"]:
				if d.a(String(b["id"])).moving:
					walking += 1
			tick(70.0, Vector3(-5.0, 0.35, 10.0), 0.2)
			var seated_brothers: int = 0
			for b: Dictionary in m.content.doc("day1a")["anonymous"]:
				if d.a(String(b["id"])).activity == "choir":
					seated_brothers += 1
			check("the_brothers_keep_walking_and_reach_the_choir", walking > 0 and seated_brothers == (m.content.doc("day1a")["anonymous"] as Array).size() and bool(d._sub.get("office_begun", false)) and bells.size() == n and queued == int(expect["bells_due"]),
				{"walking_at_load": walking, "in_stalls_after_70_s": seated_brothers, "bell_signals": bells.size() - n, "strokes_queued": queued, "strokes_due": expect["bells_due"]})
		"fulco_queued":
			var early: bool = d.people.knows_name("fulco")
			for i: int in 200:
				tick(0.1, Vector3(-7.25, 0.3, 17.4))
			check("the_name_is_learned_when_heard_after_relaunch", not early and not bool(expect["fulco_known"]) and d.lines_said.has("fu_name") and d.people.knows_name("fulco"), {"known_at_load": early})
		"seated":
			var sat: bool = d.seated == "stool" and m.player.seat != null
			m.day1._do("stand")
			check("still_seated_after_relaunch_and_can_get_up", sat and m.player.seat == null and d.seated == "", {"sat": sat})
	# this process also saves (F5): the proof slot beside it is untouched
	m.set_paused(false)
	key("save_game")
	m.set_paused(true)
	check("proof_slot_untouched_across_processes", sha(String(P["main"])) == String(P["main_sha"]) and sha(String(P["bak"])) == String(P["bak_sha"]), {})
