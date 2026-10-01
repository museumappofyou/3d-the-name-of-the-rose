class_name InteractionProbe
extends Node
## Chooses the interaction in reach (main.js nearest()/visibleInteraction):
## within its radius, |Δy| ≤ 2.8 m, an unobstructed sight ray from the eye
## (ignoring the last 0.18 m), and for small targets (radius < 4) facing the
## eye direction (> 0.3) unless closer than 1.3 m. The best score wins.
## Bound by stable interaction ids from content; never by node names.

signal prompt_changed(id: String, label: String)

var session: GameSession
var player: PlayerController
var targets: Array = []          # {id, pos: Vector3, radius, present: Callable}
var current: String = ""
var current_label: String = ""
var enabled: bool = true

func setup(s: GameSession, p: PlayerController, content: ContentData) -> void:
	session = s
	player = p
	for it: Dictionary in content.doc("interactions").get("interactions", []):
		var t: Dictionary = {"id": it["id"], "pos": content.anchor_pos(String(it["anchor_id"])), "radius": float(it["radius"]), "present": Callable()}
		targets.append(t)

func set_presence(id: String, present: Callable, pos: Vector3 = Vector3.INF) -> void:
	for t: Dictionary in targets:
		if t["id"] == id:
			t["present"] = present
			if pos != Vector3.INF:
				t["pos"] = pos

func nearest() -> String:
	var cam: Vector3 = player.eye_position()
	var fwd: Vector3 = -player.camera.global_transform.basis.z
	var best := ""
	var best_score := -INF
	for t: Dictionary in targets:
		if (t["present"] as Callable).is_valid() and not bool((t["present"] as Callable).call()):
			continue
		var p: Vector3 = t["pos"]
		var d: float = p.distance_to(cam)
		var r: float = t["radius"]
		if d > r or absf(p.y - cam.y) > 2.8 or not visible_from(cam, p, d):
			continue
		var small: bool = r < 4.0
		var facing: float = (p - cam).normalized().dot(fwd)
		if small and facing < 0.3 and d > 1.3:
			continue
		var score: float = (2.0 if small else 0.0) + facing - d / r
		if score > best_score:
			best_score = score
			best = t["id"]
	return best

func visible_from(cam: Vector3, p: Vector3, d: float) -> bool:
	if d < 0.25:
		return true
	var dir: Vector3 = (p - cam).normalized()
	var q := PhysicsRayQueryParameters3D.create(cam + dir * 0.08, cam + dir * maxf(0.09, d - 0.18), 1 | 2)
	q.exclude = [player.get_rid()]
	q.hit_back_faces = true
	return player.get_world_3d().direct_space_state.intersect_ray(q).is_empty()

func _physics_process(_dt: float) -> void:
	if not enabled or session == null:
		return
	var id: String = nearest()
	var label: String = session.interaction_label(id) if id != "" else ""
	if id != current or label != current_label:
		current = id
		current_label = label
		prompt_changed.emit(id, label)

## Normal E/A-button interaction; returns the domain result.
func activate() -> Dictionary:
	if current == "" or nearest() != current:
		return {}
	return session.interact(current)
