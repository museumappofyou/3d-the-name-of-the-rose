class_name DoorFixture
extends Node3D
## NONCANONICAL test fixture (not part of the reconstruction): a 4.8 × 4.8 m
## room at fixture.origin with one door in its north wall, barred from
## within by the browser's Aedificium curfew rule (main.js updateCurfew +
## worldState.js aedificiumExitPermit). One portal record ("fixture:door")
## drives the physical bar, the navigation link and acoustic transmission
## together. It never awards `barred` (that observation belongs to the real
## Aedificium doors).

var session: GameSession
var content: ContentData
var player: PlayerController
var door: Dictionary
var bar_body: StaticBody3D
var bar_shape: CollisionShape3D
var bar_mesh: MeshInstance3D
var nav_region: NavigationRegion3D
var nav_link: NavigationLink3D
var actor: CharacterBody3D
var agent: NavigationAgent3D
var shut: float = 0.0
var exit_permit: bool = false
var actor_permit: bool = false
var transmission: float = 1.0
var state_log: Array = []
var _told: float = -100.0

func setup(s: GameSession, c: ContentData, p: PlayerController) -> void:
	session = s
	content = c
	player = p
	var o: Vector3 = c.anchor_pos("fixture.origin")
	door = c.anchor("fixture.door")
	var stone := StandardMaterial3D.new()
	stone.albedo_color = Color("8f877a")
	stone.roughness = 0.9
	_box(o + Vector3(0, -0.25, 3.0), Vector3(20, 0.5, 20), stone, true)          # ground slab
	var x0: float = o.x - 2.4
	var x1: float = o.x + 2.4
	var zn: float = float(door["z"])
	var zs: float = zn + 4.8
	var t: float = float(door["th"])
	var w: float = float(door["w"])
	_box(Vector3((x0 + o.x - w / 2.0) / 2.0, 1.6, zn), Vector3(o.x - w / 2.0 - x0 + t, 3.2, t), stone, true)
	_box(Vector3((x1 + o.x + w / 2.0) / 2.0, 1.6, zn), Vector3(x1 - o.x - w / 2.0 + t, 3.2, t), stone, true)
	_box(Vector3(o.x, 2.9, zn), Vector3(w, 0.6, t), stone, true)                   # lintel
	_box(Vector3(o.x, 1.6, zs), Vector3(4.8 + t, 3.2, t), stone, true)
	_box(Vector3(x0, 1.6, (zn + zs) / 2.0), Vector3(t, 3.2, 4.8), stone, true)
	_box(Vector3(x1, 1.6, (zn + zs) / 2.0), Vector3(t, 3.2, 4.8), stone, true)
	var wood := StandardMaterial3D.new()
	wood.albedo_color = Color("6a4f37")
	# the bar (main.js setupCurfew: box (w+0.5) × 4.2 × 0.3, just inside the door)
	var bar_pos := Vector3(float(door["x"]) - float(door["nx"]) * (t / 2.0 - 0.2), 1.2, zn - float(door["nz"]) * (t / 2.0 - 0.2))
	bar_body = StaticBody3D.new()
	bar_body.name = "fixture_bar"
	bar_body.collision_layer = 2
	bar_shape = CollisionShape3D.new()
	var bs := BoxShape3D.new()
	bs.size = Vector3(w + 0.5, 2.4, 0.3)
	bar_shape.shape = bs
	bar_body.add_child(bar_shape)
	bar_body.position = bar_pos
	add_child(bar_body)
	bar_mesh = MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(w + 0.3, 0.18, 0.16)
	bar_mesh.mesh = bm
	bar_mesh.material_override = wood
	bar_mesh.position = bar_pos + Vector3(0, -0.1, 0)
	add_child(bar_mesh)
	var lbl := Label3D.new()
	lbl.text = "NONCANONICAL TEST FIXTURE\ndoor / curfew / egress rule"
	lbl.font_size = 48
	lbl.pixel_size = 0.004
	lbl.position = Vector3(o.x, 3.6, zn - 0.4)
	lbl.rotation.y = PI   # on the outer face: readable from the outside approach
	lbl.modulate = Color(0.95, 0.85, 0.6)
	add_child(lbl)
	var lamp := OmniLight3D.new()
	lamp.position = o + Vector3(0, 2.6, 3.0)
	lamp.omni_range = 9.0
	lamp.light_energy = 1.2
	add_child(lamp)
	_navigation(o, zn, zs, x0, x1)

func _box(center: Vector3, size: Vector3, mat: Material, solid: bool) -> void:
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	mi.mesh = bm
	mi.material_override = mat
	mi.position = center
	add_child(mi)
	if solid:
		var sb := StaticBody3D.new()
		sb.collision_layer = 1
		sb.set_meta("surface", "stone")
		var cs := CollisionShape3D.new()
		var sh := BoxShape3D.new()
		sh.size = size
		cs.shape = sh
		sb.add_child(cs)
		sb.position = center
		add_child(sb)

