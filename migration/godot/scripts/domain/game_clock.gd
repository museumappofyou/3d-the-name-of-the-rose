class_name GameClock
extends RefCounted
## Simulation clock: day and decimal hour, independent of frames and of
## scene residency. Rate 0 keeps the hour still (the browser reference sets
## time explicitly); a positive rate advances game hours per real second.

signal phase_changed(old_id: String, new_id: String)
signal office_changed(old_id: String, new_id: String)
signal time_set(hours: float, jumped: bool)

var horarium: Horarium
var day: int = 1
var hours: float = 15.0
var rate: float = 0.0
var paused: bool = false
var _phase_key: String = ""
var _office: String = ""

func _init(h: Horarium, start_hours: float = 15.0) -> void:
	horarium = h
	hours = Horarium.wrap_hours(start_hours)
	_phase_key = _key()
	_office = horarium.office_id(hours)

func _key() -> String:
	var p: Dictionary = horarium.phase_at(hours)
	return "%s@%s" % [p["id"], p["t0"]]

func set_time(h: float, jumped: bool = true) -> void:
	hours = Horarium.wrap_hours(h)
	time_set.emit(hours, jumped)
	_check()

func advance(real_dt: float) -> void:
	if paused or rate <= 0.0:
		return
	var nh: float = hours + real_dt * rate
	if nh >= 24.0:
		day += 1
	hours = Horarium.wrap_hours(nh)
	_check()

func _check() -> void:
	var k: String = _key()
	if k != _phase_key:
		var old: String = _phase_key.get_slice("@", 0)
		_phase_key = k
		phase_changed.emit(old, k.get_slice("@", 0))
	var o: String = horarium.office_id(hours)
	if o != _office:
		var old_o: String = _office
		_office = o
		office_changed.emit(old_o, o)

func office() -> String:
	return _office

func phase_id() -> String:
	return String(horarium.phase_at(hours)["id"])
