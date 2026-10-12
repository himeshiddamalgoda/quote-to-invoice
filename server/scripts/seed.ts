import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import argon2 from 'argon2';
import { databaseConfig } from '../src/config/database-url.js';
import { createDatabasePool } from '../src/config/database-pool.js';
import { databaseErrorCode } from '../src/utils/database-error.js';
const result = z
  .object({
    DATABASE_URL: z.url(),
    SEED_ADMIN_EMAIL: z.email(),
    SEED_ADMIN_PASSWORD: z.string().min(12).max(1024),
  })
  .safeParse({ ...process.env, DATABASE_URL: databaseConfig().url });
if (!result.success)
  throw new Error(
    `Invalid seed variables: ${result.error.issues.map((issue) => issue.path.join('.')).join(', ')}`,
  );
const env = result.data;
const pool = createDatabasePool(env.DATABASE_URL);
try {
  const hash = await argon2.hash(env.SEED_ADMIN_PASSWORD, { type: argon2.argon2id });
  await pool.execute(
    'INSERT INTO `User` (id, email, name, role, passwordHash, updatedAt) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE id = id',
    [randomUUID(), env.SEED_ADMIN_EMAIL.toLowerCase(), 'Administrator', 'ADMIN', hash],
  );
  console.info('Admin seed completed; existing accounts were not modified.');
} catch (error) {
  console.error(`Admin seed failed (${databaseErrorCode(error) ?? 'UNKNOWN_ERROR'}).`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
