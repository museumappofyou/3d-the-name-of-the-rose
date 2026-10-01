import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Geometry kit for masonry architecture. Every helper returns a
// non-indexed BufferGeometry with position/normal/uv, UVs in metres.

const V3 = THREE.Vector3;
export const TAU = Math.PI * 2;

export function clean(g) {
  let n = g.index ? g.toNonIndexed() : g;
  if (n !== g) g.dispose();
  // vertex colour survives only for materials that use it (embers, cabbage)
  for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) n.deleteAttribute(k);
  if (!n.attributes.normal) n.computeVertexNormals();
  if (!n.attributes.uv) n.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2));
  n.clearGroups();
  return n;
}

// planar projection by dominant face normal, in the geometry's own frame
export function boxUV(g, s = 1) {
  g = clean(g);
  const p = g.attributes.position, uv = g.attributes.uv;
  const a = new V3(), b = new V3(), c = new V3(), n = new V3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    n.subVectors(c, b).cross(new V3().subVectors(a, b)).normalize();
    const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
    for (let k = 0; k < 3; k++) {
      const v = [a, b, c][k];
      if (ay >= ax && ay >= az) uv.setXY(i + k, v.x * s, v.z * s);
      else if (ax >= az) uv.setXY(i + k, v.z * s, v.y * s);
      else uv.setXY(i + k, v.x * s, v.y * s);
    }
  }
  uv.needsUpdate = true;
  return g;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
export function place(g, { x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = {}) {
  _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e);
  _m.compose(new V3(x, y, z), _q, new V3(sx, sy, sz));
  g.applyMatrix4(_m);
  return g;
}

export function box(w, h, d, o = {}) {
  const g = boxUV(new THREE.BoxGeometry(w, h, d));
  g.translate(0, h / 2, 0);
  return place(g, o);
}
export function cyl(rTop, rBot, h, seg = 16, o = {}, open = false) {
  const g = clean(new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, open));
  const uv = g.attributes.uv, circ = TAU * Math.max(rTop, rBot);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * circ, uv.getY(i) * h);
  g.translate(0, h / 2, 0);
  return place(g, o);
}
export function sphere(r, o = {}, ws = 16, hs = 10, phiLen = TAU, thetaLen = Math.PI) {
  const g = clean(new THREE.SphereGeometry(r, ws, hs, 0, phiLen, 0, thetaLen));
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * TAU * r, uv.getY(i) * Math.PI * r);
  return place(g, o);
}
export function lathe(profile, seg = 16, o = {}) {
  const g = clean(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg));
  // u around the circumference, v by true height (metres)
  const uv = g.attributes.uv, p = g.attributes.position;
  const R = Math.max(...profile.map(q => q[0]));
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.PI * 2 * R, p.getY(i));
  return place(g, o);
}
// ---------------------------------------------------------------------
// Polygon prism (floors, slabs, platforms). poly: [[x,z],...]
// ---------------------------------------------------------------------
export function prism(poly, y0, y1, { top = true, bottom = true, sides = true, holes = [] } = {}) {
  const parts = [];
  const shape = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
  for (const h of holes) shape.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z))));
  const cap = (y, up) => {
    const g = clean(new THREE.ShapeGeometry(shape));
    g.rotateX(-Math.PI / 2); // shape (x,-z) -> (x, 0, z)
    g.translate(0, y, 0);
    const uv = g.attributes.uv, p = g.attributes.position;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), p.getZ(i));
    if (!up) flip(g);
    return g;
  };
  if (top) parts.push(cap(y1, true));
  if (bottom) parts.push(cap(y0, false));
  if (sides) {
    for (const ring of [poly, ...holes]) {
      const isHole = ring !== poly;
      let run = 0;
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i], b = ring[(i + 1) % ring.length];
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        parts.push(quad([a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], run, run + L, y0, y1));
        run += L;
      }
      void isHole;
    }
  }
  const g = merge(parts);
  orientOutward(g, poly);
  return g;
}

// ensure side faces point away from polygon interior (winding-agnostic)
function orientOutward(g, poly) {
  // cheap: use signed area to decide once
  let a = 0;
  for (let i = 0; i < poly.length; i++) { const [x0, z0] = poly[i], [x1, z1] = poly[(i + 1) % poly.length]; a += x0 * z1 - x1 * z0; }
  g.userData.ccw = a > 0;
}

export function flip(g) {
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i += 3) {
    for (const att of [p, n, uv]) {
      const s = att.itemSize;
      for (let k = 0; k < s; k++) { const t = att.array[(i + 1) * s + k]; att.array[(i + 1) * s + k] = att.array[(i + 2) * s + k]; att.array[(i + 2) * s + k] = t; }
    }
  }
  for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  p.needsUpdate = n.needsUpdate = uv.needsUpdate = true;
  return g;
}

