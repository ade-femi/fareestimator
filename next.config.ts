import type { NextConfig } from 'next';

/**
 * Security headers applied to every response.
 *
 * Note: no Content-Security-Policy `script-src` unsafe-eval is required because
 * the app never loads the Google Maps JavaScript SDK — all Google calls are made
 * server-side, which is what keeps the API key and the origin address private.
 */
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    // HTTPS only. Vercel terminates TLS; this instructs browsers to never downgrade.
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
];

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
        // API responses must never be cached by shared caches.
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }],
      },
    ];
  },
};

export default nextConfig;
