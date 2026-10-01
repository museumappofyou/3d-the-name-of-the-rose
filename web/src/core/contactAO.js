import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

// RenderPass has already drawn this frame's shadow map. The AO normal/depth
// view needs geometry, but no lighting and no second shadow-map render. Keep
// the normal frame's automatic updates (including moving people) intact.
export class ContactAOPass extends GTAOPass {
  render(renderer, ...args) {
    const shadows = renderer.shadowMap;
    const automatic = shadows.autoUpdate, requested = shadows.needsUpdate;
    shadows.autoUpdate = false; shadows.needsUpdate = false;
    try { return super.render(renderer, ...args); }
    finally { shadows.autoUpdate = automatic; shadows.needsUpdate = requested; }
  }
}
