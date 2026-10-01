extends SceneTree
## Headless census of an imported fitted character (Godot side of the gate).
## godot --headless --path migration/godot --script res://tests/import_check.gd -- res://assets/characters/alinardo/alinardo.glb

func _init() -> void:
	var path: String = OS.get_cmdline_user_args()[0] if OS.get_cmdline_user_args().size() > 0 else "res://assets/characters/alinardo/alinardo.glb"
	var ps: PackedScene = load(path) as PackedScene
	if ps == null:
		printerr("FAIL load ", path); quit(1); return
	var root: Node3D = ps.instantiate() as Node3D
	var out: Dictionary = {"path": path, "meshes": [], "skeletons": [], "animations": {}}
	var skins: Dictionary = {}
	for n: Node in _all(root):
		if n is Skeleton3D:
			var sk: Skeleton3D = n
			var names: PackedStringArray = []
			for i: int in sk.get_bone_count():
				names.append(sk.get_bone_name(i))
			out["skeletons"].append({"path": str(root.get_path_to(sk)), "bones": sk.get_bone_count(), "names": names})
		elif n is MeshInstance3D:
			var mi: MeshInstance3D = n
			var m: Mesh = mi.mesh
			var bs: PackedStringArray = []
			if m is ArrayMesh:
				for i: int in (m as ArrayMesh).get_blend_shape_count():
					bs.append((m as ArrayMesh).get_blend_shape_name(i))
			var tris: int = 0
			for s: int in m.get_surface_count():
				var arr: Array = m.surface_get_arrays(s)
				var idx: PackedInt32Array = arr[Mesh.ARRAY_INDEX]
				tris += idx.size() / 3 if idx.size() > 0 else (arr[Mesh.ARRAY_VERTEX] as PackedVector3Array).size() / 3
			skins[mi.skin.get_instance_id() if mi.skin else 0] = true
			out["meshes"].append({"name": str(mi.name), "skeleton": str(mi.skeleton), "skin_id": mi.skin.get_instance_id() if mi.skin else 0, "surfaces": m.get_surface_count(), "blend_shapes": bs, "triangles": tris, "material": str(m.surface_get_material(0).resource_name) if m.surface_get_material(0) else ""})
		elif n is AnimationPlayer:
			var ap: AnimationPlayer = n
			for a: StringName in ap.get_animation_list():
				var an: Animation = ap.get_animation(a)
				out["animations"][str(a)] = {"length": an.length, "tracks": an.get_track_count()}
	out["distinct_skins"] = skins.size()
	var total: int = 0
	for m: Dictionary in out["meshes"]:
		total += int(m["triangles"])
	out["triangles"] = total
	print(JSON.stringify(out, "  "))
	root.free()
	quit(0)

func _all(n: Node) -> Array[Node]:
	var a: Array[Node] = [n]
	for c: Node in n.get_children():
		a.append_array(_all(c))
	return a
