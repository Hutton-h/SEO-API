// ============================================================================
// App 工厂: Express 应用 + 中间件链 + 路由注册
// ============================================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import config from '../config.js';
import { requestIdMiddleware } from '../middleware/request-id.js';
import { metricsMiddleware, metricsEndpoint } from './metrics.js';
import { errorHandlerMiddleware } from '../middleware/error-handler.js';

export function createApp(): express.Application {
  const app = express();

  // ── 基础中间件 ────────────────────────────────────────────────────────
  app.use(requestIdMiddleware);
  app.use(metricsMiddleware);
  app.use(helmet());
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id', 'Retry-After'],
    maxAge: 86400,
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // 请求日志
  if (config.server.nodeEnv !== 'test') {
    app.use(morgan('short'));
  }

  // ── 健康检查 ──────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // ── 指标端点 ──────────────────────────────────────────────────────────
  app.get('/metrics', metricsEndpoint);

  // ── 路由注册 (由 main.ts 调用) ─────────────────────────────────────────
  // 注意: 路由注册在 main.ts 中通过 registerRoutes() 完成
  // 这里只保留基础结构

  // ── 404 处理 ──────────────────────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route not found: ${req.method} ${req.originalUrl}`,
      },
      meta: {
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      },
    });
  });

  // ── 全局错误处理 ──────────────────────────────────────────────────────
  app.use(errorHandlerMiddleware);

  return app;
}