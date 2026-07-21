// ============================================================================
// 主入口: 启动流程
// 1. 加载配置 → 2. 验证数据库连接 → 3. 验证 Redis 连接
// 4. 创建 Express App → 5. 注册路由 → 6. 启动 HTTP Server
// 7. 初始化 WebSocket → 8. 注册优雅关闭
// ============================================================================

import { createServer } from 'http';
import config from './config.js';
import logger from './logger.js';
import { testConnection as testDb } from './db.js';
import { testConnection as testRedis } from './redis.js';
import { createApp } from './app.js';
import { wsService } from './infra/websocket.js';
import { setupGracefulShutdown } from './infra/graceful-shutdown.js';
import { registerRoutes } from './routes.js';

async function bootstrap(): Promise<void> {
  const startTime = Date.now();

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║          Crane SEO Platform — API Server                ║');
  console.log(`║          Version: ${config.app.apiVersion}                                      ║`);
  console.log(`║          Environment: ${config.server.nodeEnv}                              ║`);
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  // 1. 验证数据库连接
  logger.info('[Bootstrap] Testing database connection...');
  const dbOk = await testDb();
  if (!dbOk) {
    logger.error('[Bootstrap] Database connection failed');
    process.exit(1);
  }

  // 2. 验证 Redis 连接
  logger.info('[Bootstrap] Testing Redis connection...');
  const redisOk = await testRedis();
  if (!redisOk) {
    logger.warn('[Bootstrap] Redis connection failed — continuing without cache');
    // Redis 不是关键路径，允许继续
  }

  // 3. 创建 Express App
  const app = createApp();

  // 4. 注册路由
  registerRoutes(app);

  // 5. 创建 HTTP Server
  const server = createServer(app);

  // 6. 初始化 WebSocket
  wsService.init(server);

  // 7. 启动 HTTP Server
  server.listen(config.server.port, config.server.host, () => {
    const duration = Date.now() - startTime;
    logger.info(
      { port: config.server.port, host: config.server.host, durationMs: duration },
      `[Bootstrap] Server started on http://${config.server.host}:${config.server.port}`,
    );
    console.log('');
    console.log(`  ✓ API:       http://${config.server.host}:${config.server.port}/api/v1`);
    console.log(`  ✓ Health:    http://${config.server.host}:${config.server.port}/health`);
    console.log(`  ✓ Metrics:   http://${config.server.host}:${config.server.port}/metrics`);
    console.log(`  ✓ WebSocket: ws://${config.server.host}:${config.server.port}/ws`);
    console.log(`  ✓ Started in ${duration}ms`);
    console.log('');
  });

  // 8. 注册优雅关闭
  setupGracefulShutdown(server);
}

bootstrap().catch((error) => {
  logger.error({ error: error.message }, '[Bootstrap] Fatal error during startup');
  process.exit(1);
});