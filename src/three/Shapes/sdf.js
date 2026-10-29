// Tiny signed-distance-field toolkit (pure maths, no Three.js) used to describe the objects
// the particles assemble into, and to sample points ON their surface.
//
// Every primitive returns { f(x,y,z) -> signed distance, bb: [x0,x1,y0,y1,z0,z1] }.
const hyp = Math.hypot;
const abs = Math.abs;
const max = Math.max;
const min = Math.min;

export const sphere = (r) => ({ f: (x, y, z) => hyp(x, y, z) - r, bb: [-r, r, -r, r, -r, r] });

export const box = (hx, hy, hz, rd = 0) => ({
  f: (x, y, z) => {
    const qx = abs(x) - hx + rd, qy = abs(y) - hy + rd, qz = abs(z) - hz + rd;
    return hyp(max(qx, 0), max(qy, 0), max(qz, 0)) + min(max(qx, qy, qz), 0) - rd;
  },
  bb: [-hx, hx, -hy, hy, -hz, hz],
});

/** cylinder along Y */
export const cylY = (r, h) => ({
  f: (x, y, z) => {
    const dx = hyp(x, z) - r, dy = abs(y) - h;
    return min(max(dx, dy), 0) + hyp(max(dx, 0), max(dy, 0));
  },
  bb: [-r, r, -h, h, -r, r],
});

/** ring lying in the XZ plane (axis Y) */
export const torusXZ = (R, r) => ({
  f: (x, y, z) => hyp(hyp(x, z) - R, y) - r,
  bb: [-R - r, R + r, -r, r, -R - r, R + r],
});

export const capsule = (a, b, r) => {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  const bb2 = bax * bax + bay * bay + baz * baz || 1e-9;
  return {
    f: (x, y, z) => {
      const px = x - a[0], py = y - a[1], pz = z - a[2];
      const h = min(1, max(0, (px * bax + py * bay + pz * baz) / bb2));
      return hyp(px - bax * h, py - bay * h, pz - baz * h) - r;
    },
    bb: [min(a[0], b[0]) - r, max(a[0], b[0]) + r, min(a[1], b[1]) - r, max(a[1], b[1]) + r, min(a[2], b[2]) - r, max(a[2], b[2]) + r],
  };
};

/** smooth polyline tube through points */
export const tube = (pts, r) => {
  const bb = [Infinity, -Infinity, Infinity, -Infinity, Infinity, -Infinity];
  for (const p of pts) for (let i = 0; i < 3; i++) { bb[i * 2] = min(bb[i * 2], p[i] - r); bb[i * 2 + 1] = max(bb[i * 2 + 1], p[i] + r); }
  return {
    f: (x, y, z) => {
      let d = Infinity;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
        const px = x - a[0], py = y - a[1], pz = z - a[2];
        const h = min(1, max(0, (px * bax + py * bay + pz * baz) / (bax * bax + bay * bay + baz * baz || 1e-9)));
        d = min(d, hyp(px - bax * h, py - bay * h, pz - baz * h));
      }
      return d - r;
    },
    bb,
  };
};

/** thin-walled cone / cylinder frustum along Y (open ends): radius rBot at y0, rTop at y1 */
export const coneShell = (rBot, rTop, y0, y1, t) => {
  const k = (rTop - rBot) / (y1 - y0);
  const n = 1 / Math.sqrt(1 + k * k);
  const yc = (y0 + y1) / 2, hh = (y1 - y0) / 2;
  const R = max(rBot, rTop);
  return {
    f: (x, y, z) => max(abs(hyp(x, z) - (rBot + (y - y0) * k)) * n - t, abs(y - yc) - hh),
    bb: [-R - t, R + t, y0, y1, -R - t, R + t],
  };
};

/** solid cone / frustum along Y */
export const coneSolid = (rBot, rTop, y0, y1) => {
  const k = (rTop - rBot) / (y1 - y0);
  const n = 1 / Math.sqrt(1 + k * k);
  const yc = (y0 + y1) / 2, hh = (y1 - y0) / 2;
  const R = max(rBot, rTop);
  return {
    f: (x, y, z) => max((hyp(x, z) - (rBot + (y - y0) * k)) * n, abs(y - yc) - hh),
    bb: [-R, R, y0, y1, -R, R],
  };
};

/** hexagonal prism along Y (pencil body) */
export const hexY = (r, h) => ({
  f: (x, y, z) => max(max(abs(x) * 0.8660254 + abs(z) * 0.5, abs(z)) - r, abs(y) - h),
  bb: [-r, r, -h, h, -r, r],
});

/** a 2D shape (function of x,y) extruded to thickness 2*hz, edges rounded by rd */
export const slab = (d2, bb2, hz, rd = 0.04) => ({
  f: (x, y, z) => {
    const d = d2(x, y), dz = abs(z) - hz + rd;
    const a = d + rd;
    return min(max(a, dz), 0) + hyp(max(a, 0), max(dz, 0)) - rd;
  },
  bb: [bb2[0], bb2[1], bb2[2], bb2[3], -hz, hz],
});

