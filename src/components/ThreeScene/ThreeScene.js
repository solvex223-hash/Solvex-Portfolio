import * as THREE from 'three';
import gsap from 'gsap';

import { Globe } from '../../three/Globe/Globe.js';
import { GlobeTags } from '../../three/Globe/GlobeTags.js';
import { SystemParticles } from '../../three/Particles/SystemParticles.js';
import { TeamPhoto } from '../../three/Hologram/TeamPhoto.js';
import { ShapeBank } from '../../three/Shapes/ShapeBank.js';
import { ServicePhotos } from '../../three/Shapes/ServicePhotos.js';
import { loadTeamPhoto } from '../../three/Hologram/sampleImage.js';
import { CameraRig, ABOUT_DISTANCE } from '../../three/Camera/CameraRig.js';
import { getQuality } from '../../three/quality.js';
import { clamp, range, seeded, disposeTree } from '../../three/math.js';
import { content } from '../../data/content';

const TEAM_IMAGE = '/images/team.jpg';

// used only if the team photo is missing: three soft head-and-shoulder silhouettes
function fallbackHologram(count) {
  const R = seeded(3);
  const positions = new Float32Array(count * 3);
  const tones = new Float32Array(count);
  const colors = new Float32Array(count * 3).fill(0.85);
  const gauss = () => (R() + R() + R() + R() - 2) / 2;
  for (let i = 0; i < count; i++) {
    const person = i % 3;
    const cx = (person - 1) * 0.42;
    const head = R() < 0.4;
    const x = cx + gauss() * (head ? 0.07 : 0.16);
    const y = head ? 0.22 + gauss() * 0.09 : -0.1 + gauss() * 0.18;
    positions.set([x, y, (R() - 0.5) * 0.04], i * 3);
    tones[i] = 0.4 + R() * 0.5;
  }
  return { positions, tones, colors, aspect: 1.27, photo: null };
}

