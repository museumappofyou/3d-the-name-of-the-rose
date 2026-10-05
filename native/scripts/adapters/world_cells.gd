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
## "proof" (phase-1 slice) or "day1a" (Day-1A footprint: phase-1 cells except
## the ossuary stair, plus the Day-1A cells, terrain, rings and trees)
var mode: String = "proof"
var cell_paths: Dictionary = {}     # id -> {"visual": res path, "collision": res path}
var cells: Dictionary = {}          # id -> {"visual": Node3D, "collision": Node3D}
var surfaces: Dictionary = {}       # StaticBody3D instance id -> surface id
var terrain_body: StaticBody3D
var terrain_heights: PackedFloat32Array
var terrain_rect: Rect2
var terrain_step: float = 1.0
var terrain_nx: int = 0
var trodden_img: Image
var trodden_rect: Vector4
var load_times_ms: Dictionary = {}
var resident_policy: bool = true

func setup(content: ContentData, world_mode: String = "proof") -> void:
	mode = world_mode
	world = content.doc("world")
	var cell_list: Array = []
	for c: Dictionary in world.get("cells", []):
		if mode == "day1a" and c["id"] == "ossuary_stair":
			continue   # the altar stays shut on Day 1: the passage below is not resident
		cell_list.append(c)
		cell_paths[c["id"]] = {"visual": "res://assets/world/cells/%s.glb" % c["id"], "collision": "res://assets/world/collision/%s.glb" % c["id"]}
	if mode == "day1a":
		var d1: Dictionary = content.doc("world_day1a")
		for c: Dictionary in d1.get("cells", []):
			cell_list.append(c)
			cell_paths[c["id"]] = {"visual": "res://assets/world/day1a/cells/%s.glb" % c["id"], "collision": "res://assets/world/day1a/collision/%s.glb" % c["id"] if not (c.get("collision", []) as Array).is_empty() else ""}
		_cell_list = cell_list
		_fields(d1["fields"], float(world.get("snow_cover", 0.42)))
		_terrain(d1["fields"]["terrain_height"], d1["fields"].get("walkable", {}))
		_coarse_ring(d1["fields"]["coarse"], d1["fields"]["terrain_height"])
		_far_ring(d1["fields"]["far"])
		_tree_groups(d1)
		resident_policy = false
	else:
		_cell_list = cell_list
		_fields(world["fields"], float(world.get("snow_cover", 0.42)))
		_terrain(world["fields"]["terrain_height"], {})
		_trees()
	for c: Dictionary in _cell_list:
		load_cell(c["id"])

var _cell_list: Array = []

func cell_ids() -> PackedStringArray:
	var out: PackedStringArray = []
	for c: Dictionary in _cell_list:
		out.append(c["id"])
	return out

func is_loaded(id: String) -> bool:
	return cells.has(id)

func load_cell(id: String) -> void:
	if cells.has(id):
		return
	var t0: int = Time.get_ticks_usec()
	var paths: Dictionary = cell_paths.get(id, {"visual": "res://assets/world/cells/%s.glb" % id, "collision": "res://assets/world/collision/%s.glb" % id})
	var vis: Node3D = (load(String(paths["visual"])) as PackedScene).instantiate()
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
	var cp: String = String(paths["collision"])
	if cp != "" and ResourceLoader.exists(cp):
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

func _fields(F: Dictionary, snow_cover: float) -> void:
	var g: Dictionary = F["ground"]
	var gimg: Image = _field_image(g, Image.FORMAT_RF)
	RenderingServer.global_shader_parameter_set("ground_field", ImageTexture.create_from_image(gimg))
	RenderingServer.global_shader_parameter_set("ground_rect", Vector4(g["rect"][0], g["rect"][1], g["rect"][2], g["rect"][3]))
	var t: Dictionary = F["trodden"]
	trodden_img = _field_image(t, Image.FORMAT_L8)
	trodden_rect = Vector4(t["rect"][0], t["rect"][1], t["rect"][2], t["rect"][3])
	RenderingServer.global_shader_parameter_set("trodden_field", ImageTexture.create_from_image(trodden_img))
	RenderingServer.global_shader_parameter_set("trodden_rect", trodden_rect)
	RenderingServer.global_shader_parameter_set("snow_cover", snow_cover)

