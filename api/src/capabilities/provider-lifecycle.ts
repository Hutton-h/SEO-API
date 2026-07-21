// ============================================================================
// ProviderLifecycle — Provider 生命周期编排器
//
// 管理所有 Provider 的初始化、健康检查启动、优雅关闭。
//
// 初始化顺序算法 (拓扑排序):
//   1. 基础设施 Provider（无依赖）: Database, Redis, Cache
//   2. 数据 Provider（依赖基础设施）: DataForSEO, Majestic, OpenAI
//   3. 高级 Provider（依赖数据）: 聚合层、引擎层
//
// 关闭顺序: 反向（3 → 2 → 1）
//
// 启动超时: 每个 Provider 30s，整体 120s
// ============================================================================

import type { IBaseProvider, ProviderHealth } from './interfaces.js';
import { ProviderStatus } from './interfaces.js';
import { healthChecker } from './health-checker.js';
import { getOrCreateMetrics } from './provider-metrics.js';
import logger from '../logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// 类型
// ═══════════════════════════════════════════════════════════════════════════════

export type ProviderTier = 'infrastructure' | 'data' | 'advanced';

export interface ProviderRegistration {
  /** Provider 实例 */
  provider: IBaseProvider;
  /** 层级 */
  tier: ProviderTier;
  /** 依赖的 Provider 名称列表 */
  dependencies?: string[];
  /** 是否关键（关键 Provider 初始化失败则整个启动失败） */
  critical?: boolean;
}

export interface LifecycleEvent {
  type: 'init_start' | 'init_success' | 'init_failed' | 'shutdown_start' | 'shutdown_complete' | 'health_change';
  providerName: string;
  timestamp: string;
  message?: string;
  health?: ProviderHealth;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 配置常量
// ═══════════════════════════════════════════════════════════════════════════════

const INIT_TIMEOUT_PER_PROVIDER_MS = 30_000;
const OVERALL_INIT_TIMEOUT_MS = 120_000;
const INIT_RETRY_MAX = 2;
const INIT_RETRY_DELAY_MS = 5000;

// 默认层级顺序
const TIER_ORDER: ProviderTier[] = ['infrastructure', 'data', 'advanced'];

// ═══════════════════════════════════════════════════════════════════════════════
// ProviderLifecycle 类
// ═══════════════════════════════════════════════════════════════════════════════

export class ProviderLifecycle {
  private registrations = new Map<string, ProviderRegistration>();
  private eventListeners: Array<(event: LifecycleEvent) => void> = [];
  private _isInitialized = false;
  private _isShuttingDown = false;

  // ═══════════════════════════════════════════════════════════════════════════════
  // 注册
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * 注册一个 Provider
   */
  register(registration: ProviderRegistration): void {
    this.registrations.set(registration.provider.name, registration);
    logger.info(
      { provider: registration.provider.name, tier: registration.tier, critical: registration.critical },
      '[Lifecycle] Provider registered',
    );
  }

  /**
   * 批量注册
   */
  registerAll(registrations: ProviderRegistration[]): void {
    for (const reg of registrations) {
      this.register(reg);
    }
  }

