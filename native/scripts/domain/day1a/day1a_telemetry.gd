class_name Day1aTelemetry
extends RefCounted
## Local playtest instrumentation (never shown, never sent anywhere): the
## distance to William, his waits and Adso's overtakes, the first solo
## route (hesitation, wrong turns, time), the free period, people met,
## whether Adso followed Nones into church and how soon he watched the
## house change. Written by the adapter to user://day1a/telemetry/.

var samples: Array = []          # [t, beat, gap_m, william_state, player_speed]
var events: Array = []
var beat_times: Dictionary = {}  # beat -> {"enter": t, "exit": t}
var met: Dictionary = {}         # person -> first t within 4 m
var solo: Dictionary = {}        # first solo route record
var nones: Dictionary = {}
var free: Dictionary = {}
var _sample_t: float = -1.0

func event(t: float, kind: String, info: Dictionary = {}) -> void:
	var e: Dictionary = {"t": snappedf(t, 0.01), "kind": kind}
	e.merge(info)
	events.append(e)
	if events.size() > 6000:
		events = events.slice(events.size() - 5000)

func beat(t: float, old: String, new: String) -> void:
	if old != "" and beat_times.has(old):
		beat_times[old]["exit"] = snappedf(t, 0.01)
	beat_times[new] = {"enter": snappedf(t, 0.01)}
	event(t, "beat", {"from": old, "to": new})

func due(t: float) -> bool:
	return t - _sample_t >= 1.0

## gap: the road lead (+ = William ahead) or, later, the plain distance;
## lead: from reception on, William's lead along the way to the cell
func sample(t: float, beat_id: String, gap: float, wstate: String, pspeed: float, lead: float = NAN) -> void:
	if not due(t):
		return
	_sample_t = t
	var row: Array = [snappedf(t, 0.1), beat_id, snappedf(gap, 0.01), wstate, snappedf(pspeed, 0.01)]
	if not is_nan(lead):
		row.append(snappedf(lead, 0.01))
	samples.append(row)

func meet(t: float, person: String) -> void:
	if not met.has(person):
		met[person] = snappedf(t, 0.1)
		event(t, "met", {"person": person})

func summary() -> Dictionary:
	# the road: William's lead measured along the route (+ = he is ahead);
	# reception and the walk to the cell: plain distance to William
	var gaps: Array = []
	var walk: Array = []
	var lead: Array = []
	for s: Array in samples:
		if s[1] == "road":
			gaps.append(float(s[2]))
		elif s[1] in ["reception", "to_cell"]:
			walk.append(absf(float(s[2])))
			if s.size() > 5:
				lead.append(float(s[5]))
	gaps.sort()
	walk.sort()
	lead.sort()
	var behind: int = lead.filter(func(x: float) -> bool: return x > 2.0).size()
	var ahead: int = lead.filter(func(x: float) -> bool: return x < -2.0).size()
	var waits: Array = events.filter(func(e: Dictionary) -> bool: return e["kind"] == "william_wait")
	var overt: Array = events.filter(func(e: Dictionary) -> bool: return e["kind"] == "overtake")
	var durations: Dictionary = {}
	for b: String in beat_times.keys():
		var r: Dictionary = beat_times[b]
		if r.has("exit"):
			durations[b] = snappedf(float(r["exit"]) - float(r["enter"]), 0.1)
	return {
		"william_lead_on_road_m": {"mean": _mean(gaps), "p10": _pct(gaps, 0.1), "p50": _pct(gaps, 0.5), "p90": _pct(gaps, 0.9), "max": gaps[-1] if not gaps.is_empty() else 0.0, "min": gaps[0] if not gaps.is_empty() else 0.0, "samples": gaps.size()},
		"william_distance_reception_m": {"mean": _mean(walk), "p50": _pct(walk, 0.5), "p90": _pct(walk, 0.9), "samples": walk.size()},
		# + = William (with the cellarer) nearer the cell than Adso, − = Adso has gone on ahead
		"william_lead_to_cell_m": {"mean": _mean(lead), "p10": _pct(lead, 0.1), "p50": _pct(lead, 0.5), "p90": _pct(lead, 0.9), "share_william_ahead": snappedf(float(behind) / maxf(1.0, lead.size()), 0.01), "share_adso_ahead": snappedf(float(ahead) / maxf(1.0, lead.size()), 0.01), "samples": lead.size()},
		"william_waits": waits.size(), "william_wait_points": waits.map(func(e: Dictionary) -> String: return String(e.get("look_point", ""))),
		"overtakes": overt.size(),
		"solo_route": solo, "free_period": free, "nones": nones,
		"people_met": met, "beat_durations_s": durations,
	}

static func _mean(a: Array) -> float:
	if a.is_empty():
		return 0.0
	var s := 0.0
	for x: float in a:
		s += x
	return snappedf(s / a.size(), 0.01)

static func _pct(a: Array, p: float) -> float:
	if a.is_empty():
		return 0.0
	return snappedf(float(a[clampi(int(p * (a.size() - 1)), 0, a.size() - 1)]), 0.01)

func to_dict() -> Dictionary:
	return {"samples": samples.duplicate(true), "events": events.duplicate(true), "beat_times": beat_times.duplicate(true), "met": met.duplicate(), "solo": solo.duplicate(true), "nones": nones.duplicate(true), "free": free.duplicate(true)}

func restore(d: Dictionary) -> void:
	samples = (d.get("samples", []) as Array).duplicate(true)
	events = (d.get("events", []) as Array).duplicate(true)
	beat_times = (d.get("beat_times", {}) as Dictionary).duplicate(true)
	met = (d.get("met", {}) as Dictionary).duplicate()
	solo = (d.get("solo", {}) as Dictionary).duplicate(true)
	nones = (d.get("nones", {}) as Dictionary).duplicate(true)
	free = (d.get("free", {}) as Dictionary).duplicate(true)
	event(0.0, "restored", {})
