class_name LightingRig
extends Node3D
## Day/night and interior lighting from the shared clock (port of
## src/systems/sky.js Atmosphere.set() and the lighting part of main.js
## frame()). Unit conversion: three.js physically-based light intensities
## illuminate a white Lambert surface to I/π (three's BRDF carries 1/π);
## Godot's light energy E gives E. So E = I / π for sun, moon, hemisphere
## and point lights. Emission is radiance in both, unchanged.
## Colours: three's setHSL and Color.lerp work in its linear working space,
## so every colour is computed linear here (hex values decoded from sRGB)
## and encoded once for Godot, whose colour properties are sRGB.
## The sky is the browser's own Preetham sky (shaders/browser_sky.gdshader);
## its radiance pass is the browser's PMREM scene × environmentIntensity.
##
## GI mode (evaluated, chosen per run): "none" (SSAO only), "sdfgi" (dynamic
## sun over the static cells; the moving altar is GI_MODE_DYNAMIC so no
## closed-altar shadow is baked), "ssil".

const LAT := deg_to_rad(44.3)
const DEC := deg_to_rad(-21.2)
const POOL := 8

var session: GameSession
var env: Environment
var world_env: WorldEnvironment
var sun: DirectionalLight3D
var sky_mat: ShaderMaterial
var lamps: Array[OmniLight3D] = []
## the same flames for underground surfaces (materials.js underground():
## a point light fades by its world height, 1 - smoothstep(0.3, 2.2, y))
var lamps_ug: Array[OmniLight3D] = []
var lantern: OmniLight3D
var lantern_ug: OmniLight3D
var _env_intensity_set: float = -1.0
var lantern_on: bool = false
var emitters: Array = []
var indoor_k: float = 0.0
var target_k: float = 0.0
var night: float = 0.0
var daylight: float = 1.0
var base_exposure: float = 1.0
var hemi_base: float = 1.0
var ambient_color: Color = Color(0.7, 0.75, 0.82)
var env_base: float = 1.0
var gi_mode: String = "none"
var time_s: float = 0.0
var glass_mats: Dictionary = {}
var lamp_count_lit: int = 0
## experiment knob on the ported sky (1.0 = the browser)
var sky_energy: float = 1.0
var ambient_scale: float = 1.0
## diffuse image-based light (three's PMREM irradiance × environmentIntensity)
## as a multiple of the ambient colour: the one fitted constant, on matching
## day frames (docs/PLATFORMS.md)
var ibl_level: float = 1.3
var ambient_mode: String = "color"
var ssao_on: bool = true

static func sun_dir(t: float) -> Vector3:
	var h: float = (t - 12.0) * 15.0 * PI / 180.0
	var alt: float = asin(sin(LAT) * sin(DEC) + cos(LAT) * cos(DEC) * cos(h))
	var az: float = atan2(sin(h), cos(h) * sin(LAT) - tan(DEC) * cos(LAT))
	return Vector3(-sin(az) * cos(alt), sin(alt), cos(az) * cos(alt)).normalized()

