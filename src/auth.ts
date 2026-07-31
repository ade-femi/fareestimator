import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { authConfig } from '@/auth.config';
import { prisma } from '@/lib/prisma';
import { loginSchema } from '@/lib/validation';

/**
 * Full Auth.js configuration (Node.js runtime).
 *
 * Sessions are JWTs so the middleware can authorise requests at the edge
 * without a database round-trip on every navigation.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.adminUser.findUnique({ where: { email } });

        if (!user) {
          // Hash anyway so a missing account and a wrong password take the same
          // time — otherwise the response time enumerates valid emails.
          await bcrypt.compare(
            password,
            '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv',
          );
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        await prisma.adminUser
          .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
          .catch(() => undefined);

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
          role: user.role,
        };
      },
    }),
  ],
});

/**
 * Throws unless the caller is an authenticated admin. Use at the top of every
 * server action and admin-only route handler — middleware alone is not a
 * sufficient authorisation boundary for mutations.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new Error('UNAUTHORIZED');
  }
  return session.user;
}
