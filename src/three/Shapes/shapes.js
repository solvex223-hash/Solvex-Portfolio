import { seeded } from '../math.js';
import {
  sphere, box, cylY, torusXZ, capsule, tube, coneShell, coneSolid, hexY, slab,
  c2, b2, u2, s2, move, rotX, rotZ, between, union, intersect,
} from './sdf.js';
import { sampleHead, eyePositions } from './headShape.js';

/**
 * Target geometry for the particle morph. Each shape is a list of parts (signed distance fields);
 * points are sampled ON the surface of the real geometry, so the particles construct the object.
 *
 *   share   relative number of particles for the part
 *   accent  restrained violet highlight
 *   cull    part belongs to the solid body: surface hidden inside other solid parts is removed
 */
const PI = Math.PI;
const rr = (cx, cy, w, h, z, th, rd = 0.03) => move(box(w / 2, h / 2, th / 2, rd), cx, cy, z);
const ringXY = (R, r) => rotX(torusXZ(R, r), PI / 2); // ring facing the viewer
const discXY = (R, h = 0.035) => rotX(cylY(R, h), PI / 2); // flat disc facing the viewer
const cylX = (r, h) => rotZ(cylY(r, h), PI / 2);
const ringYZ = (R, r) => rotZ(torusXZ(R, r), PI / 2);

// ---------- 1. AI AUTOMATION: industrial robot arm ----------
function robotArm() {
  const S = [0, -1.45, 0], E = [1.1, 0.95, 0], W = [3.4, 1.35, 0];
  const joint = (c, r, h) => move(rotX(cylY(r, h), PI / 2), c[0], c[1], c[2]);
  const bolt = (c) => move(rotX(cylY(0.17, 0.47), PI / 2), c[0], c[1], c[2]);
  return {
    view: { yaw: -0.5, pitch: 0.1, scale: 1.0, dx: -1.15, dy: 0.55 },
    parts: [
      { o: move(box(2.4, 0.12, 1.1, 0.05), 0, -3.0, 0), share: 7, cull: true },
      { o: move(cylY(1.15, 0.28), 0, -2.6, 0), share: 6, cull: true },
      { o: move(cylY(0.7, 0.4), 0, -2.0, 0), share: 5, cull: true },
      { o: capsule(S, E, 0.34), share: 12, cull: true },
      { o: capsule(E, W, 0.27), share: 11, cull: true },
      { o: joint(S, 0.52, 0.4), share: 7, cull: true },
      { o: joint(E, 0.45, 0.36), share: 6, cull: true },
      { o: joint(W, 0.35, 0.3), share: 5, cull: true },
      { o: capsule([0.5, -1.9, 0.43], [0.95, 0.2, 0.43], 0.09), share: 3 },
      { o: move(box(0.16, 0.55, 0.36, 0.05), 3.75, 1.35, 0), share: 4, cull: true },
      { o: capsule([3.75, 1.85, 0], [4.5, 1.85, 0], 0.12), share: 3, cull: true },
      { o: capsule([4.5, 1.85, 0], [4.5, 1.55, 0], 0.12), share: 1, cull: true },
      { o: capsule([3.75, 0.85, 0], [4.5, 0.85, 0], 0.12), share: 3, cull: true },
      { o: capsule([4.5, 0.85, 0], [4.5, 1.15, 0], 0.12), share: 1, cull: true },
      { o: move(sphere(0.27), 4.2, 1.35, 0), share: 3, accent: true },
      { o: bolt(S), share: 2, accent: true },
      { o: bolt(E), share: 2, accent: true },
      { o: bolt(W), share: 2, accent: true },
    ],
  };
}

