class_name Day1aWorld
extends Node3D
## Day-1A scenario state laid over the exported abbey (GAME_DESIGN.md:
## "a native case can add a temporary object/door-state overlay"):
##  * the great gate: two hinged leaves built from the browser's leaf size,
##    closed and barred at arrival, opened by the porter (into the passage,
##    clear of the arch reveals); its collider follows the leaves;
##  * doors Day 1 keeps shut get plank leaves (people and custom close them,
##    never invisible walls); the guests' doors stay open;
##  * the reconstructed hidden postern is sealed with wall (spoiler policy);
##  * the garden hedges collide (exported mesh as the collision shape);
##  * the cell's table food is lifted out of the exported cell and appears
##    only when Tebaldo sets down his tray;
##  * scenario props (bundle, chest, hose, buckets, the choir book).

var director: Day1aDirector
var main: Node3D
var data: Dictionary
var leaf_n: Node3D
var leaf_s: Node3D
var bar: MeshInstance3D
var gate_body: StaticBody3D
var gate_shape: CollisionShape3D
var doors: Dictionary = {}           # id -> {"pivot", "body", "shape", "rec"}
var food: Array[MeshInstance3D] = []
var props: Dictionary = {}           # prop id -> Node3D
var mule_loads: Dictionary = {}      # prop id -> mule id when on a mule
var _door_mat: Material

func setup(m: Node3D, d: Day1aDirector) -> void:
	main = m
	director = d
	data = d.data
	name = "day1a_world"
	_door_mat = load("res://assets/world/materials/door.tres")
	_gate()
	_doors()
	_seal()
	_hedges()
	_food()
	for id: String in ["bedding", "chest", "tray", "hose", "bucket_nuto", "bucket_adso", "choir_book"]:
		var kind: String = {"bedding": "bundle", "chest": "chest", "tray": "tray", "hose": "hose", "bucket_nuto": "bucket", "bucket_adso": "bucket", "choir_book": "book"}[id]
		var mi: MeshInstance3D = Day1aProps.mesh_for(kind)
		var n := Node3D.new()
		n.name = "prop_" + id
		n.add_child(mi)
		n.visible = false
		add_child(n)
		props[id] = n

func _leaf(hinge_z: float, extend: float) -> Node3D:
	var G: Dictionary = data["gate"]
	var pivot := Node3D.new()
	var y0: float = 0.04
	pivot.position = Vector3(float(G["leaves_x"]), y0, hinge_z)
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(float(G["leaf_t"]), float(G["leaf_h"]), float(G["leaf_w"]))
	mi.mesh = bm
	mi.material_override = _door_mat
	mi.position = Vector3(0, float(G["leaf_h"]) / 2.0, extend * float(G["leaf_w"]) / 2.0)
	pivot.add_child(mi)
	# iron bands across the planks
	for yb: float in [0.7, 2.5, 4.3]:
		var band := MeshInstance3D.new()
		var b2 := BoxMesh.new()
		b2.size = Vector3(float(G["leaf_t"]) + 0.03, 0.09, float(G["leaf_w"]) - 0.1)
		band.mesh = b2
		band.material_override = load("res://assets/world/materials/iron.tres")
		band.position = Vector3(0, yb, extend * float(G["leaf_w"]) / 2.0)
		pivot.add_child(band)
	add_child(pivot)
	return pivot

func _gate() -> void:
	var G: Dictionary = data["gate"]
	var jz: Array = G["jambs_z"]
	leaf_n = _leaf(float(jz[0]), 1.0)
	leaf_n.name = "gate_leaf_n"
	leaf_s = _leaf(float(jz[1]), -1.0)
	leaf_s.name = "gate_leaf_s"
	bar = Day1aProps.mesh_for("bar")
	bar.name = "gate_bar"
	add_child(bar)
	gate_body = StaticBody3D.new()
	gate_body.name = "gate_collider"
	gate_body.collision_layer = 2
	gate_shape = CollisionShape3D.new()
	var bs := BoxShape3D.new()
	bs.size = Vector3(0.3, 5.0, absf(float(jz[1]) - float(jz[0])))
	gate_shape.shape = bs
	gate_body.add_child(gate_shape)
	gate_body.position = Vector3(float(G["leaves_x"]), 2.5, (float(jz[0]) + float(jz[1])) / 2.0)
	add_child(gate_body)

