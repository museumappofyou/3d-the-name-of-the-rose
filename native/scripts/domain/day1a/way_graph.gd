class_name WayGraph
extends RefCounted
## Authored walking network for the Day-1A footprint (shared/scenarios/day1a
## "nodes" and "edges"): named ground points joined by straight, obstacle-free
## legs. People route along it with A*; nothing here knows about scenes.
## Points are world x/z (+ an optional fixed y for upper floors/stairs).

var nodes: Dictionary = {}          # id -> Vector3 (y = NAN when ground-resolved)
var adj: Dictionary = {}            # id -> Array[String]

func _init(doc: Dictionary = {}) -> void:
	for id: String in (doc.get("nodes", {}) as Dictionary).keys():
		var p: Array = doc["nodes"][id]
		nodes[id] = Vector3(float(p[0]), float(p[2]) if p.size() > 2 else NAN, float(p[1]))
		adj[id] = []
	for e: Array in doc.get("edges", []):
		connect_nodes(String(e[0]), String(e[1]))

func connect_nodes(a: String, b: String) -> void:
	if not nodes.has(a) or not nodes.has(b):
		push_error("[waygraph] unknown edge %s-%s" % [a, b])
		return
	if not (adj[a] as Array).has(b):
		(adj[a] as Array).append(b)
		(adj[b] as Array).append(a)

func pos(id: String) -> Vector3:
	return nodes.get(id, Vector3.ZERO)

func _flat(a: Vector3, b: Vector3) -> float:
	return Vector2(a.x - b.x, a.z - b.z).length()

## Nearest node to a world point (x/z distance; upper-floor nodes only win
## when the point is on that floor).
func nearest(p: Vector3) -> String:
	var best := ""
	var bd := INF
	for id: String in nodes.keys():
		var n: Vector3 = nodes[id]
		var d: float = _flat(n, p)
		if not is_nan(n.y) and absf(n.y - p.y) > 2.2:
			d += 50.0
		if d < bd:
			bd = d
			best = id
	return best

## Node ids from `from_id` to `to_id` (A*), [] if unreachable.
func route(from_id: String, to_id: String) -> PackedStringArray:
	if from_id == to_id:
		return PackedStringArray([from_id])
	var open: Array = [from_id]
	var came: Dictionary = {}
	var g: Dictionary = {from_id: 0.0}
	var f: Dictionary = {from_id: _flat(pos(from_id), pos(to_id))}
	while not open.is_empty():
		var cur: String = open[0]
		for o: String in open:
			if float(f.get(o, INF)) < float(f.get(cur, INF)):
				cur = o
		if cur == to_id:
			var out: PackedStringArray = [cur]
			while came.has(cur):
				cur = came[cur]
				out.insert(0, cur)
			return out
		open.erase(cur)
		for nb: String in adj[cur]:
			var tg: float = float(g[cur]) + _flat(pos(cur), pos(nb))
			if tg < float(g.get(nb, INF)):
				came[nb] = cur
				g[nb] = tg
				f[nb] = tg + _flat(pos(nb), pos(to_id))
				if not open.has(nb):
					open.append(nb)
	return PackedStringArray()

## Polyline from a world point to a node: the point, then the route from the
## nearest node (skipping that node when it lies behind the walker).
func path_to(from: Vector3, to_id: String) -> Array[Vector3]:
	var out: Array[Vector3] = [from]
	var start: String = nearest(from)
	var ids: PackedStringArray = route(start, to_id)
	if ids.is_empty():
		out.append(pos(to_id))
		return out
	for i: int in ids.size():
		var p: Vector3 = pos(ids[i])
		if i == 0 and ids.size() > 1:
			# drop the first node if going there means doubling back
			var nxt: Vector3 = pos(ids[1])
			if _flat(from, nxt) < _flat(p, nxt):
				continue
		out.append(p)
	return out

func length_of(pts: Array[Vector3]) -> float:
	var L := 0.0
	for i: int in range(1, pts.size()):
		L += _flat(pts[i - 1], pts[i])
	return L
