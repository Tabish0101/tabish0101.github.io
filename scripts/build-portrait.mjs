#!/usr/bin/env node
/**
 * Bakes the hero portrait into the small assets the page actually loads:
 *
 *   public/hero/portrait-field.png       the WebGL scene's input — a 320² analysis of the photo,
 *                                        two tiles side by side: [tone, depth, edge] | [mask]
 *   public/hero/portrait-dots-dark.png   the static halftone the page paints before (or instead
 *   public/hero/portrait-dots-light.png  of) WebGL — white + alpha, used as a CSS mask so it
 *                                        takes the theme's ink color
 *
 * Sources live in assets/hero (portrait.png + portrait-depth.png, white = near), never in
 * public/, so the 2 MB originals are not deployed. No dependencies: PNG is decoded and
 * encoded with node:zlib. Runs before `pnpm dev` and `pnpm build`; skips when up to date.
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, inflateSync } from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = {
  photo: join(root, 'assets/hero/portrait.png'),
  depth: join(root, 'assets/hero/portrait-depth.png'),
};
const TARGET = join(root, 'public/hero');
const OUTPUT = {
  field: join(TARGET, 'portrait-field.png'),
  dark: join(TARGET, 'portrait-dots-dark.png'),
  light: join(TARGET, 'portrait-dots-light.png'),
};

/** Field resolution. Keep in sync with FIELD_SIZE in src/components/three/portrait/field.ts. */
const N = 320;
/** Halftone fallback: pixel size and dot count. */
const HALFTONE = 1024;
const HALFTONE_DOTS = 42000;

// ─── Up to date? ────────────────────────────────────────────────────────────────────────────

const self = fileURLToPath(import.meta.url);
if (!existsSync(SOURCE.photo) || !existsSync(SOURCE.depth)) {
  console.error('portrait: assets/hero/portrait.png and portrait-depth.png are required.');
  process.exit(1);
}
const newestInput = Math.max(...[self, SOURCE.photo, SOURCE.depth].map((f) => statSync(f).mtimeMs));
const outputs = Object.values(OUTPUT);
if (outputs.every((f) => existsSync(f) && statSync(f).mtimeMs > newestInput)) {
  console.log('portrait: up to date');
  process.exit(0);
}

// ─── PNG ────────────────────────────────────────────────────────────────────────────────────

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (bytes) => {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

/** 8-bit, non-interlaced PNG → single-channel luma in 0…1. */
function decodeLuma(file) {
  const buffer = readFileSync(file);
  let pos = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat = [];
  while (pos < buffer.length) {
    const length = buffer.readUInt32BE(pos);
    const type = buffer.toString('latin1', pos + 4, pos + 8);
    const data = buffer.subarray(pos + 8, pos + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
      if (data[8] !== 8 || data[12] !== 0) throw new Error(`${file}: need 8-bit, non-interlaced`);
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + length;
  }
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`${file}: unsupported color type ${colorType}`);

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = y * (stride + 1) + 1;
    const row = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? pixels[row + x - channels] : 0;
      const b = y > 0 ? pixels[row - stride + x] : 0;
      const c = x >= channels && y > 0 ? pixels[row - stride + x - channels] : 0;
      let value = raw[line + x];
      if (filter === 1) value += a;
      else if (filter === 2) value += b;
      else if (filter === 3) value += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      pixels[row + x] = value & 0xff;
    }
  }

  const luma = new Float32Array(width * height);
  for (let i = 0; i < luma.length; i++) {
    const p = i * channels;
    luma[i] =
      channels >= 3
        ? (0.2126 * pixels[p] + 0.7152 * pixels[p + 1] + 0.0722 * pixels[p + 2]) / 255
        : pixels[p] / 255;
  }
  return { width, height, luma };
}

function encodePng(width, height, colorType, channels, pixels) {
  const stride = width * channels;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    // Filter "up" on every row: cheap, and it compresses smooth fields and sparse dots well.
    raw[y * (stride + 1)] = y === 0 ? 0 : 2;
    for (let x = 0; x < stride; x++) {
      const value = pixels[y * stride + x];
      raw[y * (stride + 1) + 1 + x] =
        y === 0 ? value : (value - pixels[(y - 1) * stride + x]) & 0xff;
    }
  }
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
    const out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc32(body), body.length + 4);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = colorType;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Image math ─────────────────────────────────────────────────────────────────────────────

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smoothstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Area-average downsample of a square-ish image to N×N. */
function resample({ width, height, luma }, size) {
  const out = new Float32Array(size * size);
  const sx = width / size;
  const sy = height / size;
  for (let ty = 0; ty < size; ty++) {
    const y0 = ty * sy;
    const y1 = y0 + sy;
    for (let tx = 0; tx < size; tx++) {
      const x0 = tx * sx;
      const x1 = x0 + sx;
      let sum = 0;
      let weight = 0;
      for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
        const wy = Math.min(y + 1, y1) - Math.max(y, y0);
        for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
          const w = wy * (Math.min(x + 1, x1) - Math.max(x, x0));
          sum += luma[y * width + x] * w;
          weight += w;
        }
      }
      out[ty * size + tx] = sum / weight;
    }
  }
  return out;
}

