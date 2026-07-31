/**
 * Seeds the first administrator and the singleton settings row.
 *
 * Safe to re-run: existing records are left untouched.
 *
 *   npm run db:seed
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe!2024';

  if (password.length < 8) {
    throw new Error('SEED_ADMIN_PASSWORD must be at least 8 characters.');
  }

  const existingAdmin = await prisma.adminUser.findUnique({ where: { email } });

  if (existingAdmin) {
    console.log(`✓ Admin ${email} already exists — leaving it unchanged.`);
  } else {
    await prisma.adminUser.create({
      data: {
        email,
        name: 'Administrator',
        passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      },
    });
    console.log(`✓ Created admin user: ${email}`);
    console.log('  Sign in at /admin/login and change this password immediately.');
  }

  const existingSettings = await prisma.settings.findUnique({
    where: { id: 'singleton' },
  });

  if (existingSettings) {
    console.log('✓ Settings already exist — leaving them unchanged.');
  } else {
    await prisma.settings.create({
      data: {
        id: 'singleton',
        originAddress: process.env.SEED_ORIGIN_ADDRESS ?? '',
        pricePerMile: Number(process.env.SEED_PRICE_PER_MILE ?? 0.8),
        minimumFee: Number(process.env.SEED_MINIMUM_FEE ?? 30),
        maxRadiusMiles: Number(process.env.SEED_MAX_RADIUS_MILES ?? 100),
      },
    });
    console.log('✓ Created default settings.');

    if (!process.env.SEED_ORIGIN_ADDRESS) {
      console.warn(
        '! No SEED_ORIGIN_ADDRESS set. Add your business address in the admin dashboard before going live.',
      );
    }
  }
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
