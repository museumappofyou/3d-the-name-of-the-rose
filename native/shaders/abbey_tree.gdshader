shader_type spatial;
render_mode cull_disabled, depth_draw_opaque;
// Port of the browser's tree material (web/src/world/trees.js treeMaterial,
// patchVertex, atlasFrag, snowGLSL): every vertex addresses its own region of
// a procedural atlas (CUSTOM0 = aRegion: x, y, w, h; CUSTOM1.xyz = aTree:
// snow share, mode, brightness). Mode 0 bark tiles (fract), mode 1 needle /
// twig cards clamp, mode 2 tiles along u only. Cards take snow on the face
// that looks at the sky and shade with their crown normal; a faint skylight
// floor keeps the shaded crown from going black. Alpha-tested at the
// browser's cutoff with alpha-to-coverage under MSAA.

global uniform float snow_cover;

uniform sampler2D atlas_map : source_color, filter_linear_mipmap_anisotropic, repeat_disable;
uniform sampler2D atlas_normal : filter_linear_mipmap_anisotropic, repeat_disable;
uniform vec2 atlas_size = vec2(2048.0);
uniform float alpha_cutoff = 0.42;

varying vec4 v_reg;
varying vec3 v_tk;
varying vec3 v_tp;
varying vec3 v_tn;

float tr_hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float tr_noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
	return mix(mix(tr_hash(i), tr_hash(i + vec2(1.0, 0.0)), f.x), mix(tr_hash(i + vec2(0.0, 1.0)), tr_hash(i + vec2(1.0, 1.0)), f.x), f.y); }
float tr_fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 3; i++) { s += a * tr_noise(p); p *= 2.07; a *= 0.5; } return s / 0.875; }

void vertex() {
	v_reg = CUSTOM0;
	v_tk = CUSTOM1.xyz;
	v_tp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	v_tn = normalize(mat3(MODEL_MATRIX) * NORMAL);
}

void fragment() {
	float mode = v_tk.y;
	vec2 t = UV;
	vec2 f = mode < 0.5 ? fract(t) : (mode < 1.5 ? clamp(t, 0.002, 0.998) : vec2(fract(t.x), clamp(t.y, 0.004, 0.996)));
	vec2 auv = v_reg.xy + f * v_reg.zw;
	vec2 dx = dFdx(t) * v_reg.zw, dy = dFdy(t) * v_reg.zw;
	vec4 texel = textureGrad(atlas_map, auv, dx, dy);
	vec4 nt = textureGrad(atlas_normal, auv, dx, dy);
	float bed = nt.a;
	vec3 col = texel.rgb * v_tk.z;
	float a = texel.a;
	if (mode > 0.5) {
		// keep thin needles and twigs from dissolving into the mips
		vec2 px = t * v_reg.zw * atlas_size;
		vec2 ddx = dFdx(px), ddy = dFdy(px);
		float lod = 0.5 * log2(max(dot(ddx, ddx), dot(ddy, ddy)));
		a *= 1.0 + max(0.0, lod) * 0.25;
	}
	float up;
	if (mode > 0.5 && mode < 1.5) {
		vec3 gN = normalize(cross(dFdx(v_tp), dFdy(v_tp)));
		up = smoothstep(-0.05, 0.45, abs(gN.y)) * 0.85 + 0.15 * smoothstep(0.2, 0.6, v_tn.y);
	} else {
		up = smoothstep(0.42, 0.75, v_tn.y);
	}
	float n = tr_fbm(v_tp.xz * 1.7 + v_tp.y * 0.9) * 0.75 + tr_noise(v_tp.xz * 7.0 + v_tp.y * 5.0) * 0.25;
	float cover = snow_cover * v_tk.x;
	float snow = up * smoothstep(0.92 - cover * 1.25, 1.12 - cover * 1.25, n + 0.18);
	vec3 snow_col = vec3(0.9, 0.92, 0.96) * (0.88 + 0.12 * tr_noise(v_tp.xz * 40.0));
	if (mode > 0.5 && mode < 1.5) {
		float fill = bed * snow;
		fill *= fill;
		a = clamp(max(a, fill), 0.0, 1.0);
		snow = max(snow, fill);
	}
	col = mix(col, snow_col, snow);
	ALBEDO = col;
	ALPHA = a;
	ALPHA_SCISSOR_THRESHOLD = alpha_cutoff;
	ALPHA_ANTIALIASING_EDGE = alpha_cutoff;
	ROUGHNESS = mix(0.92, 0.8, snow);
	METALLIC = 0.0;
	// cards: crown normal on both faces; bark: the atlas normal map
	vec3 nv = normalize(NORMAL);
	if (mode > 0.5 && mode < 1.5) {
		if (!FRONT_FACING) nv = -nv;
	} else {
		vec3 tn = nt.xyz * 2.0 - 1.0;
		vec3 q0 = dFdx(VERTEX), q1 = dFdy(VERTEX);
		vec2 st0 = dFdx(t), st1 = dFdy(t);
		vec3 q1perp = cross(q1, nv), q0perp = cross(nv, q0);
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max(dot(T, T), dot(B, B));
		float hand = dot(cross(q0, q1), nv) < 0.0 ? -1.0 : 1.0;
		float sc = det == 0.0 ? 0.0 : hand * inversesqrt(det);
		nv = normalize(mat3(T * sc, B * sc, nv) * tn);
	}
	vec3 up_v = normalize((VIEW_MATRIX * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
	NORMAL = normalize(mix(nv, up_v, snow * 0.55));
	if (mode > 0.5) {
		EMISSION = col * vec3(0.5, 0.55, 0.64) * 0.06;
	}
}
