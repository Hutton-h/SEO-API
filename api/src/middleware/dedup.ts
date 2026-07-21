// ============================================================================
// 请求去重中间件
// 基于请求方法+路径+body hash 的 Redis 去重，防止重复提交
// ============================================================================

import type { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { redis } from '../redis.js';
import logger from '../logger.js';

export interface DedupOptions {
  /** 去重窗口 (秒)，默认 10 */
  windowSeconds?: number;
  /** 是否对 GET 请求去重，默认 false */
  includeGet?: boolean;
}

export function dedup(options: DedupOptions = {}) {
  const { windowSeconds = 10, includeGet = false } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // GET/HEAD/OPTIONS 请求默认不去重
    if (!includeGet && ['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      next();
      return;
    }

    try {
      // 构建去重 key: dedup:{method}:{path}:{body_hash}
      const bodyHash = req.body
        ? createHash('md5').update(JSON.stringify(req.body)).digest('hex').slice(0, 16)
        : 'no-body';
      const key = `dedup:${req.method}:${req.originalUrl}:${bodyHash}`;

      // 使用 SET NX EX 原子操作
      const acquired = await redis.set(key, '1', 'NX', 'EX', windowSeconds);

      if (!acquired) {
        // 重复请求
        res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_REQUEST',
            message: 'This request was already submitted recently',
          },
          meta: {
            requestId: req.requestId,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      next();
    } catch (error) {
      logger.warn({ error: (error as Error).message }, '[Dedup] Redis error, allowing request');
      next(); // Redis 故障时放行
    }
  };
}