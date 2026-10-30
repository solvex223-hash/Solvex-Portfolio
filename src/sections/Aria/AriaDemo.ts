import { content } from '../../data/content';

type Demo = (typeof content)['aria']['demo'];

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** scripted answer for a question: first matching rule wins, otherwise the honest fallback */
export function answerFor(demo: Demo, question: string): string {
  const q = ` ${norm(question)} `;
  // keywords match from the start of a word ("launch" finds "launched"); very short ones must be whole words
  // so that "hi" is not found inside "this" or "which"
  const hit = (m: string) => {
    const n = norm(m);
    return q.includes(n.length <= 3 ? ` ${n} ` : ` ${n}`);
  };
  for (const r of demo.replies) {
    if (r.match.some(hit)) return r.text;
  }
  return demo.fallback;
}

/**
 * Wires the demo interface. Everything is scripted and runs in the browser: no network, no API key, no model.
 * Every answer is labelled as illustrative so the demo can never be mistaken for a live AI.
 */
export function mountDemo(root: HTMLElement, reduced: boolean) {
  const demo = content.aria.demo;
  const log = root.querySelector<HTMLElement>('.aria__log')!;
  const form = root.querySelector<HTMLFormElement>('.aria__form')!;
  const input = root.querySelector<HTMLInputElement>('.aria__input')!;
  const chips = Array.from(root.querySelectorAll<HTMLButtonElement>('.aria__chip'));
  const MAX_MESSAGES = 4; // keeps the log short so it never needs its own scrollbar (page scrolling stays free)

  let busy = false;
  let timer = 0;

  const trim = () => {
    while (log.children.length > MAX_MESSAGES) log.firstElementChild?.remove();
  };

  const addUser = (text: string) => {
    const el = document.createElement('div');
    el.className = 'aria__msg aria__msg--user';
    el.textContent = text;
    log.appendChild(el);
    trim();
  };

  const addAria = (): HTMLElement => {
    const el = document.createElement('div');
    el.className = 'aria__msg aria__msg--aria';
    el.innerHTML = '<p></p><span class="label aria__tag"></span>';
    el.querySelector<HTMLElement>('.aria__tag')!.textContent = demo.tag;
    log.appendChild(el);
    trim();
    return el;
  };

  const reply = (question: string) => {
    if (busy) return;
    busy = true;
    addUser(question);
    const text = answerFor(demo, question);
    const el = addAria();
    const p = el.querySelector<HTMLParagraphElement>('p')!;
    el.classList.add('is-typing');

    if (reduced) {
      p.textContent = text;
      el.classList.remove('is-typing');
      busy = false;
      return;
    }

    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      el.classList.remove('is-typing');
      let i = 0;
      const tick = () => {
        i = Math.min(text.length, i + 2);
        p.textContent = text.slice(0, i);
        if (i < text.length) timer = window.setTimeout(tick, 16);
        else busy = false;
      };
      tick();
    }, 650);
  };

  // opening message (scripted, labelled)
  const first = addAria();
  first.querySelector('p')!.textContent = demo.greeting;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    input.value = '';
    reply(q);
  });
  chips.forEach((c) => c.addEventListener('click', () => reply(c.textContent ?? '')));
}
