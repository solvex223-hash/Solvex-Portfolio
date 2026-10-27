import * as THREE from 'three';
import { seeded, range } from '../math.js';
import { isLand } from './landMask.js';
import { latLon, CITIES, HQ, ARC_PAIRS } from './geo.js';

export const GLOBE_RADIUS = 4.2;
const TILT = 0.41; // axial tilt (radians)
const SPIN_SPEED = 0.16; // radians per second

// ---------- sampling land as evenly spaced dots ----------
function landPoints(count, seed = 21) {
  const R = seeded(seed);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const M = Math.ceil((count / 0.33) * 1.25);
  const pts = [];
  const spacing = Math.sqrt((4 * Math.PI) / M);

  for (let i = 0; i < M; i++) {
    const y = 1 - ((i + 0.5) / M) * 2;
    const rad = Math.sqrt(1 - y * y);
    const th = golden * i;
    let x = Math.cos(th) * rad;
    let z = Math.sin(th) * rad;
    let yy = y;
    const lat = (Math.asin(y) * 180) / Math.PI;
    const lon = (Math.atan2(x, z) * 180) / Math.PI;
    if (!isLand(lat, lon)) continue;
    // a little jitter so the dots don't show the spiral
    const j = spacing * 0.35;
    x += (R() - 0.5) * j;
    yy += (R() - 0.5) * j;
    z += (R() - 0.5) * j;
    const l = Math.hypot(x, yy, z);
    pts.push([x / l, yy / l, z / l]);
  }

  // exactly `count` points
  for (let i = pts.length - 1; i > 0; i--) {
    const k = (R() * (i + 1)) | 0;
    [pts[i], pts[k]] = [pts[k], pts[i]];
  }
  while (pts.length < count) {
    const y = R() * 2 - 1;
    const a = R() * Math.PI * 2;
    const r = Math.sqrt(1 - y * y);
    const p = [Math.cos(a) * r, y, Math.sin(a) * r];
    const lat = (Math.asin(y) * 180) / Math.PI;
    const lon = (Math.atan2(p[0], p[2]) * 180) / Math.PI;
    if (isLand(lat, lon)) pts.push(p);
  }
  return pts.slice(0, count);
}

// ---------- shaders ----------
const GRID_VERT = /* glsl */ `
  uniform float uVis;
  uniform float uHover;
  uniform float uAspect;
  uniform vec2 uMouse;
  varying float vA;
  varying float vTint;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vec3 n = normalize(wp.xyz);
    float facing = dot(n, normalize(cameraPosition));
    float front = smoothstep(-0.04, 0.25, facing);
    float rim = pow(1.0 - clamp(facing, 0.0, 1.0), 2.0);
    vec4 clip = projectionMatrix * viewMatrix * wp;
    gl_Position = clip;
    vec2 ndc = clip.xy / clip.w;
    float h = uHover * smoothstep(0.42, 0.0, length((ndc - uMouse) * vec2(uAspect, 1.0)));
    vA = (0.17 + 0.3 * rim + 0.85 * h) * front * uVis;
    vTint = smoothstep(0.1, -0.8, (viewMatrix * vec4(n, 0.0)).x);
  }
`;

const GRID_FRAG = /* glsl */ `
  varying float vA;
  varying float vTint;
  void main() {
    vec3 col = mix(vec3(0.2, 0.5, 1.0), vec3(0.85, 0.45, 1.0), vTint * 0.7);
    gl_FragColor = vec4(col, vA);
    #include <colorspace_fragment>
  }
`;

const MARK_VERT = /* glsl */ `
  attribute float aKind;
  attribute float aSeed;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uVis;
  uniform float uHover;
  uniform float uAspect;
  uniform float uScale;
  uniform vec2 uMouse;
  varying float vA;
  varying float vKind;
  varying vec3 vCol;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vec3 n = normalize(wp.xyz);
    float facing = dot(n, normalize(cameraPosition));
    float front = smoothstep(0.02, 0.3, facing);
    vec4 mv = viewMatrix * wp;
    vec4 clip = projectionMatrix * mv;
    gl_Position = clip;
    vec2 ndc = clip.xy / clip.w;
    float h = uHover * smoothstep(0.42, 0.0, length((ndc - uMouse) * vec2(uAspect, 1.0)));
    float pulse = 1.0 + 0.3 * sin(uTime * 2.2 + aSeed * 30.0);
    gl_PointSize = clamp((0.2 + 0.5 * aKind) * pulse * (1.0 + 1.4 * h) * uScale / -mv.z, 3.0, 70.0);
    vA = front * uVis;
    vKind = aKind;
    vCol = aColor;
  }
`;