// ---------- 2. AI AGENTS: a digital head that listens and speaks ----------
function aiHead() {
  const chipLegs = [];
  for (let i = -2; i <= 2; i++) {
    chipLegs.push(move(box(0.14, 0.04, 0.03), 0.5 + i * 0.22, 2.5 + 0.7, 0));
    chipLegs.push(move(box(0.14, 0.04, 0.03), 0.5 + i * 0.22, 2.5 - 0.7, 0));
    chipLegs.push(move(box(0.04, 0.14, 0.03), 0.5 - 0.7, 2.5 + i * 0.22, 0));
    chipLegs.push(move(box(0.04, 0.14, 0.03), 0.5 + 0.7, 2.5 + i * 0.22, 0));
  }
  const arc = (r) => {
    const pts = [];
    for (let k = 0; k <= 24; k++) {
      const t = PI - 0.62 + (1.24 * k) / 24;
      pts.push([-2.1 + r * Math.cos(t), -0.46 + r * Math.sin(t), 0.1]);
    }
    return tube(pts, 0.05);
  };
  const eye = eyePositions()[0];
  return {
    view: { yaw: 0.0, pitch: 0.0, scale: 0.62, dx: 0.35, dy: -0.15 },
    parts: [
      { gen: (n, R) => ({ pos: sampleHead(n, 31) }), share: 66 },
      { o: move(box(0.45, 0.45, 0.05, 0.04), 0.5, 2.5, 0), share: 5, accent: true },
      { o: union(...chipLegs), share: 4, accent: true },
      { o: sphere(0.1), share: 1, accent: true, at: eye },
      { o: arc(0.6), share: 3, accent: true },
      { o: arc(1.05), share: 4, accent: true },
      { o: arc(1.5), share: 5, accent: true },
    ],
  };
}

// ---------- 3. WHATSAPP AUTOMATION: a phone and a chat conversation ----------
function chatPhone() {
  const bubble = (cx, cy, w, h, z, th, tailLeft) => {
    const body = rr(cx, cy, w, h, z, th, 0.16);
    const tx = cx + (tailLeft ? -w / 2 + 0.22 : w / 2 - 0.22);
    const tail = move(rotZ(box(0.2, 0.2, th / 2, 0.02), PI / 4), tx, cy - h / 2 - 0.02, z);
    return union(body, tail);
  };
  const dots = [-0.5, 0, 0.5].map((dx) => ({ o: move(sphere(0.16), -2.4 + dx, 1.15, 1.0), share: 1.3, accent: true }));
  return {
    view: { yaw: -0.3, pitch: 0.05, scale: 1.0, dx: 0.45, dy: 0 },
    parts: [
      { o: move(box(1.25, 2.3, 0.14, 0.2), 1.2, 0, 0), share: 20, cull: true },
      { o: rr(1.2, 1.85, 2.2, 0.36, 0.17, 0.05, 0.05), share: 4 },
      { o: bubble(0.62, 0.95, 1.55, 0.62, 0.17, 0.05, true), share: 6 },
      { o: bubble(1.8, 0.1, 1.5, 0.62, 0.17, 0.05, false), share: 6, accent: true },
      { o: bubble(0.7, -0.75, 1.75, 0.62, 0.17, 0.05, true), share: 6 },
      { o: rr(1.2, -1.85, 2.0, 0.34, 0.17, 0.05, 0.12), share: 4 },
      { o: bubble(-2.4, 1.15, 2.3, 1.45, 1.0, 0.18, true), share: 14, cull: false },
      ...dots,
      { o: bubble(-1.8, -0.55, 1.5, 0.8, 0.55, 0.14, false), share: 8 },
    ],
  };
}

// ---------- 4. AI CHATBOTS & CUSTOMER SUPPORT: a headset ----------
function headset() {
  const band = intersect(move(ringXY(2.0, 0.2), 0, -0.1, 0), move(box(3, 3, 3), 0, 2.9, 0));
  const mic = tube([[-2.3, -0.95, 0.3], [-2.2, -2.1, 0.85], [-1.5, -2.75, 1.2], [-0.6, -2.9, 1.3]], 0.07);
  return {
    view: { yaw: -0.4, pitch: 0.1, scale: 1.0, dx: 0, dy: 0.45 },
    parts: [
      { o: band, share: 14, cull: true },
      { o: move(cylX(0.95, 0.38), -2.15, -0.15, 0), share: 12, cull: true },
      { o: move(cylX(0.95, 0.38), 2.15, -0.15, 0), share: 12, cull: true },
      { o: move(ringYZ(0.72, 0.17), -1.72, -0.15, 0), share: 6 },
      { o: move(ringYZ(0.72, 0.17), 1.72, -0.15, 0), share: 6 },
      { o: move(cylX(0.5, 0.05), -2.58, -0.15, 0), share: 3, accent: true },
      { o: move(cylX(0.5, 0.05), 2.58, -0.15, 0), share: 3, accent: true },
      { o: mic, share: 6 },
      { o: capsule([-0.75, -2.9, 1.3], [-0.05, -2.9, 1.3], 0.2), share: 5, accent: true },
    ],
  };
}

