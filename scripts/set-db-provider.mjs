#!/usr/bin/env node
/**
 * Switches the Prisma datasource provider between `sqlite` (development) and
 * `postgresql` (production).
 *
 * Prisma does not allow the datasource provider to come from an environment
 * variable, so this script rewrites the single line in prisma/schema.prisma.
 *
 *   npm run db:provider postgresql
 *   npm run db:provider sqlite
 *
 * With no argument it reads DATABASE_PROVIDER from the environment.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SUPPORTED = ['sqlite', 'postgresql'];
const schemaPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'prisma',
  'schema.prisma',
);

const provider = (process.argv[2] ?? process.env.DATABASE_PROVIDER ?? '').trim();

if (!SUPPORTED.includes(provider)) {
  console.error(
    `Usage: npm run db:provider <${SUPPORTED.join('|')}>\n` +
      `Received: "${provider || '(empty)'}"`,
  );
  process.exit(1);
}

const schema = readFileSync(schemaPath, 'utf8');
const updated = schema.replace(
  /(datasource\s+db\s*\{[^}]*?provider\s*=\s*)"[^"]+"/,
  `$1"${provider}"`,
);

if (schema === updated) {
  console.log(`prisma/schema.prisma already targets "${provider}". Nothing to do.`);
  process.exit(0);
}

writeFileSync(schemaPath, updated);
console.log(`prisma/schema.prisma datasource provider set to "${provider}".`);
console.log('Next: npx prisma generate && npx prisma migrate dev --name init');
