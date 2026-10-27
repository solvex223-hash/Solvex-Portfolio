import * as THREE from 'three';
import { seeded } from '../math.js';
import { FIELD_GLSL } from '../Field/field.glsl.js';
import { createPaletteUniforms, applyPalette } from '../Field/palette.js';

const VERT = /* glsl */ `
  attribute vec3 aTower;
  attribute vec3 aHolo;
  attribute vec3 aDir;
  attribute vec3 aColor;
  attribute vec3 aHeadColor;
  attribute float aSeed;
  attribute float aTone;
  attribute float aHeadTone;
  attribute float aSize;
  attribute vec4 aRnd;

  uniform float uTime;
  uniform float uScale;
  uniform float uScatter;
  uniform float uForm;
  uniform float uDissolve;
  uniform float uTowerRot;
  uniform float uTilt;
  uniform float uHoloScale;
  uniform float uVis;
  uniform float uPhoto;
  uniform float uHover;
  uniform float uAspect;
  uniform vec2 uMouse;
  uniform vec3 uHoloCenter;
  uniform float uConnect;
  uniform float uService;
  uniform vec3 uBase;
  uniform vec3 uHigh;
  uniform vec3 uAccent;
  uniform vec3 uAtmos;

  ${FIELD_GLSL}

  varying float vAlpha;
  varying float vForm;
  varying float vSeed;
  varying vec3 vColor;
  varying vec3 vHeadColor;
  varying float vGlow;
  varying float vTint;
  varying float vRim;
  varying float vXc;
  varying vec3 vFC;

  void main() {
    float s = smoothstep(0.0, 1.0, uScatter);
    float d = smoothstep(0.0, 1.0, uDissolve);

    // 1. on the globe: spin about its axis, then tilt the axis
    vec3 t = aTower;
    float c = cos(uTowerRot);
    float sn = sin(uTowerRot);
    t.xz = vec2(c * t.x + sn * t.z, -sn * t.x + c * t.z);
    float ct = cos(uTilt);
    float st = sin(uTilt);
    t.xy = vec2(ct * t.x - st * t.y, st * t.x + ct * t.y);

    // which side of the globe faces the camera, and how close to the rim
    vec3 gn = normalize(t);
    float facing = dot(gn, normalize(cameraPosition));
    float front = smoothstep(-0.02, 0.28, facing);
    float rimG = pow(1.0 - clamp(facing, 0.0, 1.0), 2.0);
    float tint = smoothstep(0.1, -0.8, (viewMatrix * vec4(gn, 0.0)).x);

    vec3 swirl = vec3(
      sin(uTime * 0.45 + aSeed * 31.4),
      cos(uTime * 0.38 + aSeed * 17.2),
      sin(uTime * 0.31 + aSeed * 9.7)
    );

    // 2. scattered: lifts off the structure and drifts
    vec3 freeP = t + aDir * (3.0 + aSeed * 9.0) * s + swirl * (0.25 + 0.9 * aSeed) * s;

    // 3. hologram target
    vec3 hp = uHoloCenter + aHolo * uHoloScale;
    hp += swirl * 0.025;

    float f = clamp(uForm * 1.45 - aSeed * 0.45, 0.0, 1.0);
    f = f * f * (3.0 - 2.0 * f);

    vec3 p = mix(freeP, hp, f);

    // 4. fragmentation after the hologram
    p += (aDir * (4.0 + aSeed * 14.0) + swirl * 0.9) * d;

    // 5. the fragments settle into the volumetric field (staggered per particle)
    float xc = 0.0;
    float xLayer = 1.0;
    float xD = 30.0;
    if (uConnect > 0.001) {
      xc = clamp(uConnect * 1.5 - aSeed * 0.5, 0.0, 1.0);
      xc = xc * xc * (3.0 - 2.0 * xc);
      vec3 fpos = fieldHome(aRnd, uTime, uService, uAspect, uSettle, xLayer, xD);
      p = mix(p, fpos, xc);
    }

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    // glow that follows the cursor (screen space), only while still part of the head
    vec2 ndc = gl_Position.xy / gl_Position.w;
    float globeVis = mix(front, 1.0, s);
    float h = uHover * smoothstep(0.42, 0.0, length((ndc - uMouse) * vec2(uAspect, 1.0))) * (1.0 - f) * globeVis;

    float holoOn = f * (1.0 - d);
    float size = aSize * (1.0 + 0.7 * aTone * holoOn) * (1.0 + 1.4 * h);

    // field shading: size, brightness and colour by depth layer
    float fH = fract(aSeed * 91.7);
    float fSize = xLayer < 0.5 ? 0.026 + 0.030 * fH * fH
                : (xLayer < 1.5 ? 0.030 + 0.050 * fH * fH : 0.060 + 0.060 * fH);
    // text-safe region: fewer, dimmer, smaller particles behind the centred write-up
    vec2 safeR = uAspect >= 1.0 ? vec2(0.62, 0.42) : vec2(0.96, 0.36);
    float safe = smoothstep(0.55, 1.1, length(ndc / safeR));
    float dimA = mix(1.0, mix(0.16, 1.0, safe), xc);
    size = mix(size, fSize * mix(0.65, 1.0, safe), xc);
    gl_PointSize = clamp(size * uScale / -mv.z, 1.0, mix(8.0, 12.0, xc));

    float twinkle = 0.75 + 0.25 * sin(uTime * 1.3 + aSeed * 40.0);
    float aT = mix((0.26 + 0.62 * aHeadTone) * twinkle * (0.65 + 0.9 * rimG) * front, 0.85, s) + 0.9 * h;
    float aH = 0.3 + 0.7 * aTone;
    // once the real photograph fades in, the particles step back
    float photoCover = 1.0 - 0.92 * uPhoto * f;
    vAlpha = mix(aT, aH, f) * mix(1.0, 0.5, d) * photoCover * uVis;
    float tw = 0.88 + 0.12 * sin(uTime * (0.4 + fH * 0.8) + aSeed * 60.0);
    float baseA = xLayer < 0.5 ? 0.30 + 0.35 * aTone
                : (xLayer < 1.5 ? 0.45 + 0.45 * aTone : 0.75 + 0.25 * fH);
    float fog = mix(1.0, 0.4, smoothstep(14.0, 50.0, xD));
    float nearFade = smoothstep(5.5, 9.0, xD); // very near particles dissolve instead of popping at the lens
    vAlpha = mix(vAlpha, baseA * tw * fog * nearFade * dimA, xc);
    vXc = xc;

    // colour: neutral silver by default, the accent only touches a few mid / focal particles
    float acc = xLayer < 0.5 ? 0.0 : step(xLayer < 1.5 ? 0.94 : 0.75, fract(aSeed * 37.1));
    vec3 fcol = mix(uBase, uHigh, smoothstep(0.55, 1.0, aTone) * (xLayer > 0.5 ? 1.0 : 0.35));
    fcol = mix(fcol, uAtmos, 0.45 * smoothstep(22.0, 50.0, xD)); // distant haze
    vFC = mix(fcol, uAccent, acc * 0.85);
    vGlow = h;
    vTint = tint * (1.0 - s);
    vRim = rimG * (1.0 - s);
    vForm = f;
    vSeed = aSeed;
    vColor = aColor;
    vHeadColor = aHeadColor;
  }
`;

