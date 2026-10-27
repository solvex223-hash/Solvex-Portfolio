import * as THREE from 'three';

/**
 * Colour configuration of the particle field, fully separate from its structure.
 * Defaults are soft white / silver / low-intensity neutrals. The portfolio accent colour
 * (CSS variable --accent) only tints a few selected highlights.
 * Change at runtime with scene.setPalette({ accent: '#ff7a59' }): the spatial structure does not change.
 */
export const DEFAULT_PALETTE = {
  base: '#d9dce6', // the bulk of the particles: cool silver
  highlight: '#f6f6ff', // brighter particles
  accent: null, // null -> read --accent from the page
  atmosphere: '#8a90b0', // distant haze: far particles drift toward this
};

function readAccent() {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  return v || '#8b6cff';
}

export function createPaletteUniforms(palette = {}) {
  const p = { ...DEFAULT_PALETTE, ...palette };
  return {
    uBase: { value: new THREE.Color(p.base) },
    uHigh: { value: new THREE.Color(p.highlight) },
    uAccent: { value: new THREE.Color(p.accent || readAccent()) },
    uAtmos: { value: new THREE.Color(p.atmosphere) },
  };
}

export function applyPalette(uniforms, palette = {}) {
  if (palette.base) uniforms.uBase.value.set(palette.base);
  if (palette.highlight) uniforms.uHigh.value.set(palette.highlight);
  if (palette.accent) uniforms.uAccent.value.set(palette.accent);
  if (palette.atmosphere) uniforms.uAtmos.value.set(palette.atmosphere);
}