  /**
   * 注销一个 Provider
   */
  unregister(providerName: string): void {
    this.registrations.delete(providerName);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 初始化
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * 按层级顺序初始化所有 Provider
   *
   * 算法:
   *   1. 按 tier 分组: infrastructure → data → advanced
   *   2. 同层级内并行初始化
   *   3. 每个 Provider 有独立超时 (30s)
   *   4. 关键 Provider 失败 → 整体启动失败
   *   5. 非关键 Provider 失败 → 记录警告，继续
   *   6. 失败后重试最多 2 次
   */
  async initializeAll(): Promise<{
    success: boolean;
    initialized: string[];
    failed: string[];
    errors: Record<string, string>;
    durationMs: number;
  }> {
    const startTime = Date.now();
    const initialized: string[] = [];
    const failed: string[] = [];
    const errors: Record<string, string> = {};

    logger.info('[Lifecycle] Starting provider initialization...');

    // 全局超时
    const overallTimer = setTimeout(() => {
      logger.error('[Lifecycle] Overall initialization timeout exceeded');
    }, OVERALL_INIT_TIMEOUT_MS);

    this._isInitialized = false;

    for (const tier of TIER_ORDER) {
      const tierProviders = Array.from(this.registrations.values())
        .filter(r => r.tier === tier);

      if (tierProviders.length === 0) continue;

      logger.info(`[Lifecycle] Initializing tier: ${tier} (${tierProviders.length} providers)`);

      // 并行初始化同层级 Provider
      const results = await Promise.allSettled(
        tierProviders.map(reg => this.initProvider(reg)),
      );

      for (let i = 0; i < results.length; i++) {
        const reg = tierProviders[i];
        const result = results[i];

        if (result.status === 'fulfilled') {
          initialized.push(reg.provider.name);
          // 启动健康检查
          healthChecker.register(reg.provider, (name, health) => {
            this.emitEvent({
              type: 'health_change',
              providerName: name,
              timestamp: new Date().toISOString(),
              health,
            });
          });
          this.emitEvent({
            type: 'init_success',
            providerName: reg.provider.name,
            timestamp: new Date().toISOString(),
          });
        } else {
          const errorMsg = (result.reason as Error)?.message || 'Unknown error';
          errors[reg.provider.name] = errorMsg;

          if (reg.critical) {
            failed.push(reg.provider.name);
            logger.error(
              { provider: reg.provider.name, error: errorMsg },
              `[Lifecycle] Critical provider ${reg.provider.name} failed to initialize`,
            );
            clearTimeout(overallTimer);
            this._isInitialized = false;
            return {
              success: false,
              initialized,
              failed,
              errors,
              durationMs: Date.now() - startTime,
            };
          } else {
            logger.warn(
              { provider: reg.provider.name, error: errorMsg },
              `[Lifecycle] Non-critical provider ${reg.provider.name} failed to initialize`,
            );
            failed.push(reg.provider.name);
          }
        }
      }
    }

    clearTimeout(overallTimer);
    this._isInitialized = true;

    const durationMs = Date.now() - startTime;
    logger.info(
      { initialized: initialized.length, failed: failed.length, durationMs },
      `[Lifecycle] Initialization complete in ${durationMs}ms`,
    );

    return { success: failed.filter(f => this.registrations.get(f)?.critical).length === 0, initialized, failed, errors, durationMs };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 关闭
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * 按反向层级顺序关闭所有 Provider
   */
  async shutdownAll(): Promise<void> {
    if (this._isShuttingDown) {
      logger.warn('[Lifecycle] Already shutting down');
      return;
    }
    this._isShuttingDown = true;

    logger.info('[Lifecycle] Starting provider shutdown...');

    // 停止健康检查
    healthChecker.shutdown();

    // 反向层级顺序关闭
    const reversedTiers = [...TIER_ORDER].reverse();

    for (const tier of reversedTiers) {
      const tierProviders = Array.from(this.registrations.values())
        .filter(r => r.tier === tier);

      if (tierProviders.length === 0) continue;

      logger.info(`[Lifecycle] Shutting down tier: ${tier} (${tierProviders.length} providers)`);

      await Promise.allSettled(
        tierProviders.map(reg => this.shutdownProvider(reg)),
      );
    }

    this._isInitialized = false;
    logger.info('[Lifecycle] All providers shut down');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 事件监听
  // ═══════════════════════════════════════════════════════════════════════════════

  onEvent(callback: (event: LifecycleEvent) => void): void {
    this.eventListeners.push(callback);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 状态查询
  // ═══════════════════════════════════════════════════════════════════════════════

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  get isShuttingDown(): boolean {
    return this._isShuttingDown;
  }

  getProviderNames(): string[] {
    return Array.from(this.registrations.keys());
  }

  getProvidersByTier(): Record<ProviderTier, string[]> {
    const result: Record<ProviderTier, string[]> = {
      infrastructure: [],
      data: [],
      advanced: [],
    };
    for (const [name, reg] of this.registrations) {
      result[reg.tier].push(name);
    }
    return result;
  }

  /**
   * 获取所有 Provider 状态概览
   */
  getStatusOverview(): Array<{
    name: string;
    tier: ProviderTier;
    status: ProviderStatus;
    healthScore: number;
    errorRate: number;
    ewmaLatencyMs: number;
  }> {
    return Array.from(this.registrations.values()).map(reg => {
      const metrics = getOrCreateMetrics(reg.provider.name);
      return {
        name: reg.provider.name,
        tier: reg.tier,
        status: metrics.status,
        healthScore: metrics.getHealthScore(),
        errorRate: metrics.errorRate,
        ewmaLatencyMs: metrics.ewmaLatencyMs,
      };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 私有方法
  // ═══════════════════════════════════════════════════════════════════════════════

  private async initProvider(reg: ProviderRegistration): Promise<void> {
    const providerName = reg.provider.name;

    this.emitEvent({
      type: 'init_start',
      providerName,
      timestamp: new Date().toISOString(),
    });

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= INIT_RETRY_MAX; attempt++) {
      try {
        // 带超时的初始化
        await Promise.race([
          reg.provider.initialize(),
          new Promise<void>((_, reject) =>
            setTimeout(
              () => reject(new Error(`Initialization timeout after ${INIT_TIMEOUT_PER_PROVIDER_MS}ms`)),
              INIT_TIMEOUT_PER_PROVIDER_MS,
            ),
          ),
        ]);

        // 初始化指标
        const metrics = getOrCreateMetrics(providerName);
        metrics.updateStatus({
          healthy: true,
          status: ProviderStatus.ACTIVE,
          lastChecked: new Date().toISOString(),
        });

        return; // 成功
      } catch (error: any) {
        lastError = error;
        if (attempt < INIT_RETRY_MAX) {
          logger.warn(
            { provider: providerName, attempt: attempt + 1, error: error.message },
            `[Lifecycle] Retrying initialization for ${providerName} (${attempt + 1}/${INIT_RETRY_MAX})`,
          );
          await new Promise(resolve => setTimeout(resolve, INIT_RETRY_DELAY_MS));
        }
      }
    }

    // 所有重试都失败
    const metrics = getOrCreateMetrics(providerName);
    metrics.updateStatus({
      healthy: false,
      status: ProviderStatus.UNAVAILABLE,
      lastChecked: new Date().toISOString(),
      error: lastError?.message,
    });

    this.emitEvent({
      type: 'init_failed',
      providerName,
      timestamp: new Date().toISOString(),
      message: lastError?.message,
    });

    throw lastError;
  }

  private async shutdownProvider(reg: ProviderRegistration): Promise<void> {
    const providerName = reg.provider.name;

    this.emitEvent({
      type: 'shutdown_start',
      providerName,
      timestamp: new Date().toISOString(),
    });

    try {
      // 带超时的关闭
      await Promise.race([
        reg.provider.shutdown(),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('Shutdown timeout')), 10_000),
        ),
      ]);

      const metrics = getOrCreateMetrics(providerName);
      metrics.updateStatus({
        healthy: false,
        status: ProviderStatus.SHUTDOWN,
        lastChecked: new Date().toISOString(),
      });

      this.emitEvent({
        type: 'shutdown_complete',
        providerName,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error(
        { provider: providerName, error: error.message },
        `[Lifecycle] Error shutting down ${providerName}`,
      );
    }
  }

  private emitEvent(event: LifecycleEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch {
        // 监听器异常不影响主流程
      }
    }
  }
}

// 全局单例
export const providerLifecycle = new ProviderLifecycle();