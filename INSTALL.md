# SolveX loader — install

1. Unzip into your project root (solvex-portfolio/). It only adds files under `src/`; nothing existing is overwritten
   (unless you already have files at those exact paths).
2. Run: `npm install gsap`
3. In `index.html`, inside <head>, add:

   <meta name="viewport" content="width=device-width, initial-scale=1" />
   <style>html,body{background:#050505;margin:0}</style>
   <link rel="preconnect" href="https://fonts.googleapis.com" />
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
   <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600&family=Sora:wght@400;600;700;800&family=Space+Grotesk:wght@400;500;600&display=swap" rel="stylesheet" />

4. In `src/main.js`:
   - add at top:  import { bootstrap } from './bootstrap';
   - wrap your existing scene/particle init in:  async function startExperience() { ... }
   - add at the bottom:  bootstrap(startExperience);
5. `npm run dev`
