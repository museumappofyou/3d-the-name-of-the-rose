class_name ActorFigure
extends Node3D
## Presentation of one Day-1A Actor (stable identity in the domain): a
## fitted cast person walking, standing, sitting, kneeling and carrying.
##  * walking plays the browser's recorded locomotion with its playback rate
##    set from the clip's own planted-foot ground speed (measured once per
##    template and clip), so feet do not skate at any speed;
##  * turning is smoothed; standing people turn toward what they face;
##  * feet stand on the exported floors/terrain (a ray each frame while
##    moving); seated clips are fitted to the seat top under them;
##  * named people turn their heads toward Adso when he is close;
##  * Nuto's limp: the heavy walk with a short, quick stance on the bad left
##    leg (cadence warp) and a hip drop — a gait, not a broken clip;
##  * distance detail like the browser crowd: faces within 10 m, shadows
##    within `shadow_m`, animation every frame to 30 m, alternate to 60 m.

var actor: Actor
var def: Dictionary = {}
var fig: CharacterPresentation
var world: Node3D                    # the main scene (physics space, player)
var motion: String = "brother"
var gait: String = ""
var shadow_m: float = 26.0
var named: bool = true
var speaking: bool = false
var _yaw: float = 0.0
var _y: float = NAN
var _last_pos: Vector3 = Vector3.INF
var _ground_speed: float = 0.0
var _tick: int = 0
var _prop: Node3D = null
var _prop_kind: String = ""
var _phase_t: float = 0.0
var _seat_y: float = NAN
var stride_k: float = 1.0           # >1: a longer stride than the clip's (William)
var _stride_now: float = 1.0
var knee_ease: bool = false         # ease the clip's deepest knee bend
static var NATURAL: Dictionary = {}

const STILL := {"stand": "standSleeves", "idle": "idleSubtle", "look": "idleSubtle", "look_long": "standSleeves", "fold": "foldArms",
	"sit": "sitBench", "read": "read", "talk": "talk", "kneel_hoof": "kneelWork", "work_sweep": "sweep", "work_well": "pickUp", "choir": "standSleeves",
	"close_book": "standSleeves", "pause": "standSleeves", "walk": "standSleeves", "listen": "listen"}

func setup(a: Actor, d: Dictionary, content: ContentData, w: Node3D, is_named: bool) -> void:
	actor = a
	def = d
	world = w
	named = is_named
	motion = String(d.get("motion", "lay" if String(d.get("template", "")).begins_with("lay_") else "brother"))
	gait = String(d.get("gait", ""))
	stride_k = float(d.get("stride", 1.0))
	knee_ease = bool(d.get("knee_ease", false))
	shadow_m = 30.0 if named else 18.0
	fig = CharacterPresentation.new()
	fig.content = content
	fig.person_id = String(d["template"])
	fig.seed_value = int(d.get("seed", 1))
	fig.hood_up = String(d.get("hood", "down")) == "up"
	if String(d.get("habit", "")) == "franciscan":
		# undyed grey-brown wool over the black habit map (linear ×5.6/4.9/3.9)
		fig.habit_tint = Color(1.78, 1.66, 1.5)
	add_child(fig)
	fig.build()
	fig.play_clip(STILL.get(a.activity, "standSleeves"), fmod(float(fig.seed_value) * 0.137, 1.0), 0.0)
	_yaw = a.yaw
	name = "actor_" + a.id.replace(":", "_")
	if String(d.get("habit", "")) == "franciscan":
		_add_satchel()
	# what makes each recurring person recognisable at a glance
	match a.id:
		"nuto":
			# rim just above the brows in front, lower behind
			_attach("head", "felt_cap", Vector3(0, 0.064, 0.012), Vector3(-0.22, 0, 0))
		"fazio":
			# a coif: down over the ears and the nape
			_attach("head", "leather_hood", Vector3(0, 0.04, 0.012), Vector3(-0.3, 0, 0))
		"tebaldo":
			_attach("pelvis", "keys", Vector3(-0.19, -0.06, 0.07), Vector3(0.0, 0.3, 1.45))

