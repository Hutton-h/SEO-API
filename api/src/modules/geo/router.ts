import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import {
  getLocalRankings,
  getGMBProfile,
  compareLocations,
  localRankingsQuerySchema,
  compareLocationsSchema,
} from './controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/projects/:id/geo/rankings', validate({ query: localRankingsQuerySchema }), getLocalRankings);
router.get('/projects/:id/geo/gmb', getGMBProfile);
router.post('/projects/:id/geo/compare', validate({ body: compareLocationsSchema }), compareLocations);

export default router;