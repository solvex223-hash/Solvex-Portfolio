// Turns the team photo into (1) a coloured point cloud and (2) a backdrop-free cut-out.
// The pure functions have no DOM dependency so they can be tested anywhere.

// Region of the photo that contains the people (fractions of width/height).
// Cuts off the name captions at the bottom and the UI fragments on the right.
const CROP = { x0: 0.0, x1: 0.9, y0: 0.06, y1: 0.93 };

const sstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function boxBlur(src, w, h, r) {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const k = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    let sum = 0;
    for (let x = -r; x <= r; x++) sum += src[y * w + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = sum / k;
      sum += src[y * w + Math.min(w - 1, x + r + 1)] - src[y * w + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -r; y <= r; y++) sum += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / k;
      sum += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pointsFromPixels(data, w, h, count, seed = 7) {
  const rand = mulberry32(seed);
  const n = w * h;
  const L = new Float32Array(n);
  const bd = new Float32Array(n); // how "blue background" a pixel is

  for (let i = 0; i < n; i++) {
    const r = data[i * 4] / 255;
    const g = data[i * 4 + 1] / 255;
    const b = data[i * 4 + 2] / 255;
    L[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    bd[i] = b - Math.max(r, g);
  }

  // Sobel gradient = edges (lapels, glasses, pinstripes, collars)
  const G = new Float32Array(n);
  let gMax = 1e-6;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx =
        -L[i - w - 1] - 2 * L[i - 1] - L[i + w - 1] + L[i - w + 1] + 2 * L[i + 1] + L[i + w + 1];
      const gy =
        -L[i - w - 1] - 2 * L[i - w] - L[i - w + 1] + L[i + w - 1] + 2 * L[i + w] + L[i + w + 1];
      const m = Math.hypot(gx, gy);
      G[i] = m;
      if (m > gMax) gMax = m;
    }
  }
  // normalise by a high percentile-ish value so a few hard edges don't dominate
  const gNorm = gMax * 0.35;

  const x0 = Math.floor(CROP.x0 * w);
  const x1 = Math.floor(CROP.x1 * w);
  const y0 = Math.floor(CROP.y0 * h);
  const y1 = Math.floor(CROP.y1 * h);
  const cw = x1 - x0;
  const ch = y1 - y0;

  // Foreground mask: the backdrop is strongly blue, the suits/skin are not.
  const fgRaw = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const notBlue = 1 - sstep(0.02, 0.06, bd[i]);
    fgRaw[i] = Math.max(notBlue, sstep(0.18, 0.4, L[i]));
  }
  const fg = boxBlur(fgRaw, w, h, 2);

  // local detail (glasses, stripes, collars, features)
  const Lb = boxBlur(L, w, h, 3);

  const weight = new Float32Array(n);
  const cdf = new Float32Array(n);
  let total = 0;

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = y * w + x;
      const g = Math.min(1, G[i] / gNorm);
      const detail = Math.min(1, Math.abs(L[i] - Lb[i]) * 6);
      const body = fg[i];

      let wgt =
        body * (0.16 + 0.95 * sstep(0.05, 0.55, L[i])) + // soft body fill, brighter where lit
        body * (1.4 * g * g + 0.6 * g) + // edges
        body * 0.95 * detail; // fine detail

      // hard-reject the blue backdrop curves
      wgt *= 0.04 + 0.96 * body;

      const ex = Math.min(x - x0, x1 - 1 - x) / (cw * 0.04);
      const ey = Math.min(y - y0, y1 - 1 - y) / (ch * 0.04);
      wgt *= Math.min(1, ex, ey);

      weight[i] = wgt;
      total += wgt;
    }
  }

  // build CDF
  let acc = 0;
  for (let i = 0; i < n; i++) {
    acc += weight[i];
    cdf[i] = acc;
  }

  const positions = new Float32Array(count * 3);
  const tones = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  const aspect = cw / ch;

  for (let k = 0; k < count; k++) {
    const target = rand() * total;
    let lo = 0;
    let hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    const px = lo % w;
    const py = (lo / w) | 0;
    const jx = rand() - 0.5;
    const jy = rand() - 0.5;

    const nx = (px - x0 + 0.5 + jx) / cw - 0.5; // -0.5 .. 0.5
    const ny = 0.5 - (py - y0 + 0.5 + jy) / ch; // up is +y
    const l = L[lo];
    const g = Math.min(1, G[lo] / gNorm);

    positions[k * 3] = nx * aspect; // in "height = 1" units
    positions[k * 3 + 1] = ny;
    positions[k * 3 + 2] = (l - 0.3) * 0.16 + (rand() - 0.5) * 0.03; // shallow relief for depth
    tones[k] = Math.min(1, 0.28 + 0.6 * Math.pow(l, 0.7) + 0.5 * g);

    // the person's real colours (lifted a little so dark suits still read in additive blending)
    const lift = 1.35;
    colors[k * 3] = Math.min(1, (data[lo * 4] / 255) * lift + 0.04);
    colors[k * 3 + 1] = Math.min(1, (data[lo * 4 + 1] / 255) * lift + 0.04);
    colors[k * 3 + 2] = Math.min(1, (data[lo * 4 + 2] / 255) * lift + 0.04);
  }

  return { positions, tones, colors, aspect };
}

