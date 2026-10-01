class_name OfficeTransport
extends RefCounted
## One logical transport for the sung office (port of chant.js Office):
## when an office begins the choir starts after a short silence, pieces
## follow with the liturgy's rests, and when the office ends the phrase in
## progress dies away. Keyed only by the office id: a time change inside the
## same office, a doorway or a cell load never restarts it. The adapter
## executes the returned commands on a streamed AudioStreamPlayer.

var chant_for: Dictionary = {}
var streams: Dictionary = {}
var start_delay: Vector2 = Vector2(2, 4)
var rest_between: Vector2 = Vector2(3.5, 8)
var rest_after_cycle: Vector2 = Vector2(45, 95)
var rng := RandomNumberGenerator.new()

var hour: String = ""          # office being sung ("" = none)
var k: int = 0
var next_at: float = 0.0
var end_at: float = 0.0
var playing: String = ""       # stream id of the piece in progress
var dying: bool = false
var gain_target: float = 0.0
var starts: int = 0            # pieces started (telemetry/tests)

func _init(sounds_doc: Dictionary, seed_value: int = 1) -> void:
	var o: Dictionary = sounds_doc.get("office", {})
	chant_for = o.get("chant_for", {})
	streams = sounds_doc.get("streams", {})
	for pair: Array in [["start_delay_s", "start_delay"], ["rest_between_s", "rest_between"], ["rest_after_cycle_s", "rest_after_cycle"]]:
		if o.has(pair[0]):
			set(pair[1], Vector2(o[pair[0]][0], o[pair[0]][1]))
	rng.seed = seed_value
	next_at = rng.randf_range(start_delay.x, start_delay.y)

## Returns commands: {"op": "play", "stream", "from", "duration"} |
## {"op": "gain", "target", "tc"}.
func tick(now: float, office: String) -> Array:
	var cmds: Array = []
	if playing != "" and now >= end_at:
		playing = ""
	if office == "":
		if not dying:
			dying = true
			gain_target = 0.0
			cmds.append({"op": "gain", "target": 0.0, "tc": 2.2})
		return cmds
	if dying:
		dying = false
		next_at = maxf(next_at, now + rng.randf_range(start_delay.x, start_delay.y))
	if office != hour:
		hour = office
		k = 0
	if gain_target != 1.0:
		gain_target = 1.0
		cmds.append({"op": "gain", "target": 1.0, "tc": 1.2})
	if now < next_at or (playing != "" and now < end_at):
		return cmds
	var list: Array = chant_for.get(office, ["chant:deus"])
	if list.is_empty():
		return cmds
	var id: String = list[k % list.size()]
	var s: Dictionary = streams.get(id, {})
	if s.is_empty():
		return cmds
	k += 1
	var clip: Array = s.get("clip", [0.0, 30.0])
	var dur: float = float(clip[1])
	playing = id
	end_at = now + 0.05 + dur
	starts += 1
	cmds.append({"op": "play", "stream": id, "from": float(clip[0]), "duration": dur})
	var end_of_cycle: bool = k % list.size() == 0
	next_at = end_at + (rng.randf_range(rest_after_cycle.x, rest_after_cycle.y) if end_of_cycle else rng.randf_range(rest_between.x, rest_between.y))
	return cmds
