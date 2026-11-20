import { seededRandom } from '@/lib/topology';

/**
 * The portrait as the scene sees it: a 320² analysis of the photo baked by
 * scripts/build-portrait.mjs — tone (dodged and burned), depth (local relief amplified),
 * edges (tone + depth + silhouette contours) and the subject mask, all in 0…1.
 */
export const FIELD_URL = '/hero/portrait-field.png';
/** Keep in sync with N in scripts/build-portrait.mjs. */
const FIELD_SIZE = 320;

export interface PortraitField {
  size: number;
  tone: Float32Array;
  depth: Float32Array;
  edge: Float32Array;
  mask: Float32Array;
}

/** Decodes the field PNG: two tiles side by side, [tone, depth, edge] | [mask]. */
export async function loadField(): Promise<PortraitField> {
  const response = await fetch(FIELD_URL);
  if (!response.ok) throw new Error(`portrait: ${FIELD_URL} → ${response.status}`);
  const bitmap = await createImageBitmap(await response.blob(), {
    colorSpaceConversion: 'none',
    premultiplyAlpha: 'none',
  });
  const size = bitmap.height;
  if (size !== FIELD_SIZE || bitmap.width !== size * 2) {
    throw new Error(`portrait: unexpected field size ${bitmap.width}×${bitmap.height}`);
  }
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = size;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('portrait: no 2D context');
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  const { data } = context.getImageData(0, 0, size * 2, size);

  const field: PortraitField = {
    size,
    tone: new Float32Array(size * size),
    depth: new Float32Array(size * size),
    edge: new Float32Array(size * size),
    mask: new Float32Array(size * size),
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const left = (y * size * 2 + x) * 4;
      field.tone[i] = data[left] / 255;
      field.depth[i] = data[left + 1] / 255;
      field.edge[i] = data[left + 2] / 255;
      field.mask[i] = data[left + size * 4] / 255;
    }
  }
  return field;
}

/** Bilinear read at (u, v) in 0…1, v down. */
export function sample(values: Float32Array, size: number, u: number, v: number): number {
  const x = Math.min(size - 1.001, Math.max(0, u * size - 0.5));
  const y = Math.min(size - 1.001, Math.max(0, v * size - 0.5));
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const i = y0 * size + x0;
  const top = values[i] + (values[i + 1] - values[i]) * fx;
  const bottom = values[i + size] + (values[i + size + 1] - values[i + size]) * fx;
  return top + (bottom - top) * fy;
}

/**
 * Ink: light on the dark theme (chalk on black), shadow on the light one (graphite on
 * paper). Shared with the halftone fallback in scripts/build-portrait.mjs.
 */
const GAMMA = { dark: 1.35, light: 2.1 } as const;
export const shadeOf = (tone: number, light: boolean) =>
  (light ? 1 - tone : tone) ** (light ? GAMMA.light : GAMMA.dark);

/**
 * Points per field cell. Density follows contours and ink; fractional counts are
 * error-diffused (Floyd–Steinberg) rather than rounded at random, so tone reads as an even
 * stipple instead of clumped grain. Mirrors distribute() in scripts/build-portrait.mjs.
 */
function distribute(field: PortraitField, light: boolean, total: number): Uint8Array {
  const { size, mask, edge, tone } = field;
  const weight = new Float32Array(size * size);
  let sum = 0;
  for (let i = 0; i < weight.length; i++) {
    weight[i] = mask[i] * (0.16 + edge[i] + 0.5 * shadeOf(tone[i], light));
    sum += weight[i];
  }
  const scale = total / sum;
  const error = new Float32Array(size * size);
  const counts = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const want = weight[i] * scale + error[i];
      const count = Math.max(0, Math.round(want));
      counts[i] = count;
      const e = want - count;
      if (x + 1 < size) error[i + 1] += (e * 7) / 16;
      if (y + 1 < size) {
        if (x > 0) error[i + size - 1] += (e * 3) / 16;
        error[i + size] += (e * 5) / 16;
        if (x + 1 < size) error[i + size + 1] += e / 16;
      }
    }
  }
  return counts;
}

/**
 * Per-point data, in the portrait's unit square (x right, y up, centered):
 *   position  x, y, 0 — z comes from depth in the shader, so relief can breathe and swell
 *   aData     depth, shade, edge, mask
 *   aSeed     0…1, staggers drift and the scroll dissolve
 */
