import 'dotenv/config';
import { resolve } from 'node:path';
import { z } from 'zod';
import { databaseConfig } from '../src/config/database-url.js';
import { createDatabasePool } from '../src/config/database-pool.js';
import { applyMigrations } from '../src/database/migrate.js';
import { databaseErrorCode } from '../src/utils/database-error.js';
const parsed = z.url().safeParse(databaseConfig().url);
if (!parsed.success) throw new Error('Set MYSQL_PASSWORD or a valid DATABASE_URL in server/.env.');
// This isolated CLI pool executes trusted migration files; the API pool disables multi-statements.
const pool = createDatabasePool(parsed.data, true);
try {
  await applyMigrations(pool, resolve('database/migrations'));
} catch (error) {
  const code = databaseErrorCode(error);
  console.error(
    code
      ? `Database migration failed (${code}). Check database connectivity and permissions.`
      : error instanceof Error
        ? error.message
        : 'Database migration failed.',
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
