import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cloisterRoute, fileRoute } from '../web/src/data/peopleRoutes.js';
test('a cloister circuit stays on the perimeter and returns without a position or heading jump',()=>{
  const w={cx:8,cz:12,w:15,h:8},total=cloisterRoute(w).total;
  let last=cloisterRoute(w,-.05);
  for(let d=0;d<total+.1;d+=.05){const q=cloisterRoute(w,d);assert.ok(Math.abs(q.x-w.cx)>w.w-1 || Math.abs(q.z-w.cz)>w.h-1);assert.ok(Math.hypot(q.x-last.x,q.z-last.z)<.051);const turn=Math.atan2(Math.sin(q.ry-last.ry),Math.cos(q.ry-last.ry));assert.ok(Math.abs(turn)<.06);last=q;}
});
test('a carrying lane retraces its real endpoints and a procession stays at its destination', () => {
  const lane = [[0, 0], [0, 3], [7, 3]], total = fileRoute(lane).total;
  for (const d of [0, 2, 5, total - 0.001, total, total + 0.001, 2 * total]) {
    const a = fileRoute(lane, d, true), b = fileRoute(lane, 2 * total - d, true);
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < 1e-6);
  }
  const end = fileRoute(lane, total + 100);
  assert.ok(end.finished); assert.equal(end.x, 7); assert.equal(end.z, 3);
});
