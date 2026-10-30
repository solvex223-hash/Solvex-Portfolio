import { content } from '../../data/content';

type Demo = (typeof content)['whatsapp']['demo'];

/**
 * Wires the WhatsApp Automation demo interface. Everything is scripted and runs in the browser:
 * no network, no API key, no live WhatsApp connection.
 * Every answer is labelled as illustrative so the demo can never be mistaken for a live integration.
 */
export function mountWhatsAppDemo(root: HTMLElement, reduced: boolean) {
  const demo = content.whatsapp.demo;
  const log = root.querySelector<HTMLElement>('.whatsapp__log')!;
  const form = root.querySelector<HTMLFormElement>('.whatsapp__form')!;
  const input = root.querySelector<HTMLInputElement>('.whatsapp__input')!;
  const chips = Array.from(root.querySelectorAll<HTMLButtonElement>('.whatsapp__chip'));
  const panels = Array.from(root.querySelectorAll<HTMLElement>('.whatsapp__lead-panel'));
  const workflowSteps = Array.from(root.querySelectorAll<HTMLElement>('.whatsapp__workflow-step'));
  const MAX_MESSAGES = 6;

  let busy = false;
  let timer = 0;
  let currentStage = 0;

  const trim = () => {
    while (log.children.length > MAX_MESSAGES) log.firstElementChild?.remove();
  };

  const addCustomer = (text: string) => {
    const el = document.createElement('div');
    el.className = 'whatsapp__msg whatsapp__msg--customer';
    el.textContent = text;
    log.appendChild(el);
    trim();
  };

  const addBusiness = (text: string): HTMLElement => {
    const el = document.createElement('div');
    el.className = 'whatsapp__msg whatsapp__msg--business';
    el.innerHTML = '<p></p><span class="label whatsapp__tag"></span>';
    el.querySelector<HTMLElement>('.whatsapp__tag')!.textContent = demo.tag;
    log.appendChild(el);
    trim();
    return el;
  };

  const reply = (question: string) => {
    if (busy) return;
    busy = true;
    addCustomer(question);
    const text = answerFor(demo, question);
    const el = addBusiness();
    const p = el.querySelector<HTMLParagraphElement>('p')!;
    el.classList.add('is-typing');

    if (reduced) {
      p.textContent = text;
      el.classList.remove('is-typing');
      busy = false;
      advanceStage();
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
        else {
          busy = false;
          advanceStage();
        }
      };
      tick();
    }, 650);
  };

  const advanceStage = () => {
    if (currentStage < panels.length) {
      panels[currentStage].classList.add('is-visible');
      if (workflowSteps[currentStage]) {
        workflowSteps[currentStage].classList.add('is-active');
      }
      currentStage++;
    }
  };

  // opening message (scripted, labelled)
  const first = addBusiness();
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

/** scripted answer for a question: first matching rule wins, otherwise the honest fallback */
function answerFor(demo: Demo, question: string): string {
  const q = ` ${question.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
  const hit = (m: string) => {
    const n = m.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
    return q.includes(n.length <= 3 ? ` ${n} ` : ` ${n}`);
  };
  for (const r of demo.replies) {
    if (r.match.some(hit)) return r.text;
  }
  return demo.fallback;
}