// ---------------------------------------------------------------------------
// API Usage Tracking Middleware
// Records API call details: service name, endpoint, duration, cost, credits
// Writes to api_usage_logs table
// ---------------------------------------------------------------------------

import db from '../database.js';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UsageRecord {
  service: string;
  endpoint: string;
  cost: number;
  credits: number;
  durationMs: number;
}

export interface UsageStats {
  totalCalls: number;
  totalCost: number;
  totalCredits: number;
  byService: Record<string, { calls: number; cost: number; credits: number }>;
}

// ---------------------------------------------------------------------------
// Core record function
// ---------------------------------------------------------------------------

/**
 * 记录一次 API 调用
 * @param service - 服务名称（如 'dataforseo', 'openai', 'gsc'）
 * @param endpoint - 端点名称（如 'getSERP', 'generateContentBrief'）
 * @param cost - 消耗金额（美元）
 * @param credits - 消耗的积分
 * @param durationMs - 耗时（毫秒）
 */
export async function recordUsage(
  service: string,
  endpoint: string,
  cost: number = 0,
  credits: number = 0,
  durationMs: number = 0,
): Promise<void> {
  try {
    const id = uuidv4();
    await db('api_usage_logs').insert({
      id,
      service,
      endpoint,
      cost,
      credits,
      duration_ms: durationMs,
      created_at: db.fn.now(),
    });
  } catch {
    // Silently fail - don't let usage tracking break the main flow
  }
}

/**
 * 便捷函数：包装一个异步函数，自动记录其用量
 */
export async function trackUsage<T>(
  service: string,
  endpoint: string,
  fn: () => Promise<T>,
  cost: number = 0,
  credits: number = 0,
): Promise<T> {
  const startTime = Date.now();
  try {
    const result = await fn();
    const durationMs = Date.now() - startTime;
    await recordUsage(service, endpoint, cost, credits, durationMs);
    return result;
  } catch (err) {
    const durationMs = Date.now() - startTime;
    await recordUsage(service, endpoint, cost, credits, durationMs);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

/**
 * 获取指定服务的用量统计
 */
export async function getUsageStats(
  service?: string,
  startDate?: string,
  endDate?: string,
): Promise<UsageStats> {
  try {
    let query = db('api_usage_logs');

    if (service) {
      query = query.where('service', service);
    }
    if (startDate) {
      query = query.where('created_at', '>=', startDate);
    }
    if (endDate) {
      query = query.where('created_at', '<=', endDate);
    }

    const rows = await query.select('service', 'endpoint', 'cost', 'credits');

    const stats: UsageStats = {
      totalCalls: 0,
      totalCost: 0,
      totalCredits: 0,
      byService: {},
    };

    for (const row of rows) {
      stats.totalCalls++;
      stats.totalCost += Number(row.cost) || 0;
      stats.totalCredits += Number(row.credits) || 0;

      if (!stats.byService[row.service]) {
        stats.byService[row.service] = { calls: 0, cost: 0, credits: 0 };
      }
      stats.byService[row.service].calls++;
      stats.byService[row.service].cost += Number(row.cost) || 0;
      stats.byService[row.service].credits += Number(row.credits) || 0;
    }

    return stats;
  } catch {
    return {
      totalCalls: 0,
      totalCost: 0,
      totalCredits: 0,
      byService: {},
    };
  }
}

/**
 * 获取每日用量趋势
 */
export async function getDailyUsageTrend(
  days: number = 30,
): Promise<Array<{ date: string; calls: number; cost: number }>> {
  try {
    const rows = await db('api_usage_logs')
      .select(
        db.raw("DATE(created_at) as date"),
        db.raw('COUNT(*) as calls'),
        db.raw('COALESCE(SUM(cost), 0) as cost'),
      )
      .where('created_at', '>=', db.raw(`NOW() - INTERVAL '${days} days'`))
      .groupBy(db.raw('DATE(created_at)'))
      .orderBy('date', 'asc');

    return rows.map((row: { date: string; calls: string; cost: string }) => ({
      date: row.date,
      calls: Number(row.calls),
      cost: Number(row.cost),
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

/**
 * 清理过期的用量日志（保留最近 90 天）
 */
export async function cleanupOldLogs(): Promise<number> {
  try {
    const deleted = await db('api_usage_logs')
      .where('created_at', '<', db.raw("NOW() - INTERVAL '90 days'"))
      .del();

    return deleted;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export default {
  recordUsage,
  trackUsage,
  getUsageStats,
  getDailyUsageTrend,
  cleanupOldLogs,
};