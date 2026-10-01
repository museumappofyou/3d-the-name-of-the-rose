// Optional local development UI: ?debug&qa. Uses the real renderer, mixers,
// BVH walker, interactions and audio. It has a separate persistent notebook.
// All review controls disappear from normal play.
import * as THREE from 'three';
import { loadFigures, figureLib, updateFigure, setPose } from '../world/people/figure.js';
import { scene as groupsAt } from '../world/people/schedule.js';
import { phaseAt, officeAt } from '../systems/horarium.js';
import { byId } from '../data/places.js';
import { ROUTES } from '../data/routes.js';
import { yieldTask as nextTask } from './taskYield.js';
import { sampleRendering, textureProfile } from './renderProfile.js';
import { migrationSample } from './migrationAudit.js';

const round = v => +v.toFixed(3);
const SCENES = {
  scribe: { hour: 14, group: 'scriptorium' },
  'vat worker': { hour: 10, group: 'swineherds' },
  smith: { hour: 10, group: 'smiths' },
  kneeling: { hour: 10, group: 'ubertino' },
  choir: { hour: 7.6, group: 'choir', index: 4 },
  supper: { hour: 17.3, group: 'refectory' },
  chapter: { hour: 4.2, group: 'chapter-novices' },
  carrier: { hour: 10, group: 'carriers' },
  procession: { hour: 17.9, group: 'procession' },
  Brunellus: { hour: 10, species: 'horse', brunellus: true },
  pig: { hour: 10, species: 'pig' },
  sheep: { hour: 10, species: 'sheep' },
  lamb: { hour: 10, species: 'lamb' },
  rooster: { hour: 10, species: 'rooster' },
  herbs: { hour: 14, group: 'gardener' },
  treasury: { hour: 23, place: 'treasury' },
  crossing: { hour: 12, place: 'nave' },
  mirror: { hour: 10, interaction: 'mirror' },
  catalogue: { hour: 14, interaction: 'catalogue' },
  shelf: { hour: 14, interaction: 'shelf-example' },
  altar: { hour: 15, interaction: 'skull-altar' },
  Alinardo: { hour: 15, group: 'alinardo' },
};