const MARK_FRAG = /* glsl */ `
  uniform float uTime;
  varying float vA;
  varying float vKind;
  varying vec3 vCol;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float core = smoothstep(0.28, 0.0, d);
    float halo = pow(1.0 - d, 2.6) * 0.8;
    float t = fract(uTime * 0.42);
    float ring = vKind * smoothstep(0.07, 0.0, abs(d - t)) * (1.0 - t);
    vec3 col = mix(vCol, vec3(1.0), core * 0.85);
    gl_FragColor = vec4(col, (core + halo + ring * 1.2) * vA);
    #include <colorspace_fragment>
  }
`;

const ARC_VERT = /* glsl */ `
  attribute float aT;
  attribute float aSeed;
  uniform float uTime;
  uniform float uVis;
  uniform float uHover;
  uniform float uAspect;
  uniform vec2 uMouse;
  varying float vA;
  varying float vPulse;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vec3 n = normalize(wp.xyz);
    float facing = dot(n, normalize(cameraPosition));
    float front = smoothstep(-0.12, 0.2, facing);
    vec4 clip = projectionMatrix * viewMatrix * wp;
    gl_Position = clip;
    vec2 ndc = clip.xy / clip.w;
    float h = uHover * smoothstep(0.42, 0.0, length((ndc - uMouse) * vec2(uAspect, 1.0)));
    float head = fract(uTime * 0.2 + aSeed);
    float pulse = smoothstep(0.13, 0.0, abs(aT - head));
    vPulse = pulse;
    vA = (0.16 + 1.1 * pulse + 0.7 * h) * front * uVis;
  }
`;

const ARC_FRAG = /* glsl */ `
  varying float vA;
  varying float vPulse;
  void main() {
    vec3 col = mix(vec3(0.3, 0.8, 1.0), vec3(1.0, 0.88, 0.4), vPulse);
    gl_FragColor = vec4(col, vA);
    #include <colorspace_fragment>
  }
`;

const BODY_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const BODY_FRAG = /* glsl */ `
  uniform float uVis;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float f = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.3);
    float tint = smoothstep(0.2, -0.9, vNormal.x);
    vec3 inner = vec3(0.025, 0.06, 0.3);
    vec3 rimC = mix(vec3(0.22, 0.65, 1.0), vec3(0.85, 0.38, 1.0), tint);
    vec3 col = inner + rimC * f * 1.05;
    gl_FragColor = vec4(col, (0.22 + 0.6 * f) * uVis);
    #include <colorspace_fragment>
  }
`;

// Atmosphere: back faces of a slightly larger sphere. d is 0 at the outer edge of the shell and
// about 0.48 where the globe's own edge is, so the glow only fills the thin ring around the globe.
const ATMO_FRAG = /* glsl */ `
  uniform float uVis;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float d = max(dot(-vNormal, vView), 0.0);
    float k = d / 0.48;
    float i = k < 1.0 ? pow(k, 2.4) : 0.0;
    float tint = smoothstep(0.3, -0.8, vNormal.x);
    vec3 col = mix(vec3(0.2, 0.6, 1.0), vec3(0.8, 0.35, 1.0), tint);
    gl_FragColor = vec4(col * i * 0.9, i * 0.8 * uVis);
    #include <colorspace_fragment>
  }
`;

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.4, 'rgba(255,255,255,0.35)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * The SolveX globe: a spinning, glowing Earth made of land dots, a latitude/longitude grid,
 * a rim of atmosphere, city markers (Port Harcourt pulses) and data arcs with light travelling
 * along them. The land dots live in SystemParticles so they can later fly off and form the
 * team photo; this class owns everything else.
 */
