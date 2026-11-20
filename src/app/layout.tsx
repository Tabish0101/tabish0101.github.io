import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import tokens from '@design-system/tokens.json';
import { site } from '@/content/site';
import { headScript } from '@/lib/head-script';
import { jetbrainsMono, spaceGrotesk } from './fonts';
import './globals.css';

const title = `${site.name} — ${site.positioning}`;

const themeColor = (name: string, theme: 'dark' | 'light') => {
  const token = tokens.color.tokens.find((t) => t.name === name);
  return token?.value[theme] ?? '#0E0D0B';
};

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: title, template: `%s — ${site.name}` },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.name, url: site.url }],
  creator: site.name,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: site.name,
    title,
    description: site.description,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description: site.description,
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: themeColor('surface-100', 'dark') },
    { media: '(prefers-color-scheme: light)', color: themeColor('surface-100', 'light') },
  ],
  colorScheme: 'dark light',
};

const plausibleSrc = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC;
const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

/*
 * Vercel serves the analytics scripts under /_vercel/* only on its own deployments; anywhere
 * else (local `next start`, Lighthouse CI) they 404 into console errors. VERCEL is set for
 * Vercel builds, and the page is prerendered at build time. The client code ships either
 * way, so bundle budgets measured in CI still match production.
 */
const onVercel = Boolean(process.env.VERCEL);

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Theme + intro flags must be set before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: headScript }} />
        {/* Plain deferred tag, as Plausible documents it: no client JS from next/script. */}
        {plausibleSrc ? <script defer src={plausibleSrc} data-domain={plausibleDomain} /> : null}
      </head>
      <body>
        {children}
        {onVercel ? (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        ) : null}
      </body>
    </html>
  );
}
