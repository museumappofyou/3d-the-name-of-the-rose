import * as THREE from 'three';

// Weathering for the masonry and timber of the abbey. One shader extension
// does the work the photographs cannot: it breaks up the repetition of a
// scanned tile, stains large walls with world-space discolouration and
// rain streaks, darkens and wets the foot of every wall where the damp
// rises from the ground, blackens vaults with the soot of lamps and
// hearths, lets lichen creep over the cold north stone, patches rubble
// with old plaster, and lays snow on ledges and in drifts at the wall
// base. Everything is driven by world position, so no two stretches of
// wall look alike.
//
// shared uniforms: the ground height (a small height field of the plateau
// written by terrain.js) and the trodden-path mask, so drifts and damp
// know where the ground is and where people walk.

export const W = {
  uSnow: null, uWet: { value: 0.15 }, uTime: null,
  tGround: { value: blankTex(0) }, uGround: { value: new THREE.Vector4(-150, -120, 300, 0) },
  tMask: { value: blankTex(0) }, uMask: { value: new THREE.Vector3(-150, -120, 300) },
};
function blankTex(v) {
  const t = new THREE.DataTexture(new Uint8Array([v, v, v, 255]), 1, 1);
  t.needsUpdate = true;
  return t;
}

const GLSL = /* glsl */`
uniform float wzSnow, wzWet, wzSnowK, wzMinUp;
uniform sampler2D wzGround, wzMask; uniform vec4 wzGroundR; uniform vec3 wzMaskR;
uniform vec4 wzA;   // macro, streak, damp, soot
uniform vec4 wzB;   // lichen, drift, rough base, wetness response
uniform vec4 wzC;   // tile-break on, overlay amount, overlay scale, cavity rough
uniform vec3 wzTintA, wzTintB; uniform float wzSat;
#ifdef WZ_OVERLAY
uniform sampler2D wzOvMap, wzOvNrm;
#endif
varying vec3 vWzP; varying vec3 vWzN;
float wz_h(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float wz_n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(wz_h(i),wz_h(i+vec2(1,0)),f.x),mix(wz_h(i+vec2(0,1)),wz_h(i+vec2(1,1)),f.x),f.y); }
float wz_f(vec2 p){ float a=.5, s=0.; for(int i=0;i<4;i++){ s+=a*wz_n(p); p=p*2.03+17.1; a*=.5; } return s; }
// stochastic tiling (after Inigo Quilez): each region of the wall reads the
// scan at its own offset; the seams blend where the offset changes
vec2 wzOA, wzOB; float wzF;
void wzSetup(vec2 uv){
  float k = wz_n(uv*0.31 + 3.7) * 0.7 + wz_n(uv*0.93) * 0.3;
  float l = k*7.0, i = floor(l);
  wzF = smoothstep(0.2, 0.8, fract(l));
  wzOA = sin(vec2(3.0,7.0)*i)*vec2(0.61, 0.37) + vec2(0.13, 0.71)*i;
  wzOB = sin(vec2(3.0,7.0)*(i+1.0))*vec2(0.61, 0.37) + vec2(0.13, 0.71)*(i+1.0);
}
vec4 wzTex(sampler2D s, vec2 uv){
  if (wzC.x < 0.5) return texture2D(s, uv);
  vec2 dx = dFdx(uv), dy = dFdy(uv);
  return mix(textureGrad(s, uv + wzOA, dx, dy), textureGrad(s, uv + wzOB, dx, dy), wzF);
}
float wzGroundY(){
  vec2 g = (vWzP.xz - wzGroundR.xy) / wzGroundR.z;
  return (g.x > 0. && g.x < 1. && g.y > 0. && g.y < 1.) ? texture2D(wzGround, g).r : -999.0;
}
float wzTrod(){
  vec2 g = (vWzP.xz - wzMaskR.xy) / wzMaskR.z;
  return (g.x > 0. && g.x < 1. && g.y > 0. && g.y < 1.) ? texture2D(wzMask, g).r : 0.0;
}
float wzSnowAmt, wzDamp, wzCav;
`;