## A load moved the actor: forget the smoothing that assumed continuity.
func reset_after_load() -> void:
	_last_pos = Vector3.INF
	_ground_speed = 0.0
	_y = NAN
	_seat_y = NAN
	_yaw = actor.yaw

## The clip's own ground speed: the median backward speed of the planted
## foot (low, moving back relative to the body) in clip time. Playing the
## clip at ground speed / this keeps a planted foot planted.
static func natural_speed(f: CharacterPresentation, clip: String) -> float:
	var key: String = f.person_id + ":" + clip
	if NATURAL.has(key):
		return NATURAL[key]
	var ap: AnimationPlayer = f.player
	var sk: Skeleton3D = f.skeleton
	var L: float = f.clip_length(clip)
	var prev_clip: String = f.clip
	ap.play(clip, 0.0, 1.0)
	var N := 120
	var speeds: Array = []
	for foot: String in ["foot_l", "foot_r"]:
		var bi: int = sk.find_bone(foot)
		if bi < 0:
			continue
		var ys := PackedFloat32Array()
		var zs := PackedFloat32Array()
		for i: int in N:
			ap.seek(L * float(i) / N, true)
			var o: Vector3 = sk.get_bone_global_pose(bi).origin
			ys.append(o.y)
			zs.append(o.z)
		var ymin: float = Array(ys).min()
		for i: int in N:
			var j: int = (i + 1) % N
			var dz: float = zs[j] - zs[i]
			if ys[i] < ymin + 0.02 and ys[j] < ymin + 0.02 and dz < 0.0:
				speeds.append(-dz / (L / N))
	speeds.sort()
	var speed: float = clampf(speeds[speeds.size() / 2], 0.3, 3.0) if not speeds.is_empty() else 1.0
	NATURAL[key] = speed
	if prev_clip != "":
		ap.play(prev_clip, 0.0, 1.0)
	f.clip = prev_clip
	return speed

func _walk_clip() -> String:
	if actor.carrying in ["tray", "chest", "wood", "bucket", "book"]:
		return "walkCarry"
	if gait == "limp":
		# the ordinary walk, unevenly timed (the recorded heavy walk reads as a
		# crouch from the front)
		return "walk"
	if motion == "lay":
		return "walk"
	if actor.id == "william" and actor.speed > 1.45:
		return "walk"
	return "walkFormal"