/** Separable box blur, applied three times (≈ gaussian). */
function blur(src, radius) {
  let a = Float32Array.from(src);
  let b = new Float32Array(src.length);
  const pass = (from, to, horizontal) => {
    for (let j = 0; j < N; j++) {
      let sum = 0;
      const at = (i) => (horizontal ? from[j * N + i] : from[i * N + j]);
      for (let i = -radius; i <= radius; i++) sum += at(Math.min(N - 1, Math.max(0, i)));
      for (let i = 0; i < N; i++) {
        to[horizontal ? j * N + i : i * N + j] = sum / (2 * radius + 1);
        sum += at(Math.min(N - 1, i + radius + 1)) - at(Math.max(0, i - radius));
      }
    }
  };
  for (let k = 0; k < 3; k++) {
    pass(a, b, true);
    pass(b, a, false);
  }
  return a;
}

/** Blur restricted to the subject: background does not bleed into the edges. */
function maskedBlur(src, mask, radius) {
  const weighted = blur(
    src.map((v, i) => v * mask[i]),
    radius,
  );
  const weight = blur(mask, radius);
  return weighted.map((v, i) => (weight[i] > 1e-4 ? v / weight[i] : src[i]));
}

function sobel(src) {
  const out = new Float32Array(N * N);
  const at = (x, y) => src[Math.min(N - 1, Math.max(0, y)) * N + Math.min(N - 1, Math.max(0, x))];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const gx =
        at(x + 1, y - 1) +
        2 * at(x + 1, y) +
        at(x + 1, y + 1) -
        at(x - 1, y - 1) -
        2 * at(x - 1, y) -
        at(x - 1, y + 1);
      const gy =
        at(x - 1, y + 1) +
        2 * at(x, y + 1) +
        at(x + 1, y + 1) -
        at(x - 1, y - 1) -
        2 * at(x, y - 1) -
        at(x + 1, y - 1);
      out[y * N + x] = Math.hypot(gx, gy);
    }
  }
  return out;
}

function percentile(values, mask, p) {
  const picked = [];
  for (let i = 0; i < values.length; i++) if (mask[i] > 0.5) picked.push(values[i]);
  picked.sort((a, b) => a - b);
  return picked[Math.min(picked.length - 1, Math.floor(p * picked.length))] ?? 0;
}

/** Otsu's threshold on 0…1 values: the split between background and subject depth. */
function otsu(values) {
  const bins = new Float64Array(256);
  for (const v of values) bins[Math.round(clamp01(v) * 255)]++;
  let total = 0;
  for (let i = 0; i < 256; i++) total += i * bins[i];
  let best = 0;
  let threshold = 0;
  let below = 0;
  let belowSum = 0;
  for (let t = 0; t < 256; t++) {
    below += bins[t];
    belowSum += t * bins[t];
    const above = values.length - below;
    if (below === 0 || above === 0) continue;
    const between = below * above * (belowSum / below - (total - belowSum) / above) ** 2;
    if (between > best) {
      best = between;
      threshold = t;
    }
  }
  return threshold / 255;
}

// ─── Field ──────────────────────────────────────────────────────────────────────────────────

const photo = decodeLuma(SOURCE.photo);
const depthMap = decodeLuma(SOURCE.depth);
const lum = resample(photo, N);
const depthRaw = resample(depthMap, N);

// Subject mask from the depth map, softened, then faded out at the frame's bottom and sides
// so the shoulders dissolve instead of ending on a hard crop line.
const split = otsu(depthRaw);
const silhouette = blur(
  depthRaw.map((d) => smoothstep(split - 0.03, split + 0.05, d)),
  1,
);
const mask = silhouette.map((m, i) => {
  const u = (i % N) / (N - 1);
  const v = Math.floor(i / N) / (N - 1);
  return m * (1 - smoothstep(0.66, 0.97, v)) * smoothstep(0, 0.14, u) * smoothstep(1, 0.86, u);
});

// Depth: normalized over the subject, its broad shape compressed and its local relief
// (nose, brow, lips, collar) amplified — that is what reads as 3D under parallax.
const d0 = percentile(depthRaw, silhouette, 0.01);
const d1 = percentile(depthRaw, silhouette, 0.995);
const dn = depthRaw.map((d) => clamp01((d - d0) / (d1 - d0)));
const broad = maskedBlur(dn, silhouette, 10);
const depth = dn.map((d, i) => clamp01(0.5 + 0.55 * (broad[i] - 0.5) + 2.2 * (d - broad[i])));

// Tone: normalized over the subject with a little local contrast, like a dodge-and-burn pass.
const t0 = percentile(lum, silhouette, 0.02);
const t1 = percentile(lum, silhouette, 0.985);
const tn = lum.map((l) => clamp01((l - t0) / (t1 - t0)));
const local = maskedBlur(tn, silhouette, 8);
// Asymmetric: highlights lift fully, shadows deepen by half — eye sockets keep their irises.
const tone = tn.map((t, i) => {
  const detail = t - local[i];
  return clamp01(t + (detail > 0 ? 0.9 : 0.45) * detail) ** 0.85;
});

