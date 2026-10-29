import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { SceneStages } from '../three/lazyScene';
import { createSolutionsScroll } from '../sections/Solutions/solutionsScroll';

interface WorkScroll {
  measure(): void;
  update(y: number): { calm: number };
}

gsap.registerPlugin(ScrollTrigger);

interface StageTarget {
  setStages(stages: SceneStages): void;
}

interface Sections {
  hero: HTMLElement;
  about: HTMLElement;
  problem: HTMLElement;
  solutions: HTMLElement;
  work?: WorkScroll; // 06 — Selected Work
}

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const range = (v: number, a: number, b: number) => smooth(clamp((v - a) / (b - a)));

/**
 * Normal browser scrolling. Scroll position is read, never intercepted.
 * It drives (1) the 3D world through "stages" and (2) one-shot text reveals.
 */
export function initScrollAnimation(sections: Sections, scene: StageTarget, reduced = false) {
  ScrollTrigger.config({ ignoreMobileResize: true });

  const { hero, about, problem, solutions, work } = sections;
  const sol = createSolutionsScroll(solutions, reduced); // drives its own text; shares this scroll listener
  let heroH = 1;
  let aboutTop = 0;
  let problemTop = 0;
  let vh = 1;

  const measure = () => {
    const y = window.scrollY;
    vh = window.innerHeight;
    heroH = hero.offsetHeight || vh;
    aboutTop = about.getBoundingClientRect().top + y;
    problemTop = problem.getBoundingClientRect().top + y;
    sol.measure();
    work?.measure();
  };

  const update = () => {
    const y = window.scrollY;
    const a = (y - (aboutTop - vh)) / vh; // viewports scrolled since About entered
    const b = (y - (problemTop - vh)) / vh; // viewports scrolled since Problem entered

    scene.setStages({
      hero: clamp(y / heroH),
      scatter: range(a, 0.12, 1.1), // architecture -> particles
      form: range(a, 0.7, 1.7), // particles -> team hologram
      dissolve: range(b, 0.05, 0.85), // hologram -> fragmented system
      ...sol.update(y), // fragments reconnect -> ten services -> settled system
      ...(work ? work.update(y) : {}), // the backdrop recedes behind Selected Work
    });
  };

  measure();
  update();
  window.addEventListener('scroll', update, { passive: true });
  ScrollTrigger.addEventListener('refresh', () => {
    measure();
    update();
  });

  // ---------- text reveals ----------
  const ctx = gsap.context(() => {
    gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
      if (reduced) return gsap.set(el, { opacity: 1, y: 0 });
      gsap.fromTo(
        el,
        { opacity: 0, y: 36 },
        {
          opacity: 1,
          y: 0,
          duration: 1.1,
          ease: 'power3.out',
          delay: Number(el.dataset.delay || 0),
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        }
      );
    });

    gsap.utils.toArray<HTMLElement>('[data-lines]').forEach((el) => {
      const inners = el.querySelectorAll('.line-inner');
      if (reduced) return gsap.set(inners, { yPercent: 0 });
      gsap.fromTo(
        inners,
        { yPercent: 110 },
        {
          yPercent: 0,
          duration: 1.3,
          ease: 'expo.out',
          stagger: 0.1,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        }
      );
    });
  });

  requestAnimationFrame(() => ScrollTrigger.refresh());

  return () => {
    window.removeEventListener('scroll', update);
    ctx.revert();
  };
}