class_name AlinardoPresence
extends Node3D
## Alinardo's presentation on the porch bench. Visible only while the
## routine service says he is there; the logical identity and knowledge do
## not depend on this node existing.

var session: GameSession
var content: ContentData
var figure: CharacterPresentation
var interact_point: Vector3
var present: bool = false
var player_eye: Callable

func setup(s: GameSession, c: ContentData) -> void:
	session = s
	content = c
	var r: Dictionary = c.routine("alinardo")
	var slot: Dictionary = r["slot"]
	var seat: Vector3 = c.anchor_pos(String(slot["anchor_id"]))
	position = seat
	rotation.y = float(c.anchor(String(slot["anchor_id"])).get("ry", 0.0))
	interact_point = c.anchor_pos("alinardo.interact")
	figure = CharacterPresentation.new()
	figure.content = c
	figure.person_id = "alinardo"
	var pres: Dictionary = r.get("presentation", {})
	figure.seed_value = int(pres.get("seed", 41))
	figure.hood_up = String(pres.get("hood", "down")) == "up"
	add_child(figure)
	figure.build()
	figure.play_pose(String(slot["pose"]), float(pres.get("phase", 0.0)))
	_refresh()

func _refresh() -> void:
	present = session.available("alinardo")
	visible = present

func _process(dt: float) -> void:
	_refresh()
	if not present:
		return
	var eye: Variant = player_eye.call() if player_eye.is_valid() else null
	var within: float = float(content.routine("alinardo").get("look_at_player_within_m", 3.2))
	figure.look_target = eye if eye != null and (eye as Vector3).distance_to(global_position) < within else null
	figure.advance_presentation(dt)
