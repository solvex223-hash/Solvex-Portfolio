import './solutions.css';
import { content } from '../../data/content';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * 04 — WHAT WE BUILD
 * A tall section with one sticky stage. Scroll progress (read in solutionsScroll.ts)
 * decides which panel is visible and which formation the 3D system is showing.
 */
export function mountSolutions(parent: HTMLElement = document.body): HTMLElement {
  const s = content.solutions;
  const total = s.services.length;

  // restrained violet light that rises as the system comes together (sits behind the canvas)
  const glow = document.createElement('div');
  glow.className = 'solutions-glow';
  glow.setAttribute('aria-hidden', 'true');
  document.body.prepend(glow);

  const section = document.createElement('section');
  section.className = 'solutions';
  section.id = 'solutions';

  section.innerHTML = `
    <div class="solutions__stage">
      <div class="solutions__panel solutions__intro">
        <p class="label" data-s="label">${s.label}</p>
        <h2 class="h-section solutions__title" data-s="title">${s.heading}</h2>
        <div class="solutions__lead">
          <p class="copy copy--lead" data-s="p1">${s.intro[0]}</p>
          <p class="copy copy--lead copy--strong" data-s="p2">${s.intro[1]}</p>
        </div>
      </div>

      ${s.services
        .map(
          (sv, i) => `
        <article class="solutions__panel service" data-service="${i}">
          <p class="label service__index"><span class="service__no">${pad(i + 1)}</span> / ${pad(total)}</p>
          <h3 class="service__name">${sv.name}</h3>
          <p class="copy copy--lead service__desc">${sv.desc}</p>
        </article>`
        )
        .join('')}

      <div class="solutions__rail" aria-hidden="true">
        ${s.services.map(() => '<span class="solutions__tick"></span>').join('')}
      </div>
    </div>
  `;

  parent.appendChild(section);
  return section;
}