func _process(dt: float) -> void:
	visible = actor.present
	if not visible:
		_last_pos = Vector3.INF
		return
	var cam: Camera3D = get_viewport().get_camera_3d()
	var cp: Vector3 = cam.global_position if cam else Vector3.ZERO
	var p: Vector3 = actor.pos
	# ground speed from the simulated motion (not the requested speed)
	if _last_pos != Vector3.INF and dt > 0.0:
		var g: float = Vector2(p.x - _last_pos.x, p.z - _last_pos.z).length() / dt
		_ground_speed = lerpf(_ground_speed, g, 1.0 - exp(-10.0 * dt))
	_last_pos = p
	var moving: bool = _ground_speed > 0.12 and (actor.moving or _ground_speed > 0.3)
	# feet on the floor under the actor
	var hint: float = p.y if not is_nan(p.y) else (_y if not is_nan(_y) else 0.0)
	if moving or is_nan(_y) or _tick % 20 == 0:
		var gy: Variant = _ground(Vector3(p.x, hint, p.z))
		if gy != null:
			_y = gy if is_nan(_y) or not moving else lerpf(_y, gy, 1.0 - exp(-18.0 * dt))
		elif is_nan(_y):
			_y = hint
	var y: float = _y
	# yaw: toward the motion, or toward what he faces
	var want: float = actor.yaw
	if not moving and actor.face_target != null:
		var ft: Vector3 = actor.face_target
		if Vector2(ft.x - p.x, ft.z - p.z).length() > 0.2:
			want = atan2(ft.x - p.x, ft.z - p.z)
	var turn_rate: float = 3.2 if moving else 2.0
	_yaw = rotate_toward(_yaw, want, turn_rate * dt)
	# clip
	var clip: String
	var rate: float = 1.0
	if moving:
		clip = _walk_clip()
		# the recorded walks are slow (≈0.6 m/s at 1×): quicken the cadence (and
		# for a long-striding walker lengthen the step) so the planted foot
		# stays planted; past ~140 steps a minute the stride slides a little
		# a longer step only as he quickens (none at a stroll, full at his pace)
		_stride_now = 1.0 + (stride_k - 1.0) * clampf((_ground_speed - 1.0) / 0.7, 0.0, 1.0)
		rate = clampf(_ground_speed / (natural_speed(fig, clip) * _stride_now), 0.55, 2.4)
	else:
		clip = "talk" if speaking and actor.activity in ["stand", "look", "idle", "talk"] else String(STILL.get(actor.activity, "standSleeves"))
		if not fig.has_clip(clip):
			clip = "standSleeves"
	if clip != fig.clip:
		fig.play_clip(clip, 0.0 if moving else fmod(float(fig.seed_value) * 0.271, 1.0), 0.35)
	# seated clips: pelvis at the seat (people.js resolveY: seat top − 0.46)
	if clip in ["sitBench", "sitRec", "sitTalkRec"]:
		if is_nan(_seat_y):
			var top: Variant = _seat_top(Vector3(p.x, hint, p.z))
			_seat_y = float(top) - 0.46 if top != null else y
		y = _seat_y
	else:
		_seat_y = NAN
	position = Vector3(p.x, y, p.z)
	rotation.y = _yaw
	# detail and cadence
	var d: float = cp.distance_to(position)
	fig.set_detail(d < 10.0, d < shadow_m)
	_tick += 1
	if gait == "limp" and moving:
		rate *= _limp_warp(dt * rate)
	var adv: float = dt * rate
	if d < 30.0 or (d < 60.0 and _tick % 2 == 0):
		fig.look_target = _look(cp, d)
		fig.advance_presentation(adv if d < 30.0 else adv * 2.0)
		if gait == "limp" and moving:
			_limp_pose()
		if moving and (stride_k != 1.0 or knee_ease):
			_stride_pose()
	_carry_prop()

## A walk fitted to a faster walker: the thigh's swing about the vertical
## scaled by stride_k (a longer step at the same cadence), the clip's deepest
## knee bend eased above 50°, and the pelvis lowered by however much that
## lifted the lower foot, so the planted foot keeps the ground.
func _stride_pose() -> void:
	var sk: Skeleton3D = fig.skeleton
	var pel: int = sk.find_bone("pelvis")
	var low_before := INF
	var low_after := INF
	for side: String in ["l", "r"]:
		var th: int = sk.find_bone("thigh_" + side)
		var ca: int = sk.find_bone("calf_" + side)
		var fo: int = sk.find_bone("foot_" + side)
		if th < 0 or ca < 0 or fo < 0:
			return
		low_before = minf(low_before, sk.get_bone_global_pose(fo).origin.y)
		if knee_ease:
			var rest: Quaternion = sk.get_bone_rest(ca).basis.get_rotation_quaternion()
			var delta: Quaternion = rest.inverse() * sk.get_bone_pose_rotation(ca)
			var ang: float = delta.get_angle()
			var from: float = deg_to_rad(50.0)
			if ang > from and ang < PI:
				sk.set_bone_pose_rotation(ca, rest * Quaternion.IDENTITY.slerp(delta, (from + (ang - from) * 0.45) / ang))
		if _stride_now != 1.0:
			var g: Transform3D = sk.get_bone_global_pose(th)
			var dir: Vector3 = sk.get_bone_global_pose(ca).origin - g.origin
			var turn: float = atan2(dir.z, -dir.y) * (_stride_now - 1.0)
			var ng := Transform3D(Basis(Vector3.RIGHT, -turn) * g.basis, g.origin)
			var local: Transform3D = sk.get_bone_global_pose(sk.get_bone_parent(th)).affine_inverse() * ng
			sk.set_bone_pose_rotation(th, local.basis.get_rotation_quaternion())
		low_after = minf(low_after, sk.get_bone_global_pose(fo).origin.y)
	if pel >= 0 and is_finite(low_before) and low_after > low_before:
		sk.set_bone_pose_position(pel, sk.get_bone_pose_position(pel) - Vector3(0, low_after - low_before, 0))

