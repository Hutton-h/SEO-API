import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import {
  getRankings,
  fetchRankings,
  rankingsQuerySchema,
  fetchRankingsSchema,
} from './controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/projects/:id/rankings', validate({ query: rankingsQuerySchema }), getRankings);
router.post('/projects/:id/rankings/fetch', validate({ body: fetchRankingsSchema }), fetchRankings);

export default router;