// ---------- 5. WEBSITES & WEB APPLICATIONS: a monitor showing a browser ----------
function monitor() {
  const dots = [-2.45, -2.2, -1.95].map((x) => ({ o: move(sphere(0.075), x, 1.95, 0.22), share: 0.9, accent: true }));
  const z = 0.2;
  return {
    view: { yaw: -0.25, pitch: 0.05, scale: 0.95, dx: 0, dy: 0.05 },
    parts: [
      { o: move(box(3.0, 1.85, 0.16, 0.12), 0, 0.55, 0), share: 22 },
      { o: rr(0, 1.95, 5.4, 0.38, z, 0.04, 0.05), share: 5 },
      ...dots,
      { o: rr(0.55, 1.95, 2.9, 0.2, z + 0.04, 0.03, 0.08), share: 3 },
      { o: rr(-0.7, 0.85, 3.6, 1.15, z, 0.04, 0.06), share: 7 },
      { o: rr(-1.85, 0.5, 0.95, 0.3, z + 0.04, 0.03, 0.1), share: 2.5, accent: true },
      { o: rr(1.9, 0.85, 1.5, 1.15, z, 0.04, 0.06), share: 6 },
      { o: rr(-1.8, -0.55, 1.6, 1.0, z, 0.04, 0.06), share: 5 },
      { o: rr(0, -0.55, 1.6, 1.0, z, 0.04, 0.06), share: 5 },
      { o: rr(1.8, -0.55, 1.6, 1.0, z, 0.04, 0.06), share: 5, accent: true },
      { o: move(box(0.35, 0.6, 0.15, 0.05), 0, -1.55, -0.1), share: 5, cull: true },
      { o: move(box(1.3, 0.07, 0.6, 0.03), 0, -2.2, 0), share: 6, cull: true },
    ],
  };
}

// ---------- 6. CRM & LEAD AUTOMATION: a funnel qualifying leads ----------
function funnel() {
  const leads = [
    [-1.7, 2.75, 0.2], [-0.8, 3.15, -0.5], [0.3, 2.65, 0.6], [1.2, 3.25, -0.2], [1.95, 2.55, 0.4],
    [-0.2, 3.55, 0.1], [-1.25, 2.4, -0.6], [0.9, 2.25, -0.4], [-0.35, 0.7, 0.1], [0.45, -0.1, -0.1], [0.0, -1.1, 0.0],
  ];
  return {
    view: { yaw: -0.35, pitch: 0.12, scale: 0.88, dx: 0, dy: -0.25 },
    parts: [
      { o: coneShell(0.4, 2.5, -0.9, 1.9, 0.05), share: 30 },
      { o: coneShell(0.4, 0.4, -2.4, -0.9, 0.05), share: 8 },
      { o: move(torusXZ(2.5, 0.1), 0, 1.9, 0), share: 8 },
      ...leads.map((p, i) => ({ o: move(sphere(0.17), p[0], p[1], p[2]), share: 2.6, accent: i % 2 === 0 })),
      { o: move(sphere(0.22), 0, -2.85, 0), share: 2.6, accent: true },
    ],
  };
}

// ---------- 7. LEAD GENERATION: a target with an arrow ----------
function target() {
  const A = [3.7, 2.6, 1.1], B = [0.12, 0.1, 0.25];
  const vanes = [];
  for (const t of [0.5, 1.0]) for (let k = 0; k < 3; k++) {
    vanes.push({ o: between(move(box(0.3, 0.19, 0.014, 0.01), t, 0, 0), A, B, (k * 2 * PI) / 3), share: 1.3 });
  }
  return {
    view: { yaw: -0.3, pitch: 0.08, scale: 1.0, dx: -0.55, dy: 0 },
    parts: [
      { o: discXY(2.45), share: 14 },
      { o: ringXY(2.45, 0.13), share: 14 },
      { o: ringXY(1.6, 0.11), share: 10 },
      { o: ringXY(0.85, 0.1), share: 7 },
      { o: move(sphere(0.34), 0, 0, 0.06), share: 3, accent: true },
      { o: capsule(A, B, 0.07), share: 7, accent: true },
      { o: move(sphere(0.1), A[0], A[1], A[2]), share: 1, accent: true },
      ...vanes,
    ],
  };
}

