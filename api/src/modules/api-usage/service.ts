import { db } from '../../shared/database.js';
import config from '../../config.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiUsageSummary {
  totalCalls: number;
  totalCost: number;
  callsByService: Record<string, number>;
  costByService: Record<string, number>;
  callsByProject: Record<string, number>;
  period: {
    start: string;
    end: string;
  };
}

export interface DailyUsage {
  date: string;
  totalCalls: number;
  totalCost: number;
  callsByService: Record<string, number>;
}

export interface ServiceUsage {
  service: string;
  totalCalls: number;
  totalCost: number;
  averageResponseTime: number;
  errorRate: number;
  lastUsed: string | null;
}

export interface CostBreakdown {
  totalCost: number;
  byService: Record<string, number>;
  byProject: Record<string, number>;
  daily: Array<{ date: string; cost: number }>;
  projectedMonthly: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function getSummary(
  params: {
    startDate?: string;
    endDate?: string;
    projectId?: string;
  },
): Promise<ApiUsageSummary> {
  const { startDate, endDate, projectId } = params;

  let query = db('api_usage_logs');

  if (startDate) query = query.where('created_at', '>=', startDate);
  if (endDate) query = query.where('created_at', '<=', endDate);
  if (projectId) query = query.where('project_id', projectId);

  const logs = await query.select('service', 'project_id', 'cost');

  const callsByService: Record<string, number> = {};
  const costByService: Record<string, number> = {};
  const callsByProject: Record<string, number> = {};
  let totalCost = 0;

  for (const log of logs as Array<{ service: string; project_id: string; cost: number }>) {
    callsByService[log.service] = (callsByService[log.service] ?? 0) + 1;
    costByService[log.service] = (costByService[log.service] ?? 0) + (log.cost ?? 0);
    callsByProject[log.project_id] = (callsByProject[log.project_id] ?? 0) + 1;
    totalCost += log.cost ?? 0;
  }

  return {
    totalCalls: logs.length,
    totalCost: Math.round(totalCost * 100) / 100,
    callsByService,
    costByService,
    callsByProject,
    period: {
      start: startDate ?? 'all',
      end: endDate ?? 'now',
    },
  };
}

export async function getDailyUsage(
  params: {
    days?: number;
    projectId?: string;
    service?: string;
  },
): Promise<DailyUsage[]> {
  const { days = 30, projectId, service } = params;

  let query = db('api_usage_logs')
    .where('created_at', '>=', db.raw(`NOW() - INTERVAL '${days} days'`));

  if (projectId) query = query.where('project_id', projectId);
  if (service) query = query.where('service', service);

  const dailyResults = await query
    .select(
      db.raw("DATE(created_at) as date"),
      db.raw('COUNT(*) as total_calls'),
      db.raw('SUM(COALESCE(cost, 0)) as total_cost'),
      'service',
    )
    .groupBy(db.raw('DATE(created_at)'), 'service')
    .orderBy('date', 'asc');

  // Group by date
  const dailyMap = new Map<string, DailyUsage>();
  for (const row of dailyResults as Array<{
    date: string;
    total_calls: string;
    total_cost: string;
    service: string;
  }>) {
    if (!dailyMap.has(row.date)) {
      dailyMap.set(row.date, {
        date: row.date,
        totalCalls: 0,
        totalCost: 0,
        callsByService: {},
      });
    }
    const entry = dailyMap.get(row.date)!;
    const calls = parseInt(row.total_calls, 10);
    const cost = parseFloat(row.total_cost);
    entry.totalCalls += calls;
    entry.totalCost += cost;
    entry.callsByService[row.service] = (entry.callsByService[row.service] ?? 0) + calls;
  }

  return Array.from(dailyMap.values());
}

export async function getByService(
  params: {
    days?: number;
    projectId?: string;
  },
): Promise<ServiceUsage[]> {
  const { days = 30, projectId } = params;

  let query = db('api_usage_logs')
    .where('created_at', '>=', db.raw(`NOW() - INTERVAL '${days} days'`));

  if (projectId) query = query.where('project_id', projectId);

  const serviceResults = await query
    .select(
      'service',
      db.raw('COUNT(*) as total_calls'),
      db.raw('SUM(COALESCE(cost, 0)) as total_cost'),
      db.raw('AVG(COALESCE(response_time_ms, 0)) as avg_response_time'),
      db.raw("SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) * 1.0 / COUNT(*) as error_rate"),
      db.raw('MAX(created_at) as last_used'),
    )
    .groupBy('service')
    .orderBy('total_calls', 'desc');

  return (serviceResults as Array<{
    service: string;
    total_calls: string;
    total_cost: string;
    avg_response_time: string;
    error_rate: string;
    last_used: string;
  }>).map((row) => ({
    service: row.service,
    totalCalls: parseInt(row.total_calls, 10),
    totalCost: Math.round(parseFloat(row.total_cost) * 100) / 100,
    averageResponseTime: Math.round(parseFloat(row.avg_response_time)),
    errorRate: Math.round(parseFloat(row.error_rate) * 100) / 100,
    lastUsed: row.last_used,
  }));
}

export async function getCostBreakdown(
  params: {
    days?: number;
    projectId?: string;
  },
): Promise<CostBreakdown> {
  const { days = 30, projectId } = params;

  let query = db('api_usage_logs')
    .where('created_at', '>=', db.raw(`NOW() - INTERVAL '${days} days'`));

  if (projectId) query = query.where('project_id', projectId);

  const logs = await query.select('service', 'project_id', 'cost', 'created_at');

  const typedLogs = logs as Array<{
    service: string;
    project_id: string;
    cost: number;
    created_at: string;
  }>;

  let totalCost = 0;
  const byService: Record<string, number> = {};
  const byProject: Record<string, number> = {};
  const dailyMap = new Map<string, number>();

  for (const log of typedLogs) {
    const cost = log.cost ?? 0;
    totalCost += cost;
    byService[log.service] = (byService[log.service] ?? 0) + cost;
    byProject[log.project_id] = (byProject[log.project_id] ?? 0) + cost;

    const date = log.created_at.split('T')[0];
    dailyMap.set(date, (dailyMap.get(date) ?? 0) + cost);
  }

  // Round all costs
  for (const key of Object.keys(byService)) {
    byService[key] = Math.round(byService[key] * 100) / 100;
  }
  for (const key of Object.keys(byProject)) {
    byProject[key] = Math.round(byProject[key] * 100) / 100;
  }

  const daily = Array.from(dailyMap.entries())
    .map(([date, cost]) => ({ date, cost: Math.round(cost * 100) / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const dailyAvg = daily.length > 0 ? totalCost / daily.length : 0;
  const projectedMonthly = Math.round(dailyAvg * 30 * 100) / 100;

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    byService,
    byProject,
    daily,
    projectedMonthly,
  };
}

export default {
  getSummary,
  getDailyUsage,
  getByService,
  getCostBreakdown,
};