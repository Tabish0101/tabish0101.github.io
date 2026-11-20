#!/usr/bin/env node
/**
 * detect-gpu fetches GPU benchmark tables at runtime. By default it pulls them from unpkg;
 * we self-host them under /benchmarks instead — no third-party request, and the CSP stays
 * limited to 'self'. Runs before `pnpm dev` and `pnpm build`.
 */
import { cp, mkdir, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

const source = join(dirname(require.resolve('detect-gpu')), 'benchmarks');
const target = join(root, 'public', 'benchmarks');

await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });
const files = (await readdir(target)).filter((f) => f.endsWith('.json'));
console.log(`gpu benchmarks: ${files.length} tables → public/benchmarks`);