// double-sided quad a,b,c,d (counter-clockwise front), uv u0..u1 × v0..v1
export function quad(a, b, c, d, u0 = 0, u1 = 1, v0 = 0, v1 = 1, double = true) {
  const pos = [...a, ...b, ...c, ...a, ...c, ...d];
  const uvs = [u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1];
  if (double) { pos.push(...a, ...c, ...b, ...a, ...d, ...c); uvs.push(u0, v0, u1, v1, u1, v0, u0, v0, u0, v1, u1, v1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  return g;
}

export function merge(list) {
  const ok = list.filter(Boolean).map(clean);
  if (!ok.length) return new THREE.BufferGeometry();
  if (ok.length === 1) return ok[0];
  if (ok.some(g => g.attributes.color) && !ok.every(g => g.attributes.color))
    for (const g of ok) if (!g.attributes.color) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3));
  const m = mergeGeometries(ok, false);
  ok.forEach(g => g.dispose());
  return m;
}

// ---------------------------------------------------------------------
// Walls with openings
// ---------------------------------------------------------------------
// opening: { t: centre along wall (m), w, y0 (sill, relative to wall base),
//            y1 (springing/top), arch: 'round'|'pointed'|'flat'|'segment' }
function archPts(cx, w, spring, arch, seg = 10) {
  // points from the right springer to the left springer
  const r = w / 2, pts = [];
  if (!arch || arch === 'flat') return [[cx + r, spring], [cx - r, spring]];
  if (arch === 'round') {
    for (let i = 0; i <= seg; i++) { const a = Math.PI * i / seg; pts.push([cx + r * Math.cos(a), spring + r * Math.sin(a)]); }
  } else if (arch === 'segment') {
    const rise = r * 0.45, R = (r * r + rise * rise) / (2 * rise), a0 = Math.asin(r / R);
    for (let i = 0; i <= seg; i++) { const t = a0 - 2 * a0 * i / seg; pts.push([cx + R * Math.sin(t), spring + R * Math.cos(t) - (R - rise)]); }
  } else { // pointed, equilateral
    const h = Math.max(2, seg >> 1);
    for (let i = 0; i <= h; i++) { const a = (Math.PI / 3) * i / h; pts.push([cx - r + w * Math.cos(a), spring + w * Math.sin(a)]); }
    for (let i = 1; i <= h; i++) { const a = 2 * Math.PI / 3 + (Math.PI / 3) * i / h; pts.push([cx + r + w * Math.cos(a), spring + w * Math.sin(a)]); }
  }
  return pts;
}
export function archHeight(w, arch) {
  return arch === 'round' ? w / 2 : arch === 'pointed' ? w * 0.866 : arch === 'segment' ? w * 0.225 : 0;
}

