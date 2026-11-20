#!/usr/bin/env node
/**
 * Tenebris token pipeline
 *
 *   design-system/tokens.json  →  src/styles/tokens.css
 *
 * - Every color token becomes a CSS custom property, redefined per theme on <html data-theme>.
 * - Spacing, radius and type families become custom properties too.
 * - Tailwind's theme is rebuilt from those properties (@theme), so every token is a utility:
 *   bg-surface-200, text-ink-muted, border-border, rounded-md, p-4 (= space-4), text-h1 …
 * - Default Tailwind colors, font sizes and shadows are removed: only Tenebris values exist.
 * - px lengths are written as rem (px ÷ 16) so type and spacing follow the reader's
 *   browser font-size setting. At the default 16px they are identical to the tokens.
 *
 * Also prints a WCAG 2.x contrast report for text tokens on each surface, per theme.
 * Run: pnpm tokens  (also runs before `pnpm dev` and `pnpm build`)
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = resolve(root, 'design-system/tokens.json');
const TARGET = resolve(root, 'src/styles/tokens.css');

/** next/font exposes each loaded family as a CSS variable on <html> — see src/app/fonts.ts. */
const FONT_VARIABLES = { sans: '--font-space-grotesk', mono: '--font-jetbrains-mono' };
/** Utility names for type styles. Styles not listed keep their token name. */
const TYPE_ALIASES = { 'heading-1': 'h1', 'heading-2': 'h2', 'heading-3': 'h3' };
const TOKEN_NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;

const tokens = JSON.parse(await readFile(SOURCE, 'utf8'));
const problems = [];

/* ------------------------------------------------------------------ helpers */

const round = (n) => Number(n.toFixed(4)).toString();

/** '16px' → '1rem'. Numbers are treated as px. em, %, rem and keywords pass through. */
function length(value) {
  if (typeof value === 'number') return value === 0 ? '0' : `${round(value / 16)}rem`;
  const v = String(value).trim();
  const px = /^(-?\d*\.?\d+)px$/.exec(v);
  if (!px) return v;
  const n = Number(px[1]);
  return n === 0 ? '0' : `${round(n / 16)}rem`;
}

/** Unitless line heights are multipliers and stay unitless; px becomes rem. */
const lineHeight = (value) => (typeof value === 'number' ? String(value) : length(value));

function checkName(name, family) {
  if (!TOKEN_NAME.test(name)) problems.push(`${family}: invalid token name "${name}"`);
}

/* ------------------------------------------------------------------ color */

const themes = (tokens.color?.themes ?? [{ id: 'dark' }]).map((t) => t.id);
const primaryTheme = themes[0];
const colorTokens = tokens.color?.tokens ?? [];
const colorNames = new Set();
for (const t of colorTokens) {
  checkName(t.name, 'color');
  if (colorNames.has(t.name)) problems.push(`color: duplicate token "${t.name}"`);
  colorNames.add(t.name);
}

/** Raw value for a theme; a missing theme inherits the primary theme's value. */
function rawColor(token, theme) {
  if (typeof token.value === 'string') return token.value.trim();
  return (token.value?.[theme] ?? token.value?.[primaryTheme] ?? '').trim() || null;
}

/** CSS value for a theme. Aliases ("{other-token}") become var(--other-token). */
function cssColor(token, theme) {
  const raw = rawColor(token, theme);
  if (!raw) {
    problems.push(`color: "${token.name}" has no value for theme "${theme}"`);
    return null;
  }
  const alias = /^\{(.+)\}$/.exec(raw);
  if (!alias) return raw;
  if (alias[1] === token.name || !colorNames.has(alias[1])) {
    problems.push(`color: "${token.name}" aliases missing token "${alias[1]}"`);
    return null;
  }
  return `var(--${alias[1]})`;
}

const themeBlocks = themes.map((theme, index) => {
  const selector =
    index === 0 ? `:root,\n:root[data-theme='${theme}']` : `:root[data-theme='${theme}']`;
  const scheme = theme === 'dark' || theme === 'light' ? [`  color-scheme: ${theme};`] : [];
  const lines = colorTokens
    .map((t) => {
      const value = cssColor(t, theme);
      return value
        ? `  --${t.name}: ${value}; /* ${t.usage ?? ''} */`.replace(' /*  */', '')
        : null;
    })
    .filter(Boolean);
  return `${selector} {\n${[...scheme, ...lines].join('\n')}\n}`;
});

/* ------------------------------------------------------------------ spacing, radius, type */

const spacing = tokens.spacing?.tokens ?? [];
const radius = tokens.radius?.tokens ?? [];
const families = tokens.type?.families ?? {};
const typeGroups = tokens.type?.groups ?? [];
spacing.forEach((t) => checkName(t.name, 'spacing'));
radius.forEach((t) => checkName(t.name, 'radius'));

