import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Not found',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main id="main" className="column flex min-h-svh flex-col justify-center gap-6 py-24">
      <p className="flex items-center gap-3 text-ink-muted">
        <span className="text-mono-label tabular-nums">404</span>
        <span className="text-mono-label" aria-hidden="true">
          /
        </span>
        <span className="text-label">Not found</span>
      </p>
      <h1 className="text-h1 text-ink">This page doesn’t exist.</h1>
      <p className="max-w-[48ch] text-body text-ink-muted">
        The address may be mistyped, or the page has moved. Everything lives on one page.
      </p>
      <p>
        <Link href="/" className="link text-body">
          Back to the index
        </Link>
      </p>
    </main>
  );
}