export function installReview(app, audit) {
  const panel = document.createElement('details'); panel.id = 'abbey-review';
  panel.style.cssText = 'position:fixed;top:100px;left:12px;z-index:10000;max-width:480px;background:#161a1eee;color:#eee;padding:8px;border:1px solid #8f957f;font:12px/1.4 monospace';
  panel.innerHTML = `<summary>Development review</summary>
    <label>Scene <select id="review-scene">${Object.keys(SCENES).map(s => `<option>${s}</option>`).join('')}</select></label>
    <button data-action="frame">Frame selection</button><button data-action="snapshot">Read state</button>
    <div><button data-action="cycle">Watch 2 task loops</button><button data-action="forward">Walk forward 2 s</button><button data-action="back">Walk back 2 s</button><button data-action="left">Turn left</button><button data-action="right">Turn right</button></div>
    <div><label>Review hour <input id="review-hour" type="number" min="0" max="24" step="0.1" value="14" style="width:50px"></label><button data-action="hour">Set review hour</button></div>
    <div><label>Task phase <input id="review-task-phase" type="number" min="0" max="0.999" step="0.1" value="0.3" style="width:50px"></label><button data-action="pose">Hold task phase</button><button data-action="bow">Bowed kneel</button><button data-action="resume">Resume people</button><button data-action="rear">Rear view</button></div>
    <div><button data-action="people">Check people</button><button data-action="hourPeople">Check people at this hour</button><button data-action="animals">Check animals</button><button data-action="routes">Check routes</button><button data-action="doors">Check doors</button><button data-action="profile">Profile</button><button data-action="resources">Read resources</button></div>
    <div><label>Migration variant <select id="migration-variant">${['configured', 'no post', 'no shadows', 'no people', 'no terrain'].map(s => `<option>${s}</option>`).join('')}</select></label><button data-action="migration">Measure live cadence</button></div>
    <div><label>Walk route <select id="review-route">${['west approach', 'west return', 'north approach', 'cloister approach', 'scriptorium stairs', 'library stairs', 'altar descent', 'mirror opening', 'night south exit', 'night south approach'].map(s => `<option>${s}</option>`).join('')}</select></label><button data-action="walk">Walk selected route</button></div>
    <div><button data-action="reset">Reset review notebook</button><button data-action="save">Save review JSON</button><button data-action="image">Save view PNG</button><button data-action="archive">Archive review locally</button><button data-action="archiveImage">Archive view locally</button></div>
    <pre id="review-result" aria-live="polite" style="max-height:240px;overflow:auto;white-space:pre-wrap;margin:6px 0"></pre>`;
  document.body.append(panel);
  const output = panel.querySelector('pre'), select = panel.querySelector('select');
  let busy = false, last = null, name = 'scribe', lastLabel = 'ready', selectedRig = null;
  const animals = () => app.scene.getObjectByName('animals').userData.animals;
  const publish = value => { last = value; output.textContent = JSON.stringify(value, null, 2); panel.dataset.state = 'ready'; };
  const run = async fn => {
    if (busy) return;
    busy = true; panel.dataset.state = 'working'; output.textContent = 'Working…';
    panel.querySelectorAll('button').forEach(b => { b.disabled = true; });
    app.renderer.setAnimationLoop(null);
    try { publish(await fn()); } catch (e) { publish({ error: String(e), stack: e.stack }); }
    finally { busy = false; panel.querySelectorAll('button').forEach(b => { b.disabled = false; }); app.walker.keys.clear(); app.clock.getDelta(); app.renderer.setAnimationLoop(() => app.frame()); }
  };
  const step = async (seconds, key) => {
    if (key) app.walker.keys.add(key);
    for (let i = 0; i < Math.round(seconds * 60); i++) { app.frame(1 / 60); if (i % 18 === 0) await nextTask(); }
    if (key) app.walker.keys.delete(key);
  };
  const place = (x, y, z, target) => {
    const dx = target.x - x, dz = target.z - z;
    app.enterWalk({ x, y, z, yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(target.y - y - 1.62, Math.hypot(dx, dz)) });
    app.frame(1 / 60);
  };
  const frameObject = (g, height, distance = 2.3, maxRise = .7, baseAngle = Math.PI / 3) => {
    const target = g.position.clone().add(new THREE.Vector3(0, height, 0));
    for (let i = 0; i < 24; i++) {
      const angle = g.rotation.y + baseAngle + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * Math.PI / 12;
      const x = g.position.x + Math.sin(angle) * distance, z = g.position.z + Math.cos(angle) * distance;
      const y = app.groundY(x, z, g.position.y + 2.2);
      if (y > g.position.y + maxRise || y < g.position.y - 1.2) continue;
      const eye = new THREE.Vector3(x, y + 1.62, z);
      if (!app.world.canSee(target, eye)) continue;
      place(x, y + 0.03, z, target); return true;
    }
    return false;
  };
  const snapshot = () => {
    const e = app.sound.emitters.find(e => e.kind === 'chant'), office = e?.live;
    const r = office?.src;
    return { scene: name, time: round(app.atmo.time), feet: app.walker.feet.toArray().map(round), zone: app.zone?.id, room: app.room?.id,
      target: app.current?.id, targetLabel: app.interactionLabel(app.current), notebook: app.notes.s,
      cloth: selectedRig?.busy ? { person: selectedRig.g.userData.person, clip: selectedRig.g.userData.clip, frozen: !!app.ctx.people.frozen,
        phase: round((selectedRig.g.userData.actions?.get(selectedRig.g.userData.clip)?.time || 0) / (selectedRig.g.userData.actions?.get(selectedRig.g.userData.clip)?.getClip().duration || 1)),
        hoodUp: selectedRig.g.userData.hoodUp, bendDrape: selectedRig.g.userData.parts?.hood_down?.morphTargetInfluences?.[selectedRig.g.userData.hoodDrapeIndex] } : null,
      people: { ...app.ctx.people.stats, visible: app.ctx.people.rigs.filter(r => r.busy && r.g.visible).map(r => ({ key: r.key, person: r.g.userData.person, clip: r.g.userData.clip, at: r.g.position.toArray().map(round) })) },
      audio: { on: app.sound.on, contextTime: app.sound.ctx?.currentTime, hour: office?.hour, cycle: office?.cycle, path: e?.path,
        recording: r?.el ? { position: r.el.currentTime, duration: r.el.duration, state: r.state, error: r.error } : null,
        decodedBytes: app.sound.lib && [...app.sound.lib.banks.values()].reduce((n, b) => n + b.bufs.reduce((s, x) => s + x.length * x.numberOfChannels * 4, 0), 0), errors: app.sound.lib?.errors } };
  };
  const frameSelection = async () => {
    name = select.value; const d = SCENES[name];
    selectedRig = null;
    app.setTime(d.hour, false); panel.querySelector('input').value = d.hour;
    await loadFigures(); app.ctx.people.frozen = false; app.setCut(0);
    if (d.group) {
      const group = groupsAt(phaseAt(d.hour), officeAt(d.hour), d.hour).find(g => g.id === d.group);
      const s = group.slots?.[d.index || 0] || group.area || { x: group.file[0][0], z: group.file[0][1] };
      app.enterWalk({ x: s.x, y: s.y ?? app.groundY(s.x, s.z, 2.2), z: s.z + 1.5, yaw: 0 });
      await step(0.8);
      const rigs = app.ctx.people.rigs.filter(r => r.busy && r.group?.id === d.group);
      const rig = rigs[Math.min(d.index || 0, rigs.length - 1)];
      if (!rig) throw new Error('No active figure for ' + d.group);
      selectedRig = rig;
      const seated = /write|dine|sitBench/.test(rig.g.userData.clip);
      if (!frameObject(rig.g, seated ? 0.8 : /kneel/.test(rig.g.userData.clip) ? 0.65 : 0.95, 2.3, rig.group.indoor ? .22 : .7)) throw new Error('No clear floor view of ' + d.group);
      await step(0.8);
    } else if (d.species) {
      const a = animals().find(a => a.species === d.species && (!d.brunellus || a.brunellus));
      if (!a?.body) throw new Error('Animal not loaded');
      app.enterWalk({ x: a.g.position.x - 2, y: a.g.position.y, z: a.g.position.z, yaw: 0 }); await step(0.6);
      if (d.species === 'horse') {
        // The stall is too narrow for a side view from the adjacent bay:
        // partitions obscure it. Observe its face/manger from the real aisle.
        const x = a.g.position.x - 3.4, z = a.g.position.z;
        place(x, app.groundY(x, z, a.floorY + .8) + .03, z,
          a.g.position.clone().add(new THREE.Vector3(-.8, 1.3, 0)));
      } else if (!frameObject(a.g, .4, 2.1)) throw new Error('No clear animal view');
      await step(0.8);
    } else if (d.interaction) {
      const it = app.interactables.find(i => i.id === d.interaction);
      if (!it) throw new Error('Unknown target ' + d.interaction);
      const y0 = d.interaction === 'mirror' || d.interaction === 'shelf-example' ? 15.6 : d.interaction === 'catalogue' ? 8.2 : 0.35;
      for (let i = 0; i < 24; i++) {
        const a = i * Math.PI / 12, x = it.pos.x + Math.sin(a) * 1.5, z = it.pos.z + Math.cos(a) * 1.5;
        const y = app.groundY(x, z, y0 + 0.8);
        if (Math.abs(y - y0) > 0.3 || !app.world.canSee(it.pos, new THREE.Vector3(x, y + 1.62, z))) continue;
        place(x, y + 0.03, z, it.pos); await step(0.25);
        if (app.current === it) break;
      }
    } else {
      const p = byId[d.place] || byId['nave-choir'] || byId.church;
      app.enterWalk(app.spawnOf(p)); await step(0.8);
      if (name === 'crossing') { place(27.17, .38, -7.5, new THREE.Vector3(34, 14, -5.46)); await step(0.1); }
    }
    return snapshot();
  };
  const walk = async route => {
    const [x, y, z] = route.pts[0]; app.enterWalk({ x, y, z, yaw: 0 });
    let i = 1, t = 0, stuck = 0, lastFeet = app.walker.feet.clone(), lastZone = null;
    const events = [], office = app.sound.emitters.find(e => e.kind === 'chant')?.live;
    while (i < route.pts.length && t < 110) {
      const [tx, ty, tz] = route.pts[i], f = app.walker.feet, dx = tx - f.x, dz = tz - f.z;
      if (Math.hypot(dx, dz) < 0.55 && Math.abs(ty - f.y) < 1.6) { i++; continue; }
      app.walker.yaw = Math.atan2(-dx, -dz); app.walker.keys.add('KeyW'); app.frame(1 / 30, Math.round(t * 30) % 3 === 0); t += 1 / 30;
      if (app.zone?.id !== lastZone || Math.round(t * 30) % 120 === 0) {
        lastZone = app.zone?.id; const e = app.sound.emitters.find(e => e.kind === 'chant');
        events.push({ time: round(t), feet: app.walker.feet.toArray().map(round), zone: lastZone, path: e?.path, sameOffice: !office || office === e?.live, recordingPosition: e?.live?.src?.el?.currentTime });
      }
      if (Math.round(t * 30) % 15 === 0) { stuck = app.walker.feet.distanceTo(lastFeet) < 0.1 ? stuck + 0.5 : 0; lastFeet.copy(app.walker.feet); if (stuck >= 2) break; }
      if (Math.round(t * 30) % 18 === 0) await nextTask();
    }
    app.walker.keys.clear(); await step(0.1);
    return { id: route.id, ok: i >= route.pts.length, reached: i, of: route.pts.length, time: round(t), end: app.walker.feet.toArray().map(round), room: app.room?.id, routeKnowledge: app.notes.route, events };
  };
  const selectedRoute = () => {
    const id = panel.querySelector('#review-route').value;
    const find = prefix => ROUTES.find(r => r.id.startsWith(prefix));
    if (id === 'west approach') return find('R4 ');
    if (id === 'west return') return find('R5 ');
    if (id === 'north approach') { const r = find('R9 '); return { ...r, pts: r.pts.slice(3) }; }
    if (id === 'cloister approach') return { id, pts: [[20, .3, 4.9], [28.08, .3, 4.4], [28.08, .35, 2.5], [28.08, .35, .5], [25, .35, -5.46]] };
    if (id === 'scriptorium stairs') return find('R6 ');
    if (id === 'library stairs') return find('R7 ');
    if (id === 'altar descent') {
      const r = find('R13 ');
      // The structural route starts below the altar. Begin this experience
      // check above it so recognition must be earned by physically descending.
      return { ...r, pts: [[15.37, .35, -14.1], ...r.pts] };
    }
    if (id === 'mirror opening') {
      const m = app.aed.lib.mirror, mid = new THREE.Vector3(.65, 0, 0).applyMatrix4(m.group.matrixWorld), n = new THREE.Vector3(0, 0, 1).applyQuaternion(m.group.quaternion);
      return { id, pts: [[mid.x + n.x * 1.7, 15.6, mid.z + n.z * 1.7], [mid.x - n.x * 1.8, 15.6, mid.z - n.z * 1.8]] };
    }
    const d = app.doors.find(d => d.id === 'aed:south');
    if (!d) throw new Error('No Aedificium south door');
    const points = [[d.x - d.nx * 3, d.y, d.z - d.nz * 3], [d.x, d.y, d.z], [d.x + d.nx * 3, app.groundY(d.x + d.nx * 3, d.z + d.nz * 3, d.y + 1), d.z + d.nz * 3]];
    return { id, pts: id === 'night south exit' ? points : points.reverse() };
  };
  const checkAnimals = async () => {
    const out = [], v = new THREE.Vector3();
    for (const a of animals().filter(a => ['horse', 'pig', 'sheep', 'lamb'].includes(a.species))) {
      if (!a.body || !a.mixer) { out.push({ species: a.species, error: 'not loaded' }); continue; }
      const oldName = a.clipName, oldTime = a.action?.time || 0, oldRate = a.action?.getEffectiveTimeScale() ?? 1, meshes = [];
      a.body.traverse(o => { if (o.isSkinnedMesh) meshes.push(o); });
      const hoofIndices = meshes.map(o => {
        const p = o.geometry.attributes.position, boxes = Array.from({ length: 4 }, () => []);
        for (let i = 0; i < p.count; i++) if (p.getY(i) < 0.045) boxes[(p.getX(i) > 0 ? 1 : 0) + (p.getZ(i) > 0 ? 2 : 0)].push(i);
        return boxes;
      });
      for (const clip of a.clips) {
        a.mixer.stopAllAction(); const action = a.mixer.clipAction(clip); action.reset().play();
        let low = Infinity, soleGap = 0;
        for (let k = 0; k < 12; k++) {
          action.time = clip.duration * k / 12; a.mixer.update(0); a.g.updateMatrixWorld(true);
          const soles = Array.from({ length: 4 }, () => null);
          meshes.forEach((o, m) => {
            for (let i = 0; i < o.geometry.attributes.position.count; i++) { o.getVertexPosition(i, v); v.applyMatrix4(o.matrixWorld); low = Math.min(low, v.y - a.floorY); }
            hoofIndices[m].forEach((indices, side) => { for (const i of indices) { o.getVertexPosition(i, v); v.applyMatrix4(o.matrixWorld); if (!soles[side] || v.y < soles[side].y) soles[side] = v.clone(); } });
          });
          for (const s of soles.filter(Boolean)) soleGap = Math.max(soleGap, Math.abs(s.y - app.groundY(s.x, s.z, a.floorY + .5)));
        }
        out.push({ species: a.species, coat: a.coat, clip: clip.name, minimumAboveFloor: round(low), maxHoofGroundGap: round(soleGap) });
      }
      a.mixer.stopAllAction(); const restore = a.mixer.clipAction(a.clips.find(c => c.name === oldName) || a.clips[0]); restore.reset().setEffectiveTimeScale(oldRate).play(); restore.time = oldTime; a.action = restore; a.mixer.update(0);
      await nextTask();
    }
    return { checked: out.length, problems: out.filter(r => r.error || r.minimumAboveFloor < -.012 || r.maxHoofGroundGap > .05), samples: out };
  };
  const profile = async () => {
    app.renderer.setPixelRatio(1); app.fit();
    const r = app.renderer, gl = r.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
    const rows = [], current = select.value;
    for (const scene of ['choir', 'scribe', 'shelf']) {
      select.value = scene; await frameSelection(); await step(.5);
      const measurement = await sampleRendering(app);
      const skeletons = new Set(); let skinParts = 0;
      for (const rig of app.ctx.people.rigs.filter(r => r.busy && r.g.visible)) rig.g.traverse(o => { if (o.isSkinnedMesh) { skeletons.add(o.skeleton); skinParts++; } });
      rows.push({ scene, visible: app.ctx.people.stats.drawn, sharedSkeletons: skeletons.size, skinParts, ...measurement });
    }
    select.value = current;
    return { device: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), browser: navigator.userAgent, resolution: [app.canvas.width, app.canvas.height], pixelRatio: r.getPixelRatio(), quality: app.quality, post: app.usePost, aoResolution: [app.gtao.width, app.gtao.height], shadowSize: app.atmo.sun.shadow.mapSize.x,
      rows, animationTrackBytes: Object.values(figureLib().clips).reduce((n, c) => n + c.tracks.reduce((s, t) => s + t.times.byteLength + t.values.byteLength, 0), 0), textures: textureProfile(app), audio: snapshot().audio,
      limits: 'Warm 30-frame CPU update/render submission with asynchronous GPU timing where available; no frame-rate guarantee. Pass counts include child shadow draws.' };
  };
  const download = (data, type, filename) => { const link = document.createElement('a'); link.download = filename; link.href = URL.createObjectURL(new Blob([data], { type })); link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 10000); };
  // The documented optional loopback receiver; never the public app server.
  const archive = async (body, ext, label = lastLabel) => {
    const file = label.replace(/[^a-zA-Z0-9_-]/g, '-') + '.' + ext;
    const response = await fetch('http://127.0.0.1:8124/' + file, { method: 'POST', body });
    if (!response.ok) throw new Error('Local review receiver: HTTP ' + response.status);
    return file;
  };
  panel.addEventListener('click', e => {
    const action = e.target.dataset.action;
    if (!action || busy) return;
    if (!['archive', 'archiveImage', 'save', 'image'].includes(action)) lastLabel = action === 'frame' ? select.value :
      action === 'walk' ? 'walk-' + panel.querySelector('#review-route').value : action === 'profile' ? 'profile-' + app.quality : action === 'migration' ? 'cadence-' + name + '-' + app.quality + '-' + panel.querySelector('#migration-variant').value :
      ['people', 'hourPeople', 'animals', 'routes', 'doors'].includes(action) ? action : name + '-' + action;
    const handlers = {
      frame: frameSelection, snapshot,
      cycle: async () => {
        app.ctx.people.frozen = false;
        const U = selectedRig?.g.userData, act = U?.actions?.get(U.clip);
        const seconds = Math.max(12, (act?.getClip().duration || 0) * 2.1 / Math.max(.1, act?.getEffectiveTimeScale() || 1));
        await step(seconds); return { ...snapshot(), watchedSeconds: seconds };
      },
      forward: async () => { await step(2, 'KeyW'); return snapshot(); }, back: async () => { await step(2, 'KeyS'); return snapshot(); },
      left: () => { app.walker.yaw += Math.PI / 8; app.frame(1 / 60); return snapshot(); }, right: () => { app.walker.yaw -= Math.PI / 8; app.frame(1 / 60); return snapshot(); },
      hour: async () => { app.setTime(+panel.querySelector('input').value, false); await step(.8); return snapshot(); },
      pose: () => {
        const U = selectedRig?.g.userData, act = U?.actions?.get(U.clip);
        if (!act) throw new Error('Frame a person first');
        app.ctx.people.frozen = true;
        U.mixer.stopAllAction(); act.reset().setEffectiveWeight(1).play();
        act.time = Math.max(0, Math.min(.999, +panel.querySelector('#review-task-phase').value)) * act.getClip().duration;
        updateFigure(selectedRig.g, 0); selectedRig.g.updateMatrixWorld(true); app.frame(1 / 60);
        return snapshot();
      },
      bow: () => {
        if (name !== 'kneeling' || !selectedRig?.busy) throw new Error('Frame the kneeling person on the church floor first');
        app.ctx.people.frozen = true;
        setPose(selectedRig.g, 'kneelBow');
        return handlers.pose();
      },
      resume: async () => { app.ctx.people.frozen = false; await step(.3); return snapshot(); },
      rear: () => {
        if (!selectedRig?.busy) throw new Error('Frame a person first');
        const g = selectedRig.g, height = /write|dine|sitBench/.test(g.userData.clip) ? .8 : /kneel/.test(g.userData.clip) ? .65 : .95;
        if (!frameObject(g, height, 2.3, selectedRig.group.indoor ? .22 : .7, Math.PI)) throw new Error('No clear rear floor view');
        return snapshot();
      },
      people: () => audit.people(), hourPeople: () => audit.people([app.atmo.time]), animals: checkAnimals,
      routes: () => audit.routes(), doors: () => audit.doors(), profile,
      resources: () => ({ textures: textureProfile(app), audio: snapshot().audio }),
      migration: () => migrationSample(app, panel.querySelector('#migration-variant').value),
      walk: () => walk(selectedRoute()),
      reset: () => { app.notes.clear(); return snapshot(); },
      save: () => { download(JSON.stringify(last, null, 2), 'application/json', 'abbey-review-' + name + '.json'); return last; },
      image: async () => { app.render(); const blob = await new Promise(r => app.canvas.toBlob(r, 'image/png')); download(blob, 'image/png', 'abbey-' + name + '.png'); return snapshot(); },
      archive: async () => { await archive(JSON.stringify(last, null, 2), 'json'); return last; },
      archiveImage: async () => { app.render(); const blob = await new Promise(r => app.canvas.toBlob(r, 'image/png')); return { file: await archive(blob, 'png', name), ...snapshot() }; },
    };
    run(handlers[action]);
  });
  publish({ ready: true, notebook: app.notes.key, controls: 'Study framing followed by real BVH walking; sound requires the normal sound seal.' });
}
