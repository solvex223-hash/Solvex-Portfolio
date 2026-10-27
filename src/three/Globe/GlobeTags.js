import * as THREE from 'three';
import './globeTags.css';
import { latLon } from './geo.js';
import { GLOBE_RADIUS } from './Globe.js';

// small line icons (24x24)
const ICONS = {
  automation:
    '<circle cx="12" cy="12" r="2.2"/><circle cx="5" cy="6" r="1.6"/><circle cx="19" cy="6" r="1.6"/><circle cx="5" cy="18" r="1.6"/><circle cx="19" cy="18" r="1.6"/><path d="M10.4 10.6 6.2 7M13.6 10.6 17.8 7M10.4 13.4 6.2 17M13.6 13.4 17.8 17"/>',
  agents:
    '<circle cx="11" cy="8" r="3.2"/><path d="M4.5 19c.8-3.4 3.4-5.2 6.5-5.2s5.7 1.8 6.5 5.2"/><path d="M19 3.5v3M17.5 5h3"/>',
  whatsapp:
    '<path d="M5 6.5C5 5.7 5.7 5 6.5 5h11c.8 0 1.5.7 1.5 1.5v8c0 .8-.7 1.5-1.5 1.5H11l-4 3.5V16h-.5C5.7 16 5 15.3 5 14.5z"/><path d="M9 10.5h.01M12 10.5h.01M15 10.5h.01"/>',
  web: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M3.5 9h17M7 7h.01M9.5 7h.01"/>',
  crm: '<path d="M4 5h16l-6 7.5V19l-4-2v-4.5z"/>',
  marketing:
    '<circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 4.5 4.5M8 11.5l2-2 1.5 1.2L14 8.5"/>',
};

// Layouts around the globe. Heights are shuffled so neighbours never sit at the same height.
// Small globes (phones) get four chips spread further apart instead of six squeezed together.
const FULL = { lats: [56, 34, 11, -11, -34, -56], order: [0, 3, 1, 4, 2, 5], lonStep: 60, radius: 0.64, count: 6 };
const COMPACT = { lats: [52, 17, -17, -52], order: [0, 2, 1, 3], lonStep: 90, radius: 0.7, count: 4 };

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);

/**
 * The services, as glass chips that orbit inside the globe. They are real HTML (crisp text,
 * hover, focus), positioned every frame from their 3D spot. Chips on the far side fade back.
 */
export class GlobeTags {
  constructor(services) {
    this.layer = document.createElement('div');
    this.layer.className = 'globe-tags';
    this.layer.setAttribute('aria-label', 'SolveX services');
    document.body.appendChild(this.layer);

    this.items = services.slice(0, 6).map((s) => {
      const el = document.createElement('div');
      el.className = 'gtag';
      el.tabIndex = 0;
      el.innerHTML = `
        <span class="gtag__icon">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[s.icon] ?? ICONS.automation}</svg>
        </span>
        <span class="gtag__label">${s.label}</span>`;
      this.layer.appendChild(el);
      return { el, w: 200 };
    });

    this.v = new THREE.Vector3();
    this.c = new THREE.Vector3();
    this.q = new THREE.Vector3();
    this.cam = new THREE.Vector3();

    // chip widths are measured (not guessed) so they can be kept inside the screen
    this.dirty = true;
    this.onResize = () => (this.dirty = true);
    window.addEventListener('resize', this.onResize);
    document.fonts?.ready?.then(() => (this.dirty = true));
  }

  measure() {
    for (const it of this.items) it.w = it.el.offsetWidth || 200;
    this.dirty = false;
  }

  /** spin/tilt = the globe's rotation; vis = 0..1 visibility; intro = 0..1 fade-in */
  update(camera, w, h, spin, tilt, vis, intro) {
    const R = GLOBE_RADIUS;
    const on = vis * intro > 0.01;
    this.layer.style.visibility = on ? 'visible' : 'hidden';
    if (!on) return;
    if (this.dirty) this.measure();

    this.cam.copy(camera.position).normalize();

    // how big the globe is on screen, so the chips scale with it
    this.c.set(0, 0, 0).project(camera);
    this.q.set(1, 0, 0).applyQuaternion(camera.quaternion).multiplyScalar(R).project(camera);
    const rBody = Math.hypot(((this.q.x - this.c.x) * w) / 2, ((this.q.y - this.c.y) * h) / 2);
    const base = clamp(rBody / 300, 0.9, 1.15);
    const cfg = rBody < 210 ? COMPACT : FULL;

    this.items.forEach((it, i) => {
      const st = it.el.style;
      if (i >= cfg.count) {
        st.opacity = '0';
        st.pointerEvents = 'none';
        return;
      }

      this.v
        .copy(latLon(cfg.lats[cfg.order[i]], i * cfg.lonStep + 20, R * cfg.radius))
        .applyAxisAngle(Y_AXIS, spin)
        .applyAxisAngle(Z_AXIS, tilt);

      const facing = this.v.clone().normalize().dot(this.cam);
      const t = smooth(clamp((facing + 0.3) / 0.7, 0, 1)); // 0 = behind, 1 = facing us

      const p = this.v.clone().project(camera);
      const s = base * (0.78 + 0.22 * t);
      const half = (it.w * s) / 2 + 8;
      const x = clamp((p.x * 0.5 + 0.5) * w, half, w - half);
      const y = (-p.y * 0.5 + 0.5) * h;

      st.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) scale(${s.toFixed(3)})`;
      st.opacity = ((0.14 + 0.86 * t) * vis * intro).toFixed(3);
      st.zIndex = String(100 + Math.round(facing * 50));
      st.filter = t > 0.96 ? '' : `blur(${((1 - t) * 2.2).toFixed(1)}px)`;
      st.pointerEvents = t > 0.75 && vis > 0.5 ? 'auto' : 'none';
    });
  }

  dispose() {
    window.removeEventListener('resize', this.onResize);
    this.layer.remove();
  }
}