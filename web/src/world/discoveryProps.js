import * as THREE from 'three';
import { quad, box, place } from '../core/kit.js';
import { canvasTex, rng } from '../core/materials.js';
import { SHELF_EXAMPLE as E } from '../data/discovery.js';

// Original page artwork and ink labels. The worked address is an explicit
// reconstruction of claim_000423's notation, not an invented canonical book.
export function catalogueSpread(b, M, x, y, z) {
  M.catalogueLeaf = new THREE.MeshStandardMaterial({ roughness: 0.92, envMapIntensity: 0.25, side: THREE.DoubleSide,
    map: canvasTex(1024, 640, (g, w, h) => {
      g.fillStyle = '#b9a47b'; g.fillRect(0, 0, w, h);
      const r = rng(442);
      for (let i = 0; i < 6500; i++) { g.fillStyle = `rgba(77,52,24,${r()*0.025})`; g.fillRect(r()*w,r()*h,2,2); }
      for (const left of [38, 548]) {
        g.strokeStyle = 'rgba(122,57,41,.4)'; g.strokeRect(left, 45, 430, 550);
        g.fillStyle = '#784031'; g.font = '600 43px "Grenze Gotisch", serif'; g.fillText(left < 100 ? 'Catalogus' : 'Exemplum', left + 18, 106);
        g.fillStyle = '#453b29'; g.font = '26px "Maguntia", serif';
        const lines = left < 100 ? ['Locus · gradus · armarium', 'iii, IV gradus, V', 'in prima graecorum', 'ii, V gradus, VII', 'in tertia anglorum', 'finis Africae'] : ['Locus ii', 'Gradus III', 'Armarium I', 'In aula ingressus'];
        lines.forEach((s,i) => g.fillText(s,left+18,160+i*50));
      }
      g.fillStyle = '#733e2c'; g.font = '600 40px "Grenze Gotisch", serif'; g.fillText(E.text,566,454);
      const shade = g.createLinearGradient(480,0,544,0); shade.addColorStop(0,'rgba(49,31,15,0)'); shade.addColorStop(.5,'rgba(49,31,15,.32)'); shade.addColorStop(1,'rgba(49,31,15,0)'); g.fillStyle=shade; g.fillRect(480,0,64,h);
    }) });
  const q = quad([x-.39,y,z-.23],[x+.39,y,z-.23],[x+.39,y,z+.23],[x-.39,y,z+.23],0,1,0,1,false);
  b.add('catalogueLeaf',q,{collide:false,shadow:false});
}

export function shelfAddress(b, M, a, c, y, h, d, interact) {
  const L = Math.hypot(c[0]-a[0],c[1]-a[1]), ang = Math.atan2(c[1]-a[1],c[0]-a[0]);
  const point = (u, yy, depth) => [a[0]+u*Math.cos(ang)-depth*Math.sin(ang), yy, a[1]+u*Math.sin(ang)+depth*Math.cos(ang)];
  const label = (key,text,u,yy,w=.4,hh=.12) => {
    M[key]=new THREE.MeshStandardMaterial({roughness:.95,envMapIntensity:.25,side:THREE.DoubleSide,
      map:canvasTex(512,128,(g,W,H)=>{g.fillStyle='#a99269';g.fillRect(0,0,W,H);g.fillStyle='#342c20';g.font='600 72px Georgia, serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,W/2,H/2);})});
    const q=quad([-w/2,-hh/2,0],[w/2,-hh/2,0],[w/2,hh/2,0],[-w/2,hh/2,0],0,1,0,1,false);
    const p=point(u,yy,d+.014);place(q,{x:p[0],y:p[1],z:p[2],ry:-ang});b.add(key,q,{collide:false,shadow:false});
  };
  label('addressCase','I',L/2,y+h-.08,.17,.12);
  const sy=y+.08+2*(h-.2)/5;
  label('addressShelf','III gradus',L*.36,sy+.035,.46,.12);
  // A second codex at the labelled place, supported by the actual third shelf.
  const codex=box(.22,.085,.24,{x:L*.36,y:sy-y+.035,z:d-.12});
  b.add('p.leather',place(codex,{x:a[0],y,z:a[1],ry:-ang}),{collide:false});
  label('addressPlace','ii',L*.36,sy+.145,.10,.07);
  interact({id:E.id,pos:point(L*.36,sy+.19,d+.12),radius:1.8,label:'Cabinet I — the label on gradus III'});
}