// ---------- 8. DIGITAL MARKETING & SEO: a magnifier over growing bars ----------
function magnifier() {
  const bars = [0.5, 0.9, 1.4, 1.9].map((h, i) => ({
    o: move(box(0.15, h / 2, 0.06, 0.02), -1.35 + i * 0.5, -0.5 + h / 2, 0.06), share: 3.2, accent: true,
  }));
  return {
    view: { yaw: -0.3, pitch: 0.06, scale: 1.0, dx: -0.3, dy: 0.3 },
    parts: [
      { o: move(ringXY(1.75, 0.2), -0.7, 0.6, 0), share: 20, cull: true },
      { o: move(discXY(1.72, 0.03), -0.7, 0.6, 0), share: 8 },
      ...bars.map((b) => ({ ...b, o: move(b.o, -0.0, 0, 0) })),
      { o: capsule([0.55, -0.65, 0], [2.9, -2.6, 0], 0.3), share: 14, cull: true },
      { o: between(move(cylY(0.36, 0.13), 0, 0, 0), [0.5, -0.62, 0], [2.9, -2.6, 0], 0), share: 0 },
    ].filter((p) => p.share > 0),
  };
}

// ---------- 9. BRANDING & CREATIVE DESIGN: a pencil drawing a bezier curve ----------
function pencil() {
  const place = (o) => move(rotZ(o, -0.7), 1.2, 0.8, 0);
  const P0 = [-0.47, -1.19], P1 = [-1.5, -2.8], P2 = [-2.4, 0.3], P3 = [-3.7, -1.6];
  const cur = [];
  for (let k = 0; k <= 60; k++) {
    const t = k / 60, u = 1 - t;
    cur.push([
      u * u * u * P0[0] + 3 * u * u * t * P1[0] + 3 * u * t * t * P2[0] + t * t * t * P3[0],
      u * u * u * P0[1] + 3 * u * u * t * P1[1] + 3 * u * t * t * P2[1] + t * t * t * P3[1],
      0,
    ]);
  }
  return {
    view: { yaw: -0.2, pitch: 0.05, scale: 1.0, dx: 0.3, dy: -0.25 },
    parts: [
      { o: place(move(hexY(0.42, 1.55), 0, 0.15, 0)), share: 18, cull: true },
      { o: place(coneSolid(0.18, 0.42, -2.12, -1.4)), share: 7, cull: true },
      { o: place(coneSolid(0.02, 0.18, -2.6, -2.12)), share: 2.5, accent: true },
      { o: place(move(cylY(0.46, 0.2), 0, 1.9, 0)), share: 4, cull: true },
      { o: place(move(cylY(0.4, 0.3), 0, 2.4, 0)), share: 4, accent: true },
      { o: tube(cur, 0.065), share: 14 },
      { o: move(box(0.15, 0.15, 0.08, 0.02), P3[0], P3[1], 0), share: 2.2, accent: true },
      { o: capsule([P0[0], P0[1], 0], [P1[0], P1[1], 0], 0.025), share: 2 },
      { o: capsule([P3[0], P3[1], 0], [P2[0], P2[1], 0], 0.025), share: 2 },
      { o: move(sphere(0.1), P1[0], P1[1], 0), share: 1.5, accent: true },
      { o: move(sphere(0.1), P2[0], P2[1], 0), share: 1.5, accent: true },
    ],
  };
}

// ---------- 10. CUSTOM DIGITAL SOLUTIONS: interlocking puzzle pieces ----------
function puzzle() {
  const A2 = u2(b2(-1.6, 0, 1.4, 1.4, 0.08), c2(0.1, 0, 0.55), b2(-0.1, 0, 0.25, 0.22), c2(-1.6, 1.78, 0.52), b2(-1.6, 1.55, 0.24, 0.26));
  const B2 = u2(s2(b2(1.6, 0, 1.4, 1.4, 0.08), c2(0.1, 0, 0.6)), c2(1.6, -1.78, 0.52), b2(1.6, -1.55, 0.24, 0.26));
  const knobs = (x, y) => Math.hypot(x - 0.1, y) < 0.62 || Math.hypot(x + 1.6, y - 1.78) < 0.56 || Math.hypot(x - 1.6, y + 1.78) < 0.56;
  return {
    view: { yaw: -0.3, pitch: 0.12, scale: 1.0, dx: 0, dy: 0 },
    parts: [
      { o: slab(A2, [-3.0, 0.66, -1.4, 2.35], 0.26, 0.06), share: 50, accentFn: knobs },
      { o: slab(B2, [-0.5, 3.0, -2.35, 1.4], 0.26, 0.06), share: 50, accentFn: knobs },
    ],
  };
}

