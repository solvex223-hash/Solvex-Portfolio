/**
 * Selected Work: one entry per project. ONLY verified information goes in here.
 * Do not add results, client names, testimonials or technical details that are not confirmed.
 */
export type ProjectLayout = 'editorial-right'; // more layouts are added with the later projects

export interface ProjectVisual {
  kind: 'browser';
  /** real screenshots, first one that loads wins. Drop files in public/images/<id>/ */
  screenshots: string[];
  /**
   * Optional LIVE preview: the real site is shown inside the browser window, so any edit you deploy to it
   * appears in the portfolio automatically. Falls back to the screenshot / representative layout when it
   * cannot load (blocked embedding, offline, phones, data-saver).
   *  - width:  the desktop width the site is rendered at (it is scaled down to fit the window)
   *  - height: how much of the top of the page is shown and scrolled through
   */
  live?: { url: string; width: number; height: number };
}

export interface Project {
  id: string;
  number: string;
  name: string;
  category: string;
  status: 'COMPLETED PROJECT';
  description: string;
  layout: ProjectLayout;
  visual: ProjectVisual;
  /** optional, only verified technologies */
  tech?: string[];
}

export const projects: Project[] = [
  {
    id: 'intercloud',
    number: '01',
    name: 'INTERCLOUD',
    category: 'Website Development',
    status: 'COMPLETED PROJECT',
    // Restrained on purpose: replace with the real description when it is available.
    description: 'A website development project completed by SolveX.',
    layout: 'editorial-right',
    visual: {
      kind: 'browser',
      screenshots: ['/images/intercloud/Screenshot (723).png'],
      live: { url: 'https://intercloud.vercel.app/', width: 1440, height: 4800 },
    },
  },
];
