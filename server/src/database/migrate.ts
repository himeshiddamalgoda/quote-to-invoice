import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { databaseErrorCode } from '../utils/database-error.js';
interface HistoryRow extends RowDataPacket {
  checksum: string;
  finished_at: string | null;
}
interface LockRow extends RowDataPacket {
  acquired: number | string | null;
}
interface SchemaRow extends RowDataPacket {
  name: string;
}
interface ExistsRow extends RowDataPacket {
  count: number | string;
}
async function tableExists(connection: PoolConnection, name: string) {
  const [rows] = await connection.execute<ExistsRow[]>(
    'SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
    [name],
  );
  return Number(rows[0]?.count) === 1;
}

// MySQL DDL auto-commits: unfinished history blocks retries after a partial failure.
export async function applyMigrations(pool: Pool, directory: string) {
  const files = (await readdir(directory))
    .filter((name) => /^\d{14}_[a-z0-9_]+\.sql$/.test(name))
    .sort();
  const connection = await pool.getConnection();
  let lockName: string | undefined;
  let acquired = false;
  try {
    const [schemas] = await connection.query<SchemaRow[]>('SELECT DATABASE() AS name');
    const schema = schemas[0]?.name;
    if (!schema) throw new Error('Select a database before migrating.');
    lockName = `quote-flow-migrations:${createHash('sha256').update(schema).digest('hex').slice(0, 32)}`;
    const [locks] = await connection.execute<LockRow[]>('SELECT GET_LOCK(?, 10) AS acquired', [
      lockName,
    ]);
    if (Number(locks[0]?.acquired) !== 1)
      throw new Error('Another database migration is running. Retry later.');
    acquired = true;
    await connection.query(
      'CREATE TABLE IF NOT EXISTS `_schema_migrations` (name VARCHAR(255) NOT NULL PRIMARY KEY, checksum CHAR(64) NOT NULL, started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), finished_at DATETIME(3) NULL)',
    );
    const [unfinished] = await connection.query<RowDataPacket[]>(
      'SELECT name FROM `_schema_migrations` WHERE finished_at IS NULL LIMIT 1',
    );
    if (unfinished.length)
      throw new Error(
        'An unfinished database migration needs review before continuing. Check _schema_migrations; do not reset the database.',
      );
    for (const filename of files) {
      const name = filename.slice(0, -4);
      const sql = await readFile(join(directory, filename), 'utf8');
      const normalizedSql = sql.replace(/\r\n/g, '\n');
      const checksum = createHash('sha256').update(normalizedSql).digest('hex');
      const [history] = await connection.execute<HistoryRow[]>(
        'SELECT checksum, finished_at FROM `_schema_migrations` WHERE name = ?',
        [name],
      );
      if (history[0]) {
        if (history[0].checksum !== checksum)
          throw new Error(`Applied migration ${name} has changed. Restore its original SQL.`);
        continue;
      }
      // Compatibility only: a verified old bootstrap record allows preserving existing tables.
      if (
        name === '20261007000000_initial' &&
        (await tableExists(connection, '_prisma_migrations'))
      ) {
        const [legacy] = await connection.execute<HistoryRow[]>(
          'SELECT checksum, finished_at FROM `_prisma_migrations` WHERE migration_name = ? AND finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY finished_at DESC LIMIT 1',
          [name],
        );
        if (legacy[0]) {
          const windowsChecksum = createHash('sha256')
            .update(normalizedSql.replace(/\n/g, '\r\n'))
            .digest('hex');
          if (legacy[0].checksum !== checksum && legacy[0].checksum !== windowsChecksum)
            throw new Error(
              'Existing bootstrap checksum differs. Review the schema before migration.',
            );
          await connection.execute(
            'INSERT INTO `_schema_migrations` (name, checksum, finished_at) VALUES (?, ?, CURRENT_TIMESTAMP(3))',
            [name, checksum],
          );
          console.info(`Recognized existing migration: ${name}`);
          continue;
        }
      }
      await connection.execute('INSERT INTO `_schema_migrations` (name, checksum) VALUES (?, ?)', [
        name,
        checksum,
      ]);
      try {
        // Only committed SQL migration files use multi-statements; HTTP repositories do not.
        await connection.query(sql);
        await connection.execute(
          'UPDATE `_schema_migrations` SET finished_at = CURRENT_TIMESTAMP(3) WHERE name = ?',
          [name],
        );
      } catch (error) {
        throw new Error(
          `Migration ${name} failed (${databaseErrorCode(error) ?? 'UNKNOWN_ERROR'}). MySQL DDL may be partially applied; review it before retrying.`,
          { cause: error },
        );
      }
      console.info(`Applied migration: ${name}`);
    }
    console.info('Database migrations complete.');
  } finally {
    try {
      if (acquired && lockName) await connection.execute('SELECT RELEASE_LOCK(?)', [lockName]);
    } finally {
      connection.release();
    }
  }
}
