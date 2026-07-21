// ============================================================================
// ProviderSelector — 多维评分选优算法
// 当同一能力注册了多个 Provider 时，自动选择最优的
//
// 算法流程:
//   1. 过滤掉不可用 Provider (UNAVAILABLE/SHUTDOWN)
//   2. 对每个 Provider 计算多维评分 (加权求和)
//   3. 返回得分最高的 Provider
//
// 评分维度 (可配置权重):
//   - 可靠性 (reliability)     : 基于成功率 + 熔断器状态
//   - 速度 (speed)             : 基于 EWMA 延迟
//   - 成本 (cost)              : 基于 costPerCall × 使用量
//   - 配额 (quota)             : 基于剩余配额
//   - 优先级 (priority)        : 基于注册时配置的优先级
// ============================================================================

import type { IBaseProvider, CapabilityName, ProviderInfo } from './interfaces.js';
import { ProviderStatus } from './interfaces.js';
import { getOrCreateMetrics, type ProviderMetrics } from './provider-metrics.js';

// ═══════════════════════════════════════════════════════════════════════════════
// 评分维度权重配置
// ═══════════════════════════════════════════════════════════════════════════════

export interface SelectionWeights {
  /** 可靠性权重 (0-1)，默认 0.35 */
  reliability: number;
  /** 速度权重 (0-1)，默认 0.25 */
  speed: number;
  /** 成本权重 (0-1)，默认 0.15 */
  cost: number;
  /** 配额权重 (0-1)，默认 0.15 */
  quota: number;
  /** 优先级权重 (0-1)，默认 0.10 */
  priority: number;
}

export const DEFAULT_WEIGHTS: SelectionWeights = {
  reliability: 0.35,
  speed: 0.25,
  cost: 0.15,
  quota: 0.15,
  priority: 0.10,
};

// ═══════════════════════════════════════════════════════════════════════════════
// 评分策略: 按能力定制
// ═══════════════════════════════════════════════════════════════════════════════