## The terrain patch around the slice from terrain.js height(), with the
## browser's rule (terrainCollider): a cell with any corner sunk more than
## 0.8 m below baseHeight lies under a building, where the floors take over;
## it is omitted from both the visual patch and the collision. The Day-1A
## patch is larger: it is split into 32 m tiles (so cameras and shadow
## cascades cull it) and collides only where the browser's collider exists
## (`walkable`: the enclosure + 8 m and the upper road).
func _terrain(th: Dictionary, walk: Dictionary) -> void:
	var nx: int = th["nx"]
	var nz: int = th["nz"]
	var step: float = th["step"]
	var x0: float = th["x0"]
	var z0: float = th["z0"]
	var sunk_m: float = float(th.get("sunk_below_base_m", 0.8))
	terrain_heights = FileAccess.get_file_as_bytes(String(th["file"])).to_float32_array()
	terrain_rect = Rect2(x0, z0, (nx - 1) * step, (nz - 1) * step)
	terrain_step = step
	terrain_nx = nx
	var base: PackedFloat32Array = FileAccess.get_file_as_bytes(String(th["base_file"])).to_float32_array()
	var walkable := PackedByteArray()
	if walk.has("file"):
		walkable = FileAccess.get_file_as_bytes(String(walk["file"]))
	var V := func(i: int, j: int) -> Vector3: return Vector3(x0 + i * step, terrain_heights[j * nx + i], z0 + j * step)
	var sunk := func(i: int, j: int) -> bool: return terrain_heights[j * nx + i] < base[j * nx + i] - sunk_m
	var tile: int = 32 if mode == "day1a" else maxi(nx, nz)
	var mat: Material = load("res://assets/world/materials_native/terrain_snow.tres")
	var faces := PackedVector3Array()
	var kept: int = 0
	terrain_body = StaticBody3D.new()
	terrain_body.name = "terrain_collision"
	terrain_body.collision_layer = 1
	for tj: int in range(0, nz - 1, tile):
		for ti: int in range(0, nx - 1, tile):
			var st := SurfaceTool.new()
			st.begin(Mesh.PRIMITIVE_TRIANGLES)
			var n_tile: int = 0
			for j: int in range(tj, mini(tj + tile, nz - 1)):
				for i: int in range(ti, mini(ti + tile, nx - 1)):
					if sunk.call(i, j) or sunk.call(i + 1, j) or sunk.call(i, j + 1) or sunk.call(i + 1, j + 1):
						continue
					var a: Vector3 = V.call(i, j)
					var b: Vector3 = V.call(i + 1, j)
					var c: Vector3 = V.call(i, j + 1)
					var d: Vector3 = V.call(i + 1, j + 1)
					var collide: bool = walkable.is_empty() or (walkable[j * nx + i] + walkable[j * nx + i + 1] + walkable[(j + 1) * nx + i] + walkable[(j + 1) * nx + i + 1]) > 0
					for p: Vector3 in [a, b, c, b, d, c]:
						st.set_uv(Vector2(p.x, -p.z))
						st.add_vertex(p)
						if collide:
							faces.append(p)
					kept += 1
					n_tile += 1
			if n_tile == 0:
				continue
			st.index()
			st.generate_normals()
			var mi := MeshInstance3D.new()
			mi.name = "terrain" if tile >= maxi(nx, nz) else "terrain_%d_%d" % [ti / tile, tj / tile]
			mi.mesh = st.commit()
			mi.material_override = mat
			add_child(mi)
	var shape := ConcavePolygonShape3D.new()
	shape.set_faces(faces)
	shape.backface_collision = true
	var cs := CollisionShape3D.new()
	cs.shape = shape
	terrain_body.add_child(cs)
	add_child(terrain_body)
	set_meta("terrain_cells_kept", kept)
	set_meta("terrain_collision_triangles", faces.size() / 3)

## Height of the exported terrain at a world point (bilinear; NAN outside).
func terrain_height_at(x: float, z: float) -> float:
	if terrain_heights.is_empty() or not terrain_rect.has_point(Vector2(x, z)):
		return NAN
	var fx: float = (x - terrain_rect.position.x) / terrain_step
	var fz: float = (z - terrain_rect.position.y) / terrain_step
	var i: int = clampi(int(fx), 0, terrain_nx - 2)
	var j: int = clampi(int(fz), 0, int(terrain_rect.size.y / terrain_step) - 1)
	var u: float = fx - i
	var v: float = fz - j
	var h00: float = terrain_heights[j * terrain_nx + i]
	var h10: float = terrain_heights[j * terrain_nx + i + 1]
	var h01: float = terrain_heights[(j + 1) * terrain_nx + i]
	var h11: float = terrain_heights[(j + 1) * terrain_nx + i + 1]
	return lerpf(lerpf(h00, h10, u), lerpf(h01, h11, u), v)

