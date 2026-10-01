import { test } from 'node:test';
import assert from 'node:assert/strict';
import { churchPath } from '../src/systems/audio/churchPaths.js';
import { WorldState } from '../src/systems/worldState.js';
import { CHURCH as C } from '../src/core/plan.js';
const world=()=>{const w=new WorldState();w.registerDoor({id:'church:westN',x:C.x0,z:C.zc-1.12,nx:-1,nz:0,w:1.3});w.registerDoor({id:'church:north',x:C.xChoir+4,z:C.zc-4.6,nx:0,nz:-1,w:1.9});w.registerDoor({id:'church:cloister',x:C.xCross-2.58,z:C.zS,nx:0,nz:1,w:1.6});return w;};
const source={x:(C.xCross+C.xChoir)/2+1,y:2.4,z:C.zc};
test('the west doorway changes level, filter and apparent position continuously',()=>{
  const w=world(),levels=[];
  let previous;
  for(let x=C.x0-2;x<C.x0+2;x+=.05){const l={x,y:1.95,z:C.zc-1.12},p=churchPath(l,source,w);const heard=p.level*4/Math.max(4,Math.hypot(p.pos.x-l.x,p.pos.y-l.y,p.pos.z-l.z));levels.push(heard);if(previous){assert.ok(Math.abs(heard-previous.heard)<.003);assert.ok(Math.abs(p.lp-previous.lp)<300);assert.ok(Math.hypot(p.pos.x-previous.pos.x,p.pos.z-previous.pos.z)<3);}previous={...p,heard};assert.equal(p.wet,0);}
  assert.ok(levels.at(-1)>levels[0]);
});
test('the north opening is the apparent source in the cemetery and shared blocked state reduces leakage',()=>{
  const w=world(),l={x:C.xChoir+4,y:1.95,z:C.zc-7};
  const open=churchPath(l,source,w);assert.ok(Math.abs(open.pos.x-l.x)<2);
  const d=w.doors.get('church:north');d.blocked=true;d.open=0;
  const closed=churchPath(l,source,w);assert.ok(closed.level<open.level/3);
});
test('another storey is silent; the lower passage only gets a local leak from the open altar',()=>{
  const w=world();assert.equal(churchPath({x:source.x,y:17.2,z:source.z},source,w).level,0);
  const l={x:C.x0+6.5*(C.xCross-C.x0)/10,y:-1.2,z:C.zN-2};
  assert.equal(churchPath(l,source,w).level,0);
  w.altar={open:1};assert.ok(churchPath(l,source,w).level>0);
});
