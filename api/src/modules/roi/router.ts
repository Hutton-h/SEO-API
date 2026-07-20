import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { success, badRequest } from '../../shared/utils/response.js';
import { db } from '../../shared/database.js';
import * as dataforseo from '../../services/dataforseo.js';
import {
  getROI,
  saveROI,
  getROITrend,
  saveROISchema,
  roiQuerySchema,
  trendQuerySchema,
} from './controller.js';

const router = Router();

router.use(authMiddleware);

// GET /v1/roi/data
router.get('/roi/data', validate({ query: roiQuerySchema }), getROI);
// GET /v1/roi/summary
router.get('/roi/summary', validate({ query: trendQuerySchema }), getROITrend);
// POST /v1/roi/entry
router.post('/roi/entry', validate({ body: saveROISchema }), saveROI);

// GET /v1/roi/api-costs (真实调用统计)
router.get('/roi/api-costs', async (_req, res) => {
  try {
    const stats = dataforseo.getCallStats();
    const projectId = (_req.query.projectId as string) || (_req.body as any)?.projectId;

    // Get API usage from database as well
    let dbUsage: Array<{ service: string; calls: number; cost: number }> = [];
    try {
      const usage = await db('api_usage_logs')
        .select('service')
        .count('* as call_count')
        .groupBy('service')
        .orderBy('call_count', 'desc');

      dbUsage = (usage as Array<{ service: string; call_count: string }>).map((u) => ({
        service: u.service,
        calls: parseInt(u.call_count, 10),
        cost: 0,
      }));
    } catch {
      // Table may not exist yet
    }

    const breakdown = [
      { service: 'DataForSEO', cost: stats.totalCost, calls: stats.totalCalls },
      ...dbUsage.filter((u) => u.service !== 'DataForSEO'),
    ];

    const total = breakdown.reduce((sum, b) => sum + b.cost, 0);

    success(res, { total: Math.round(total * 100) / 100, breakdown });
  } catch (err) {
    badRequest(res, 'Failed to fetch API costs', { error: (err as Error).message });
  }
});

export default router;