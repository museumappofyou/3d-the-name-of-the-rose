class_name CharacterPresentation
extends Node3D
## One animated presentation of a fitted cast person (native counterpart of
## src/world/people/figure.js). Identity lives in the domain layer: this node
## only shows `person_id` and is safe to pool, hide or free. Save data never
## references it.
##
## Conventions (docs/migration/phase-1/COORDINATES.md): world metres, +X east,
## +Y up, +Z south. The imported model faces +Z (Godot MODEL_FRONT); a slot's
## `ry` is applied unchanged, exactly as the browser's `g.rotation.y = ry`.
##
## Animation is advanced manually (`advance_presentation`) so that callers
## can bound update cadence for crowds (browser: every frame within 30 m,
## alternate frames to 60 m, frozen beyond).

const SCENES := {
	"alinardo": "res://assets/characters/alinardo/alinardo.glb",
	"monk_a": "res://assets/characters/monk_a/monk_a.glb",
	"scribe_a": "res://assets/characters/scribe_a/scribe_a.glb",
	"monk_b": "res://assets/characters/monk_b/monk_b.glb",
	"novice_a": "res://assets/characters/novice_a/novice_a.glb",
}
## brother-pose → fitted clip (figure.js MOTION.brother, phase-1 subset)
const MOTION := {"sit": "sitBench", "stand": "standSleeves", "bow": "standBow", "kneel": "kneelPray", "kneelBow": "kneelBow", "read": "read", "write": "write", "dine": "dine", "tend": "tend"}
const SEATED := ["sitBench", "write", "dine"]
const FACE_PARTS := ["eyes", "brows", "lashes"]
## lowered-hood drape (garmentPose.js): fitted at a 66° torso bend
const DRAPE_START := deg_to_rad(10.0)
const DRAPE_FULL := deg_to_rad(66.0)

@export var person_id: String = "alinardo"
@export var seed_value: int = 41
@export var hood_up: bool = false
## content database for cast metadata (tints); set by the creator
var content: ContentData

var model: Node3D
var skeleton: Skeleton3D
var player: AnimationPlayer
var parts: Dictionary = {}          # part name -> MeshInstance3D
var clip: String = ""
var speed: float = 1.0
var look_target: Variant = null      # Vector3 world point or null
var _rng: SeededRandom
var _hood_rest_angle: float = 0.0
var _drape_index: int = -1
var _look_yaw: float = 0.0
var _look_pitch: float = 0.0
var _face_visible: bool = true
var _shadow_on: bool = true

static func clip_for_pose(pose: String) -> String:
	return MOTION.get(pose, "standSleeves")

func _ready() -> void:
	if model == null:
		build()

func build() -> void:
	if model != null:
		return
	var ps: PackedScene = load(SCENES[person_id])
	model = ps.instantiate()
	add_child(model)
	skeleton = model.find_children("*", "Skeleton3D", true, false)[0]
	player = model.find_children("*", "AnimationPlayer", true, false)[0]
	player.callback_mode_process = AnimationMixer.ANIMATION_CALLBACK_MODE_PROCESS_MANUAL
	for mi: Node in skeleton.find_children("*", "MeshInstance3D", true, false):
		var part: String = String(mi.name).get_slice("_", String(mi.name).get_slice_count("_") - 1)
		if String(mi.name).ends_with("hood_up"): part = "hood_up"
		elif String(mi.name).ends_with("hood_down"): part = "hood_down"
		parts[part] = mi
	_rng = SeededRandom.new(seed_value)
	speed = 0.94 + _rng.next() * 0.12
	_apply_materials()
	var hd: MeshInstance3D = parts.get("hood_down")
	if hd and hd.mesh is ArrayMesh:
		for i: int in (hd.mesh as ArrayMesh).get_blend_shape_count():
			if (hd.mesh as ArrayMesh).get_blend_shape_name(i) == &"bendDrape":
				_drape_index = i
	_hood_rest_angle = _chest_angle(true)
	set_hood(hood_up)

## figure.js prepare() + dress(): the browser's material treatment, mapped to
## StandardMaterial3D (no sheen lobe in Godot's standard material; recorded
## as a deviation in the report).
func _apply_materials() -> void:
	var info: Dictionary = content.person(person_id) if content != null else {}
	var tint: Dictionary = info.get("tint", {})
	var wear: float = 0.8 + _rng.next() * 0.35
	var habit_color := Color(wear * (1.0 + (_rng.next() - 0.5) * 0.06), wear, wear * (1.0 - _rng.next() * 0.05))
	var habit_mat: StandardMaterial3D = null
	for part: String in parts.keys():
		var mi: MeshInstance3D = parts[part]
		var src: Material = mi.get_active_material(0)
		if not (src is StandardMaterial3D):
			continue
		var m: StandardMaterial3D = (src as StandardMaterial3D).duplicate()
		match part:
			"brows", "lashes", "hair", "beard":
				m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA_SCISSOR
				m.alpha_scissor_threshold = 0.45
				m.alpha_antialiasing_mode = BaseMaterial3D.ALPHA_ANTIALIASING_ALPHA_TO_COVERAGE
				if part == "hair":
					m.cull_mode = BaseMaterial3D.CULL_DISABLED
			"skin":
				m.roughness = 0.58
				m.albedo_color = m.albedo_color * 0.74
				m.albedo_color.a = 1.0
			"habit", "hood_up", "hood_down", "tunic", "hose", "apron":
				m.roughness = 0.94
				m.metallic = 0.0
				m.metallic_specular = 0.36
			"boots":
				m.roughness = 0.78
		var key: String = "hair" if part in ["hair", "beard"] else ("skin" if part == "skin" else "")
		# cast.json writes `null` for "no tint" (figure.js: `if (tint)`)
		var t: Variant = tint.get(key) if key != "" else null
		if t is Array:
			m.albedo_color = m.albedo_color * Color(minf(1.6, t[0]), minf(1.6, t[1]), minf(1.6, t[2]))
		if part in ["habit", "hood_up", "hood_down"]:
			if habit_mat == null:
				# dress(): the cloth colour is replaced by this brother's wear
				m.albedo_color = habit_color
				habit_mat = m
			m = habit_mat
		mi.set_surface_override_material(0, m)
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF if part in FACE_PARTS else GeometryInstance3D.SHADOW_CASTING_SETTING_ON

