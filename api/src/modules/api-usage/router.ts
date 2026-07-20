import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { success, badRequest } from '../../shared/utils/response.js';
import { db } from '../../shared/database.js';
import {
  getSummary,
  getDailyUsage,
  getByService,
  getCostBreakdown,
  summaryQuerySchema,
  dailyQuerySchema,
  serviceQuerySchema,
  costQuerySchema,
} from './controller.js';

const router = Router();

router.use(authMiddleware);

// GET /v1/api-usage/stats
router.get('/api-usage/stats', validate({ query: summaryQuerySchema }), getSummary);
// GET /v1/api-usage/daily
router.get('/api-usage/daily', validate({ query: dailyQuerySchema }), getDailyUsage);
// GET /v1/api-usage/breakdown
router.get('/api-usage/breakdown', validate({ query: serviceQuerySchema }), getByService);
// GET /v1/api-usage/cost
router.get('/api-usage/cost', validate({ query: costQuerySchema }), getCostBreakdown);

// GET /v1/api-usage/alert-config (真实数据库查询)
router.get('/api-usage/alert-config', async (req, res) => {
  try {
    const projectId = (req.query.projectId as string) || (req.body as any)?.projectId;

    const config = await db('api_usage_alert_config')
      .where('project_id', projectId)
      .first();

    if (!config) {
      return success(res, { enabled: false, threshold: 100, email: '' });
    }

    success(res, {
      enabled: (config as { enabled: boolean }).enabled,
      threshold: (config as { threshold: number }).threshold,
      email: (config as { email: string }).email,
    });
  } catch (err) {
    // Table may not exist, return defaults
    success(res, { enabled: false, threshold: 100, email: '' });
  }
});

// PUT /v1/api-usage/alert-config (真实数据库更新)
router.put('/api-usage/alert-config', async (req, res) => {
  try {
    const projectId = (req.query.projectId as string) || (req.body as any)?.projectId || req.body?.project_id;
    const { enabled, threshold, email } = req.body || {};

    const [config] = await db('api_usage_alert_config')
      .insert({
        project_id: projectId,
        enabled: enabled ?? false,
        threshold: threshold ?? 100,
        email: email ?? '',
      })
      .onConflict('project_id')
      .merge({ enabled, threshold, email })
      .returning('*');

    success(res, config, 'Alert config updated');
  } catch (err) {
    badRequest(res, 'Failed to update alert config', { error: (err as Error).message });
  }
});

export default router;