func _door_rec(id: String) -> Dictionary:
	for d: Dictionary in main.content.doc("world_day1a").get("doors", []):
		if d["id"] == id:
			return d
	return {}

func _doors() -> void:
	var D: Dictionary = data.get("doors", {})
	for id: String in D.get("closed", []):
		var r: Dictionary = _door_rec(id)
		if r.is_empty():
			continue
		var w: float = float(r["w"])
		var h: float = 2.35 if w <= 1.45 else 2.9
		var nrm := Vector2(float(r["nx"]), float(r["nz"])).normalized()
		var pivot := Node3D.new()
		pivot.name = "door_" + id.replace(":", "_")
		# hinged at one side of the opening, recessed a little from the face
		var side := Vector2(-nrm.y, nrm.x)
		var face: float = float(r.get("th", 0.7)) * 0.5 - 0.12
		var c := Vector2(float(r["x"]), float(r["z"])) + nrm * face
		var hinge: Vector2 = c - side * (w * 0.5)
		pivot.position = Vector3(hinge.x, float(r.get("y", 0.3)) + 0.01, hinge.y)
		pivot.rotation.y = atan2(side.x, side.y)
		var mi := MeshInstance3D.new()
		mi.mesh = _arched_leaf(w - 0.04, h, 0.07)
		mi.material_override = _door_mat
		mi.position = Vector3(0, 0, 0)
		pivot.add_child(mi)
		add_child(pivot)
		var body := StaticBody3D.new()
		body.collision_layer = 2
		var cs := CollisionShape3D.new()
		var bs := BoxShape3D.new()
		bs.size = Vector3(0.12, h, w)
		cs.shape = bs
		body.add_child(cs)
		body.position = Vector3(0, h / 2.0, w / 2.0)
		pivot.add_child(body)
		doors[id] = {"pivot": pivot, "body": body, "shape": cs, "rec": r, "open": 0.0, "passes": (D.get("actors_pass", []) as Array).has(id)}
	for i: int in (D.get("cell_partitions", []) as Array).size():
		var q: Array = D["cell_partitions"][i]
		var pivot2 := Node3D.new()
		pivot2.name = "cell_door_%d" % i
		pivot2.position = Vector3(float(q[0]) - 0.45, float(q[1]) + 0.01, float(q[2]))
		pivot2.rotation.y = PI / 2.0
		var mi2 := MeshInstance3D.new()
		mi2.mesh = _flat_leaf(0.88, 2.0, 0.06)
		mi2.material_override = _door_mat
		pivot2.add_child(mi2)
		var body2 := StaticBody3D.new()
		body2.collision_layer = 2
		var cs2 := CollisionShape3D.new()
		var bs2 := BoxShape3D.new()
		bs2.size = Vector3(0.1, 2.0, 0.9)
		cs2.shape = bs2
		body2.add_child(cs2)
		body2.position = Vector3(0, 1.0, 0.45)
		pivot2.add_child(body2)
		add_child(pivot2)

## a plank leaf with a round head: rectangle to the springing, half disc above
static func _arched_leaf(w: float, h: float, t: float) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var r: float = w * 0.5
	var spring: float = h - r
	var outline := PackedVector2Array([Vector2(0, 0), Vector2(w, 0), Vector2(w, spring)])
	for i: int in range(1, 12):
		var a: float = PI * float(i) / 12.0
		outline.append(Vector2(r + r * cos(a), spring + r * sin(a)))
	outline.append(Vector2(0, spring))
	var tri: PackedInt32Array = Geometry2D.triangulate_polygon(outline)
	for face: float in [-t * 0.5, t * 0.5]:
		var flip: bool = face > 0.0
		for k: int in range(0, tri.size(), 3):
			var ids: Array = [tri[k], tri[k + 1], tri[k + 2]] if flip else [tri[k], tri[k + 2], tri[k + 1]]
			for j: int in ids:
				var p2: Vector2 = outline[j]
				st.set_normal(Vector3(signf(face), 0, 0))
				st.set_uv(Vector2(p2.x, -p2.y))
				st.add_vertex(Vector3(face, p2.y, p2.x))
	for i: int in outline.size():
		var a2: Vector2 = outline[i]
		var b2: Vector2 = outline[(i + 1) % outline.size()]
		for v: Vector3 in [Vector3(-t * 0.5, a2.y, a2.x), Vector3(t * 0.5, a2.y, a2.x), Vector3(t * 0.5, b2.y, b2.x), Vector3(-t * 0.5, a2.y, a2.x), Vector3(t * 0.5, b2.y, b2.x), Vector3(-t * 0.5, b2.y, b2.x)]:
			st.set_uv(Vector2(v.z, -v.y))
			st.add_vertex(v)
	st.generate_normals()
	return st.commit()