func set_hood(up: bool) -> void:
	hood_up = up and parts.has("hood_up")
	if parts.has("hood_up"): (parts["hood_up"] as Node3D).visible = hood_up
	if parts.has("hood_down"): (parts["hood_down"] as Node3D).visible = not hood_up
	if parts.has("hair"): (parts["hair"] as Node3D).visible = not hood_up

## Start a fitted clip at a phase (0..1) of its length; seated/kneeling clips
## play at 1×, others at the person's seeded speed (figure.js setPose).
func play_pose(pose: String, phase: float = 0.0) -> void:
	var name: String = clip_for_pose(pose)
	if not player.has_animation(name):
		name = "standSleeves"
	if name == clip:
		return
	var a: Animation = player.get_animation(name)
	var rate: float = 1.0 if (name in SEATED or name.begins_with("kneel")) else speed
	player.play(name, 0.5 if clip != "" else 0.0, rate)
	player.seek(fposmod(phase, 1.0) * a.length, true)
	clip = name
	_after_pose(0.0)

func advance_presentation(dt: float) -> void:
	player.advance(dt)
	_after_pose(dt)

func _after_pose(dt: float) -> void:
	if _drape_index >= 0 and (parts["hood_down"] as Node3D).visible:
		var bend: float = _chest_angle(false) - _hood_rest_angle
		var t: float = clampf((bend - DRAPE_START) / (DRAPE_FULL - DRAPE_START), 0.0, 1.0)
		(parts["hood_down"] as MeshInstance3D).set_blend_shape_value(_drape_index, t * t * (3.0 - 2.0 * t))
	if dt > 0.0:
		_apply_look(dt)

## chest (spine_03) up vector in the character frame → forward bend angle
func _chest_angle(rest: bool) -> float:
	var i: int = skeleton.find_bone("spine_03")
	if i < 0:
		return 0.0
	var g: Transform3D = skeleton.get_bone_global_rest(i) if rest else skeleton.get_bone_global_pose(i)
	var up: Vector3 = (skeleton.transform.basis * g.basis) * Vector3.UP
	return atan2(up.z, up.y)

## figure.js lookAt(): a named person turns his head toward someone close.
## ±0.95 rad yaw, limited pitch, eased; shared neck 35% / head 65%.
func _apply_look(dt: float) -> void:
	var yaw := 0.0
	var pitch := 0.0
	var head_i: int = skeleton.find_bone("head")
	var neck_i: int = skeleton.find_bone("neck_01")
	if look_target != null and head_i >= 0:
		var head_world: Vector3 = skeleton.global_transform * skeleton.get_bone_global_pose(head_i).origin
		var local: Vector3 = global_transform.affine_inverse() * (look_target as Vector3) - global_transform.affine_inverse() * head_world
		yaw = clampf(atan2(local.x, local.z), -0.95, 0.95)
		pitch = clampf(atan2(local.y, Vector2(local.x, local.z).length()), -0.35, 0.25) * 0.6
		if absf(atan2(local.x, local.z)) > 2.2:
			yaw = 0.0
	var k: float = 1.0 - exp(-dt * 3.0)
	_look_yaw += (yaw - _look_yaw) * k
	_look_pitch += (pitch - _look_pitch) * k
	if absf(_look_yaw) < 1e-3 and absf(_look_pitch) < 1e-3:
		return
	var body_q: Quaternion = global_transform.basis.get_rotation_quaternion()
	for pair: Array in [[neck_i, 0.35], [head_i, 0.65]]:
		var b: int = pair[0]
		if b < 0:
			continue
		var share: float = pair[1]
		var parent_i: int = skeleton.get_bone_parent(b)
		var parent_world_q: Quaternion = (skeleton.global_transform.basis * skeleton.get_bone_global_pose(parent_i).basis).get_rotation_quaternion()
		var up: Vector3 = body_q * Vector3.UP
		var side: Vector3 = body_q * Vector3.RIGHT
		var qa := Quaternion(up, _look_yaw * share) * Quaternion(side, -_look_pitch * share)
		var local_q: Quaternion = parent_world_q.inverse() * qa * parent_world_q
		skeleton.set_bone_pose_rotation(b, local_q * skeleton.get_bone_pose_rotation(b))

## Distance detail (figure.js setDetail): face parts within ~9 m, shadows
## within the given radius. Hysteresis is the caller's responsibility.
func set_detail(face: bool, shadow: bool) -> void:
	if face != _face_visible:
		_face_visible = face
		for p: String in FACE_PARTS:
			if parts.has(p): (parts[p] as Node3D).visible = face
	if shadow != _shadow_on:
		_shadow_on = shadow
		for p: String in parts.keys():
			if p in FACE_PARTS or p == "hair":
				continue
			(parts[p] as GeometryInstance3D).cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if shadow else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF

func bone_world(bone: String) -> Vector3:
	return skeleton.global_transform * skeleton.get_bone_global_pose(skeleton.find_bone(bone)).origin
