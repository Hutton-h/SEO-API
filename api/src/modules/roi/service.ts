import { db } from '../../shared/database.js';
import { v4 as uuidv4 } from 'uuid';
import config from '../../config.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ROIMetrics {
  id: string;
  project_id: string;
  period: string;
  start_date: string;
  end_date: string;
  seo_investment: number;
  organic_traffic_value: number;
  api_costs: number;
  tool_costs: number;
  labor_costs: number;
  total_revenue: number;
  roi_percent: number;
  roi_ratio: number;
  created_at: string;
  updated_at: string;
}

export interface ROITrend {
  period: string;
  investment: number;
  revenue: number;
  roi_percent: number;
  api_costs: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function getROI(
  projectId: string,
  params: { page: number; pageSize: number },
): Promise<PaginatedResult<ROIMetrics>> {
  const { page, pageSize } = params;

  const query = db('roi_metrics').where('project_id', projectId);

  const [{ count }] = await query.clone().clearSelect().count<{ count: string }[]>();
  const total = parseInt(count, 10);

  const items = await query
    .orderBy('start_date', 'desc')
    .offset((page - 1) * pageSize)
    .limit(pageSize);

  return { items: (items as Record<string, unknown>[]).map(formatROI), total };
}

export async function saveROI(
  projectId: string,
  data: {
    period: string;
    start_date: string;
    end_date: string;
    seo_investment?: number;
    organic_traffic_value?: number;
    tool_costs?: number;
    labor_costs?: number;
    total_revenue?: number;
  },
): Promise<ROIMetrics> {
  // Calculate API costs from api_usage_logs
  const apiCosts = await getAPICostsForPeriod(projectId, data.start_date, data.end_date);

  const seoInvestment = data.seo_investment ?? 0;
  const toolCosts = data.tool_costs ?? 0;
  const laborCosts = data.labor_costs ?? 0;
  const totalInvestment = seoInvestment + apiCosts + toolCosts + laborCosts;
  const totalRevenue = data.total_revenue ?? 0;
  const roiPercent = totalInvestment > 0
    ? ((totalRevenue - totalInvestment) / totalInvestment) * 100
    : 0;
  const roiRatio = totalInvestment > 0
    ? totalRevenue / totalInvestment
    : 0;

  // Check if existing record for this period
  const existing = await db('roi_metrics')
    .where('project_id', projectId)
    .where('period', data.period)
    .where('start_date', data.start_date)
    .first();

  if (existing) {
    const [updated] = await db('roi_metrics')
      .where('id', (existing as { id: string }).id)
      .update({
        end_date: data.end_date,
        seo_investment: seoInvestment,
        organic_traffic_value: data.organic_traffic_value ?? 0,
        api_costs: apiCosts,
        tool_costs: toolCosts,
        labor_costs: laborCosts,
        total_revenue: totalRevenue,
        roi_percent: Math.round(roiPercent * 100) / 100,
        roi_ratio: Math.round(roiRatio * 100) / 100,
        updated_at: db.fn.now(),
      })
      .returning('*');

    return formatROI(updated);
  }

  const id = uuidv4();
  const [created] = await db('roi_metrics')
    .insert({
      id,
      project_id: projectId,
      period: data.period,
      start_date: data.start_date,
      end_date: data.end_date,
      seo_investment: seoInvestment,
      organic_traffic_value: data.organic_traffic_value ?? 0,
      api_costs: apiCosts,
      tool_costs: toolCosts,
      labor_costs: laborCosts,
      total_revenue: totalRevenue,
      roi_percent: Math.round(roiPercent * 100) / 100,
      roi_ratio: Math.round(roiRatio * 100) / 100,
    })
    .returning('*');

  return formatROI(created);
}

export async function getROITrend(
  projectId: string,
  period: 'weekly' | 'monthly' | 'quarterly' = 'monthly',
): Promise<ROITrend[]> {
  const days = period === 'weekly' ? 90 : period === 'monthly' ? 365 : 730;

  const items = await db('roi_metrics')
    .where('project_id', projectId)
    .where('start_date', '>=', db.raw(`NOW() - INTERVAL '${days} days'`))
    .orderBy('start_date', 'asc');

  return (items as Record<string, unknown>[]).map((item) => ({
    period: item['period'] as string,
    investment: (item['seo_investment'] as number) + (item['api_costs'] as number) + (item['tool_costs'] as number) + (item['labor_costs'] as number),
    revenue: item['total_revenue'] as number,
    roi_percent: item['roi_percent'] as number,
    api_costs: item['api_costs'] as number,
  }));
}

// ---------------------------------------------------------------------------
// API Cost Calculation
// ---------------------------------------------------------------------------

async function getAPICostsForPeriod(
  projectId: string,
  startDate: string,
  endDate: string,
): Promise<number> {
  const logs = await db('api_usage_logs')
    .where('project_id', projectId)
    .where('created_at', '>=', startDate)
    .where('created_at', '<=', endDate)
    .select('service', 'cost');

  let totalCost = 0;
  for (const log of logs as Array<{ service: string; cost: number }>) {
    totalCost += log.cost ?? 0;
  }

  // If no usage logs, estimate based on API usage counts
  if (totalCost === 0) {
    const usageCount = await db('api_usage_logs')
      .where('project_id', projectId)
      .where('created_at', '>=', startDate)
      .where('created_at', '<=', endDate)
      .count<{ count: string }[]>('* as count');

    const count = parseInt(usageCount[0]?.count ?? '0', 10);
    totalCost = count * config.billing.dataforseoCostPerCall;
  }

  return Math.round(totalCost * 100) / 100;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatROI(raw: Record<string, unknown>): ROIMetrics {
  return {
    id: raw['id'] as string,
    project_id: raw['project_id'] as string,
    period: raw['period'] as string,
    start_date: raw['start_date'] as string,
    end_date: raw['end_date'] as string,
    seo_investment: raw['seo_investment'] as number,
    organic_traffic_value: raw['organic_traffic_value'] as number,
    api_costs: raw['api_costs'] as number,
    tool_costs: raw['tool_costs'] as number,
    labor_costs: raw['labor_costs'] as number,
    total_revenue: raw['total_revenue'] as number,
    roi_percent: raw['roi_percent'] as number,
    roi_ratio: raw['roi_ratio'] as number,
    created_at: raw['created_at'] as string,
    updated_at: raw['updated_at'] as string,
  };
}

export default {
  getROI,
  saveROI,
  getROITrend,
};