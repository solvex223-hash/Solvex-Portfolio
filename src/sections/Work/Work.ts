import './work.css';
import { content } from '../../data/content';
import { projects } from '../../data/projects';
import { mountProject, type ScrollPart } from './ProjectShowcase';
import { createWorkScroll } from './workScroll';

/**
 * 06 — SELECTED WORK
 * Opening (heading + one line of copy) followed by one presentation per project.
 *
 * Integration points:
 *   - Philosophy (05) is not part of this codebase yet: mount it before `mountWork()` in bootstrap.ts.
 *   - Further projects: add entries to data/projects.ts; each gets its own staging via `layout`.
 */
export function mountWork(parent: HTMLElement = document.body, reduced = false) {
  const w = content.work;
  const section = document.createElement('section');
  section.className = 'work';
  section.id = 'work';

  section.innerHTML = `
    <div class="work__opening">
      <div class="work__stage">
        <p class="label" data-w="label">${w.label}</p>
        <h2 class="work__title" aria-label="${w.heading.join(' ')}">
          ${w.heading.map((l) => `<span class="line" aria-hidden="true"><span class="line-inner">${l}</span></span>`).join('')}
        </h2>
        <p class="copy copy--lead work__lead" data-w="lead">${w.lead}</p>
      </div>
    </div>
  `;
  parent.appendChild(section);

  const parts: ScrollPart[] = projects.map((p) => mountProject(section, p, reduced).scroll);
  return { section, scroll: createWorkScroll(section, parts, reduced) };
}
