// ============================================================================
// HealthChecker — 自适应健康检查调度器
//
// 算法: 自适应间隔
//   - 健康 Provider: 检查间隔逐渐增长（指数退避的反向），最大 5 分钟
//   - 不健康 Provider: 检查间隔缩短，最小 10 秒
//   - 刚恢复的 Provider: 密集检查 3 次，确认稳定后恢复正常间隔
//
// 间隔公式:
//   healthyCount=0 → 10s  (快速探测)
//   healthyCount=1 → 15s  (确认中)
//   healthyCount=2 → 30s  (确认中)
//   healthyCount=3 → 60s  (稳定)
//   healthyCount≥4 → min(60 × 2^(healthyCount-4), 300)  (指数增长，上限 5min)
//
// 故障时:
//   连续失败 1 次 → 间隔减半
//   连续失败 3 次 → 间隔降到 10s
// ============================================================================

import type { IBaseProvider, ProviderHealth } from './interfaces.js';
import { ProviderStatus } from './interfaces.js';
import { getOrCreateMetrics } from './provider-metrics.js';
import logger from '../logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// 配置常量
// ═══════════════════════════════════════════════════════════════════════════════

const MIN_INTERVAL_MS = 10_000;    // 最小检查间隔: 10s
const MAX_INTERVAL_MS = 300_000;   // 最大检查间隔: 5min
const BASE_INTERVAL_MS = 30_000;   // 基础间隔: 30s
const STABILIZE_CHECKS = 3;        // 恢复后确认次数
const DEGRADE_THRESHOLD = 3;       // 连续失败次数阈值（触发降级）
const QUOTA_WARN_PERCENT = 10;     // 配额低于 10% 时告警

// ═══════════════════════════════════════════════════════════════════════════════
// HealthChecker 类
// ═══════════════════════════════════════════════════════════════════════════════

export class HealthChecker {
  private providers = new Map<string, IBaseProvider>();
  private timers = new Map<string, NodeJS.Timeout>();
  private healthyCount = new Map<string, number>();     // 连续健康次数
  private consecutiveFailures = new Map<string, number>(); // 连续失败次数
  private onHealthChange?: (providerName: string, health: ProviderHealth) => void;

  /**
   * 注册一个 Provider 并开始健康检查
   */
  register(provider: IBaseProvider, onHealthChange?: (name: string, h: ProviderHealth) => void): void {
    this.providers.set(provider.name, provider);
    this.healthyCount.set(provider.name, 0);
    this.consecutiveFailures.set(provider.name, 0);

    if (onHealthChange) {
      this.onHealthChange = onHealthChange;
    }

    // 立即执行首次检查
    this.check(provider.name);
  }

