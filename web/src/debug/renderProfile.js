import { yieldTask } from './taskYield.js';

const median = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const round = v => +v.toFixed(3);

// Count all composer draws, including shadows. CPU times measure submission,
// not GPU execution; the asynchronous timer below reports GPU time separately.
export async function sampleRendering(app, count = 30) {
  const r = app.renderer, gl = r.getContext();
  const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const oldReset = r.info.autoReset, saved = [], buckets = new Map(), samples = [], queries = [];
  let passName = 'scene';
  let frameBuckets = new Map(), drawing = new Map();
  const groupOf = object => {
    let o = object;
    while (o.parent && o.parent !== app.scene) o = o.parent;
    return o.userData.name || o.name || 'other';
  };
  app.scene.traverse(o => {
    if (!o.isMesh) return;
    const original = o.onBeforeRender; saved.push(() => { o.onBeforeRender = original; });
    o.onBeforeRender = function (...args) {
      original.apply(this, args);
      const geo = o.geometry, indices = geo.index?.count ?? geo.attributes.position.count;
      const triangles = Math.min(indices, geo.drawRange.count) / 3 * (o.isInstancedMesh ? o.count : 1);
      const key = passName + ':' + groupOf(o), b = drawing.get(key) || { calls: 0, triangles: 0 };
      b.calls++; b.triangles += triangles; drawing.set(key, b);
    };
  });
  const wrap = (object, name, label, shadow = false) => {
    const original = object[name]; saved.push(() => { object[name] = original; });
    object[name] = function (...args) {
      const previous = passName;
      if (!shadow) passName = label;
      const key = shadow ? passName + ':shadow' : label;
      const before = { calls: r.info.render.calls, triangles: r.info.render.triangles, time: performance.now() };
      try { return original.apply(this, args); }
      finally {
        const b = frameBuckets.get(key) || { cpu: 0, calls: 0, triangles: 0 };
        b.cpu += performance.now() - before.time; b.calls += r.info.render.calls - before.calls; b.triangles += r.info.render.triangles - before.triangles;
        frameBuckets.set(key, b); passName = previous;
      }
    };
  };
  r.info.autoReset = false;
  app.composer.passes.forEach((p, i) => wrap(p, 'render', i + ':' + p.constructor.name));
  wrap(r.shadowMap, 'render', 'shadow', true);
  try {
    for (let i = 0; i < count; i++) {
      r.info.reset(); frameBuckets = new Map(); drawing = new Map(); const start = performance.now();
      app.frame(1 / 60, false); const updated = performance.now();
      const query = ext && gl.createQuery();
      if (query) gl.beginQuery(ext.TIME_ELAPSED_EXT, query);
      try { app.render(); }
      finally { if (query) { gl.endQuery(ext.TIME_ELAPSED_EXT); queries.push(query); } }
      samples.push({ cpu: performance.now() - start, update: updated - start, calls: r.info.render.calls, triangles: r.info.render.triangles });
      for (const [key, b] of frameBuckets) {
        const all = buckets.get(key) || { cpu: [], calls: [], triangles: [] };
        for (const k of ['cpu', 'calls', 'triangles']) all[k].push(b[k]);
        buckets.set(key, all);
      }
      if (i % 10 === 9) await yieldTask();
    }
    const gpu = [], deadline = performance.now() + 2500;
    while (queries.length && performance.now() < deadline) {
      if (gl.getParameter(ext.GPU_DISJOINT_EXT)) break;
      if (gl.getQueryParameter(queries[0], gl.QUERY_RESULT_AVAILABLE)) {
        const q = queries.shift(); gpu.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6); gl.deleteQuery(q);
      } else await yieldTask();
    }
    const cpu = samples.map(s => s.cpu).sort((a, b) => a - b);
    return { medianCpuMs: round(median(cpu)), p95CpuMs: round(cpu[Math.floor(count * .95)]), medianUpdateMs: round(median(samples.map(s => s.update))),
      fullFrameCalls: median(samples.map(s => s.calls)), trianglesAcrossPasses: median(samples.map(s => s.triangles)),
      medianGpuMs: gpu.length ? round(median(gpu)) : null, gpuSamples: gpu.length, gpuTimerAvailable: !!ext,
      passes: Object.fromEntries([...buckets].map(([k, b]) => [k, { calls: median(b.calls), triangles: median(b.triangles), medianCpuMs: round(median(b.cpu)) }])),
      largestSceneDraws: [...drawing].sort((a, b) => b[1].triangles - a[1].triangles).slice(0, 12).map(([group, value]) => ({ group, ...value })) };
  } finally {
    for (const q of queries) gl.deleteQuery(q);
    saved.reverse().forEach(restore => restore()); r.info.autoReset = oldReset;
  }
}

// Texture clones share GPU storage when Three's Source and sampler parameters
// match. Count uploaded WebGLTexture handles, rather than treating every UUID
// (including cloned UV transforms) as another full RGBA allocation.
export function textureProfile(app) {
  const logical = new Map(), uploaded = new Map(), sources = new Set();
  app.scene.traverse(o => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) for (const t of Object.values(m)) {
      if (!t?.isTexture || !t.image?.width || t.isRenderTargetTexture || t.isDataTexture) continue;
      const entry = { name: t.name || t.image.src?.split('/').pop() || o.name, width: t.image.width, height: t.image.height,
        bytes: t.image.width * t.image.height * 4 * (t.generateMipmaps ? 4 / 3 : 1) };
      logical.set(t.uuid, entry); sources.add(t.source);
      const handle = app.renderer.properties.get(t).__webglTexture;
      if (handle) uploaded.set(handle, entry);
    }
  });
  return { logicalTextureCount: logical.size, imageSources: sources.size, uploadedSceneTextureCount: uploaded.size,
    logicalRgbaMipBytes: [...logical.values()].reduce((n, t) => n + t.bytes, 0), uploadedSceneRgbaMipBytes: [...uploaded.values()].reduce((n, t) => n + t.bytes, 0),
    largestUploaded: [...uploaded.values()].sort((a, b) => b.bytes - a.bytes).slice(0, 18), rendererTextureAllocations: app.renderer.info.memory.textures,
    limits: 'Scene image estimate assumes RGBA8; excludes framebuffer, shadow, environment, bone textures, driver copies and retained decoded images.' };
}
