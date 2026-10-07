class_name Day1aAudio
extends Node3D
## Physically placed Day-1A sound (no music layer): the office bell from the
## belfry (one recorded strike, repeated with slight variation, filtered by
## distance and walls); hooves and snorts of the mules; the gate's bar,
## creak and thud; footsteps of the people who walk near Adso; eating,
## pouring, straw, cloth; the wind in the road's pines; a far hammer on
## iron and crows; a cough or a page in the cloister. Everything is a 3D
## player at its source on the "World" bus (room reverb) except the far
## ambience on "Ambience".

var main: Node3D
var director: Day1aDirector
var banks: Dictionary = {}           # bank -> Array[AudioStream]
var pool: Array[AudioStreamPlayer3D] = []
var _pi: int = 0
var bell_player: AudioStreamPlayer3D
var bell_lpf: AudioEffectLowPassFilter
var trees: AudioStreamPlayer3D
var _bell_queue: Array = []          # times (s) of strokes still to ring
var _bell_t: float = 0.0
var _amb_t: float = 4.0
var _hammer: int = 0
var _hammer_t: float = 0.0
var _stride: Dictionary = {}         # actor id -> distance since last step
var _mule_stride: Dictionary = {}
var rng := RandomNumberGenerator.new()
var _bell_pos: Vector3
var log: Array = []                  # [t, id] played (telemetry/tests)

func setup(m: Node3D, d: Day1aDirector) -> void:
	main = m
	director = d
	name = "day1a_audio"
	rng.seed = 1301
	var D: Dictionary = m.content.doc("sounds").get("day1a", {})
	for bank: String in (D.get("banks", {}) as Dictionary).keys():
		var list: Array[AudioStream] = []
		var i := 0
		var nm: String = bank.replace(":", "_")
		while ResourceLoader.exists("res://assets/audio/day1a/%s_%02d.wav" % [nm, i]):
			list.append(load("res://assets/audio/day1a/%s_%02d.wav" % [nm, i]))
			i += 1
		banks[bank] = list
	for i: int in 14:
		var a := AudioStreamPlayer3D.new()
		a.bus = "World"
		a.unit_size = 3.0
		a.max_distance = 120.0
		a.attenuation_filter_cutoff_hz = 12000.0
		a.doppler_tracking = AudioStreamPlayer3D.DOPPLER_TRACKING_DISABLED
		add_child(a)
		pool.append(a)
	# the bell: its own bus with a low-pass that closes indoors and with distance
	if AudioServer.get_bus_index("Bells") < 0:
		AudioServer.add_bus()
		var bi: int = AudioServer.bus_count - 1
		AudioServer.set_bus_name(bi, "Bells")
		AudioServer.set_bus_send(bi, "World")
		bell_lpf = AudioEffectLowPassFilter.new()
		bell_lpf.cutoff_hz = 9000.0
		AudioServer.add_bus_effect(bi, bell_lpf)
	else:
		bell_lpf = AudioServer.get_bus_effect(AudioServer.get_bus_index("Bells"), 0)
	var bt: Array = D.get("bell_tower", [34.4, 19.5, -5.46])
	_bell_pos = Vector3(float(bt[0]), float(bt[1]), float(bt[2]))
	bell_player = AudioStreamPlayer3D.new()
	bell_player.bus = "Bells"
	bell_player.position = _bell_pos
	bell_player.unit_size = 14.0
	bell_player.max_distance = 600.0
	bell_player.max_polyphony = 4
	bell_player.attenuation_filter_cutoff_hz = 20500.0
	bell_player.doppler_tracking = AudioStreamPlayer3D.DOPPLER_TRACKING_DISABLED
	if not (banks.get("bell", []) as Array).is_empty():
		bell_player.stream = banks["bell"][0]
	add_child(bell_player)
	# wind in the pines over the road (a looped recording at the pine roof)
	trees = AudioStreamPlayer3D.new()
	trees.bus = "Ambience"
	var ws: AudioStream = load("res://assets/audio/day1a/windTrees.mp3")
	if ws is AudioStreamMP3:
		(ws as AudioStreamMP3).loop = true
	trees.stream = ws
	trees.position = Vector3(-117.0, 6.0, 26.0)
	trees.unit_size = 22.0
	trees.max_distance = 140.0
	trees.volume_db = -9.0
	add_child(trees)
	trees.play(rng.randf_range(0.5, 30.0))
	d.bell.connect(_on_bell)
	d.sfx.connect(_on_sfx)