// Wall between plan points a=[x,z] and b=[x,z], base y0 to top y1,
// thickness th, centred on the a–b line.
export function wall(a, b, y0, y1, th, openings = [], { endCaps = true } = {}) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const H = y1 - y0;
  // an opening that reaches the top of a low wall (a plinth, a parapet, a
  // fence) cuts it in two: no sliver of lintel is left across the gap
  const cut = openings.find(o => o.y0 <= 0.001 && o.y1 >= H - 0.12);
  if (cut) {
    const l = Math.max(0, cut.t - cut.w / 2), r = Math.min(L, cut.t + cut.w / 2);
    const at = t => [a[0] + (b[0] - a[0]) * t / L, a[1] + (b[1] - a[1]) * t / L];
    const rest = openings.filter(o => o !== cut);
    const parts = [];
    if (l > 0.03) parts.push(wall(a, at(l), y0, y1, th, rest.filter(o => o.t + o.w / 2 <= l), { endCaps }));
    if (L - r > 0.03) parts.push(wall(at(r), b, y0, y1, th, rest.filter(o => o.t - o.w / 2 >= r).map(o => ({ ...o, t: o.t - r })), { endCaps }));
    return parts.length ? merge(parts) : null;
  }
  const doors = openings.filter(o => o.y0 <= 0.001).sort((p, q) => p.t - q.t);
  // a window whose hole would cut into a door's outline breaks the shape
  // (the wall would be triangulated solid): such a window gives way
  const wins = openings.filter(o => o.y0 > 0.001 && !doors.some(d => Math.abs(o.t - d.t) < (o.w + d.w) / 2 + 0.15 && o.y0 < Math.min(d.y1, H) + archHeight(d.w, d.arch) + 0.15));
  const outline = [[0, 0]];
  for (const d of doors) {
    const l = Math.max(0.02, d.t - d.w / 2), r = Math.min(L - 0.02, d.t + d.w / 2);
    const sp = Math.min(d.y1, H - archHeight(d.w, d.arch) - 0.05);
    outline.push([l, 0], [l, sp]);
    const ap = archPts((l + r) / 2, r - l, sp, d.arch || 'flat');
    // ap runs right→left for round/segment; we need left→right
    const ordered = ap[0][0] > ap[ap.length - 1][0] ? ap.slice().reverse() : ap;
    for (const p of ordered) outline.push(p);
    outline.push([r, sp], [r, 0]);
  }
  outline.push([L, 0], [L, H], [0, H]);
  const shape = new THREE.Shape(dedupe(outline).map(([x, y]) => new THREE.Vector2(x, y)));
  for (const w of wins) {
    const l = w.t - w.w / 2, r = w.t + w.w / 2;
    const top = Math.min(w.y1, H - archHeight(w.w, w.arch) - 0.1);
    const ap = archPts(w.t, w.w, top, w.arch || 'flat');
    const ordered = ap[0][0] > ap[ap.length - 1][0] ? ap.slice().reverse() : ap;
    const pts = [[l, w.y0], [r, w.y0], ...ordered.slice().reverse()];
    // ensure path: bottom-left → bottom-right → arch (right→left)
    const path = new THREE.Path(dedupe([[l, w.y0], [r, w.y0], [r, top], ...ordered.slice().reverse().slice(1, -1), [l, top]]).map(([x, y]) => new THREE.Vector2(x, y)));
    void pts;
    shape.holes.push(path);
  }
  let g = new THREE.ExtrudeGeometry(shape, { depth: th, bevelEnabled: false, curveSegments: 8 });
  g = clean(g);
  g.translate(0, 0, -th / 2);
  // reveal/top faces get sensible UVs: re-project by face normal
  g = boxUV(g);
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  place(g, { x: a[0], y: y0, z: a[1], ry: -ang });
  void endCaps;
  return g;
}
function dedupe(pts) {
  const out = [];
  for (const p of pts) { const q = out[out.length - 1]; if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-4) out.push(p); }
  if (out.length > 2 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) < 1e-4) out.pop();
  return out;
}

// polyline of walls; `openings` is a map segIndex -> [openings]
export function wallLoop(pts, y0, y1, th, openings = {}, closed = true) {
  const parts = [];
  const n = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    // extend each segment by half thickness at both ends to close corners
    const d = [b[0] - a[0], b[1] - a[1]], L = Math.hypot(...d), u = [d[0] / L, d[1] / L];
    const e = th / 2;
    const a2 = [a[0] - u[0] * e, a[1] - u[1] * e], b2 = [b[0] + u[0] * e, b[1] + u[1] * e];
    const ops = (openings[i] || []).map(o => ({ ...o, t: o.t + e }));
    parts.push(wall(a2, b2, y0, y1, th, ops));
  }
  return merge(parts);
}

// window glazing panel filling an opening (for glass/alabaster materials)
export function pane(a, b, t, w, y0, y1, arch = 'round', inset = 0) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const shapePts = [[t - w / 2, y0], [t + w / 2, y0]];
  const ap = archPts(t, w, y1, arch);
  const ordered = ap[0][0] > ap[ap.length - 1][0] ? ap : ap.slice().reverse();
  shapePts.push([t + w / 2, y1], ...ordered.slice(1, -1), [t - w / 2, y1]);
  const shape = new THREE.Shape(dedupe(shapePts).map(([x, y]) => new THREE.Vector2(x, y)));
  let g = clean(new THREE.ShapeGeometry(shape));
  const uv = g.attributes.uv, p = g.attributes.position;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - (t - w / 2)) / Math.max(w, 0.01), (p.getY(i) - y0) / Math.max(y1 + w / 2 - y0, 0.01));
  const back = flip(g.clone());
  g = merge([g, back]);
  g.translate(0, 0, inset);
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  place(g, { x: a[0], z: a[1], ry: -ang });
  void L;
  return g;
}

