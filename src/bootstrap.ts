import './styles/globals.css';
import { createLoader } from './components/Loader/Loader';
import {
  LoadTracker,
  buildTasks,
  loadFonts,
  withTimeout,
} from './components/Loader/loadTracker';
import { playIntro, runProgress, playOutro } from './animations/loaderAnimation';
import { revealHero } from './animations/transitions';
import { initScrollAnimation } from './animations/scrollAnimation';
import { mountHero } from './sections/Hero/Hero';
import { mountAbout } from './sections/About/About';
import { mountProblem } from './sections/Problem/Problem';
import { mountSolutions } from './sections/Solutions/Solutions';
import { mountWork } from './sections/Work/Work';
import { mountAria } from './sections/Aria/Aria';
import { mountWhatsApp } from './sections/WhatsApp/WhatsApp';
import { loadHeroScene, type HeroScene } from './three/lazyScene';
import { content } from './data/content';

export async function bootstrap() {
  const html = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  html.classList.add('is-loading');

  // fixed 3D world behind every section
  const sceneMount = document.createElement('div');
  sceneMount.className = 'scene-fixed';
  document.body.prepend(sceneMount);

  // content sequence: opening -> who is SolveX -> the problem -> the solutions
  const hero = mountHero(); // hidden until the reveal
  const about = mountAbout();
  const problem = mountProblem();
  const solutions = mountSolutions();
  // 05 Philosophy is not in this codebase yet: mount it here, before Selected Work
  const work = mountWork(document.body, reduced);
  const aria = mountAria(document.body, reduced); // 08 — ARIA, directly after Intercloud
  const whatsapp = mountWhatsApp(document.body, reduced); // 09 — WhatsApp Automation demo

  // Don't show the title until Sora is ready (avoids a font-swap flash)
  await withTimeout(loadFonts(), 2500);

  const els = createLoader();

  // The 3D world is created once the loader intro has played,
  // and the loader waits for it (it counts as part of the progress).
  const holder: { scene: HeroScene | null } = { scene: null };
  let startScene: () => void = () => {};
  const sceneStarted = new Promise<void>((resolve) => (startScene = resolve));

  const tasks = buildTasks();
  tasks.push({
    id: 'scene',
    weight: 5,
    run: async () => {
      await sceneStarted;
      holder.scene = await loadHeroScene(sceneMount, { reduced });
    },
  });

  const tracker = new LoadTracker(tasks);
  void tracker.start();

  await playIntro(els, reduced);
  startScene();

  await runProgress({
    percentEl: els.percent,
    getReal: () => tracker.progress,
    minDuration: reduced ? 1.2 : content.loader.minDuration,
  });

  await playOutro(
    els,
    () => {
      revealHero(hero);
      holder.scene?.reveal(); // the 3D world emerges while the loader title scales away
    },
    reduced
  );

  els.root.remove();
  html.classList.remove('is-loading');

  initScrollAnimation(
    { hero, about, problem, solutions, work: work.scroll, aria: aria.scroll, whatsapp: whatsapp.scroll },
    holder.scene ?? { setStages() {} },
    reduced
  );
}