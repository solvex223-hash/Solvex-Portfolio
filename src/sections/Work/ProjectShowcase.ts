import type { Project } from '../../data/projects';
import { createBrowserMockup, type BrowserVisual } from './visuals/BrowserMockup';

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const range = (v: number, a: number, b: number) => smooth(clamp((v - a) / (b - a)));

export interface ScrollPart {
  measure(): void;
  update(y: number): void;
}

/**
 * Reusable project presentation. One markup, several layouts (`project--<layout>`): each project can be
 * staged differently while sharing the same data shape, typography and motion language.
 * Scroll never gets intercepted: `update(y)` only reads the scroll position.
 */
export function mountProject(parent: HTMLElement, project: Project, reduced: boolean): { el: HTMLElement; scroll: ScrollPart } {
  const el = document.createElement('article');
  el.className = `project project--${project.layout}`;
  el.id = project.id;

  el.innerHTML = `
    <div class="project__stage">
      <div class="project__meta">
        <span class="project__no label" data-p="meta">${project.number}</span>
        <span class="project__status" data-p="meta"><i aria-hidden="true"></i>${project.status}</span>
        <span class="project__cat label" data-p="meta">${project.category}</span>
      </div>

      <h3 class="project__title" aria-label="${project.name}">
        <span class="line" aria-hidden="true"><span class="line-inner">${project.name}</span></span>
      </h3>

      <div class="project__visual" data-p="visual"></div>

      <div class="project__info" data-p="info">
        <p class="copy copy--lead">${project.description}</p>
        ${project.tech?.length ? `<ul class="project__tech label">${project.tech.map((t) => `<li>${t}</li>`).join('')}</ul>` : ''}
      </div>
    </div>
  `;
  parent.appendChild(el);

  // ----- visual (more kinds are added with later projects) -----
  const holder = el.querySelector<HTMLElement>('.project__visual')!;
  const visual: BrowserVisual = createBrowserMockup(project.name, project.visual.screenshots, project.visual.live);
  holder.appendChild(visual.el);

  const q = <T extends HTMLElement>(s: string) => el.querySelector<T>(s)!;
  const metas = Array.from(el.querySelectorAll<HTMLElement>('[data-p="meta"]'));
  const title = q<HTMLElement>('.project__title');
  const titleLine = q<HTMLElement>('.project__title .line-inner');
  const info = q<HTMLElement>('.project__info');

  let top = 0;
  let height = 1;
  let vh = 1;
  let shiftMax = 0;

  const measureShift = () => {
    shiftMax = Math.max(0, visual.page.offsetHeight - visual.viewport.clientHeight);
  };
  visual.el.addEventListener('visual:loaded', () => {
    // wait one frame for layout, then re-measure the scrollable page height
    requestAnimationFrame(() => {
      measureShift();
      scroll.update(window.scrollY);
    });
  });

  const scroll: ScrollPart = {
    measure() {
      top = el.getBoundingClientRect().top + window.scrollY;
      height = el.offsetHeight;
      vh = window.innerHeight;
      measureShift();
    },

    update(y) {
      const c = (y - (top - vh)) / vh; // viewports scrolled since the project began to enter
      const p = clamp((y - top) / Math.max(1, height - vh)); // progress through the sticky stage

      // 1. status, number and category: readable first
      metas.forEach((n, i) => {
        const k = range(c, 0.55 + i * 0.05, 1.0 + i * 0.05);
        n.style.opacity = k.toFixed(3);
        n.style.transform = reduced ? '' : `translate3d(0, ${((1 - k) * 14).toFixed(1)}px, 0)`;
      });

      // 2. the title rises through its mask, tracking tightens: a confident entrance
      const e = range(c, 0.45, 1.2);
      titleLine.style.transform = reduced ? '' : `translate3d(0, ${((1 - e) * 112).toFixed(1)}%, 0)`;
      title.style.opacity = (reduced ? 1 : Math.min(1, e * 3)).toFixed(3);
      if (!reduced) title.style.letterSpacing = `${(-0.012 - 0.03 * e).toFixed(4)}em`;

      // 3. the visual moves into focus, then its page scrolls slowly inside the window
      const v = range(p, 0.08, 0.4);
      holder.style.opacity = v.toFixed(3);
      holder.style.transform = reduced
        ? ''
        : `perspective(1600px) translate3d(0, ${((1 - v) * 16).toFixed(2)}vh, 0) rotateX(${((1 - v) * 14).toFixed(2)}deg) rotateY(${(-4 * v).toFixed(2)}deg) scale(${(0.9 + 0.1 * v).toFixed(4)})`;
      const s = range(p, 0.4, 0.95);
      visual.page.style.transform = `translate3d(0, ${(-s * shiftMax).toFixed(1)}px, 0)`;

      // 4. the description arrives once title and status have been read
      const d = range(p, 0.3, 0.5);
      info.style.opacity = d.toFixed(3);
      info.style.transform = reduced ? '' : `translate3d(0, ${((1 - d) * 22).toFixed(1)}px, 0)`;

    },
  };

  return { el, scroll };
}