// ---------- 11. CONNECTED BUSINESS SYSTEMS: hub, nodes and links as one system ----------
function system() {
  const R = 2.75;
  const nodes = [];
  for (let k = 0; k < 6; k++) {
    const a = PI / 6 + (k * PI) / 3;
    nodes.push([R * Math.cos(a), R * Math.sin(a), k % 2 ? -0.5 : 0.5]);
  }
  const parts = [
    { o: box(0.6, 0.6, 0.6, 0.18), share: 10, cull: true },
    { o: ringXY(1.15, 0.05), share: 4 },
    { o: rotZ(torusXZ(1.15, 0.05), 0.0), share: 4 },
    { o: move(box(0.22, 0.22, 0.1, 0.04), 0, 0, 0.62), share: 2, accent: true },
  ];
  nodes.forEach((n, i) => {
    parts.push({ o: move(box(0.62, 0.62, 0.22, 0.14), n[0], n[1], n[2]), share: 7, cull: true });
    parts.push({ o: move(box(0.22, 0.22, 0.05, 0.03), n[0], n[1], n[2] + 0.25), share: 1.6, accent: i % 2 === 0 });
    parts.push({ o: capsule([0, 0, 0], n, 0.04), share: 4 });
    const m = nodes[(i + 1) % 6];
    parts.push({ o: capsule(n, m, 0.035), share: 3.2 });
    parts.push({ o: move(sphere(0.09), n[0] * 0.45, n[1] * 0.45, n[2] * 0.45), share: 1, accent: true });
  });
  return { view: { yaw: -0.3, pitch: 0.2, scale: 1.0, dx: 0, dy: 0 }, parts };
}

export const SHAPES = [
  { name: 'AI AUTOMATION', make: robotArm },
  { name: 'AI AGENTS', make: aiHead },
  { name: 'WHATSAPP AUTOMATION', make: chatPhone },
  { name: 'AI CHATBOTS & CUSTOMER SUPPORT', make: headset },
  { name: 'WEBSITES & WEB APPLICATIONS', make: monitor },
  { name: 'CRM & LEAD AUTOMATION', make: funnel },
  { name: 'LEAD GENERATION', make: target },
  { name: 'DIGITAL MARKETING & SEO', make: magnifier },
  { name: 'BRANDING & CREATIVE DESIGN', make: pencil },
  { name: 'CUSTOM DIGITAL SOLUTIONS', make: puzzle },
  { name: 'CONNECTED BUSINESS SYSTEMS', make: system },
];

// ---------- sampling ----------
const EPS = 0.004;
function grad(f, x, y, z, out) {
  out[0] = f(x + EPS, y, z) - f(x - EPS, y, z);
  out[1] = f(x, y + EPS, z) - f(x, y - EPS, z);
  out[2] = f(x, y, z + EPS) - f(x, y, z - EPS);
}

