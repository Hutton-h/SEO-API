// ============================================================================
// TokenBucketRateLimiter — 令牌桶限流算法
//
// 原理: 桶以恒定速率填充令牌，每次请求消耗 1 个令牌。
//       桶满时令牌溢出，桶空时请求被拒绝。
//
// 参数:
//   capacity: 桶容量（最大突发请求数），默认 = maxRequests
//   fillRate:  令牌填充速率（每秒），默认 = maxRequests / windowSeconds
//
// 与简单滑动窗口的区别:
//   滑动窗口: 过去 N 秒内最多 M 个请求 → 请求在窗口边界可能被拒绝
//   令牌桶: 允许突发（只要桶里有令牌），平滑限流 → 对短期突发友好
//
// 示例: maxRequests=100, windowSeconds=60
//   → capacity=100, fillRate=100/60≈1.67 tokens/s
//   → 冷启动 100 个请求一次性通过（桶满）
//   → 之后每秒最多 1.67 个请求通过
// ============================================================================

import { redis } from '../redis.js';
import logger from '../logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// 配置
// ═══════════════════════════════════════════════════════════════════════════════

export interface TokenBucketConfig {
  /** 桶容量（最大令牌数） */
  capacity: number;
  /** 令牌填充速率（每秒填充令牌数） */
  fillRate: number;
  /** 令牌桶 key 前缀 */
  keyPrefix?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Lua 脚本: 原子令牌桶操作
// ═══════════════════════════════════════════════════════════════════════════════

const TOKEN_BUCKET_LUA = `
-- KEYS[1]: bucket key
-- ARGV[1]: capacity (最大令牌数)
-- ARGV[2]: fillRate (每秒填充速率)
-- ARGV[3]: now (当前时间戳 ms)
-- ARGV[4]: requested (请求令牌数，默认 1)
-- ARGV[5]: ttl (key 过期时间秒)

local bucketKey = KEYS[1]
local capacity = tonumber(ARGV[1])
local fillRate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4] or 1)
local ttl = tonumber(ARGV[5] or 120)

-- 获取当前桶状态
local data = redis.call('HMGET', bucketKey, 'tokens', 'lastRefill')
local tokens = tonumber(data[1]) or capacity
local lastRefill = tonumber(data[2]) or now

-- 计算自上次填充以来经过的时间
local elapsed = (now - lastRefill) / 1000.0

-- 填充令牌: tokens = min(capacity, tokens + elapsed * fillRate)
local newTokens = math.min(capacity, tokens + elapsed * fillRate)

-- 判断是否满足请求
if newTokens >= requested then
  newTokens = newTokens - requested
  redis.call('HMSET', bucketKey, 'tokens', newTokens, 'lastRefill', now)
  redis.call('EXPIRE', bucketKey, ttl)
  return {1, math.floor(newTokens)}  -- 允许，返回剩余令牌数
else
  -- 计算等待时间
  local waitTime = math.ceil((requested - newTokens) / fillRate * 1000)
  redis.call('HMSET', bucketKey, 'tokens', newTokens, 'lastRefill', now)
  redis.call('EXPIRE', bucketKey, ttl)
  return {0, waitTime}  -- 拒绝，返回等待时间(ms)
end
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 内存降级版令牌桶（Redis 不可用时使用）
// ═══════════════════════════════════════════════════════════════════════════════

class InMemoryTokenBucket {
  private capacity: number;
  private fillRate: number;
  private tokens: number;
  private lastRefill: number;

  constructor(config: TokenBucketConfig) {
    this.capacity = config.capacity;
    this.fillRate = config.fillRate;
    this.tokens = config.capacity; // 初始满桶
    this.lastRefill = Date.now();
  }

  /**
   * 尝试获取令牌
   * @returns {allowed: boolean, remainingTokens: number, waitTimeMs: number}
   */
  tryAcquire(requested: number = 1): { allowed: boolean; remainingTokens: number; waitTimeMs: number } {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000.0;

    // 填充
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.fillRate);
    this.lastRefill = now;

    if (this.tokens >= requested) {
      this.tokens -= requested;
      return { allowed: true, remainingTokens: Math.floor(this.tokens), waitTimeMs: 0 };
    }

    const waitTimeMs = Math.ceil((requested - this.tokens) / this.fillRate * 1000);
    return { allowed: false, remainingTokens: Math.floor(this.tokens), waitTimeMs };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TokenBucketRateLimiter 类
// ═══════════════════════════════════════════════════════════════════════════════

export class TokenBucketRateLimiter {
  private buckets = new Map<string, InMemoryTokenBucket>();
  private luaSha: string | null = null;
  private luaLoaded: boolean = false;

  /**
   * 尝试获取令牌。优先使用 Redis 原子操作，降级到内存。
   *
   * @param key 桶标识（如 provider:dataforseo:serp）
   * @param config 令牌桶配置
   * @param requested 请求令牌数
   * @returns 是否允许 + 剩余令牌 + 等待时间
   */
  async tryAcquire(
    key: string,
    config: TokenBucketConfig,
    requested: number = 1,
  ): Promise<{ allowed: boolean; remainingTokens: number; waitTimeMs: number }> {
    // 尝试 Redis 原子操作
    try {
      return await this.redisAcquire(key, config, requested);
    } catch (error) {
      // Redis 不可用，降级到内存
      logger.debug({ key, error: (error as Error).message }, '[TokenBucket] Redis unavailable, falling back to memory');
      return this.memoryAcquire(key, config, requested);
    }
  }

  /**
   * 获取桶当前状态
   */
  getBucketState(key: string): { tokens: number; capacity: number; fillRate: number } | null {
    const bucket = this.buckets.get(key);
    if (!bucket) return null;
    // 触发一次填充以获取最新状态
    const result = bucket.tryAcquire(0);
    return {
      tokens: result.remainingTokens,
      capacity: (bucket as any).capacity,
      fillRate: (bucket as any).fillRate,
    };
  }

  /**
   * 重置桶（清空令牌，重新开始）
   */
  resetBucket(key: string): void {
    this.buckets.delete(key);
    redis.del(`token_bucket:${key}`).catch(() => {});
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 私有方法
  // ═══════════════════════════════════════════════════════════════════════════════

  private async redisAcquire(
    key: string,
    config: TokenBucketConfig,
    requested: number,
  ): Promise<{ allowed: boolean; remainingTokens: number; waitTimeMs: number }> {
    const bucketKey = `token_bucket:${config.keyPrefix || 'default'}:${key}`;
    const now = Date.now();

    // 首次加载 Lua 脚本
    if (!this.luaLoaded) {
      try {
        this.luaSha = await (redis as any).script('LOAD', TOKEN_BUCKET_LUA) as string;
        this.luaLoaded = true;
      } catch {
        // 部分 Redis 版本不支持 script load，使用 EVAL
        this.luaLoaded = true;
      }
    }

    let result: [number, number];
    if (this.luaSha) {
      result = await (redis as any).evalsha(
        this.luaSha, 1, bucketKey,
        config.capacity, config.fillRate, now, requested, 120
      ) as [number, number];
    } else {
      result = await (redis as any).eval(
        TOKEN_BUCKET_LUA, 1, bucketKey,
        config.capacity, config.fillRate, now, requested, 120
      ) as [number, number];
    }

    return {
      allowed: result[0] === 1,
      remainingTokens: result[1],
      waitTimeMs: result[0] === 0 ? result[1] : 0,
    };
  }

  private memoryAcquire(
    key: string,
    config: TokenBucketConfig,
    requested: number,
  ): { allowed: boolean; remainingTokens: number; waitTimeMs: number } {
    if (!this.buckets.has(key)) {
      this.buckets.set(key, new InMemoryTokenBucket(config));
    }
    return this.buckets.get(key)!.tryAcquire(requested);
  }
}

// 全局单例
export const rateLimiter = new TokenBucketRateLimiter();