function familyStack(key, stack) {
  const variable = FONT_VARIABLES[key];
  if (!variable) return stack;
  const [first, ...rest] = stack.split(',').map((s) => s.trim());
  return [`var(${variable}, ${first})`, ...rest].join(', ');
}

const rootLines = [
  ...spacing.map((t) => `  --${t.name}: ${length(t.value)}; /* ${t.value} — ${t.usage ?? ''} */`),
  ...Object.entries(families).map(
    ([key, stack]) => `  --family-${key}: ${familyStack(key, stack)};`,
  ),
];

const base = spacing.find((t) => t.name === 'space-1');
const themeInline = [
  '  --color-*: initial;',
  ...colorTokens.map((t) => `  --color-${t.name}: var(--${t.name});`),
  '  --font-*: initial;',
  ...Object.keys(families).map((key) => `  --font-${key}: var(--family-${key});`),
];
const themeStatic = [
  base ? `  --spacing: ${length(base.value)};` : null,
  '  --radius-*: initial;',
  ...radius.map((t) => `  --radius-${t.name.replace(/^radius-/, '')}: ${length(t.value)};`),
  '  --text-*: initial;',
  '  --shadow-*: initial;',
  '  --inset-shadow-*: initial;',
  '  --drop-shadow-*: initial;',
].filter(Boolean);

const typeUtilities = typeGroups.flatMap((group) =>
  group.styles.map((style) => {
    const name = TYPE_ALIASES[style.name] ?? style.name;
    const declarations = [
      `font-family: var(--family-${group.family});`,
      `font-size: ${length(style.fontSize)};`,
      `line-height: ${lineHeight(style.lineHeight)};`,
      `font-weight: ${style.fontWeight};`,
      style.letterSpacing ? `letter-spacing: ${style.letterSpacing};` : null,
      style.textTransform ? `text-transform: ${style.textTransform};` : null,
    ].filter(Boolean);
    return `/* ${style.name} — ${style.usage ?? ''} */\n@utility text-${name} {\n  ${declarations.join('\n  ')}\n}`;
  }),
);

/* ------------------------------------------------------------------ write */

if (problems.length) {
  console.error(`tokens: ${problems.length} problem(s) in ${relative(root, SOURCE)}`);
  problems.forEach((p) => console.error(`  - ${p}`));
  process.exit(1);
}

const css = `/*
 * ${tokens.name ?? 'Tokens'} v${tokens.version ?? 1} — generated from design-system/tokens.json.
 * Do not edit by hand: change the tokens, then run \`pnpm tokens\`.
 */

/* Color — dark is the identity, light exists for accessibility. */
${themeBlocks.join('\n\n')}

/* Spacing (4px grid) and type families. */
:root {
${rootLines.join('\n')}
}

/* Tailwind theme: utilities resolve to the custom properties above, so themes switch at runtime. */
@theme inline {
${themeInline.join('\n')}
}

/* Spacing base (p-4 = space-4 = 16px) and radii. Tailwind defaults that Tenebris does not define are removed. */
@theme static {
${themeStatic.join('\n')}
}

/* Type styles — font, size, line height, weight and tracking as one utility. */
${typeUtilities.join('\n\n')}
`;

await mkdir(dirname(TARGET), { recursive: true });
await writeFile(TARGET, css);
console.log(
  `tokens: ${colorTokens.length} colors × ${themes.length} themes, ${spacing.length} spacing, ` +
    `${radius.length} radii, ${typeGroups.reduce((n, g) => n + g.styles.length, 0)} type styles → ${relative(root, TARGET)}`,
);

/* ------------------------------------------------------------------ contrast report */

function channel(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}
function luminance(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
}
function ratio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  if (la == null || lb == null) return null;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const resolveHex = (name, theme, depth = 0) => {
  const token = colorTokens.find((t) => t.name === name);
  if (!token || depth > 4) return null;
  const raw = rawColor(token, theme);
  const alias = raw && /^\{(.+)\}$/.exec(raw);
  return alias ? resolveHex(alias[1], theme, depth + 1) : raw;
};

const PAIRS = [
  ['ink', ['surface-100', 'surface-200', 'surface-300']],
  ['ink-muted', ['surface-100', 'surface-200', 'surface-300']],
  ['accent', ['surface-100', 'surface-200']],
  ['danger', ['surface-100', 'surface-200']],
  ['on-accent', ['accent']],
];
const failures = [];
for (const theme of themes) {
  for (const [text, grounds] of PAIRS) {
    for (const ground of grounds) {
      const r = ratio(resolveHex(text, theme) ?? '', resolveHex(ground, theme) ?? '');
      if (r != null && r < 4.5)
        failures.push(`  ${theme.padEnd(6)} ${text} on ${ground}: ${r.toFixed(2)}:1`);
    }
  }
}
if (failures.length) {
  console.warn(
    `tokens: ${failures.length} text pair(s) under 4.5:1 (AA body text). Fine at 24px+ if ≥ 3:1; avoid for small text:`,
  );
  failures.forEach((f) => console.warn(f));
}