/** points on the surface of `o`: Float32Array [x,y,z, nx,ny,nz] * n */
function sampleSurface(o, n, R, occluder, accentFn, band = 0.22) {
  const out = new Float32Array(n * 6);
  const f = o.f;
  const [x0, x1, y0, y1, z0, z1] = o.bb;
  const g = [0, 0, 0];
  let got = 0;
  for (let tries = 0; got < n && tries < n * 900; tries++) {
    let x = x0 - band + R() * (x1 - x0 + 2 * band);
    let y = y0 - band + R() * (y1 - y0 + 2 * band);
    let z = z0 - band + R() * (z1 - z0 + 2 * band);
    let d = f(x, y, z);
    if (Math.abs(d) > band) continue;
    for (let k = 0; k < 3; k++) {
      grad(f, x, y, z, g);
      const g2 = g[0] * g[0] + g[1] * g[1] + g[2] * g[2];
      if (g2 < 1e-10) break;
      d = f(x, y, z);
      const s = (d * 2 * EPS) / g2;
      x -= g[0] * s; y -= g[1] * s; z -= g[2] * s;
    }
    if (Math.abs(f(x, y, z)) > 0.006) continue;
    if (occluder && occluder.f(x, y, z) < -0.045) continue;
    if (accentFn && !accentFn(x, y, z)) continue;
    grad(f, x, y, z, g);
    const l = Math.hypot(g[0], g[1], g[2]) || 1;
    out.set([x, y, z, g[0] / l, g[1] / l, g[2] / l], got * 6);
    got++;
  }
  return { data: out, count: got };
}

/** build one shape: pos (n*3) and w (n): tone in 0..1, +2 when the particle is an accent */
export function buildShape(index, n, seed = 1) {
  const def = SHAPES[index].make();
  const R = seeded(seed * 97 + index * 13 + 5);
  const solids = def.parts.filter((p) => p.cull && p.o).map((p) => p.o);
  const occluder = solids.length ? union(...solids) : null;

  const total = def.parts.reduce((s, p) => s + p.share, 0);
  const want = def.parts.map((p) => Math.max(1, Math.round((p.share / total) * n)));
  let diff = n - want.reduce((a, b) => a + b, 0);
  want[want.indexOf(Math.max(...want))] += diff;

  const pts = [];
  def.parts.forEach((p, i) => {
    let data;
    let cnt;
    if (p.gen) {
      const pos = p.gen(want[i], R).pos;
      cnt = pos.length / 3;
      data = new Float32Array(cnt * 6);
      for (let k = 0; k < cnt; k++) data.set([pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2], 0, 0, 1], k * 6);
    } else {
      let o = p.o;
      if (p.at) o = move(o, p.at[0], p.at[1], p.at[2]);
      const acc = p.accentFn ? (x, y) => p.accentFn(x, y) : null;
      const r = sampleSurface(o, want[i], R, p.cull ? occluder : null, null, 0.22);
      data = r.data; cnt = r.count;
      if (acc) {
        // accent by region: keep tone but mark the points inside the region
        for (let k = 0; k < cnt; k++) pts.push({ d: data.subarray(k * 6, k * 6 + 6), accent: acc(data[k * 6], data[k * 6 + 1]) });
        return;
      }
    }
    for (let k = 0; k < cnt; k++) pts.push({ d: data.subarray(k * 6, k * 6 + 6), accent: !!p.accent });
  });
  // top up (rejection can leave a part short): resample from existing points
  while (pts.length < n) pts.push(pts[(R() * pts.length) | 0]);
  pts.length = n;

  // view transform + brightness: silhouette edges glow, faces stay dim
  const v = def.view;
  const cy = Math.cos(v.yaw), sy = Math.sin(v.yaw), cp = Math.cos(v.pitch), sp = Math.sin(v.pitch);
  const rec = pts.map(({ d, accent }) => {
    let x = cy * d[0] + sy * d[2], z = -sy * d[0] + cy * d[2], y = d[1];
    let nx = cy * d[3] + sy * d[5], nz = -sy * d[3] + cy * d[5], ny = d[4];
    const y2 = cp * y - sp * z; z = sp * y + cp * z; y = y2;
    const nz2 = sp * ny + cp * nz;
    const edge = 1 - Math.min(1, Math.abs(nz2));
    const tone = Math.min(1, 0.4 + 0.6 * Math.pow(edge, 0.7) + (R() - 0.5) * 0.14);
    return { x: x * v.scale + v.dx, y: y * v.scale + v.dy, z: z * v.scale, w: tone + (accent ? 2 : 0) };
  });
  // coherent ordering (left to right, then up) so neighbouring particles travel together when morphing
  rec.sort((a, b) => a.x * 0.8 + a.y * 0.25 + (a.z * 0.05) - (b.x * 0.8 + b.y * 0.25 + b.z * 0.05));

  const pos = new Float32Array(n * 3);
  const w = new Float32Array(n);
  rec.forEach((p, i) => { pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z; w[i] = p.w; });
  return { pos, w };
}
