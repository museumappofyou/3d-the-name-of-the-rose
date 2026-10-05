class_name AudioDirector
extends Node3D
## Native audio for the slice:
##  * the sung office: one OfficeTransport (domain) drives one streamed
##    AudioStreamPlayer3D. ChurchPath (domain port of churchPaths.js) moves
##    its apparent source to the openings and sets level/low-pass; walking
##    through rooms only changes that path — the stream is never restarted;
##  * footsteps from the surface under the feet (browser banks, cut clips);
##  * the exterior wind bed, muffled indoors;
##  * room reverb from the acoustic space of the current room volume;
##  * the altar creak.
## Buses are created at runtime: Chant (low-pass), World (reverb), Ambience.

var session: GameSession
var content: ContentData
var player: PlayerController
var chant: AudioStreamPlayer3D
var wind: AudioStreamPlayer
var creak: AudioStreamPlayer3D
var steps: Array[AudioStreamPlayer3D] = []
var step_banks: Dictionary = {}
var chant_lpf: AudioEffectLowPassFilter
var amb_lpf: AudioEffectLowPassFilter
var reverb: AudioEffectReverb
var piece_started: float = -1.0
var piece_dur: float = 0.0
var transport_gain: float = 0.0
var transport_target: float = 0.0
var transport_tc: float = 1.0
var path: Dictionary = {}
var space_params: Dictionary = {}
var _space: String = ""
var _step_i: int = 0
var _last_clip: Dictionary = {}
var rng := RandomNumberGenerator.new()
var telemetry: Array = []          # sampled path/transport state (bench reports)
## Day-1A: church openings Day 1 keeps shut (no direct path through them)
var closed_doors: PackedStringArray = []
var _stream_id: String = "chant:deus"
var _lvl: float = 1.0
var restarts: int = 0              # stream (re)starts, counted for the office test
var muted: bool = false
## optional: which office the choir is singing now (Day-1A: from the
## director, so Nones starts when the brothers are in their stalls)
var office_fn: Callable
var _chant_nan_warned: bool = false

func setup(s: GameSession, c: ContentData, p: PlayerController) -> void:
	session = s
	content = c
	player = p
	rng.seed = 11
	_buses()
	var snd: Dictionary = c.doc("sounds")
	chant = AudioStreamPlayer3D.new()
	chant.name = "office_chant"
	chant.stream = load(String(snd["streams"]["chant:deus"]["native"]))
	chant.attenuation_model = AudioStreamPlayer3D.ATTENUATION_DISABLED
	chant.max_distance = 0.0
	chant.doppler_tracking = AudioStreamPlayer3D.DOPPLER_TRACKING_DISABLED
	chant.bus = "Chant"
	chant.volume_db = -80.0
	add_child(chant)
	wind = AudioStreamPlayer.new()
	wind.name = "wind"
	var ws: AudioStream = load(String(snd["streams"]["wind"]["native"]))
	if ws is AudioStreamMP3:
		(ws as AudioStreamMP3).loop = true
		(ws as AudioStreamMP3).loop_offset = float(snd["streams"]["wind"]["clip"][0])
	wind.stream = ws
	wind.bus = "Ambience"
	wind.volume_db = -14.0
	add_child(wind)
	wind.play(float(snd["streams"]["wind"]["clip"][0]))
	creak = AudioStreamPlayer3D.new()
	creak.stream = load("res://assets/audio/creak.wav")
	creak.bus = "World"
	creak.unit_size = 4.0
	creak.position = c.anchor_pos("altar.interact")
	add_child(creak)
	for i: int in 4:
		var a := AudioStreamPlayer3D.new()
		a.bus = "World"
		a.unit_size = 3.0
		a.max_polyphony = 1
		add_child(a)
		steps.append(a)
	for bank: String in snd["steps"]["banks"].keys():
		var surf: String = bank.get_slice(":", 1)
		var list: Array[AudioStream] = []
		var i := 0
		while ResourceLoader.exists("res://assets/audio/steps/%s_%02d.wav" % [surf, i]):
			list.append(load("res://assets/audio/steps/%s_%02d.wav" % [surf, i]))
			i += 1
		step_banks[surf] = list
	space_params = c.doc("locations").get("acoustic_spaces", {})
	p.stepped.connect(_on_step)

func _buses() -> void:
	for name: String in ["Chant", "World", "Ambience"]:
		if AudioServer.get_bus_index(name) >= 0:
			continue
		AudioServer.add_bus()
		var idx: int = AudioServer.bus_count - 1
		AudioServer.set_bus_name(idx, name)
		AudioServer.set_bus_send(idx, "Master")
	chant_lpf = AudioEffectLowPassFilter.new()
	chant_lpf.cutoff_hz = 8000.0
	AudioServer.add_bus_effect(AudioServer.get_bus_index("Chant"), chant_lpf)
	reverb = AudioEffectReverb.new()
	AudioServer.add_bus_effect(AudioServer.get_bus_index("World"), reverb)
	amb_lpf = AudioEffectLowPassFilter.new()
	amb_lpf.cutoff_hz = 12000.0
	AudioServer.add_bus_effect(AudioServer.get_bus_index("Ambience"), amb_lpf)

func play_sound(id: String) -> void:
	if id == "creak":
		creak.play()

