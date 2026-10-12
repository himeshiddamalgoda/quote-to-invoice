import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import { databaseConfig } from './src/config/database-url.js';
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: databaseConfig(),
});