static func _flat_leaf(w: float, h: float, t: float) -> ArrayMesh:
	var bm := BoxMesh.new()
	bm.size = Vector3(t, h, w)
	var arr: Array = bm.get_mesh_arrays()
	var verts: PackedVector3Array = arr[Mesh.ARRAY_VERTEX]
	for i: int in verts.size():
		verts[i] += Vector3(0, h * 0.5, w * 0.5)
	arr[Mesh.ARRAY_VERTEX] = verts
	var m := ArrayMesh.new()
	m.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr)
	return m

func _seal() -> void:
	for s: Dictionary in data.get("sealed", []):
		var r: Dictionary = _door_rec(String(s["door"]))
		if r.is_empty():
			continue
		var mi := MeshInstance3D.new()
		mi.name = "sealed_" + String(s["door"])
		var bm := BoxMesh.new()
		bm.size = Vector3(float(r.get("th", 1.5)) + 0.04, 2.25, float(r["w"]) + 0.12)
		mi.mesh = bm
		mi.material_override = load("res://assets/world/materials/wall.tres")
		mi.position = Vector3(float(r["x"]), float(r["y"]) + 1.0, float(r["z"]))
		# local +x (the box's thickness) along the wall's normal
		mi.rotation.y = atan2(-float(r["nz"]), float(r["nx"]))
		add_child(mi)

func _hedges() -> void:
	var c: Dictionary = main.cells.cells.get("flower_garden", {})
	if c.is_empty():
		return
	for mi: Node in (c["visual"] as Node).find_children("*hedge*", "MeshInstance3D", true, false):
		var shape: Shape3D = (mi as MeshInstance3D).mesh.create_trimesh_shape()
		var body := StaticBody3D.new()
		body.name = "hedge_collision"
		body.collision_layer = 1
		body.set_meta("surface", "snowFresh")
		var cs := CollisionShape3D.new()
		cs.shape = shape
		body.add_child(cs)
		add_child(body)
		body.global_transform = (mi as MeshInstance3D).global_transform

## Lift the table food out of the exported cell (by its box on the table top).
func _food() -> void:
	var c: Dictionary = main.cells.cells.get("hospice", {})
	var bx: Array = data.get("table_food_box", [])
	if c.is_empty() or bx.size() != 6:
		return
	var box := AABB(Vector3(float(bx[0]), float(bx[1]), float(bx[2])), Vector3(float(bx[3]) - float(bx[0]), float(bx[4]) - float(bx[1]), float(bx[5]) - float(bx[2])))
	for n: Node in (c["visual"] as Node).find_children("*", "MeshInstance3D", true, false):
		var mi := n as MeshInstance3D
		var key: String = String(mi.name)
		if not (key.contains("bread") or key.contains("onion") or key.contains("earthen") or key.contains("parchment") or key.contains("bark") or key.contains("pottery")):
			continue
		var split: Array = _split(mi, box)
		if split.is_empty():
			continue
		mi.mesh = split[0]
		var fm := MeshInstance3D.new()
		fm.name = "table_food_" + key
		fm.mesh = split[1]
		fm.material_override = mi.get_active_material(0)
		fm.visible = false
		mi.get_parent().add_child(fm)
		fm.transform = mi.transform
		food.append(fm)

