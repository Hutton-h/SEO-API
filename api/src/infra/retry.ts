// ============================================================================
// 指数退避重试
// ============================================================================

import logger from '../logger.js';

export interface RetryOptions {
  /** 最大重试次数，默认 3 */
  maxRetries?: number;
  /** 基础延迟 (ms)，默认 1000 */
  baseDelayMs?: number;
  /** 退避因子，默认 2 */
  factor?: number;
  /** 最大延迟 (ms)，默认 30000 */
  maxDelayMs?: number;
  /** 随机抖动 (ms)，默认 500 */
  jitterMs?: number;
  /** 仅重试指定错误类型的错误名列表 */
  retryableErrors?: string[];
}

/**
 * 带指数退避的重试执行
 *
 * 延迟公式: delay = min(baseDelay × factor^attempt + random(0, jitter), maxDelay)
 *
 * @example
 * const data = await retryWithBackoff(() => fetch('https://api.example.com'), {
 *   maxRetries: 3,
 *   retryableErrors: ['ECONNRESET', 'ETIMEDOUT'],
 * });
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    factor = 2,
    maxDelayMs = 30000,
    jitterMs = 500,
    retryableErrors,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // 如果指定了可重试错误类型，检查是否匹配
      if (retryableErrors && retryableErrors.length > 0) {
        const errorName = error?.name || error?.code || '';
        if (!retryableErrors.includes(errorName)) {
          throw error; // 不可重试的错误直接抛出
        }
      }

      // 最后一次尝试不再等待
      if (attempt === maxRetries) {
        break;
      }

      // 计算延迟: baseDelay × factor^attempt + random(0, jitter)
      const jitter = Math.floor(Math.random() * jitterMs);
      const delay = Math.min(
        baseDelayMs * Math.pow(factor, attempt) + jitter,
        maxDelayMs,
      );

      logger.warn(
        {
          attempt: attempt + 1,
          maxRetries,
          delayMs: delay,
          error: error?.message,
        },
        `[Retry] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms`,
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}