// ---------------------------------------------------------------------
// Roofs
// ---------------------------------------------------------------------
// gable roof over rectangle; ridge along x (axis 'x') or z
export function gableRoof(x0, x1, z0, z1, yEave, yRidge, { over = 0.6, axis = 'x', th = 0.25 } = {}) {
  let g;
  if (axis === 'x') {
    const zc = (z0 + z1) / 2;
    const a = [x0 - over, yEave, z0 - over], b = [x1 + over, yEave, z0 - over], c = [x1 + over, yRidge, zc], d = [x0 - over, yRidge, zc];
    const e = [x0 - over, yEave, z1 + over], f = [x1 + over, yEave, z1 + over];
    const sl = Math.hypot(zc - (z0 - over), yRidge - yEave);
    const L = x1 - x0 + 2 * over;
    g = merge([quad(a, b, c, d, 0, L, 0, sl, false), quad(f, e, d, c, 0, L, 0, sl, false),
      slabEdge(a, b, th), slabEdge(f, e, th)]);
  } else {
    const xc = (x0 + x1) / 2;
    const a = [x0 - over, yEave, z1 + over], b = [x0 - over, yEave, z0 - over], c = [xc, yRidge, z0 - over], d = [xc, yRidge, z1 + over];
    const e = [x1 + over, yEave, z1 + over], f = [x1 + over, yEave, z0 - over];
    const sl = Math.hypot(xc - (x0 - over), yRidge - yEave);
    const L = z1 - z0 + 2 * over;
    g = merge([quad(a, b, c, d, 0, L, 0, sl, false), quad(f, e, d, c, 0, L, 0, sl, false),
      slabEdge(a, b, th), slabEdge(f, e, th)]);
  }
  return merge([g, underside(g, th)]);
}
function slabEdge(a, b, th) {
  return quad([a[0], a[1] - th, a[2]], [b[0], b[1] - th, b[2]], b, a, 0, 1, 0, th, true);
}
function underside(g, th) {
  const u = flip(g.clone());
  u.translate(0, -th, 0);
  return u;
}
// gable wall triangles to close a gable roof (use wall material)
export function gableEnds(x0, x1, z0, z1, yEave, yRidge, axis = 'x', th = 0.6) {
  const parts = [];
  if (axis === 'x') {
    const zc = (z0 + z1) / 2;
    for (const x of [x0, x1]) parts.push(prismTri([[x, yEave, z0], [x, yEave, z1], [x, yRidge, zc]], th, 'x'));
  } else {
    const xc = (x0 + x1) / 2;
    for (const z of [z0, z1]) parts.push(prismTri([[x0, yEave, z], [x1, yEave, z], [xc, yRidge, z]], th, 'z'));
  }
  return merge(parts);
}
function prismTri(tri, th, axis) {
  const off = axis === 'x' ? [th / 2, 0, 0] : [0, 0, th / 2];
  const A = tri.map(p => [p[0] - off[0], p[1], p[2] - off[2]]), B = tri.map(p => [p[0] + off[0], p[1], p[2] + off[2]]);
  const g = new THREE.BufferGeometry();
  const pos = [...A[0], ...A[1], ...A[2], ...B[0], ...B[2], ...B[1]];
  for (let i = 0; i < 3; i++) {
    const j = (i + 1) % 3;
    pos.push(...A[i], ...B[i], ...B[j], ...A[i], ...B[j], ...A[j]);
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return boxUV(g);
}

// pyramid/cone roof over a convex polygon, peak above centroid
export function pyramidRoof(poly, yEave, yPeak, { over = 0.5, th = 0.22, peak } = {}) {
  const c = peak || poly.reduce((s, p) => [s[0] + p[0] / poly.length, s[1] + p[1] / poly.length], [0, 0]);
  const parts = [];
  const exp = poly.map(p => {
    const d = [p[0] - c[0], p[1] - c[1]], L = Math.hypot(...d);
    return [p[0] + d[0] / L * over, p[1] + d[1] / L * over];
  });
  for (let i = 0; i < exp.length; i++) {
    const a = exp[i], b = exp[(i + 1) % exp.length];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const sl = Math.hypot(Math.hypot(mid[0] - c[0], mid[1] - c[1]), yPeak - yEave);
    const g = new THREE.BufferGeometry();
    const pos = [a[0], yEave, a[1], c[0], yPeak, c[1], b[0], yEave, b[1]];
    // choose winding so the normal points up/out
    const n = new V3().subVectors(new V3(c[0], yPeak, c[1]), new V3(a[0], yEave, a[1])).cross(new V3(b[0] - a[0], 0, b[1] - a[1]));
    if (n.y < 0) { pos.splice(3, 6, b[0], yEave, b[1], c[0], yPeak, c[1]); }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const uvs = n.y < 0 ? [0, 0, L, 0, L / 2, sl] : [0, 0, L / 2, sl, L, 0];
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.computeVertexNormals();
    parts.push(g);
    parts.push(slabEdge([a[0], yEave, a[1]], [b[0], yEave, b[1]], th));
  }
  const g = merge(parts);
  return merge([g, underside(g, th)]);
}

// hipped roof over a rectangle
export function hipRoof(x0, x1, z0, z1, yEave, yRidge, { over = 0.6, th = 0.22 } = {}) {
  const w = x1 - x0, d = z1 - z0;
  const X0 = x0 - over, X1 = x1 + over, Z0 = z0 - over, Z1 = z1 + over;
  const inset = Math.min(w, d) / 2 + over;
  let r0, r1;
  if (w >= d) { const zc = (z0 + z1) / 2; r0 = [X0 + inset, zc]; r1 = [X1 - inset, zc]; }
  else { const xc = (x0 + x1) / 2; r0 = [xc, Z0 + inset]; r1 = [xc, Z1 - inset]; }
  const A = [X0, yEave, Z0], B = [X1, yEave, Z0], C = [X1, yEave, Z1], D = [X0, yEave, Z1];
  const R0 = [r0[0], yRidge, r0[1]], R1 = [r1[0], yRidge, r1[1]];
  const tri = (p, q, r) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([...p, ...q, ...r], 3)); return g; };
  const parts = [];
  if (w >= d) {
    parts.push(quadR(A, R0, R1, B), quadR(C, R1, R0, D), tri(D, R0, A), tri(B, R1, C));
  } else {
    parts.push(quadR(B, R0, R1, C), quadR(D, R1, R0, A), tri(A, R0, B), tri(C, R1, D));
  }
  for (const [p, q] of [[A, B], [B, C], [C, D], [D, A]]) parts.push(slabEdge(p, q, th));
  const g = boxUVSlope(merge(parts));
  return merge([g, underside(g, th)]);
}
function quadR(a, b, c, d) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3));
  return g;
}
// make faces point upward and give sloped UVs
function boxUVSlope(g) {
  g = clean(g);
  const p = g.attributes.position;
  const a = new V3(), b = new V3(), c = new V3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    const n = new V3().subVectors(b, a).cross(new V3().subVectors(c, a));
    if (n.y < -1e-6) { p.setXYZ(i + 1, c.x, c.y, c.z); p.setXYZ(i + 2, b.x, b.y, b.z); }
  }
  g.computeVertexNormals();
  const uv = g.attributes.uv, nn = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const nx = nn.getX(i), nz = nn.getZ(i);
    const h = Math.hypot(nx, nz) || 1;
    // u along the eave, v up the slope
    const ux = -nz / h, uz = nx / h;
    uv.setXY(i, p.getX(i) * ux + p.getZ(i) * uz, (p.getY(i)) / Math.max(0.3, Math.sqrt(1 - nn.getY(i) ** 2)) * 1);
  }
  return g;
}
export { boxUVSlope };

