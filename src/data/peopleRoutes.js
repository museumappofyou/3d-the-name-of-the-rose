// A rounded rectangle follows the cloister flags rather than cutting
// diagonally through its garth and arcades. Distance is in metres.
export function cloisterRoute(w, distance = 0) {
  const r=Math.min(.9,w.w/3,w.h/3), sx=2*w.w-2*r, sz=2*w.h-2*r, arc=Math.PI*r/2;
  const total=2*sx+2*sz+4*arc;
  let d=((distance%total)+total)%total;
  const lines=[
    [sz,w.cx+w.w,w.cz-w.h+r,0,1],
    [sx,w.cx+w.w-r,w.cz+w.h,-1,0],
    [sz,w.cx-w.w,w.cz+w.h-r,0,-1],
    [sx,w.cx-w.w+r,w.cz-w.h,1,0],
  ];
  const centres=[[w.cx+w.w-r,w.cz+w.h-r],[w.cx-w.w+r,w.cz+w.h-r],[w.cx-w.w+r,w.cz-w.h+r],[w.cx+w.w-r,w.cz-w.h+r]];
  for (let i=0;i<4;i++) {
    const [len,x,z,dx,dz]=lines[i];
    if (d<len) return {x:x+dx*d,z:z+dz*d,ry:Math.atan2(dx,dz),total};
    d-=len;
    if (d<arc) { const a=i*Math.PI/2+d/r;return {x:centres[i][0]+r*Math.cos(a),z:centres[i][1]+r*Math.sin(a),ry:Math.atan2(-Math.sin(a),Math.cos(a)),total}; }
    d-=arc;
  }
  return {x:w.cx+w.w,z:w.cz-w.h+r,ry:0,total};
}

// Distance along a bounded authored lane. Carrying workers physically
// retrace it; a one-way file stops at its destination instead of wrapping
// across the abbey. This state belongs to the route, not a visible rig.
export function fileRoute(points, distance = 0, returnTrip = false) {
  const segments = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  const total = segments.reduce((a, b) => a + b, 0);
  if (!total) return { x: points[0][0], z: points[0][1], ry: 0, total, finished: true };
  const cycle = returnTrip ? ((distance % (2 * total)) + 2 * total) % (2 * total) : Math.max(0, distance);
  const returning = returnTrip && cycle > total;
  let d = Math.min(total, returning ? 2 * total - cycle : cycle), k = 0;
  while (k < segments.length - 1 && d > segments[k]) d -= segments[k++];
  const [x, z] = points[k], [xx, zz] = points[k + 1], f = segments[k] ? d / segments[k] : 0;
  return { x: x + (xx - x) * f, z: z + (zz - z) * f, ry: Math.atan2(xx - x, zz - z) + (returning ? Math.PI : 0), total, finished: !returnTrip && distance >= total };
}
