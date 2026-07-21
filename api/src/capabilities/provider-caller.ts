// ============================================================================
// ProviderCaller — 统一调用保护层
//
// 执行链: 限流 → 熔断器 → 执行 → 重试(指数退避) → 回退(fallback) → 指标记录
//
// 这是 03-A 能力层的核心编排器，融合了 02-B 的所有保护机制:
//   1. 令牌桶限流 (rateLimiter)
//   2. 熔断器 (CircuitBreaker)
//   3. 指数退避重试 (retryWithBackoff)
//   4. 多 Provider 回退 (ProviderSelector)
//   5. 指标记录 (ProviderMetrics)
//   6. 去重 (dedup on write ops)
//
// 使用方式:
//   const result = await providerCaller.call('serp', 'getSerp', [params], options);
//   // 等价于: 自动选择最佳 Provider → 限流 → 熔断 → 执行 → 重试 → 回退 → 记录
// ============================================================================

import type { CapabilityName, CapabilityMap, IBaseProvider } from './interfaces.js';
import { ProviderStatus, ProviderError } from './interfaces.js';
import { providerSelector } from './provider-selector.js';
import { getOrCreateMetrics } from './provider-metrics.js';
import { rateLimiter } from './rate-limiter.js';
import { CircuitBreaker } from '../infra/circuit-breaker.js';
import { retryWithBackoff } from '../infra/retry.js';
import { cache } from '../infra/cache.js';
import { redis } from '../redis.js';
import logger from '../logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

export interface CallOptions {
  /** 最大重试次数，默认 2 */
  maxRetries?: number;
  /** 是否启用回退 Provider（失败时尝试下一个），默认 true */
  enableFallback?: boolean;
  /** 最多尝试几个 Provider（含首选），默认 3 */
  maxFallbackProviders?: number;
  /** 是否启用去重（仅写操作），默认 false */
  dedup?: boolean;
  /** 去重窗口（秒），默认 30 */
  dedupWindowSeconds?: number;
  /** 缓存类别（设置则启用缓存），默认 undefined（不缓存） */
  cacheCategory?: string;
  /** 缓存 TTL 覆盖（秒） */
  cacheTtl?: number;
  /** 是否记录调用 */
  trackMetrics?: boolean;
  /** 请求 ID（用于链路追踪） */
  requestId?: string;
}

