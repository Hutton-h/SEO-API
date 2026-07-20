import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { success, badRequest } from '../../shared/utils/response.js';
import { db } from '../../shared/database.js';
import {
  getUptimeStatus,
  checkNow,
  getUptimeLogs,
  logsQuerySchema,
} from './controller.js';
import * as monitorService from './service.js';

const router = Router();

router.use(authMiddleware);

// GET /v1/monitor/status
router.get('/monitor/status', getUptimeStatus);

// GET /v1/monitor/response-time (真实数据库查询)
router.get('/monitor/response-time', async (req, res) => {
  try {
    const projectId = (req.query.projectId as string) || (req.body as any)?.projectId;

    // Get hourly response time averages for last 24 hours
    const hourlyData = await db('uptime_logs')
      .where('project_id', projectId)
      .where('checked_at', '>=', db.raw("NOW() - INTERVAL '24 hours'"))
      .select(
        db.raw("EXTRACT(HOUR FROM checked_at) as hour"),
        db.raw('AVG(response_time_ms)::int as avg'),
        db.raw('PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms)::int as p95'),
      )
      .groupBy(db.raw('EXTRACT(HOUR FROM checked_at)'))
      .orderBy('hour', 'asc');

    const hourly = (hourlyData as Array<{ hour: number; avg: number; p95: number }>).map((h) => ({
      hour: h.hour,
      avg: h.avg || 0,
      p95: h.p95 || 0,
    }));

    // Overall stats
    const overallResult = await db('uptime_logs')
      .where('project_id', projectId)
      .where('checked_at', '>=', db.raw("NOW() - INTERVAL '24 hours'"))
      .select(
        db.raw('AVG(response_time_ms)::int as avg_rt'),
        db.raw('PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms)::int as p95_rt'),
        db.raw('PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms)::int as p99_rt'),
      )
      .first();

    const overall = overallResult as unknown as { avg_rt: number; p95_rt: number; p99_rt: number } | null;

    success(res, {
      avg: overall?.avg_rt ?? 0,
      p95: overall?.p95_rt ?? 0,
      p99: overall?.p99_rt ?? 0,
      hourly,
    });
  } catch (err) {
    badRequest(res, 'Failed to fetch response time data', { error: (err as Error).message });
  }
});

// GET /v1/monitor/sla (真实 SLA 计算)
router.get('/monitor/sla', async (req, res) => {
  try {
    const projectId = (req.query.projectId as string) || (req.body as any)?.projectId;
    if (!projectId) {
      return success(res, { uptimePercent: 100, totalChecks: 0, failedChecks: 0, last30Days: [] });
    }

    const sla = await monitorService.calculateSLA(projectId);
    success(res, {
      uptimePercent: sla.uptimePercent,
      totalChecks: sla.totalChecks,
      failedChecks: sla.downChecks,
      averageResponseTime: sla.averageResponseTime,
      last30Days: sla.last30Days,
    });
  } catch (err) {
    badRequest(res, 'Failed to fetch SLA data', { error: (err as Error).message });
  }
});

// GET /v1/monitor/downtime (真实停机事件查询)
router.get('/monitor/downtime', async (req, res) => {
  try {
    const projectId = (req.query.projectId as string) || (req.body as any)?.projectId;
    if (!projectId) {
      return success(res, { totalDowntime: 0, incidents: [] });
    }

    const incidents = await db('uptime_logs')
      .where('project_id', projectId)
      .where('is_up', false)
      .where('checked_at', '>=', db.raw("NOW() - INTERVAL '30 days'"))
      .orderBy('checked_at', 'desc')
      .limit(50)
      .select('id', 'checked_at', 'status_code', 'error_message', 'response_time_ms');

    const totalDowntime = incidents.length;

    const formattedIncidents = (incidents as Array<{
      id: string; checked_at: string; status_code: number; error_message: string | null; response_time_ms: number;
    }>).map((inc) => ({
      id: inc.id,
      start: inc.checked_at,
      end: inc.checked_at,
      duration: inc.response_time_ms,
      reason: inc.error_message || `HTTP ${inc.status_code}`,
    }));

    success(res, { totalDowntime, incidents: formattedIncidents });
  } catch (err) {
    badRequest(res, 'Failed to fetch downtime data', { error: (err as Error).message });
  }
});

// POST /v1/monitor/check
router.post('/monitor/check', checkNow);

// GET /v1/monitor/logs
router.get('/monitor/logs', validate({ query: logsQuerySchema }), getUptimeLogs);

// GET /v1/monitor/targets (真实数据库查询)
router.get('/monitor/targets', async (req, res) => {
  try {
    const projectId = (req.query.projectId as string) || (req.body as any)?.projectId;

    // Get projects as monitor targets
    const projects = projectId
      ? await db('projects').where('id', projectId).select('id', 'domain', 'name')
      : await db('projects').select('id', 'domain', 'name').limit(20);

    // Get latest check for each project
    const targets = await Promise.all(
      (projects as Array<{ id: string; domain: string; name: string }>).map(async (p) => {
        const lastCheck = await db('uptime_logs')
          .where('project_id', p.id)
          .orderBy('checked_at', 'desc')
          .first();

        return {
          id: p.id,
          url: `https://${p.domain}`,
          name: p.name,
          type: 'https',
          status: lastCheck ? ((lastCheck as { is_up: boolean }).is_up ? 'up' : 'down') : 'unknown',
          lastCheck: lastCheck ? (lastCheck as { checked_at: string }).checked_at : null,
          responseTime: lastCheck ? (lastCheck as { response_time_ms: number }).response_time_ms : null,
        };
      }),
    );

    success(res, targets);
  } catch (err) {
    badRequest(res, 'Failed to fetch monitor targets', { error: (err as Error).message });
  }
});

// POST /v1/monitor/targets (添加监控目标 - 实际是创建项目时自动添加)
router.post('/monitor/targets', async (req, res) => {
  try {
    const { url, name } = req.body || {};
    if (!url) {
      return badRequest(res, 'URL is required');
    }

    // Extract domain from URL
    const domain = url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    // Check if project exists
    const existing = await db('projects').where('domain', domain).first();
    if (existing) {
      return success(res, existing, 'Target already exists');
    }

    // Create a project for this target
    const [project] = await db('projects')
      .insert({
        domain,
        name: name || domain,
        status: 'active',
      })
      .returning('*');

    success(res, project, 'Target added');
  } catch (err) {
    badRequest(res, 'Failed to add monitor target', { error: (err as Error).message });
  }
});

export default router;