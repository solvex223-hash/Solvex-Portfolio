const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const range = (v: number, a: number, b: number) => smooth(clamp((v - a) / (b - a)));

/**
 * Scroll choreography for WhatsApp Automation (reads the scroll position only; normal scrolling is never intercepted).
 *
 *  entering (c)   the previous section recedes; the label appears; the particles morph
 *  p 0.02-0.14    the name WHATSAPP AUTOMATION enters
 *  p 0.20-0.34    name recedes, "EVERY CONVERSATION..." becomes the anchor
 *  p 0.28-0.48    supporting headline, then the description
 *  p 0.48-0.58    hold: the concept is understood
 *  p 0.58-0.78    the text lifts and shrinks, the workflow visual rises in
 *  p 0.62-0.90    stages appear sequentially: enquiry -> response -> lead -> follow-up -> complete
 *  p 0.95-1.00    gentle release towards the next section
 *
 * Returns the particle stages while WhatsApp is on screen.
 */
export function createWhatsAppScroll(section: HTMLElement, previous: () => HTMLElement | null, reduced = false) {
  const q = <T extends HTMLElement>(s: string) => section.querySelector<T>(s)!;
  const stage = q<HTMLElement>('.whatsapp__stage');
  const top = q<HTMLElement>('[data-w="label"]');
  const mark = q<HTMLElement>('[data-w="mark"]');
  const markLine = q<HTMLElement>('[data-w="mark"] .line-inner');
  const copy = q<HTMLElement>('[data-w="copy"]');
  const titleEl = q<HTMLElement>('.whatsapp__title');
  const titleLine = q<HTMLElement>('.whatsapp__title .line-inner');
  const sub = q<HTMLElement>('[data-w="sub"]');
  const desc = q<HTMLElement>('[data-w="desc"]');
  const visual = q<HTMLElement>('.whatsapp__visual');
  const glow = document.querySelector<HTMLElement>('.solutions-glow');

  const bubbles = Array.from(section.querySelectorAll<HTMLElement>('.whatsapp__stage-bubble'));
  const panels = Array.from(section.querySelectorAll<HTMLElement>('.whatsapp__stage-panel'));
  const complete = section.querySelector<HTMLElement>('.whatsapp__complete');
  const steps = Array.from(section.querySelectorAll<HTMLElement>('.whatsapp__step'));

  let secTop = 0;
  let height = 1;
  let vh = 1;
  let shiftVh = 27;

  const t = (el: HTMLElement, v: string) => {
    el.style.transform = reduced ? '' : v;
  };

  const showStage = (index: number, progress: number) => {
    if (progress > 0.5 && !bubbles[index].classList.contains('is-visible')) {
      bubbles[index].classList.add('is-visible');
      if (panels[index]) panels[index].classList.add('is-visible');
    }
    if (progress > 0.7 && steps[index] && !steps[index].classList.contains('is-active')) {
      steps[index].classList.add('is-active');
    }
  };

  return {
    measure() {
      secTop = section.getBoundingClientRect().top + window.scrollY;
      height = section.offsetHeight;
      vh = window.innerHeight;
      shiftVh = window.matchMedia('(max-aspect-ratio: 1/1)').matches ? 22 : 27;
    },

    update(y: number): { calm?: number; service?: number } {
      const c = (y - (secTop - vh)) / vh; // viewports scrolled since section began to enter
      const p = clamp((y - secTop) / Math.max(1, height - vh));
      const end = range(p, 0.95, 1.0);

      // 1. the previous section recedes
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

      // 3. the name WHATSAPP AUTOMATION, then it recedes into a watermark
      const nm = range(p, 0.02, 0.14);
      const rec = range(p, 0.2, 0.34);
      markLine.style.transform = reduced ? '' : `translate3d(0, ${((1 - nm) * 112).toFixed(1)}%, 0)`;
      mark.style.opacity = (nm * (1 - 0.8 * rec)).toFixed(3);
      mark.style.letterSpacing = reduced ? '' : `${(-0.01 - 0.03 * nm).toFixed(4)}em`;
      t(mark, `translate3d(0, ${(-rec * 5).toFixed(2)}vh, 0) scale(${(1 - 0.22 * rec).toFixed(4)})`);

      // 4. "EVERY CONVERSATION..." becomes the anchor
      const ti = range(p, 0.2, 0.32);
      titleLine.style.transform = reduced ? '' : `translate3d(0, ${((1 - ti) * 112).toFixed(1)}%, 0)`;
      titleEl.style.opacity = (reduced ? ti : Math.min(1, ti * 3)).toFixed(3);
      if (!reduced) titleEl.style.letterSpacing = `${(-0.012 - 0.03 * ti).toFixed(4)}em`;

      // 5. supporting headline, then the description
      const sb = range(p, 0.28, 0.4);
      sub.style.opacity = sb.toFixed(3);
      t(sub, `translate3d(0, ${((1 - sb) * 18).toFixed(1)}px, 0)`);
      const ds = range(p, 0.36, 0.48) * (1 - range(p, 0.56, 0.64));
      desc.style.opacity = ds.toFixed(3);
      t(desc, `translate3d(0, ${((1 - range(p, 0.36, 0.48)) * 18).toFixed(1)}px, 0)`);

      // 6. the text lifts and shrinks; the workflow visual rises in
      const up = range(p, 0.58, 0.74);
      t(copy, `translate3d(0, ${(-up * shiftVh).toFixed(2)}vh, 0) scale(${(1 - 0.38 * up).toFixed(4)})`);
      const vn = range(p, 0.62, 0.78);
      visual.style.opacity = vn.toFixed(3);
      t(visual, `translate3d(0, ${((1 - vn) * 9).toFixed(2)}vh, 0)`);
      visual.style.visibility = vn > 0.01 ? 'visible' : 'hidden';
      visual.style.pointerEvents = vn > 0.6 ? 'auto' : 'none';

      // 7. stages appear sequentially
      const stageProgress = range(p, 0.62, 0.9);
      const stageCount = bubbles.length;
      bubbles.forEach((_, i) => {
        const stageStart = 0.62 + (i / stageCount) * 0.28;
        const stageEnd = stageStart + 0.28 / stageCount * 1.2;
        const sp = range(p, stageStart, stageEnd);
        showStage(i, sp);
      });

      // 8. complete workflow view
      const cp = range(p, 0.8, 0.95);
      if (complete) {
        complete.style.opacity = cp.toFixed(3);
        t(complete, `translate3d(0, ${((1 - cp) * 12).toFixed(2)}vh, 0)`);
      }

      // 9. release towards the next section
      stage.style.opacity = (1 - 0.35 * end).toFixed(3);

      if (c <= 0) return {};

      // particle backdrop: form a messaging/connected symbol
      const f = range(c, 0.8, 1.15);
      const calm = 1 - f * 0.8 + f * 0.32 * range(p, 0.24, 0.4);
      if (glow && c > 0.6) glow.style.opacity = (0.65 * f).toFixed(3);
      return { service: 10 + f, calm };
    },
  };
}