func setup(s: GameSession, content: ContentData, gi: String = "none", knobs: Dictionary = {}) -> void:
	session = s
	gi_mode = gi
	sky_energy = float(knobs.get("sky-energy", sky_energy))
	ambient_scale = float(knobs.get("ambient-scale", ambient_scale))
	ibl_level = float(knobs.get("ibl-level", ibl_level))
	ambient_mode = String(knobs.get("ambient-mode", ambient_mode))
	ssao_on = String(knobs.get("ssao", "on")) != "off"
	emitters = content.doc("world").get("emitters", [])
	env = Environment.new()
	env.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	sky_mat = ShaderMaterial.new()
	sky_mat.shader = load("res://shaders/browser_sky.gdshader")
	sky_mat.set_shader_parameter("mie_coefficient", 0.004)
	sky_mat.set_shader_parameter("mie_directional_g", 0.82)
	sky_mat.set_shader_parameter("night_top", _hex_lin("050914"))
	sky_mat.set_shader_parameter("land_color", _hex_lin("2f3530"))
	sky_mat.set_shader_parameter("energy", sky_energy)
	sky.sky_material = sky_mat
	sky.radiance_size = Sky.RADIANCE_SIZE_128
	sky.process_mode = Sky.PROCESS_MODE_INCREMENTAL
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR if ambient_mode == "color" else Environment.AMBIENT_SOURCE_SKY
	env.reflected_light_source = Environment.REFLECTION_SOURCE_SKY
	# three ACESFilmic: fit(M·c·exposure/0.6); Godot ACES: fit(M·c·exposure·1.8)
	# / fit(1.8·white). Same fit and matrices: exposure_g = exposure_t / 1.08
	# and a high white point (normalisation ≈ 1.002) reproduce the browser.
	env.tonemap_mode = Environment.TONE_MAPPER_ACES
	env.tonemap_white = 16.0
	env.ssao_enabled = ssao_on
	env.ssao_radius = 0.85
	env.ssao_intensity = 1.6
	env.ssao_power = 1.4
	env.fog_enabled = true
	env.fog_mode = Environment.FOG_MODE_EXPONENTIAL
	env.fog_sky_affect = 0.0
	env.glow_enabled = false
	match gi_mode:
		"sdfgi":
			env.sdfgi_enabled = true
			env.sdfgi_cascades = 4
			env.sdfgi_min_cell_size = 0.2
			env.sdfgi_use_occlusion = true
			env.sdfgi_energy = 0.8
		"ssil":
			env.ssil_enabled = true
			env.ssil_radius = 4.0
	world_env = WorldEnvironment.new()
	world_env.environment = env
	add_child(world_env)
	sun = DirectionalLight3D.new()
	sun.name = "sun"
	sun.shadow_enabled = true
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_4_SPLITS
	sun.directional_shadow_max_distance = 90.0
	sun.shadow_bias = 0.03
	sun.shadow_normal_bias = 1.2
	sun.shadow_blur = 1.0
	sun.light_cull_mask = 0xFFFFF   # the sun reaches the stair only through openings (shadowed)
	add_child(sun)
	for i: int in POOL:
		var l := OmniLight3D.new()
		l.name = "flame_%d" % i
		l.shadow_enabled = false
		l.omni_attenuation = 1.6
		l.light_energy = 0.0
		l.light_cull_mask = 1     # above-ground layers
		add_child(l)
		lamps.append(l)
		var u := OmniLight3D.new()
		u.name = "flame_ug_%d" % i
		u.shadow_enabled = false
		u.omni_attenuation = 1.6
		u.light_energy = 0.0
		u.visible = false
		u.light_cull_mask = 2     # underground surfaces (render layer 2)
		add_child(u)
		lamps_ug.append(u)
	lantern = OmniLight3D.new()
	lantern.name = "lantern"
	lantern.omni_range = 24.0
	lantern.omni_attenuation = 1.25
	lantern.light_color = Color("ffcf98")
	lantern.light_energy = 0.0
	lantern.light_cull_mask = 0xFFFFD   # every layer but the underground one
	add_child(lantern)
	lantern_ug = lantern.duplicate() as OmniLight3D
	lantern_ug.name = "lantern_ug"
	lantern_ug.light_cull_mask = 2
	add_child(lantern_ug)
	for k: String in ["glassOpaque", "stained_1", "stained_2", "stainedWarm"]:
		var p: String = "res://assets/world/materials/%s.tres" % k
		if ResourceLoader.exists(p):
			glass_mats[k] = load(p)
	apply_time(session.clock.hours)

static func _smooth(x: float, a: float, b: float) -> float:
	var t: float = clampf((x - a) / (b - a), 0.0, 1.0)
	return t * t * (3.0 - 2.0 * t)

