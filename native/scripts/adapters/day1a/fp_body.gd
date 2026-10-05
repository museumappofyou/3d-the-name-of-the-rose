class_name FPBody
extends Node3D
## Adso's body in first person, kept modest (Day-1A scope):
##  * a whole fitted body (cast monk_f: black Benedictine habit, Adso's
##    height so the eye sits at 1.62 m) that only casts shadows — Adso sees
##    his own shadow walk, carry and sit, never the inside of his head;
##  * in view: what he carries (the bedding bundle, the chest, a bucket,
##    the wet hose), held in two wool sleeves; the mule's lead in his right
##    sleeve on the road; a morsel raised when he eats.

var player: PlayerController
var body: CharacterPresentation
var view: Node3D
var held: Node3D = null
var held_kind: String = ""
var sleeves: Array[MeshInstance3D] = []
var lead_sleeve: MeshInstance3D
var morsel: MeshInstance3D
var _morsel_t: float = -1.0
var _yaw: float = 0.0
var carrying: String = ""
var leading: bool = false
var seated: bool = false

func setup(p: PlayerController, content: ContentData) -> void:
	player = p
	name = "fp_body"
	body = CharacterPresentation.new()
	body.content = content
	body.person_id = "monk_f"
	body.seed_value = 4242
	body.hood_up = false
	add_child(body)
	body.build()
	for part: String in body.parts.keys():
		var gi: GeometryInstance3D = body.parts[part]
		gi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_SHADOWS_ONLY
		if part in CharacterPresentation.FACE_PARTS:
			gi.visible = false
	body.play_clip("standSleeves", 0.0, 0.0)
	view = Node3D.new()
	view.name = "fp_view"
	p.camera.add_child(view)
	var wool: Material = _wool()
	for i: int in 2:
		var s := MeshInstance3D.new()
		var cm := CapsuleMesh.new()
		cm.radius = 0.055
		cm.height = 0.42
		s.mesh = cm
		s.material_override = wool
		s.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		s.visible = false
		view.add_child(s)
		sleeves.append(s)
	lead_sleeve = MeshInstance3D.new()
	var lm := CapsuleMesh.new()
	lm.radius = 0.05
	lm.height = 0.36
	lead_sleeve.mesh = lm
	lead_sleeve.material_override = wool
	lead_sleeve.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	lead_sleeve.position = Vector3(0.27, -0.38, -0.42)
	lead_sleeve.rotation = Vector3(1.15, 0.25, 0.3)
	view.add_child(lead_sleeve)
	morsel = MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = 0.03
	sm.height = 0.04
	morsel.mesh = sm
	morsel.material_override = load("res://assets/world/materials/p_bread.tres") if ResourceLoader.exists("res://assets/world/materials/p_bread.tres") else wool
	morsel.visible = false
	view.add_child(morsel)

func _wool() -> Material:
	var src: Material = (body.parts.get("habit") as MeshInstance3D).get_active_material(0) if body.parts.has("habit") else null
	if src:
		return src
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(0.05, 0.045, 0.04)
	return m

## the end of the lead rope in Adso's hand (world)
func hand() -> Vector3:
	return lead_sleeve.global_transform * Vector3(0, -0.2, 0)

func eat(kind: String) -> void:
	_morsel_t = 0.0
	var c: Color = {"bread": Color(0.62, 0.46, 0.28), "cheese": Color(0.86, 0.80, 0.62), "olives": Color(0.12, 0.12, 0.08)}.get(kind, Color(0.6, 0.5, 0.3))
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = 0.8
	morsel.material_override = m

func _process(dt: float) -> void:
	if player == null:
		return
	var feet: Vector3 = player.global_position
	_yaw = lerp_angle(_yaw, player.yaw + PI, 1.0 - exp(-10.0 * dt))
	global_position = feet
	rotation.y = _yaw
	var hs: float = Vector2(player.velocity.x, player.velocity.z).length()
	var clip: String = "standSleeves"
	var rate := 1.0
	if seated:
		clip = "sitBench"
	elif hs > 0.25:
		clip = "walkCarry" if carrying != "" else ("walk" if hs > 1.3 else "walkFormal")
		rate = clampf(hs / ActorFigure.natural_speed(body, clip), 0.5, 2.2)
	if clip != body.clip:
		body.play_clip(clip, 0.0, 0.3)
	body.advance_presentation(dt * rate)
	# held things in view
	if carrying != held_kind:
		held_kind = carrying
		if held:
			held.queue_free()
			held = null
		if carrying != "":
			held = Node3D.new()
			var mi: MeshInstance3D = Day1aProps.mesh_for({"bedding": "bundle", "chest": "chest", "bucket": "bucket", "hose": "hose"}.get(carrying, carrying))
			mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			held.add_child(mi)
			view.add_child(held)
	var bob: float = sin(Time.get_ticks_msec() / 1000.0 * 6.5) * 0.008 * minf(1.0, hs / 1.5)
	if held:
		# held low, so the way ahead stays visible (the view is only "slightly lowered")
		var at: Vector3 = {"bedding": Vector3(0.0, -0.56, -0.6), "chest": Vector3(0.0, -0.64, -0.62), "bucket": Vector3(0.28, -0.66, -0.46), "hose": Vector3(0.08, -0.44, -0.44)}.get(carrying, Vector3(0, -0.55, -0.6))
		held.position = at + Vector3(0, bob, 0)
		var two_hands: bool = carrying in ["bedding", "chest"]
		sleeves[0].visible = true
		sleeves[1].visible = two_hands
		sleeves[0].position = at + Vector3(0.24 if two_hands else 0.06, -0.06, 0.12)
		sleeves[0].rotation = Vector3(1.25, 0.0, -0.35 if two_hands else 0.0)
		sleeves[1].position = at + Vector3(-0.24, -0.06, 0.12)
		sleeves[1].rotation = Vector3(1.25, 0.0, 0.35)
	else:
		for s: MeshInstance3D in sleeves:
			s.visible = false
	lead_sleeve.visible = leading and held == null
	if _morsel_t >= 0.0:
		_morsel_t += dt
		var k: float = clampf(_morsel_t / 0.9, 0.0, 1.0)
		morsel.visible = k < 1.0
		morsel.position = Vector3(0.05, -0.32 + 0.22 * k, -0.42 + 0.2 * k)
		sleeves[0].visible = morsel.visible
		sleeves[0].position = morsel.position + Vector3(0.04, -0.1, 0.12)
		sleeves[0].rotation = Vector3(1.0, 0.0, 0.0)
		if k >= 1.0:
			_morsel_t = -1.0
