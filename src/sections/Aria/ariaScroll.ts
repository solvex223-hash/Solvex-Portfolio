const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const range = (v: number, a: number, b: number) => smooth(clamp((v - a) / (b - a)));

/**
 * Scroll choreography for ARIA (reads the scroll position only; normal scrolling is never intercepted).
 *
 *  entering (c)   the previous project recedes; the label appears; the particles morph into the core
 *  p 0.02-0.14    the name ARIA enters
 *  p 0.20-0.34    ARIA recedes to a watermark, "MEET ARIA." becomes the anchor
 *  p 0.28-0.48    supporting headline, then the description
 *  p 0.48-0.58    hold: the concept is understood
 *  p 0.58-0.78    the text lifts and shrinks, the demo interface rises in
 *  p 0.95-1.00    gentle release towards the next project
 *
 * Returns the particle stages while ARIA is on screen: the core is formed (service) and the backdrop is
 * brought forward then held back (calm) so the text always stays readable.
 */
export function createAriaScroll(section: HTMLElement, previous: () => HTMLElement | null, reduced = false) {
  const q = <T extends HTMLElement>(s: string) => section.querySelector<T>(s)!;
  const stage = q<HTMLElement>('.aria__stage');
  const top = q<HTMLElement>('[data-a="label"]');
  const mark = q<HTMLElement>('[data-a="mark"]');
  const markLine = q<HTMLElement>('[data-a="mark"] .line-inner');
  const copy = q<HTMLElement>('[data-a="copy"]');
  const titleEl = q<HTMLElement>('.aria__title');
  const titleLine = q<HTMLElement>('.aria__title .line-inner');
  const sub = q<HTMLElement>('[data-a="sub"]');
  const desc = q<HTMLElement>('[data-a="desc"]');
  const panel = q<HTMLElement>('[data-a="panel"]');
  const glow = document.querySelector<HTMLElement>('.solutions-glow');

  let secTop = 0;
  let height = 1;
  let vh = 1;
  let shiftVh = 27;

  const t = (el: HTMLElement, v: string) => {
    el.style.transform = reduced ? '' : v;
  };

  return {
    measure() {
      secTop = section.getBoundingClientRect().top + window.scrollY;
      height = section.offsetHeight;
      vh = window.innerHeight;
      shiftVh = window.matchMedia('(max-aspect-ratio: 1/1)').matches ? 22 : 27;
    },

    update(y: number): { calm?: number; service?: number } {
      const c = (y - (secTop - vh)) / vh; // viewports scrolled since ARIA began to enter
      const p = clamp((y - secTop) / Math.max(1, height - vh));
      const end = range(p, 0.95, 1.0);

      // 1. the previous project recedes
      const prev = previous();
      if (prev) {
        const k = range(c, 0, 0.8);
        prev.style.opacity = (1 - k).toFixed(3);
        t(prev, `translate3d(0, ${(-k * 5).toFixed(2)}vh, 0) scale(${(1 - 0.06 * k).toFixed(4)})`);
      }

      // 2. label
      const lab = range(c, 0.55, 0.95);
      top.style.opacity = lab.toFixed(3);
      t(top, `translate3d(0, ${((1 - lab) * 14).toFixed(1)}px, 0)`);

      // 3. the name ARIA, then it recedes into a watermark
      const nm = range(p, 0.02, 0.14);
      const rec = range(p, 0.2, 0.34);
      markLine.style.transform = reduced ? '' : `translate3d(0, ${((1 - nm) * 112).toFixed(1)}%, 0)`;
      mark.style.opacity = (nm * (1 - 0.8 * rec)).toFixed(3);
      mark.style.letterSpacing = reduced ? '' : `${(-0.01 - 0.03 * nm).toFixed(4)}em`;
      t(mark, `translate3d(0, ${(-rec * 5).toFixed(2)}vh, 0) scale(${(1 - 0.22 * rec).toFixed(4)})`);

      // 4. "MEET ARIA." becomes the anchor
      const ti = range(p, 0.2, 0.32);
      titleLine.style.transform = reduced ? '' : `translate3d(0, ${((1 - ti) * 112).toFixed(1)}%, 0)`;
      titleEl.style.opacity = (reduced ? ti : Math.min(1, ti * 3)).toFixed(3);
      if (!reduced) titleEl.style.letterSpacing = `${(-0.012 - 0.03 * ti).toFixed(4)}em`;

      // 5. supporting headline, then the description (which leaves before the demo arrives)
      const sb = range(p, 0.28, 0.4);
      sub.style.opacity = sb.toFixed(3);
      t(sub, `translate3d(0, ${((1 - sb) * 18).toFixed(1)}px, 0)`);
      const ds = range(p, 0.36, 0.48) * (1 - range(p, 0.56, 0.64));
      desc.style.opacity = ds.toFixed(3);
      t(desc, `translate3d(0, ${((1 - range(p, 0.36, 0.48)) * 18).toFixed(1)}px, 0)`);

      // 6. the text lifts and shrinks; the demo interface rises in
      const up = range(p, 0.58, 0.74);
      t(copy, `translate3d(0, ${(-up * shiftVh).toFixed(2)}vh, 0) scale(${(1 - 0.38 * up).toFixed(4)})`);
      const pn = range(p, 0.62, 0.78);
      panel.style.opacity = pn.toFixed(3);
      t(panel, `translate3d(0, ${((1 - pn) * 9).toFixed(2)}vh, 0)`);
      panel.style.visibility = pn > 0.01 ? 'visible' : 'hidden';
      panel.style.pointerEvents = pn > 0.6 ? 'auto' : 'none';

      // 7. release towards the next project
      stage.style.opacity = (1 - 0.35 * end).toFixed(3);

      if (c <= 0) return {};

      // particle backdrop: the core forms behind the text (service 10 -> 11), vivid at first,
      // then held back while the text is being read
      const f = range(c, 0.8, 1.15);
      const calm = 1 - f * 0.8 + f * 0.32 * range(p, 0.24, 0.4);
      if (glow && c > 0.6) glow.style.opacity = (0.65 * f).toFixed(3);
      return { service: 10 + f, calm };
    },
  };
}
