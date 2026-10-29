import * as THREE from 'three';
import { clamp, lerp, range } from '../math.js';

const HERO_A = new THREE.Vector3(-1.0, 2.4, 15.5); // opening (looking slightly down on the globe)
const HERO_B = new THREE.Vector3(1.6, 1.2, 14.0); // as the hero scrolls away
const ABOUT = new THREE.Vector3(0, 0.2, 14.6); // front-on to the team picture
const PROBLEM = new THREE.Vector3(0.3, 0.6, 19);
const SOLUTIONS = new THREE.Vector3(0, 0.3, 16); // base distance for the 3D objects (about 7 world units wide)

export const ABOUT_DISTANCE = ABOUT.length();

export class CameraRig {
  constructor(camera, { reduced = false } = {}) {
    this.camera = camera;
    this.reduced = reduced;
    this.pos = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.w = 1;
    this.h = 1;
    this.pointer = { x: 0, y: 0 };
    this.px = 0;
    this.py = 0;
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
  }

  setPointer(x, y) {
    this.pointer.x = x;
    this.pointer.y = y;
  }

  update(d, dt, intro) {
    const cam = this.camera;

    // taller than wide (phones, tablets held upright): globe on top, text underneath
    const stacked = cam.aspect <= 1.0;

    // pull the camera back until the whole globe (and its halo) fits the width, and the height when stacked
    const tanH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const need = (stacked ? 10.6 : 10.0) / (cam.aspect * 2 * tanH) / 15.5;
    const fit = Math.max(stacked ? 2.0 : 1, need);

    const heroPos = new THREE.Vector3().lerpVectors(HERO_A, HERO_B, d.hero).multiplyScalar(fit);
    const toAbout = range(d.scatter, 0.05, 0.9);
    const toProblem = range(d.dissolve, 0, 1);
    const toSol = range(d.connect || 0, 0, 1);

    // the service image is a backdrop centred behind the text: fit the whole 8 x 6.6 unit image to the
    // screen (height on wide screens, width on narrow ones)
    const solDist = Math.max(6.6 / (0.94 * 2 * tanH), 8.0 / ((stacked ? 1.12 : 0.96) * 2 * tanH * cam.aspect)); // phones: let the image fill the width
    const solFit = solDist / SOLUTIONS.z; // SOLUTIONS.z is the 16 unit reference distance


    this.pos
      .copy(heroPos)
      .lerp(ABOUT, toAbout)
      .lerp(PROBLEM.clone().multiplyScalar(fit), toProblem)
      .lerp(SOLUTIONS.clone().multiplyScalar(solFit), toSol);
    this.pos.multiplyScalar(1 + (1 - intro) * 0.35); // slow push-in during the loader hand-off

    const k = this.reduced ? 0 : 1;
    const f = 1 - Math.exp(-dt * 3);
    this.px += (this.pointer.x - this.px) * f;
    this.py += (this.pointer.y - this.py) * f;

    cam.position.set(this.pos.x + this.px * 0.5 * k, this.pos.y + this.py * 0.3 * k, this.pos.z);
    this.look.set(0, 0, 0);
    cam.lookAt(this.look);

    // screen composition: subject to the right of the text (wide screens) / above it (stacked)
    const heroShiftX = lerp(0.08, 0.24, clamp((cam.aspect - 1.0) / 0.78, 0, 1));
    const shiftX = stacked ? 0 : lerp(heroShiftX, 0.2, toAbout) * (1 - toProblem) * (1 - toSol);
    const shiftY = stacked
      ? lerp(0.22, 0.2, toAbout) * (1 - toProblem * 0.7) * (1 - toSol)
      : 0;
    cam.setViewOffset(this.w, this.h, -shiftX * this.w, shiftY * this.h, this.w, this.h);
  }
}