## Separate inside/outside polygons joined only by a NavigationLink3D in the
## doorway; the access rule enables the link exactly when the bar is off.
func _navigation(o: Vector3, zn: float, zs: float, x0: float, x1: float) -> void:
	var nm := NavigationMesh.new()
	var y: float = 0.0
	var outside := PackedVector3Array([Vector3(o.x - 8, y, o.z - 6.5), Vector3(o.x + 8, y, o.z - 6.5), Vector3(o.x + 8, y, zn - 0.6), Vector3(o.x - 8, y, zn - 0.6)])
	var inside := PackedVector3Array([Vector3(x0 + 0.5, y, zn + 0.6), Vector3(x1 - 0.5, y, zn + 0.6), Vector3(x1 - 0.5, y, zs - 0.5), Vector3(x0 + 0.5, y, zs - 0.5)])
	var verts := PackedVector3Array()
	verts.append_array(outside)
	verts.append_array(inside)
	nm.vertices = verts
	nm.add_polygon(PackedInt32Array([3, 2, 1, 0]))
	nm.add_polygon(PackedInt32Array([7, 6, 5, 4]))
	nav_region = NavigationRegion3D.new()
	nav_region.navigation_mesh = nm
	add_child(nav_region)
	nav_link = NavigationLink3D.new()
	nav_link.start_position = Vector3(float(door["x"]), y, zn - 0.6)
	nav_link.end_position = Vector3(float(door["x"]), y, zn + 0.6)
	nav_link.bidirectional = true
	add_child(nav_link)
	# benchmark actor (synthetic id bench:fixture-actor, not a story person)
	actor = CharacterBody3D.new()
	actor.name = "bench_fixture_actor"
	actor.collision_layer = 0
	actor.collision_mask = 1 | 2
	var cs := CollisionShape3D.new()
	var cap := CapsuleShape3D.new()
	cap.radius = 0.28
	cap.height = 1.6
	cs.shape = cap
	cs.position.y = 0.8
	actor.add_child(cs)
	var mi := MeshInstance3D.new()
	var cm := CapsuleMesh.new()
	cm.radius = 0.28
	cm.height = 1.6
	mi.mesh = cm
	mi.position.y = 0.8
	actor.add_child(mi)
	agent = NavigationAgent3D.new()
	agent.path_desired_distance = 0.4
	agent.target_desired_distance = 0.4
	actor.add_child(agent)
	actor.position = Vector3(o.x + 1.5, 0.0, o.z - 4.0)
	add_child(actor)

func player_inside() -> bool:
	return session.room_id == "fixture-inside"

func _physics_process(dt: float) -> void:
	if session == null:
		return
	var curfew: bool = session.horarium.curfew_barred(String(content.portal("fixture:door").get("curfew_rule", "aedificium-barred")), session.clock.hours)
	var d: Dictionary = {"x": float(door["x"]), "z": float(door["z"]), "nx": float(door["nx"]), "nz": float(door["nz"]), "th": float(door["th"])}
	var feet: Vector3 = player.feet()
	exit_permit = AccessRules.exit_permit(feet, player_inside(), [d], exit_permit)
	var blocked: bool = AccessRules.barred(curfew, exit_permit)
	shut += ((1.0 if blocked else 0.0) - shut) * minf(1.0, dt * 1.5)
	if bar_shape.disabled == blocked:
		bar_shape.set_deferred("disabled", not blocked)
	bar_mesh.visible = shut > 0.05
	# the actor holds its own exit permit; the link is the only nav route
	var a_inside: bool = session.rooms.classify_feet(actor.global_position).get("id", "") == "fixture-inside"
	actor_permit = AccessRules.exit_permit(actor.global_position, a_inside, [d], actor_permit)
	nav_link.enabled = not AccessRules.barred(curfew, actor_permit)
	transmission = 1.0 - shut
	session.portals.state["fixture:door"]["open"] = transmission
	session.portals.state["fixture:door"]["blocked"] = blocked
	if blocked and Vector2(feet.x - d["x"], feet.z - d["z"]).length() < 3.2 and session.session_time - _told > 20.0:
		_told = session.session_time
		session.toast.emit("Test fixture: the door is barred from within (curfew rule). Nothing is noted.", 4000)
	if not agent.is_navigation_finished():
		var nxt: Vector3 = agent.get_next_path_position()
		var v: Vector3 = (nxt - actor.global_position)
		v.y = 0
		actor.velocity = v.normalized() * 1.4 if v.length() > 0.05 else Vector3.ZERO
		actor.move_and_slide()
	if Engine.get_physics_frames() % 30 == 0:
		state_log.append({"t": session.session_time, "hours": session.clock.hours, "curfew": curfew, "player_inside": player_inside(), "exit_permit": exit_permit, "bar_solid": blocked, "nav_link": nav_link.enabled, "transmission": transmission, "actor": [actor.global_position.x, actor.global_position.z], "actor_inside": a_inside})

func send_actor(inside: bool) -> void:
	var o: Vector3 = content.anchor_pos("fixture.origin")
	agent.target_position = Vector3(o.x, 0.0, o.z + 3.4) if inside else Vector3(o.x - 1.5, 0.0, o.z - 4.0)
