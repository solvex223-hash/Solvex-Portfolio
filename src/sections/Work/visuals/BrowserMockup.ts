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

export interface BrowserVisual {
  el: HTMLElement;
  /** the scrolling page inside the window, and its viewport */
  page: HTMLElement;
  viewport: HTMLElement;
}

export function createBrowserMockup(name: string, screenshots: string[]): BrowserVisual {
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

  return { el, page, viewport };
}
