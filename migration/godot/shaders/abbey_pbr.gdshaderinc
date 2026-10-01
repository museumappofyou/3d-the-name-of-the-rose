// Shared surface model for exported abbey geometry: a port of the browser's
// MeshStandardMaterial path plus core/weathering.js `dress()`.
//
// Exact-parity conventions (docs/migration/phase-1/MATERIALS.md):
//   * mesh UVs are the browser's raw metre UVs; the three.js texture
//     transform (repeat, offset, rotation about 0,0) is applied here and the
//     image is sampled at (u', 1 - v') because three uploads with flipY;
//   * the normal-map tangent frame is built from screen-space derivatives of
//     that transformed UV, like three's perturbNormal2Arb/getTangentFrame;
//   * *_d albedo is sRGB (source_color), *_n is a linear OpenGL normal map,
//     *_a is linear ARM/ORM: R occlusion, G roughness, B metalness;
//   * colours are given as the browser's sRGB hex and linearised by Godot.

global uniform float snow_cover;
global uniform float wetness;
global uniform sampler2D ground_field : filter_linear, repeat_disable;
global uniform vec4 ground_rect;
global uniform sampler2D trodden_field : filter_linear, repeat_disable;
global uniform vec4 trodden_rect;

uniform vec4 albedo_color : source_color = vec4(1.0);
uniform sampler2D albedo_tex : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform bool has_albedo_tex = true;
uniform sampler2D normal_tex : hint_normal, filter_linear_mipmap_anisotropic, repeat_enable;
uniform bool has_normal_tex = false;
uniform float normal_strength = 1.0;
uniform sampler2D arm_tex : hint_default_white, filter_linear_mipmap_anisotropic, repeat_enable;
uniform bool has_arm_tex = false;
uniform float ao_strength = 1.0;
uniform float roughness_value = 1.0;
// pbr() materials without dress(): roughness = value × ARM.g (three roughnessMap)
uniform bool rough_from_arm = false;
uniform float metallic_value = 0.0;
uniform vec2 uv_repeat = vec2(1.0);
uniform vec2 uv_offset = vec2(0.0);
uniform float uv_rotation = 0.0;
uniform vec4 emission_color : source_color = vec4(0.0, 0.0, 0.0, 1.0);
uniform float emission_energy = 0.0;
uniform bool emission_from_albedo_tex = false;
uniform float opacity = 1.0;
// three envMapIntensity: the browser's image-based light is scaled per
// material; in Godot AO (with AO_LIGHT_AFFECT 0) scales only indirect light
uniform float env_intensity = 1.0;
global uniform float ibl_share;
// weathering (three dress(): wzA, wzB, wzC, tints, saturation, snow)
uniform bool weathering = false;
uniform vec4 wz_a = vec4(0.18, 0.0, 0.0, 0.0);   // macro, streak, damp, soot
uniform vec4 wz_b = vec4(0.0, 0.0, 0.9, 0.0);    // lichen, drift, rough base, wet response
uniform vec4 wz_c = vec4(1.0, 0.0, 2.5, 0.25);   // tile-break, overlay amount, overlay scale, cavity
uniform vec4 tint_a : source_color = vec4(0.965, 0.941, 0.902, 1.0);
uniform vec4 tint_b : source_color = vec4(0.867, 0.894, 0.918, 1.0);
uniform float saturation = 1.0;
uniform float snow_k = 0.0;
uniform float min_up = 0.5;
uniform bool use_overlay = false;
uniform sampler2D overlay_tex : source_color, filter_linear_mipmap_anisotropic, repeat_enable;

varying vec3 v_wpos;
varying vec3 v_wnorm;

void vertex() {
	v_wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	v_wnorm = normalize(mat3(MODEL_MATRIX) * NORMAL);
}

