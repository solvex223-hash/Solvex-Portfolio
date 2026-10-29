/**
 * Turns a photo (cut out, with an alpha channel) into a particle target set, exactly like the team
 * hologram: particles are placed where the picture has detail and carry the picture's real colours.
 * Pure maths on RGBA pixels, so it runs in the browser (canvas ImageData) and in Node for testing.
 *
 * img: { data: Uint8ClampedArray (RGBA), width, height }
 * returns { pos: Float32Array(n*3), col: Uint8Array(n*3) sRGB, tone: Float32Array(n) }
 */
/** world-space box every service photo is fitted into (particles and the photo plane share it) */
export const PHOTO_BOX = { w: 7.6, h: 6.4 };

export function sampleImage(img, n, R, { boxW = PHOTO_BOX.w, boxH = PHOTO_BOX.h, relief = 0.8 } = {}) {
  const { data, width: W, height: H } = img;
  const N = W * H;
  const lum = new Float32Array(N);
  const alpha = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const r = data[i * 4] / 255, g = data[i * 4 + 1] / 255, b = data[i * 4 + 2] / 255;
    lum[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    alpha[i] = data[i * 4 + 3] / 255;
  }

  // edge strength (Sobel on luminance weighted by alpha): detail and outlines get more particles
  const edge = new Float32Array(N);
  let emax = 1e-6;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const l = (j) => lum[j] * alpha[j];
      const gx = l(i - W + 1) + 2 * l(i + 1) + l(i + W + 1) - l(i - W - 1) - 2 * l(i - 1) - l(i + W - 1);
      const gy = l(i + W - 1) + 2 * l(i + W) + l(i + W + 1) - l(i - W - 1) - 2 * l(i - W) - l(i - W + 1);
      const e = Math.hypot(gx, gy);
      edge[i] = e;
      if (e > emax) emax = e;
    }
  }

  // cumulative weight -> sample pixels proportionally
  const cum = new Float64Array(N);
  let total = 0;
  for (let i = 0; i < N; i++) {
    const a = alpha[i];
    const w = a < 0.12 ? 0 : a * (0.3 + 1.7 * Math.min(1, (edge[i] / emax) * 3) + 0.5 * lum[i]);
    total += w;
    cum[i] = total;
  }

  const s = Math.min(boxW / W, boxH / H);
  const pos = new Float32Array(n * 3);
  const col = new Uint8Array(n * 3);
  const tone = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    const target = R() * total;
    let lo = 0, hi = N - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < target) lo = mid + 1; else hi = mid;
    }
    const x = lo % W, y = (lo / W) | 0;
    const X = (x + R() - W / 2) * s;
    const Y = -(y + R() - H / 2) * s;
    const nd = Math.min(1, Math.hypot(X / (W * s * 0.5), Y / (H * s * 0.5)));
    pos[k * 3] = X;
    pos[k * 3 + 1] = Y;
    pos[k * 3 + 2] = (lum[lo] - 0.5) * relief + 0.55 * (1 - nd * nd) + (R() - 0.5) * 0.05;
    // keep very dark pixels faintly visible so the silhouette never breaks up
    for (let c = 0; c < 3; c++) col[k * 3 + c] = Math.max(data[lo * 4 + c], 30);
    tone[k] = Math.min(1, 0.55 + 0.45 * Math.min(1, (edge[lo] / emax) * 3) + 0.1 * lum[lo]);
  }
  return { pos, col, tone };
}

/** sort so that particles keep their left-to-right order between shapes (coherent morphs) */
export function orderByX(pos, col, tone) {
  const n = tone.length;
  const idx = Array.from({ length: n }, (_, i) => i);
  idx.sort((a, b) => pos[a * 3] * 0.8 + pos[a * 3 + 1] * 0.25 - (pos[b * 3] * 0.8 + pos[b * 3 + 1] * 0.25));
  const p2 = new Float32Array(n * 3), c2 = new Uint8Array(n * 3), t2 = new Float32Array(n);
  idx.forEach((o, i) => {
    p2.set(pos.subarray(o * 3, o * 3 + 3), i * 3);
    c2.set(col.subarray(o * 3, o * 3 + 3), i * 3);
    t2[i] = tone[o];
  });
  return { pos: p2, col: c2, tone: t2 };
}
