import * as THREE from 'three';
import { seeded } from '../math.js';

/**
 * A human head in profile, facing LEFT (-x), built from a closed outline.
 * Pure geometry: no DOM, so it can be tested anywhere.
 */

// raw outline (x forward = negative, y up). Order: crown -> forehead -> face -> chin -> neck -> back of head
const OUTLINE = [
  [0.4, 3.55], // crown
  [-0.7, 3.4],
  [-1.55, 2.95], // forehead top
  [-2.05, 2.2],
  [-2.2, 1.6], // brow ridge
  [-2.1, 1.2], // nose bridge
  [-2.35, 0.55],
  [-2.95, -0.15], // nose tip
  [-2.55, -0.5],
  [-2.3, -0.7], // under the nose
  [-2.38, -1.0], // upper lip
  [-2.2, -1.25], // mouth
  [-2.36, -1.5], // lower lip
  [-2.1, -1.85], // chin dip
  [-2.15, -2.35],
  [-1.75, -2.85], // chin
  [-0.9, -2.9], // jaw underside
  [-0.65, -3.3],
  [-0.85, -4.1], // throat
  [-0.9, -5.2], // neck front, leaves the frame
  [1.7, -5.2], // neck back
  [1.8, -3.6],
  [2.35, -2.4], // nape
  [3.0, -1.0], // back of skull
  [3.25, 0.6],
  [3.0, 2.0],
  [2.2, 3.1],
];

// how wide the head is (half-depth in z) at each height
const Z_KEYS = [
  [-5.2, 0.9],
  [-3.6, 0.88],
  [-2.8, 1.0],
  [-1.8, 1.4],
  [-0.5, 1.65],
  [0.9, 1.8],
  [2.0, 1.7],
  [3.0, 1.15],
  [3.6, 0.2],
];

const Y0 = -5.2;
const Y1 = 3.6;
const BINS = 220;

// the head is moved/scaled so its centre sits near the origin
const OFFSET = { x: -0.1, y: 0.75 };
export const HEAD_SCALE = 0.92;

const zHalf = (y) => {
  if (y <= Z_KEYS[0][0]) return Z_KEYS[0][1];
  for (let i = 1; i < Z_KEYS.length; i++) {
    if (y <= Z_KEYS[i][0]) {
      const [y0, z0] = Z_KEYS[i - 1];
      const [y1, z1] = Z_KEYS[i];
      const t = (y - y0) / (y1 - y0);
      return z0 + (z1 - z0) * (t * t * (3 - 2 * t));
    }
  }
  return Z_KEYS[Z_KEYS.length - 1][1];
};

function buildSlices() {
  const curve = new THREE.CatmullRomCurve3(
    OUTLINE.map(([x, y]) => new THREE.Vector3(x, y, 0)),
    true,
    'centripetal'
  );
  const outline = curve.getSpacedPoints(2400);
  const xmin = new Float32Array(BINS).fill(Infinity);
  const xmax = new Float32Array(BINS).fill(-Infinity);
  const dy = (Y1 - Y0) / BINS;
  for (const p of outline) {
    const b = Math.floor((p.y - Y0) / dy);
    if (b < 0 || b >= BINS) continue;
    if (p.x < xmin[b]) xmin[b] = p.x;
    if (p.x > xmax[b]) xmax[b] = p.x;
  }
  return { outline, xmin, xmax, dy };
}

const slices = buildSlices();

const toWorld = (x, y, z) => [(x + OFFSET.x) * HEAD_SCALE, (y + OFFSET.y) * HEAD_SCALE, z * HEAD_SCALE];

function sliceAt(y) {
  const b = Math.min(BINS - 1, Math.max(0, Math.floor((y - Y0) / slices.dy)));
  const lo = slices.xmin[b];
  const hi = slices.xmax[b];
  if (!isFinite(lo) || !isFinite(hi)) return null;
  return { xc: (lo + hi) / 2, a: (hi - lo) / 2, zh: zHalf(y) };
}

