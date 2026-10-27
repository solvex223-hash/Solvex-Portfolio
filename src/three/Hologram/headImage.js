import { seeded } from '../math.js';

// The artwork is 256x272. Everything below is expressed in those reference pixels and scaled
// to whatever resolution the file actually has.
const REF_W = 256;
const REF_H = 272;

// region of the artwork that is kept (drops the cut-off text on the left and the planet arc at the bottom)
const CROP_PX = { x0: 12, x1: 256, y0: 0, y1: 248 };

// glass cards and small UI fragments baked into the artwork. They are blanked out because
// SolveX's own live cards are placed where they were.
const BLANK_PX = [
  [137, 6, 190, 67],
  [187, 51, 244, 109],
  [137, 116, 195, 172],
  [106, 176, 152, 226],
  [155, 208, 208, 259],
  [0, 196, 60, 272],
];

const CW = CROP_PX.x1 - CROP_PX.x0;
const CH = CROP_PX.y1 - CROP_PX.y0;

export const HEAD_HEIGHT = 8.4; // world units
export const HEAD_ASPECT = CW / CH;

/** reference-pixel position -> world position on the head plane */
export function refToWorld(px, py) {
  return [
    ((px - CROP_PX.x0) / CW - 0.5) * HEAD_ASPECT * HEAD_HEIGHT,
    (0.5 - (py - CROP_PX.y0) / CH) * HEAD_HEIGHT,
  ];
}

const sstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function rectKeep(x, y, r, feather) {
  const dx = Math.max(r[0] - x, 0, x - r[2]);
  const dy = Math.max(r[1] - y, 0, y - r[3]);
  return sstep(0, feather, Math.hypot(dx, dy));
}

/**
 * pure function (no DOM): picks particle positions + colours from the artwork and returns the
 * cleaned, cropped pixels used for the glowing image layer.
 */
export function headFromPixels(data, w, h, count, seed = 13) {
  const R = seeded(seed);
  const sx = w / REF_W;
  const sy = h / REF_H;
  const x0 = Math.round(CROP_PX.x0 * sx);
  const x1 = Math.min(w, Math.round(CROP_PX.x1 * sx));
  const y0 = Math.round(CROP_PX.y0 * sy);
  const y1 = Math.min(h, Math.round(CROP_PX.y1 * sy));
  const cw = x1 - x0;
  const ch = y1 - y0;

  const rects = BLANK_PX.map(([a, b, c, d]) => [a * sx, b * sy, c * sx, d * sy]);
  const feather = 8 * sx;

  // luminance without the navy backdrop
  const L = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const l = (0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]) / 255;
    L[i] = Math.max(0, l - 0.05);
  }

  const keep = new Float32Array(w * h).fill(1);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      let m = 1;
      for (const r of rects) m = Math.min(m, rectKeep(x, y, r, feather));
      const fl = sstep(0, 6 * sx, x - x0);
      const fr = sstep(0, 10 * sx, x1 - 1 - x);
      const ft = sstep(0, 4 * sy, y - y0);
      const fb = sstep(0, 16 * sy, y1 - 1 - y);
      keep[y * w + x] = m * fl * fr * ft * fb;
    }
  }

  // edge strength = keeps the fine constellation lines and the rim light
  const G = new Float32Array(w * h);
  let gMax = 1e-6;
  for (let y = y0 + 1; y < y1 - 1; y++) {
    for (let x = x0 + 1; x < x1 - 1; x++) {
      const i = y * w + x;
      const gx = L[i + 1] - L[i - 1];
      const gy = L[i + w] - L[i - w];
      const m = Math.hypot(gx, gy);
      G[i] = m;
      if (m > gMax) gMax = m;
    }
  }
  const gNorm = gMax * 0.4;

  const cdf = new Float32Array(w * h);
  let total = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let wgt = 0;
      if (x >= x0 && x < x1 && y >= y0 && y < y1) {
        const g = Math.min(1, G[i] / gNorm);
        wgt = keep[i] * (0.03 + 2.2 * Math.pow(L[i], 1.15) + 0.6 * g);
      }
      total += wgt;
      cdf[i] = total;
    }
  }

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const tones = new Float32Array(count);
  const aspect = cw / ch;

  for (let k = 0; k < count; k++) {
    const target = R() * total;
    let lo = 0;
    let hi = w * h - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    const px = lo % w;
    const py = (lo / w) | 0;
    const nx = (px - x0 + 0.5 + (R() - 0.5)) / cw - 0.5;
    const ny = 0.5 - (py - y0 + 0.5 + (R() - 0.5)) / ch;
    const l = L[lo];

    positions[k * 3] = nx * aspect; // "height = 1" units
    positions[k * 3 + 1] = ny;
    positions[k * 3 + 2] = (l - 0.15) * 0.2 + (R() - 0.5) * 0.05; // shallow relief

    // the artwork's own colours, pushed brighter so the points sparkle
    for (let c = 0; c < 3; c++) {
      const v = data[lo * 4 + c] / 255;
      colors[k * 3 + c] = Math.min(1, Math.pow(v, 0.72) * 1.55 + 0.05);
    }
    tones[k] = Math.min(1, 0.28 + 1.5 * l);
  }

  // cleaned crop for the glowing image layer (card areas and borders faded to black)
  const rgba = new Uint8ClampedArray(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const si = (y + y0) * w + (x + x0);
      const di = y * cw + x;
      const m = keep[si];
      rgba[di * 4] = data[si * 4] * m;
      rgba[di * 4 + 1] = data[si * 4 + 1] * m;
      rgba[di * 4 + 2] = data[si * 4 + 2] * m;
      rgba[di * 4 + 3] = 255;
    }
  }

  return { positions, colors, tones, aspect, rgba, width: cw, height: ch };
}

function readPixels(img, scale = 1) {
  const width = Math.round(img.naturalWidth * scale);
  const height = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);
  return { data: ctx.getImageData(0, 0, width, height).data, width, height };
}

/** loads the artwork; returns particle targets and a smooth upscaled canvas of the cleaned image */
export async function loadHeadImage(url, count) {
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  await img.decode();

  // the artwork is small, so work on an upscaled copy: smoother points and a smoother image layer
  const up = img.naturalWidth < 700 ? 3 : 1;
  const px = readPixels(img, up);
  const out = headFromPixels(px.data, px.width, px.height, count);

  const canvas = document.createElement('canvas');
  canvas.width = out.width;
  canvas.height = out.height;
  canvas.getContext('2d').putImageData(new ImageData(out.rgba, out.width, out.height), 0, 0);

  return { positions: out.positions, colors: out.colors, tones: out.tones, aspect: out.aspect, canvas };
}