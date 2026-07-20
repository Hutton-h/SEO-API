import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { success, badRequest } from '../../shared/utils/response.js';
import { db } from '../../shared/database.js';
import {
  addCompetitor,
  getCompetitorOverview,
  getKeywordOverlap,
  addCompetitorSchema,
} from './controller.js';

const router = Router();

router.use(authMiddleware);

router.post('/projects/:id/competitors', validate({ body: addCompetitorSchema }), addCompetitor);
router.get('/projects/:id/competitors/overview', getCompetitorOverview);
router.get('/projects/:id/competitors/keyword-overlap', getKeywordOverlap);
router.post('/projects/:id/competitors/:competitorId/remove', async (req, res) => {
  try {
    const { id: projectId, competitorId } = req.params;

    const deleted = await db('competitors')
      .where('id', competitorId)
      .where('project_id', projectId)
      .delete();

    if (!deleted) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Competitor not found' } });
    }

    success(res, { message: 'Competitor removed', projectId, competitorId });
  } catch (err) {
    badRequest(res, 'Failed to remove competitor', { error: (err as Error).message });
  }
});

export default router;