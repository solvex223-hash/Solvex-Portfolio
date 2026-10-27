export function getQuality() {
  const mobile =
    window.matchMedia('(max-width: 768px)').matches ||
    window.matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 8;
  const low = mobile || cores <= 4 || mem <= 4;

  return {
    mobile,
    low,
    maxDpr: mobile || low ? 1.5 : 2,
    particles: mobile ? 3800 : low ? 6500 : 9000,
    antialias: !mobile,
  };
}