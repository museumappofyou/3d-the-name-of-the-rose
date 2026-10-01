// Shared helpers for in-page migration modules.
// JSON-safe copy: numbers rounded, functions/three objects/cycles dropped.
export function plain(v, depth = 0, seen = new WeakSet()) {
  if (v == null || typeof v === 'boolean' || typeof v === 'string') return v;
  if (typeof v === 'number') return Number.isFinite(v) ? +v.toFixed(6) : null;
  if (typeof v === 'function' || depth > 8) return undefined;
  if (typeof v !== 'object') return undefined;
  if (seen.has(v)) return undefined;
  seen.add(v);
  if (v.isVector3) return [v.x, v.y, v.z].map(x => +x.toFixed(6));
  if (v.isObject3D || v.isBufferGeometry || v.isMaterial || v.isTexture) return undefined;
  if (ArrayBuffer.isView(v)) return Array.from(v).slice(0, 64);
  if (Array.isArray(v)) return v.map(x => plain(x, depth + 1, seen));
  const o = {};
  for (const [k, x] of Object.entries(v)) { const p = plain(x, depth + 1, seen); if (p !== undefined) o[k] = p; }
  return o;
}
export function b64(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
