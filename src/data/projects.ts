/**
 * Selected Work: one entry per project. ONLY verified information goes in here.
 * Do not add results, client names, testimonials or technical details that are not confirmed.
 */
export type ProjectLayout = 'editorial-right'; // more layouts are added with the later projects

export interface ProjectVisual {
  kind: 'browser';
  /** real screenshots, first one that loads wins. Drop files in public/images/<id>/ */
  screenshots: string[];
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
      screenshots: ['/images/intercloud/home.webp', '/images/intercloud/home.jpg', '/images/intercloud/home.png'],
    },
  },
];