export interface CallResult<T> {
  /** 返回数据 */
  data: T;
  /** 使用的 Provider 名称 */
  providerName: string;
  /** 使用的 Provider 能力 */
  capability: CapabilityName;
  /** 是否来自缓存 */
  fromCache: boolean;
  /** 是否来自回退 Provider */
  fromFallback: boolean;
  /** 尝试过的 Provider 列表 */
  attemptedProviders: string[];
  /** 总耗时 (ms) */
  durationMs: number;
  /** 成本 (USD) */
  costUsd: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 去重 key 生成
// ═══════════════════════════════════════════════════════════════════════════════

function buildDedupKey(
  capability: CapabilityName,
  method: string,
  args: unknown[],
): string {
  const argsStr = JSON.stringify(args);
  // 简单哈希
  let hash = 0;
  for (let i = 0; i < argsStr.length; i++) {
    const char = argsStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // 32-bit
  }
  return `call:${capability}:${method}:${Math.abs(hash)}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 熔断器注册表
// ═══════════════════════════════════════════════════════════════════════════════

const circuitBreakers = new Map<string, CircuitBreaker>();

function getCircuitBreaker(providerName: string): CircuitBreaker {
  if (!circuitBreakers.has(providerName)) {
    circuitBreakers.set(
      providerName,
      new CircuitBreaker(providerName, {
        windowMs: 60000,
        failureThreshold: 5,
        resetTimeoutMs: 60000,
        halfOpenMaxAttempts: 1,
      }),
    );
  }
  return circuitBreakers.get(providerName)!;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ProviderCaller 类
// ═══════════════════════════════════════════════════════════════════════════════

export class ProviderCaller {
  /**
   * 统一调用入口
   *
   * @param capability 能力名称 (如 'serp', 'keywordData')
   * @param method 方法名 (如 'getSerp', 'getVolume')
   * @param args 方法参数
   * @param options 调用选项
   */
  async call<C extends CapabilityName>(
    capability: C,
    method: string & keyof CapabilityMap[C],
    args: unknown[],
    options: CallOptions = {},
  ): Promise<CallResult<unknown>> {
    const startTime = Date.now();
    const {
      maxRetries = 2,
      enableFallback = true,
      maxFallbackProviders = 3,
      dedup: enableDedup = false,
      dedupWindowSeconds = 30,
      cacheCategory,
      cacheTtl,
      trackMetrics = true,
      requestId,
    } = options;

    const attemptedProviders: string[] = [];
    let totalCostUsd = 0;

    // ── 去重检查 ──────────────────────────────────────────────────────────
    if (enableDedup) {
      const dedupKey = buildDedupKey(capability, method, args);
      const acquired = await redis.set(`dedup:${dedupKey}`, '1', 'NX', 'EX', dedupWindowSeconds);
      if (!acquired) {
        throw new ProviderError(
          'dedup',
          `${capability}.${method}`,
          'Duplicate request detected',
          { isRetryable: false, statusCode: 409 },
        );
      }
    }

    // ── 缓存检查 ──────────────────────────────────────────────────────────
    if (cacheCategory) {
      const cacheKey = `provider:${capability}:${method}:${JSON.stringify(args)}`;
      const cached = await cache.get(cacheKey, cacheCategory);
      if (cached !== null) {
        return {
          data: cached,
          providerName: 'cache',
          capability,
          fromCache: true,
          fromFallback: false,
          attemptedProviders: [],
          durationMs: Date.now() - startTime,
          costUsd: 0,
        };
      }
    }

    // ── 选择 Provider 列表 ────────────────────────────────────────────────
    const candidates = enableFallback
      ? providerSelector.selectAll(capability).slice(0, maxFallbackProviders)
      : providerSelector.selectBest(capability)
        ? [providerSelector.selectBest(capability)!]
        : [];

    if (candidates.length === 0) {
      throw new ProviderError(
        'none',
        `${capability}.${method}`,
        `No available provider for capability: ${capability}`,
        { isRetryable: false, statusCode: 503 },
      );
    }

    // ── 逐个尝试 Provider ─────────────────────────────────────────────────
    let lastError: Error | null = null;

    for (let i = 0; i < candidates.length; i++) {
      const { provider, score } = candidates[i];
      const metrics = getOrCreateMetrics(provider.name);
      attemptedProviders.push(provider.name);

      // 跳过不可用的 Provider
      if (metrics.status === ProviderStatus.UNAVAILABLE || metrics.status === ProviderStatus.SHUTDOWN) {
        logger.debug(
          { provider: provider.name, status: metrics.status },
          '[ProviderCaller] Skipping unavailable provider',
        );
        continue;
      }

      try {
        const result = await this.executeWithProtection(
          provider,
          method,
          args,
          { maxRetries, trackMetrics },
        );

        const durationMs = Date.now() - startTime;
        totalCostUsd = provider.costPerCall;

        // 写入缓存
        if (cacheCategory && result !== null) {
          const cacheKey = `provider:${capability}:${method}:${JSON.stringify(args)}`;
          await cache.set(cacheKey, result, cacheCategory);
        }

        return {
          data: result,
          providerName: provider.name,
          capability,
          fromCache: false,
          fromFallback: i > 0,
          attemptedProviders,
          durationMs,
          costUsd: totalCostUsd,
        };
      } catch (error: any) {
        lastError = error;
        logger.warn(
          {
            provider: provider.name,
            capability,
            method,
            error: error?.message,
            attempt: i + 1,
            total: candidates.length,
            requestId,
          },
          `[ProviderCaller] ${provider.name} failed, attempting fallback ${i + 1}/${candidates.length}`,
        );

        if (trackMetrics) {
          const m = getOrCreateMetrics(provider.name);
          m.recordCall(false, provider.costPerCall);
        }
      }
    }

    // ── 所有 Provider 都失败了 ────────────────────────────────────────────
    throw new ProviderError(
      'all',
      `${capability}.${method}`,
      `All providers failed for ${capability}.${method}: ${lastError?.message || 'Unknown error'}`,
      { isRetryable: false, statusCode: 503, cause: lastError || undefined },
    );
  }

  /**
   * 用熔断器 + 限流 + 重试包装单次 Provider 调用
   */
  private async executeWithProtection(
    provider: IBaseProvider,
    method: string,
    args: unknown[],
    options: { maxRetries: number; trackMetrics: boolean },
  ): Promise<unknown> {
    const circuitBreaker = getCircuitBreaker(provider.name);
    const metrics = getOrCreateMetrics(provider.name);

    return circuitBreaker.execute(async () => {
      // ── 令牌桶限流 ────────────────────────────────────────────────────
      const bucketResult = await rateLimiter.tryAcquire(
        `${provider.name}:${method}`,
        {
          capacity: provider.rateLimit.max,
          fillRate: provider.rateLimit.max / (provider.rateLimit.windowMs / 1000),
          keyPrefix: 'provider',
        },
      );

      if (!bucketResult.allowed) {
        throw new ProviderError(
          provider.name,
          method,
          `Rate limit exceeded, retry after ${bucketResult.waitTimeMs}ms`,
          { isRetryable: true, statusCode: 429 },
        );
      }

      // ── 执行（带重试） ──────────────────────────────────────────────────
      const result = await retryWithBackoff(
        async () => {
          const start = Date.now();
          // eslint-disable-next-line @typescript-eslint/ban-types
          const fn = (provider as any)[method] as Function;
          if (typeof fn !== 'function') {
            throw new ProviderError(
              provider.name,
              method,
              `Method ${method} not found on provider ${provider.name}`,
              { isRetryable: false },
            );
          }
          const data = await fn.apply(provider, args);
          const latency = Date.now() - start;

          // 记录延迟
          metrics.recordLatency(latency);

          return data;
        },
        {
          maxRetries: options.maxRetries,
          baseDelayMs: 1000,
          maxDelayMs: 30000,
          jitterMs: 500,
          retryableErrors: ['ProviderError', 'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED'],
        },
      );

      // ── 记录成功 ──────────────────────────────────────────────────────
      if (options.trackMetrics) {
        metrics.recordCall(true, provider.costPerCall);
      }

      return result;
    });
  }

  /**
   * 批量调用（并行执行，每个调用独立保护）
   */
  async callBatch<C extends CapabilityName>(
    capability: C,
    method: string & keyof CapabilityMap[C],
    batchArgs: unknown[][],
    options: CallOptions = {},
  ): Promise<Array<CallResult<unknown> | { error: string }>> {
    const results = await Promise.allSettled(
      batchArgs.map(args => this.call(capability, method, args, options)),
    );

    return results.map(r =>
      r.status === 'fulfilled'
        ? r.value
        : { error: r.reason?.message || 'Unknown error' },
    );
  }

  /**
   * 获取所有 Provider 的调用统计
   */
  getStats() {
    const stats: Record<string, unknown> = {};
    for (const [name, metrics] of (await import('./provider-metrics.js')).metricsRegistry) {
      stats[name] = metrics.snapshot();
    }
    return stats;
  }
}

// 全局单例
export const providerCaller = new ProviderCaller();