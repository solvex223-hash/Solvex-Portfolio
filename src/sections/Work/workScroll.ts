import type { ScrollPart } from './ProjectShowcase';

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const range = (v: number, a: number, b: number) => smooth(clamp((v - a) / (b - a)));

/**
 * Scroll choreography for Selected Work (reads the scroll position only, never intercepts it).
 *
 * Opening stage (progress p, 0..1):
 *   0   - entering   the heading rises through its mask, tracking tightens
 *   0.12 - 0.30      the supporting copy appears
 *   0.82 - 1.00      both lift away so the first project can arrive
 * Projects follow, each with its own sticky stage (see ProjectShowcase).
 *
 * Returns `calm`: the particle backdrop of the previous section recedes while this section is on screen.
 */
export function createWorkScroll(section: HTMLElement, projects: ScrollPart[], reduced = false) {
  const opening = section.querySelector<HTMLElement>('.work__opening')!;
  const label = opening.querySelector<HTMLElement>('[data-w="label"]')!;
  const title = opening.querySelector<HTMLElement>('.work__title')!;
  const lines = Array.from(opening.querySelectorAll<HTMLElement>('.line-inner'));
  const lead = opening.querySelector<HTMLElement>('[data-w="lead"]')!;
  const glow = document.querySelector<HTMLElement>('.solutions-glow');

  let top = 0;
  let height = 1;
  let vh = 1;

  return {
    measure() {
      top = opening.getBoundingClientRect().top + window.scrollY;
      height = opening.offsetHeight;
      vh = window.innerHeight;
      projects.forEach((p) => p.measure());
    },

    update(y: number) {
      const c = (y - (top - vh)) / vh; // viewports scrolled since the section began to enter
      const p = clamp((y - top) / Math.max(1, height - vh));
      const out = range(p, 0.82, 1.0);

      const lab = range(c, 0.5, 0.95) * (1 - out);
      label.style.opacity = lab.toFixed(3);
      label.style.transform = reduced ? '' : `translate3d(0, ${((1 - lab) * 14).toFixed(1)}px, 0)`;

      lines.forEach((l, i) => {
        const e = range(c, 0.42 + i * 0.07, 1.22 + i * 0.07);
        l.style.transform = reduced ? '' : `translate3d(0, ${((1 - e) * 112).toFixed(1)}%, 0)`;
      });
      const e0 = range(c, 0.42, 1.22);
      title.style.opacity = ((reduced ? 1 : Math.min(1, e0 * 3)) * (1 - out)).toFixed(3);
      if (!reduced) {
        title.style.letterSpacing = `${(-0.012 - 0.03 * e0).toFixed(4)}em`;
        title.style.transform = `translate3d(0, ${(-out * 9).toFixed(2)}vh, 0)`;
      }

      const l = range(p, 0.12, 0.3) * (1 - out);
      lead.style.opacity = l.toFixed(3);
      lead.style.transform = reduced ? '' : `translate3d(0, ${((1 - l) * 20 - out * 6 * 8).toFixed(1)}px, 0)`;

      projects.forEach((pr) => pr.update(y));

      // the previous section's particle backdrop recedes behind this section
      const calm = range(c, 0.1, 0.9);
      if (glow && calm > 0) glow.style.opacity = (0.9 * (1 - calm)).toFixed(3);
      return { calm };
    },
  };
}