const FRAG = /* glsl */ `
  varying float vAlpha;
  varying float vForm;
  varying float vSeed;
  varying vec3 vColor;
  varying vec3 vHeadColor;
  varying float vGlow;
  varying float vTint;
  varying float vRim;
  varying float vXc;
  varying vec3 vFC;

  void main() {
    float dist = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, dist);
    a *= a;

    vec3 head = mix(vHeadColor, vec3(0.9, 0.45, 1.0), vTint * 0.65); // violet on the lit side
    head = mix(head, vec3(0.8, 0.95, 1.0), vRim * 0.5); // icy at the rim
    head = mix(head, vec3(0.95, 0.92, 1.0), vGlow * 0.85); // brighter near the cursor
    vec3 col = mix(head, vColor, vForm); // then the people's real colours
    col = mix(col, vFC, vXc); // palette-driven colour of the field

    gl_FragColor = vec4(col, a * vAlpha);
    #include <colorspace_fragment>
  }
`;

export class SystemParticles {
  constructor(count, { tower, holo, tones, colors, headColors, headTones, shared }) {
    const R = seeded(5);
    const dir = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const size = new Float32Array(count);
    const v = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
      v.set(R() - 0.5, R() - 0.5, R() - 0.5).normalize();
      dir.set([v.x, v.y, v.z], i * 3);
      seed[i] = R();
      size[i] = 0.022 + R() * 0.03;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('aTower', new THREE.BufferAttribute(tower, 3));
    geo.setAttribute('aHolo', new THREE.BufferAttribute(holo, 3));
    geo.setAttribute('aTone', new THREE.BufferAttribute(tones, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aHeadColor', new THREE.BufferAttribute(headColors, 3));
    geo.setAttribute('aHeadTone', new THREE.BufferAttribute(headTones, 1));
    geo.setAttribute('aDir', new THREE.BufferAttribute(dir, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));

    // separate generator so the existing particle layout stays exactly as it was
    const RR = seeded(77);
    const rnd = new Float32Array(count * 4);
    for (let i = 0; i < count * 4; i++) rnd[i] = RR();
    geo.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 4));

    this.settle = { value: 0 }; // shared with the connection lines

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uScale: { value: 800 },
        uScatter: { value: 0 },
        uForm: { value: 0 },
        uDissolve: { value: 0 },
        uTowerRot: { value: 0 },
        uTilt: { value: 0 },
        uHoloScale: { value: 6 },
        uVis: { value: 1 },
        uPhoto: { value: 0 },
        uHover: shared.uHover,
        uAspect: shared.uAspect,
        uMouse: shared.uMouse,
        uHoloCenter: { value: new THREE.Vector3(0, 0, 0) },
        uConnect: { value: 0 },
        uService: { value: 0 },
        uSettle: this.settle,
        ...createPaletteUniforms(),
      },
    });

    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false; // positions are computed in the shader
  }

  setPalette(p) {
    applyPalette(this.material.uniforms, p);
  }

  setScale(s) {
    this.material.uniforms.uScale.value = s;
  }

  setHoloScale(s) {
    this.material.uniforms.uHoloScale.value = s;
  }

  update(t, d, towerRot, photoOn = 0, tilt = 0) {
    const u = this.material.uniforms;
    u.uTime.value = t;
    u.uScatter.value = d.scatter;
    u.uForm.value = d.form;
    u.uDissolve.value = d.dissolve;
    u.uTowerRot.value = towerRot;
    u.uPhoto.value = photoOn;
    u.uTilt.value = tilt;
    u.uConnect.value = d.connect ?? 0;
    u.uService.value = d.service ?? 0;
    this.settle.value = d.settle ?? 0;
  }
}