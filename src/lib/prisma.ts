import { PrismaClient } from '@prisma/client';

/**
 * A single PrismaClient instance per process.
 *
 * Next.js hot-reloads modules in development, which would otherwise open a new
 * connection pool on every edit until the database refuses connections.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
