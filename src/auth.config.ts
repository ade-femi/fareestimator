import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-safe half of the Auth.js configuration.
 *
 * The middleware runs on the Edge runtime, where Prisma and bcrypt cannot run.
 * This file therefore declares no providers — it only carries the session
 * strategy, pages and callbacks needed to *verify* a JWT. The Credentials
 * provider (which touches the database) is added in `src/auth.ts`, used by the
 * Node.js runtime only.
 */
export const authConfig = {
  session: { strategy: 'jwt', maxAge: 60 * 60 * 8 },
  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
  trustHost: true,
  providers: [],
  callbacks: {
    /** Copies the user id and role onto the token at sign-in. */
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? 'admin';
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? session.user.id;
        session.user.role = (token.role as string) ?? 'admin';
      }
      return session;
    },
    /** Guards every /admin route except the login page. */
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isAdminRoute = pathname.startsWith('/admin');
      const isLoginRoute = pathname === '/admin/login';

      if (isAdminRoute && !isLoginRoute) return Boolean(auth?.user);
      return true;
    },
  },
} satisfies NextAuthConfig;
