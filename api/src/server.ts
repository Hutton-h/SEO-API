import { createApp } from './app.js';
import config from './config.js';
import { testConnection as testDb, migrate as runMigrations } from './shared/database.js';
import { testRedisConnection } from './shared/redis.js';
import { closeAllQueues } from './shared/queue.js';

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

let server: any = null;

async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`[Server] Received ${signal}. Shutting down gracefully...`);

  if (server) {
    await new Promise<void>((resolve) => {
      server!.close(() => {
        console.log('[Server] HTTP server closed');
        resolve();
      });
    });
  }

  await closeAllQueues();
  console.log('[Server] All queues closed');

  process.exit(0);
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

async function bootstrap(): Promise<void> {
  console.log('[Server] Starting Crane SEO Platform API...');
  console.log(`[Server] Environment: ${config.nodeEnv}`);
  console.log(`[Server] Port: ${config.port}`);
  console.log(`[Server] Database: ${config.database.host}:${config.database.port}/${config.database.database}`);

  // --- Database (with retry) ---
  let dbOk = false;
  for (let attempt = 1; attempt <= 10; attempt++) {
    dbOk = await testDb();
    if (dbOk) break;
    console.log(`[Server] Database not ready, retrying (${attempt}/10)...`);
    await new Promise((r) => setTimeout(r, 3000));
  }
  if (!dbOk) {
    console.error('[Server] Database connection failed after 10 retries. Exiting.');
    process.exit(1);
  }

  // Run migrations (non-fatal — database is initialized via init.sql)
  try {
    await runMigrations();
  } catch (err) {
    console.warn('[Server] Migration skipped (DB initialized via init.sql):', (err as Error).message);
  }

  // --- Redis ---
  const redisOk = await testRedisConnection();
  if (!redisOk) {
    console.warn('[Server] Redis connection failed. Queue features may be unavailable.');
  }

  // --- Create & start HTTP server ---
  const app = createApp();

  server = app.listen(config.port, config.host, () => {
    console.log(`[Server] HTTP server listening on http://${config.host}:${config.port}`);
    console.log(`[Server] API docs available at http://${config.host}:${config.port}/api-docs`);
    console.log(`[Server] Health check at http://${config.host}:${config.port}/health`);
  });

  // --- Signal handlers ---
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    console.error('[Server] Unhandled rejection:', reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('[Server] Uncaught exception:', err);
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  console.error('[Server] Bootstrap failed:', err);
  process.exit(1);
});