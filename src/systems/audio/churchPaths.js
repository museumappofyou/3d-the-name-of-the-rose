import { CHURCH as C } from '../../core/plan.js';

const clamp = x => Math.max(0, Math.min(1, x));
const fade = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const rect = (p, x0, x1, z0, z1) => Math.min(p.x-x0, x1-p.x, p.z-z0, z1-p.z);
const PORTALS = ['church:westN', 'church:westS', 'church:north', 'church:cloister'];

// A small opening graph for this church, not a zone soundtrack. The same
// doorway objects carry collision/access openness. Outside, the apparent
// source is an opening; attenuation includes both legs of the sound path.
// Values vary with metres walked, including across a threshold. Recorded
// chant already contains its room: it receives no extra diffuse reverb.
export function churchPath(listener, source, world, ref = 4) {
  const zc = C.zc;
  const field = Math.max(rect(listener,C.x0,C.xCross,C.zN,C.zS),
    rect(listener,C.xCross,C.xChoir,C.transeptN,C.zS),
    rect(listener,C.xChoir,C.xApse,zc-4.6,zc+4.6),
    Math.min(listener.x-C.xApse,4.6-Math.hypot(listener.x-C.xApse,listener.z-zc)));
  let inside = field >= 0 ? 1 : 0;
  let nearest = Infinity, across = null;
  const paths = [];
  for (const id of PORTALS) {
    const door = world?.doors.get(id); if (!door) continue;
    const dx=listener.x-door.x, dz=listener.z-door.z;
    const outward=dx*door.nx+dz*door.nz, lateral=Math.abs(dx*door.nz-dz*door.nx);
    const ld=Math.hypot(dx,dz,listener.y-1.8), leg=Math.hypot(source.x-door.x,source.z-door.z);
    const open=clamp(door.blocked ? 0 : door.open ?? 1);
    if (lateral < door.w/2+.35 && Math.abs(outward)<nearest) { nearest=Math.abs(outward); across=outward; }
    // An opening is quiet on its wrong side, and round a distant corner.
    const facing=lerp(.10,1,fade(-1.2,1.2,outward));
    const aperture=1/(1+Math.max(0,lateral-door.w/2)/12);
    const transmission=(.015+.435*open)*facing*aperture;
    const total=leg+ld, amplitude=transmission*ref/Math.max(ref,total);
    paths.push({ id, x:door.x,y:1.8,z:door.z,ld,total,open,amplitude,weight:amplitude**4 });
  }
  if (nearest < 1.5) inside=1-fade(-1.5,1.5,across);
  const floor=fade(-.5,.65,listener.y)*(1-fade(4.2,6,listener.y));
  const directDist=Math.hypot(source.x-listener.x,source.y-listener.y,source.z-listener.z);
  const direct=ref/Math.max(ref,directDist);
  let x=source.x,y=source.y,z=source.z, external=0, lp=500, sum=0, pathDistance=directDist;
  for (const p of paths) sum+=p.weight;
  if (sum) {
    x=y=z=pathDistance=0; let open=0, distance=0;
    for (const p of paths) { const w=p.weight/sum; x+=p.x*w;y+=p.y*w;z+=p.z*w;external+=p.amplitude*w;open+=p.open*w;distance+=p.ld*w;pathDistance+=p.total*w; }
    lp=420+open*(800+1800/(1+distance/5));
  }
  if (listener.inside && !['church','choir','skull','porch','cloister','narthex'].includes(listener.zone)) external*=.025;
  const pos={x:lerp(x,source.x,inside),y:lerp(y,source.y,inside),z:lerp(z,source.z,inside)};
  const panDistance=Math.hypot(pos.x-listener.x,pos.y-listener.y,pos.z-listener.z);
  const wanted=lerp(external,direct,inside)*floor;
  let level=wanted/(ref/Math.max(ref,panDistance));
  // The skull-altar is the only local route to the lower spaces. Closing
  // the physical barrier closes this leak as well; the library stays quiet.
  if (listener.y<.65 && world?.altar?.open>0) {
    const sx=C.x0+6.5*(C.xCross-C.x0)/10, sz=C.zN-2;
    const d=Math.hypot(listener.x-sx,listener.z-sz,listener.y-.35);
    const leak=world.altar.open*.025*(1-fade(5,14,d));
    if (leak>level) { pos.x=sx;pos.y=.35;pos.z=sz;level=leak;lp=650; }
  }
  return { pos, level, lp:lerp(lp,Math.max(2400,14000/(1+directDist/35)),inside*floor), wet:0,
    inside:inside*floor, distance:lerp(pathDistance,directDist,inside), openings:paths.map(p=>p.id) };
}
