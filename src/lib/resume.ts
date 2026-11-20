import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { site } from '@/content/site';

/**
 * Résumé links render only once public/resume.pdf exists — no dead links before then.
 * Server components only (reads the filesystem at build time).
 */
export const hasResume = existsSync(join(process.cwd(), 'public', site.resumePath));
