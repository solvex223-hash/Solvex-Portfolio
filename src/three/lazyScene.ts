export interface SceneStages {
  hero?: number; // 0..1 while the hero scrolls away
  scatter?: number; // 0..1 the architecture dissolves into particles
  form?: number; // 0..1 the particles assemble the team hologram
  dissolve?: number; // 0..1 the hologram fragments
  connect?: number; // 0..1 the fragments reconnect into an organised system
  service?: number; // 0..10 continuous scroll position through the services (evolves + pans the field)
  settle?: number; // 0..1 the final formation settles into a coherent whole
  calm?: number; // 0..1 the particle backdrop recedes (Selected Work and later sections)
}

export interface HeroScene {
  reveal(): void;
  setStages(stages: SceneStages): void;
  /** recolour the particle field; its structure does not change */
  setPalette(p: { base?: string; highlight?: string; accent?: string; atmosphere?: string }): void;
  dispose(): void;
}

// The only place the 3D system is loaded from, so nothing expensive runs before the loader asks for it.
export async function loadHeroScene(
  mount: Element | null,
  opts: { reduced: boolean }
): Promise<HeroScene | null> {
  if (!mount) return null;
  try {
    const { createThreeScene } = await import('../components/ThreeScene/ThreeScene.js');
    return await createThreeScene(mount as HTMLElement, opts);
  } catch (err) {
    console.warn('[scene] 3D failed to start, falling back to typography only', err);
    return null;
  }
}