## buildTerrain()'s near disc beyond the fine patch: a coarse visual grid
## (no collider), its cells inside the fine patch omitted; a skirt hanging
## from the fine patch's edge hides the seam (the browser's own trick).
func _coarse_ring(C: Dictionary, fine: Dictionary) -> void:
	var nx: int = C["nx"]
	var nz: int = C["nz"]
	var step: float = C["step"]
	var x0: float = C["x0"]
	var z0: float = C["z0"]
	var h: PackedFloat32Array = FileAccess.get_file_as_bytes(String(C["file"])).to_float32_array()
	var disc: Dictionary = C.get("disc", {})
	var cx: float = float(disc.get("cx", 0.0))
	var cz: float = float(disc.get("cz", 0.0))
	var r: float = float(disc.get("r", 1e9)) + 2.0
	var fr := Rect2(float(fine["x0"]), float(fine["z0"]), (int(fine["nx"]) - 1) * float(fine["step"]), (int(fine["nz"]) - 1) * float(fine["step"]))
	var mat: Material = load("res://assets/world/materials_native/terrain_snow.tres")
	var tile: int = 16
	for tj: int in range(0, nz - 1, tile):
		for ti: int in range(0, nx - 1, tile):
			var st := SurfaceTool.new()
			st.begin(Mesh.PRIMITIVE_TRIANGLES)
			var n: int = 0
			for j: int in range(tj, mini(tj + tile, nz - 1)):
				for i: int in range(ti, mini(ti + tile, nx - 1)):
					var xc: float = x0 + (i + 0.5) * step
					var zc: float = z0 + (j + 0.5) * step
					if Vector2(xc - cx, zc - cz).length() > r:
						continue
					# omitted where the fine patch covers the whole cell
					if fr.encloses(Rect2(x0 + i * step, z0 + j * step, step, step)):
						continue
					var q: Array = [Vector3(x0 + i * step, h[j * nx + i], z0 + j * step), Vector3(x0 + (i + 1) * step, h[j * nx + i + 1], z0 + j * step), Vector3(x0 + i * step, h[(j + 1) * nx + i], z0 + (j + 1) * step), Vector3(x0 + (i + 1) * step, h[(j + 1) * nx + i + 1], z0 + (j + 1) * step)]
					# sink the coarse cells that straddle the fine patch a little
					# under it so the fine surface always wins
					var under: bool = fr.intersects(Rect2(x0 + i * step, z0 + j * step, step, step))
					for k: int in [0, 1, 2, 1, 3, 2]:
						var p: Vector3 = q[k]
						if under:
							p.y -= 0.6
						st.set_uv(Vector2(p.x, -p.z))
						st.add_vertex(p)
					n += 1
			if n == 0:
				continue
			st.index()
			st.generate_normals()
			var mi := MeshInstance3D.new()
			mi.name = "coarse_%d_%d" % [ti / tile, tj / tile]
			mi.mesh = st.commit()
			mi.material_override = mat
			mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			add_child(mi)
	# skirt down from the fine patch boundary
	var st2 := SurfaceTool.new()
	st2.begin(Mesh.PRIMITIVE_TRIANGLES)
	var fnx: int = fine["nx"]
	var fnz: int = fine["nz"]
	var fs: float = fine["step"]
	var edge: Array = []
	for i: int in fnx:
		edge.append(Vector2i(i, 0))
	for j: int in range(1, fnz):
		edge.append(Vector2i(fnx - 1, j))
	for i: int in range(fnx - 2, -1, -1):
		edge.append(Vector2i(i, fnz - 1))
	for j: int in range(fnz - 2, -1, -1):
		edge.append(Vector2i(0, j))
	for k: int in edge.size():
		var a: Vector2i = edge[k]
		var b: Vector2i = edge[(k + 1) % edge.size()]
		var pa := Vector3(fr.position.x + a.x * fs, terrain_heights[a.y * fnx + a.x], fr.position.y + a.y * fs)
		var pb := Vector3(fr.position.x + b.x * fs, terrain_heights[b.y * fnx + b.x], fr.position.y + b.y * fs)
		for p: Vector3 in [pa, pb, pa + Vector3(0, -3, 0), pb, pb + Vector3(0, -3, 0), pa + Vector3(0, -3, 0)]:
			st2.set_uv(Vector2(p.x, -p.z))
			st2.add_vertex(p)
	st2.generate_normals()
	var sk := MeshInstance3D.new()
	sk.name = "terrain_skirt"
	sk.mesh = st2.commit()
	sk.material_override = mat
	sk.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(sk)

