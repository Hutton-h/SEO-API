import { db } from '../../shared/database.js';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UptimeLog {
  id: string;
  project_id: string;
  url: string;
  status_code: number;
  response_time_ms: number;
  is_up: boolean;
  error_message: string | null;
  checked_at: string;
}

export interface SLAReport {
  projectId: string;
  totalChecks: number;
  upChecks: number;
  downChecks: number;
  uptimePercent: number;
  averageResponseTime: number;
  lastCheckedAt: string | null;
  last30Days: Array<{ date: string; uptimePercent: number }>;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

// ---------------------------------------------------------------------------
// Check Service
// ---------------------------------------------------------------------------

export async function checkNow(projectId: string): Promise<UptimeLog> {
  const project = await db('projects').where('id', projectId).first();
  if (!project) {
    throw new Error('Project not found');
  }

  const domain = (project as { domain: string }).domain;
  const url = `https://${domain}`;

  const startTime = Date.now();
  let statusCode = 0;
  let isUp = false;
  let errorMessage: string | null = null;

  try {
    const response = await axios.get(url, {
      timeout: 30000,
      validateStatus: () => true,
      headers: {
        'User-Agent': 'CraneSEO-UptimeMonitor/1.0',
      },
    });
    statusCode = response.status;
    isUp = statusCode >= 200 && statusCode < 500;
  } catch (err) {
    statusCode = 0;
    isUp = false;
    errorMessage = err instanceof Error ? err.message : 'Unknown error';
  }

  const responseTimeMs = Date.now() - startTime;

  const id = uuidv4();
  const [log] = await db('uptime_logs')
    .insert({
      id,
      project_id: projectId,
      url,
      status_code: statusCode,
      response_time_ms: responseTimeMs,
      is_up: isUp,
      error_message: errorMessage,
    })
    .returning('*');

  return formatUptimeLog(log);
}

// ---------------------------------------------------------------------------
// Uptime Status
// ---------------------------------------------------------------------------

export async function getUptimeStatus(projectId: string): Promise<{
  isUp: boolean;
  lastCheck: UptimeLog | null;
  sla: SLAReport;
}> {
  const lastCheck = await db('uptime_logs')
    .where('project_id', projectId)
    .orderBy('checked_at', 'desc')
    .first();

  const sla = await calculateSLA(projectId);

  return {
    isUp: lastCheck ? (lastCheck as { is_up: boolean }).is_up : true,
    lastCheck: lastCheck ? formatUptimeLog(lastCheck) : null,
    sla,
  };
}

// ---------------------------------------------------------------------------
// Uptime Logs
// ---------------------------------------------------------------------------

export async function getUptimeLogs(
  projectId: string,
  params: { page: number; pageSize: number; isUp?: boolean },
): Promise<PaginatedResult<UptimeLog>> {
  const { page, pageSize, isUp } = params;

  let query = db('uptime_logs').where('project_id', projectId);

  if (isUp !== undefined) {
    query = query.where('is_up', isUp);
  }

  const [{ count }] = await query.clone().clearSelect().count<{ count: string }[]>();
  const total = parseInt(count, 10);

  const items = await query
    .orderBy('checked_at', 'desc')
    .offset((page - 1) * pageSize)
    .limit(pageSize);

  return { items: (items as Record<string, unknown>[]).map(formatUptimeLog), total };
}

// ---------------------------------------------------------------------------
// SLA Calculation
// ---------------------------------------------------------------------------

export async function calculateSLA(projectId: string): Promise<SLAReport> {
  // Total checks in last 30 days
  const totalChecksResult = await db('uptime_logs')
    .where('project_id', projectId)
    .where('checked_at', '>=', db.raw("NOW() - INTERVAL '30 days'"))
    .count<{ count: string }[]>('* as count');

  const upChecksResult = await db('uptime_logs')
    .where('project_id', projectId)
    .where('checked_at', '>=', db.raw("NOW() - INTERVAL '30 days'"))
    .where('is_up', true)
    .count<{ count: string }[]>('* as count');

  const totalChecks = parseInt(totalChecksResult[0]?.count ?? '0', 10);
  const upChecks = parseInt(upChecksResult[0]?.count ?? '0', 10);
  const downChecks = totalChecks - upChecks;
  const uptimePercent = totalChecks > 0 ? (upChecks / totalChecks) * 100 : 100;

  // Average response time
  const avgResponseTimeResult = await db('uptime_logs')
    .where('project_id', projectId)
    .where('checked_at', '>=', db.raw("NOW() - INTERVAL '30 days'"))
    .avg('response_time_ms as avg_rt')
    .first();

  const averageResponseTime = avgResponseTimeResult
    ? Math.round((avgResponseTimeResult as unknown as { avg_rt: string }).avg_rt as unknown as number)
    : 0;

  const lastCheckedResult = await db('uptime_logs')
    .where('project_id', projectId)
    .orderBy('checked_at', 'desc')
    .first();

  // Daily breakdown
  const dailyLogs = await db('uptime_logs')
    .where('project_id', projectId)
    .where('checked_at', '>=', db.raw("NOW() - INTERVAL '30 days'"))
    .select(
      db.raw("DATE(checked_at) as date"),
      db.raw('COUNT(*) as total'),
      db.raw("SUM(CASE WHEN is_up = true THEN 1 ELSE 0 END) as up_count"),
    )
    .groupBy(db.raw('DATE(checked_at)'))
    .orderBy('date', 'asc');

  const last30Days = (dailyLogs as Array<{ date: string; total: string; up_count: string }>).map((d) => {
    const total = parseInt(d.total, 10);
    const up = parseInt(d.up_count, 10);
    return {
      date: d.date,
      uptimePercent: total > 0 ? Math.round((up / total) * 10000) / 100 : 100,
    };
  });

  return {
    projectId,
    totalChecks,
    upChecks,
    downChecks,
    uptimePercent: Math.round(uptimePercent * 100) / 100,
    averageResponseTime,
    lastCheckedAt: lastCheckedResult
      ? (lastCheckedResult as { checked_at: string }).checked_at
      : null,
    last30Days,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatUptimeLog(raw: Record<string, unknown>): UptimeLog {
  return {
    id: raw['id'] as string,
    project_id: raw['project_id'] as string,
    url: raw['url'] as string,
    status_code: raw['status_code'] as number,
    response_time_ms: raw['response_time_ms'] as number,
    is_up: Boolean(raw['is_up']),
    error_message: (raw['error_message'] as string) ?? null,
    checked_at: raw['checked_at'] as string,
  };
}

export default {
  checkNow,
  getUptimeStatus,
  getUptimeLogs,
  calculateSLA,
};