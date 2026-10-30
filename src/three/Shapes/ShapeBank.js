import * as THREE from 'three';
import { SHAPES, buildShape } from './shapes.js';
import { seeded } from '../math.js';
import { sampleImage, orderByX } from './imageShape.js';

export const SHAPE_COUNT = SHAPES.length;
export const TEX_W = 1024;
export const DUST_EVERY = 8; // every 8th particle is faint ambient dust, never part of an object
const MAX_IMG = 640;

/** photo for each service: public/images/solutions/01.webp ... 11.webp (cut out, RGBA) */
export const imageUrl = (shape) => `/images/solutions/${String(shape + 1).padStart(2, '0')}.webp`;

async function loadImageData(url) {
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  await img.decode();
  const s = Math.min(1, MAX_IMG / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * s));
  const h = Math.max(1, Math.round(img.naturalHeight * s));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  return { data: ctx.getImageData(0, 0, w, h).data, width: w, height: h, canvas };
}

/**
 * Holds the target position of every particle for every shape in ONE float texture
 * (row block per shape). The vertex shader reads two shapes and morphs between them, so the
 * whole morph runs on the GPU and nothing is allocated per frame.
 *
 *   texel = (x, y, z, w)   w = brightness 0..1, +2 for a violet accent, -1 for ambient dust
 *   colours (second texture): the photo's real colour per particle; alpha 0 = no photo (use the palette)
 *
 * Each shape is built from its photo (real colours, like the team hologram). If a photo is missing
 * or fails to load, the procedural object for that service is used instead.
 */
export class ShapeBank {
  constructor(count) {
    this.count = count;
    this.rows = Math.ceil(count / TEX_W);
    this.height = this.rows * SHAPE_COUNT;
    this.data = new Float32Array(TEX_W * this.height * 4);
    this.built = new Array(SHAPE_COUNT).fill(false);
    this.photos = new Array(SHAPE_COUNT).fill(null); // { canvas, w, h } once a photo is loaded
    this.disposed = false;

    // ambient dust: the same faint volume of points behind every shape
    const R = seeded(404);
    const dust = new Float32Array(Math.ceil(count / DUST_EVERY) * 3);
    for (let i = 0; i < dust.length; i += 3) {
      dust[i] = (R() * 2 - 1) * 17;
      dust[i + 1] = (R() * 2 - 1) * 10;
      dust[i + 2] = -26 + R() * 20;
    }
    // until a shape is built its particles simply wait in the dust volume
    for (let s = 0; s < SHAPE_COUNT; s++) {
      let d = 0;
      for (let i = 0; i < count; i++) {
        const o = this.offset(s, i);
        if (i % DUST_EVERY === 0) {
          this.data.set([dust[d * 3], dust[d * 3 + 1], dust[d * 3 + 2], -1], o);
          d++;
        } else {
          this.data.set([(R() * 2 - 1) * 14, (R() * 2 - 1) * 8, -8 + R() * 6, 0.1], o);
        }
      }
    }

    this.texture = new THREE.DataTexture(this.data, TEX_W, this.height, THREE.RGBAFormat, THREE.FloatType);
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.generateMipmaps = false;
    this.texture.needsUpdate = true;

    this.colors = new Uint8Array(TEX_W * this.height * 4); // rgb + 255 where a photo colour exists
    this.colorTexture = new THREE.DataTexture(this.colors, TEX_W, this.height, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.colorTexture.minFilter = THREE.NearestFilter;
    this.colorTexture.magFilter = THREE.NearestFilter;
    this.colorTexture.generateMipmaps = false;
    this.colorTexture.needsUpdate = true;
  }

  offset(shape, i) {
    return ((shape * this.rows + Math.floor(i / TEX_W)) * TEX_W + (i % TEX_W)) * 4;
  }

  build(shape) {
    if (this.built[shape] || this.disposed) return;
    const nShape = this.count - Math.ceil(this.count / DUST_EVERY);
    const { pos, w } = buildShape(shape, nShape, 1);
    let k = 0;
    for (let i = 0; i < this.count; i++) {
      if (i % DUST_EVERY === 0) continue;
      const o = this.offset(shape, i);
      this.data[o] = pos[k * 3];
      this.data[o + 1] = pos[k * 3 + 1];
      this.data[o + 2] = pos[k * 3 + 2];
      this.data[o + 3] = w[k];
      k++;
    }
    this.built[shape] = true;
    this.texture.needsUpdate = true;
  }

  /** write a photo-based shape: positions, tone and real colours */
  buildImage(shape, img) {
    const nShape = this.count - Math.ceil(this.count / DUST_EVERY);
    const raw = sampleImage(img, nShape, seeded(1000 + shape * 7));
    const { pos, col, tone } = orderByX(raw.pos, raw.col, raw.tone);
    let k = 0;
    for (let i = 0; i < this.count; i++) {
      if (i % DUST_EVERY === 0) continue;
      const o = this.offset(shape, i);
      this.data[o] = pos[k * 3];
      this.data[o + 1] = pos[k * 3 + 1];
      this.data[o + 2] = pos[k * 3 + 2];
      this.data[o + 3] = tone[k];
      this.colors[o] = col[k * 3];
      this.colors[o + 1] = col[k * 3 + 1];
      this.colors[o + 2] = col[k * 3 + 2];
      this.colors[o + 3] = 255;
      k++;
    }
    this.built[shape] = true;
    this.photos[shape] = { canvas: img.canvas, w: img.width, h: img.height };
    this.texture.needsUpdate = true;
    this.colorTexture.needsUpdate = true;
  }

  /** shape 0 first, then one shape per idle slice; photo first, procedural object as the fallback */
  async start() {
    const idle = () => new Promise((r) => (window.requestIdleCallback ? window.requestIdleCallback(() => r()) : setTimeout(r, 60)));
    for (let s = 0; s < SHAPE_COUNT && !this.disposed; s++) {
      try {
        if (SHAPES[s].procedural) {
          this.build(s); // generated objects (e.g. the ARIA core) have no photo
          await idle();
          continue;
        }
        this.buildImage(s, await loadImageData(imageUrl(s)));
      } catch (err) {
        console.warn(`[shapes] photo ${imageUrl(s)} unavailable, using the generated object`, err);
        try {
          this.build(s);
        } catch (err2) {
          console.warn('[shapes] could not build shape', s, err2);
        }
      }
      await idle();
    }
  }

  dispose() {
    this.disposed = true;
    this.texture.dispose();
    this.colorTexture.dispose();
  }
}