## a quick, short stance on the bad (left) leg
func _limp_warp(_adv: float) -> float:
	var L: float = fig.clip_length(fig.clip)
	var ph: float = fmod(fig.player.current_animation_position / L, 1.0)
	# left stance ≈ the first half of the clip: hurry through it
	return 1.0 + 0.3 * sin(TAU * ph)

func _limp_pose() -> void:
	var L: float = fig.clip_length(fig.clip)
	var ph: float = fmod(fig.player.current_animation_position / L, 1.0)
	var drop: float = 0.05 * maxf(0.0, sin(TAU * ph))
	var sk: Skeleton3D = fig.skeleton
	var pel: int = sk.find_bone("pelvis")
	var sp: int = sk.find_bone("spine_02")
	if pel >= 0:
		sk.set_bone_pose_rotation(pel, Quaternion(Vector3(0, 0, 1), drop) * sk.get_bone_pose_rotation(pel))
	if sp >= 0:
		sk.set_bone_pose_rotation(sp, Quaternion(Vector3(0, 0, 1), -drop * 0.8) * sk.get_bone_pose_rotation(sp))

func _look(cp: Vector3, d: float) -> Variant:
	if actor.look_target != null:
		return actor.look_target
	if named and d < 3.4 and not actor.moving:
		return cp
	if named and speaking and d < 7.0:
		return cp
	return null

func _ground(p: Vector3) -> Variant:
	var space: PhysicsDirectSpaceState3D = get_world_3d().direct_space_state
	var q := PhysicsRayQueryParameters3D.create(p + Vector3(0, 1.3, 0), p + Vector3(0, -2.6, 0), 1 | 2)
	var hit: Dictionary = space.intersect_ray(q)
	if hit.is_empty():
		var cells: WorldCells = world.cells
		var th: float = cells.terrain_height_at(p.x, p.z)
		return null if is_nan(th) else th
	return float((hit["position"] as Vector3).y)

func _seat_top(p: Vector3) -> Variant:
	var space: PhysicsDirectSpaceState3D = get_world_3d().direct_space_state
	var q := PhysicsRayQueryParameters3D.create(p + Vector3(0, 1.2, 0), p + Vector3(0, -0.2, 0), 1)
	var hit: Dictionary = space.intersect_ray(q)
	return null if hit.is_empty() else float((hit["position"] as Vector3).y)

## carried things (tray, chest, bucket, wood, book) in the hands
func _carry_prop() -> void:
	var k: String = actor.carrying
	if k == _prop_kind:
		return
	_prop_kind = k
	if _prop:
		_prop.queue_free()
		_prop = null
	if k == "":
		return
	var att := BoneAttachment3D.new()
	att.bone_name = "spine_03" if k in ["tray", "chest", "wood"] else "hand_r"
	fig.skeleton.add_child(att)
	var mi: MeshInstance3D = Day1aProps.mesh_for(k)
	att.add_child(mi)
	if att.bone_name == "spine_03":
		mi.position = Vector3(0, -0.12, 0.36) if k != "chest" else Vector3(0, -0.28, 0.42)
	else:
		mi.position = Vector3(0, -0.12, 0.05)
	_prop = att

func _attach(bone: String, kind: String, pos: Vector3, rot: Vector3) -> void:
	var att := BoneAttachment3D.new()
	att.bone_name = bone
	fig.skeleton.add_child(att)
	var mi: MeshInstance3D = Day1aProps.mesh_for(kind)
	att.add_child(mi)
	mi.position = pos
	mi.rotation = rot

## William carries his own books: a leather satchel at his left hip
func _add_satchel() -> void:
	var att := BoneAttachment3D.new()
	att.bone_name = "pelvis"
	fig.skeleton.add_child(att)
	var mi: MeshInstance3D = Day1aProps.mesh_for("satchel")
	att.add_child(mi)
	mi.position = Vector3(0.2, -0.1, -0.09)
	mi.rotation = Vector3(0.0, 0.35, 0.06)

func hand_world() -> Vector3:
	return fig.bone_world("hand_r")
