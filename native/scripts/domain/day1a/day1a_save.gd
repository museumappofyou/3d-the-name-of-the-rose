class_name Day1aSave
extends RefCounted
## Versioned Day-1A scenario save (format "abbey-day1a-save", schema 1),
## a separate file from the phase-1 proof save so neither can overwrite the
## other. Same atomic write / checksum / backup policy as SaveService. A
## proof save (or anything else) offered here is rejected with a clear
## report and left untouched. Stores ids and data only: beat, clock, the
## player's transform and carry, named actors' positions and routes,
## portals, props, people memory, observations, telemetry so far.

const FORMAT := "abbey-day1a-save"
const SCHEMA_VERSION := 1
const SCENARIO := "day1a"
const SCENARIO_VERSION := 1
const BOUNDS := AABB(Vector3(-200, -20, -200), Vector3(450, 120, 450))

var dir: String
var file_name: String

func _init(save_dir: String = "user://saves", name: String = "day1a_slot0.json") -> void:
	dir = save_dir
	file_name = name

func path() -> String:
	return dir.path_join(file_name)

static func snapshot(d: Day1aDirector, feet: Vector3, yaw: float, pitch: float) -> Dictionary:
	return {
		"format": FORMAT, "schema_version": SCHEMA_VERSION, "scenario": SCENARIO, "scenario_version": SCENARIO_VERSION,
		"saved_at_unix": int(Time.get_unix_time_from_system()), "content_revision": d.session.content.revision,
		"player": {"position": [feet.x, feet.y, feet.z], "yaw": yaw, "pitch": pitch},
		"clock": {"day": d.session.clock.day, "hours": d.session.clock.hours, "rate": d.session.clock.rate},
		"director": d.to_dict(),
	}

static func validate(s: Variant) -> PackedStringArray:
	var e: PackedStringArray = []
	if not (s is Dictionary):
		return PackedStringArray(["not an object"])
	var d: Dictionary = s
	if d.get("format") == SaveService.FORMAT:
		return PackedStringArray(["a phase-1 proof save, not a Day-1A save (left untouched)"])
	if d.get("format") != FORMAT:
		e.append("format")
	if int(d.get("schema_version", 0)) != SCHEMA_VERSION:
		e.append("schema_version")
	if d.get("scenario") != SCENARIO or int(d.get("scenario_version", 0)) != SCENARIO_VERSION:
		e.append("scenario/version")
	var p: Variant = d.get("player")
	if not (p is Dictionary) or not ((p as Dictionary).get("position") is Array) or (p["position"] as Array).size() != 3:
		e.append("player.position")
	else:
		var v := Vector3(float(p["position"][0]), float(p["position"][1]), float(p["position"][2]))
		if not v.is_finite() or not BOUNDS.has_point(v):
			e.append("player.position out of bounds")
	var c: Variant = d.get("clock")
	if not (c is Dictionary) or float((c as Dictionary).get("hours", -1.0)) < 0.0 or float(c["hours"]) >= 24.0:
		e.append("clock")
	var dd: Variant = d.get("director")
	if not (dd is Dictionary) or not Day1aDirector.BEATS.has(String((dd as Dictionary).get("beat", ""))):
		e.append("director.beat")
	return e

func write(snap: Dictionary) -> String:
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(dir))
	var body: String = JSON.stringify(snap, "\t", true, true)
	var header: Dictionary = {"format": FORMAT, "schema_version": SCHEMA_VERSION, "checksum": body.sha256_text(), "body_bytes": body.to_utf8_buffer().size()}
	var text: String = JSON.stringify(header) + "\n" + body
	var main: String = ProjectSettings.globalize_path(path())
	var tmp: String = main + ".tmp"
	var bak: String = main + ".bak"
	if FileAccess.file_exists(main):
		var existing: Dictionary = SaveService.decode(FileAccess.get_file_as_string(main))
		var hdr: Variant = JSON.parse_string(FileAccess.get_file_as_string(main).get_slice("\n", 0))
		if hdr is Dictionary and (hdr as Dictionary).get("format") == SaveService.FORMAT:
			return "refusing to overwrite a phase-1 proof save at " + main
		existing.clear()
	var f := FileAccess.open(tmp, FileAccess.WRITE)
	if f == null:
		return "open tmp failed: %s" % error_string(FileAccess.get_open_error())
	f.store_string(text)
	f.close()
	if FileAccess.get_file_as_string(tmp) != text:
		return "tmp read-back mismatch"
	if FileAccess.file_exists(main):
		if FileAccess.file_exists(bak):
			DirAccess.remove_absolute(bak)
		DirAccess.rename_absolute(main, bak)
	var err: Error = DirAccess.rename_absolute(tmp, main)
	if err != OK:
		if FileAccess.file_exists(bak):
			DirAccess.rename_absolute(bak, main)
		return "replace failed: %s" % error_string(err)
	return ""

func read() -> Dictionary:
	var report: PackedStringArray = []
	for which: String in ["main", "backup"]:
		var p: String = ProjectSettings.globalize_path(path()) + ("" if which == "main" else ".bak")
		if not FileAccess.file_exists(p):
			report.append("%s: absent" % which)
			continue
		var text: String = FileAccess.get_file_as_string(p)
		var hdr: Variant = JSON.parse_string(text.get_slice("\n", 0))
		if hdr is Dictionary and (hdr as Dictionary).get("format") == SaveService.FORMAT:
			report.append("%s: a phase-1 proof save, not a Day-1A save (left untouched)" % which)
			continue
		var nl: int = text.find("\n")
		if nl < 0:
			report.append("%s: no header" % which)
			continue
		var body_text: String = text.substr(nl + 1)
		var errs: PackedStringArray = []
		if not (hdr is Dictionary) or hdr.get("format") != FORMAT:
			errs.append("header")
		elif body_text.to_utf8_buffer().size() != int(hdr.get("body_bytes", -1)):
			errs.append("truncated")
		elif body_text.sha256_text() != hdr.get("checksum"):
			errs.append("checksum")
		var body: Variant = JSON.parse_string(body_text) if errs.is_empty() else null
		if errs.is_empty():
			errs = validate(body)
		if errs.is_empty():
			return {"snapshot": body, "source": which, "report": report}
		report.append("%s: invalid (%s)" % [which, ", ".join(errs)])
	return {"snapshot": null, "source": "none", "report": report}

func delete_all() -> void:
	var main: String = ProjectSettings.globalize_path(path())
	for p: String in [main, main + ".bak", main + ".tmp"]:
		if FileAccess.file_exists(p):
			DirAccess.remove_absolute(p)
