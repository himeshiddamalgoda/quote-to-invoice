import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { rateLimit } from 'express-rate-limit';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { database } from './config/database.js';
import { AppError } from './utils/app-error.js';
import { errorHandler, notFound } from './middleware/error-handler.js';
import { authRoutes } from './modules/auth/auth.routes.js';
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  // Trust proxy stays disabled; configure specific trusted proxy hops before deployment.
  app.use((req, res, next) => {
    req.requestId = randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    const started = Date.now();
    res.on('finish', () =>
      logger.info(
        {
          requestId: req.requestId,
          method: req.method,
          status: res.statusCode,
          durationMs: Date.now() - started,
        },
        'HTTP request',
      ),
    );
    next();
  });
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: false }));
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: { code: 'RATE_LIMITED', message: 'Too many requests.' } },
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.get('/api/v1/health', (_req, res) => res.json({ data: { status: 'ok' } }));
  app.get('/api/v1/health/ready', async (_req, res) => {
    try {
      await database.execute('SELECT 1');
    } catch {
      throw new AppError(503, 'NOT_READY', 'Database is unavailable.');
    }
    res.json({ data: { status: 'ready' } });
  });
  app.use('/api/v1/auth', authRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
