class_name AltarPortal
extends Node3D
## The skull altar (church.js skullAltarPivot): a block turning about a
## hidden vertical axis at its west end. Visual rotation, the dynamic
## collider and the acoustic leak all read GameSession.portals
## ("church:altar"); this node holds no state of its own.

var session: GameSession
var pivot: Node3D
var body: AnimatableBody3D
var shape: CollisionShape3D
var per_open: float = -1.45
var portal_id: String = "church:altar"

func setup(s: GameSession, content: ContentData) -> void:
	session = s
	var hinge: Vector3 = content.anchor_pos("altar.hinge")
	position = hinge
	per_open = float(content.portal(portal_id).get("rotation_per_open_rad", -1.45))
	pivot = Node3D.new()
	pivot.name = "pivot"
	add_child(pivot)
	var vis: Node3D = (load("res://assets/world/dynamic/altar_pivot.glb") as PackedScene).instantiate()
	pivot.add_child(vis)
	for mi: Node in vis.find_children("*", "MeshInstance3D", true, false):
		# dynamic: never baked into static GI or occluders
		(mi as MeshInstance3D).gi_mode = GeometryInstance3D.GI_MODE_DYNAMIC
	var col: Dictionary = content.anchor("altar.collider")
	var mn := Vector3(col["min"][0], col["min"][1], col["min"][2])
	var mx := Vector3(col["max"][0], col["max"][1], col["max"][2])
	body = AnimatableBody3D.new()
	body.name = "altar_collider"
	body.collision_layer = 2
	body.collision_mask = 0
	body.sync_to_physics = false
	body.set_meta("surface", "churchStone")
	shape = CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = mx - mn
	shape.shape = box
	shape.position = (mn + mx) / 2.0
	body.add_child(shape)
	pivot.add_child(body)
	_apply()

func _physics_process(_dt: float) -> void:
	_apply()

func _apply() -> void:
	if session == null:
		return
	pivot.rotation.y = session.portals.open_amount(portal_id) * per_open
	var solid: bool = session.portals.collider_enabled(portal_id)
	if shape.disabled == solid:
		shape.set_deferred("disabled", not solid)