## sky.js Atmosphere.set(t), clear weather.
func apply_time(t: float) -> void:
	var d: Vector3 = sun_dir(t)
	var alt: float = d.y
	var day: float = _smooth(alt, -0.12, 0.18)
	var low: float = 1.0 - _smooth(alt, 0.02, 0.35)
	night = 1.0 - day
	daylight = clampf(d.y * 4.0 + 0.25, 0.0, 1.0)
	sky_mat.set_shader_parameter("turbidity", 1.8 + low * 2.0)
	sky_mat.set_shader_parameter("rayleigh", lerpf(0.9, 2.6, low))
	sky_mat.set_shader_parameter("sun_position", d)
	# updateEnv(): below the horizon the PMREM sky takes a fixed low sun
	sky_mat.set_shader_parameter("env_sun_position", d if d.y >= -0.05 else Vector3(0.0, -0.2, 1.0))
	sky_mat.set_shader_parameter("night_alpha", clampf((0.02 - alt) * 5.0, 0.0, 0.94))
	sky_mat.set_shader_parameter("day_k", clampf(d.y * 4.0 + 0.25, 0.0, 1.0))
	var md := Vector3(-d.x * 0.6 + 0.2, maxf(0.35, -d.y * 0.9 + 0.25), -d.z * 0.6 - 0.35).normalized()
	var sun_col: Color = _hsl(0.09 - low * 0.03, lerpf(0.07, 0.5, low), lerpf(0.94, 0.66, low)).lerp(_hex_lin("8ea6d8"), night)
	var sun_i: float = lerpf(0.0, 3.6, _smooth(alt, -0.02, 0.25))
	var moon_i: float = 0.75 * night
	var key: Vector3 = d if (day > 0.02 and alt >= -0.02) else md
	sun.light_color = sun_col.linear_to_srgb()
	sun.light_energy = maxf(sun_i, moon_i) / PI
	sun.transform.basis = Basis.looking_at(-key, Vector3.UP if absf(key.y) < 0.99 else Vector3.FORWARD)
	# ambient (hemisphere) and environment
	hemi_base = lerpf(0.2, 1.35, day)
	env_base = lerpf(0.08, 1.0, _smooth(alt, -0.12, 0.2))
	base_exposure = lerpf(1.6, 0.6, day)
	var fog_day: Color = _hsl(0.6, 0.2, 0.66).lerp(_hex_lin("e6c8a8"), low * 0.55)
	var fog_lin: Color = _hex_lin("121824").lerp(fog_day, day)
	env.fog_light_color = fog_lin.linear_to_srgb()
	sky_mat.set_shader_parameter("fog_color", fog_lin)
	sky_mat.set_shader_parameter("night_horizon", fog_lin)
	env.fog_density = 0.00014 + (1.0 - day) * 0.0005
	# hemisphere (sky/ground mix) + image-based light, as one ambient colour
	var sky_c: Color = _hsl(0.6, 0.35, lerpf(0.08, 0.72, day)).lerp(_hex_lin("d8cfc4"), low * day * 0.45)
	var grd_c: Color = _hsl(0.08, 0.2, lerpf(0.03, 0.42, day))
	ambient_color = sky_c.lerp(grd_c, 0.35)
	_update_adaptation()

## a hex colour as three stores it (sRGB decoded to linear)
static func _hex_lin(hex: String) -> Color:
	return Color(hex).srgb_to_linear()

## three Color.setHSL in its linear working space: the result is linear
static func _hsl(h: float, s: float, l: float) -> Color:
	var c := Color()
	var q: float = l * (1.0 + s) if l < 0.5 else l + s - l * s
	var p: float = 2.0 * l - q
	var f := func(t: float) -> float:
		t = fposmod(t, 1.0)
		if t < 1.0 / 6.0: return p + (q - p) * 6.0 * t
		if t < 0.5: return q
		if t < 2.0 / 3.0: return p + (q - p) * (2.0 / 3.0 - t) * 6.0
		return p
	c.r = f.call(h + 1.0 / 3.0)
	c.g = f.call(h)
	c.b = f.call(h - 1.0 / 3.0)
	c.a = 1.0
	return c

