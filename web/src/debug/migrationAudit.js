// Optional audit instrumentation; imported only by the ?debug&qa review UI.
import { textureProfile } from './renderProfile.js';

const q = (a, f) => [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * f))] ?? null;
const rounded = v => v == null ? null : +v.toFixed(3);
const stats = a => ({ median: rounded(q(a, .5)), p95: rounded(q(a, .95)), max: rounded(q(a, 1)) });
const heap = () => performance.memory ? {
  usedJSHeapBytes: performance.memory.usedJSHeapSize,
  totalJSHeapBytes: performance.memory.totalJSHeapSize,
  jsHeapLimitBytes: performance.memory.jsHeapSizeLimit,
} : null;

function resources(app) {
  const materials = new Set(), geometries = new Set(), skeletons = new Set(), visibleSkeletons = new Set(), buffers = new Set();
  const totals = { nodes: 0, meshes: 0, visibleMeshes: 0, skinnedMeshes: 0, visibleSkinnedMeshes: 0, instancedMeshes: 0,
    transparentMeshes: 0, shadowCastingMeshes: 0, lights: 0, activeLights: 0, shadowLights: 0, geometryAttributeBytes: 0 };
  const lights = [];
  app.scene.traverse(o => {
    totals.nodes++;
    let visible = o.visible;
    for (let p = o.parent; p && visible; p = p.parent) visible = p.visible;
    if (o.isLight) {
      totals.lights++; totals.activeLights += +(visible && o.intensity > 0); totals.shadowLights += +o.castShadow;
      lights.push({ name: o.name, type: o.type, intensity: o.intensity, castShadow: o.castShadow, shadowSize: o.shadow?.mapSize.toArray() });
    }
    if (!o.isMesh) return;
    totals.meshes++; totals.visibleMeshes += +visible; totals.instancedMeshes += +!!o.isInstancedMesh;
    totals.shadowCastingMeshes += +o.castShadow;
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    totals.transparentMeshes += +ms.some(m => m.transparent);
    ms.forEach(m => materials.add(m)); geometries.add(o.geometry);
    if (o.isSkinnedMesh) {
      totals.skinnedMeshes++; skeletons.add(o.skeleton);
      if (visible) { totals.visibleSkinnedMeshes++; visibleSkeletons.add(o.skeleton); }
    }
  });
  for (const g of geometries) {
    const attributes = [...Object.values(g.attributes), ...Object.values(g.morphAttributes).flat(), ...(g.index ? [g.index] : [])];
    for (const a of attributes) {
      const b = a.array?.buffer || a.data?.array?.buffer;
      if (b && !buffers.has(b)) { buffers.add(b); totals.geometryAttributeBytes += b.byteLength; }
    }
  }
  const types = {};
  for (const m of materials) types[m.type] = (types[m.type] || 0) + 1;
  const targets = new Map();
  const addTarget = (t, name) => { if (t?.isRenderTarget && !targets.has(t)) targets.set(t, {
    name, width: t.width, height: t.height, samples: t.samples, textureType: t.texture?.type, depthBuffer: t.depthBuffer,
  }); };
  addTarget(app.composer.renderTarget1, 'composer1'); addTarget(app.composer.renderTarget2, 'composer2');
  for (const [key, value] of Object.entries(app.gtao)) addTarget(value, 'ao.' + key);
  app.scene.traverse(o => { if (o.getRenderTarget) addTarget(o.getRenderTarget(), 'reflector'); if (o.isLight) addTarget(o.shadow?.map, o.type + '.shadow'); });
  const s = app.sound;
  const decodedBytes = s.lib ? [...s.lib.banks.values()].reduce((n, b) => n + b.bufs.reduce((k, v) => k + v.length * v.numberOfChannels * 4, 0), 0) : 0;
  return { ...totals, distinctMaterials: materials.size, materialTypes: types, uniqueGeometries: geometries.size,
    skeletons: skeletons.size, bones: [...skeletons].reduce((n, v) => n + v.bones.length, 0),
    visibleSkeletons: visibleSkeletons.size, visibleBones: [...visibleSkeletons].reduce((n, v) => n + v.bones.length, 0),
    rendererInfo: { memory: { ...app.renderer.info.memory }, programs: app.renderer.info.programs?.length },
    lights, renderTargets: [...targets.values()], textures: textureProfile(app),
    staticCollisionTriangles: (app.walker.colliders[0].mesh.geometry.index?.count || app.walker.colliders[0].mesh.geometry.attributes.position.count) / 3,
    dynamicColliders: app.walker.colliders.length - 1, people: { ...app.ctx.people.stats },
    audio: { on: s.on, emitters: s.emitters.length, activeEmitters: s.emitters.filter(e => e.active).length, voices: s.voices,
      decodedBytes, impulseResponses: s.irs.size, errors: s.errors, bankErrors: s.lib?.errors,
      office: s.emitters.find(e => e.kind === 'chant')?.live?.hour }, heap: heap(),
    limits: 'Visible means hierarchy enabled, not actually drawn or unoccluded. Geometry bytes exclude collisions and BVH. JS heap excludes native/GPU/audio allocations.' };
}

