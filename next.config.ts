import type { NextConfig } from 'next';

/**
 * Security headers applied to every response.
 *
 * Note: no Content-Security-Policy `script-src` unsafe-eval is required because
 * the app never loads the Google Maps JavaScript SDK — all Google calls are made
 * server-side, which is what keeps the API key and the origin address private.
 *
 * X-Frame-Options is deliberately NOT in this shared list: the customer landing
 * page is meant to be embedded (see ALLOWED_EMBED_ORIGINS below), so framing is
 * denied by default per-route instead of globally — see the `/admin` and `/api`
 * entries in `headers()`.
 */
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    // HTTPS only. Vercel terminates TLS; this instructs browsers to never downgrade.
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
];

// Sites allowed to embed the customer landing page ("/") in an iframe, e.g. the
// commissioning business's own marketing site. Comma-separated origins, no
// trailing slash. Empty/unset means no cross-origin embedding is allowed.
const allowedEmbedOrigins = (process.env.ALLOWED_EMBED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  logging: {
    fetches: { fullUrl: false },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Admin dashboard: never embeddable, regardless of ALLOWED_EMBED_ORIGINS.
        source: '/admin/:path*',
        headers: [{ key: 'X-Frame-Options', value: 'DENY' }],
      },
      {
        // API responses must never be cached by shared caches, and are not
        // documents, so framing headers don't apply — set anyway for defense
        // in depth.
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
      {
        // Customer landing page: embeddable only from explicitly allowed origins.
        source: '/',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `frame-ancestors 'self'${allowedEmbedOrigins.length ? ' ' + allowedEmbedOrigins.join(' ') : ''}`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
