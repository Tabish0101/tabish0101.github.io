import type Lenis from 'lenis';

/** Fixed nav height (64px) plus breathing room. Anchors land this far below the top. */
export const NAV_OFFSET = 80;

let lenis: Lenis | null = null;
let locks = 0;

interface ScrollToOptions {
  offset?: number;
  immediate?: boolean;
  onComplete?: () => void;
}

/**
 * One scroll controller for the whole page. The motion layer attaches Lenis on desktop;
 * everything else (mobile menu, intro, anchors) goes through here and works with or
 * without smooth scrolling. Locks are counted so overlapping lockers don't fight.
 */
export const scroller = {
  attach(instance: Lenis) {
    lenis = instance;
    if (locks > 0) instance.stop();
  },

  detach(instance: Lenis) {
    if (lenis === instance) lenis = null;
  },

  get smooth(): boolean {
    return lenis !== null;
  },

  lock() {
    locks += 1;
    lenis?.stop();
    document.documentElement.classList.add('is-scroll-locked');
  },

  unlock() {
    locks = Math.max(0, locks - 1);
    if (locks > 0) return;
    lenis?.start();
    document.documentElement.classList.remove('is-scroll-locked');
  },

  to(
    target: HTMLElement | number,
    { offset = 0, immediate = false, onComplete }: ScrollToOptions = {},
  ) {
    if (lenis) {
      lenis.scrollTo(target, { offset, immediate, onComplete: () => onComplete?.() });
      return;
    }
    const top =
      typeof target === 'number'
        ? target
        : target.getBoundingClientRect().top + window.scrollY + offset;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top, behavior: immediate || reduce ? 'auto' : 'smooth' });
    onComplete?.();
  },
};