// Edges: tone contours (features, hair, folds) + depth contours (jaw, ears, collar) +
// the silhouette, each normalized against its own strong end.
const toneEdge = sobel(blur(tone, 1));
const depthEdge = sobel(blur(dn, 1));
const outline = sobel(silhouette);
const te = percentile(toneEdge, silhouette, 0.97) || 1;
const de = percentile(depthEdge, silhouette, 0.97) || 1;
const edge = toneEdge.map(
  (e, i) =>
    clamp01(Math.max(e / te, 0.4 * (depthEdge[i] / de), 0.45 * outline[i])) ** 0.85 * mask[i],
);

// ─── Write the field ────────────────────────────────────────────────────────────────────────

mkdirSync(TARGET, { recursive: true });
const field = new Uint8Array(2 * N * N * 3);
const byte = (x) => Math.round(clamp01(x) * 255);
for (let y = 0; y < N; y++) {
  for (let x = 0; x < N; x++) {
    const i = y * N + x;
    const on = mask[i] > 0.002;
    const left = (y * 2 * N + x) * 3;
    field[left] = on ? byte(tone[i]) : 0;
    field[left + 1] = on ? byte(depth[i]) : 0;
    field[left + 2] = on ? byte(edge[i]) : 0;
    const right = (y * 2 * N + N + x) * 3;
    field[right] = byte(mask[i]);
  }
}
writeFileSync(OUTPUT.field, encodePng(2 * N, N, 2, 3, field));

// ─── Halftone fallbacks ─────────────────────────────────────────────────────────────────────
// Same sampling and shading as the WebGL points (src/components/three/portrait/), seen
// straight on, so the canvas crossfades in over it without a jump.

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Shading, shared with the shader in src/components/three/portrait/PortraitDots.tsx: ink is
 * light on the dark theme (chalk on black) and shadow on the light one (graphite on paper).
 */
const GAMMA = { dark: 1.35, light: 2.1 };
const shadeOf = (tone, light) => (light ? 1 - tone : tone) ** (light ? GAMMA.light : GAMMA.dark);

/**
 * Dot counts per field cell: density follows contours and ink. Fractional counts are
 * error-diffused (Floyd–Steinberg) instead of rounded at random, so tone reads as an even
 * stipple rather than clumped grain. Mirrors distribute() in portrait/field.ts.
 */
function distribute(light, total) {
  const weight = mask.map((m, i) => m * (0.16 + edge[i] + 0.5 * shadeOf(tone[i], light)));
  const scale = total / weight.reduce((a, b) => a + b, 0);
  const error = new Float32Array(N * N);
  const counts = new Uint8Array(N * N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const want = weight[i] * scale + error[i];
      const count = Math.max(0, Math.round(want));
      counts[i] = count;
      const e = want - count;
      if (x + 1 < N) error[i + 1] += (e * 7) / 16;
      if (y + 1 < N) {
        if (x > 0) error[i + N - 1] += (e * 3) / 16;
        error[i + N] += (e * 5) / 16;
        if (x + 1 < N) error[i + N + 1] += e / 16;
      }
    }
  }
  return counts;
}

function halftone(light) {
  const size = HALFTONE;
  const alpha = new Float32Array(size * size);
  const random = mulberry32(29);
  const counts = distribute(light, HALFTONE_DOTS);
  const cell = size / N;
  for (let i = 0; i < N * N; i++) {
    for (let k = 0; k < counts[i]; k++) {
      const x = ((i % N) + random()) * cell;
      const y = (Math.floor(i / N) + random()) * cell;
      const shade = shadeOf(tone[i], light);
      const a = clamp01(0.05 + 0.9 * shade + 0.35 * edge[i]) * mask[i];
      const dot = 1 + 1.2 * shade + 0.5 * edge[i];
      const x0 = Math.round(x - dot / 2);
      const y0 = Math.round(y - dot / 2);
      const s = Math.max(1, Math.round(dot));
      for (let py = y0; py < y0 + s; py++) {
        for (let px = x0; px < x0 + s; px++) {
          if (px < 0 || py < 0 || px >= size || py >= size) continue;
          const p = py * size + px;
          alpha[p] = a + alpha[p] * (1 - a);
        }
      }
    }
  }
  const pixels = new Uint8Array(size * size * 2);
  for (let p = 0; p < size * size; p++) {
    pixels[p * 2] = 255;
    pixels[p * 2 + 1] = byte(alpha[p]);
  }
  return encodePng(size, size, 4, 2, pixels);
}

writeFileSync(OUTPUT.dark, halftone(false));
writeFileSync(OUTPUT.light, halftone(true));

const kb = (f) => `${(statSync(f).size / 1000).toFixed(0)} kB`;
console.log(
  `portrait: depth split ${split.toFixed(2)} → field ${kb(OUTPUT.field)}, halftones ${kb(OUTPUT.dark)} / ${kb(OUTPUT.light)}`,
);