  /**
   * 注销一个 Provider
   */
  unregister(providerName: string): void {
    this.providers.delete(providerName);
    this.healthyCount.delete(providerName);
    this.consecutiveFailures.delete(providerName);

    const timer = this.timers.get(providerName);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(providerName);
    }
  }

  /**
   * 立即执行一次检查（不等待定时器）
   */
  async checkNow(providerName: string): Promise<ProviderHealth> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider not found: ${providerName}`);
    }
    return this.check(providerName);
  }

  /**
   * 获取 Provider 当前健康状态
   */
  getHealth(providerName: string): ProviderHealth | null {
    const metrics = getOrCreateMetrics(providerName);
    return metrics.lastHealthCheck;
  }

  /**
   * 获取所有 Provider 健康状态
   */
  getAllHealth(): Record<string, ProviderHealth | null> {
    const result: Record<string, ProviderHealth | null> = {};
    for (const name of this.providers.keys()) {
      result[name] = this.getHealth(name);
    }
    return result;
  }

  /**
   * 停止所有健康检查
   */
  shutdown(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    logger.info('[HealthChecker] All health checks stopped');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 私有: 核心检查逻辑
  // ═══════════════════════════════════════════════════════════════════════════════

  private async check(providerName: string): Promise<ProviderHealth> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider not found: ${providerName}`);
    }

    const metrics = getOrCreateMetrics(providerName);
    const startTime = Date.now();

    let health: ProviderHealth;

    try {
      health = await provider.healthCheck();
      health.responseTimeMs = Date.now() - startTime;

      // 记录延迟
      metrics.recordLatency(health.responseTimeMs);

      // 更新状态
      this.onHealthy(providerName, health);
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      health = {
        healthy: false,
        status: ProviderStatus.DEGRADED,
        lastChecked: new Date().toISOString(),
        responseTimeMs: responseTime,
        error: error?.message || 'Health check failed',
      };

      this.onUnhealthy(providerName, health);
    }

    // 更新配额
    if (health.quotaRemaining !== undefined) {
      metrics.recordQuota(health.quotaRemaining);
    }

    metrics.updateStatus(health);

    // 通知健康状态变化
    if (this.onHealthChange) {
      this.onHealthChange(providerName, health);
    }

    // 调度下一次检查
    this.scheduleNext(providerName);

    return health;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 私有: 健康→间隔增长
  // ═══════════════════════════════════════════════════════════════════════════════

  private onHealthy(providerName: string, health: ProviderHealth): void {
    const count = (this.healthyCount.get(providerName) || 0) + 1;
    this.healthyCount.set(providerName, count);
    this.consecutiveFailures.set(providerName, 0);

    // 配额告警
    if (health.quotaRemaining !== undefined && health.quotaRemaining < QUOTA_WARN_PERCENT) {
      logger.warn(
        { provider: providerName, quotaRemaining: health.quotaRemaining },
        `[HealthChecker] ${providerName} quota low: ${health.quotaRemaining}%`,
      );
    }

    // 恢复后密集确认
    if (count <= STABILIZE_CHECKS) {
      logger.info(
        { provider: providerName, stableCheck: count, total: STABILIZE_CHECKS },
        `[HealthChecker] ${providerName} recovering, stabilization check ${count}/${STABILIZE_CHECKS}`,
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 私有: 不健康→间隔缩短
  // ═══════════════════════════════════════════════════════════════════════════════

  private onUnhealthy(providerName: string, health: ProviderHealth): void {
    this.healthyCount.set(providerName, 0);
    const failures = (this.consecutiveFailures.get(providerName) || 0) + 1;
    this.consecutiveFailures.set(providerName, failures);

    if (failures >= DEGRADE_THRESHOLD) {
      logger.error(
        { provider: providerName, consecutiveFailures: failures, error: health.error },
        `[HealthChecker] ${providerName} degraded after ${failures} consecutive failures`,
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 私有: 自适应间隔计算
  // ═══════════════════════════════════════════════════════════════════════════════

  private computeInterval(providerName: string): number {
    const healthy = this.healthyCount.get(providerName) || 0;
    const failures = this.consecutiveFailures.get(providerName) || 0;

    // 连续失败: 间隔快速缩短
    if (failures > 0) {
      // failures=1 → BASE/2, failures=2 → BASE/4, failures≥3 → MIN
      const divisor = Math.pow(2, failures);
      return Math.max(MIN_INTERVAL_MS, Math.floor(BASE_INTERVAL_MS / divisor));
    }

    // 恢复中: 固定短间隔
    if (healthy <= STABILIZE_CHECKS) {
      const stabilizeIntervals = [MIN_INTERVAL_MS, 15_000, 30_000];
      return stabilizeIntervals[Math.min(healthy, stabilizeIntervals.length - 1)];
    }

    // 稳定: 指数增长
    const growthCycles = healthy - STABILIZE_CHECKS;
    const interval = Math.min(
      BASE_INTERVAL_MS * Math.pow(2, growthCycles),
      MAX_INTERVAL_MS,
    );
    return interval;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 私有: 调度下一次检查
  // ═══════════════════════════════════════════════════════════════════════════════

  private scheduleNext(providerName: string): void {
    // 清除旧定时器
    const oldTimer = this.timers.get(providerName);
    if (oldTimer) {
      clearTimeout(oldTimer);
    }

    const interval = this.computeInterval(providerName);
    const timer = setTimeout(() => {
      this.check(providerName).catch(err => {
        logger.error({ provider: providerName, error: err.message }, '[HealthChecker] Check failed');
      });
    }, interval);

    this.timers.set(providerName, timer);

    logger.debug(
      { provider: providerName, intervalMs: interval, healthyCount: this.healthyCount.get(providerName) },
      `[HealthChecker] Next check for ${providerName} in ${interval}ms`,
    );
  }
}

// 全局单例
export const healthChecker = new HealthChecker();