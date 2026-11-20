import { JetBrains_Mono, Space_Grotesk } from 'next/font/google';

/**
 * Two families, no third. Self-hosted by next/font at build time, subset to Latin,
 * exposed as CSS variables that src/styles/tokens.css maps onto --family-sans / --family-mono.
 */
export const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-space-grotesk',
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
  /*
   * next/font's automatic fallback is Arial scaled to the average glyph width: proportional,
   * so mono labels and the clock render ~25% wider until the swap, and right-aligned or
   * centered ones jump. Courier New (Windows, macOS, iOS) and the generic monospace elsewhere
   * (Liberation Mono, Droid Sans Mono) share JetBrains Mono's 0.6em advance, so mono text
   * keeps its exact width through the swap.
   */
  adjustFontFallback: false,
  fallback: ['Courier New', 'monospace'],
});