// ---------- 2D helpers ----------
export const c2 = (cx, cy, r) => (x, y) => hyp(x - cx, y - cy) - r;
export const b2 = (cx, cy, hx, hy, rd = 0) => (x, y) => {
  const qx = abs(x - cx) - hx + rd, qy = abs(y - cy) - hy + rd;
  return hyp(max(qx, 0), max(qy, 0)) + min(max(qx, qy), 0) - rd;
};
export const u2 = (...fs) => (x, y) => { let d = Infinity; for (const f of fs) d = min(d, f(x, y)); return d; };
export const s2 = (a, b) => (x, y) => max(a(x, y), -b(x, y));

// ---------- 3D operators ----------
const corners = (bb) => {
  const o = [];
  for (const x of [bb[0], bb[1]]) for (const y of [bb[2], bb[3]]) for (const z of [bb[4], bb[5]]) o.push([x, y, z]);
  return o;
};
const bbOf = (pts) => {
  const b = [Infinity, -Infinity, Infinity, -Infinity, Infinity, -Infinity];
  for (const p of pts) for (let i = 0; i < 3; i++) { b[i * 2] = min(b[i * 2], p[i]); b[i * 2 + 1] = max(b[i * 2 + 1], p[i]); }
  return b;
};

export const move = (o, tx, ty, tz = 0) => ({
  f: (x, y, z) => o.f(x - tx, y - ty, z - tz),
  bb: [o.bb[0] + tx, o.bb[1] + tx, o.bb[2] + ty, o.bb[3] + ty, o.bb[4] + tz, o.bb[5] + tz],
});

export const rotZ = (o, a) => {
  const c = Math.cos(a), s = Math.sin(a);
  return { f: (x, y, z) => o.f(c * x + s * y, -s * x + c * y, z), bb: bbOf(corners(o.bb).map(([x, y, z]) => [c * x - s * y, s * x + c * y, z])) };
};
export const rotX = (o, a) => {
  const c = Math.cos(a), s = Math.sin(a);
  return { f: (x, y, z) => o.f(x, c * y + s * z, -s * y + c * z), bb: bbOf(corners(o.bb).map(([x, y, z]) => [x, c * y - s * z, s * y + c * z])) };
};
export const rotY = (o, a) => {
  const c = Math.cos(a), s = Math.sin(a);
  return { f: (x, y, z) => o.f(c * x - s * z, y, s * x + c * z), bb: bbOf(corners(o.bb).map(([x, y, z]) => [c * x + s * z, y, -s * x + c * z])) };
};

/** place an object defined along +X so that +X points from a to b (roll about the axis with `roll`) */
export const between = (o, a, b, roll = 0) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const L = hyp(dx, dy, dz) || 1;
  const ex = [dx / L, dy / L, dz / L];
  let ref = abs(ex[2]) < 0.9 ? [0, 0, 1] : [0, 1, 0];
  let ey = [ref[1] * ex[2] - ref[2] * ex[1], ref[2] * ex[0] - ref[0] * ex[2], ref[0] * ex[1] - ref[1] * ex[0]];
  const ly = hyp(...ey); ey = ey.map((v) => v / ly);
  const ez = [ex[1] * ey[2] - ex[2] * ey[1], ex[2] * ey[0] - ex[0] * ey[2], ex[0] * ey[1] - ex[1] * ey[0]];
  const r = rotX(o, roll);
  const f = (x, y, z) => {
    const px = x - a[0], py = y - a[1], pz = z - a[2];
    return r.f(px * ex[0] + py * ex[1] + pz * ex[2], px * ey[0] + py * ey[1] + pz * ey[2], px * ez[0] + py * ez[1] + pz * ez[2]);
  };
  const bb = bbOf(corners(r.bb).map(([x, y, z]) => [a[0] + x * ex[0] + y * ey[0] + z * ez[0], a[1] + x * ex[1] + y * ey[1] + z * ez[1], a[2] + x * ex[2] + y * ey[2] + z * ez[2]]));
  return { f, bb };
};

export const union = (...os) => ({
  f: (x, y, z) => { let d = Infinity; for (const o of os) d = min(d, o.f(x, y, z)); return d; },
  bb: [min(...os.map((o) => o.bb[0])), max(...os.map((o) => o.bb[1])), min(...os.map((o) => o.bb[2])), max(...os.map((o) => o.bb[3])), min(...os.map((o) => o.bb[4])), max(...os.map((o) => o.bb[5]))],
});
export const sub = (a, b) => ({ f: (x, y, z) => max(a.f(x, y, z), -b.f(x, y, z)), bb: a.bb });
export const intersect = (a, b) => ({ f: (x, y, z) => max(a.f(x, y, z), b.f(x, y, z)), bb: a.bb });
export const shell = (o, t) => ({ f: (x, y, z) => abs(o.f(x, y, z)) - t, bb: o.bb.map((v, i) => v + (i % 2 ? t : -t)) });
