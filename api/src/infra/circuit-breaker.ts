// ============================================================================
// 滑动窗口熔断器
// 不是简单计数器，而是存储失败时间戳数组，过滤窗口外的旧数据
// ============================================================================

import { CircuitOpenError } from '../errors.js';

// 熔断器状态
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitStats {
  state: CircuitState;
  failuresInWindow: number;
  lastFailureTime: number | null;
  nextRetryTime: number | null;
}

export class CircuitBreaker {
  public readonly name: string;
  private readonly windowMs: number;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly halfOpenMaxAttempts: number;

  private state: CircuitState = 'CLOSED';
  private failureTimestamps: number[] = [];
  private halfOpenAttempts: number = 0;
  private openedAt: number = 0;

  constructor(
    name: string,
    options: {
      windowMs?: number;
      failureThreshold?: number;
      resetTimeoutMs?: number;
      halfOpenMaxAttempts?: number;
    } = {},
  ) {
    this.name = name;
    this.windowMs = options.windowMs ?? 60000;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 60000;
    this.halfOpenMaxAttempts = options.halfOpenMaxAttempts ?? 1;
  }

  /**
   * 在熔断器保护下执行函数
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.cleanupOldFailures();

    if (this.state === 'OPEN') {
      if (Date.now() - this.openedAt >= this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        this.halfOpenAttempts = 0;
        console.log(`[CircuitBreaker:${this.name}] Transition: OPEN → HALF_OPEN`);
      } else {
        const retryAfter = Math.ceil((this.resetTimeoutMs - (Date.now() - this.openedAt)) / 1000);
        throw new CircuitOpenError(this.name, retryAfter);
      }
    }

    if (this.state === 'HALF_OPEN' && this.halfOpenAttempts >= this.halfOpenMaxAttempts) {
      throw new CircuitOpenError(this.name, Math.ceil(this.resetTimeoutMs / 1000));
    }

    if (this.state === 'HALF_OPEN') {
      this.halfOpenAttempts++;
    }

    try {
      const result = await fn();
      // 成功 → 恢复
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failureTimestamps = [];
        console.log(`[CircuitBreaker:${this.name}] Transition: HALF_OPEN → CLOSED (success)`);
      }
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * 记录一次失败
   */
  private recordFailure(): void {
    this.failureTimestamps.push(Date.now());
    this.cleanupOldFailures();

    if (this.failureTimestamps.length >= this.failureThreshold) {
      this.state = 'OPEN';
      this.openedAt = Date.now();
      console.warn(
        `[CircuitBreaker:${this.name}] Transition: ${this.state === 'HALF_OPEN' ? 'HALF_OPEN' : 'CLOSED'} → OPEN ` +
        `(${this.failureTimestamps.length} failures in ${this.windowMs}ms)`,
      );
    }
  }

  /**
   * 清除窗口外的旧失败时间戳
   */
  private cleanupOldFailures(): void {
    const cutoff = Date.now() - this.windowMs;
    this.failureTimestamps = this.failureTimestamps.filter((ts) => ts > cutoff);
  }

  /**
   * 获取窗口内的失败次数
   */
  getFailuresInWindow(): number {
    this.cleanupOldFailures();
    return this.failureTimestamps.length;
  }

  /**
   * 获取当前状态
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * 获取统计信息
   */
  getStats(): CircuitStats {
    this.cleanupOldFailures();
    return {
      state: this.state,
      failuresInWindow: this.failureTimestamps.length,
      lastFailureTime: this.failureTimestamps.length > 0
        ? this.failureTimestamps[this.failureTimestamps.length - 1]
        : null,
      nextRetryTime: this.state === 'OPEN'
        ? this.openedAt + this.resetTimeoutMs
        : null,
    };
  }
}

// 全局熔断器注册表
export const circuitBreakers = new Map<string, CircuitBreaker>();

export function getOrCreateCircuitBreaker(
  name: string,
  options?: Parameters<CircuitBreaker['constructor']>[1],
): CircuitBreaker {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, new CircuitBreaker(name, options));
  }
  return circuitBreakers.get(name)!;
}