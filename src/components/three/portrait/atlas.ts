import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter } from 'three';
import { GLYPHS } from './field';

/** Atlas layout: GRID × GRID cells of CELL px. Keep GRID in sync with the glyph shader. */
export const ATLAS_GRID = 4;
const CELL = 64;

/**
 * The glyph sheet, drawn once in the site's mono face (JetBrains Mono, self-hosted by
 * next/font) so the ASCII layer is set in the same type as the page's labels.
 * White on transparent: the shader reads alpha and colors it with the theme's ink.
 */
export async function createGlyphAtlas(): Promise<CanvasTexture> {
  const family =
    getComputedStyle(document.documentElement).getPropertyValue('--family-mono').trim() ||
    'monospace';
  const font = `400 ${Math.round(CELL * 0.82)}px ${family}`;
  try {
    await document.fonts.load(font, GLYPHS.join(''));
  } catch {
    // The fallback mono face is fine: same 0.6em advance, close enough at 9px.
  }

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = CELL * ATLAS_GRID;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('portrait: no 2D context for the glyph atlas');
  context.font = font;
  context.fillStyle = '#fff';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  GLYPHS.forEach((glyph, i) => {
    const x = (i % ATLAS_GRID) * CELL + CELL / 2;
    const y = Math.floor(i / ATLAS_GRID) * CELL + CELL / 2;
    context.fillText(glyph, x, y + CELL * 0.04);
  });

  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = true;
  return texture;
}
