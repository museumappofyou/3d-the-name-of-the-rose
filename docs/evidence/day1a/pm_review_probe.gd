extends SceneTree
## Independent PM probes against the actual Day-1A scene; no gameplay fixes.
## Must be launched with --save-dir and --telemetry-dir pointing to scratch.

var rows: Array = []

func _initialize() -> void:
	call_deferred("run_review")

func add_case(id: String, passed: bool, details: Dictionary) -> void:
	rows.append({"id": id, "pass": passed, "details": details})

func run_review() -> void:
	await process_frame
	var game: Node = root.get_node("Game")
	if not game.args.has("save-dir") or not game.args.has("telemetry-dir"):
		printerr("Scratch save-dir and telemetry-dir required.")
		quit(2)
		return
	var packed: PackedScene = load("res://scenes/main.tscn")
	var m: Node3D = packed.instantiate()
	root.add_child(m)
	await physics_frame
	m.set_paused(true)
	var d: Day1aDirector = m.day1.director
	var cell_pos: Vector3 = d.node("c_mid") + Vector3(0.0, 0.05, 0.0)
	m.session.saves.delete_all()
	m.day1.saves.delete_all()
	var proof: Dictionary = m.session.snapshot()
	proof["player"]["position"] = [0.5, 0.35, 12.0]
	var seed_error: String = m.session.saves.write(proof)
	var proof_path: String = ProjectSettings.globalize_path(m.session.saves.path())
	var before_hash: String = FileAccess.get_sha256(proof_path)
	m.hud.request.emit("save", null)
	var after_hash: String = FileAccess.get_sha256(proof_path)
	add_case("pause_save_uses_day1a_and_preserves_proof", seed_error == "" and before_hash == after_hash and FileAccess.file_exists(m.day1.saves.path()), {
		"seed_error": seed_error, "proof_path": proof_path,
		"proof_before_sha256": before_hash, "proof_after_sha256": after_hash,
		"day1a_created": FileAccess.file_exists(m.day1.saves.path()),
		"status": m.hud.pause_status.text})
	# Same HUD request as the Load button. The Day-1A slot contains a later
	# director time; the proof slot is deliberately still present.
	d.t = 31.0
	var snap: Dictionary = Day1aSave.snapshot(d, m.player.global_position, m.player.yaw, m.player.pitch)
	var error: String = m.day1.saves.write(snap)
	d.t = 10.0
	m.hud.request.emit("load", null)
	add_case("pause_load_restores_day1a", error == "" and is_equal_approx(d.t, 31.0), {
		"write_error": error, "expected_director_t": 31.0, "actual_director_t": d.t,
		"status": m.hud.pause_status.text})
	# The delivered tray starts a sequence whose final line permits eating.
	# Saving while those lines are queued must not drop that prerequisite.
	d._goto("meal")
	d.line_queue.clear()
	d.talking_until = d.t
	d.a("tebaldo").arrived_tag = "tray"
	d._tick_meal(0.0)
	var queued_before: int = d.line_queue.size()
	error = m.day1.saves.write(Day1aSave.snapshot(d, cell_pos, 0.0, 0.0))
	m.day1.load_save()
	var queued_after: int = d.line_queue.size()
	for i: int in 90:
		d.tick(1.0, cell_pos, 0.0, cell_pos + Vector3(0.0, 1.62, 0.0), Vector3.FORWARD, null)
	add_case("meal_dialogue_survives_load_and_progresses", error == "" and d.lines_said.has("te_sorry") and String(d._sub.get("phase", "")) != "tebaldo_talk", {
		"write_error": error, "queued_before": queued_before, "queued_after": queued_after,
		"beat_after_90_seconds": d.beat, "meal_phase": d._sub.get("phase"),
		"required_final_line_said": d.lines_said.has("te_sorry")})
	# Persist a real open meal question, then reload it through the actual
	# adapter. The same state is reachable at the ordinary meal.
	d._goto("meal")
	d._sub = {"phase": "answer", "acts": 2, "eat_t": 0.0}
	d.line_queue.clear()
	d.talking_until = d.t
	d.lines_said["w_question"] = d.t
	d._ask("meal_question", d._meal_options())
	error = m.day1.saves.write(Day1aSave.snapshot(d, cell_pos, 0.0, 0.0))
	m.day1.load_save()
	var choice_after_load: String = d.pending_choice
	var hud_visible: bool = m.day1.hud.choice_box.visible
	var hud_picked: bool = m.day1.hud.pick(0)
	for i: int in 30:
		d.tick(1.0, cell_pos, 0.0, cell_pos + Vector3(0.0, 1.62, 0.0), Vector3.FORWARD, null)
	add_case("meal_choice_survives_load_and_progresses", error == "" and choice_after_load == "meal_question" and bool(d._sub.get("answered", false)), {
		"write_error": error, "pending_choice_after_load": choice_after_load,
		"choice_ui_visible_after_load": hud_visible, "ui_pick_accepted": hud_picked,
		"beat_after_30_seconds": d.beat, "meal_phase": d._sub.get("phase"),
		"answered": d._sub.get("answered", false)})
	# Resume an earlier valid slot after the end card has been shown.
	m.day1.hud.hide_choice()
	d._goto("road")
	error = m.day1.saves.write(Day1aSave.snapshot(d, Vector3(-112.0, 0.1, 40.0), 0.0, 0.0))
	m.day1._on_end()
	m.day1.load_save()
	var at_load: float = d.t
	m.paused = false
	m.day1._physics_process(0.1)
	add_case("earlier_save_resumes_after_end", error == "" and not m.day1._ended and not m.day1.hud.end_card.visible and d.t > at_load, {
		"write_error": error, "loaded_beat": d.beat, "adapter_ended": m.day1._ended,
		"end_card_visible": m.day1.hud.end_card.visible,
		"director_t_before_tick": at_load, "director_t_after_tick": d.t})
	m.paused = true
	m.day1._ended = false
	m.day1.hud.end_card.visible = false
	d._goto("end") # real end emits the real autosave and shows its card
	# Match a fresh boot's presentation flags before loading that end save.
	m.day1._ended = false
	m.day1.hud.end_card.visible = false
	d._goto("road")
	m.day1.load_save()
	add_case("end_autosave_restores_end_card", d.beat == "end" and m.day1._ended and m.day1.hud.end_card.visible, {
		"loaded_beat": d.beat, "adapter_ended": m.day1._ended,
		"end_card_visible": m.day1.hud.end_card.visible})
	# Nones is already physical at the bell; loading must not relocate its
	# anonymous brothers to their destination stalls.
	d._goto("free")
	d._goto("nones")
	var brother: Actor = d.a("brother:01")
	var before: Vector3 = brother.pos
	var before_activity: String = brother.activity
	error = m.day1.saves.write(Day1aSave.snapshot(d, Vector3(-5.0, 0.35, 10.0), 0.0, 0.0))
	m.day1.load_save()
	var shift_m: float = Vector2(brother.pos.x - before.x, brother.pos.z - before.z).length()
	add_case("nones_community_keeps_physical_state", error == "" and shift_m < 0.01 and brother.activity == before_activity, {
		"write_error": error, "actor": brother.id, "horizontal_shift_m": shift_m,
		"before_position": [before.x, null if is_nan(before.y) else before.y, before.z],
		"after_position": [brother.pos.x, brother.pos.y, brother.pos.z],
		"before_activity": before_activity, "after_activity": brother.activity})
	# Exercise the real novice conversation. Choosing an answer queues his
	# eventual introduction; interrupting before it plays must not teach it.
	var fresh_session := GameSession.new(m.content, String(game.args["save-dir"]).path_join("names"), 13.0, 7)
	var fresh := Day1aDirector.new(m.content.doc("day1a"), fresh_session)
	fresh.start()
	fresh._goto("free")
	fresh.line_queue.clear()
	fresh.talking_until = fresh.t
	fresh.interact("talk_fulco")
	for i: int in 300:
		if fresh.pending_choice == "fulco":
			break
		fresh.tick(0.1, Vector3(-7.25, 0.3, 17.4), 0.0, Vector3(-7.25, 1.92, 17.4), Vector3.FORWARD, null)
	var choice_reached: bool = fresh.pending_choice == "fulco"
	fresh.choose("loud")
	var known_before_introduction: bool = fresh.people.knows_name("fulco")
	var introduction_played: bool = fresh.lines_said.has("fu_name")
	fresh._interrupt()
	add_case("queued_unheard_name_does_not_teach_identity", choice_reached and not known_before_introduction and not fresh.people.knows_name("fulco"), {
		"real_conversation_choice_reached": choice_reached,
		"introduction_line_played": introduction_played,
		"name_known_immediately_after_choice": known_before_introduction,
		"name_known_after_interrupting_queued_introduction": fresh.people.knows_name("fulco")})
	var report: Dictionary = {"kind": "independent_pm_scene_probes", "engine": Engine.get_version_info()["string"],
		"reviewed_commit": "e223bc2eb588228dd9f00c0fdb7319d731a9ec32", "checks": rows,
		"save_isolation": String(game.args["save-dir"])}
	var output: String = String(game.args.get("out", ""))
	if output != "":
		DirAccess.make_dir_recursive_absolute(output)
		var file := FileAccess.open(output.path_join("pm_scene_probes.json"), FileAccess.WRITE)
		file.store_string(JSON.stringify(report, "  "))
		file.close()
	print(JSON.stringify(report, "  "))
	var failed: int = rows.filter(func(row: Dictionary) -> bool: return not row["pass"]).size()
	m.queue_free()
	await process_frame
	quit(1 if failed else 0)
