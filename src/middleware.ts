import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';

/**
 * Edge middleware that protects the admin dashboard.
 *
 * It uses the provider-free config so no database driver is bundled for the
 * Edge runtime. Unauthenticated visitors to /admin/* are redirected to the
 * login page by the `authorized` callback.
 */
export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

export const config = {
  // Everything except Next.js internals, the auth endpoints themselves, and
  // static assets.
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
