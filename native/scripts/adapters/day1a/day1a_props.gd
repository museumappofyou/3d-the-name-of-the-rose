class_name Day1aProps
extends RefCounted
## Small scenario props for Day-1A (ORIGINAL GAME FICTION objects, made of
## the abbey's own semantic materials): the bedding bundle, the travelling
## chest, the tray, William's hose and satchel, buckets, a bundle of wood,
## a choir book. Simple, metric, shared meshes.

static var _cache: Dictionary = {}

static func _mat(key: String) -> Material:
	var p: String = "res://assets/world/materials/%s.tres" % key.replace(".", "_")
	return load(p) if ResourceLoader.exists(p) else StandardMaterial3D.new()

static func mesh_for(kind: String) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.name = "prop_" + kind
	if kind in ["bundle", "bedding"]:
		mi.rotation.z = PI / 2.0
	if kind == "chest":
		_chest_bands(mi)
	# caps are unit domes (base at the origin) stretched over the skull, in
	# head-bone metres: crown ≈ 0.145 above the bone, hair ≈ 0.165, ±0.085 wide
	if kind == "felt_cap":
		mi.scale = Vector3(0.1, 0.122, 0.119)
	elif kind == "leather_hood":
		mi.scale = Vector3(0.104, 0.14, 0.124)
	if _cache.has(kind):
		mi.mesh = _cache[kind]
		return mi
	var m: Mesh
	match kind:
		"bundle", "bedding":
			var c := CapsuleMesh.new()
			c.radius = 0.16
			c.height = 0.72
			c.material = _mat("p.blanketGrey")
			m = c
		"chest":
			var b := BoxMesh.new()
			b.size = Vector3(0.62, 0.34, 0.38)
			b.material = _mat("wood")
			m = b
		"tray":
			var b2 := BoxMesh.new()
			b2.size = Vector3(0.55, 0.04, 0.38)
			b2.material = _mat("wood")
			m = b2
		"hose":
			var b3 := BoxMesh.new()
			b3.size = Vector3(0.36, 0.05, 0.22)
			b3.material = _mat("p.woolBlack")
			m = b3
		"bucket":
			var cy := CylinderMesh.new()
			cy.top_radius = 0.17
			cy.bottom_radius = 0.14
			cy.height = 0.3
			cy.material = _mat("wood")
			m = cy
		"wood":
			var b4 := BoxMesh.new()
			b4.size = Vector3(0.5, 0.22, 0.28)
			b4.material = _mat("bark")
			m = b4
		"book":
			var b5 := BoxMesh.new()
			b5.size = Vector3(0.3, 0.07, 0.38)
			b5.material = _mat("woodDark")
			m = b5
		"satchel":
			var b6 := BoxMesh.new()
			b6.size = Vector3(0.06, 0.2, 0.24)
			var lm := StandardMaterial3D.new()
			lm.albedo_color = Color(0.29, 0.19, 0.12)
			lm.roughness = 0.75
			b6.material = lm
			m = b6
		"felt_cap":
			var sp := SphereMesh.new()
			sp.radius = 1.0
			sp.height = 1.0
			sp.is_hemisphere = true
			var fm := StandardMaterial3D.new()
			fm.albedo_color = Color(0.33, 0.32, 0.3)
			fm.roughness = 1.0
			sp.material = fm
			m = sp
		"leather_hood":
			var sp2 := SphereMesh.new()
			sp2.radius = 1.0
			sp2.height = 1.0
			sp2.is_hemisphere = true
			# a worn, greasy leather coif: dark, close to the skull
			var lm2 := StandardMaterial3D.new()
			lm2.albedo_color = Color(0.3, 0.2, 0.12)
			lm2.roughness = 0.62
			sp2.material = lm2
			m = sp2
		"keys":
			var tm := TorusMesh.new()
			tm.inner_radius = 0.035
			tm.outer_radius = 0.045
			tm.material = _mat("iron")
			m = tm
		"bar":
			var b7 := BoxMesh.new()
			b7.size = Vector3(0.16, 0.16, 4.1)
			b7.material = _mat("woodDark")
			m = b7
		_:
			var b8 := BoxMesh.new()
			b8.size = Vector3(0.2, 0.2, 0.2)
			m = b8
	_cache[kind] = m
	mi.mesh = m
	return mi

## iron bands and a lid lip on the travelling chest
static func _chest_bands(mi: MeshInstance3D) -> void:
	var iron: Material = _mat("iron")
	for x: float in [-0.2, 0.2]:
		var band := MeshInstance3D.new()
		var bm := BoxMesh.new()
		bm.size = Vector3(0.035, 0.36, 0.4)
		bm.material = iron
		band.mesh = bm
		band.position = Vector3(x, 0, 0)
		mi.add_child(band)
	var lid := MeshInstance3D.new()
	var lm := BoxMesh.new()
	lm.size = Vector3(0.65, 0.05, 0.41)
	lm.material = _mat("woodDark")
	lid.mesh = lm
	lid.position = Vector3(0, 0.17, 0)
	mi.add_child(lid)