float wz_h(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float wz_n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
	return mix(mix(wz_h(i), wz_h(i + vec2(1.0, 0.0)), f.x), mix(wz_h(i + vec2(0.0, 1.0)), wz_h(i + vec2(1.0, 1.0)), f.x), f.y); }
float wz_f(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * wz_n(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }

// three Matrix3.setUvTransform(tx, ty, sx, sy, rotation, 0, 0)
vec2 uv_xform(vec2 uv) {
	float c = cos(uv_rotation), s = sin(uv_rotation);
	return vec2(uv_repeat.x * (c * uv.x + s * uv.y) + uv_offset.x, uv_repeat.y * (-s * uv.x + c * uv.y) + uv_offset.y);
}
// three samples the flipY-uploaded image at (u, v) == image (u, 1 - v)
vec2 img(vec2 uv) { return vec2(uv.x, 1.0 - uv.y); }

// stochastic tiling (after Inigo Quilez): each region of the wall reads the
// scan at its own offset; the seams blend where the offset changes
struct Tile { vec2 oa; vec2 ob; float f; };
Tile wz_setup(vec2 uv) {
	Tile t;
	float k = wz_n(uv * 0.31 + 3.7) * 0.7 + wz_n(uv * 0.93) * 0.3;
	float l = k * 7.0, i = floor(l);
	t.f = smoothstep(0.2, 0.8, fract(l));
	t.oa = sin(vec2(3.0, 7.0) * i) * vec2(0.61, 0.37) + vec2(0.13, 0.71) * i;
	t.ob = sin(vec2(3.0, 7.0) * (i + 1.0)) * vec2(0.61, 0.37) + vec2(0.13, 0.71) * (i + 1.0);
	return t;
}
vec4 wz_tex(sampler2D s, vec2 uv, Tile t) {
	if (!weathering || wz_c.x < 0.5) return texture(s, img(uv));
	vec2 dx = dFdx(uv), dy = dFdy(uv);
	return mix(textureGrad(s, img(uv + t.oa), vec2(dx.x, -dx.y), vec2(dy.x, -dy.y)), textureGrad(s, img(uv + t.ob), vec2(dx.x, -dx.y), vec2(dy.x, -dy.y)), t.f);
}
float ground_y(vec3 p) {
	vec2 g = (p.xz - ground_rect.xy) / ground_rect.zw;
	return (g.x > 0.0 && g.x < 1.0 && g.y > 0.0 && g.y < 1.0) ? texture(ground_field, g).r : -999.0;
}
float trod(vec3 p) {
	vec2 g = (p.xz - trodden_rect.xy) / trodden_rect.zw;
	return (g.x > 0.0 && g.x < 1.0 && g.y > 0.0 && g.y < 1.0) ? texture(trodden_field, g).r : 0.0;
}
// three getTangentFrame(): TBN from derivatives of view position and UV
mat3 tangent_frame(vec3 eye_pos, vec3 n, vec2 uv) {
	vec3 q0 = dFdx(eye_pos), q1 = dFdy(eye_pos);
	vec2 st0 = dFdx(uv), st1 = dFdy(uv);
	vec3 q1perp = cross(q1, n), q0perp = cross(n, q0);
	vec3 T = q1perp * st0.x + q0perp * st1.x;
	vec3 B = q1perp * st0.y + q0perp * st1.y;
	float det = max(dot(T, T), dot(B, B));
	// three assumes a y-up framebuffer (cross(q0, q1) along +N); Godot's
	// Vulkan/Metal/D3D12 framebuffers are y-down, so take the handedness
	// from the actual screen basis instead of assuming it
	float hand = dot(cross(q0, q1), n) < 0.0 ? -1.0 : 1.0;
	float sc = (det == 0.0) ? 0.0 : hand * inversesqrt(det);
	return mat3(T * sc, B * sc, n);
}

void fragment() {
	vec2 uv = uv_xform(UV);
	Tile tile = wz_setup(uv);
	vec4 dc = albedo_color;
	if (has_albedo_tex) dc *= wz_tex(albedo_tex, uv, tile);
	float snow_amt = 0.0, damp = 0.0, cav = 0.0;
	vec3 P = v_wpos, Nw = normalize(v_wnorm);
	float rough = roughness_value;
	float ao = 1.0;
	if (weathering) {
		dc.rgb = mix(vec3(dot(dc.rgb, vec3(0.3, 0.55, 0.15))), dc.rgb, saturation);
		float up = Nw.y;
		float gy = ground_y(P);
		float above = gy > -900.0 ? P.y - gy : 50.0;
		float m1 = wz_f(P.xz * 0.045 + vec2(P.y * 0.03, -P.y * 0.02));
		float m2 = wz_f(P.xz * 0.17 - P.y * 0.11 + 9.0);
		vec3 tint = mix(tint_b.rgb, tint_a.rgb, smoothstep(0.3, 0.7, m2));
		dc.rgb *= mix(vec3(1.0), tint, 0.55) * mix(1.0 - wz_a.x, 1.0 + wz_a.x * 0.55, m1);
		vec2 tn = normalize(vec2(-Nw.z, Nw.x) + 1e-4);
		float along = dot(P.xz, tn);
		float st = wz_f(vec2(along * 1.1, P.y * 0.07 + wz_n(vec2(along * 0.3, 1.0)) * 1.5));
		float vert = 1.0 - abs(up);
		dc.rgb *= 1.0 - wz_a.y * vert * smoothstep(0.5, 0.78, st) * (0.6 + 0.4 * m1);
		float band = 0.55 + 0.9 * wz_n(vec2(along * 0.35, 3.1));
		damp = wz_a.z * (1.0 - smoothstep(0.0, band, above)) * (0.55 + 0.45 * vert);
		dc.rgb *= mix(1.0, 0.58, damp);
		dc.rgb = mix(dc.rgb, dc.rgb * vec3(0.86, 0.92, 0.82), damp * 0.6);
		float soot = wz_a.w * smoothstep(0.05, -0.75, up) * (0.45 + 0.55 * wz_f(P.xz * 0.35 + P.y * 0.2));
		soot += wz_a.w * 0.35 * vert * smoothstep(1.6, 5.5, above) * wz_f(P.xz * 0.2 + 4.0);
		dc.rgb *= 1.0 - clamp(soot, 0.0, 0.8);
		float lich = wz_b.x * smoothstep(0.58, 0.8, wz_f(P.xz * 0.6 + P.y * 0.4 + 31.0)) * (0.35 + 0.65 * smoothstep(0.2, -0.8, Nw.z)) * (0.5 + 0.5 * vert);
		dc.rgb = mix(dc.rgb, vec3(0.43, 0.44, 0.32) * dot(dc.rgb, vec3(0.5)) * 2.2, lich * 0.55);
		if (use_overlay) {
			vec2 ouv = uv * wz_c.z;
			float om = smoothstep(0.5, 0.66, wz_f(P.xz * 0.22 + P.y * 0.25 + 5.0) + 0.16 * wz_n(ouv * 3.0) + 0.06 * wz_n(ouv * 11.0)) * wz_c.y * (1.0 - damp) * 0.85;
			vec3 oc = texture(overlay_tex, img(ouv)).rgb;
			oc = mix(vec3(dot(oc, vec3(0.33))), oc, 0.55) * vec3(0.93, 0.92, 0.9);
			dc.rgb = mix(dc.rgb, oc, om);
			cav = om;
		}
		if (snow_k > 0.0) {
			float upk = smoothstep(min_up, min_up + 0.28, up);
			float n = wz_f(P.xz * 0.32 + P.y * 0.05) * 0.8 + wz_n(P.xz * 2.1) * 0.2;
			float cover = snow_cover * snow_k;
			snow_amt = upk * smoothstep(0.95 - cover * 1.3, 1.25 - cover * 1.3, n + 0.2);
			snow_amt *= 1.0 - 0.8 * trod(P) * (1.0 - smoothstep(1.2, 2.0, above)) * smoothstep(0.35, 0.65, n + 0.25 * wz_n(P.xz * 3.0));
			float drift = wz_b.y * vert * (1.0 - smoothstep(0.02, 0.18 + 0.4 * wz_n(vec2(along * 0.8, 7.0)), above)) * (1.0 - trod(P) * 0.9) * smoothstep(0.2, 0.5, snow_cover);
			drift *= smoothstep(0.3, 0.58, wz_f(vec2(along * 0.28 + 17.0, P.y * 0.1))) * (0.45 + 0.55 * smoothstep(0.55, -0.25, Nw.z));
			snow_amt = max(snow_amt, drift);
			vec3 snow_col = vec3(0.9, 0.93, 0.97) * (0.9 + 0.1 * wz_n(P.xz * 40.0));
			dc.rgb = mix(dc.rgb, snow_col, snow_amt);
		}
		rough = wz_b.z;
	}
	if (has_arm_tex) {
		vec3 arm = wz_tex(arm_tex, uv, tile).rgb;
		ao = 1.0 + (arm.r - 1.0) * ao_strength;
		if (!weathering && rough_from_arm) rough *= arm.g;
		if (weathering) {
			rough = clamp(mix(rough, arm.g, 0.65) + (0.55 - arm.r) * wz_c.w * 0.5, 0.2, 1.0);
			dc.rgb *= mix(1.0, smoothstep(0.0, 0.85, arm.r), 0.4 * (1.0 - cav));
		}
	}
	if (weathering) {
		float w = clamp(damp * 0.9 + wetness * wz_b.w, 0.0, 1.0);
		rough = mix(rough, 0.32, w * 0.75);
		dc.rgb *= 1.0 - w * 0.18;
		rough = mix(rough, 0.82, snow_amt);
		float gy2 = ground_y(P), ab2 = gy2 > -900.0 ? P.y - gy2 : 50.0;
		float wear = trod(P) * smoothstep(0.7, 0.95, Nw.y) * (1.0 - smoothstep(1.2, 2.0, ab2)) * (1.0 - snow_amt);
		rough = mix(rough, rough * 0.62, wear * 0.7);
		dc.rgb *= 1.0 + 0.1 * wear;
	}
	vec3 n = normalize(NORMAL);
	if (has_normal_tex) {
		// normal maps are imported RGTC-compressed (two channels): rebuild z
		// from xy, as Godot's own NORMAL_MAP path does, then scale xy (three
		// normalScale)
		vec3 mapn;
		mapn.xy = wz_tex(normal_tex, uv, tile).xy * 2.0 - 1.0;
		mapn.z = sqrt(max(0.0, 1.0 - dot(mapn.xy, mapn.xy)));
		mapn.xy *= normal_strength;
		mat3 tbn = tangent_frame(VERTEX, n, uv);
		n = normalize(tbn * mapn);
	}
	if (snow_amt > 0.0) {
		vec3 up_view = normalize((VIEW_MATRIX * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
		n = normalize(mix(n, up_view, snow_amt * 0.75));
	}
	NORMAL = n;
	ALBEDO = dc.rgb;
	ROUGHNESS = rough;
	METALLIC = metallic_value;
	AO = clamp(ao * mix(1.0, min(env_intensity, 1.0), ibl_share), 0.0, 1.0);
	AO_LIGHT_AFFECT = 0.0;
	if (emission_energy > 0.0) {
		vec3 e = emission_color.rgb;
		if (emission_from_albedo_tex) e *= texture(albedo_tex, img(uv)).rgb;
		EMISSION = e * emission_energy;
	}
#ifdef ABBEY_ALPHA
	ALPHA = dc.a * opacity;
#endif
}
