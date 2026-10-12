import { PrismaMariaDb } from '@prisma/adapter-mariadb';
// Parse the same MySQL URL used by Prisma CLI; percent-encoded credentials are supported.
export function createDatabaseAdapter(connectionString: string) {
  const url = new URL(connectionString);
  if (url.protocol !== 'mysql:') throw new Error('Use a MySQL database URL');
  if (url.search)
    throw new Error('Database URL options are unsupported; configure adapter options explicitly');
  return new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    connectionLimit: 10,
    connectTimeout: 5000,
    acquireTimeout: 10000,
    idleTimeout: 30,
  });
}
