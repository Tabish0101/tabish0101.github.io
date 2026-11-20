/** Media queries that gate enhancement. Keep in sync with the CSS that mirrors them. */
export const MEDIA = {
  reducedMotion: '(prefers-reduced-motion: reduce)',
  /** Mouse or trackpad: custom cursor, magnetic elements, smooth scroll. */
  finePointer: '(hover: hover) and (pointer: fine)',
  /** Where the WebGL hero runs. Phones, tablets and reduced motion get the SVG instead. */
  webgl:
    '(min-width: 768px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
} as const;

export function matches(query: string): boolean {
  return typeof window !== 'undefined' && window.matchMedia(query).matches;
}
