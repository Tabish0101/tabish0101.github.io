import type { Theme } from '@/lib/use-theme';

/** The Tenebris colors the scene draws with, read from the live CSS custom properties. */
export interface Palette {
  background: string;
  ink: string;
  muted: string;
  ghost: string;
  accent: string;
}

/**
 * tokens.css is the single source of truth: the scene reads the same variables the page
 * paints with, so a token change or a theme switch reaches WebGL without a second copy.
 */
export function readPalette(theme: Theme): Palette {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string) => {
    const value = style.getPropertyValue(name).trim();
    if (!value) console.warn(`hero: --${name.slice(2)} is not defined for the ${theme} theme`);
    return value || '#808080';
  };
  return {
    background: read('--surface-100'),
    ink: read('--ink'),
    muted: read('--ink-muted'),
    ghost: read('--ink-ghost'),
    accent: read('--accent'),
  };
}