func play(bank: String, at: Vector3, gain_db: float = 0.0, pitch: float = 1.0, unit: float = 3.0) -> void:
	var list: Array = banks.get(bank, [])
	if list.is_empty():
		return
	at = _finite(at, bank)
	if is_nan(at.x):
		return
	var a: AudioStreamPlayer3D = pool[_pi % pool.size()]
	_pi += 1
	a.stream = list[rng.randi_range(0, list.size() - 1)]
	a.global_position = at
	a.volume_db = gain_db
	a.pitch_scale = pitch * rng.randf_range(0.97, 1.03)
	a.unit_size = unit
	a.play()
	if log.size() < 4000:
		log.append([snappedf(director.t, 0.01), bank])

## A sound source must have a finite position: one NaN reaching a 3D
## player poisons its bus (and the reverb behind it) until the bus idles.
## Actor positions use y = NaN for "on the ground here".
var _warned: Dictionary = {}
func _finite(at: Vector3, what: String) -> Vector3:
	if is_finite(at.x) and is_finite(at.y) and is_finite(at.z):
		return at
	if not is_finite(at.x) or not is_finite(at.z):
		if not _warned.has(what):
			_warned[what] = true
			push_warning("Day-1A sound '%s' without a position: skipped" % what)
		return Vector3(NAN, NAN, NAN)
	var h: float = main.cells.terrain_height_at(at.x, at.z)
	return Vector3(at.x, (0.0 if is_nan(h) else h) + 1.0, at.z)

func _on_bell(_office: String, strokes: int, interval: float) -> void:
	_bell_queue.clear()
	for k: int in strokes:
		_bell_queue.append(_bell_t + 0.4 + k * interval + rng.randf_range(-0.07, 0.07))

func _on_sfx(id: String, pos: Vector3) -> void:
	match id:
		"gate_bar":
			play("timber", pos, -4.0, 0.85, 4.0)
			play("metal", pos + Vector3(0, 0.2, 0.6), -10.0, 0.8, 3.0)
		"gate_open":
			play("doorCreak", pos, -2.0, 0.78, 6.0)
			get_tree().create_timer(3.9).timeout.connect(func() -> void: play("doorThud", pos, -6.0, 0.8, 5.0))
		"snort":
			play("snort", pos, -6.0)
		"cloth":
			play("strawRustle", pos + Vector3(0, 1.0, 0), -14.0, 1.25, 1.5)
		"straw":
			play("strawRustle", pos, -6.0, 1.0, 2.0)
		"chest", "chest_down":
			play("timber", pos + Vector3(0, 0.6, 0), -8.0, 1.1, 2.5)
		"chew":
			play("chew", pos + Vector3(0, -0.15, -0.1), -16.0, 1.0, 0.6)
		"pour":
			play("pour", pos, -12.0, 1.1, 1.2)
		"wring":
			play("pour", pos + Vector3(0, -0.3, -0.3), -15.0, 1.35, 1.0)
		"tray":
			play("metal", pos, -10.0, 1.1, 2.0)
		"bucket":
			play("pour", pos + Vector3(0, 0.3, 0), -12.0, 0.8, 2.0)

## A load: footstep strides restart, and the hour's bell rings only the
## strokes still due in the restored scene (never again from the first).
func reset_after_load() -> void:
	_stride.clear()
	_mule_stride.clear()
	_hammer = 0
	_bell_queue.clear()
	var B: Dictionary = director.bell_remaining()
	for off: float in B.get("offsets", []):
		_bell_queue.append(_bell_t + off)

