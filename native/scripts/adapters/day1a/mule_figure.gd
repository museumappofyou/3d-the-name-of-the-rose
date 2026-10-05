class_name MuleFigure
extends Node3D
## A guest's mule (the browser's mule: Quaternius CC0 donkey fitted to
## 1.62 m, COATS.mule). Follows its logical Actor (a breadcrumb trail of its
## leader, in the domain); plays Walk at a rate matched to its ground speed,
## otherwise Idle / Idle_2 / Eating; a sagging lead rope runs from the
## halter to the leader's hand.

var actor: Actor
var model: Node3D
var ap: AnimationPlayer
var rope: MeshInstance3D
var rope_mesh: ImmediateMesh
var leader_hand: Callable           # -> Vector3 or null
var _y: float = NAN
var _yaw: float = 0.0
var _speed: float = 0.0
var _last: Vector3 = Vector3.INF
var _idle_t: float = 0.0
var _head_bone: int = -1
var _sk: Skeleton3D
var scale_k: float = 0.41
var walk_natural: float = 1.1

func setup(a: Actor, coat: Dictionary, k: float) -> void:
	actor = a
	scale_k = k
	name = "mule_" + a.id
	model = (load("res://assets/animals/mule/mule.glb") as PackedScene).instantiate()
	add_child(model)
	model.scale = Vector3.ONE * k
	ap = model.find_children("*", "AnimationPlayer", true, false)[0]
	for n: String in ap.get_animation_list():
		ap.get_animation(n).loop_mode = Animation.LOOP_LINEAR
	_sk = model.find_children("*", "Skeleton3D", true, false)[0]
	for i: int in _sk.get_bone_count():
		if _sk.get_bone_name(i).to_lower().contains("head"):
			_head_bone = i
			break
	for mi: Node in model.find_children("*", "MeshInstance3D", true, false):
		var m3 := mi as MeshInstance3D
		for si: int in m3.mesh.get_surface_count():
			var src: Material = m3.get_active_material(si)
			if src is StandardMaterial3D:
				var mm: StandardMaterial3D = (src as StandardMaterial3D).duplicate()
				var hex: String = String(coat.get(String(src.resource_name), ""))
				if hex != "":
					mm.albedo_color = Color("#" + hex)
				mm.roughness = 0.88
				m3.set_surface_override_material(si, mm)
	ap.play("Idle")
	rope_mesh = ImmediateMesh.new()
	rope = MeshInstance3D.new()
	rope.mesh = rope_mesh
	var rm := StandardMaterial3D.new()
	rm.albedo_color = Color(0.36, 0.30, 0.22)
	rm.roughness = 0.95
	rope.material_override = rm
	rope.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	rope.top_level = true
	add_child(rope)
	_yaw = a.yaw

func halter() -> Vector3:
	if _head_bone >= 0:
		return _sk.global_transform * _sk.get_bone_global_pose(_head_bone).origin + Vector3(0, -0.12, 0)
	return global_position + global_transform.basis * Vector3(0, 1.25, 0.8)

func _process(dt: float) -> void:
	visible = actor.present
	if not visible:
		_last = Vector3.INF
		return
	var p: Vector3 = actor.pos
	if _last != Vector3.INF and dt > 0.0:
		_speed = lerpf(_speed, Vector2(p.x - _last.x, p.z - _last.z).length() / dt, 1.0 - exp(-8.0 * dt))
	_last = p
	var gy: Variant = _ground(p)
	if gy != null:
		_y = gy if is_nan(_y) else lerpf(_y, gy, 1.0 - exp(-12.0 * dt))
	elif is_nan(_y):
		_y = 0.0
	_yaw = rotate_toward(_yaw, actor.yaw, 2.4 * dt)
	position = Vector3(p.x, _y, p.z)
	rotation.y = _yaw
	if _speed > 0.15:
		if ap.current_animation != "Walk":
			ap.play("Walk", 0.3)
		ap.speed_scale = clampf(_speed / walk_natural, 0.5, 2.0)
		_idle_t = 0.0
	else:
		ap.speed_scale = 1.0
		_idle_t += dt
		if ap.current_animation == "Walk":
			ap.play("Idle", 0.4)
		elif _idle_t > 9.0:
			_idle_t = 0.0
			ap.play(["Idle_2", "Idle", "Idle_Headlow"][int(Time.get_ticks_msec() / 1000) % 3], 0.5)
	_rope()

func _rope() -> void:
	rope_mesh.clear_surfaces()
	if not leader_hand.is_valid():
		return
	var h: Variant = leader_hand.call()
	if h == null:
		return
	var a: Vector3 = h
	var b: Vector3 = halter()
	var L: float = a.distance_to(b)
	if L > 4.5 or L < 0.05:
		return
	var sag: float = clampf(2.2 - L, 0.05, 0.55) * 0.5
	rope_mesh.surface_begin(Mesh.PRIMITIVE_TRIANGLE_STRIP)
	var cam: Camera3D = get_viewport().get_camera_3d()
	var N := 14
	for i: int in N + 1:
		var t: float = float(i) / N
		var q: Vector3 = a.lerp(b, t) + Vector3(0, -sag * 4.0 * t * (1.0 - t), 0)
		var side: Vector3 = (b - a).cross((cam.global_position - q) if cam else Vector3.UP).normalized() * 0.008
		rope_mesh.surface_add_vertex(q - side)
		rope_mesh.surface_add_vertex(q + side)
	rope_mesh.surface_end()

func _ground(p: Vector3) -> Variant:
	var space: PhysicsDirectSpaceState3D = get_world_3d().direct_space_state
	var hint: float = p.y if not is_nan(p.y) else (_y if not is_nan(_y) else 0.0)
	var q := PhysicsRayQueryParameters3D.create(Vector3(p.x, hint + 1.3, p.z), Vector3(p.x, hint - 2.6, p.z), 1)
	var hit: Dictionary = space.intersect_ray(q)
	return null if hit.is_empty() else float((hit["position"] as Vector3).y)
