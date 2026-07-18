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
  const dates = Array.from({length: 30}, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 29 + i);
    return d.toISOString().slice(0, 10);
  });
  const baseRank = Math.floor(Math.random() * 15) + 3;
  const history = dates.map(d => ({
    date: d, rank: Math.max(1, baseRank + Math.floor(Math.random() * 5) - 2),
  }));
  res.json({ success: true, data: { history } });
});
router.get('/projects/:id/rankings/summary', (req, res) => {
  res.json({ success: true, data: { total: 42, top3: 8, top10: 21, top50: 38, improved: 15, declined: 7, unchanged: 20 } });
});

export default router;