func _process(dt: float) -> void:
	_bell_t += dt
	var ear: Vector3 = main.player.eye_position()
	# bell: distant and muffled through walls; clear under the open sky
	while not _bell_queue.is_empty() and _bell_t >= float(_bell_queue[0]):
		_bell_queue.pop_front()
		bell_player.pitch_scale = 1.0 + rng.randf_range(-0.004, 0.004)
		bell_player.volume_db = rng.randf_range(-1.6, 0.4) + 4.0
		bell_player.play()
		if log.size() < 4000:
			log.append([snappedf(director.t, 0.01), "bell"])
	var room: Dictionary = main.session.rooms.room(main.session.room_id)
	var indoor: bool = bool(room.get("indoor", false)) and String(room.get("acoustic", "")) != "church"
	var dist: float = ear.distance_to(_bell_pos)
	bell_lpf.cutoff_hz = lerpf(bell_lpf.cutoff_hz, 900.0 if indoor else clampf(16000.0 / (1.0 + dist / 60.0), 2400.0, 16000.0), 1.0 - exp(-4.0 * dt))
	# footsteps of people walking near Adso, hooves of the mules
	for id: String in director.actors.keys():
		var ac: Actor = director.actors[id]
		if not ac.present:
			continue
		var p: Vector3 = ac.pos
		var d: float = Vector2(p.x - ear.x, p.z - ear.z).length()
		if d > 16.0:
			continue
		var last: Vector3 = _stride.get(id + ":p", p)
		_stride[id + ":p"] = p
		var moved: float = Vector2(p.x - last.x, p.z - last.z).length()
		_stride[id] = float(_stride.get(id, 0.0)) + moved
		var is_mule: bool = id.begins_with("mule")
		var stride: float = 0.62 if is_mule else 0.78
		if float(_stride[id]) > stride:
			_stride[id] = 0.0
			var y: float = (p.y if not is_nan(p.y) else main.cells.terrain_height_at(p.x, p.z))
			if is_nan(y):
				y = 0.0
			if is_mule:
				play("hoof", Vector3(p.x, y + 0.05, p.z), -12.0, 0.9, 2.5)
			else:
				var surf: String = "wood" if y > 4.5 else ("stone" if main.session.rooms.classify_feet(Vector3(p.x, y, p.z)).get("id", "") in ["church", "choir", "cloister", "gate-passage"] else "snowPacked")
				_npc_step(surf, Vector3(p.x, y + 0.05, p.z), -15.0 if d > 6.0 else -11.0)
	# far ambience: a hammer at the smithy, crows, a cough, a page
	_amb_t -= dt
	if _amb_t <= 0.0:
		_amb_t = rng.randf_range(7.0, 16.0)
		var D: Dictionary = main.content.doc("sounds").get("day1a", {})
		var r: float = rng.randf()
		if r < 0.25 and director.beat in ["road", "sext_gate", "gate_open", "reception", "to_cell", "second_bundle", "free"]:
			_hammer = rng.randi_range(4, 9)
			_hammer_t = 0.0
		elif r < 0.55:
			var crows: Array = D.get("crows", [])
			if not crows.is_empty():
				var c: Array = crows[rng.randi_range(0, crows.size() - 1)]
				play("caw", Vector3(float(c[0]), float(c[1]), float(c[2])), -4.0, 1.0, 18.0)
		elif director.beat in ["free", "after_nones"] and main.session.room_id in ["cloister", "garth"]:
			var any: Actor = null
			for b: Dictionary in director.data.get("anonymous", []):
				var ab: Actor = director.a(String(b["id"]))
				if ab.present and not ab.moving and Vector2(ab.pos.x - ear.x, ab.pos.z - ear.z).length() < 14.0:
					any = ab
					break
			if any:
				play("pageTurn" if r < 0.8 else "cough", Vector3(any.pos.x, 1.3, any.pos.z), -14.0, 1.0, 2.0)
	if _hammer > 0:
		_hammer_t -= dt
		if _hammer_t <= 0.0:
			_hammer -= 1
			_hammer_t = rng.randf_range(0.85, 1.05)
			var sm: Array = main.content.doc("sounds").get("day1a", {}).get("smithy", [78.5, 1.4, 56.9])
			play("anvil", Vector3(float(sm[0]), float(sm[1]), float(sm[2])), 2.0, 1.0, 26.0)

func _npc_step(surface: String, at: Vector3, db: float) -> void:
	var ad: AudioDirector = main.audio
	var bank: Array = ad.step_banks.get(surface, ad.step_banks.get("stone", []))
	if bank.is_empty():
		return
	at = _finite(at, "step")
	if is_nan(at.x):
		return
	var a: AudioStreamPlayer3D = pool[_pi % pool.size()]
	_pi += 1
	a.stream = bank[rng.randi_range(0, bank.size() - 1)]
	a.global_position = at
	a.volume_db = db
	a.pitch_scale = rng.randf_range(0.94, 1.04)
	a.unit_size = 2.5
	a.play()
