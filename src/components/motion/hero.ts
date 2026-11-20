import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { SplitText } from 'gsap/SplitText';
import { sceneState } from '@/lib/scene-state';
import { scramble } from './reveals';
import { prime } from './split';

/** When the loader's curtain starts to lift, in ms from its first frame. Mirrors globals.css. */
const LOADER_EXIT_AT = 1750;

/**
 * The entrance plays only behind the intro loader, timed to its curtain. If the runtime
 * arrives late — or there is no loader (repeat visit) — the hero simply stays as painted:
 * visible content is never hidden in order to animate it in.
 */
export function playEntrance(Split: typeof SplitText) {
  const loader = document.querySelector('[data-loader]');
  const exit = loader
    ?.getAnimations()
    .find((a): a is CSSAnimation => a instanceof CSSAnimation && a.animationName === 'loader-exit');
  if (!exit) return;

  const lead = LOADER_EXIT_AT - Number(exit.currentTime ?? LOADER_EXIT_AT);
  if (lead < 150) return;

  const title = document.querySelector<HTMLElement>('[data-hero-title]');
  if (!title) return;

  const split = Split.create(title, { type: 'words,chars', aria: 'auto' });
  const number = document.querySelector<HTMLElement>('[data-hero-number]');
  prime([...split.chars, ...document.querySelectorAll('[data-hero-fade]')]);

  gsap
    .timeline({ delay: (lead + 120) / 1000 })
    .from(split.chars, { y: 40, opacity: 0, duration: 0.8, ease: 'power2.out', stagger: 0.03 })
    .from(
      '[data-hero-fade]',
      { y: 16, opacity: 0, duration: 0.6, ease: 'power2.out', stagger: 0.08 },
      0.25,
    )
    .add(() => {
      if (number) scramble(number);
    }, 0);
}

/**
 * Hero scroll: the form recedes and dissolves (3D via sceneState, the SVG via transforms),
 * the copy drifts up, and the fallback layers move at different rates for depth.
 * All scrubbed to scroll position, all transform and opacity — no layout work.
 */
export function setupHero({ wide }: { wide: boolean }) {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero) return;

  const range = { trigger: hero, start: 'top top', end: 'bottom top' } as const;
  prime(
    hero.querySelectorAll(
      '[data-hero-copy], [data-hero-fallback], [data-parallax], [data-hero-cue]',
    ),
  );

  ScrollTrigger.create({
    ...range,
    onUpdate: (self) => {
      sceneState.progress = self.progress;
    },
    onRefresh: (self) => {
      sceneState.progress = self.progress;
    },
  });

  gsap.to('[data-hero-copy]', {
    y: -64,
    opacity: 0.2,
    ease: 'none',
    scrollTrigger: { ...range, scrub: true },
  });

  const fallback = hero.querySelector('[data-hero-fallback]');
  if (fallback) {
    gsap.set(fallback, { transformOrigin: wide ? '69% 50%' : '66% 34%' });
    gsap.to(fallback, {
      scale: 0.8,
      opacity: 0,
      ease: 'none',
      scrollTrigger: { ...range, scrub: true },
    });
  }

  for (const layer of gsap.utils.toArray<HTMLElement>('[data-parallax]', hero)) {
    const depth = Number(layer.dataset.parallax) || 0;
    gsap.to(layer, {
      y: () => depth * hero.offsetHeight,
      ease: 'none',
      scrollTrigger: { ...range, scrub: true, invalidateOnRefresh: true },
    });
  }

  gsap.to('[data-hero-cue]', {
    opacity: 0,
    ease: 'none',
    scrollTrigger: { trigger: hero, start: 'top top', end: '+=160', scrub: true },
  });
}
