'use client';

import { useEffect } from 'react';

/**
 * Mounts the motion layer — GSAP, ScrollTrigger, SplitText, Lenis — after hydration, as
 * its own chunk. The page is complete without it: every element is server-rendered in its
 * final state, and the runtime only adds motion to what is not yet on screen.
 */
export function Motion() {
  useEffect(() => {
    let dispose: (() => void) | undefined;
    let cancelled = false;

    import('./runtime')
      .then(({ startMotion }) => {
        if (!cancelled) dispose = startMotion();
      })
      .catch((error: unknown) => console.warn('motion: runtime failed to load —', error));

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);

  return null;
}