// ---------------------------------------------------------------------
// Vaults
// ---------------------------------------------------------------------
// A sail/cloister vault over any star-shaped polygon: boundary follows a
// segmental arch along each edge (archRise), rising to `crown` above the
// springing line at the centre. Faces point downward (seen from below).
export function vault(poly, ySpring, crown, { archRise = null, rings = 7, center, hole = 0, seg = 8 } = {}) {
  const c = center || poly.reduce((s, p) => [s[0] + p[0] / poly.length, s[1] + p[1] / poly.length], [0, 0]);
  const pos = [], uvs = [];
  const edgePts = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(2, Math.ceil(L / 1.2));
    const rise = archRise == null ? Math.min(L * 0.32, crown * 0.8) : Math.min(archRise, L * 0.5);
    for (let k = 0; k < n; k++) {
      const s = k / n;
      edgePts.push([a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, rise * Math.sin(Math.PI * s)]);
    }
  }
  const N = edgePts.length;
  const ringPt = (i, t) => {
    const e = edgePts[i % N];
    const tt = hole ? hole + (1 - hole) * t : t;
    const x = c[0] + (e[0] - c[0]) * tt, z = c[1] + (e[1] - c[1]) * tt;
    const k = Math.pow(tt, 2.2);
    const y = ySpring + e[2] * k + crown * (1 - tt * tt) * (1 - k) + crown * (1 - tt * tt) * k * 0.0;
    return [x, y, z];
  };
  for (let i = 0; i < N; i++) {
    for (let r = 0; r < rings; r++) {
      const t0 = r / rings, t1 = (r + 1) / rings;
      const p00 = ringPt(i, t0), p01 = ringPt(i + 1, t0), p10 = ringPt(i, t1), p11 = ringPt(i + 1, t1);
      if (r === 0 && !hole) { pos.push(...p00, ...p11, ...p10); uvs.push(p00[0], p00[2], p11[0], p11[2], p10[0], p10[2]); }
      else { pos.push(...p00, ...p01, ...p11, ...p00, ...p11, ...p10); uvs.push(p00[0], p00[2], p01[0], p01[2], p11[0], p11[2], p00[0], p00[2], p11[0], p11[2], p10[0], p10[2]); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  // make normals face down
  const nn = g.attributes.normal;
  let sum = 0; for (let i = 0; i < nn.count; i++) sum += nn.getY(i);
  if (sum > 0) flip(g);
  void seg;
  return g;
}

// The same vault surface, sampled finely and shaded smooth: edge points
// every `step` m, `rings` rings from the springing to the crown, shared
// vertices so the normals are averaged, and UVs laid along the curved
// surface (arc length) instead of projected from above, so the plaster
// neither facets into a sawtooth nor stretches on the steep haunches.
export function vaultSmooth(poly, ySpring, crown, { archRise = null, rings = 18, center, hole = 0, step = 0.45 } = {}) {
  const c = center || poly.reduce((s, p) => [s[0] + p[0] / poly.length, s[1] + p[1] / poly.length], [0, 0]);
  const edgePts = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(3, Math.ceil(L / step));
    const rise = archRise == null ? Math.min(L * 0.32, crown * 0.8) : Math.min(archRise, L * 0.5);
    for (let k = 0; k < n; k++) { const t = k / n; edgePts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, rise * Math.sin(Math.PI * t)]); }
  }
  const N = edgePts.length;
  const ringPt = (i, t) => {
    const e = edgePts[i % N];
    const tt = hole ? hole + (1 - hole) * t : Math.max(t, 1e-4);
    const x = c[0] + (e[0] - c[0]) * tt, z = c[1] + (e[1] - c[1]) * tt;
    const k = Math.pow(tt, 2.2);
    return [x, ySpring + e[2] * k + crown * (1 - tt * tt) * (1 - k), z];
  };
  // an indexed grid (i around, r across), then smooth normals
  const R = rings, pos = [], uv = [], idx = [];
  // UVs unfold each rib of the grid about the centre: a point's texture
  // position lies along its radial direction at its arc length from the
  // crown (or from the hole's rim), so the plaster keeps one scale from the
  // haunches to the crown instead of fanning out along the rib lines
  for (let i = 0; i <= N; i++) {
    const e = edgePts[i % N], dx = e[0] - c[0], dz = e[1] - c[1], dl = Math.hypot(dx, dz) || 1;
    const col = [];
    for (let r = 0; r <= R; r++) col.push(ringPt(i, 1 - r / R));
    let s = hole * dl;
    const sOf = new Array(R + 1); sOf[R] = s;
    for (let r = R - 1; r >= 0; r--) { const p = col[r], q = col[r + 1]; s += Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); sOf[r] = s; }
    for (let r = 0; r <= R; r++) { pos.push(...col[r]); uv.push(c[0] + sOf[r] * dx / dl, c[1] + sOf[r] * dz / dl); }
  }
  for (let i = 0; i < N; i++) for (let r = 0; r < R; r++) {
    const a = i * (R + 1) + r, b = (i + 1) * (R + 1) + r;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // the seam where the loop closes: average the normals of the two columns
  const nn = g.attributes.normal;
  for (let r = 0; r <= R; r++) {
    const a = r, b = N * (R + 1) + r;
    const x = nn.getX(a) + nn.getX(b), y = nn.getY(a) + nn.getY(b), z = nn.getZ(a) + nn.getZ(b), l = Math.hypot(x, y, z) || 1;
    nn.setXYZ(a, x / l, y / l, z / l); nn.setXYZ(b, x / l, y / l, z / l);
  }
  // near the crown all columns meet at one point: give it a straight-down normal
  g = g.toNonIndexed();
  let sum = 0; for (let i = 0; i < g.attributes.normal.count; i++) sum += g.attributes.normal.getY(i);
  if (sum > 0) flip(g);
  return g;
}