const CAPABILITY_WEIGHTS: Partial<Record<CapabilityName, Partial<SelectionWeights>>> = {
  // SERP 查询: 速度最重要（用户等待搜索结果）
  serp: { speed: 0.40, reliability: 0.30, cost: 0.10, quota: 0.10, priority: 0.10 },
  // 关键词数据: 可靠性最重要（数据准确性）
  keywordData: { reliability: 0.40, speed: 0.15, cost: 0.20, quota: 0.15, priority: 0.10 },
  // AI 对话: 成本最重要（高成本 API）
  chat: { cost: 0.35, reliability: 0.25, speed: 0.15, quota: 0.15, priority: 0.10 },
  // Embedding: 速度最重要（批量处理）
  embedding: { speed: 0.35, cost: 0.25, reliability: 0.20, quota: 0.10, priority: 0.10 },
  // 性能审计: 可靠性最重要（精确结果）
  performance: { reliability: 0.40, speed: 0.20, cost: 0.15, quota: 0.15, priority: 0.10 },
  // 通知: 可靠性最重要（不能丢失）
  notification: { reliability: 0.50, speed: 0.10, cost: 0.15, quota: 0.15, priority: 0.10 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 注册的 Provider 条目
// ═══════════════════════════════════════════════════════════════════════════════

interface ProviderEntry {
  provider: IBaseProvider;
  capability: CapabilityName;
  configPriority: number;
  enabled: boolean;
  featureFlag?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ProviderSelector 类
// ═══════════════════════════════════════════════════════════════════════════════

export class ProviderSelector {
  private entries = new Map<CapabilityName, ProviderEntry[]>();

  /**
   * 注册一个 Provider
   */
  register(
    capability: CapabilityName,
    provider: IBaseProvider,
    options?: { priority?: number; enabled?: boolean; featureFlag?: string },
  ): void {
    if (!this.entries.has(capability)) {
      this.entries.set(capability, []);
    }

    const list = this.entries.get(capability)!;

    // 检查是否已存在同名 provider
    const existing = list.findIndex(e => e.provider.name === provider.name);
    const entry: ProviderEntry = {
      provider,
      capability,
      configPriority: options?.priority ?? 0,
      enabled: options?.enabled ?? true,
      featureFlag: options?.featureFlag,
    };

    if (existing >= 0) {
      list[existing] = entry; // 更新
    } else {
      list.push(entry);
      // 按优先级降序排列，保持列表有序
      list.sort((a, b) => b.configPriority - a.configPriority);
    }
  }

  /**
   * 注销一个 Provider
   */
  unregister(capability: CapabilityName, providerName: string): void {
    const list = this.entries.get(capability);
    if (!list) return;
    const idx = list.findIndex(e => e.provider.name === providerName);
    if (idx >= 0) list.splice(idx, 1);
  }

  /**
   * 选择最佳 Provider
   *
   * 算法:
   *   1. 过滤: 排除 UNAVAILABLE/SHUTDOWN 状态
   *   2. 评分: 每个 Provider 计算 5 维加权分
   *   3. 排序: 按总分降序
   *   4. 返回: 得分最高的 Provider，如果得分 < 阈值则返回 null
   */
  selectBest(capability: CapabilityName): { provider: IBaseProvider; score: number } | null {
    const list = this.entries.get(capability);
    if (!list || list.length === 0) return null;

    const weights = this.getWeights(capability);

    const scored = list
      .filter(e => e.enabled)
      .map(entry => {
        const metrics = getOrCreateMetrics(entry.provider.name);
        const score = this.computeScore(entry, metrics, weights);
        return { entry, score };
      })
      .filter(s => s.score >= 30) // 最低 30 分才考虑
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) return null;

    const best = scored[0];
    return {
      provider: best.entry.provider,
      score: Math.round(best.score),
    };
  }

  /**
   * 获取所有可用 Provider (按得分降序)
   */
  selectAll(capability: CapabilityName): Array<{ provider: IBaseProvider; score: number }> {
    const list = this.entries.get(capability);
    if (!list || list.length === 0) return [];

    const weights = this.getWeights(capability);

    return list
      .filter(e => e.enabled)
      .map(entry => {
        const metrics = getOrCreateMetrics(entry.provider.name);
        const score = this.computeScore(entry, metrics, weights);
        return { provider: entry.provider, score: Math.round(score) };
      })
      .filter(s => s.score >= 30)
      .sort((a, b) => b.score - a.score);
  }

  /**
   * 获取所有 Provider 的详细评分分解
   */
  getScoreBreakdown(capability: CapabilityName): Array<{
    providerName: string;
    totalScore: number;
    breakdown: {
      reliability: number;
      speed: number;
      cost: number;
      quota: number;
      priority: number;
    };
    weights: SelectionWeights;
  }> {
    const list = this.entries.get(capability);
    if (!list || list.length === 0) return [];

    const weights = this.getWeights(capability);

    return list
      .filter(e => e.enabled)
      .map(entry => {
        const metrics = getOrCreateMetrics(entry.provider.name);
        const breakdown = this.computeBreakdown(entry, metrics, weights);
        // 加权求和
        const totalScore = Math.round(
          weights.reliability * breakdown.reliability +
          weights.speed * breakdown.speed +
          weights.cost * breakdown.cost +
          weights.quota * breakdown.quota +
          weights.priority * breakdown.priority
        );

        return {
          providerName: entry.provider.name,
          totalScore,
          breakdown,
          weights,
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * 列出所有注册的 Provider
   */
  listProviders(): ProviderInfo[] {
    const result: ProviderInfo[] = [];
    for (const [capability, entries] of this.entries) {
      for (const entry of entries) {
        const metrics = getOrCreateMetrics(entry.provider.name);
        result.push({
          capability,
          name: entry.provider.name,
          version: entry.provider.version,
          priority: entry.configPriority,
          enabled: entry.enabled,
          costPerCall: entry.provider.costPerCall,
          circuitState: metrics.status === ProviderStatus.UNAVAILABLE ? 'OPEN' : 'CLOSED',
          status: metrics.status,
          rateLimit: entry.provider.rateLimit,
        });
      }
    }
    return result;
  }

  /**
   * 设置 Provider 优先级
   */
  setPriority(capability: CapabilityName, providerName: string, priority: number): void {
    const list = this.entries.get(capability);
    if (!list) return;
    const entry = list.find(e => e.provider.name === providerName);
    if (entry) {
      entry.configPriority = priority;
      list.sort((a, b) => b.configPriority - a.configPriority);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 私有方法: 评分计算
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * 获取某个能力的定制权重
   */
  private getWeights(capability: CapabilityName): SelectionWeights {
    const custom = CAPABILITY_WEIGHTS[capability] ?? {};
    return { ...DEFAULT_WEIGHTS, ...custom };
  }

  /**
   * 计算综合评分 (0-100)
   */
  private computeScore(
    entry: ProviderEntry,
    metrics: ProviderMetrics,
    weights: SelectionWeights,
  ): number {
    const breakdown = this.computeBreakdown(entry, metrics, weights);

    return (
      weights.reliability * breakdown.reliability +
      weights.speed * breakdown.speed +
      weights.cost * breakdown.cost +
      weights.quota * breakdown.quota +
      weights.priority * breakdown.priority
    );
  }

  /**
   * 计算各维度评分 (0-100)
   */
  private computeBreakdown(
    entry: ProviderEntry,
    metrics: ProviderMetrics,
    _weights: SelectionWeights,
  ): {
    reliability: number;
    speed: number;
    cost: number;
    quota: number;
    priority: number;
  } {
    // ── 可靠性分 (0-100) ──
    // 基础: 成功率 × 100
    // 熔断器惩罚: OPEN → ×0.3, HALF_OPEN → ×0.6
    // 状态惩罚: DEGRADED → ×0.7
    let reliabilityScore = metrics.successRate * 100;

    const status = metrics.status;
    if (status === ProviderStatus.INITIALIZING) {
      reliabilityScore = 50; // 未初始化，给中等分
    } else if (status === ProviderStatus.DEGRADED) {
      reliabilityScore *= 0.7;
    } else if (status === ProviderStatus.UNAVAILABLE) {
      reliabilityScore = 0; // 不可用
    }

    // ── 速度分 (0-100) ──
    // 延迟评分: 100 - (ewmaLatency / 50)，相当于 5s 延迟得 0 分
    const latencyMs = metrics.ewmaLatencyMs;
    const speedScore = latencyMs === 0 ? 100
      : Math.max(0, 100 - (latencyMs / 50));

    // ── 成本分 (0-100) ──
    // 成本评分: 成本越低分数越高
    // $0.0001/次 → 100分，$0.10/次 → 0分
    const costPerCall = entry.provider.costPerCall;
    const costScore = costPerCall === 0 ? 100
      : Math.max(0, 100 - Math.log10(costPerCall * 100000) * 50);

    // ── 配额分 (0-100) ──
    const quotaRemaining = metrics.quotaRemainingMinutes;
    const currentQuota = metrics.currentQuota ?? 0;
    let quotaScore: number;
    if (quotaRemaining === null) {
      // 无配额数据，基于当前余量
      quotaScore = Math.min(currentQuota / 10, 100);
    } else if (quotaRemaining <= 0) {
      quotaScore = 0; // 配额已耗尽
    } else {
      // 配额剩余时间 → 分数: 7天=100, 1天=50, 1小时=10
      quotaScore = Math.min(quotaRemaining / 100.8, 100); // 100.8 = 7天分钟数/100
    }

    // ── 优先级分 (0-100) ──
    // 优先级 0-10 → 分数 0-100
    const priorityScore = Math.min(entry.configPriority * 10, 100);

    return {
      reliability: Math.round(reliabilityScore),
      speed: Math.round(speedScore),
      cost: Math.round(costScore),
      quota: Math.round(quotaScore),
      priority: Math.round(priorityScore),
    };
  }
}

// 全局单例
export const providerSelector = new ProviderSelector();