## [rest, inside] meshes of the triangles whose centroid is in `box`
static func _split(mi: MeshInstance3D, box: AABB) -> Array:
	var m: Mesh = mi.mesh
	if m.get_surface_count() != 1:
		return []
	var arr: Array = m.surface_get_arrays(0)
	var pos: PackedVector3Array = arr[Mesh.ARRAY_VERTEX]
	var idx: PackedInt32Array = arr[Mesh.ARRAY_INDEX]
	var xf: Transform3D = mi.global_transform
	var keep := PackedInt32Array()
	var take := PackedInt32Array()
	for k: int in range(0, idx.size(), 3):
		var cen: Vector3 = xf * ((pos[idx[k]] + pos[idx[k + 1]] + pos[idx[k + 2]]) / 3.0)
		if box.has_point(cen):
			take.append_array([idx[k], idx[k + 1], idx[k + 2]])
		else:
			keep.append_array([idx[k], idx[k + 1], idx[k + 2]])
	if take.is_empty():
		return []
	var a1: Array = arr.duplicate()
	a1[Mesh.ARRAY_INDEX] = keep
	var a2: Array = arr.duplicate()
	a2[Mesh.ARRAY_INDEX] = take
	var m1 := ArrayMesh.new()
	var m2 := ArrayMesh.new()
	if not keep.is_empty():
		m1.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, a1)
		m1.surface_set_material(0, m.surface_get_material(0))
	m2.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, a2)
	m2.surface_set_material(0, m.surface_get_material(0))
	return [m1, m2]

func _process(dt: float) -> void:
	var o: float = float(director.gate["open"])
	var ang: float = deg_to_rad(96.0) * (o * o * (3.0 - 2.0 * o))
	leaf_n.rotation.y = -ang
	leaf_s.rotation.y = ang
	gate_shape.disabled = o > 0.35
	var G: Dictionary = data["gate"]
	if director.gate["bar"] == "down":
		bar.position = Vector3(float(G["bar_x"]), float(G["bar_y"]), -8.6)
		bar.rotation = Vector3.ZERO
	else:
		var ba: Array = G["bar_at"]
		bar.position = Vector3(float(ba[0]), float(ba[1]) + 0.9, float(ba[2]))
		bar.rotation = Vector3(-1.15, 0.0, 0.0)
	# doors actors pass through open for them and close behind
	var pl: Vector3 = main.player.global_position
	for id: String in doors.keys():
		var D: Dictionary = doors[id]
		if not bool(D["passes"]):
			continue
		var r: Dictionary = D["rec"]
		var c := Vector3(float(r["x"]), 0, float(r["z"]))
		var want := 0.0
		for aid: String in ["william", "tebaldo", "cellarer"]:
			var ac: Actor = director.a(aid)
			if ac.present and Vector2(ac.pos.x - c.x, ac.pos.z - c.z).length() < 1.6:
				want = 1.0
		if Vector2(pl.x - c.x, pl.z - c.z).length() < 1.4:
			want = 0.0
		D["open"] = move_toward(float(D["open"]), want, dt * 1.6)
		(D["pivot"] as Node3D).get_child(0).rotation.y = -1.4 * float(D["open"])
		(D["shape"] as CollisionShape3D).disabled = float(D["open"]) > 0.3
	# table food appears with the tray
	var tray_down: bool = String(director.props.get("tray", {}).get("where", "")) == "placed"
	for f: MeshInstance3D in food:
		f.visible = tray_down
	_place_props()

func _place_props() -> void:
	for id: String in props.keys():
		var n: Node3D = props[id]
		var pr: Dictionary = director.props.get(id, {})
		var where: String = String(pr.get("where", ""))
		match where:
			"ground", "placed", "bed", "sill", "lectern":
				n.visible = true
				var p: Variant = pr.get("pos")
				if id == "tray":
					n.global_position = Vector3(-16.32, 7.0, 15.58)
				elif id == "choir_book":
					n.global_position = Vector3(34.25, 1.42, -5.46)
					n.rotation = Vector3(-0.35, PI / 2.0, 0)
				elif p is Vector3:
					var v: Vector3 = p
					if is_nan(v.y):
						v.y = main.cells.terrain_height_at(v.x, v.z)
					n.global_position = v + Vector3(0, 0.2 if (id == "bedding" and where == "ground") else (0.21 if id == "chest" else 0.0), 0)
					if id == "hose" and where == "sill":
						n.global_position = v
			"mule":
				var on: String = String(pr.get("on", "mule_a"))
				var mf: Node3D = get_parent().mule_nodes.get(on) if get_parent().has_method("mule_node") else null
				if mf and mf.visible:
					n.visible = true
					var off: Vector3 = Vector3(0.0, 1.15, -0.15) if id == "bedding" else Vector3(0.0, 0.98, 0.35)
					n.global_position = mf.global_transform * off
					n.global_rotation = mf.global_rotation
				else:
					n.visible = false
			_:
				n.visible = false
