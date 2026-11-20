import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const require = createRequire(import.meta.url);

/*
 * eslint-config-next is an eslintrc-style preset. pnpm keeps its plugins next to it rather
 * than hoisting them to the project root, so resolve plugins from the preset's own location.
 */
const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
  resolvePluginsRelativeTo: dirname(require.resolve('eslint-config-next/package.json')),
});

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'public/**',
      '.lighthouseci/**',
      'lighthouse-reports/**',
      'next-env.d.ts',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Email templates are whole HTML documents rendered to a string, not Next pages.
    files: ['src/emails/**'],
    rules: { '@next/next/no-head-element': 'off' },
  },
];

export default config;