## buildTerrain()'s polar far ring out to the horizon, with the browser's own
## smoothed normals (exported per vertex); 24 sectors so it culls; no shadows.
func _far_ring(Fr: Dictionary) -> void:
	var A: int = Fr["A"]
	var radii: Array = Fr["radii"]
	var R: int = radii.size()
	var hv: PackedFloat32Array = FileAccess.get_file_as_bytes(String(Fr["file"])).to_float32_array()
	var cx: float = Fr["cx"]
	var cz: float = Fr["cz"]
	var mat: Material = load("res://assets/world/materials_native/terrain_snow.tres")
	var sectors: int = 24
	var per: int = A / sectors
	for s: int in sectors:
		var verts := PackedVector3Array()
		var norms := PackedVector3Array()
		var uvs := PackedVector2Array()
		var idx := PackedInt32Array()
		var cols: int = per + 1
		for k: int in R:
			for c: int in cols:
				var i: int = (s * per + c) % A
				var t: float = float(s * per + c) / A * TAU
				var q: int = (k * A + i) * 4
				var p := Vector3(cx + cos(t) * float(radii[k]), hv[q] - (1.2 if k == 0 else 0.0), cz + sin(t) * float(radii[k]))
				verts.append(p)
				norms.append(Vector3(hv[q + 1], hv[q + 2], hv[q + 3]) if k > 0 else Vector3.UP)
				uvs.append(Vector2(p.x, -p.z))
		for k: int in R - 1:
			for c: int in per:
				var a: int = k * cols + c
				var b: int = a + 1
				var cc: int = (k + 1) * cols + c
				var d: int = cc + 1
				idx.append_array([a, cc, b, b, cc, d])
		var arr: Array = []
		arr.resize(Mesh.ARRAY_MAX)
		arr[Mesh.ARRAY_VERTEX] = verts
		arr[Mesh.ARRAY_NORMAL] = norms
		arr[Mesh.ARRAY_TEX_UV] = uvs
		arr[Mesh.ARRAY_INDEX] = idx
		var m := ArrayMesh.new()
		m.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr)
		var mi := MeshInstance3D.new()
		mi.name = "far_%02d" % s
		mi.mesh = m
		mi.material_override = mat
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		add_child(mi)

## Day-1A trees: every exported group, all LOD meshes, built from the
## unpacked raw buffers (aRegion/aTree as CUSTOM0/CUSTOM1) with the ported
## atlas shader; instances bucketed into 48 m tiles, one MultiMesh per
## (tile, LOD) with the browser's LOD distances (55 / 190 m) as visibility
## ranges measured to the tile.
func _tree_groups(d1: Dictionary) -> void:
	var groups: Array = d1.get("trees", [])
	if groups.is_empty():
		return
	var raw_meshes: Dictionary = d1.get("tree_meshes", {})
	var atlases: Array = d1.get("tree_atlases", [])
	var mats: Array = []
	for a: Dictionary in atlases:
		var m := ShaderMaterial.new()
		m.shader = load("res://shaders/abbey_tree.gdshader")
		m.set_shader_parameter("atlas_map", load(String(a["map"]["file"])))
		m.set_shader_parameter("atlas_normal", load(String(a["normal"]["file"])))
		m.set_shader_parameter("atlas_size", Vector2(float(a["map"]["size"][0]), float(a["map"]["size"][1])))
		m.set_shader_parameter("alpha_cutoff", float(a.get("alpha_cutoff", 0.42)))
		mats.append(m)
	var mesh_cache: Dictionary = {}
	var TILE: float = 48.0
	for g: Dictionary in groups:
		var lods: Array = g["lods"]
		var meshes: Array = []
		for l: Dictionary in lods:
			var name: String = String(l["mesh"])
			if not mesh_cache.has(name) and raw_meshes.has(name):
				mesh_cache[name] = _tree_mesh(raw_meshes[name], mats)
			meshes.append(mesh_cache.get(name))
		var tiles: Dictionary = {}
		for e: Array in g["instances"]:
			var key := Vector2i(floori(float(e[12]) / TILE), floori(float(e[14]) / TILE))
			if not tiles.has(key):
				tiles[key] = []
			(tiles[key] as Array).append(e)
		var lmax: Array = g.get("lod_max_m", [55.0, 190.0])
		for key: Vector2i in tiles.keys():
			var list: Array = tiles[key]
			for li: int in meshes.size():
				if meshes[li] == null:
					continue
				var mm := MultiMesh.new()
				mm.transform_format = MultiMesh.TRANSFORM_3D
				mm.mesh = meshes[li]
				mm.instance_count = list.size()
				var centre := Vector3((key.x + 0.5) * TILE, 0.0, (key.y + 0.5) * TILE)
				var hsum: float = 0.0
				for e: Array in list:
					hsum += float(e[13])
				centre.y = hsum / list.size()
				for k: int in list.size():
					var e: Array = list[k]
					var basis := Basis(Vector3(e[0], e[1], e[2]), Vector3(e[4], e[5], e[6]), Vector3(e[8], e[9], e[10]))
					mm.set_instance_transform(k, Transform3D(basis, Vector3(e[12], e[13], e[14]) - centre))
				var mmi := MultiMeshInstance3D.new()
				mmi.name = "trees_%s_%d_%d_lod%d" % [g["group"], key.x, key.y, li]
				mmi.multimesh = mm
				mmi.position = centre
				if meshes.size() > 1:
					mmi.visibility_range_begin = 0.0 if li == 0 else float(lmax[li - 1])
					mmi.visibility_range_end = float(lmax[li]) if li < meshes.size() - 1 else 0.0
				var cast: bool = bool((lods[li] as Dictionary).get("cast_shadow", true))
				mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if cast else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
				add_child(mmi)

