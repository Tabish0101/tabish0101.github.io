#!/usr/bin/env node
/**
 * Bundle budgets from the spec, measured on the production build at gzip -9:
 *
 *   initial JS for "/"  ≤ 120 kB   everything the page loads before any lazy import
 *   each lazy import    ≤ 200 kB   counting every chunk it needs (the hero scene is one)
 *
 * Lazy imports are read from .next/react-loadable-manifest.json, which maps each
 * import() in client code to its chunk files. Run after `next build`. Exits 1 on a breach.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const NEXT = '.next';
const KB = 1000; // kB, as `next build` reports them
const BUDGET = { initial: 120 * KB, lazy: 200 * KB };

const read = (file) => JSON.parse(readFileSync(join(NEXT, file), 'utf8'));
if (!existsSync(join(NEXT, 'app-build-manifest.json'))) {
  console.error('check-bundle: no build found — run `pnpm build` first.');
  process.exit(1);
}

const build = read('build-manifest.json');
const app = read('app-build-manifest.json');
const loadable = existsSync(join(NEXT, 'react-loadable-manifest.json'))
  ? read('react-loadable-manifest.json')
  : {};

const sizes = new Map();
const gz = (file) => {
  if (!sizes.has(file))
    sizes.set(file, gzipSync(readFileSync(join(NEXT, file)), { level: 9 }).length);
  return sizes.get(file);
};
const js = (files) => [...new Set(files)].filter((f) => f.endsWith('.js'));
const sum = (files) => files.reduce((total, file) => total + gz(file), 0);
const kb = (bytes) => `${(bytes / KB).toFixed(1).padStart(6)} kB`;

let failed = false;
const verdict = (bytes, budget) => {
  const ok = bytes <= budget;
  if (!ok) failed = true;
  return ok ? 'ok' : `OVER by ${((bytes - budget) / KB).toFixed(1)} kB`;
};

// Initial: the root runtime plus the layout and page entries.
const initial = js([
  ...build.rootMainFiles,
  ...(app.pages['/layout'] ?? []),
  ...(app.pages['/page'] ?? []),
]);
const initialBytes = sum(initial);
console.log(
  `initial JS for /     ${kb(initialBytes)}  budget ${kb(BUDGET.initial)}  ${verdict(initialBytes, BUDGET.initial)}`,
);

// Lazy: one row per import() in our client code (Next's own pages-router stubs skipped).
const rows = Object.entries(loadable)
  .filter(([key]) => !key.includes('next/dist/client') && !key.includes('next\\dist\\client'))
  .map(([key, entry]) => {
    const files = js(entry.files).filter((file) => !initial.includes(file));
    return { key: key.replace(/\\/g, '/'), files, bytes: sum(files) };
  })
  .sort((a, b) => b.bytes - a.bytes);

console.log('\nlazy imports (all chunks each one needs, beyond the initial JS)');
for (const row of rows) {
  console.log(`  ${row.key.padEnd(54)} ${kb(row.bytes)}  ${verdict(row.bytes, BUDGET.lazy)}`);
}

// The full 3D payload a high-tier desktop downloads: probe + scene + post-processing.
const threeD = js(rows.filter((row) => row.key.includes('/three/')).flatMap((row) => row.files));
if (threeD.length) {
  console.log(
    `\n3D payload, high tier (probe + scene + effects, deduplicated)  ${kb(sum(threeD))}`,
  );
}

if (failed) {
  console.error('\ncheck-bundle: budget exceeded.');
  process.exit(1);
}
console.log('\ncheck-bundle: all budgets met.');
