class_name PlayerController
extends CharacterBody3D
## First-person walker (native counterpart of src/systems/player.js):
## capsule radius 0.3 m, 1.6 m tall, eye 1.62 m above the feet; walk
## 2.7 m/s, run 5.4 m/s; damped acceleration (12 on the ground, 3 in the
## air); gravity 24 m/s²; step-up of thresholds/kerbs to 0.42 m; stairs are
## the browser's collision ramps. Body origin = feet.
##
## Physical traversal is reported to GameSession every physics step. Any
## placement that is not a walk goes through teleport(), which invalidates
## the passage approach (debug jumps can never fabricate a descent).

signal stepped(surface: String, feet: Vector3, running: bool)

const RADIUS := 0.3
const HEIGHT := 1.6
const EYE := 1.62
const WALK := 2.7
const RUN := 5.4
const STEP_UP := 0.42
const LOOK_SENS := 0.0022
const PAD_LOOK := 2.4

var session: GameSession
var cells: WorldCells
var camera: Camera3D
## walking speeds (Day-1A sets them from what Adso carries; the proof keeps
## the browser's 2.7 / 5.4 m/s)
var walk_speed: float = WALK
var run_speed: float = RUN
## optional authored walk limits: f(from: Vector3, to: Vector3) -> Vector3
## returns the allowed position (Day-1A: the footprint's polygons)
var limit_fn: Callable
## seated: the body is held at a seat, the view stays free
var seat: Variant = null            # {"pos": Vector3 feet, "eye": float}
var look_sens: float = LOOK_SENS
var yaw: float = 0.0
var pitch: float = 0.0
var input_enabled: bool = true
var autopilot: Vector2 = Vector2.ZERO      # scripted move (x strafe, y forward), benchmarks/tests
var autopilot_active: bool = false
var autopilot_run: bool = false
## review captures: hold the body exactly where it was placed (no gravity)
var frozen: bool = false
var running: bool = false
var _eye_y: float = 0.0
var _bob: float = 0.0
var _step_dist: float = 0.0
var last_surface: String = ""
var on_floor_time: float = 0.0
var distance_walked: float = 0.0

func setup(s: GameSession, world: WorldCells) -> void:
	session = s
	cells = world
	collision_layer = 4
	collision_mask = 1 | 2
	floor_max_angle = deg_to_rad(46.0)
	floor_snap_length = 0.45
	floor_constant_speed = true
	safe_margin = 0.01
	var cs := CollisionShape3D.new()
	var cap := CapsuleShape3D.new()
	cap.radius = RADIUS
	cap.height = HEIGHT
	cs.shape = cap
	cs.position = Vector3(0, HEIGHT / 2.0, 0)
	add_child(cs)
	camera = Camera3D.new()
	camera.name = "eye"
	camera.fov = 55.0
	camera.near = 0.08
	camera.far = 1500.0
	camera.position = Vector3(0, EYE, 0)
	add_child(camera)
	camera.current = true

func feet() -> Vector3:
	return global_position

func eye_position() -> Vector3:
	return camera.global_position

func teleport(to_feet: Vector3, to_yaw: float, reason: String, to_pitch: float = 0.0) -> void:
	global_position = to_feet
	velocity = Vector3.ZERO
	yaw = to_yaw
	pitch = to_pitch
	_eye_y = to_feet.y
	_apply_view(0.0)
	session.pitch = pitch
	session.teleport(to_feet, to_yaw, reason)

func _unhandled_input(event: InputEvent) -> void:
	if not input_enabled:
		return
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		var m := event as InputEventMouseMotion
		yaw -= m.relative.x * look_sens
		pitch = clampf(pitch - m.relative.y * look_sens, -1.5, 1.5)
	elif event is InputEventMouseButton and (event as InputEventMouseButton).pressed and Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT:
		# Alt-Tab / focus loss: release the mouse and stop moving
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		autopilot = Vector2.ZERO if not autopilot_active else autopilot

