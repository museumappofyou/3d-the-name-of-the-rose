class_name GameSession
extends RefCounted
## Composition of the phase-1 domain services. Scene adapters feed it real
## physical facts (feet position each physics step, interaction requests,
## teleports) and present what it reports. Headless tests drive the same
## object without any scene.

signal toast(text: String, ms: int)
signal noted(id: String, title: String)
signal room_changed(old_id: String, new_id: String)
signal teleported(reason: String)

var content: ContentData
var horarium: Horarium
var clock: GameClock
var knowledge: KnowledgeState
var portals: PortalStates
var tracker: PassageTracker
var rooms: RoomClassifier
var routines: Routines
var church_path: ChurchPath
var office: OfficeTransport
var saves: SaveService

var session_time: float = 0.0
var feet: Vector3 = Vector3.ZERO
var yaw: float = 0.0
var pitch: float = 0.0
var room_id: String = ""
var fixture_exit_permit: bool = false
var last_load_report: Dictionary = {}

func _init(c: ContentData, save_dir: String = "user://saves", start_hours: float = 15.0, seed_value: int = 1) -> void:
	content = c
	horarium = Horarium.new(c.doc("horarium"))
	clock = GameClock.new(horarium, start_hours)
	knowledge = KnowledgeState.new(c.discovery_ids())
	portals = PortalStates.new(c.doc("portals"))
	tracker = PassageTracker.new(c.doc("discoveries"), c.doc("anchors"))
	rooms = RoomClassifier.new(c.doc("locations"))
	routines = Routines.new(c.doc("routines"))
	church_path = ChurchPath.new(c.doc("anchors"), c.doc("sounds"))
	office = OfficeTransport.new(c.doc("sounds"), seed_value)
	saves = SaveService.new(save_dir)
	knowledge.noted.connect(func(id: String, _n: Dictionary) -> void: noted.emit(id, String(c.discovery(id).get("title", id))))

func ctx() -> RuleContext:
	var r := RuleContext.new()
	r.knowledge = knowledge
	r.horarium = horarium
	r.portals = portals
	r.derived = content.derived_rules()
	r.hours = clock.hours
	return r

func knows_derived(rule: String) -> bool:
	return Conditions.eval({"known_derived": rule}, ctx())

## One physical step with the walker's real feet position.
func step(dt: float, feet_pos: Vector3, on_foot: bool = true) -> Array[String]:
	session_time += dt
	clock.advance(dt)
	portals.update(dt)
	feet = feet_pos
	var r: Dictionary = rooms.classify_feet(feet_pos)
	var rid: String = r.get("id", "")
	if rid != room_id:
		var old: String = room_id
		room_id = rid
		room_changed.emit(old, rid)
	if not on_foot:
		return []
	return tracker.update(session_time, feet_pos, room_id, portals.target("church:altar"), knowledge)

## Any non-walking placement (study jump, debug teleport, load).
func teleport(to_feet: Vector3, to_yaw: float, reason: String) -> void:
	tracker.invalidate(session_time)
	feet = to_feet
	yaw = to_yaw
	var rid: String = rooms.classify_feet(to_feet).get("id", "")
	fixture_exit_permit = false
	if rid != room_id:
		# residency and lighting must follow placements too (the destination
		# cell — and its collision — is loaded before the next physics step)
		var old: String = room_id
		room_id = rid
		room_changed.emit(old, rid)
	teleported.emit(reason)

func interaction_label(id: String) -> String:
	return InteractionRules.label(content.interaction(id), ctx())

func interact(id: String) -> Dictionary:
	var def: Dictionary = content.interaction(id)
	if def.is_empty():
		return {}
	if def.get("requires_present", false) and not routines.available(def["entity_id"], ctx()):
		return {}
	var res: Dictionary = InteractionRules.act(def, ctx(), clock.day)
	if res.get("toast", "") != "":
		toast.emit(res["toast"], int(res["ms"]))
	return res

func available(entity_id: String) -> bool:
	return routines.available(entity_id, ctx())

func snapshot() -> Dictionary:
	return {
		"format": SaveService.FORMAT,
		"schema_version": SaveService.SCHEMA_VERSION,
		"content_revision": content.revision,
		"saved_at_unix": int(Time.get_unix_time_from_system()),
		"player": {"position": [feet.x, feet.y, feet.z], "yaw": yaw, "pitch": pitch, "room": room_id},
		"clock": {"day": clock.day, "hours": clock.hours},
		"portals": portals.to_dict(),
		"knowledge": knowledge.to_dict(),
	}

func save_now() -> String:
	return saves.write(snapshot())

## Restores a validated snapshot. Earned knowledge is kept exactly; loading
## next to the altar never fabricates a traversal (the tracker is reset).
func apply_snapshot(s: Dictionary) -> PackedStringArray:
	var warnings: PackedStringArray = []
	warnings.append_array(knowledge.restore(s.get("knowledge", {})))
	warnings.append_array(portals.restore(s.get("portals", {})))
	var c: Dictionary = s.get("clock", {})
	clock.day = maxi(1, int(c.get("day", 1)))
	clock.set_time(float(c.get("hours", clock.hours)), true)
	var p: Dictionary = s.get("player", {})
	var pos: Array = p.get("position", [feet.x, feet.y, feet.z])
	pitch = float(p.get("pitch", 0.0))
	teleport(Vector3(float(pos[0]), float(pos[1]), float(pos[2])), float(p.get("yaw", 0.0)), "load")
	return warnings

func load_now() -> Dictionary:
	var portal_ids: PackedStringArray = []
	for k: String in portals.state.keys():
		portal_ids.append(k)
	var r: Dictionary = saves.read(content.discovery_ids(), portal_ids)
	if r["snapshot"] != null:
		r["warnings"] = apply_snapshot(r["snapshot"])
	last_load_report = r
	return r
