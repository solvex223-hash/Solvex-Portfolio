export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (t) => t * t * (3 - 2 * t);

/** 0 → 1 between a and b, eased */
export const range = (p, a, b) => smoothstep(clamp((p - a) / (b - a), 0, 1));

/** deterministic random generator so the particle layout is identical every load */
export function seeded(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function disposeTree(root) {
  root.traverse((o) => {
    o.geometry?.dispose?.();
    const m = o.material;
    if (m) {
      (Array.isArray(m) ? m : [m]).forEach((mm) => {
        mm.map?.dispose?.();
        mm.dispose?.();
      });
    }
  });
}