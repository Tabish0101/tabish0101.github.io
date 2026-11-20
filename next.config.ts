import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Optional privacy-first analytics (Plausible, or a self-hosted Plausible/Umami script).
 * Only its origin is allowed through the CSP, and only when the script URL is configured.
 */
const analyticsOrigin = (() => {
  const src = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC;
  if (!src) return '';
  try {
    return new URL(src).origin;
  } catch {
    return '';
  }
})();

/**
 * Scripts: self + Vercel's analytics domain. Next.js streams its RSC payload through inline
 * scripts, so a static (non-nonce) policy needs 'unsafe-inline'. Nonces would force every
 * request to render dynamically, which costs more than it buys on a public, form-light site.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  [
    "script-src 'self' 'unsafe-inline'",
    isDev ? "'unsafe-eval'" : '',
    'https://va.vercel-scripts.com',
    analyticsOrigin,
  ]
    .filter(Boolean)
    .join(' '),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  [
    "connect-src 'self'",
    'https://va.vercel-scripts.com',
    'https://vitals.vercel-insights.com',
    analyticsOrigin,
    isDev ? 'ws:' : '',
  ]
    .filter(Boolean)
    .join(' '),
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=(), payment=(), usb=()',
  },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        // GPU benchmark tables for detect-gpu: self-hosted, immutable per release.
        source: '/benchmarks/:file*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
