// ============================================================================
// 优雅关闭
// 按顺序关闭: HTTP Server → WebSocket → Queue → Redis → Database
// ============================================================================

import type { Server } from 'http';
import logger from '../logger.js';
import { closeConnection as closeDb } from '../db.js';
import { redis } from '../redis.js';
import { shutdown as shutdownQueue } from '../infra/queue.js';
import { wsService } from '../infra/websocket.js';

const SHUTDOWN_TIMEOUT_MS = 10000; // 10s 超时
let isShuttingDown = false;

export function setupGracefulShutdown(server: Server): void {
  async function shutdown(signal: string): Promise<void> {
    if (isShuttingDown) {
      logger.warn('[Shutdown] Already shutting down, ignoring signal');
      return;
    }
    isShuttingDown = true;

    logger.info(`[Shutdown] Received ${signal}, starting graceful shutdown...`);
    const startTime = Date.now();

    // 超时强制退出
    const forceExit = setTimeout(() => {
      logger.error('[Shutdown] Timeout exceeded, force exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);

    // 1. 停止接受新请求
    server.close(() => {
      logger.info('[Shutdown] HTTP server closed');
    });

    // 2. 关闭 WebSocket
    try {
      wsService.shutdown();
      logger.info('[Shutdown] WebSocket closed');
    } catch (error) {
      logger.error({ error }, '[Shutdown] Error closing WebSocket');
    }

    // 3. 关闭队列
    try {
      await shutdownQueue();
      logger.info('[Shutdown] Queues closed');
    } catch (error) {
      logger.error({ error }, '[Shutdown] Error closing queues');
    }

    // 4. 关闭 Redis
    try {
      await redis.quit();
      logger.info('[Shutdown] Redis closed');
    } catch (error) {
      logger.error({ error }, '[Shutdown] Error closing Redis');
    }

    // 5. 关闭数据库
    try {
      await closeDb();
      logger.info('[Shutdown] Database closed');
    } catch (error) {
      logger.error({ error }, '[Shutdown] Error closing database');
    }

    clearTimeout(forceExit);
    const duration = Date.now() - startTime;
    logger.info(`[Shutdown] Graceful shutdown completed in ${duration}ms`);
    process.exit(0);
  }

  // 注册信号处理
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // 未捕获异常
  process.on('uncaughtException', (error: Error) => {
    logger.error({ error: error.message, stack: error.stack }, '[Shutdown] Uncaught exception');
    shutdown('uncaughtException').catch(() => process.exit(1));
  });

  process.on('unhandledRejection', (reason: unknown) => {
    logger.error({ reason }, '[Shutdown] Unhandled rejection');
  });

  logger.info('[Shutdown] Graceful shutdown handlers registered');
}