## main.js: the eye adapts indoors (ambient falls, exposure rises; a faint
## night fill keeps dark stone legible).
func _update_adaptation() -> void:
	var k: float = indoor_k
	var night_fill: float = k * night * 0.13
	# three: hemisphere irradiance (hemi/π after the Lambert 1/π) plus the sky
	# PMREM at environmentIntensity; Godot ambient is radiance-scaled colour
	var hemi: float = hemi_base * (1.0 - k * 0.62) + night_fill
	var ibl: float = env_base * (1.0 - k * 0.6) + night_fill * 0.5
	env.ambient_light_color = ambient_color.linear_to_srgb()
	# scene.environmentIntensity, baked into the radiance pass (re-rendered
	# only when it moves by more than 0.5 %)
	if absf(ibl - _env_intensity_set) > 0.005 * maxf(ibl, 0.05):
		_env_intensity_set = ibl
		sky_mat.set_shader_parameter("env_intensity", ibl)
	env.ambient_light_energy = (hemi / PI + ibl * ibl_level) * ambient_scale
	env.ambient_light_sky_contribution = 0.0 if ambient_mode == "color" else 1.0
	env.tonemap_exposure = base_exposure * (1.0 + k * 0.5 * (0.6 if lantern_on else 1.0) + night * 0.2) / 1.08
	var day: float = daylight
	for key: String in glass_mats.keys():
		var m: ShaderMaterial = glass_mats[key]
		if key == "glassOpaque":
			m.set_shader_parameter("emission_energy", night * (1.0 - k) * 0.55)
		else:
			m.set_shader_parameter("emission_energy", 0.95 * day * (0.15 + k * 0.85) + night * (1.0 - k) * 0.35)

func set_room_darkness(darkness: float) -> void:
	target_k = darkness

func set_lantern(on: bool) -> void:
	lantern_on = on

func _process(dt: float) -> void:
	if session == null:
		return
	time_s += dt
	indoor_k = lerpf(indoor_k, target_k, 1.0 - exp(-2.5 * dt))
	_update_adaptation()
	var cam: Camera3D = get_viewport().get_camera_3d()
	if cam == null:
		return
	var cp: Vector3 = cam.global_position
	# the flame pool: the eight nearest flames within 70 m
	var sorted: Array = []
	for e: Dictionary in emitters:
		var p := Vector3(float(e["x"]), float(e["y"]), float(e["z"]))
		sorted.append([p.distance_squared_to(cp), e, p])
	sorted.sort_custom(func(a: Array, b: Array) -> bool: return float(a[0]) < float(b[0]))
	lamp_count_lit = 0
	for i: int in POOL:
		var l: OmniLight3D = lamps[i]
		if i >= sorted.size() or float(sorted[i][0]) > 4900.0:
			l.light_energy = 0.0
			l.visible = false
			lamps_ug[i].visible = false
			continue
		var e: Dictionary = sorted[i][1]
		l.visible = true
		l.position = sorted[i][2]
		l.light_color = Color.hex((int(e.get("color", 0xffaa66)) << 8) | 0xff).srgb_to_linear().lerp(_hex_lin("ffd6a8"), 0.45).linear_to_srgb()
		l.omni_range = float(e.get("distance", 10.0)) * 2.1
		var fl: float = 1.0 - float(e.get("flicker", 0.0)) * 0.6 * (0.5 + 0.5 * sin(time_s * 13.0 + i * 7.0) * sin(time_s * 7.3 + i))
		l.light_energy = float(e.get("intensity", 1.0)) * 2.4 * fl * (0.55 + 0.45 * maxf(night, indoor_k)) / PI
		lamp_count_lit += 1
		_follow_ug(lamps_ug[i], l)
	if lantern_on:
		lantern.global_position = cp + cam.global_transform.basis * Vector3(0.12, -0.3, -0.55)
		lantern.light_energy = (3.1 + 1.5 * night) * (0.94 + 0.06 * sin(time_s * 17.0) * sin(time_s * 5.3)) / PI
	else:
		lantern.light_energy = 0.0
	_follow_ug(lantern_ug, lantern)

## materials.js underground(): on surfaces below the church a point light
## keeps 1 - smoothstep(0.3, 2.2, its world height) of its light
func _follow_ug(u: OmniLight3D, l: OmniLight3D) -> void:
	var f: float = 1.0 - _smooth(l.global_position.y, 0.3, 2.2)
	u.visible = l.visible and l.light_energy > 0.0 and f > 0.001
	if not u.visible:
		u.light_energy = 0.0
		return
	u.global_position = l.global_position
	u.light_color = l.light_color
	u.omni_range = l.omni_range
	u.omni_attenuation = l.omni_attenuation
	u.light_energy = l.light_energy * f
