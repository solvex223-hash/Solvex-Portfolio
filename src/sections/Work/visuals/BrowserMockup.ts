/**
 * Browser-window visual for website projects.
 *
 *  - If a real screenshot is available it is shown inside the window and slowly scrolls with the page.
 *  - Otherwise an abstract, text-free layout is shown with a "REPRESENTATIVE LAYOUT" tag, so it can never
 *    be mistaken for the delivered website. No invented copy, numbers or screenshots.
 */
const wire = `
  <div class="wf">
    <div class="wf__nav"><i class="wf__logo"></i><span class="wf__links"><b></b><b></b><b></b><b></b></span><i class="wf__cta"></i></div>
    <div class="wf__hero">
      <div class="wf__headline"><b></b><b></b><b class="short"></b></div>
      <div class="wf__sub"><b></b><b class="short"></b></div>
      <div class="wf__btns"><i class="solid"></i><i></i></div>
      <div class="wf__art"></div>
    </div>
    <div class="wf__cards">
      <div><i></i><b></b><b class="short"></b></div>
      <div><i></i><b></b><b class="short"></b></div>
      <div><i></i><b></b><b class="short"></b></div>
    </div>
    <div class="wf__band"><b></b><b class="short"></b><i></i></div>
    <div class="wf__cards">
      <div><i></i><b></b><b class="short"></b></div>
      <div><i></i><b></b><b class="short"></b></div>
      <div><i></i><b></b><b class="short"></b></div>
    </div>
    <div class="wf__foot"><b></b><b></b><b></b></div>
  </div>`;

function loadFirst(urls: string[]): Promise<string | null> {
  return urls.reduce<Promise<string | null>>(
    (chain, url) =>
      chain.then(
        (found) =>
          found ??
          new Promise<string | null>((resolve) => {
            const img = new Image();
            img.onload = () => resolve(url);
            img.onerror = () => resolve(null);
            img.src = url;
          })
      ),
    Promise.resolve(null)
  );
}

export interface LiveOptions {
  url: string;
  width: number;
  height: number;
}

/**
 * Shows the real website, scaled down to the window width, inside `page` (so the existing scroll logic slides it
 * like it does a screenshot). The iframe is created only when the card is about to be seen, ignores the pointer
 * (page scrolling is never captured). On phones/data-saver it falls back to screenshot/wireframe.
 * If the iframe cannot load (CSP, network error, blank), it gracefully falls back.
 */
function mountLive(el: HTMLElement, page: HTMLElement, viewport: HTMLElement, name: string, live: LiveOptions) {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  const isMobile = window.matchMedia('(max-width: 720px)').matches;
  const isDataSaver = nav.connection?.saveData;
  if (isMobile || isDataSaver) return; // skip live preview, keep wireframe/screenshot

  let started = false;
  const start = () => {
    if (started) return;
    started = true;

    const holder = document.createElement('div');
    holder.className = 'browser__live';
    const frame = document.createElement('iframe');
    frame.src = live.url;
    frame.title = `${name} website (live preview)`;
    frame.width = String(live.width);
    frame.height = String(live.height);
    frame.tabIndex = -1;
    frame.setAttribute('aria-hidden', 'true');
    // allow-scripts + allow-same-origin: needed for cross-origin iframe to render content
    // allow-top-navigation: lets site redirect if needed
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-top-navigation');
    frame.referrerPolicy = 'no-referrer';
    holder.appendChild(frame);

    const fit = () => {
      const s = viewport.clientWidth / live.width;
      frame.style.transform = `scale(${s})`;
      holder.style.height = `${live.height * s}px`;
      page.style.height = `${live.height * s}px`;
    };
    const ro = new ResizeObserver(() => {
      fit();
      el.dispatchEvent(new CustomEvent('visual:loaded', { bubbles: true }));
    });

    let revealed = false;
    let hasContent = false;

    const tryReveal = () => {
      if (revealed) return;
      // Only reveal if iframe actually has content (not blocked by CSP)
      if (!hasContent) {
        // Check if iframe is accessible and has content
        try {
          const doc = frame.contentDocument || frame.contentWindow?.document;
          hasContent = !!(doc && doc.body && (doc.body.innerHTML.trim() || doc.querySelector('body *')));
        } catch {
          hasContent = false; // cross-origin blocked = no content
        }
      }
      if (!hasContent) return; // wait for load event or timeout

      revealed = true;
      Array.from(page.children).forEach((c) => c !== holder && c.remove());
      el.classList.remove('is-representative');
      el.classList.add('is-live');
      holder.classList.remove('is-loading');
      fit();
      ro.observe(viewport);
      el.dispatchEvent(new CustomEvent('visual:loaded', { bubbles: true }));
    };

    frame.addEventListener('load', () => {
      console.log(`[BrowserMockup] iframe load event for ${name}`);
      // Small delay to let content render
      setTimeout(() => {
        hasContent = true;
        tryReveal();
      }, 100);
    });

    frame.addEventListener('error', (e) => {
      console.error(`[BrowserMockup] iframe error for ${name}:`, e);
      fallback();
    });

    // Fallback: if no content after timeout, remove iframe and keep wireframe/screenshot
    const fallback = () => {
      if (revealed) return;
      console.warn(`[BrowserMockup] Live preview fallback for ${name} (blocked/blank)`);
      holder.remove();
      el.dispatchEvent(new CustomEvent('visual:loaded', { bubbles: true }));
    };
    window.setTimeout(fallback, 10000);

    page.style.position = 'relative';
    holder.classList.add('is-loading');
    page.appendChild(holder);
    fit();
  };

  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        start();
      }
    },
    { rootMargin: '900px 0px' }
  );
  io.observe(el);
}

export interface BrowserVisual {
  el: HTMLElement;
  /** the scrolling page inside the window, and its viewport */
  page: HTMLElement;
  viewport: HTMLElement;
}

export function createBrowserMockup(name: string, screenshots: string[], live?: LiveOptions): BrowserVisual {
  const el = document.createElement('div');
  el.className = 'browser is-representative';
  el.innerHTML = `
    <div class="browser__bar" aria-hidden="true">
      <span class="browser__dots"><i></i><i></i><i></i></span>
      <span class="browser__url"></span>
    </div>
    <div class="browser__viewport">
      <div class="browser__page">${wire}</div>
    </div>
    <p class="label browser__tag">Representative layout</p>
    <span class="browser__sheen" aria-hidden="true"></span>
  `;
  const page = el.querySelector<HTMLElement>('.browser__page')!;
  const viewport = el.querySelector<HTMLElement>('.browser__viewport')!;

  void loadFirst(screenshots).then((url) => {
    if (!url) return; // keep the representative layout
    const img = new Image();
    img.src = url;
    img.alt = `${name} website`;
    img.decoding = 'async';
    page.replaceChildren(img);
    el.classList.remove('is-representative'); // real screenshot: hide the tag
    el.dispatchEvent(new CustomEvent('visual:loaded', { bubbles: true }));
  });

  if (live) mountLive(el, page, viewport, name, live);

  return { el, page, viewport };
}
