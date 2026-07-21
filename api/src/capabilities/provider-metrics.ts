// ============================================================================
// ProviderMetrics — 运行时指标追踪
// 算法: EWMA(指数加权移动平均) + 线性回归配额预测 + 滑动窗口错误率
// ============================================================================

import type { ProviderHealth, ProviderStatus } from './interfaces.js';
import { ProviderStatus as Status } from './interfaces.js';

// ── 内部类型 ──────────────────────────────────────────────────────────────────

interface LatencySample {
  timestamp: number;
  latencyMs: number;
}

interface ErrorSample {
  timestamp: number;
  isError: boolean;
}

interface QuotaSample {
  timestamp: number;
  remaining: number;
}

// ── EWMA 衰减因子 ────────────────────────────────────────────────────────────

const EWMA_ALPHA = 0.2;       // 平滑因子（越大越敏感）
const WINDOW_SIZE_MS = 300_000; // 5分钟窗口
const QUOTA_WINDOW_MS = 3_600_000; // 1小时窗口（配额预测用）

// ============================================================================
// ProviderMetrics 类
// ============================================================================

export class ProviderMetrics {
  public readonly providerName: string;

  // 延迟追踪
  private latencySamples: LatencySample[] = [];
  private _ewmaLatencyMs: number = 0;
  private _ewmaInitialized: boolean = false;

  // 错误追踪
  private errorSamples: ErrorSample[] = [];
  private _errorRate: number = 0;

  // 配额追踪
  private quotaSamples: QuotaSample[] = [];
  private _predictedQuotaExhaustion: Date | null = null;

  // 调用统计
  private _totalCalls: number = 0;
  private _totalErrors: number = 0;
  private _totalCost: number = 0;
  private _windowStartTime: number = Date.now();

  // 状态
  private _status: ProviderStatus = Status.INITIALIZING;
  private _lastHealthCheck: ProviderHealth | null = null;

