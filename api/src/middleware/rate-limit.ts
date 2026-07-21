// ============================================================================
// Redis 滑动窗口限流中间件
// ============================================================================

import type { Request, Response, NextFunction } from 'express';
import { redis } from '../redis.js';
import { RateLimitError } from '../errors.js';
import logger from '../logger.js';

export interface RateLimitOptions {
  /** 时间窗口 (秒)，默认 60 */
  windowSeconds?: number;
  /** 窗口内最大请求数，默认 100 */
  maxRequests?: number;
  /** 标识客户端的方式，默认 'ip' */
  keyType?: 'ip' | 'user' | 'api-key';
}

export function rateLimit(options: RateLimitOptions = {}) {
  const { windowSeconds = 60, maxRequests = 100, keyType = 'ip' } = options;

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      let key = 'rate_limit:';

      if (keyType === 'user') {
        key += req.user?.id ?? 'anonymous';
      } else if (keyType === 'api-key') {
        key += (req.headers['x-api-key'] as string) ?? 'anonymous';
      } else {
        // 默认: IP 限流 (X-Forwarded-For 优先)
        const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
        key += ip;
      }

      // 滑动窗口: 使用 Redis sorted set
      const now = Date.now();
      const windowStart = now - windowSeconds * 1000;

      // 移除窗口外的旧记录
      await redis.zremrangebyscore(key, 0, windowStart);

      // 获取窗口内请求数
      const count = await redis.zcard(key);

      if (count >= maxRequests) {
        const retryAfter = windowSeconds;
        throw new RateLimitError(
          `Rate limit exceeded: ${maxRequests} requests per ${windowSeconds}s`,
          retryAfter,
        );
      }

      // 记录本次请求
      await redis.zadd(key, now, `${now}-${Math.random().toString(36).slice(2, 8)}`);

      // 设置过期时间
      await redis.expire(key, windowSeconds + 10);

      next();
    } catch (error) {
      if (error instanceof RateLimitError) {
        next(error);
        return;
      }
      logger.warn({ error: (error as Error).message }, '[RateLimit] Redis error, allowing request');
      next(); // Redis 故障时放行
    }
  };
}