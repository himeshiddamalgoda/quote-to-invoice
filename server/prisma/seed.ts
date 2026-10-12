import 'dotenv/config';
import { z } from 'zod';
import argon2 from 'argon2';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { createDatabaseAdapter } from '../src/config/database-adapter.js';
const result = z
  .object({
    DATABASE_URL: z.url(),
    SEED_ADMIN_EMAIL: z.email(),
    SEED_ADMIN_PASSWORD: z.string().min(12).max(1024),
  })
  .safeParse(process.env);
if (!result.success)
  throw new Error(
    `Invalid seed variables: ${result.error.issues.map((issue) => issue.path.join('.')).join(', ')}`,
  );
const env = result.data;
const prisma = new PrismaClient({
  adapter: createDatabaseAdapter(env.DATABASE_URL),
});
try {
  await prisma.user.upsert({
    where: { email: env.SEED_ADMIN_EMAIL.toLowerCase() },
    update: {},
    create: {
      email: env.SEED_ADMIN_EMAIL.toLowerCase(),
      name: 'Administrator',
      role: 'ADMIN',
      passwordHash: await argon2.hash(env.SEED_ADMIN_PASSWORD, { type: argon2.argon2id }),
    },
  });
  console.info('Admin seed completed; existing accounts were not modified.');
} finally {
  await prisma.$disconnect();
}
