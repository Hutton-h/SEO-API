import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { success, badRequest } from '../../shared/utils/response.js';
import { db } from '../../shared/database.js';
import {
  getRankings,
  fetchRankings,
  rankingsQuerySchema,
  fetchRankingsSchema,
} from './controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/projects/:id/rankings', validate({ query: rankingsQuerySchema }), getRankings);
router.post('/projects/:id/rankings/refresh', validate({ body: fetchRankingsSchema }), fetchRankings);

// ---- 排名历史 (真实数据库查询) ----
router.get('/projects/:id/rankings/:keywordId/history', async (req, res) => {
  try {
    const { id: projectId, keywordId } = req.params;

    const rankings = await db('rankings')
      .where('project_id', projectId)
      .where('keyword_id', keywordId)
      .orderBy('check_date', 'asc')
      .select('position', 'previous_position', 'check_date', 'url', 'search_engine');

    const history = rankings.map((r: { position: number | null; previous_position: number | null; check_date: string; url: string | null; search_engine: string }) => ({
      date: r.check_date,
      rank: r.position,
      previousRank: r.previous_position,
      url: r.url,
      searchEngine: r.search_engine,
    }));

    success(res, { history });
  } catch (err) {
    badRequest(res, 'Failed to fetch ranking history', { error: (err as Error).message });
  }
});

// ---- 排名摘要 (真实数据库统计) ----
router.get('/projects/:id/rankings/summary', async (req, res) => {
  try {
    const { id: projectId } = req.params;

    // Get latest rankings for each keyword
    const latestRankings = await db('rankings')
      .where('project_id', projectId)
      .whereNotNull('position')
      .distinctOn('keyword_id')
      .orderBy('keyword_id')
      .orderBy('check_date', 'desc')
      .select('position', 'previous_position', 'keyword_id');

    const total = latestRankings.length;
    const top3 = latestRankings.filter((r: { position: number }) => r.position <= 3).length;
    const top10 = latestRankings.filter((r: { position: number }) => r.position <= 10).length;
    const top50 = latestRankings.filter((r: { position: number }) => r.position <= 50).length;

    let improved = 0;
    let declined = 0;
    let unchanged = 0;

    for (const r of latestRankings as Array<{ position: number; previous_position: number | null }>) {
      if (r.previous_position === null) {
        unchanged++;
      } else if (r.position < r.previous_position) {
        improved++;
      } else if (r.position > r.previous_position) {
        declined++;
      } else {
        unchanged++;
      }
    }

    success(res, { total, top3, top10, top50, improved, declined, unchanged });
  } catch (err) {
    badRequest(res, 'Failed to fetch ranking summary', { error: (err as Error).message });
  }
});

export default router;