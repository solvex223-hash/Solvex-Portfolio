import './hero.css';
import { content } from '../../data/content';

export function mountHero(parent: HTMLElement = document.body): HTMLElement {
  const h = content.hero;
  const section = document.createElement('section');
  section.className = 'hero';
  section.id = 'hero';

  const lines = h.headline
    .map((l) => `<span class="hero__line"><span class="hero__line-inner">${l}</span></span>`)
    .join('');

  section.innerHTML = `
    <div class="hero__inner">
      <p class="label hero__eyebrow">${h.eyebrow}</p>
      <h1 class="hero__title" aria-label="${h.headline.join(' ')}">${lines}</h1>
      <p class="hero__intro">${h.intro}</p>
      <p class="hero__statement">${h.statement.join('<br />')}</p>
      <div class="hero__ctas">
        <a class="btn btn--primary" href="${h.primary.href}">
          ${h.primary.label}
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </a>
        <a class="btn btn--ghost" href="${h.secondary.href}">${h.secondary.label}</a>
      </div>
    </div>
  `;

  parent.appendChild(section);
  return section;
}