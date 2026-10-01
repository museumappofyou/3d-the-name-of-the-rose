class_name WorldCells
extends Node3D
## Loads the exported semantic cells (visual + separate collision), the
## terrain patch, ground fields and garth trees, and owns their residency.
## Cells are independent PackedScenes: loading/unloading one never changes
## logical state (knowledge, clock, portals live in GameSession).
##
## Physics layers: 1 static world, 2 dynamic portals, 4 player.
## Render layers: 1 above ground, 2 underground (the ossuary stair), so the
## above-ground lamps cannot light the crypt through the vault
## (materials.js underground()).

signal cell_loaded(id: String)
signal cell_unloaded(id: String)

const UNDERGROUND := ["ossuary_stair"]
## Residency policy: which cells a room needs resident (others may unload).
## The underground stair is resident only from the church/chapel/stair.
const NEEDS := {
	"ossuary": ["ossuary_stair", "skull_chapel", "church_interior", "church_exterior"],
	"skull": ["ossuary_stair", "skull_chapel", "church_interior", "church_exterior", "cloister"],
	"church": ["ossuary_stair", "skull_chapel", "church_interior", "church_exterior", "cloister", "cloister_context"],
	"choir": ["skull_chapel", "church_interior", "church_exterior", "cloister", "cloister_context"],
	"cloister": ["skull_chapel", "church_interior", "church_exterior", "cloister", "cloister_context"],
	"garth": ["skull_chapel", "church_interior", "church_exterior", "cloister", "cloister_context"],
	"abbey": ["skull_chapel", "church_interior", "church_exterior", "cloister", "cloister_context"],
}

var world: Dictionary
var cells: Dictionary = {}          # id -> {"visual": Node3D, "collision": Node3D}
var surfaces: Dictionary = {}       # StaticBody3D instance id -> surface id
var terrain_body: StaticBody3D
var terrain_heights: PackedFloat32Array
var trodden_img: Image
var trodden_rect: Vector4
var load_times_ms: Dictionary = {}
var resident_policy: bool = true

func setup(content: ContentData) -> void:
	world = content.doc("world")
	_fields()
	_terrain()
	_trees()
	for c: Dictionary in world.get("cells", []):
		load_cell(c["id"])

func cell_ids() -> PackedStringArray:
	var out: PackedStringArray = []
	for c: Dictionary in world.get("cells", []):
		out.append(c["id"])
	return out

func is_loaded(id: String) -> bool:
	return cells.has(id)

func load_cell(id: String) -> void:
	if cells.has(id):
		return
	var t0: int = Time.get_ticks_usec()
	var vis: Node3D = (load("res://assets/world/cells/%s.glb" % id) as PackedScene).instantiate()
	vis.name = "cell_" + id
	add_child(vis)
	var under: bool = UNDERGROUND.has(id)
	for mi: Node in vis.find_children("*", "MeshInstance3D", true, false):
		var m := mi as MeshInstance3D
		m.layers = 2 if under else 1
		var mat: Material = m.get_active_material(0)
		if mat is ShaderMaterial and String((mat as ShaderMaterial).shader.resource_path).contains("alpha"):
			m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		m.gi_mode = GeometryInstance3D.GI_MODE_STATIC
	var col: Node3D = null
	var cp: String = "res://assets/world/collision/%s.glb" % id
	if ResourceLoader.exists(cp):
		col = (load(cp) as PackedScene).instantiate()
		col.name = "collision_" + id
		add_child(col)
		for b: Node in col.find_children("*", "StaticBody3D", true, false):
			var body := b as StaticBody3D
			body.collision_layer = 1
			body.collision_mask = 0
			var surf: String = String(body.name).trim_prefix("col__").get_slice("-", 0)
			surfaces[body.get_instance_id()] = surf
			body.set_meta("surface", surf)
			for cs: Node in body.find_children("*", "CollisionShape3D", true, false):
				var sh: Shape3D = (cs as CollisionShape3D).shape
				if sh is ConcavePolygonShape3D:
					(sh as ConcavePolygonShape3D).backface_collision = true
	cells[id] = {"visual": vis, "collision": col}
	load_times_ms[id] = (Time.get_ticks_usec() - t0) / 1000.0
	cell_loaded.emit(id)

func unload_cell(id: String) -> void:
	if not cells.has(id):
		return
	var c: Dictionary = cells[id]
	if c["collision"]:
		for b: Node in (c["collision"] as Node).find_children("*", "StaticBody3D", true, false):
			surfaces.erase(b.get_instance_id())
		(c["collision"] as Node).queue_free()
	(c["visual"] as Node).queue_free()
	cells.erase(id)
	cell_unloaded.emit(id)

## Keep resident what the player's room needs (plus neighbours via NEEDS).
func apply_residency(room_id: String) -> void:
	if not resident_policy:
		return
	var need: Array = NEEDS.get(room_id, NEEDS["abbey"])
	for id: String in cell_ids():
		if need.has(id):
			load_cell(id)
		else:
			unload_cell(id)

func surface_of(collider: Object) -> String:
	if collider == null:
		return ""
	if collider == terrain_body:
		return "terrain"
	return String(surfaces.get(collider.get_instance_id(), (collider as Node).get_meta("surface", "stone") if collider is Node else "stone"))

## main.js surfaceUnder(): terrain → snow by the trodden mask; outdoor
## paving (stoneOut) → packed snow or wet stone by the browser's pattern.
func footstep_surface(collider: Object, feet: Vector3) -> String:
	var s: String = surface_of(collider)
	if s == "terrain" or s == "":
		return "snowPacked" if trodden_at(feet) > 0.35 else "snowFresh"
	if s == "stoneOut":
		return "snowPacked" if sin(feet.x * 1.3) * sin(feet.z * 1.7) > 0.3 else "stoneWet"
	return s

