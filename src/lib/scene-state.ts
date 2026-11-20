/**
 * Mutable state shared by the motion layer (scroll) and the WebGL scene.
 *
 * Both are lazy chunks; this module is tiny and loads with whichever arrives first.
 * Plain fields read every frame — no subscriptions, no React re-renders.
 */
export const sceneState = {
  /** Hero scroll progress: 0 at the top of the page, 1 once the hero has scrolled away. */
  progress: 0,
  /** Lenis scroll velocity, px per frame (signed). 0 when native scrolling is in use. */
  velocity: 0,
};
