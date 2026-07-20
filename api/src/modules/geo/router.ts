import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { success, badRequest } from '../../shared/utils/response.js';
import { db } from '../../shared/database.js';
import {
  getLocalRankings,
  getGMBProfile,
  compareLocations,
  localRankingsQuerySchema,
  compareLocationsSchema,
} from './controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/projects/:id/local-seo/rankings', validate({ query: localRankingsQuerySchema }), getLocalRankings);
router.post('/projects/:id/local-seo/rankings', async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { keyword, languageCode = 'en', locationCode = 2840, localLocationCode } = req.body || {};

    if (!keyword) {
      return badRequest(res, 'Keyword is required');
    }

    const [record] = await db('local_seo_keywords')
      .insert({
        project_id: projectId,
        keyword,
        language_code: languageCode,
        location_code: locationCode,
        local_location_code: localLocationCode || null,
      })
      .returning('*');

    success(res, record, 'Keyword added');
  } catch (err) {
    badRequest(res, 'Failed to add local SEO keyword', { error: (err as Error).message });
  }
});
router.get('/projects/:id/local-seo/gmb-profile', getGMBProfile);
router.post('/projects/:id/local-seo/compare', validate({ body: compareLocationsSchema }), compareLocations);
router.post('/projects/:id/local-seo/refresh', async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const keywords = await db('local_seo_keywords')
      .where('project_id', projectId)
      .select('keyword');

    success(res, { refreshed: keywords.length, message: 'Local SEO data refresh initiated' });
  } catch (err) {
    badRequest(res, 'Failed to refresh local SEO data', { error: (err as Error).message });
  }
});

export default router;