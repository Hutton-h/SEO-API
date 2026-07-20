import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { success, badRequest } from '../../shared/utils/response.js';
import { db } from '../../shared/database.js';
import { getDomainHealth } from './controller.js';

const router = Router();

router.use(authMiddleware);

// POST /v1/domain-health/check
router.post('/domain-health/check', getDomainHealth);

// GET /v1/domain-health/history (真实数据库查询)
router.get('/domain-health/history', async (req, res) => {
  try {
    const projectId = (req.query.projectId as string) || (req.body as any)?.projectId;

    // Get domain health checks from the last 30 days
    const checks = await db('domain_health_checks')
      .where('project_id', projectId)
      .where('checked_at', '>=', db.raw("NOW() - INTERVAL '30 days'"))
      .orderBy('checked_at', 'desc')
      .select('score', 'checked_at', 'total_checks');

    if (checks.length === 0) {
      // Fallback: return empty with current health check
      const current = await getDomainHealth(
        { query: { projectId }, body: { projectId } } as any,
        { json: () => {} } as any,
        (() => {}) as any,
      );
      return success(res, { items: [], total: 0 });
    }

    const items = (checks as Array<{ score: number; checked_at: string; total_checks: number }>).map((c) => ({
      date: (c.checked_at as string).slice(0, 10),
      score: c.score,
      checks: c.total_checks,
    }));

    success(res, { items, total: items.length });
  } catch (err) {
    badRequest(res, 'Failed to fetch domain health history', { error: (err as Error).message });
  }
});

export default router;