func trodden_at(p: Vector3) -> float:
	if trodden_img == null:
		return 0.0
	var u: float = (p.x - trodden_rect.x) / trodden_rect.z
	var v: float = (p.z - trodden_rect.y) / trodden_rect.w
	if u < 0.0 or v < 0.0 or u >= 1.0 or v >= 1.0:
		return 0.0
	return trodden_img.get_pixel(int(u * trodden_img.get_width()), int(v * trodden_img.get_height())).r

func _field_image(f: Dictionary, fmt: Image.Format) -> Image:
	var bytes: PackedByteArray = FileAccess.get_file_as_bytes(String(f["file"]))
	return Image.create_from_data(int(f["width"]), int(f["height"]), false, fmt, bytes)

func _fields() -> void:
	var F: Dictionary = world["fields"]
	var g: Dictionary = F["ground"]
	var gimg: Image = _field_image(g, Image.FORMAT_RF)
	RenderingServer.global_shader_parameter_set("ground_field", ImageTexture.create_from_image(gimg))
	RenderingServer.global_shader_parameter_set("ground_rect", Vector4(g["rect"][0], g["rect"][1], g["rect"][2], g["rect"][3]))
	var t: Dictionary = F["trodden"]
	trodden_img = _field_image(t, Image.FORMAT_L8)
	trodden_rect = Vector4(t["rect"][0], t["rect"][1], t["rect"][2], t["rect"][3])
	RenderingServer.global_shader_parameter_set("trodden_field", ImageTexture.create_from_image(trodden_img))
	RenderingServer.global_shader_parameter_set("trodden_rect", trodden_rect)
	RenderingServer.global_shader_parameter_set("snow_cover", float(world.get("snow_cover", 0.42)))

## The terrain patch around the slice from terrain.js height(), with the
## browser's rule (terrainCollider): a cell with any corner sunk more than
## 0.8 m below baseHeight lies under a building, where the floors take over;
## it is omitted from both the visual patch and the collision.
func _terrain() -> void:
	var th: Dictionary = world["fields"]["terrain_height"]
	var nx: int = th["nx"]
	var nz: int = th["nz"]
	var step: float = th["step"]
	var x0: float = th["x0"]
	var z0: float = th["z0"]
	var sunk_m: float = float(th.get("sunk_below_base_m", 0.8))
	terrain_heights = FileAccess.get_file_as_bytes(String(th["file"])).to_float32_array()
	var base: PackedFloat32Array = FileAccess.get_file_as_bytes(String(th["base_file"])).to_float32_array()
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var faces := PackedVector3Array()
	var V := func(i: int, j: int) -> Vector3: return Vector3(x0 + i * step, terrain_heights[j * nx + i], z0 + j * step)
	var sunk := func(i: int, j: int) -> bool: return terrain_heights[j * nx + i] < base[j * nx + i] - sunk_m
	var kept: int = 0
	for j: int in nz - 1:
		for i: int in nx - 1:
			if sunk.call(i, j) or sunk.call(i + 1, j) or sunk.call(i, j + 1) or sunk.call(i + 1, j + 1):
				continue
			var a: Vector3 = V.call(i, j)
			var b: Vector3 = V.call(i + 1, j)
			var c: Vector3 = V.call(i, j + 1)
			var d: Vector3 = V.call(i + 1, j + 1)
			for p: Vector3 in [a, b, c, b, d, c]:
				st.set_uv(Vector2(p.x, -p.z))
				st.add_vertex(p)
				faces.append(p)
			kept += 1
	st.index()
	st.generate_normals()
	var mi := MeshInstance3D.new()
	mi.name = "terrain"
	mi.mesh = st.commit()
	mi.material_override = load("res://assets/world/materials_native/terrain_snow.tres")
	add_child(mi)
	terrain_body = StaticBody3D.new()
	terrain_body.name = "terrain_collision"
	terrain_body.collision_layer = 1
	var shape := ConcavePolygonShape3D.new()
	shape.set_faces(faces)
	shape.backface_collision = true
	var cs := CollisionShape3D.new()
	cs.shape = shape
	terrain_body.add_child(cs)
	add_child(terrain_body)
	set_meta("terrain_cells_kept", kept)

## Garth fruit trees: frozen reference meshes, one MultiMesh per kind.
func _trees() -> void:
	var trees: Array = world.get("trees", [])
	if trees.is_empty():
		return
	var src: Node3D = (load("res://assets/world/props/garth_trees.glb") as PackedScene).instantiate()
	for t: Dictionary in trees:
		var mi: MeshInstance3D = src.find_child(String(t["mesh"]), true, false) as MeshInstance3D
		if mi == null:
			continue
		var mm := MultiMesh.new()
		mm.transform_format = MultiMesh.TRANSFORM_3D
		mm.mesh = mi.mesh
		mm.instance_count = (t["instances"] as Array).size()
		for k: int in mm.instance_count:
			var e: Array = t["instances"][k]   # three Matrix4.toArray(): column-major
			var basis := Basis(Vector3(e[0], e[1], e[2]), Vector3(e[4], e[5], e[6]), Vector3(e[8], e[9], e[10]))
			mm.set_instance_transform(k, Transform3D(basis, Vector3(e[12], e[13], e[14])))
		var mmi := MultiMeshInstance3D.new()
		mmi.name = "trees_" + String(t["mesh"])
		mmi.multimesh = mm
		add_child(mmi)
	src.free()

func resident_triangles() -> int:
	var n: int = 0
	for c: Dictionary in world.get("cells", []):
		if cells.has(c["id"]):
			n += int(c["triangles"])
	return n
