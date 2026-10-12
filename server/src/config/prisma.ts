import { PrismaClient } from '../generated/prisma/client.js';
import { createDatabaseAdapter } from './database-adapter.js';
import { env } from './env.js';
export const prisma = new PrismaClient({ adapter: createDatabaseAdapter(env.DATABASE_URL) });