// barrel vault along a straight axis (a→b), width w
export function barrel(a, b, w, ySpring, { seg = 12, pointed = false } = {}) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const pos = [], uvs = [];
  const prof = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, ang = Math.PI * t;
    let x = -w / 2 * Math.cos(ang), y = w / 2 * Math.sin(ang);
    if (pointed) { y *= 1.25; }
    prof.push([x, y, t * Math.PI * w / 2]);
  }
  for (let i = 0; i < seg; i++) {
    const [x0, y0, u0] = prof[i], [x1, y1, u1] = prof[i + 1];
    const A = [0, ySpring + y0, x0], B = [L, ySpring + y0, x0], C = [L, ySpring + y1, x1], D = [0, ySpring + y1, x1];
    pos.push(...A, ...C, ...B, ...A, ...D, ...C);
    uvs.push(0, u0, L, u1, L, u0, 0, u0, 0, u1, L, u1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  place(g, { x: a[0], z: a[1], ry: -ang });
  return g;
}

// ---------------------------------------------------------------------
// Columns and stairs
// ---------------------------------------------------------------------
export function column(h, r = 0.22, { base = true, capital = true, seg = 12, cushion = false } = {}) {
  const prof = [];
  if (base) prof.push([0, 0], [r * 1.65, 0], [r * 1.65, 0.12], [r * 1.35, 0.2], [r * 1.25, 0.32], [r * 1.05, 0.38]);
  else prof.push([0, 0], [r, 0]);
  prof.push([r, (base ? 0.4 : 0)], [r * 0.9, h - 0.55], [r * 0.95, h - 0.5]);
  if (capital) {
    if (cushion) prof.push([r * 1.05, h - 0.48], [r * 1.5, h - 0.2], [r * 1.7, h - 0.14], [r * 1.7, h], [0, h]);
    else prof.push([r * 1.05, h - 0.48], [r * 1.25, h - 0.35], [r * 1.65, h - 0.18], [r * 1.9, h - 0.14], [r * 1.9, h], [0, h]);
  } else prof.push([r * 0.9, h], [0, h]);
  return lathe(prof, seg);
}

// straight stair rising along +x from (x0,z) width w
export function stairFlight(from, to, y0, y1, w, { steps } = {}) {
  const L = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const n = steps || Math.max(2, Math.round((y1 - y0) / 0.19));
  const rise = (y1 - y0) / n, run = L / n;
  const parts = [];
  for (let i = 0; i < n; i++) parts.push(box(run + 0.02, rise * (i + 1), w, { x: run * (i + 0.5), y: y0, z: 0 }));
  const g = merge(parts);
  const ang = Math.atan2(to[1] - from[1], to[0] - from[0]);
  place(g, { x: from[0], z: from[1], ry: -ang });
  const ramp = rampGeo(from, to, y0, y1, w);
  return { geo: g, ramp };
}
export function rampGeo(from, to, y0, y1, w) {
  const d = [to[0] - from[0], to[1] - from[1]], L = Math.hypot(...d), n = [-d[1] / L * w / 2, d[0] / L * w / 2];
  return quad([from[0] - n[0], y0, from[1] - n[1]], [to[0] - n[0], y1, to[1] - n[1]], [to[0] + n[0], y1, to[1] + n[1]], [from[0] + n[0], y0, from[1] + n[1]], 0, 1, 0, 1, true);
}

// spiral stair: returns {geo (steps + newel), ramp (smooth helicoid collider)}
export function spiral(cx, cz, rIn, rOut, y0, y1, a0, turns, { stepH = 0.2, newel = true } = {}) {
  const n = Math.max(8, Math.round((y1 - y0) / stepH));
  const rise = (y1 - y0) / n, dA = turns * TAU / n;
  const parts = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + i * dA;
    const sh = new THREE.Shape();
    sh.moveTo(rIn * Math.cos(0), rIn * Math.sin(0));
    const segs = 4;
    for (let k = 0; k <= segs; k++) { const t = (dA * 1.08) * k / segs; sh.lineTo(rOut * Math.cos(t), rOut * Math.sin(t)); }
    sh.lineTo(rIn * Math.cos(dA * 1.08), rIn * Math.sin(dA * 1.08));
    let g = new THREE.ExtrudeGeometry(sh, { depth: rise * 1.0 + 0.06, bevelEnabled: false, curveSegments: 2 });
    g = clean(g);
    g.rotateX(Math.PI / 2); // extrude along -y
    g.translate(0, y0 + rise * (i + 1), 0);
    g.rotateY(-a);
    g.translate(cx, 0, cz);
    parts.push(boxUV(g));
  }
  if (newel) parts.push(cyl(rIn, rIn, y1 - y0 + 0.2, 12, { x: cx, y: y0, z: cz }));
  // collider helicoid ramp, slightly below tread tops
  const pos = [];
  const m = n * 3;
  for (let i = 0; i < m; i++) {
    const t0 = i / m, t1 = (i + 1) / m;
    const a_0 = a0 + turns * TAU * t0, a_1 = a0 + turns * TAU * t1;
    const yA = y0 + (y1 - y0) * t0, yB = y0 + (y1 - y0) * t1;
    const P = (r, a, y) => [cx + r * Math.cos(a), y, cz + r * Math.sin(a)];
    const A = P(rIn * 0.6, a_0, yA), B = P(rOut + 0.1, a_0, yA), C = P(rOut + 0.1, a_1, yB), D = P(rIn * 0.6, a_1, yB);
    pos.push(...A, ...B, ...C, ...A, ...C, ...D, ...A, ...C, ...B, ...A, ...D, ...C);
  }
  const ramp = new THREE.BufferGeometry();
  ramp.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  ramp.computeVertexNormals();
  return { geo: merge(parts), ramp, stepAngle: dA, steps: n };
}

