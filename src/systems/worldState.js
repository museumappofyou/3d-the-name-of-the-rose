// Door objects are the shared truth read by thresholds, access and sound.
// Their transient openness follows geometry/time; learned knowledge is
// persisted separately in Notebook. No duplicate acoustic-only doors.
export class WorldState {
  constructor() { this.doors = new Map(); this.altar = null; }
  registerDoor(d) {
    d.open ??= 1; d.blocked ??= false;
    this.doors.set(d.id, d);
    return d;
  }
  opening(id) { return this.doors.get(id)?.open ?? 0; }
}

// The room polygon reaches the wall centre; the closed bar lies farther
// inside. Crossing that polygon must not grant an outside entrant an exit
// permit. Grant it only well inside, and retain it until an exiting capsule
// has cleared the doorway, so closing the bar cannot trap that player.
export function aedificiumExitPermit(feet, inside, doors, previous = false) {
  if (!doors.length) return inside;
  const distance = d => Math.hypot(feet.x-d.x,feet.z-d.z);
  const clearInside = inside && doors.every(d => distance(d)>4 ||
    (feet.x-d.x)*d.nx+(feet.z-d.z)*d.nz < -((d.th || 1.2)/2+.45));
  if (clearInside) return true;
  return previous && (inside || doors.some(d=>distance(d)<2));
}
