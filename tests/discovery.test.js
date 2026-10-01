import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canAskAlinardo, knowsAltar, canConnectShelf } from '../web/src/data/discovery.js';
import { restoreNotebook, Notebook, KEY } from '../web/src/systems/notes.js';
import { aedificiumBarred } from '../web/src/systems/horarium.js';
const notes = (...ids) => ({has:id=>ids.includes(id)});

test('development review persists separately from player discoveries and legacy migration', () => {
  const data = new Map([['abbey.notebook.v1', JSON.stringify({ notes: { barred: { at: 1 } } })]]);
  const original = globalThis.localStorage;
  globalThis.localStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  try {
    const review = new Notebook('abbey.notebook.review.v2');
    assert.equal(review.has('barred'), false);
    review.add('altar-feature');
    const player = new Notebook();
    assert.equal(player.has('barred'), true);
    assert.equal(player.has('altar-feature'), false);
    player.save();
    review.clear();
    assert.equal(new Notebook(KEY).has('barred'), true);
  } finally {
    if (original === undefined) delete globalThis.localStorage; else globalThis.localStorage = original;
  }
});

test('altar knowledge follows observation and Alinardo; descent alone preserves a returning player’s knowledge',()=>{
  assert.equal(canAskAlinardo(notes()),false);
  assert.equal(knowsAltar(notes('altar-feature')),false);
  assert.equal(canAskAlinardo(notes('altar-feature')),true);
  assert.equal(canAskAlinardo(notes('barred')),true);
  assert.equal(knowsAltar(notes('alinardo-hint')),true);
  assert.equal(knowsAltar(notes('altar-passage')),true);
});
test('the shelf comparison requires both the physical label and the catalogue, in either order',()=>{
  assert.equal(canConnectShelf(notes('shelf-marks')),false);
  assert.equal(canConnectShelf(notes('shelf-example-seen')),false);
  assert.equal(canConnectShelf(notes('shelf-example-seen','shelf-marks')),true);
});
test('notebook migration keeps old discoveries/chart but does not invent the new shelf inspection',()=>{
  const v=restoreNotebook({notes:{'altar-passage':{at:10},'shelf-marks':{at:11},'shelf-labels':{at:12},unknown:{at:13}},rooms:['E.hall','E.hall'],route:4});
  assert.ok(v.notes['altar-passage']);assert.ok(v.notes['shelf-marks']);
  assert.equal(v.notes['shelf-labels'],undefined);assert.equal(v.notes.unknown,undefined);
  assert.deepEqual(v.rooms,['E.hall']);assert.equal(v.route,4);assert.equal(v.version,2);
  const next=restoreNotebook({...v,notes:{...v.notes,'shelf-example-seen':{at:14},'shelf-labels':{at:15}}});
  assert.ok(next.notes['shelf-labels']);
});
test('the Aedificium bars follow the end of supper, including wrapped study hours',()=>{
  assert.equal(aedificiumBarred(17.84),false);assert.equal(aedificiumBarred(17.85),true);
  assert.equal(aedificiumBarred(23),true);assert.equal(aedificiumBarred(29.2),false);
});

test('crossing a room boundary before the bar does not unlock a night entrance', async () => {
  const { aedificiumExitPermit } = await import('../web/src/systems/worldState.js');
  const doors = [{ x: 0, z: 0, nx: 0, nz: 1, th: 1.2 }];
  let permit = false;
  for (const z of [3, 1, .4, -.1]) {
    permit = aedificiumExitPermit({ x: 0, z }, z < 0, doors, permit);
    assert.equal(permit, false);
  }
  permit = aedificiumExitPermit({ x: 0, z: -3 }, true, doors, permit);
  assert.equal(permit, true);
  permit = aedificiumExitPermit({ x: 0, z: .4 }, false, doors, permit);
  assert.equal(permit, true, 'the exiting player clears the moving bar');
  permit = aedificiumExitPermit({ x: 0, z: 3 }, false, doors, permit);
  assert.equal(permit, false, 'a later outside approach is barred again');
});
