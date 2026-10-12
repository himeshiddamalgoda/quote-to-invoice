import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomInt } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { RowDataPacket } from 'mysql2/promise';
import { createDatabasePool } from '../src/config/database-pool.js';
import { applyMigrations } from '../src/database/migrate.js';
const url = process.env.TEST_DATABASE_URL;
if (url && !new URL(url).pathname.endsWith('_test'))
  throw new Error('Use a dedicated test database.');
describe.skipIf(!url)('SQL migration runner', () => {
  const pool = createDatabasePool(url ?? 'mysql://test:test@localhost/quote_flow_test', true);
  const suffix = String(randomInt(1_000_000_000, 9_999_999_999));
  const name = `2099${suffix}_runner_test`;
  const table = `migration_test_${suffix}`;
  const dirtyName = `2098${suffix}_runner_failure`;
  let directory: string;
  let dirtyDirectory: string;
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'quote-flow-migration-'));
    dirtyDirectory = await mkdtemp(join(tmpdir(), 'quote-flow-dirty-'));
    await writeFile(
      join(directory, `${name}.sql`),
      `CREATE TABLE ${table} (id INT PRIMARY KEY); INSERT INTO ${table} VALUES (1);`,
    );
  });
  afterAll(async () => {
    await pool.query(`DROP TABLE IF EXISTS ${table}`);
    await pool.execute('DELETE FROM `_schema_migrations` WHERE name IN (?, ?)', [name, dirtyName]);
    await pool.end();
    if (directory) await rm(directory, { recursive: true });
    if (dirtyDirectory) await rm(dirtyDirectory, { recursive: true });
  });
  it('serializes concurrent startup and does not reapply completed SQL', async () => {
    await Promise.all([applyMigrations(pool, directory), applyMigrations(pool, directory)]);
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT id FROM ${table}`);
    expect(rows).toHaveLength(1);
    await applyMigrations(pool, directory);
  });
  it('rejects changes to an already applied migration', async () => {
    await writeFile(join(directory, `${name}.sql`), 'SELECT 1;');
    await expect(applyMigrations(pool, directory)).rejects.toThrow(/has changed/);
  });
  it('records partial failures and blocks a blind retry', async () => {
    await writeFile(join(dirtyDirectory, `${dirtyName}.sql`), 'SELECT 1; SELECT FROM;');
    await expect(applyMigrations(pool, dirtyDirectory)).rejects.toThrow(/partially applied/);
    await expect(applyMigrations(pool, dirtyDirectory)).rejects.toThrow(/unfinished/);
  });
});