func _on_step(surface: String, feet: Vector3, running: bool) -> void:
	var alias: Dictionary = content.doc("sounds")["steps"].get("surface_alias", {})
	var s: String = String(alias.get(surface, surface))
	var bank: Array = step_banks.get(s, step_banks.get("stone", []))
	if bank.is_empty():
		return
	var k: int = rng.randi_range(0, bank.size() - 1)
	if bank.size() > 1 and k == int(_last_clip.get(s, -1)):
		k = (k + 1) % bank.size()
	_last_clip[s] = k
	var a: AudioStreamPlayer3D = steps[_step_i % steps.size()]
	_step_i += 1
	a.stream = bank[k]
	a.global_position = feet + Vector3(0, 0.05, 0)
	var trim: float = float(content.doc("sounds")["steps"]["play"].get(s, [12000, 0.8])[1])
	a.volume_db = linear_to_db(trim * (1.15 if running else 0.9) * 0.6)
	a.play()

func _process(dt: float) -> void:
	if session == null:
		return
	var now: float = session.session_time
	# --- office transport (domain) ---
	for c: Dictionary in session.office.tick(now, String(office_fn.call()) if office_fn.is_valid() else session.clock.office()):
		match c["op"]:
			"play":
				piece_started = now
				piece_dur = float(c["duration"])
				var sid: String = String(c.get("stream", "chant:deus"))
				if sid != _stream_id:
					var rec: Dictionary = content.doc("sounds")["streams"].get(sid, content.doc("sounds").get("day1a", {}).get("streams", {}).get(sid, {}))
					if rec.has("native"):
						chant.stream = load(String(rec["native"]))
						_stream_id = sid
						_lvl = float(rec.get("lvl", 1.0))
				chant.play(float(c["from"]))
				restarts += 1
			"gain":
				transport_target = float(c["target"])
				transport_tc = float(c["tc"])
	transport_gain = lerpf(transport_gain, transport_target, 1.0 - exp(-dt / maxf(0.05, transport_tc)))
	if chant.playing and piece_started >= 0.0 and now - piece_started > piece_dur + 0.05:
		chant.stop()
	# --- acoustic path for the current listener ---
	var ear: Vector3 = player.eye_position()
	var room: Dictionary = session.rooms.room(session.room_id)
	var doors: Array = []
	for d: Dictionary in content.doc("anchors").get("doors_in_slice", []):
		if String(d["id"]) in ["church:westN", "church:westS", "church:north", "church:cloister"]:
			var dd: Dictionary = d.duplicate()
			dd["open"] = 0.0 if closed_doors.has(String(d["id"])) else 1.0
			doors.append(dd)
	var src: Array = content.doc("sounds")["office"]["source_emitter"]["pos"]
	path = session.church_path.evaluate(ear, session.room_id, bool(room.get("indoor", false)), Vector3(src[0], src[1], src[2]), doors, session.portals.open_amount("church:altar"))
	var cp: Vector3 = path["pos"]
	if is_finite(cp.x) and is_finite(cp.y) and is_finite(cp.z):
		chant.global_position = cp
	elif not _chant_nan_warned:
		_chant_nan_warned = true
		push_warning("chant path position not finite in room '%s'" % session.room_id)
	var env: float = 1.0
	if piece_started >= 0.0:
		var t: float = now - piece_started
		env = clampf(minf(t / 0.6, (piece_dur - t) / 1.4), 0.0, 1.0)
	# churchPath's level is relative to the browser panner's inverse-distance
	# gain (ref / max(ref, d)); Godot's attenuation is disabled, so apply it
	var ref: float = 4.0
	var pan_gain: float = ref / maxf(ref, (path["pos"] as Vector3).distance_to(ear))
	var lvl: float = float(path["level"]) * pan_gain * transport_gain * env * _lvl
	chant.volume_db = -80.0 if muted or not is_finite(lvl) or lvl < 1e-5 else linear_to_db(lvl)
	var lp: float = float(path["lp"])
	if is_finite(lp):
		chant_lpf.cutoff_hz = clampf(lp, 200.0, 20000.0)
	# --- room acoustics / ambience ---
	var space: String = String(room.get("acoustic", "exterior"))
	if space != _space:
		_space = space
	var P: Dictionary = space_params.get(space, space_params.get("exterior", {}))
	var k: float = 1.0 - exp(-dt * 2.0)
	reverb.room_size = lerpf(reverb.room_size, clampf(float(P.get("rt", 0.35)) / 5.0, 0.05, 0.95), k)
	reverb.damping = lerpf(reverb.damping, clampf(1.0 - float(P.get("fc1", 2500.0)) / 3000.0, 0.1, 0.95), k)
	reverb.wet = lerpf(reverb.wet, float(P.get("wet", 0.07)), k)
	reverb.dry = lerpf(reverb.dry, float(P.get("dry", 1.0)), k)
	reverb.predelay_msec = float(P.get("pre", 0.01)) * 1000.0
	var indoor: float = float(room.get("darkness", 0.0)) if bool(room.get("indoor", false)) else 0.0
	var under: bool = session.room_id == "ossuary"
	wind.volume_db = -80.0 if muted else linear_to_db(maxf(0.0005, 0.22 * (1.0 - indoor * 0.85) * (0.15 if under else 1.0)))
	amb_lpf.cutoff_hz = lerpf(amb_lpf.cutoff_hz, 900.0 if indoor > 0.5 else 12000.0, k)
	if Engine.get_process_frames() % 15 == 0:
		telemetry.append({"t": now, "room": session.room_id, "office": session.clock.office(), "level": path["level"], "lp": path["lp"], "inside": path["inside"], "pos": [path["pos"].x, path["pos"].y, path["pos"].z], "playing": chant.playing, "position": chant.get_playback_position() if chant.playing else -1.0, "restarts": restarts, "gain": transport_gain})
		if telemetry.size() > 20000:
			telemetry = telemetry.slice(10000)
