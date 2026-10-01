// Browser reference screenshots at the same eye/look/hour/altar state as the
// native `shots` scenario (scripts/bench/benchmark.gd), for visual parity.
// Read-only: places the walker by the browser's own enterWalk (a study jump)
// in the isolated QA session; nothing is noted or saved.
export async function run(cfg) {
  const app = window.__abbey;
  const wait = n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  const out = [];
  for (const s of cfg.shots) {
    app.timeTarget = null; app.atmo.set(s.time, true); app.ui.updateTime?.(s.time);
    const a = app.church.altar; a.target = s.open ? 1 : 0; a.open = a.target; a.update(0);
    app.lantern = !!s.lantern;
    const [ex, ey, ez] = s.eye, [lx, ly, lz] = s.look;
    const dx = lx - ex, dy = ly - (ey + 1.62), dz = lz - ez;
    const yaw = Math.atan2(-dx, -dz), pitch = Math.atan2(dy, Math.hypot(dx, dz));
    app.enterWalk({ x: ex, y: ey + 0.05, z: ez, yaw, pitch });
    app.walker.pitch = pitch;
    await wait(90);
    const f = await window.__migrationShot(`${s.name}_browser.png`);
    out.push({ name: s.name, file: f, zone: app.zone?.id ?? null, feet: app.walker.feet.toArray(), exposure: app.renderer.toneMappingExposure, time: app.atmo.time });
  }
  return out;
}
