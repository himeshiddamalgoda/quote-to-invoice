import 'dotenv/config';
import { z } from 'zod';
import { databaseConfig } from './database-url.js';
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.url().refine((url) => new URL(url).protocol === 'mysql:', 'Use a MySQL URL'),
  CORS_ORIGINS: z
    .string()
    .min(1)
    .transform((value) => value.split(',').map((origin) => origin.trim()))
    .pipe(z.array(z.url()).min(1)),
  JWT_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().min(1).default('quote-flow'),
  JWT_AUDIENCE: z.string().min(1).default('quote-flow-client'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});
const result = schema.safeParse({ ...process.env, DATABASE_URL: databaseConfig().url });
if (!result.success) {
  // Report variable names, never the supplied values.
  throw new Error(
    `Invalid environment variables: ${result.error.issues.map((issue) => issue.path.join('.')).join(', ')}`,
  );
}
export const env = result.data;
