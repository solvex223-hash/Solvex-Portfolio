import * as THREE from 'three';
import { seeded, range } from '../math.js';
import { FORMATIONS_GLSL } from './formations.js';

const VERT = /* glsl */ `
  attribute vec4 aR;
  attribute float aEnd;
  attribute float aDu;
  attribute float aSeed;

  uniform float uTime;
  uniform float uService;

  ${FORMATIONS_GLSL}

  varying float vA;

  void main() {
    vec4 r = aR;
    r.x += aEnd * aDu;
    float ga;
    vec3 p = fxPlace(r, 0.0, aSeed, uService, uTime, ga);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    vA = ga * (0.5 + 0.5 * fract(aSeed * 13.7));
  }
`;

const FRAG = /* glsl */ `
  uniform float uLine;
  uniform vec3 uColor;
  varying float vA;

  void main() {
    gl_FragColor = vec4(uColor, vA * uLine);
    #include <colorspace_fragment>
  }
`;

/**
 * Restrained connection lines that follow the same formations as the particles.
 * They are the "restored connections" of the system, faint violet-white strokes.
 */
export class SystemLines {
  constructor({ count, settle }) {
    const R = seeded(131);
    const aR = new Float32Array(count * 2 * 4);
    const aEnd = new Float32Array(count * 2);
    const aDu = new Float32Array(count * 2);
    const aSeed = new Float32Array(count * 2);

    for (let i = 0; i < count; i++) {
      const du = 0.06 + R() * 0.14;
      const r = [R() * (1 - du), R(), R(), R()];
      const seed = R();
      for (let e = 0; e < 2; e++) {
        const k = i * 2 + e;
        aR.set(r, k * 4);
        aEnd[k] = e;
        aDu[k] = du;
        aSeed[k] = seed;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 2 * 3), 3));
    geo.setAttribute('aR', new THREE.BufferAttribute(aR, 4));
    geo.setAttribute('aEnd', new THREE.BufferAttribute(aEnd, 1));
    geo.setAttribute('aDu', new THREE.BufferAttribute(aDu, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uService: { value: 0 },
        uSettle: settle,
        uLine: { value: 0 },
        uColor: { value: new THREE.Color(0.62, 0.52, 1.0) },
      },
    });

    this.mesh = new THREE.LineSegments(geo, this.material);
    this.mesh.frustumCulled = false; // positions are computed in the shader
    this.mesh.visible = false;
  }

  update(t, d) {
    const u = this.material.uniforms;
    const connect = d.connect ?? 0;
    const service = d.service ?? 0;
    const settle = d.settle ?? 0;
    const frac = service - Math.floor(service);
    const amp = 1 - 0.8 * Math.sin(Math.PI * frac); // quieter while one formation morphs into the next
    u.uTime.value = t;
    u.uService.value = service;
    u.uLine.value = range(connect, 0.45, 1) * amp * 0.2 * (1 + 0.9 * settle);
    this.mesh.visible = u.uLine.value > 0.002;
  }
}
