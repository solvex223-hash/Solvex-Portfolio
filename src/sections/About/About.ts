import './about.css';
import { content } from '../../data/content';

export function mountAbout(parent: HTMLElement = document.body): HTMLElement {
  const a = content.about;
  const section = document.createElement('section');
  section.className = 'about';
  section.id = 'about';

  section.innerHTML = `
    <div class="about__inner">
      <p class="label" data-reveal>${a.label}</p>
      <h2 class="h-section" data-lines aria-label="${a.heading}">
        <span class="line"><span class="line-inner">${a.heading}</span></span>
      </h2>
      <div class="about__copy">
        ${a.paragraphs.map((p, i) => `<p class="copy" data-reveal data-delay="${i * 0.08}">${p}</p>`).join('')}
      </div>
      <p class="about__closing" data-reveal>${a.closing.join('<br />')}</p>
    </div>
  `;

  parent.appendChild(section);
  return section;
}