/**
 * Real photograph with the navy backdrop removed (alpha cut-out), cropped to exactly the
 * same region the particles are sampled from so the two line up pixel for pixel.
 */
export function cutoutFromPixels(data, w, h) {
  const n = w * h;
  const L = new Float32Array(n);
  const fgRaw = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = data[i * 4] / 255;
    const g = data[i * 4 + 1] / 255;
    const b = data[i * 4 + 2] / 255;
    L[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    const bd = b - Math.max(r, g);
    fgRaw[i] = Math.max(1 - sstep(0.02, 0.06, bd), sstep(0.18, 0.4, L[i]));
  }
  const fg = boxBlur(fgRaw, w, h, 3);

  const x0 = Math.floor(CROP.x0 * w);
  const x1 = Math.floor(CROP.x1 * w);
  const y0 = Math.floor(CROP.y0 * h);
  const y1 = Math.floor(CROP.y1 * h);
  const cw = x1 - x0;
  const ch = y1 - y0;
  const rgba = new Uint8ClampedArray(cw * ch * 4);

  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const si = (y + y0) * w + (x + x0);
      const di = y * cw + x;
      let a = sstep(0.28, 0.85, fg[si]);

      // feather the borders so the photo melts into the black page
      const fl = sstep(0, 0.04, x / cw);
      const fr = sstep(0, 0.07, (cw - 1 - x) / cw);
      const ft = sstep(0, 0.05, y / ch);
      const fb = sstep(0, 0.2, (ch - 1 - y) / ch);
      a *= fl * fr * ft * fb;

      rgba[di * 4] = data[si * 4];
      rgba[di * 4 + 1] = data[si * 4 + 1];
      rgba[di * 4 + 2] = data[si * 4 + 2];
      rgba[di * 4 + 3] = Math.round(a * 255);
    }
  }
  return { rgba, width: cw, height: ch };
}

function readPixels(img, width) {
  const height = Math.round((img.naturalHeight / img.naturalWidth) * width);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, width, height);
  return { data: ctx.getImageData(0, 0, width, height).data, width, height };
}

/** returns the particle targets (with real colours) and a ready-to-use photo canvas */
export async function loadTeamPhoto(url, count) {
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  await img.decode();

  const small = readPixels(img, 460);
  const points = pointsFromPixels(small.data, small.width, small.height, count);

  // the cut-out is the memory-heavy part: cap it, and never let a failure here lose the particles
  let photo = null;
  try {
    const full = readPixels(img, Math.min(img.naturalWidth, 1600));
    const cut = cutoutFromPixels(full.data, full.width, full.height);
    photo = document.createElement('canvas');
    photo.width = cut.width;
    photo.height = cut.height;
    photo.getContext('2d').putImageData(new ImageData(cut.rgba, cut.width, cut.height), 0, 0);
  } catch (err) {
    console.warn('[scene] team photo cut-out failed, showing the particles only', err);
    photo = null;
  }

  return { ...points, photo };
}