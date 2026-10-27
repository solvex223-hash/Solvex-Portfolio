import gsap from 'gsap';
import type { LoaderElements } from '../components/Loader/Loader';
import { content } from '../data/content';

export function playIntro(els: LoaderElements, reduced = false): Promise<void> {
  return new Promise((resolve) => {
    const tl = gsap.timeline({ onComplete: resolve });
    const d = reduced ? 0.01 : 1;

    tl.fromTo(
      els.inners,
      { opacity: 0, yPercent: 35 },
      { opacity: 1, yPercent: 0, duration: 1.4 * d, ease: 'expo.out', stagger: 0.14 * d },
      0.35 * d
    )
      .fromTo(
        els.label,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.8 * d, ease: 'power3.out' },
        '-=0.6'
      )
      .fromTo(
        els.percent,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.8 * d, ease: 'power3.out' },
        '-=0.45'
      );
  });
}

interface ProgressOptions {
  percentEl: HTMLElement;
  getReal: () => number; // 0..1 from the real load tracker
  minDuration: number; // seconds
}

/**
 * Smoothly counts 0 -> 100, never faster than the real loading progress
 * and never faster than the minimum-duration curve.
 */
export function runProgress({ percentEl, getReal, minDuration }: ProgressOptions): Promise<void> {
  const ease = gsap.parseEase('power2.inOut');
  const start = performance.now();
  let shown = 0;
  let lastInt = -1;

  const render = (n: number) => {
    if (n === lastInt) return;
    lastInt = n;
    percentEl.textContent = n === 0 ? '0%' : `${String(n).padStart(2, '0')}%`;
  };

  return new Promise((resolve) => {
    const tick = () => {
      const t = Math.min((performance.now() - start) / (minDuration * 1000), 1);
      const target = Math.min(getReal(), ease(t)) * 100;
      const diff = target - shown;

      if (diff > 0) {
        // capped below 1 per frame so every integer is displayed in sequence
        const step = Math.min(Math.max(diff * 0.14, 0.05), 0.9);
        shown = Math.min(shown + step, target);
      }

      render(Math.floor(shown));

      if (shown >= 100) {
        gsap.ticker.remove(tick);
        render(100);
        resolve();
      }
    };
    gsap.ticker.add(tick);
  });
}

export function playOutro(
  els: LoaderElements,
  onReveal: () => void,
  reduced = false
): Promise<void> {
  return new Promise((resolve) => {
    const tl = gsap.timeline({ onComplete: resolve });

    if (reduced) {
      tl.to({}, { duration: 0.3 })
        .add(onReveal)
        .to(els.root, { opacity: 0, duration: 0.6, ease: 'power2.out' });
      return;
    }

    tl.to({}, { duration: content.loader.pauseAt100 }) // hold on 100%
      .to(els.label, { opacity: 0, y: -10, duration: 0.5, ease: 'power2.in' })
      .to(els.percent, { opacity: 0, y: -10, duration: 0.5, ease: 'power2.in' }, '<0.06')
      .addLabel('transition', '+=0.1')
      .to(
        els.title,
        { scale: 1.22, transformOrigin: '50% 50%', duration: 1.6, ease: 'expo.inOut' },
        'transition'
      )
      .to(
        els.inners,
        { yPercent: -110, duration: 1.1, ease: 'expo.in', stagger: 0.1 },
        'transition+=0.3'
      )
      .add(onReveal, 'transition+=0.75')
      .fromTo(
        els.root,
        { clipPath: 'inset(0% 0% 0% 0%)' },
        { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.2, ease: 'expo.inOut' },
        'transition+=0.75'
      );
  });
}