// opts: { tile, macro, streak, damp, soot, lichen, drift, rough, wet,
//         snow (strength) | false, minUp, tintA, tintB, overlay: {map, normal, amount, scale}, cavity }
export function dress(m, o = {}) {
  const u = {
    wzSnow: shared().uSnow, wzWet: W.uWet,
    wzSnowK: { value: o.snow === false || o.snow == null ? 0 : o.snow }, wzMinUp: { value: o.minUp ?? 0.5 },
    wzGround: W.tGround, wzGroundR: W.uGround, wzMask: W.tMask, wzMaskR: W.uMask,
    wzA: { value: new THREE.Vector4(o.macro ?? 0.18, o.streak ?? 0, o.damp ?? 0, o.soot ?? 0) },
    wzB: { value: new THREE.Vector4(o.lichen ?? 0, o.drift ?? 0, o.rough ?? 0.9, o.wet ?? 0) },
    wzC: { value: new THREE.Vector4(o.tile === false ? 0 : 1, o.overlay?.amount ?? 0, o.overlay?.scale ?? 2.5, o.cavity ?? 0.25) },
    wzTintA: { value: new THREE.Color(o.tintA ?? 0xf6f0e6) }, wzTintB: { value: new THREE.Color(o.tintB ?? 0xdde4ea) }, wzSat: { value: o.sat ?? 1 },
  };
  if (o.overlay) { u.wzOvMap = { value: o.overlay.map }; u.wzOvNrm = { value: o.overlay.normal }; }
  m.userData.wz = u;
  if (o.snow) m.userData.snow = true;
  const key = ['wz', !!o.overlay, m.aoMap ? 1 : 0, m.normalMap ? 1 : 0].join(':');
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    if (o.overlay) sh.defines = { ...(sh.defines || {}), WZ_OVERLAY: '' };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWzP; varying vec3 vWzN;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        {
        #ifdef USE_INSTANCING
          vec4 wzw = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
          vWzN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);
        #else
          vec4 wzw = modelMatrix * vec4(transformed, 1.0);
          vWzN = normalize(mat3(modelMatrix) * objectNormal);
        #endif
          vWzP = wzw.xyz;
        }`);
    const nm = THREE.ShaderChunk.normal_fragment_maps.replace('texture2D( normalMap, vNormalMapUv )', 'wzTex( normalMap, vNormalMapUv )');
    const ao = THREE.ShaderChunk.aomap_fragment.replace('texture2D( aoMap, vAoMapUv )', 'wzTex( aoMap, vAoMapUv )');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + GLSL)
      .replace('#include <map_fragment>', `
        wzSetup(vMapUv);
        vec4 sampledDiffuseColor = wzTex(map, vMapUv);
        diffuseColor *= sampledDiffuseColor;
        diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.3, 0.55, 0.15))), diffuseColor.rgb, wzSat);
        {
          vec3 P = vWzP, N = normalize(vWzN);
          float up = N.y;
          float gy = wzGroundY();
          float above = gy > -900. ? P.y - gy : 50.0;
          // large-scale discolouration: no two stretches of wall alike
          float m1 = wz_f(P.xz*0.045 + vec2(P.y*0.03, -P.y*0.02));
          float m2 = wz_f(P.xz*0.17 - P.y*0.11 + 9.0);
          vec3 tint = mix(wzTintB, wzTintA, smoothstep(0.3, 0.7, m2));
          diffuseColor.rgb *= mix(vec3(1.0), tint, 0.55) * mix(1.0 - wzA.x, 1.0 + wzA.x*0.55, m1);
          // rain and seepage streaks run down the walls
          vec2 tn = normalize(vec2(-N.z, N.x) + 1e-4);
          float along = dot(P.xz, tn);
          float st = wz_f(vec2(along*1.1, P.y*0.07 + wz_n(vec2(along*0.3, 1.0))*1.5));
          float vert = 1.0 - abs(up);
          diffuseColor.rgb *= 1.0 - wzA.y * vert * smoothstep(0.5, 0.78, st) * (0.6 + 0.4*m1);
          // rising damp and splash at the foot of the wall
          float band = 0.55 + 0.9*wz_n(vec2(along*0.35, 3.1));
          wzDamp = wzA.z * (1.0 - smoothstep(0.0, band, above)) * (0.55 + 0.45*vert);
          diffuseColor.rgb *= mix(1.0, 0.58, wzDamp);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb*vec3(0.86,0.92,0.82), wzDamp*0.6);
          // soot on the undersides of vaults and hoods, in soft clouds
          float soot = wzA.w * smoothstep(0.05, -0.75, up) * (0.45 + 0.55*wz_f(P.xz*0.35 + P.y*0.2));
          soot += wzA.w * 0.35 * vert * smoothstep(1.6, 5.5, above) * wz_f(P.xz*0.2 + 4.0);
          diffuseColor.rgb *= 1.0 - clamp(soot, 0.0, 0.8);
          // lichen and moss on the cold stone, mostly on the north faces
          float lich = wzB.x * smoothstep(0.58, 0.8, wz_f(P.xz*0.6 + P.y*0.4 + 31.0)) * (0.35 + 0.65*smoothstep(0.2, -0.8, N.z)) * (0.5 + 0.5*vert);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.43,0.44,0.32)*dot(diffuseColor.rgb, vec3(0.5)) * 2.2, lich*0.55);
        #ifdef WZ_OVERLAY
          // patches of old lime plaster clinging to the rubble
          vec2 ouv = vMapUv * wzC.z;
          // (soft, broken edges: lime falls away in flakes, not in cut shapes)
          float om = smoothstep(0.5, 0.66, wz_f(P.xz*0.22 + P.y*0.25 + 5.0) + 0.16*wz_n(ouv*3.0) + 0.06*wz_n(ouv*11.0)) * wzC.y * (1.0 - wzDamp) * 0.85;
          vec3 oc = texture2D(wzOvMap, ouv).rgb; oc = mix(vec3(dot(oc, vec3(0.33))), oc, 0.55) * vec3(0.93, 0.92, 0.9);
          diffuseColor.rgb = mix(diffuseColor.rgb, oc, om);
          wzCav = om;
        #else
          wzCav = 0.0;
        #endif
          // snow on ledges, sills and in drifts along the base of the walls
          wzSnowAmt = 0.0;
          if (wzSnowK > 0.0) {
            float upk = smoothstep(wzMinUp, wzMinUp + 0.28, up);
            float n = wz_f(P.xz*0.32 + P.y*0.05) * .8 + wz_n(P.xz*2.1) * .2;
            float cover = wzSnow * wzSnowK;
            wzSnowAmt = upk * smoothstep(0.95 - cover*1.3, 1.25 - cover*1.3, n + .2);
            // feet wear the snow off the paving along the ways people walk
            // (the trodden mask of the paths), at ground level only
            wzSnowAmt *= 1.0 - 0.8 * wzTrod() * (1.0 - smoothstep(1.2, 2.0, above)) * smoothstep(0.35, 0.65, n + 0.25 * wz_n(P.xz * 3.0));
            float drift = wzB.y * vert * (1.0 - smoothstep(0.02, 0.18 + 0.4*wz_n(vec2(along*0.8, 7.0)), above)) * (1.0 - wzTrod()*0.9) * smoothstep(0.2, 0.5, wzSnow);
            // not a ruled white skirt: the drift lies in banks with bare,
            // wet gaps between, and melts back on the sunny south faces
            drift *= smoothstep(0.3, 0.58, wz_f(vec2(along*0.28 + 17.0, P.y*0.1))) * (0.45 + 0.55*smoothstep(0.55, -0.25, N.z));
            wzSnowAmt = max(wzSnowAmt, drift);
            vec3 snowCol = vec3(.9,.93,.97) * (0.9 + 0.1*wz_n(P.xz*40.0));
            diffuseColor.rgb = mix(diffuseColor.rgb, snowCol, wzSnowAmt);
          }
        }`)
      .replace('#include <roughnessmap_fragment>', `
        float roughnessFactor = wzB.z;
        #ifdef USE_AOMAP
          // the *_a textures are Poly Haven ARM packs: R occlusion, G the
          // scanned roughness, B metal. The measured roughness leads; the
          // material's own value and the cavities only bias it.
          vec3 wzArm = wzTex(aoMap, vAoMapUv).rgb;
          float wzAo = wzArm.r;
          roughnessFactor = clamp(mix(roughnessFactor, wzArm.g, 0.65) + (0.55 - wzAo) * wzC.w * 0.5, 0.2, 1.0);
          // mortar joints and pits stay dark in direct light too
          diffuseColor.rgb *= mix(1.0, smoothstep(0.0, 0.85, wzAo), 0.4 * (1.0 - wzCav));
        #endif
        // wet stone: darker and glossier where damp or after fog and thaw
        float wzW = clamp(wzDamp * 0.9 + wzWet * wzB.w, 0.0, 1.0);
        roughnessFactor = mix(roughnessFactor, 0.32, wzW * 0.75);
        diffuseColor.rgb *= 1.0 - wzW * 0.18;
        roughnessFactor = mix(roughnessFactor, .82, wzSnowAmt);
        // worn smooth where feet go: along the trodden ways the paving is
        // polished a little glossier and paler (ground-level floors only)
        {
          float gy2 = wzGroundY(), ab2 = gy2 > -900. ? vWzP.y - gy2 : 50.0;
          float wear = wzTrod() * smoothstep(0.7, 0.95, normalize(vWzN).y) * (1.0 - smoothstep(1.2, 2.0, ab2)) * (1.0 - wzSnowAmt);
          roughnessFactor = mix(roughnessFactor, roughnessFactor * 0.62, wear * 0.7);
          diffuseColor.rgb *= 1.0 + 0.1 * wear;
        }`)
      .replace('#include <normal_fragment_maps>', nm + `
        normal = normalize(mix(normal, normalize((viewMatrix*vec4(0.,1.,0.,0.)).xyz), wzSnowAmt*.75));`)
      .replace('#include <aomap_fragment>', ao);
  };
  m.customProgramCacheKey = () => key;
  return m;
}

let _shared = null;
export function bindShared(s) { _shared = s; W.uSnow = s.uSnow; W.uTime = s.uTime; }
function shared() { return _shared; }
