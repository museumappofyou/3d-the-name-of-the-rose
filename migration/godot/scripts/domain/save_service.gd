class_name SaveService
extends RefCounted
## Versioned native save (phase-1 schema 1): player transform and room,
## clock, the skull-altar portal and knowledge. These are deliberate
## additions beyond the browser notebook (which saved only knowledge).
## Never contains node paths, pooled presentation rigs, GPU or audio state.
##
## File layout: line 1 is a small JSON header {format, schema_version,
## checksum, body_bytes}; the rest is the JSON body exactly as written. The
## checksum is SHA-256 of those body bytes, so verification never depends on
## float re-serialisation. Writes are atomic: the file goes to `<file>.tmp`,
## is read back and verified, the previous file becomes `<file>.bak`, and the
## temporary file replaces the main one. Loading falls back to the backup,
## then to a fresh state, and always reports what happened.

const FORMAT := "abbey-slice-save"
const SCHEMA_VERSION := 1
## Generous world bounds for a sane player position (slice + door fixture).
const BOUNDS := AABB(Vector3(-60, -10, -60), Vector3(300, 70, 300))

var dir: String
var file_name: String

func _init(save_dir: String = "user://saves", name: String = "slot0.json") -> void:
	dir = save_dir
	file_name = name

func path() -> String:
	return dir.path_join(file_name)

## Validate a parsed snapshot. Returns [] when valid, otherwise the reasons.
static func validate(d: Variant, known_notes: PackedStringArray, known_portals: PackedStringArray) -> PackedStringArray:
	var e: PackedStringArray = []
	if not (d is Dictionary):
		return PackedStringArray(["not an object"])
	var s: Dictionary = d
	if s.get("format") != FORMAT:
		e.append("format")
	if not (s.get("schema_version") is float or s.get("schema_version") is int) or int(s["schema_version"]) != SCHEMA_VERSION:
		e.append("schema_version")
	var p: Variant = s.get("player")
	if not (p is Dictionary) or not ((p as Dictionary).get("position") is Array) or (p["position"] as Array).size() != 3:
		e.append("player.position")
	else:
		var v := Vector3(float(p["position"][0]), float(p["position"][1]), float(p["position"][2]))
		if not v.is_finite() or not BOUNDS.has_point(v):
			e.append("player.position out of bounds")
		for k: String in ["yaw", "pitch"]:
			if not ((p as Dictionary).get(k) is float or (p as Dictionary).get(k) is int):
				e.append("player." + k)
	var c: Variant = s.get("clock")
	if not (c is Dictionary) or not ((c as Dictionary).get("hours") is float or (c as Dictionary).get("hours") is int) or float(c["hours"]) < 0.0 or float(c["hours"]) >= 24.0 or int((c as Dictionary).get("day", 0)) < 1:
		e.append("clock")
	var k: Variant = s.get("knowledge")
	if not (k is Dictionary) or not ((k as Dictionary).get("notes") is Dictionary):
		e.append("knowledge")
	else:
		for id: Variant in (k["notes"] as Dictionary).keys():
			if not known_notes.has(str(id)):
				e.append("knowledge.notes unknown id " + str(id))
	var po: Variant = s.get("portals")
	if not (po is Dictionary):
		e.append("portals")
	else:
		for id: Variant in (po as Dictionary).keys():
			if not known_portals.has(str(id)):
				e.append("portals unknown id " + str(id))
	return e

## Serialise a snapshot to the on-disk text (header line + body).
static func encode(snapshot: Dictionary) -> String:
	var body: String = JSON.stringify(snapshot, "\t", true, true)
	var header: Dictionary = {"format": FORMAT, "schema_version": SCHEMA_VERSION, "checksum": body.sha256_text(), "body_bytes": body.to_utf8_buffer().size()}
	return JSON.stringify(header) + "\n" + body

## Verify and parse on-disk text. Returns {"body": Variant, "errors": []}.
static func decode(text: String) -> Dictionary:
	var nl: int = text.find("\n")
	if nl < 0:
		return {"body": null, "errors": PackedStringArray(["no header"])}
	var header: Variant = JSON.parse_string(text.substr(0, nl))
	var body_text: String = text.substr(nl + 1)
	if not (header is Dictionary) or header.get("format") != FORMAT:
		return {"body": null, "errors": PackedStringArray(["header"])}
	if int(header.get("schema_version", 0)) != SCHEMA_VERSION:
		return {"body": null, "errors": PackedStringArray(["unsupported schema %s" % str(header.get("schema_version"))])}
	if body_text.to_utf8_buffer().size() != int(header.get("body_bytes", -1)):
		return {"body": null, "errors": PackedStringArray(["truncated"])}
	if body_text.sha256_text() != header.get("checksum"):
		return {"body": null, "errors": PackedStringArray(["checksum"])}
	return {"body": JSON.parse_string(body_text), "errors": PackedStringArray()}

## Atomic replace with backup. Returns "" on success or an error string.
func write(snapshot: Dictionary) -> String:
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(dir))
	var text: String = encode(snapshot)
	var main: String = ProjectSettings.globalize_path(path())
	var tmp: String = main + ".tmp"
	var bak: String = main + ".bak"
	var f := FileAccess.open(tmp, FileAccess.WRITE)
	if f == null:
		return "open tmp failed: %s" % error_string(FileAccess.get_open_error())
	f.store_string(text)
	f.flush()
	f.close()
	if FileAccess.get_file_as_string(tmp) != text:
		return "tmp read-back mismatch"
	if FileAccess.file_exists(main):
		if FileAccess.file_exists(bak):
			DirAccess.remove_absolute(bak)
		var err: Error = DirAccess.rename_absolute(main, bak)
		if err != OK:
			return "backup rename failed: %s" % error_string(err)
	var err2: Error = DirAccess.rename_absolute(tmp, main)
	if err2 != OK:
		# put the previous save back so a failed write never loses it
		if FileAccess.file_exists(bak):
			DirAccess.rename_absolute(bak, main)
		return "replace failed: %s" % error_string(err2)
	return ""

## Load with recovery. Returns {"snapshot": Dictionary or null,
## "source": "main"|"backup"|"none", "report": PackedStringArray}.
func read(known_notes: PackedStringArray, known_portals: PackedStringArray) -> Dictionary:
	var report: PackedStringArray = []
	for which: String in ["main", "backup"]:
		var p: String = ProjectSettings.globalize_path(path()) + ("" if which == "main" else ".bak")
		if not FileAccess.file_exists(p):
			report.append("%s: absent" % which)
			continue
		var dec: Dictionary = decode(FileAccess.get_file_as_string(p))
		var errs: PackedStringArray = dec["errors"]
		if errs.is_empty():
			errs = validate(dec["body"], known_notes, known_portals)
		if errs.is_empty():
			return {"snapshot": dec["body"], "source": which, "report": report}
		report.append("%s: invalid (%s)" % [which, ", ".join(errs)])
	return {"snapshot": null, "source": "none", "report": report}

func delete_all() -> void:
	var main: String = ProjectSettings.globalize_path(path())
	for p: String in [main, main + ".bak", main + ".tmp"]:
		if FileAccess.file_exists(p):
			DirAccess.remove_absolute(p)
