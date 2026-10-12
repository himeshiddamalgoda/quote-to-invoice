import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { logger } from './config/logger.js';
const server = createApp().listen(env.PORT, () => logger.info({ port: env.PORT }, 'API listening'));
let stopping = false;
function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  logger.info({ signal }, 'Shutting down');
  const timeout = setTimeout(() => {
    logger.error('Shutdown timed out');
    process.exit(1);
  }, 10_000);
  timeout.unref();
  server.close(() => {
    void prisma
      .$disconnect()
      .then(() => {
        clearTimeout(timeout);
        process.exit(0);
      })
      .catch(() => {
        process.exit(1);
      });
  });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
server.on('error', (error) => {
  logger.fatal({ errorType: error.name }, 'Server failed to start');
  void prisma.$disconnect().finally(() => process.exit(1));
});