  constructor(providerName: string) {
    this.providerName = providerName;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 延迟追踪 (EWMA 算法)
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * 记录一次调用延迟
   * 使用 EWMA 计算平滑延迟: ewma = α × current + (1-α) × previous
   */
  recordLatency(latencyMs: number): void {
    const now = Date.now();
    this.latencySamples.push({ timestamp: now, latencyMs });

    if (!this._ewmaInitialized) {
      this._ewmaLatencyMs = latencyMs;
      this._ewmaInitialized = true;
    } else {
      this._ewmaLatencyMs = EWMA_ALPHA * latencyMs + (1 - EWMA_ALPHA) * this._ewmaLatencyMs;
    }

    // 清理过期样本
    this.pruneSamples();
  }

  /** 获取 EWMA 平滑延迟 (ms) */
  get ewmaLatencyMs(): number {
    return Math.round(this._ewmaLatencyMs);
  }

  /** 获取窗口内 P50/P95/P99 延迟 */
  getLatencyPercentiles(): { p50: number; p95: number; p99: number } {
    const windowLatencies = this.getWindowLatencies();
    if (windowLatencies.length === 0) return { p50: 0, p95: 0, p99: 0 };

    const sorted = [...windowLatencies].sort((a, b) => a - b);
    return {
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  private getWindowLatencies(): number[] {
    const cutoff = Date.now() - WINDOW_SIZE_MS;
    return this.latencySamples.filter(s => s.timestamp > cutoff).map(s => s.latencyMs);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 错误率追踪 (滑动窗口)
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * 记录一次调用结果
   */
  recordCall(success: boolean, costUsd: number = 0): void {
    this._totalCalls++;
    this._totalCost += costUsd;

    const now = Date.now();
    this.errorSamples.push({ timestamp: now, isError: !success });

    if (!success) {
      this._totalErrors++;
    }

    // 重新计算窗口内错误率
    this.recalculateErrorRate();
    this.pruneSamples();
  }

  /** 窗口内错误率 (0-1) */
  get errorRate(): number {
    return this._errorRate;
  }

  /** 总调用次数 */
  get totalCalls(): number {
    return this._totalCalls;
  }

  /** 总错误次数 */
  get totalErrors(): number {
    return this._totalErrors;
  }

  /** 成功率 (0-1) */
  get successRate(): number {
    return this._totalCalls === 0 ? 1 : 1 - this._totalErrors / this._totalCalls;
  }

  /** 总成本 */
  get totalCost(): number {
    return this._totalCost;
  }

  private recalculateErrorRate(): void {
    const cutoff = Date.now() - WINDOW_SIZE_MS;
    const windowErrors = this.errorSamples.filter(s => s.timestamp > cutoff);
    const errorCount = windowErrors.filter(s => s.isError).length;
    this._errorRate = windowErrors.length === 0 ? 0 : errorCount / windowErrors.length;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 配额预测 (线性回归)
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * 记录当前配额余量
   * 使用线性回归预测配额耗尽时间:
   *   y = mx + b  其中 y=配额余量, x=时间戳
   *   耗尽时间 = -b/m (当 y=0 时)
   */
  recordQuota(remaining: number): void {
    const now = Date.now();
    this.quotaSamples.push({ timestamp: now, remaining });

    // 只保留最近 1 小时的样本
    const cutoff = now - QUOTA_WINDOW_MS;
    this.quotaSamples = this.quotaSamples.filter(s => s.timestamp > cutoff);

    // 需要至少 3 个样本才能做回归
    if (this.quotaSamples.length < 3) {
      this._predictedQuotaExhaustion = null;
      return;
    }

    this.predictExhaustion();
  }

  /**
   * 线性回归预测配额耗尽时间
   * 最小二乘法: m = Σ((x-x̄)(y-ȳ)) / Σ((x-x̄)²), b = ȳ - m×x̄
   */
  private predictExhaustion(): void {
    const n = this.quotaSamples.length;
    if (n < 3) return;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (const s of this.quotaSamples) {
      sumX += s.timestamp;
      sumY += s.remaining;
      sumXY += s.timestamp * s.remaining;
      sumX2 += s.timestamp * s.timestamp;
    }

    const meanX = sumX / n;
    const meanY = sumY / n;

    // 斜率 m
    const numerator = sumXY - n * meanX * meanY;
    const denominator = sumX2 - n * meanX * meanX;

    if (Math.abs(denominator) < 1e-10) {
      this._predictedQuotaExhaustion = null;
      return;
    }

    const slope = numerator / denominator;
    const intercept = meanY - slope * meanX;

    // R² 决定系数（评估拟合质量）
    let ssRes = 0, ssTot = 0;
    for (const s of this.quotaSamples) {
      const predicted = slope * s.timestamp + intercept;
      ssRes += (s.remaining - predicted) ** 2;
      ssTot += (s.remaining - meanY) ** 2;
    }
    const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

    // 斜率必须为负（配额在减少）且 R² 足够高
    if (slope >= 0 || rSquared < 0.5) {
      this._predictedQuotaExhaustion = null;
      return;
    }

    // 耗尽时间: y = 0 → x = -intercept/slope
    const exhaustionTimestamp = -intercept / slope;
    this._predictedQuotaExhaustion = new Date(exhaustionTimestamp);
  }

  /** 预估配额耗尽时间 */
  get predictedQuotaExhaustion(): Date | null {
    return this._predictedQuotaExhaustion;
  }

  /** 当前配额余量（最新样本） */
  get currentQuota(): number | null {
    return this.quotaSamples.length > 0
      ? this.quotaSamples[this.quotaSamples.length - 1].remaining
      : null;
  }

  /** 配额耗尽剩余时间 (分钟) */
  get quotaRemainingMinutes(): number | null {
    if (!this._predictedQuotaExhaustion) return null;
    const remaining = this._predictedQuotaExhaustion.getTime() - Date.now();
    return remaining > 0 ? Math.round(remaining / 60000) : 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 状态管理
  // ═══════════════════════════════════════════════════════════════════════════════

  updateStatus(health: ProviderHealth): void {
    this._lastHealthCheck = health;
    this._status = health.status;
  }

  get status(): ProviderStatus {
    return this._status;
  }

  get lastHealthCheck(): ProviderHealth | null {
    return this._lastHealthCheck;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 综合健康评分 (0-100)
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * 综合健康评分算法:
   *   得分 = 30 × 延迟分 + 30 × 错误率分 + 20 × 配额分 + 20 × 状态分
   *
   * 延迟分: 1 - min(ewmaLatency / 5000, 1)   → 低于 5s 得满分
   * 错误率分: 1 - errorRate                    → 0% 错误得满分
   * 配额分: min(remaining / 1000, 1)            → 1000+ 配额得满分
   * 状态分: ACTIVE=1, DEGRADED=0.5, 其余=0
   */
  getHealthScore(): number {
    // 延迟分（0-1）: 延迟越低越好
    const latencyScore = Math.max(0, 1 - this._ewmaLatencyMs / 5000);

    // 错误率分（0-1）: 错误率越低越好
    const errorScore = Math.max(0, 1 - this._errorRate);

    // 配额分（0-1）: 配额越多越好
    const quota = this.currentQuota ?? 1000;
    const quotaScore = Math.min(quota / 1000, 1);

    // 状态分（0-1）
    const statusScore = this._status === Status.ACTIVE ? 1
      : this._status === Status.DEGRADED ? 0.5
      : 0;

    const total = 30 * latencyScore + 30 * errorScore + 20 * quotaScore + 20 * statusScore;
    return Math.round(total);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 工具方法
  // ═══════════════════════════════════════════════════════════════════════════════

  private pruneSamples(): void {
    const cutoff = Date.now() - WINDOW_SIZE_MS;
    this.latencySamples = this.latencySamples.filter(s => s.timestamp > cutoff);
    this.errorSamples = this.errorSamples.filter(s => s.timestamp > cutoff);
  }

  /** 重置窗口 */
  resetWindow(): void {
    this._windowStartTime = Date.now();
    this.latencySamples = [];
    this.errorSamples = [];
    this._ewmaLatencyMs = 0;
    this._ewmaInitialized = false;
    this._errorRate = 0;
  }

  /** 导出快照（供监控面板） */
  snapshot() {
    return {
      providerName: this.providerName,
      status: this._status,
      ewmaLatencyMs: this.ewmaLatencyMs,
      latencies: this.getLatencyPercentiles(),
      errorRate: this._errorRate,
      totalCalls: this._totalCalls,
      totalErrors: this._totalErrors,
      successRate: this.successRate,
      totalCost: this._totalCost,
      currentQuota: this.currentQuota,
      predictedQuotaExhaustion: this._predictedQuotaExhaustion?.toISOString() ?? null,
      quotaRemainingMinutes: this.quotaRemainingMinutes,
      healthScore: this.getHealthScore(),
    };
  }
}

// 全局指标注册表
export const metricsRegistry = new Map<string, ProviderMetrics>();

export function getOrCreateMetrics(providerName: string): ProviderMetrics {
  if (!metricsRegistry.has(providerName)) {
    metricsRegistry.set(providerName, new ProviderMetrics(providerName));
  }
  return metricsRegistry.get(providerName)!;
}

export function getAllMetricsSnapshots(): ReturnType<ProviderMetrics['snapshot']>[] {
  return Array.from(metricsRegistry.values()).map(m => m.snapshot());
}