/** surface of the ellipse-like cross-section at height y, for a given x (front half = +z side) */
function surfaceZ(x, y) {
  const s = sliceAt(y);
  if (!s) return 0;
  const r = (x - s.xc) / s.a;
  return s.zh * Math.sqrt(Math.max(0, 1 - r * r));
}

/** where the eyes sit (world space) */
export function eyePositions() {
  const x = -1.8;
  const y = 0.6;
  const z = surfaceZ(x, y);
  return [toWorld(x, y, z), toWorld(x, y, -z)];
}

/**
 * Points for the head: silhouette line, translucent shell and interior.
 * Returns Float32Array(count*3) in world units.
 */
export function sampleHead(count, seed = 31) {
  const R = seeded(seed);
  const out = new Float32Array(count * 3);

  const pickY = () => {
    // fewer points toward the bottom of the neck so it dissolves into the dark
    for (let tries = 0; tries < 20; tries++) {
      const y = Y0 + R() * (Y1 - Y0);
      const w = y > -3.6 ? 1 : 0.1 + 0.9 * ((y - Y0) / (-3.6 - Y0)) ** 1.6;
      if (R() < w) return y;
    }
    return 0;
  };

  for (let i = 0; i < count; i++) {
    const kind = R();
    let x;
    let y;
    let z;

    if (kind < 0.12) {
      // the outline itself: crisp profile, thin in z
      const p = slices.outline[(R() * slices.outline.length) | 0];
      x = p.x;
      y = p.y;
      z = (R() - 0.5) * 0.5;
    } else {
      y = pickY();
      const s = sliceAt(y);
      if (!s) {
        i--;
        continue;
      }
      const th = R() * Math.PI * 2;
      // 62% on the shell, the rest inside so the head reads as translucent
      const rad = kind < 0.74 ? 1 : Math.sqrt(R());
      x = s.xc + s.a * Math.cos(th) * rad;
      z = s.zh * Math.sin(th) * rad;
    }
    out.set(toWorld(x, y, z), i * 3);
  }
  return out;
}

/** nearest-neighbour network over a subset of the points (the "constellation" lines) */
export function buildNetwork(points, nodeCount, maxDist = 1.0, seed = 77) {
  const R = seeded(seed);
  const n = points.length / 3;
  const idx = [];
  for (let i = 0; i < nodeCount; i++) idx.push((R() * n) | 0);

  const nodes = new Float32Array(nodeCount * 3);
  idx.forEach((k, i) => nodes.set([points[k * 3], points[k * 3 + 1], points[k * 3 + 2]], i * 3));

  const edges = new Map();
  const d2 = (a, b) =>
    (nodes[a * 3] - nodes[b * 3]) ** 2 +
    (nodes[a * 3 + 1] - nodes[b * 3 + 1]) ** 2 +
    (nodes[a * 3 + 2] - nodes[b * 3 + 2]) ** 2;

  for (let i = 0; i < nodeCount; i++) {
    const near = [];
    for (let j = 0; j < nodeCount; j++) {
      if (j === i) continue;
      const d = d2(i, j);
      if (d < maxDist * maxDist) near.push([d, j]);
    }
    near.sort((a, b) => a[0] - b[0]);
    for (let k = 0; k < Math.min(3, near.length); k++) {
      const j = near[k][1];
      edges.set(i < j ? `${i}-${j}` : `${j}-${i}`, [Math.min(i, j), Math.max(i, j)]);
    }
  }

  const lines = [];
  for (const [a, b] of edges.values()) {
    lines.push(nodes[a * 3], nodes[a * 3 + 1], nodes[a * 3 + 2], nodes[b * 3], nodes[b * 3 + 1], nodes[b * 3 + 2]);
  }
  return { nodes, lines: new Float32Array(lines) };
}