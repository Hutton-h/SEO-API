import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
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

export default router;