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
router.post('/projects/:id/rankings/refresh', validate({ body: fetchRankingsSchema }), fetchRankings);
router.get('/projects/:id/rankings/:keywordId/history', (req, res) => {
  res.json({ success: true, data: { keywordId: req.params.keywordId, history: [] } });
});
router.get('/projects/:id/rankings/summary', (req, res) => {
  res.json({ success: true, data: { totalKeywords: 0, avgPosition: 0, top10: 0, top3: 0 } });
});

export default router;