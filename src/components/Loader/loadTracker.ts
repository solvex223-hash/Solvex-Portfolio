import { content } from '../../data/content';

export interface LoadTask {
  id: string;
  weight: number;
  run: () => Promise<unknown>;
}

export const engineState = { webgl: false };

export const withTimeout = <T>(promise: Promise<T>, ms: number) =>
  Promise.race([promise, new Promise<void>((resolve) => setTimeout(resolve, ms))]);

const stylesheetReady = () =>
  new Promise<void>((resolve) => {
    const link = document.querySelector<HTMLLinkElement>('link[href*="fonts.googleapis.com"]');
    if (!link || link.sheet) return resolve();
    link.addEventListener('load', () => resolve(), { once: true });
    link.addEventListener('error', () => resolve(), { once: true });
  });

let fontsPromise: Promise<unknown> | undefined;
export const loadFonts = () =>
  (fontsPromise ??= stylesheetReady().then(() =>
    Promise.all([
      document.fonts.load('800 1em Sora'),
      document.fonts.load('500 1em Manrope'),
      document.fonts.load('500 1em "Space Grotesk"'),
    ]).then(() => document.fonts.ready)
  ));

const preloadAssets = (urls: string[]) =>
  Promise.all(urls.map((url) => fetch(url).then((r) => r.blob()).catch(() => undefined)));

export function buildTasks(): LoadTask[] {
  return [
    { id: 'fonts', weight: 2, run: () => withTimeout(loadFonts(), 5000) },
    {
      id: 'three',
      weight: 3,
      run: async () => {
        await import('three'); // module only, no renderer yet
        const canvas = document.createElement('canvas');
        engineState.webgl = !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
      },
    },
    { id: 'assets', weight: 3, run: () => preloadAssets(content.assets) },
    {
      id: 'app',
      weight: 1,
      run: () =>
        document.readyState === 'complete'
          ? Promise.resolve()
          : new Promise<void>((resolve) =>
              window.addEventListener('load', () => resolve(), { once: true })
            ),
    },
  ];
}

export class LoadTracker {
  private completed = 0;
  private total: number;

  constructor(private tasks: LoadTask[]) {
    this.total = tasks.reduce((sum, t) => sum + t.weight, 0);
  }

  get progress() {
    return this.total ? this.completed / this.total : 1;
  }

  start() {
    return Promise.all(
      this.tasks.map((task) =>
        task
          .run()
          .catch((err) => console.warn(`[loader] task "${task.id}" failed`, err))
          .finally(() => {
            this.completed += task.weight;
          })
      )
    );
  }
}