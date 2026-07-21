// ============================================================================
// CostTracker — 成本追踪器
//
// 算法: 累计成本 + 预算预警 + 移动平均日成本预测
//
// 追踪维度:
//   - 按 Provider 聚合 (如 dataforseo 今日花费 $2.35)
//   - 按项目聚合 (如 project-123 今日花费 $1.80)
//   - 按能力聚合 (如 serp 今日花费 $0.50)
//
// 预测算法:
//   日消耗预测 = 当前小时消耗 / 已过小时数 × 24
//   预算耗尽时间 = 当前预算剩余 / 小时消耗速率
// ============================================================================

import { redis } from '../redis.js';
import { query } from '../db.js';
import logger from '../logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// 类型
// ═══════════════════════════════════════════════════════════════════════════════

export interface CostRecord {
  /** 时间戳 */
  timestamp: string;
  /** Provider 名称 */
  provider: string;
  /** 能力名称 */
  capability: string;
  /** 方法名 */
  method: string;
  /** 项目 ID */
  projectId?: string;
  /** 花费 (USD) */
  costUsd: number;
  /** 是否成功 */
  success: boolean;
}

export interface CostSummary {
  /** 总花费 */
  totalCost: number;
  /** 调用次数 */
  totalCalls: number;
  /** 成功率 */
  successRate: number;
  /** 按 Provider 分项 */
  byProvider: Record<string, { cost: number; calls: number }>;
  /** 按项目分项 */
  byProject: Record<string, { cost: number; calls: number }>;
  /** 按能力分项 */
  byCapability: Record<string, { cost: number; calls: number }>;
}

export interface BudgetAlert {
  /** 预算名称 */
  budgetName: string;
  /** 总预算 */
  total: number;
  /** 已花费 */
  spent: number;
  /** 剩余 */
  remaining: number;
  /** 使用百分比 */
  usagePercent: number;
  /** 预估耗尽时间 */
  predictedExhaustion: string | null;
  /** 告警级别 */
  alertLevel: 'none' | 'warn' | 'critical';
}

export interface BudgetConfig {
  /** 预算名称 */
  name: string;
  /** 预算上限 (USD) */
  limit: number;
  /** 周期: daily | weekly | monthly */
  period: 'daily' | 'weekly' | 'monthly';
  /** 告警阈值百分比 */
  warnPercent?: number;
  /** 严重告警阈值百分比 */
  criticalPercent?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Redis key 前缀
// ═══════════════════════════════════════════════════════════════════════════════

const COST_KEY_PREFIX = 'cost:';

function getPeriodKey(period: 'daily' | 'weekly' | 'monthly'): string {
  const now = new Date();
  if (period === 'daily') {
    return now.toISOString().slice(0, 10); // YYYY-MM-DD
  }
  if (period === 'weekly') {
    // ISO 周: 周一为起点
    const day = now.getUTCDay();
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() - (day === 0 ? 6 : day - 1));
    return monday.toISOString().slice(0, 10);
  }
  // monthly
  return now.toISOString().slice(0, 7); // YYYY-MM
}

// ═══════════════════════════════════════════════════════════════════════════════
// CostTracker 类
// ═══════════════════════════════════════════════════════════════════════════════

export class CostTracker {
  private budgets: BudgetConfig[] = [];
  private alertCallbacks: Array<(alert: BudgetAlert) => void> = [];

