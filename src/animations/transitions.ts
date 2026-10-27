import gsap from 'gsap';

/** loader -> hero hand-off: headline rises line by line, supporting content follows */
export function revealHero(hero: HTMLElement) {
  const lines = hero.querySelectorAll('.hero__line-inner');
  const rest = hero.querySelectorAll(
    '.hero__eyebrow, .hero__intro, .hero__statement, .hero__ctas'
  );

  return gsap
    .timeline()
    .set(hero, { visibility: 'visible' })
    .fromTo(
      lines,
      { yPercent: 105 },
      { yPercent: 0, duration: 1.5, ease: 'expo.out', stagger: 0.09 },
      0.2
    )
    .fromTo(
      rest,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.12 },
      0.7
    );
}