export interface Cloud {
  count: number;
  position: Float32Array;
  data: Float32Array;
  seed: Float32Array;
}

export function buildDots(field: PortraitField, light: boolean, total: number): Cloud {
  const { size } = field;
  const counts = distribute(field, light, total);
  let count = 0;
  for (const c of counts) count += c;

  const random = seededRandom(23);
  const position = new Float32Array(count * 3);
  const data = new Float32Array(count * 4);
  const seed = new Float32Array(count);
  let n = 0;
  for (let i = 0; i < counts.length; i++) {
    for (let k = 0; k < counts[i]; k++) {
      const u = ((i % size) + random()) / size;
      const v = (Math.floor(i / size) + random()) / size;
      position[n * 3] = u - 0.5;
      position[n * 3 + 1] = 0.5 - v;
      // ±½ step of dither: hides the 8-bit depth terraces on smooth slopes.
      data[n * 4] = sample(field.depth, size, u, v) + (random() - 0.5) / 255;
      data[n * 4 + 1] = shadeOf(sample(field.tone, size, u, v), light);
      data[n * 4 + 2] = sample(field.edge, size, u, v);
      data[n * 4 + 3] = sample(field.mask, size, u, v);
      seed[n] = random();
      n++;
    }
  }
  return { count, position, data, seed };
}

/**
 * The glyph atlas, 4×4. Tone ramp first (sparse → dense), then the edge strokes, then a
 * few extras for texture. Indices are what the glyph layer's aGlyph attribute stores.
 */
export const GLYPHS = [
  '.',
  ':',
  '-',
  '=',
  '+',
  '*',
  '#',
  '%',
  '@',
  '/',
  '\\',
  '|',
  '_',
  '0',
  '1',
  '·',
];
const RAMP = [0, 1, 2, 3, 4, 5, 6, 7, 8];
/** Edge strokes by orientation of the contour line: 0°, 45°, 90°, 135° (y up). */
const STROKES = [2, 9, 11, 10];

/**
 * An ASCII layer on a grid: tone picks a glyph from the density ramp; where an edge is
 * strong, a stroke drawn along the contour (- / | \) replaces it. Each glyph carries the
 * same data as a dot, so it shares the dots' relief and motion.
 */
export function buildGlyphs(field: PortraitField, light: boolean, columns: number) {
  const { size, tone, mask, edge, depth } = field;
  const random = seededRandom(31);
  const position: number[] = [];
  const data: number[] = [];
  const seed: number[] = [];
  const glyph: number[] = [];
  const step = 1 / columns;
  const d = 1.5 / size;

  for (let row = 0; row < columns; row++) {
    for (let col = 0; col < columns; col++) {
      const u = (col + 0.5) * step;
      const v = (row + 0.5) * step;
      const m = sample(mask, size, u, v);
      if (m < 0.35) continue;
      const shade = shadeOf(sample(tone, size, u, v), light);
      const e = sample(edge, size, u, v);
      if (shade < 0.06 && e < 0.25) continue;

      let index: number;
      if (e > 0.55) {
        // Contour direction = gradient + 90°, folded to 0…π; y flipped to point up.
        const gx = sample(tone, size, u + d, v) - sample(tone, size, u - d, v);
        const gy = sample(tone, size, u, v - d) - sample(tone, size, u, v + d);
        const angle = (Math.atan2(gy, gx) + Math.PI / 2 + Math.PI) % Math.PI;
        index = STROKES[Math.round(angle / (Math.PI / 4)) % 4];
      } else {
        index = RAMP[Math.min(RAMP.length - 1, Math.floor(shade * RAMP.length))];
        if (random() < 0.04) index = 13 + Math.floor(random() * 2); // stray 0/1 — the cyber grain
      }

      position.push(u - 0.5, 0.5 - v, 0);
      data.push(sample(depth, size, u, v), shade, e, m);
      seed.push(random());
      glyph.push(index);
    }
  }
  return {
    count: seed.length,
    position: new Float32Array(position),
    data: new Float32Array(data),
    seed: new Float32Array(seed),
    glyph: new Float32Array(glyph),
  };
}