// ---------------------------------------------------------------------
// Batching: merge geometries per material, per zone, keep colliders
// ---------------------------------------------------------------------
export class Batch {
  constructor(name, offset = [0, 0, 0]) { this.name = name; this.offset = offset; this.parts = new Map(); this.colliders = []; this.colliderKeys = []; this.noShadow = new Set(); }
  add(key, geo, { collide = true, shadow = true, surface } = {}) {
    if (!geo) return geo;
    if (!this.parts.has(key)) this.parts.set(key, []);
    this.parts.get(key).push(geo);
    if (collide) { this.colliders.push(geo); this.colliderKeys.push(surface || key); }
    if (!shadow) this.noShadow.add(key);
    return geo;
  }
  // an invisible collision surface (ramps over stairs); `surface` names what
  // the feet meet there, for the footsteps
  collider(geo, surface = 'stone') { this.colliders.push(geo); this.colliderKeys.push(surface); }
  build(M) {
    const group = new THREE.Group();
    group.name = this.name;
    const interior = /interior|ground|scriptorium|library|ossuary/.test(this.name);
    const cellWidth = 24, centre = new V3(), size = new V3();
    const footprint = new THREE.Box3();
    if (interior) for (const list of this.parts.values()) for (const part of list) {
      part.computeBoundingBox(); footprint.union(part.boundingBox);
    }
    footprint.getSize(size);
    // Splitting a single building adds submission cost for little benefit.
    // Partition only compounds/passages spanning more than 80 metres.
    const partition = interior && Math.max(size.x, size.z) > 80;
    group.userData.renderCells = partition;
    for (const [key, list] of this.parts) {
      const mat = key.split('.').reduce((o, k) => o?.[k], M);
      if (!mat) { console.warn('missing material', key); continue; }
      const cells = new Map();
      for (const part of list) {
        let cell = 'all';
        if (partition) {
          part.boundingBox.getCenter(centre); part.boundingBox.getSize(size);
          // Large floors/walls remain complete. Keep them out of furniture
          // cells so their wide bounds cannot defeat local frustum culling.
          const wide = Math.max(size.x, size.z) > cellWidth * 1.5 ? 'wide:' : '';
          cell = wide + Math.floor((centre.x + this.offset[0]) / cellWidth) + ':' + Math.floor((centre.z + this.offset[2]) / cellWidth);
        }
        if (!cells.has(cell)) cells.set(cell, []);
        cells.get(cell).push(part);
      }
      for (const [cell, pieces] of cells) {
        const g = merge(pieces.map(x => x.clone()));
        // A coloured material may have plain pieces in another cell. Keep
        // their neutral white attribute, as the original merged batch did.
        if (mat.vertexColors && !g.attributes.color) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3));
        g.computeBoundingBox(); g.computeBoundingSphere();
        const mesh = new THREE.Mesh(g, mat);
        mesh.name = `${this.name}:${key}` + (partition ? ':' + cell : '');
        mesh.position.set(...this.offset);
        mesh.castShadow = !mat.transparent && !this.noShadow.has(key);
        mesh.receiveShadow = true;
        if (partition) mesh.userData.visibilityBox = g.boundingBox.clone().translate(mesh.position);
        group.add(mesh);
      }
    }
    return group;
  }
  colliderGeometry() {
    const tris = [];
    const list = this.colliders.map((g, i) => {
      const c = new THREE.BufferGeometry();
      const p = g.index ? g.toNonIndexed().attributes.position : g.attributes.position;
      c.setAttribute('position', p.clone());
      tris.push([this.colliderKeys[i], p.count / 3]);
      return c;
    });
    if (!list.length) return null;
    const m = mergeGeometries(list, false);
    m.translate(...this.offset);
    // per-triangle surface names, in merge order
    m.userData.surfaces = tris.map(([k, n]) => [surfaceOf(this.name, k), n]);
    return m;
  }
}

// What a walker's feet meet on a given material of a given building.
export function surfaceOf(batch, key) {
  if (/^(stone|stoneWet|churchStone|tile|wood|dirt|frozenSoil|mud|snowPacked|snowFresh|snowCrust|ice|straw|gravel)$/.test(key)) return key;
  if (key === 'straw') return 'straw';
  if (key === 'damp') return 'stoneWet';
  if (key === 'terracotta') return 'tile';
  if (/^(boards|wood|woodDark|beam|door)$/.test(key)) return 'wood';
  if (key === 'beamExt') return 'wood';
  if (key === 'soil') return 'dirt';
  if (key === 'soilExt') return 'frozenSoil';
  if (/church-interior/.test(batch) && /^(ashlar|churchIn|church)$/.test(key)) return 'churchStone';
  if (/exterior|nature|outbuildings-exterior/.test(batch) && /^(flagExt|cobble|rubble|aed|church|wall)$/.test(key)) return 'stoneOut';
  return 'stone';
}
