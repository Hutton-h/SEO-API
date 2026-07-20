import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { success, badRequest } from '../../shared/utils/response.js';
import { db } from '../../shared/database.js';
import {
  getBacklinks,
  refreshBacklinks,
  backlinksQuerySchema,
} from './controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/projects/:id/backlinks', validate({ query: backlinksQuerySchema }), getBacklinks);
router.post('/projects/:id/backlinks/refresh', refreshBacklinks);

// ---- 外链统计 (真实数据库查询) ----
router.get('/projects/:id/backlinks/stats', async (req, res) => {
  try {
    const { id: projectId } = req.params;

    const [totalResult] = await db('backlinks')
      .where('project_id', projectId)
      .count<{ count: string }[]>('* as count');

    const [dofollowResult] = await db('backlinks')
      .where('project_id', projectId)
      .where('is_dofollow', true)
      .count<{ count: string }[]>('* as count');

    const [nofollowResult] = await db('backlinks')
      .where('project_id', projectId)
      .where('is_dofollow', false)
      .count<{ count: string }[]>('* as count');

    // Count unique referring domains
    const domainsResult = await db('backlinks')
      .where('project_id', projectId)
      .distinct('source_url')
      .count<{ count: string }[]>('* as count');

    // Average domain authority
    const avgDAResult = await db('backlinks')
      .where('project_id', projectId)
      .whereNotNull('domain_authority')
      .avg('domain_authority as avg_da')
      .first();

    // New backlinks in last 30 days
    const [newResult] = await db('backlinks')
      .where('project_id', projectId)
      .where('first_seen', '>=', db.raw("NOW() - INTERVAL '30 days'"))
      .count<{ count: string }[]>('* as count');

    // Lost backlinks in last 30 days
    const [lostResult] = await db('backlinks')
      .where('project_id', projectId)
      .where('last_seen', '>=', db.raw("NOW() - INTERVAL '30 days'"))
      .whereNotNull('last_seen')
      .count<{ count: string }[]>('* as count');

    const totalBacklinks = parseInt(totalResult?.count ?? '0', 10);
    const dofollow = parseInt(dofollowResult?.count ?? '0', 10);
    const nofollow = parseInt(nofollowResult?.count ?? '0', 10);
    const referringDomains = parseInt(domainsResult?.[0]?.count ?? '0', 10);
    const avgDomainAuthority = Math.round((avgDAResult as unknown as { avg_da: number | null })?.avg_da ?? 0);
    const newLastMonth = parseInt(newResult?.count ?? '0', 10);
    const lostLastMonth = parseInt(lostResult?.count ?? '0', 10);

    success(res, {
      totalBacklinks,
      referringDomains,
      dofollow,
      nofollow,
      avgDomainAuthority,
      newLastMonth,
      lostLastMonth,
    });
  } catch (err) {
    badRequest(res, 'Failed to fetch backlink stats', { error: (err as Error).message });
  }
});

export default router;