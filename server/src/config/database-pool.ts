import { createPool } from 'mysql2/promise';
export function createDatabasePool(connectionString: string, multipleStatements = false) {
  const url = new URL(connectionString);
  if (url.protocol !== 'mysql:' || !url.hostname || !url.pathname.slice(1))
    throw new Error('Use a MySQL URL with a host and database name');
  if (url.search)
    throw new Error('Database URL options are unsupported; configure pool options explicitly');
  return createPool({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 100,
    connectTimeout: 5000,
    enableKeepAlive: true,
    decimalNumbers: false,
    supportBigNumbers: true,
    bigNumberStrings: true,
    dateStrings: true,
    timezone: 'Z',
    multipleStatements,
  });
}
