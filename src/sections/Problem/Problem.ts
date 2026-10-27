import './problem.css';
import { content } from '../../data/content';

export function mountProblem(parent: HTMLElement = document.body): HTMLElement {
  const p = content.problem;
  const section = document.createElement('section');
  section.className = 'problem';
  section.id = 'problem';

  section.innerHTML = `
    <div class="problem__inner">
      <p class="label" data-reveal>${p.label}</p>
      <h2 class="h-section problem__title" data-lines aria-label="${p.heading}">
        <span class="line"><span class="line-inner">${p.heading}</span></span>
      </h2>
      <p class="copy copy--lead" data-reveal>${p.lead}</p>
      <ul class="problem__list">
        ${p.symptoms
          .map(
            (s, i) =>
              `<li data-reveal><span class="problem__idx">${String(i + 1).padStart(2, '0')}</span>${s}</li>`
          )
          .join('')}
      </ul>
      <div class="problem__statement" data-reveal>
        <p class="copy copy--lead">${p.statement[0]}</p>
        <p class="copy copy--lead copy--strong">${p.statement[1]}</p>
      </div>
      <p class="problem__closing" data-reveal>${p.closing}</p>
    </div>
  `;

  parent.appendChild(section);
  return section;
}