  // ═══════════════════════════════════════════════════════════════════════════════
  // 记录花费
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * 记录一次 API 调用花费
   */
  async record(record: Omit<CostRecord, 'timestamp'>): Promise<void> {
    const full: CostRecord = {
      ...record,
      timestamp: new Date().toISOString(),
    };

    const period = getPeriodKey('daily');

    // Redis 原子累加（高性能）
    const pipeline = redis.pipeline();
    pipeline.hincrbyfloat(`${COST_KEY_PREFIX}total:${period}`, 'cost', record.costUsd);
    pipeline.hincrby(`${COST_KEY_PREFIX}total:${period}`, 'calls', 1);
    pipeline.hincrbyfloat(`${COST_KEY_PREFIX}provider:${period}:${record.provider}`, 'cost', record.costUsd);
    pipeline.hincrby(`${COST_KEY_PREFIX}provider:${period}:${record.provider}`, 'calls', 1);
    pipeline.hincrbyfloat(`${COST_KEY_PREFIX}capability:${period}:${record.capability}`, 'cost', record.costUsd);
    pipeline.hincrby(`${COST_KEY_PREFIX}capability:${period}:${record.capability}`, 'calls', 1);

    if (record.projectId) {
      pipeline.hincrbyfloat(`${COST_KEY_PREFIX}project:${period}:${record.projectId}`, 'cost', record.costUsd);
      pipeline.hincrby(`${COST_KEY_PREFIX}project:${period}:${record.projectId}`, 'calls', 1);
    }

    // 设置过期 (保留 35 天)
    const expireTime = 35 * 24 * 3600;
    for (let i = 0; i < 6; i++) {
      // 6 个 key 全部设置过期（pipeline 中不方便精确计数，宽松处理）
    }
    pipeline.expire(`${COST_KEY_PREFIX}total:${period}`, expireTime);
    pipeline.expire(`${COST_KEY_PREFIX}provider:${period}:${record.provider}`, expireTime);
    pipeline.expire(`${COST_KEY_PREFIX}capability:${period}:${record.capability}`, expireTime);
    if (record.projectId) {
      pipeline.expire(`${COST_KEY_PREFIX}project:${period}:${record.projectId}`, expireTime);
    }

    await pipeline.exec();

    // 异步写入数据库（持久化）
    this.persistToDb(full).catch(err => {
      logger.warn({ error: err.message }, '[CostTracker] Failed to persist to DB');
    });

    // 检查预算告警
    this.checkBudgets().catch(err => {
      logger.warn({ error: err.message }, '[CostTracker] Budget check failed');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 查询花费摘要
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * 获取当日花费摘要
   */
  async getDailySummary(): Promise<CostSummary> {
    return this.getSummary('daily');
  }

  /**
   * 获取花费摘要
   */
  async getSummary(period: 'daily' | 'weekly' | 'monthly'): Promise<CostSummary> {
    const periodKey = getPeriodKey(period);

    // 获取所有相关 key
    const pattern = `${COST_KEY_PREFIX}*:${periodKey}:*`;
    const keys = await redis.keys(pattern);

    const summary: CostSummary = {
      totalCost: 0,
      totalCalls: 0,
      successRate: 1,
      byProvider: {},
      byProject: {},
      byCapability: {},
    };

    if (keys.length === 0) return summary;

    const pipeline = redis.pipeline();
    keys.forEach(k => pipeline.hgetall(k));
    const results = await pipeline.exec();

    if (!results) return summary;

    for (let i = 0; i < results.length; i++) {
      const [err, data] = results[i];
      if (err || !data) continue;

      const key = keys[i];
      const cost = parseFloat((data as any).cost || '0');
      const calls = parseInt((data as any).calls || '0', 10);

      if (key.startsWith(`${COST_KEY_PREFIX}total:`)) {
        summary.totalCost += cost;
        summary.totalCalls += calls;
      } else if (key.startsWith(`${COST_KEY_PREFIX}provider:`)) {
        const name = key.split(':')[3];
        if (name) {
          summary.byProvider[name] = { cost: (summary.byProvider[name]?.cost || 0) + cost, calls: (summary.byProvider[name]?.calls || 0) + calls };
        }
      } else if (key.startsWith(`${COST_KEY_PREFIX}project:`)) {
        const name = key.split(':')[3];
        if (name) {
          summary.byProject[name] = { cost: (summary.byProject[name]?.cost || 0) + cost, calls: (summary.byProject[name]?.calls || 0) + calls };
        }
      } else if (key.startsWith(`${COST_KEY_PREFIX}capability:`)) {
        const name = key.split(':')[3];
        if (name) {
          summary.byCapability[name] = { cost: (summary.byCapability[name]?.cost || 0) + cost, calls: (summary.byCapability[name]?.calls || 0) + calls };
        }
      }
    }

    return summary;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 预算管理
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * 设置预算
   */
  setBudget(config: BudgetConfig): void {
    const existing = this.budgets.findIndex(b => b.name === config.name);
    if (existing >= 0) {
      this.budgets[existing] = config;
    } else {
      this.budgets.push(config);
    }
  }

  /**
   * 注册预算告警回调
   */
  onBudgetAlert(callback: (alert: BudgetAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * 检查所有预算
   */
  async checkBudgets(): Promise<BudgetAlert[]> {
    const alerts: BudgetAlert[] = [];

    for (const budget of this.budgets) {
      const summary = await this.getSummary(budget.period);
      const spent = summary.totalCost;
      const remaining = budget.limit - spent;
      const usagePercent = (spent / budget.limit) * 100;

      const warnPercent = budget.warnPercent ?? 80;
      const criticalPercent = budget.criticalPercent ?? 95;

      let alertLevel: BudgetAlert['alertLevel'] = 'none';
      if (usagePercent >= criticalPercent) {
        alertLevel = 'critical';
      } else if (usagePercent >= warnPercent) {
        alertLevel = 'warn';
      }

      // 预测耗尽时间
      let predictedExhaustion: string | null = null;
      if (usagePercent > 0 && remaining > 0) {
        const now = new Date();
        const periodElapsed = this.getPeriodElapsedFraction(budget.period);
        if (periodElapsed > 0.01) {
          const hourlyRate = spent / (periodElapsed * 24 * (budget.period === 'daily' ? 1 : budget.period === 'weekly' ? 7 : 30));
          const hoursRemaining = remaining / (hourlyRate || 0.0001);
          const exhaustion = new Date(now.getTime() + hoursRemaining * 3600000);
          predictedExhaustion = exhaustion.toISOString();
        }
      }

      const alert: BudgetAlert = {
        budgetName: budget.name,
        total: budget.limit,
        spent,
        remaining,
        usagePercent: Math.round(usagePercent * 100) / 100,
        predictedExhaustion,
        alertLevel,
      };

      alerts.push(alert);

      if (alertLevel !== 'none') {
        for (const cb of this.alertCallbacks) {
          try {
            cb(alert);
          } catch {
            // 回调异常不影响主流程
          }
        }
      }
    }

    return alerts;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 私有方法
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * 计算当前时间在周期中的占比 (0-1)
   */
  private getPeriodElapsedFraction(period: 'daily' | 'weekly' | 'monthly'): number {
    const now = new Date();
    if (period === 'daily') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return (now.getTime() - start.getTime()) / (end.getTime() - start.getTime());
    }
    if (period === 'weekly') {
      const day = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      monday.setHours(0, 0, 0, 0);
      const nextMonday = new Date(monday);
      nextMonday.setDate(nextMonday.getDate() + 7);
      return (now.getTime() - monday.getTime()) / (nextMonday.getTime() - monday.getTime());
    }
    // monthly
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return (now.getTime() - start.getTime()) / (end.getTime() - start.getTime());
  }

  /**
   * 持久化到数据库
   */
  private async persistToDb(record: CostRecord): Promise<void> {
    try {
      await query(
        `INSERT INTO api_usage_logs (provider, method, endpoint, status, response_time_ms, cost_usd, request_data, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          record.provider,
          record.method,
          record.capability,
          record.success ? 'success' : 'error',
          0,
          record.costUsd,
          JSON.stringify({ projectId: record.projectId }),
          record.timestamp,
        ],
      );
    } catch (error: any) {
      logger.debug({ error: error.message }, '[CostTracker] DB persist failed (non-critical)');
    }
  }
}

// 全局单例
export const costTracker = new CostTracker();