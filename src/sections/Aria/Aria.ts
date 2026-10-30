import './aria.css';
import { content } from '../../data/content';
import { mountDemo } from './AriaDemo';
import { createAriaScroll } from './ariaScroll';

/**
 * 08 — ARIA (internal product / demo)
 * A product reveal: label -> name -> "MEET ARIA." -> description -> a clearly labelled scripted demo.
 * The particle backdrop assembles an intelligence-core shape behind it (see three/Shapes/shapes.js).
 */
export function mountAria(parent: HTMLElement = document.body, reduced = false) {
  const a = content.aria;
  const d = a.demo;
  const section = document.createElement('section');
  section.className = 'aria';
  section.id = 'aria';
  section.setAttribute('aria-labelledby', 'aria-title');

  section.innerHTML = `
    <div class="aria__stage">
      <div class="aria__top" data-a="label">
        <p class="label aria__label">${a.label}</p>
        <p class="label aria__cat">${a.category}</p>
      </div>

      <div class="aria__mark" data-a="mark" aria-hidden="true">
        <span class="line"><span class="line-inner">${a.name}</span></span>
      </div>

      <div class="aria__copy" data-a="copy">
        <h2 class="aria__title" id="aria-title" aria-label="${a.headline}">
          <span class="line" aria-hidden="true"><span class="line-inner">${a.headline}</span></span>
        </h2>
        <p class="aria__sub" data-a="sub">${a.subheadline}</p>
        <p class="copy copy--lead aria__desc" data-a="desc">${a.description}</p>
      </div>

      <div class="aria__panel" data-a="panel" role="region" aria-label="ARIA illustrative demo">
        <div class="aria__bar">
          <span class="aria__dot" aria-hidden="true"></span>
          <span class="label aria__name">${d.title}</span>
          <span class="aria__status">${d.chip}</span>
        </div>
        <div class="aria__log" role="log" aria-live="polite"></div>
        <div class="aria__chips">
          ${d.suggestions.map((s) => `<button type="button" class="aria__chip">${s}</button>`).join('')}
        </div>
        <form class="aria__form" autocomplete="off">
          <input class="aria__input" type="text" maxlength="120" placeholder="${d.placeholder}" aria-label="${d.placeholder}" />
          <button class="aria__send" type="submit">${d.send}</button>
        </form>
        <p class="label aria__note">${d.note}</p>
      </div>
    </div>
  `;
  parent.appendChild(section);
  mountDemo(section.querySelector<HTMLElement>('.aria__panel')!, reduced);

  // the previous project's stage recedes as ARIA arrives
  const previous = () => document.querySelector<HTMLElement>('.work .project:last-of-type .project__stage');
  return { section, scroll: createAriaScroll(section, previous, reduced) };
}
