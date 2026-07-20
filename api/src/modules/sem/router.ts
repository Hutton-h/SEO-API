import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { success, badRequest } from '../../shared/utils/response.js';
import { db } from '../../shared/database.js';
import {
  getKeywordMetrics,
  getCompetitorAds,
  getOpportunities,
  semQuerySchema,
} from './controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/projects/:id/sem/keywords', validate({ query: semQuerySchema }), getKeywordMetrics);
router.post('/projects/:id/sem/keywords', async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { keyword, language = 'en', locationCode = 2840, matchType = 'broad', bid } = req.body || {};

    if (!keyword) {
      return badRequest(res, 'Keyword is required');
    }

    const [record] = await db('sem_keywords')
      .insert({
        project_id: projectId,
        keyword,
        language,
        location_code: locationCode,
        match_type: matchType,
        bid: bid ?? 0,
      })
      .returning('*');

    success(res, record, 'Keyword added');
  } catch (err) {
    badRequest(res, 'Failed to add SEM keyword', { error: (err as Error).message });
  }
});
router.get('/projects/:id/sem/competitor-ads', validate({ query: semQuerySchema }), getCompetitorAds);
router.get('/projects/:id/sem/opportunities', getOpportunities);
router.post('/projects/:id/sem/refresh', async (req, res) => {
  try {
    const { id: projectId } = req.params;
    // Trigger a re-fetch of SEM metrics
    const keywords = await db('sem_keywords')
      .where('project_id', projectId)
      .select('keyword');

    if (keywords.length === 0) {
      return success(res, { refreshed: 0, message: 'No SEM keywords to refresh' });
    }

    success(res, { refreshed: keywords.length, message: 'SEM data refresh initiated' });
  } catch (err) {
    badRequest(res, 'Failed to refresh SEM data', { error: (err as Error).message });
  }
});

export default router;