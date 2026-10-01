shader_type sky;
// The browser's sky (src/systems/sky.js Atmosphere), ported line by line:
// three.js r180 examples/jsm/objects/Sky.js (Preetham), then sky.js's night
// dome and ground dome blended over it in their render order. In the
// radiance (cubemap) pass it is instead the browser's PMREM scene: the bare
// sky (with the night-time sun swap of updateEnv) times
// scene.environmentIntensity, so reflections see what three reflects.
// All colours are linear (three's working space).

uniform float turbidity = 2.0;
uniform float rayleigh = 1.0;
uniform float mie_coefficient = 0.005;
uniform float mie_directional_g = 0.8;
uniform vec3 sun_position = vec3(0.0, 1.0, 0.0);
uniform vec3 env_sun_position = vec3(0.0, 1.0, 0.0);
uniform float env_intensity = 1.0;
uniform float night_alpha = 0.0;
uniform vec3 night_top = vec3(0.0015, 0.0027, 0.0070);
uniform vec3 night_horizon = vec3(0.01, 0.015, 0.02);
uniform vec3 fog_color = vec3(0.5, 0.55, 0.6);
uniform vec3 land_color = vec3(0.0284, 0.0356, 0.0298);
uniform float day_k = 1.0;
uniform float energy = 1.0;   // experiment knob only; 1.0 is the browser

const vec3 UP = vec3(0.0, 1.0, 0.0);
const float E_CONST = 2.71828182845904523536028747135266249775724709369995957;
const vec3 TOTAL_RAYLEIGH = vec3(5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5);
const vec3 MIE_CONST = vec3(1.8399918514433978E14, 2.7798023919660528E14, 4.0790479543861094E14);
const float CUTOFF_ANGLE = 1.6110731556870734;
const float STEEPNESS = 1.5;
const float EE = 1000.0;
const float RAYLEIGH_ZENITH_LENGTH = 8.4E3;
const float MIE_ZENITH_LENGTH = 1.25E3;
const float SUN_ANGULAR_DIAMETER_COS = 0.999956676946448443553574619906976478926848692873900859324;
const float THREE_OVER_SIXTEENPI = 0.05968310365946075;
const float ONE_OVER_FOURPI = 0.07957747154594767;

float sun_intensity(float zenith_angle_cos) {
	zenith_angle_cos = clamp(zenith_angle_cos, -1.0, 1.0);
	return EE * max(0.0, 1.0 - pow(E_CONST, -((CUTOFF_ANGLE - acos(zenith_angle_cos)) / STEEPNESS)));
}

// Sky.js vertex + fragment stages in one (there is no vertex stage here)
vec3 preetham(vec3 direction, vec3 sun_pos) {
	vec3 sun_dir = normalize(sun_pos);
	float sun_e = sun_intensity(dot(sun_dir, UP));
	float sunfade = 1.0 - clamp(1.0 - exp(sun_pos.y / 450000.0), 0.0, 1.0);
	float rayleigh_coefficient = rayleigh - (1.0 * (1.0 - sunfade));
	vec3 beta_r = TOTAL_RAYLEIGH * rayleigh_coefficient;
	vec3 beta_m = 0.434 * ((0.2 * turbidity) * 10E-18) * MIE_CONST * mie_coefficient;
	float zenith_angle = acos(max(0.0, dot(UP, direction)));
	float inv = 1.0 / (cos(zenith_angle) + 0.15 * pow(93.885 - ((zenith_angle * 180.0) / PI), -1.253));
	vec3 fex = exp(-(beta_r * RAYLEIGH_ZENITH_LENGTH * inv + beta_m * MIE_ZENITH_LENGTH * inv));
	float cos_theta = dot(direction, sun_dir);
	float r_phase = THREE_OVER_SIXTEENPI * (1.0 + pow(cos_theta * 0.5 + 0.5, 2.0));
	float g2 = mie_directional_g * mie_directional_g;
	float m_phase = ONE_OVER_FOURPI * ((1.0 - g2) / pow(1.0 - 2.0 * mie_directional_g * cos_theta + g2, 1.5));
	vec3 scatter = (beta_r * r_phase + beta_m * m_phase) / (beta_r + beta_m);
	vec3 lin = pow(sun_e * scatter * (1.0 - fex), vec3(1.5));
	lin *= mix(vec3(1.0), pow(sun_e * scatter * fex, vec3(0.5)), clamp(pow(1.0 - dot(UP, sun_dir), 5.0), 0.0, 1.0));
	vec3 l0 = vec3(0.1) * fex;
	float sundisk = smoothstep(SUN_ANGULAR_DIAMETER_COS, SUN_ANGULAR_DIAMETER_COS + 0.00002, cos_theta);
	l0 += (sun_e * 19000.0 * fex) * sundisk;
	vec3 tex_color = (lin + l0) * 0.04 + vec3(0.0, 0.0003, 0.00075);
	return pow(tex_color, vec3(1.0 / (1.2 + (1.2 * sunfade))));
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
	vec2 i = floor(p), f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

void sky() {
	vec3 dir = normalize(EYEDIR);
	if (AT_CUBEMAP_PASS) {
		COLOR = preetham(dir, env_sun_position) * env_intensity * energy;
	} else {
		vec3 col = preetham(dir, sun_position) * energy;
		// night dome: a dark vault over the Preetham sky after dusk
		col = mix(col, mix(night_horizon, night_top, smoothstep(-0.05, 0.5, dir.y)), night_alpha);
		// ground dome: hazy lowland below the horizon past the mountains
		float d = -dir.y;
		if (d > 0.002) {
			float a = smoothstep(0.0, 0.07, d), t = smoothstep(0.02, 0.35, d);
			vec2 g = dir.xz / max(d, 0.02) * 1.5;
			float n = vnoise(g) * 0.6 + vnoise(g * 2.7 + 5.0) * 0.4;
			vec3 land = mix(fog_color * 0.2, land_color, day_k);
			vec3 low = mix(fog_color * 0.72, land, 0.45) * mix(1.08, 0.7, smoothstep(0.45, 0.7, n));
			col = mix(col, mix(fog_color * 0.95, low, t), a);
		}
		COLOR = col;
	}
}
