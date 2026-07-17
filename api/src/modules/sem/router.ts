import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import {
  getKeywordMetrics,
  getCompetitorAds,
  getOpportunities,
  semQuerySchema,
} from './controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/projects/:id/sem/keyword-metrics', validate({ query: semQuerySchema }), getKeywordMetrics);
router.get('/projects/:id/sem/competitor-ads', validate({ query: semQuerySchema }), getCompetitorAds);
router.get('/projects/:id/sem/opportunities', getOpportunities);

export default router;