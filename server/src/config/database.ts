import { createDatabasePool } from './database-pool.js';
import { env } from './env.js';
export const database = createDatabasePool(env.DATABASE_URL);