## One tree mesh from its raw buffer (build_day1a_assets.py unpack_trees).
static func _tree_mesh(rec: Dictionary, mats: Array) -> ArrayMesh:
	var b: PackedByteArray = FileAccess.get_file_as_bytes(String(rec["file"]))
	var nv: int = b.decode_u32(0)
	var ni: int = b.decode_u32(4)
	var f: PackedFloat32Array = b.slice(8, 8 + nv * 60).to_float32_array()
	var idx: PackedInt32Array = b.slice(8 + nv * 60, 8 + nv * 60 + ni * 4).to_int32_array()
	var pos := PackedVector3Array()
	var nrm := PackedVector3Array()
	var uv := PackedVector2Array()
	var c0 := PackedFloat32Array()
	var c1 := PackedFloat32Array()
	pos.resize(nv)
	nrm.resize(nv)
	uv.resize(nv)
	c0.resize(nv * 4)
	c1.resize(nv * 4)
	for k: int in nv:
		var o: int = k * 15
		pos[k] = Vector3(f[o], f[o + 1], f[o + 2])
		nrm[k] = Vector3(f[o + 3], f[o + 4], f[o + 5])
		uv[k] = Vector2(f[o + 6], f[o + 7])
		c0[k * 4] = f[o + 8]
		c0[k * 4 + 1] = f[o + 9]
		c0[k * 4 + 2] = f[o + 10]
		c0[k * 4 + 3] = f[o + 11]
		c1[k * 4] = f[o + 12]
		c1[k * 4 + 1] = f[o + 13]
		c1[k * 4 + 2] = f[o + 14]
		c1[k * 4 + 3] = 0.0
	# browser winding is counter-clockwise; Godot's front faces are clockwise
	for k: int in range(0, ni, 3):
		var tmp: int = idx[k + 1]
		idx[k + 1] = idx[k + 2]
		idx[k + 2] = tmp
	var arr: Array = []
	arr.resize(Mesh.ARRAY_MAX)
	arr[Mesh.ARRAY_VERTEX] = pos
	arr[Mesh.ARRAY_NORMAL] = nrm
	arr[Mesh.ARRAY_TEX_UV] = uv
	arr[Mesh.ARRAY_CUSTOM0] = c0
	arr[Mesh.ARRAY_CUSTOM1] = c1
	arr[Mesh.ARRAY_INDEX] = idx
	var fmt: int = (Mesh.ARRAY_CUSTOM_RGBA_FLOAT << Mesh.ARRAY_FORMAT_CUSTOM0_SHIFT) | (Mesh.ARRAY_CUSTOM_RGBA_FLOAT << Mesh.ARRAY_FORMAT_CUSTOM1_SHIFT)
	var m := ArrayMesh.new()
	m.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr, [], {}, fmt)
	m.surface_set_material(0, mats[int(rec["material"])])
	return m

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
	for c: Dictionary in _cell_list:
		if cells.has(c["id"]):
			n += int(c["triangles"])
	return n
