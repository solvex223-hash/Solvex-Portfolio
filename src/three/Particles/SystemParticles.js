import * as THREE from 'three';
import { seeded } from '../math.js';
import { SHAPE_COUNT, TEX_W } from '../Shapes/ShapeBank.js';
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
  attribute float aIdx;

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
  uniform float uService; // continuous shape index 0..10
  uniform sampler2D uShapes;
  uniform sampler2D uShapeCols;
  uniform float uCalm; // 0..1: the backdrop recedes behind later sections
  uniform float uSvcPhoto; // 0..1: how strongly the real service photo covers the particles
  uniform float uShapeRows;
  uniform vec3 uBase;
  uniform vec3 uHigh;
  uniform vec3 uAccent;
  uniform vec3 uAtmos;

  const float SH_W = ${TEX_W}.0;
  const float SH_LAST = ${SHAPE_COUNT - 1}.0;

  // target position / brightness of this particle in shape s (see ShapeBank)
  vec4 shapeAt(float s, float idx) {
    float row = floor(idx / SH_W);
    float col = idx - row * SH_W;
    return texelFetch(uShapes, ivec2(int(col), int(s * uShapeRows + row)), 0);
  }

  // real colour of this particle in shape s (rgb in sRGB, a = 1 when the shape comes from a photo)
  vec4 shapeCol(float s, float idx) {
    float row = floor(idx / SH_W);
    float col = idx - row * SH_W;
    return texelFetch(uShapeCols, ivec2(int(col), int(s * uShapeRows + row)), 0);
  }

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

    // 5. the fragments assemble into 3D objects, then morph from shape to shape.
    //    Every particle has a target position on every object (ShapeBank texture).
    float xc = 0.0;
    float xTone = 0.5;
    float xAcc = 0.0;
    float xDust = 0.0;
    vec3 xCol = vec3(0.0);
    float xHas = 0.0;
    if (uConnect > 0.001) {
      xc = clamp(uConnect * 1.5 - aSeed * 0.5, 0.0, 1.0);
      xc = xc * xc * (3.0 - 2.0 * xc);

      float xi = min(floor(uService), SH_LAST - 1.0);
      float xf = uService - xi;
      float xm = clamp(xf * 1.5 - aSeed * 0.5, 0.0, 1.0); // staggered per particle
      xm = xm * xm * (3.0 - 2.0 * xm);

      vec4 sa = shapeAt(xi, aIdx);
      vec4 sb = shapeAt(xi + 1.0, aIdx);
      vec3 fpos = mix(sa.xyz, sb.xyz, xm);

      // between objects the particles lift off, drift and re-converge (dissolve and reform)
      float arc = sin(3.14159 * xm);
      xDust = step(sa.w, 0.0);
      fpos += (aDir * (1.4 + 2.6 * aSeed) + swirl * 0.7) * arc * (1.0 - xDust);
      // formed objects stay crisp: tiny breathing only. Ambient dust drifts freely.
      fpos += swirl * mix(0.02, 0.7, xDust);

      // slow, controlled sway so the volume is readable as 3D
      float yaw = sin(uTime * 0.14) * 0.2;
      fpos.xz = vec2(cos(yaw) * fpos.x + sin(yaw) * fpos.z, -sin(yaw) * fpos.x + cos(yaw) * fpos.z);

      float accA = step(2.0, sa.w);
      float accB = step(2.0, sb.w);
      xTone = mix(sa.w - 2.0 * accA, sb.w - 2.0 * accB, xm);
      xAcc = mix(accA, accB, xm);
      vec4 ca = shapeCol(xi, aIdx);
      vec4 cb = shapeCol(xi + 1.0, aIdx);
      xCol = mix(ca.rgb, cb.rgb, xm);
      xHas = mix(ca.a, cb.a, xm) * (1.0 - xDust);
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

    // object shading: bright silhouette edges, softer faces, a few violet accents
    float fH = fract(aSeed * 91.7);
    float fSize = mix(0.030 + 0.024 * xTone, 0.016 + 0.034 * fH * fH, xDust) * (1.0 + 0.25 * xAcc + 0.45 * xHas);
    size = mix(size, fSize, xc);
    gl_PointSize = clamp(size * uScale / -mv.z, 1.0, mix(8.0, 9.0, xc));

    float twinkle = 0.75 + 0.25 * sin(uTime * 1.3 + aSeed * 40.0);
    float aT = mix((0.26 + 0.62 * aHeadTone) * twinkle * (0.65 + 0.9 * rimG) * front, 0.85, s) + 0.9 * h;
    float aH = 0.3 + 0.7 * aTone;
    // once the real photograph fades in, the particles step back
    float photoCover = 1.0 - 0.92 * uPhoto * f;
    vAlpha = mix(aT, aH, f) * mix(1.0, 0.5, d) * photoCover * uVis;
    float tw = 0.92 + 0.08 * sin(uTime * (0.4 + fH * 0.8) + aSeed * 60.0);
    // ambient dust stays faint and keeps clear of the centred write-up
    float dustKeep = smoothstep(0.25, 0.8, length(ndc / (uAspect >= 1.0 ? vec2(0.6, 0.45) : vec2(0.95, 0.4))));
    float objA = mix((0.36 + 0.64 * xTone) * tw, (0.55 + 0.45 * xTone) * tw, xHas);
    float dustA = (0.1 + 0.18 * fH) * mix(0.3, 1.0, dustKeep);
    vAlpha = mix(vAlpha, mix(objA, dustA, xDust), xc);
    vAlpha *= 1.0 - 0.7 * uSvcPhoto * xHas * xc; // once the photo has taken over, the particles recede to a fine grain
    vAlpha *= mix(1.0, 0.65, xHas * xc); // the formed images are a backdrop behind the text
    vAlpha *= 1.0 - 0.9 * uCalm * xc; // Selected Work and later: leave the stage to the content
    vXc = xc;

    // colour: silver and soft white; the accent only touches selected parts of each object
    vec3 fcol = mix(uBase, uHigh, xTone * xTone);
    fcol = mix(fcol, pow(xCol, vec3(2.2)), xHas); // photo shapes keep their real colours
    fcol = mix(fcol, uAtmos, 0.5 * xDust);
    vFC = mix(fcol, uAccent, xAcc * 0.9 * (1.0 - xDust) * (1.0 - xHas));
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
  constructor(count, { tower, holo, tones, colors, headColors, headTones, shared, shapes }) {
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

    // index into the ShapeBank texture (target positions of this particle on every object)
    const idx = new Float32Array(count);
    for (let i = 0; i < count; i++) idx[i] = i;
    geo.setAttribute('aIdx', new THREE.BufferAttribute(idx, 1));

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
        uShapes: { value: shapes.texture },
        uShapeCols: { value: shapes.colorTexture },
        uSvcPhoto: { value: 0 },
        uCalm: { value: 0 },
        uShapeRows: { value: shapes.rows },
        ...createPaletteUniforms(),
      },
    });

    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false; // positions are computed in the shader
  }

  setCalm(v) {
    this.material.uniforms.uCalm.value = v;
  }

  setServicePhoto(v) {
    this.material.uniforms.uSvcPhoto.value = v;
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
  }
}