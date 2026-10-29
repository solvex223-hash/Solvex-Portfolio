import * as THREE from 'three';
import { PHOTO_BOX } from './imageShape.js';

/** the photo is a backdrop: strong enough to read as the image, dim enough for the text in front */
const BACKDROP_OPACITY = 0.55;

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * The real service photographs (backdrop removed), exactly like the team photo: the particles first
 * assemble the picture, then the real photo takes over on top of them, so it reads as if the particles
 * had formed it. When the next morph starts the photo fades out and the particles carry on.
 *
 * Planes are created lazily when ShapeBank has loaded a photo; if a photo is missing nothing is shown
 * for it and the particle shape alone is displayed.
 */
export class ServicePhotos {
  constructor(bank) {
    this.bank = bank;
    this.group = new THREE.Group();
    this.items = new Array(bank.photos.length).fill(null);
  }

  make(i, photo) {
    const texture = new THREE.CanvasTexture(photo.canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false, // keep the photograph's true colours
      fog: false,
    });
    // same fit as the particle sampling, so the photo lands exactly on the particles
    const s = Math.min(PHOTO_BOX.w / photo.w, PHOTO_BOX.h / photo.h);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(photo.w * s, photo.h * s), material);
    mesh.visible = false;
    mesh.position.z = -0.03;
    this.group.add(mesh);
    this.items[i] = { mesh, material, texture };
  }

  /**
   * shape: continuous shape index (0..10); gate: 0..1 once the first object has formed;
   * time: same clock as the particle shader so the photo sways with them. Returns the photo strength.
   */
  update(shape, gate, time) {
    const yaw = Math.sin(time * 0.14) * 0.2; // identical to the sway in the particle shader
    let strongest = 0;
    for (let i = 0; i < this.items.length; i++) {
      if (!this.items[i] && this.bank.photos[i]) this.make(i, this.bank.photos[i]);
      const it = this.items[i];
      if (!it) continue;
      // fully on while the particles hold this shape, off as soon as they start to morph away
      const on = (1 - smooth(0.02, 0.22, Math.abs(shape - i))) * gate;
      it.material.opacity = on * BACKDROP_OPACITY;
      it.mesh.visible = on > 0.003;
      it.mesh.rotation.y = yaw;
      if (on > strongest) strongest = on;
    }
    return strongest;
  }

  dispose() {
    for (const it of this.items) {
      if (!it) continue;
      it.texture.dispose();
      it.material.dispose();
      it.mesh.geometry.dispose();
    }
  }
}