export class Globe {
  constructor(count, { mobile = false } = {}) {
    const R = GLOBE_RADIUS;
    const rand = seeded(8);

    this.group = new THREE.Group();
    this.tilt = TILT;
    this.towerRot = 0;
    this.vis = 1;
    this.pointer = new THREE.Vector2(9, 9);
    this.pointerInside = false;

    this.shared = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(9, 9) },
      uHover: { value: 0 },
      uAspect: { value: 1 },
      uVis: { value: 1 },
      uScale: { value: 800 },
      uRes: { value: new THREE.Vector2(1366, 768) },
    };
    const S = this.shared;

    // ---------- land dots (handed to the particle system) ----------
    const land = landPoints(count);
    this.points = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.tones = new Float32Array(count);
    const cyan = new THREE.Color(0.22, 0.62, 1.0);
    const ice = new THREE.Color(0.55, 0.9, 1.0);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const p = land[i];
      this.points.set([p[0] * R * 1.004, p[1] * R * 1.004, p[2] * R * 1.004], i * 3);
      c.copy(cyan).lerp(ice, rand());
      this.colors.set([c.r, c.g, c.b], i * 3);
      this.tones[i] = 0.35 + 0.55 * rand();
    }

    // ---------- globe bodies ----------
    const bodyGeo = new THREE.SphereGeometry(R, 64, 48);
    this.bodyMat = new THREE.ShaderMaterial({
      vertexShader: BODY_VERT,
      fragmentShader: BODY_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uVis: S.uVis },
    });
    const body = new THREE.Mesh(bodyGeo, this.bodyMat);
    body.renderOrder = 0;

    this.atmoMat = new THREE.ShaderMaterial({
      vertexShader: BODY_VERT,
      fragmentShader: ATMO_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      uniforms: { uVis: S.uVis },
    });
    const atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.14, 64, 48), this.atmoMat);
    this.group.add(atmo, body);

    // ---------- tilt + spin ----------
    this.tiltGroup = new THREE.Group();
    this.tiltGroup.rotation.z = TILT;
    this.spinGroup = new THREE.Group();
    this.tiltGroup.add(this.spinGroup);
    this.group.add(this.tiltGroup);

    const hoverUniforms = {
      uTime: S.uTime,
      uVis: S.uVis,
      uHover: S.uHover,
      uAspect: S.uAspect,
      uMouse: S.uMouse,
    };

    // ---------- latitude / longitude grid ----------
    const gp = [];
    const seg = (a, b) => gp.push(a.x, a.y, a.z, b.x, b.y, b.z);
    const step = mobile ? 20 : 15;
    for (let lat = -75; lat <= 75; lat += step) {
      for (let lon = 0; lon < 360; lon += 4) {
        seg(latLon(lat, lon, R * 1.001), latLon(lat, lon + 4, R * 1.001));
      }
    }
    for (let lon = 0; lon < 360; lon += step) {
      for (let lat = -88; lat < 88; lat += 4) {
        seg(latLon(lat, lon, R * 1.001), latLon(lat + 4, lon, R * 1.001));
      }
    }
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
    const grid = new THREE.LineSegments(
      gg,
      new THREE.ShaderMaterial({
        vertexShader: GRID_VERT,
        fragmentShader: GRID_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uVis: S.uVis,
          uHover: S.uHover,
          uAspect: S.uAspect,
          uMouse: S.uMouse,
        },
      })
    );
    grid.frustumCulled = false;
    this.spinGroup.add(grid);

    // ---------- city markers (Port Harcourt = SolveX, pulsing) ----------
    const all = [{ ...HQ, kind: 1 }, ...CITIES.map((x) => ({ ...x, kind: 0 }))];
    const mp = new Float32Array(all.length * 3);
    const mKind = new Float32Array(all.length);
    const mSeed = new Float32Array(all.length);
    const mCol = new Float32Array(all.length * 3);
    all.forEach((city, i) => {
      const p = latLon(city.lat, city.lon, R * 1.012);
      mp.set([p.x, p.y, p.z], i * 3);
      mKind[i] = city.kind;
      mSeed[i] = rand();
      const r = rand();
      const col =
        city.kind === 1
          ? [0.85, 0.78, 1.0]
          : r < 0.55
            ? [1.0, 0.85, 0.3]
            : r < 0.85
              ? [0.4, 0.9, 1.0]
              : [1.0, 1.0, 1.0];
      mCol.set(col, i * 3);
    });
    const mg = new THREE.BufferGeometry();
    mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
    mg.setAttribute('aKind', new THREE.BufferAttribute(mKind, 1));
    mg.setAttribute('aSeed', new THREE.BufferAttribute(mSeed, 1));
    mg.setAttribute('aColor', new THREE.BufferAttribute(mCol, 3));
    const markers = new THREE.Points(
      mg,
      new THREE.ShaderMaterial({
        vertexShader: MARK_VERT,
        fragmentShader: MARK_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { ...hoverUniforms, uScale: S.uScale },
      })
    );
    markers.frustumCulled = false;
    this.spinGroup.add(markers);

    // ---------- data arcs ----------
    const byName = new Map(all.map((x) => [x.name, x]));
    const ap = [];
    const aT = [];
    const aS = [];
    const SEG = 64;
    ARC_PAIRS.forEach(([from, to], k) => {
      const A = byName.get(from);
      const B = byName.get(to);
      if (!A || !B) return;
      const a = latLon(A.lat, A.lon, 1);
      const b = latLon(B.lat, B.lon, 1);
      const angle = a.angleTo(b);
      const lift = 0.06 + 0.2 * (angle / Math.PI);
      const seed = (k * 0.381966) % 1;
      const pts = [];
      for (let i = 0; i <= SEG; i++) {
        const t = i / SEG;
        const v = a.clone().lerp(b, t).normalize();
        v.multiplyScalar(R * (1.012 + lift * Math.sin(Math.PI * t)));
        pts.push(v);
      }
      for (let i = 0; i < SEG; i++) {
        ap.push(pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
        aT.push(i / SEG, (i + 1) / SEG);
        aS.push(seed, seed);
      }
    });
    const ag = new THREE.BufferGeometry();
    ag.setAttribute('position', new THREE.Float32BufferAttribute(ap, 3));
    ag.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 1));
    ag.setAttribute('aSeed', new THREE.Float32BufferAttribute(aS, 1));
    const arcs = new THREE.LineSegments(
      ag,
      new THREE.ShaderMaterial({
        vertexShader: ARC_VERT,
        fragmentShader: ARC_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: hoverUniforms,
      })
    );
    arcs.frustumCulled = false;
    this.spinGroup.add(arcs);

    // ---------- thin orbit ring ----------
    const ringPts = [];
    for (let i = 0; i < 200; i++) {
      const a = (i / 200) * Math.PI * 2;
      ringPts.push(Math.cos(a) * R * 1.55, 0, Math.sin(a) * R * 1.55);
    }
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.Float32BufferAttribute(ringPts, 3));
    this.ringMat = new THREE.LineBasicMaterial({
      color: 0x7fa6ff,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.ring = new THREE.LineLoop(rg, this.ringMat);
    this.ring.rotation.set(1.25, 0, 0.35);
    this.group.add(this.ring);

    // ---------- bokeh + stars ----------
    const dot = dotTexture();
    const bokehN = mobile ? 24 : 44;
    const bp = new Float32Array(bokehN * 3);
    const bc = new Float32Array(bokehN * 3);
    const palette = [
      [0.55, 0.3, 1.0],
      [0.25, 0.4, 1.0],
      [0.85, 0.3, 0.95],
      [0.2, 0.7, 1.0],
    ];
    for (let i = 0; i < bokehN; i++) {
      bp.set([(rand() - 0.5) * 44, (rand() - 0.5) * 24, -4 - rand() * 12], i * 3);
      bc.set(palette[(rand() * palette.length) | 0], i * 3);
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.BufferAttribute(bp, 3));
    bg.setAttribute('color', new THREE.BufferAttribute(bc, 3));
    this.bokehMat = new THREE.PointsMaterial({
      map: dot,
      size: 1.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.group.add(new THREE.Points(bg, this.bokehMat));

    const starN = mobile ? 300 : 800;
    const sp = new Float32Array(starN * 3);
    for (let i = 0; i < starN; i++) {
      sp.set([(rand() - 0.5) * 60, (rand() - 0.5) * 34, -6 - rand() * 18], i * 3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.starMat = new THREE.PointsMaterial({
      color: 0xa9bcff,
      size: 0.07,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.group.add(new THREE.Points(sg, this.starMat));
  }

  setScale(s, widthPx, heightPx) {
    this.shared.uScale.value = s;
    this.shared.uRes.value.set(widthPx, heightPx);
  }

  setAspect(a) {
    this.shared.uAspect.value = a;
  }

  setPointer(x, y, inside) {
    this.pointer.set(x, y);
    this.pointerInside = inside;
  }

  update(t, dt, d) {
    const vis = 1 - range(d.scatter, 0, 0.5);
    this.vis = vis;
    this.group.visible = vis > 0.003;

    const u = this.shared;
    u.uTime.value = t;
    u.uVis.value = vis;
    u.uHover.value += ((this.pointerInside ? 1 : 0) - u.uHover.value) * (1 - Math.exp(-dt * 6));
    const km = 1 - Math.exp(-dt * 16);
    u.uMouse.value.x += (this.pointer.x - u.uMouse.value.x) * km;
    u.uMouse.value.y += (this.pointer.y - u.uMouse.value.y) * km;

    // the globe keeps spinning (scrolling spins it a little faster)
    this.towerRot = t * SPIN_SPEED + d.hero * 0.5;
    this.spinGroup.rotation.y = this.towerRot;

    if (!this.group.visible) return;

    this.ring.rotation.y = t * 0.05;
    this.ringMat.opacity = 0.22 * vis;
    this.bokehMat.opacity = 0.2 * vis;
    this.starMat.opacity = 0.55 * vis;
  }

  dispose() {
    /* geometries and materials are released with the scene */
  }
}