export async function createThreeScene(mount, { reduced = false } = {}) {
  const q = getQuality();

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: q.antialias,
      alpha: true,
      powerPreference: 'high-performance',
    });
  } catch (err) {
    console.warn('[scene] WebGL unavailable', err);
    return null;
  }

  let dpr = Math.min(window.devicePixelRatio || 1, q.maxDpr);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);

  const canvas = renderer.domElement;
  canvas.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;';
  mount.appendChild(canvas);

  // ---------- scene ----------
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 160);
  const rig = new CameraRig(camera, { reduced });

  const count = q.particles;
  const head = new Globe(count, { mobile: q.mobile });
  const tags = new GlobeTags(content.heroServices);

  let holo;
  try {
    holo = await loadTeamPhoto(TEAM_IMAGE, count);
  } catch (err) {
    console.warn('[scene] team photo not found at', TEAM_IMAGE, '- using placeholder silhouettes', err);
    holo = fallbackHologram(count);
  }

  const shapes = new ShapeBank(count);
  shapes.start().catch((err) => console.warn('[shapes]', err)); // photos -> particle targets, one per idle slice

  const particles = new SystemParticles(count, {
    tower: head.points,
    holo: holo.positions,
    tones: holo.tones,
    colors: holo.colors,
    headColors: head.colors,
    headTones: head.tones,
    shared: head.shared,
    shapes,
  });
  const photo = holo.photo ? new TeamPhoto(holo.photo, holo.aspect) : null;

  scene.add(head.group, particles.points);
  if (photo) scene.add(photo.mesh);
  const svcPhotos = new ServicePhotos(shapes); // the real service photos that cover the formed particles
  scene.add(svcPhotos.group);

  // ---------- sizing ----------
  let holoScale = 6;

  function layout() {
    const s = canvas.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    particles.setScale(s);
    head.setScale(s, canvas.width, canvas.height);
    head.setAspect(camera.aspect);

    // size the team picture from the viewport at the About-camera distance
    const visH = 2 * ABOUT_DISTANCE * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const visW = visH * camera.aspect;
    holoScale =
      camera.aspect >= 1.0
        ? Math.min(0.66 * visH, (0.43 * visW) / holo.aspect)
        : Math.min(0.42 * visH, (0.94 * visW) / holo.aspect);
    particles.setHoloScale(holoScale);
  }

  function resize() {
    const w = Math.max(1, mount.clientWidth);
    const h = Math.max(1, mount.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    rig.resize(w, h);
    layout();
  }
  resize();

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(mount);

  // ---------- pointer (cursor glow) ----------
  const ndc = new THREE.Vector2(9, 9);

  const onMove = (e) => {
    ndc.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    rig.setPointer(ndc.x, ndc.y);
    head.setPointer(ndc.x, ndc.y, true);
  };
  const onLeave = () => head.setPointer(9, 9, false);
  window.addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);

  // ---------- state ----------
  const target = { hero: 0, scatter: 0, form: 0, dissolve: 0, connect: 0, service: 0, settle: 0 };
  const cur = { hero: 0, scatter: 0, form: 0, dissolve: 0, connect: 0, service: 0, settle: 0 };
  const state = { intro: 0, time: 0 };

  function step(dt) {
    state.time += dt * (reduced ? 0.25 : 1);

    // inertia: the scene eases toward wherever the scroll is
    const k = (rate) => 1 - Math.exp(-dt * rate * (reduced ? 3 : 1));
    cur.hero += (target.hero - cur.hero) * k(3);
    cur.scatter += (target.scatter - cur.scatter) * k(2.4);
    cur.form += (target.form - cur.form) * k(2);
    cur.dissolve += (target.dissolve - cur.dissolve) * k(2.2);
    cur.connect += (target.connect - cur.connect) * k(2.2);
    cur.service += (target.service - cur.service) * k(3.4);
    cur.settle += (target.settle - cur.settle) * k(1.8);

    head.update(state.time, dt, cur);

    // the real photograph takes over once the particles have formed it
    const photoOn = range(cur.form, 0.78, 1.0) * (1 - range(cur.dissolve, 0, 0.35));
    particles.update(state.time, cur, head.towerRot, photoOn, head.tilt);
    photo?.update(photoOn, holoScale);
    particles.setServicePhoto(svcPhotos.update(cur.service, range(cur.connect, 0.85, 1.0), state.time));

    rig.update(cur, dt, state.intro);

    // the services orbit inside the globe at half its speed
    tags.update(
      camera,
      mount.clientWidth,
      mount.clientHeight,
      head.towerRot * 0.5,
      head.tilt,
      head.vis,
      state.intro
    );

    canvas.style.opacity = state.intro.toFixed(3);
  }

  // ---------- render loop (paused while the tab is hidden) ----------
  const clock = new THREE.Clock();
  let raf = 0;
  let tabVisible = !document.hidden;
  let running = false;
  let slow = 0;
  let frames = 0;

  function frame() {
    raf = 0;
    if (!tabVisible || !running) return;

    const dt = Math.min(clock.getDelta(), 0.05);
    step(dt);
    renderer.render(scene, camera);

    // adaptive quality: lower the pixel ratio if the device struggles
    frames++;
    if (frames > 90) {
      slow = dt > 1 / 32 ? slow + 1 : Math.max(0, slow - 1);
      if (slow > 45 && dpr > 1) {
        dpr = Math.max(1, dpr - 0.25);
        renderer.setPixelRatio(dpr);
        layout();
        slow = 0;
      }
    }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    running = true;
    if (!raf && tabVisible) {
      clock.getDelta();
      raf = requestAnimationFrame(frame);
    }
  }

  const onVisibility = () => {
    tabVisible = !document.hidden;
    if (tabVisible && running) start();
  };
  document.addEventListener('visibilitychange', onVisibility);

  // ---------- compile shaders now (during the loader), render later ----------
  step(0);
  try {
    await renderer.compileAsync(scene, camera);
  } catch {
    renderer.compile(scene, camera);
  }
  renderer.render(scene, camera);

  return {
    setStages(s) {
      if (s.hero !== undefined) target.hero = clamp(s.hero, 0, 1);
      if (s.scatter !== undefined) target.scatter = clamp(s.scatter, 0, 1);
      if (s.form !== undefined) target.form = clamp(s.form, 0, 1);
      if (s.dissolve !== undefined) target.dissolve = clamp(s.dissolve, 0, 1);
      if (s.connect !== undefined) target.connect = clamp(s.connect, 0, 1);
      if (s.service !== undefined) target.service = clamp(s.service, 0, 10);
      if (s.settle !== undefined) target.settle = clamp(s.settle, 0, 1);
    },
    setPalette(p) {
      particles.setPalette(p);
    },
    reveal() {
      start();
      gsap.to(state, { intro: 1, duration: reduced ? 0.8 : 3, ease: 'expo.out' });
    },
    dispose() {
      running = false;
      cancelAnimationFrame(raf);
      raf = 0;
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      gsap.killTweensOf(state);
      head.dispose();
      shapes.dispose();
      svcPhotos.dispose();
      tags.dispose();
      photo?.texture.dispose();
      disposeTree(scene);
      renderer.dispose();
      canvas.remove();
    },
  };
}