// ---------------------------------------------------------------------------
// Google Trends Module - Router
// ---------------------------------------------------------------------------

import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import {
  compareTrends,
  getInterestByRegion,
  getRelatedQueries,
  compareTrendsSchema,
  interestByRegionSchema,
  relatedQueriesSchema,
} from './controller.js';

const router = Router();

router.use(authMiddleware);

router.post('/trends/compare', validate({ body: compareTrendsSchema }), compareTrends);
router.post('/trends/interest-by-region', validate({ body: interestByRegionSchema }), getInterestByRegion);
router.post('/trends/related-queries', validate({ body: relatedQueriesSchema }), getRelatedQueries);

export default router;