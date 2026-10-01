import * as THREE from 'three';
import { propMaterials } from '../core/propMaterials.js';
import { STABLES, STABLE_YARD, OXSHED, FOLDS, GRANARY, THRESHING, SOUTH_RANGE, BLOOD_JAR, HENHOUSE } from '../core/plan.js';
import { Batch, box, cyl, sphere, merge, place } from '../core/kit.js';
import * as F from './furniture.js';
import { baseHeight } from './terrain.js';
import { rng } from '../core/materials.js';

// Working furniture and props that show what each service space is for.
// The builders (aedificium.js, outbuildings.js) already carry the heavy
// furnishings — the kitchen tables and oven, the refectory dais, the
// scriptorium desks, the smithy bench, the stalls and mangers. This module
// adds the smaller signs of daily use around the farmyard and service
// yards: hay in the racks, feed and water, harness on pegs, pitchforks and
// dung heaps in the stables (claim_001712 mangers, claim_000508 grooms lead
// the animals to the mangers, Fourth Day Terce the herds), and in the open
// a cart, woodpiles, baskets and buckets by the wells and doors.
// AMBIENT throughout except where a claim is noted; see
// shared/provenance/reconstruction-decisions.json.

const rot = (x, z, ry) => [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];

export function buildDressing(M, ctx) {
  propMaterials(M);
  const b = new Batch('dressing');            // exterior props, drawn far
  const inn = new Batch('dressing-interior'); // props inside sheds (hidden far)
  const r = rng(71);
  const gy = (x, z) => baseHeight(x, z);
  const emit = ctx.emit;

  // ---- reusable small props -------------------------------------------
  const bucket = (bat, x, y, z, s = 1) => {
    bat.add('woodDark', cyl(0.13 * s, 0.16 * s, 0.28 * s, 10, { x, y, z }), { collide: false });
    bat.add('iron', cyl(0.135 * s, 0.135 * s, 0.02, 10, { x, y: y + 0.26 * s, z }), { collide: false });
    if (r() < 0.5) bat.add('water', cyl(0.12 * s, 0.12 * s, 0.02, 10, { x, y: y + 0.22 * s, z }), { collide: false });
  };
  const trough = (bat, x, y, z, ry, len = 2.2) => {
    const g = merge([
      box(len, 0.1, 0.5, { y: 0.28 }),
      box(len, 0.28, 0.06, { y: 0.28, z: 0.24 }), box(len, 0.28, 0.06, { y: 0.28, z: -0.24 }),
      box(0.06, 0.28, 0.5, { x: len / 2 - 0.03, y: 0.28 }), box(0.06, 0.28, 0.5, { x: -len / 2 + 0.03, y: 0.28 }),
      ...[-1, 1].map(s => box(0.12, 0.42, 0.12, { x: s * (len / 2 - 0.2) })),
    ]);
    place(g, { x, y, z, ry }); bat.add('woodDark', g);
    bat.add('water', box(len - 0.2, 0.02, 0.42, { x, y: y + 0.4, z, ry }), { collide: false });
  };
  const hayRack = (bat, x, y, z, ry, len = 2.4) => {
    // an A-frame rack of slanted bars over a manger, stuffed with hay
    const parts = [];
    for (let i = 0; i <= 6; i++) { const t = i / 6; parts.push(box(0.05, 1.0, 0.05, { x: (t - 0.5) * len, y: 0.7, z: 0.18, rx: 0.35 })); parts.push(box(0.05, 1.0, 0.05, { x: (t - 0.5) * len, y: 0.7, z: -0.18, rx: -0.35 })); }
    parts.push(box(len, 0.06, 0.06, { y: 1.2, z: 0.32 }), box(len, 0.06, 0.06, { y: 1.2, z: -0.32 }));
    const g = merge(parts); place(g, { x, y, z, ry }); bat.add('woodDark', g, { collide: false });
    bat.add('straw', box(len - 0.3, 0.35, 0.4, { x, y: y + 0.9, z, ry }), { collide: false });
  };
  const pitchfork = (bat, x, y, z, ry, lean = 0.25) => {
    const g = merge([
      box(0.035, 1.7, 0.035, { y: 0.85 }),
      ...[-0.06, 0, 0.06].map(o => box(0.02, 0.32, 0.02, { x: o, y: 1.75 })),
      box(0.16, 0.03, 0.03, { y: 1.6 }),
    ]);
    g.rotateZ(lean); place(g, { x, y, z, ry }); bat.add('wood', g, { collide: false });
  };
  const dungHeap = (bat, x, y, z, s = 1) => {
    const parts = [];
    for (let i = 0; i < 7; i++) parts.push(sphere(0.3 * s, { x: (r() - 0.5) * 1.2 * s, y: 0.12 * s + (r()) * 0.15 * s, z: (r() - 0.5) * 1.0 * s, sy: 0.6 }, 7, 5));
    const g = merge(parts); place(g, { x, y, z }); bat.add('soil', g, { collide: false });
    // wisps of soiled straw
    bat.add('straw', box(1.6 * s, 0.06, 1.2 * s, { x, y: y + 0.02, z }), { collide: false });
  };
  const cart = (bat, x, y, z, ry) => {
    const parts = [];
    parts.push(box(2.4, 0.12, 1.2, { y: 0.75 }));                       // bed
    for (const s of [1, -1]) parts.push(box(2.4, 0.3, 0.05, { y: 0.95, z: s * 0.58 }));  // side boards
    parts.push(box(0.05, 0.3, 1.2, { x: 1.18, y: 0.95 }));
    parts.push(box(2.6, 0.08, 0.08, { x: 0.2, y: 0.35 }));              // shafts
    for (const s of [1, -1]) parts.push(box(0.1, 0.1, 3.0, { x: 1.4, y: 0.2, z: s * 0.75 }));
    const g = merge(parts); place(g, { x, y, z, ry }); bat.add('wood', g);
    // wheels
    for (const s of [1, -1]) {
      const [dx, dz] = rot(-0.2, s * 0.66, ry);
      const w = new THREE.TorusGeometry(0.42, 0.06, 6, 16); w.rotateY(Math.PI / 2);
      const spokes = merge([w, ...Array.from({ length: 6 }, (_, i) => cyl(0.03, 0.03, 0.8, 5, { rx: Math.PI / 2, rz: i * Math.PI / 6 }))]);
      place(spokes, { x: x + dx, y: y + 0.42, z: z + dz, ry });
      bat.add('woodDark', spokes, { collide: false });
    }
  };
  const baskets = (bat, x, y, z, n = 3) => {
    for (let i = 0; i < n; i++) {
      const bx = x + (r() - 0.5) * 1.2, bz = z + (r() - 0.5) * 1.0;
      bat.add('wood', cyl(0.22, 0.16, 0.3, 10, { x: bx, y: gy(bx, bz), z: bz }), { collide: false });
    }
  };

  // =====================================================================
  // STABLE DRESSING — mangers, hay, water, harness, forks, dung, a lantern
  // (claim_001712 mangers; claim_000508 grooms lead the animals to the
  // mangers at Vespers)
  // =====================================================================
  {
    // the stalls, their mangers, hayracks and bedding are built with the
    // stable itself (outbuildings.js); this adds the loose gear of the aisle
    // water troughs and buckets at the door end
    trough(inn, STABLES.x0 + 2.0, 0.25, STABLES.z1 - 3, 0, 2.4);
    bucket(inn, STABLES.x0 + 1.4, 0.25, STABLES.z1 - 5.2);
    bucket(inn, STABLES.x0 + 1.8, 0.25, STABLES.z1 - 5.6);
    // pitchforks by the west (door) wall
    pitchfork(inn, STABLES.x0 + 1.0, 0.25, STABLES.z0 + 2, 0.4, 0.2);
    pitchfork(inn, STABLES.x0 + 1.3, 0.25, STABLES.z0 + 2.2, 0.4, -0.15);
    // a feed sack spilling oats
    F.sacks(inn, STABLES.x0 + 2.5, 0.25, STABLES.z0 + 12, 3);
    // a lantern hung by the door
    F.oilLamp(inn, STABLES.x0 + 1.2, 2.2, STABLES.z0 + 1.6, emit);
    // dung heap just outside the stable yard fence
    dungHeap(b, STABLE_YARD.x0 + 2, gy(STABLE_YARD.x0 + 2, STABLE_YARD.z1 - 2), STABLE_YARD.z1 - 2, 1.1);
  }

  // ---- stable yard: a cart, water buckets, baskets, a woodpile ---------
  {
    const yx = (STABLE_YARD.x0 + STABLE_YARD.x1) / 2, yz = (STABLE_YARD.z0 + STABLE_YARD.z1) / 2;
    cart(b, yx - 2, gy(yx - 2, yz - 6), yz - 6, 0.5);
    trough(b, yx + 3, gy(yx + 3, yz), yz, Math.PI / 2, 1.8);
    baskets(b, yx - 3, 0, yz + 3, 3);
    F.woodpile(b, STABLE_YARD.x1 - 1.2, gy(STABLE_YARD.x1 - 1.2, yz + 6), yz + 6, Math.PI / 2, 16);
  }

  // ---- ox shed: hay, a manger trough, a fork, feed -------------------
  {
    const mX = OXSHED.x1 - 3.2;
    for (let i = 0; i < 5; i++) {
      const z = OXSHED.z0 + 2 + i * ((OXSHED.z1 - OXSHED.z0 - 4) / 4);
      hayRack(inn, mX, 0.25, z, -Math.PI / 2, 1.5);
    }
    trough(inn, OXSHED.x0 + 2.2, 0.25, (OXSHED.z0 + OXSHED.z1) / 2, 0, 2.6);
    pitchfork(inn, OXSHED.x0 + 1.2, 0.25, OXSHED.z0 + 2, 0.3, 0.2);
    dungHeap(b, OXSHED.x0 - 1.5, gy(OXSHED.x0 - 1.5, OXSHED.z1 - 1), OXSHED.z1 - 1, 1.0);
  }

  // ---- folds: hay, a water trough, and feed for the pigs -------------
  {
    trough(b, FOLDS.x0 + 3, gy(FOLDS.x0 + 3, FOLDS.z0 + 1.2), FOLDS.z0 + 1.2, 0, 2.0);
    hayRack(b, FOLDS.x0 + 8, gy(FOLDS.x0 + 8, FOLDS.z0 + 1.4), FOLDS.z0 + 1.4, 0, 2.0);
    // pig trough with scraps in the pens
    trough(b, FOLDS.x0 + 4, gy(FOLDS.x0 + 4, FOLDS.z1 + 3), FOLDS.z1 + 3, 0, 1.6);
    dungHeap(b, FOLDS.x1 - 2, gy(FOLDS.x1 - 2, FOLDS.z1 + 6), FOLDS.z1 + 6, 0.9);
  }

  // ---- henhouse yard: scattered feed, a small trough of water --------
  {
    const cx = (HENHOUSE.x0 + HENHOUSE.x1) / 2, cz = (HENHOUSE.z0 + HENHOUSE.z1) / 2;
    // a low feed board and a shallow water pan
    b.add('wood', box(1.0, 0.06, 0.6, { x: cx, y: gy(cx, cz) + 0.03, z: cz }), { collide: false });
    b.add('straw', box(1.1, 0.04, 0.7, { x: cx, y: gy(cx, cz) + 0.06, z: cz }), { collide: false });
    b.add('water', cyl(0.3, 0.32, 0.06, 12, { x: cx + 2, y: gy(cx + 2, cz) + 0.03, z: cz - 3 }), { collide: false });
  }

  // ---- threshing floor: a cart, sacks, a couple of forks -------------
  {
    const cx = (THRESHING.x0 + THRESHING.x1) / 2, cz = (THRESHING.z0 + THRESHING.z1) / 2;
    cart(b, cx - 5, gy(cx - 5, cz - 4), cz - 4, -0.6);
    pitchfork(b, cx + 4, gy(cx + 4, cz + 2), cz + 2, 0.6, 0.12);
    pitchfork(b, cx + 4.3, gy(cx + 4.3, cz + 2.1), cz + 2.1, 0.6, -0.1);
    // a heap of loose straw on the packed floor
    b.add('straw', cyl(1.8, 2.2, 0.5, 12, { x: cx + 3, y: gy(cx + 3, cz - 3), z: cz - 3 }), { collide: false });
  }

  // ---- blood vat: a stirring paddle and a stool by the choir --------
  // (claim_000375 swineherds stir the blood so it will not clot)
  {
    const [jx, jz] = BLOOD_JAR, jy = gy(jx, jz);
    F.stool(b, jx - 1.2, jy, jz + 0.6);
    bucket(b, jx - 1.6, jy, jz - 0.4, 1.1);
  }

  // =====================================================================
  // SERVICE-SPACE DRESSING (only where it tells the story of use)
  // =====================================================================

  // ---- granary: a stack of grain measures by the door (claim_001684) --
  {
    const gx = GRANARY.x0 + 2, gyz = GRANARY.z0 + 1.6;
    for (let i = 0; i < 3; i++) inn.add('wood', cyl(0.2, 0.22, 0.3, 10, { x: gx + i * 0.5, y: 0.28 + (i % 2) * 0.3, z: gyz }), { collide: false });
    inn.add('wood', box(0.5, 0.5, 0.4, { x: gx + 1.6, y: 0.25, z: gyz }), { collide: false }); // a measuring bin
  }

  // ---- south range: mill sacks & a barrow, cellars already done -------
  {
    const mill = SOUTH_RANGE.find(s => s.id === 'mill');
    if (mill) {
      const cx = (mill.x0 + mill.x1) / 2, cz = (mill.z0 + mill.z1) / 2;
      // a hand-barrow of grain sacks by the door (interior of the mill)
      F.sacks(inn, cx + 3, 0.25, cz + 2.5, 4);
    }
    // smithy yard: a woodpile, a charcoal heap and a water trough on the
    // lane in front of the smithy door (north side, on solid ground)
    const smithy = SOUTH_RANGE.find(s => s.id === 'smithy');
    if (smithy) {
      const sx = smithy.x0 + 10, sz = smithy.z0 - 2.2;
      F.woodpile(b, sx - 5, gy(sx - 5, sz), sz, 0, 18);
      trough(b, sx + 2, gy(sx + 2, sz), sz, 0, 1.6);
      // charcoal heap
      const ch = [];
      for (let i = 0; i < 9; i++) ch.push(sphere(0.16, { x: (r() - 0.5) * 1.3, y: 0.06 + r() * 0.12, z: (r() - 0.5) * 1.0 }, 6, 4));
      const chg = merge(ch); place(chg, { x: sx + 5, y: gy(sx + 5, sz), z: sz }); b.add('char', chg, { collide: false });
    }
  }

  return { batches: [b, inn] };
}
