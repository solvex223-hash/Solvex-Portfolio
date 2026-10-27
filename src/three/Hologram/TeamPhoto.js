import * as THREE from 'three';

/** the real team photograph (backdrop removed), shown once the particles have formed it */
export class TeamPhoto {
  constructor(canvas, aspect) {
    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;

    this.material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false, // keep the photograph's true colours
      fog: false,
    });

    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(aspect, 1), this.material);
    this.mesh.visible = false;
  }

  update(on, scale) {
    this.material.opacity = on;
    this.mesh.visible = on > 0.003;
    this.mesh.scale.setScalar(scale);
    this.mesh.position.z = -0.03 * scale; // just behind the particles
  }
}