import './loader.css';
import { content } from '../../data/content';

export interface LoaderElements {
  root: HTMLElement;
  title: HTMLElement;
  inners: HTMLElement[];
  label: HTMLElement;
  percent: HTMLElement;
}

export function createLoader(mount: HTMLElement = document.body): LoaderElements {
  const root = document.createElement('div');
  root.className = 'loader';
  root.setAttribute('role', 'status');
  root.setAttribute('aria-label', 'Loading SolveX Portfolio');

  const lines = content.brand.title
    .map(
      (word) =>
        `<span class="loader__line"><span class="loader__line-inner">${word}</span></span>`
    )
    .join('');

  root.innerHTML = `
    <div class="loader__grain"></div>
    <div class="loader__glow"></div>
    <div class="loader__inner">
      <h1 class="loader__title" aria-label="${content.brand.title.join(' ')}">${lines}</h1>
      <div class="loader__meta">
        <span class="loader__label">${content.loader.label}</span>
        <span class="loader__percent" aria-hidden="true">0%</span>
      </div>
    </div>
  `;

  mount.appendChild(root);

  return {
    root,
    title: root.querySelector<HTMLElement>('.loader__title')!,
    inners: Array.from(root.querySelectorAll<HTMLElement>('.loader__line-inner')),
    label: root.querySelector<HTMLElement>('.loader__label')!,
    percent: root.querySelector<HTMLElement>('.loader__percent')!,
  };
}