export async function migrationSample(app, variant = 'configured', count = 90) {
  const r = app.renderer, restores = [], timings = new Map();
  const gl = r.getContext(), gpuExt = gl.getExtension('EXT_disjoint_timer_query_webgl2'), queries = [], gpu = [];
  let disjoint = false;
  const readQueries = () => {
    if (!gpuExt) return;
    if (gl.getParameter(gpuExt.GPU_DISJOINT_EXT)) disjoint = true;
    while (queries.length && gl.getQueryParameter(queries[0], gl.QUERY_RESULT_AVAILABLE)) {
      const query = queries.shift();
      if (!disjoint) gpu.push(gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6);
      gl.deleteQuery(query);
    }
  };
  let warm = true;
  const wrap = (obj, key, label) => {
    if (!obj?.[key]) return;
    const original = obj[key]; restores.push(() => { obj[key] = original; });
    obj[key] = function (...args) {
      const start = performance.now();
      const query = label === 'renderSubmission' && !warm && gpuExt ? gl.createQuery() : null;
      if (query) gl.beginQuery(gpuExt.TIME_ELAPSED_EXT, query);
      try { return original.apply(this, args); }
      finally {
        if (query) { gl.endQuery(gpuExt.TIME_ELAPSED_EXT); queries.push(query); }
        if (!warm) { const a = timings.get(label) || []; a.push(performance.now() - start); timings.set(label, a); }
      }
    };
  };
  const oldPost = app.usePost, oldShadow = r.shadowMap.enabled, oldReset = r.info.autoReset;
  restores.push(() => { app.usePost = oldPost; r.shadowMap.enabled = oldShadow; r.info.autoReset = oldReset; });
  if (variant === 'no post') app.usePost = false;
  if (variant === 'no shadows') r.shadowMap.enabled = false;
  const hide = variant === 'no people' ? app.scene.getObjectByName('people') : variant === 'no terrain' ? app.terrain : null;
  if (hide) {
    const render = app.render;
    restores.push(() => { app.render = render; });
    app.render = function () { const before = hide.visible; hide.visible = false; try { return render.call(this); } finally { hide.visible = before; } };
  }
  wrap(app.walker, 'update', 'playerCollision'); wrap(app.nature?.forest, 'update', 'forestLOD');
  wrap(app.atmo, 'update', 'atmosphere'); wrap(app.effects, 'update', 'effects'); wrap(app.sound, 'update', 'audio');
  for (let i = 0; i < app.ctx.updaters.length; i++) wrap(app.ctx.updaters, i, 'lifeUpdater' + i);
  wrap(app, 'render', 'renderSubmission');
  r.info.autoReset = false;
  const next = () => new Promise(resolve => requestAnimationFrame(resolve));
  const before = resources(app), intervals = [], cpu = [], calls = [], triangles = [];
  let last = null;
  try {
    for (let i = 0; i < 12; i++) { await next(); app.frame(); }
    warm = false;
    for (let i = 0; i < count; i++) {
      const timestamp = await next();
      if (last != null) intervals.push(timestamp - last);
      last = timestamp; r.info.reset(); const start = performance.now(); app.frame();
      cpu.push(performance.now() - start); calls.push(r.info.render.calls); triangles.push(r.info.render.triangles);
      readQueries();
    }
    const deadline = performance.now() + 2500;
    while (queries.length && performance.now() < deadline) { await next(); readQueries(); }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return { capturedAt: new Date().toISOString(), variant, count, quality: app.quality, post: app.usePost, shadowEnabled: r.shadowMap.enabled,
      pageVisibility: document.visibilityState, gpuTimerAvailable: !!gpuExt, gpuDisjoint: disjoint, gpuSamples: gpu.length, gpuRenderMs: disjoint ? null : stats(gpu),
      browser: navigator.userAgent, device: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      resolution: [app.canvas.width, app.canvas.height], pixelRatio: r.getPixelRatio(), weather: app.weather,
      mode: app.mode, zone: app.zone?.id, time: app.atmo.time, feet: app.walker.feet.toArray(), camera: app.camera.position.toArray(),
      cadenceMs: stats(intervals), observedFPS: rounded(1000 * intervals.length / intervals.reduce((n, v) => n + v, 0)),
      cpuFrameMs: stats(cpu), fullFrameCalls: stats(calls), trianglesAcrossPasses: stats(triangles),
      subsystemCpuMs: Object.fromEntries([...timings].map(([k, v]) => [k, stats(v)])), before, after: resources(app),
      navigation: performance.getEntriesByType('navigation').map(n => ({ duration: n.duration, domContentLoadedEventEnd: n.domContentLoadedEventEnd, loadEventEnd: n.loadEventEnd })),
      resourceLoads: performance.getEntriesByType('resource').filter(e => /assets\//.test(e.name)).map(e => ({ path: new URL(e.name).pathname, duration: e.duration, transferSize: e.transferSize, decodedBodySize: e.decodedBodySize })),
      limits: 'Real requestAnimationFrame cadence, 12 warmup plus 90 measured frames. This is a short automated run, not a long-session leak test. CPU timings include submission/backpressure, not GPU execution. Temporary ablations restore configuration.' };
  } finally { queries.forEach(query => gl.deleteQuery(query)); restores.reverse().forEach(f => f()); }
}
