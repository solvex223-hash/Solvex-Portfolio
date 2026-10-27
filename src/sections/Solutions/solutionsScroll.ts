/**
 * Scroll choreography for the Solutions section.
 *
 * Normal browser scrolling: nothing is intercepted. This module only READS the scroll position
 * (called from the single scroll listener in scrollAnimation.ts) and
 *   1. fades / moves the text panels, and
 *   2. returns the stages that drive the 3D system (connect, service, settle).
 *
 * Timeline over the sticky stage progress p (0..1):
 *   0   - 0.20  opening: heading (0-0.10), introduction (0.10-0.20 of the opening)
 *   0.20 - 0.90  ten services, each with its own slice of scroll
 *   0.90 - 1.00  closing: the last text leaves, the connected system settles
 */
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const range = (v: number, a: number, b: number) => smooth(clamp((v - a) / (b - a)));

const SERVICES_START = 0.2;
const SERVICES_END = 0.9;

export function createSolutionsScroll(section: HTMLElement, reduced = false) {
  const q = <T extends HTMLElement>(sel: string) => section.querySelector<T>(sel)!;
  const intro = q<HTMLElement>('.solutions__intro');
  const introParts = ['label', 'title', 'p1', 'p2'].map((k) => q<HTMLElement>(`[data-s="${k}"]`));
  const services = Array.from(section.querySelectorAll<HTMLElement>('.service'));
  const ticks = Array.from(section.querySelectorAll<HTMLElement>('.solutions__tick'));
  const rail = q<HTMLElement>('.solutions__rail');
  const glow = document.querySelector<HTMLElement>('.solutions-glow');
  const n = services.length;

  let top = 0;
  let height = 1;
  let vh = 1;
  let activeTick = -1;

  const show = (el: HTMLElement, op: number, dy: number) => {
    el.style.opacity = op.toFixed(3);
    el.style.transform = reduced ? '' : `translate3d(0, ${dy.toFixed(1)}px, 0)`;
  };
  const vis = (el: HTMLElement, on: boolean) => {
    el.style.visibility = on ? 'visible' : 'hidden';
  };

  return {
    measure() {
      top = section.getBoundingClientRect().top + window.scrollY;
      height = section.offsetHeight;
      vh = window.innerHeight;
    },

    update(y: number) {
      const c = (y - (top - vh)) / vh; // viewports scrolled since the section started entering
      const p = clamp((y - top) / Math.max(1, height - vh)); // progress through the sticky stage

      // ---------- opening: heading, then the introduction ----------
      const gone = 1 - range(p, 0.15, 0.2);
      const reveals = [range(c, 0.55, 1.0), range(c, 0.62, 1.05), range(p, 0.03, 0.09), range(p, 0.08, 0.14)];
      introParts.forEach((el, i) => show(el, reveals[i] * gone, (1 - reveals[i]) * 30 - (1 - gone) * 20));
      vis(intro, c > 0.5 && gone > 0.01);

      // ---------- the ten services ----------
      const s = clamp((p - SERVICES_START) / (SERVICES_END - SERVICES_START)) * n;
      services.forEach((el, k) => {
        const inn = range(s, k, k + 0.2);
        const out = k < n - 1 ? 1 - range(s, k + 0.78, k + 1) : 1 - range(p, 0.93, 0.97);
        const op = inn * out;
        show(el, op, (1 - inn) * 28 - (1 - out) * 28);
        vis(el, op > 0.01);
      });

      // continuous scroll position: it evolves and pans the particle field (no stepped formations)
      const k = Math.min(Math.floor(s), n - 1);
      const service = s; // continuous: scrolling evolves and pans the field

      // progress rail
      const idx = p > SERVICES_START && p < 0.95 ? k : -1;
      if (idx !== activeTick) {
        ticks.forEach((t, i) => t.classList.toggle('is-active', i === idx));
        activeTick = idx;
      }
      rail.style.opacity = (range(p, 0.18, 0.24) * (1 - range(p, 0.93, 0.97))).toFixed(3);

      // ---------- stages for the 3D system ----------
      const connect = range(c, 0.1, 1.15);
      const settle = range(p, 0.82, 0.98);
      if (glow) glow.style.opacity = (connect * 0.9).toFixed(3);

      return { connect, service, settle };
    },
  };
}