func _physics_process(dt: float) -> void:
	if session == null:
		return
	if frozen:
		velocity = Vector3.ZERO
		_apply_view(dt)
		return
	if seat != null:
		velocity = Vector3.ZERO
		global_position = (seat as Dictionary)["pos"]
		if input_enabled and not autopilot_active:
			var look2 := Input.get_vector("look_left", "look_right", "look_down", "look_up")
			yaw -= look2.x * PAD_LOOK * dt
			pitch = clampf(pitch + look2.y * PAD_LOOK * dt, -1.5, 1.5)
		session.yaw = yaw
		session.pitch = pitch
		session.step(dt, global_position, false)
		_apply_view(dt)
		return
	var mv := Vector2.ZERO
	if autopilot_active:
		mv = autopilot
		running = autopilot_run
	elif input_enabled:
		mv = Input.get_vector("move_left", "move_right", "move_back", "move_forward")
		running = Input.is_action_pressed("sprint")
		var look := Input.get_vector("look_left", "look_right", "look_down", "look_up")
		yaw -= look.x * PAD_LOOK * dt
		pitch = clampf(pitch + look.y * PAD_LOOK * dt, -1.5, 1.5)
	var sp: float = run_speed if running else walk_speed
	var dir := Vector3(mv.x, 0, -mv.y)
	if dir.length_squared() > 1.0:
		dir = dir.normalized()
	dir = dir.rotated(Vector3.UP, yaw) * sp
	var grounded: bool = is_on_floor()
	var acc: float = 12.0 if grounded else 3.0
	var k: float = 1.0 - exp(-acc * dt)
	velocity.x = lerpf(velocity.x, dir.x, k)
	velocity.z = lerpf(velocity.z, dir.z, k)
	if not grounded:
		velocity.y -= 24.0 * dt
	else:
		velocity.y = minf(velocity.y, 0.0)
	var before: Vector3 = global_position
	var want := Vector3(velocity.x, 0, velocity.z) * dt
	move_and_slide()
	var got := Vector3(global_position.x - before.x, 0, global_position.z - before.z)
	if grounded and want.length() > 1e-4 and got.length() < want.length() * 0.6:
		_step_up(want - got)
	if limit_fn.is_valid():
		var allowed: Vector3 = limit_fn.call(before, global_position)
		if Vector2(allowed.x - global_position.x, allowed.z - global_position.z).length() > 1e-4:
			global_position = Vector3(allowed.x, global_position.y, allowed.z)
			velocity.x *= 0.5
			velocity.z *= 0.5
	var moved: float = Vector2(global_position.x - before.x, global_position.z - before.z).length()
	distance_walked += moved
	if is_on_floor():
		on_floor_time += dt
		_step_dist += moved
		_bob += moved * (1.35 if running else 1.9)
		var stride: float = 1.25 if running else 0.82
		if _step_dist > stride:
			_step_dist = 0.0
			last_surface = _surface_under()
			stepped.emit(last_surface, global_position, running)
	if global_position.y < -40.0:
		var spawn: Vector3 = session.content.anchor_pos("cloister.porch") + Vector3(2.4, -0.05, 0)
		teleport(spawn, PI / 2.0, "fall recovery")
	session.yaw = yaw
	session.pitch = pitch
	session.step(dt, global_position, true)
	_apply_view(dt)

## A tread just ahead no higher than STEP_UP with headroom: stand on it.
func _step_up(remaining: Vector3) -> void:
	var from: Transform3D = global_transform
	var up := Vector3(0, STEP_UP, 0)
	if test_move(from, up):
		return
	var raised: Transform3D = from.translated(up)
	var fwd: Vector3 = remaining.normalized() * maxf(remaining.length(), RADIUS * 0.5)
	if test_move(raised, fwd):
		return
	var moved: Transform3D = raised.translated(fwd)
	var col := KinematicCollision3D.new()
	if not test_move(moved, Vector3(0, -STEP_UP - 0.05, 0), col):
		return
	if col.get_normal().y < 0.7:
		return
	var landed: Transform3D = moved.translated(col.get_travel())
	if landed.origin.y - from.origin.y < 0.03:
		return
	global_transform = landed

func _surface_under() -> String:
	var space: PhysicsDirectSpaceState3D = get_world_3d().direct_space_state
	var q := PhysicsRayQueryParameters3D.create(global_position + Vector3(0, 0.45, 0), global_position + Vector3(0, -0.85, 0), 1 | 2)
	q.exclude = [get_rid()]
	var hit: Dictionary = space.intersect_ray(q)
	return cells.footstep_surface(hit.get("collider"), global_position) if not hit.is_empty() else "snowFresh"

func _apply_view(dt: float) -> void:
	var y: float = global_position.y
	if absf(_eye_y - y) > 0.8 or dt <= 0.0:
		_eye_y = y
	_eye_y = lerpf(_eye_y, y, 1.0 - exp(-16.0 * dt))
	var hs: float = Vector2(velocity.x, velocity.z).length()
	var bob_y: float = sin(_bob * PI) * 0.028 * minf(1.0, hs / 2.0)
	var eye_h: float = EYE if seat == null else float((seat as Dictionary).get("eye", 1.16))
	camera.position = Vector3(0, _eye_y - y + eye_h + bob_y, 0)
	camera.rotation = Vector3(pitch, yaw, sin(_bob * PI * 0.5) * 0.004)
	camera.rotation_order = EULER_ORDER_YXZ
