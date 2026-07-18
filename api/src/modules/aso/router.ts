import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { getASORankings, asoQuerySchema } from './controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/projects/:id/aso/keywords', validate({ query: asoQuerySchema }), getASORankings);
router.post('/projects/:id/aso/keywords', (req, res) => {
  res.json({ success: true, data: { id: Date.now().toString(), ...req.body }, message: 'Keyword added' });
});
router.get('/projects/:id/aso/trend', (req, res) => {
  const months = ['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07'];
  const trend = months.map((m, i) => ({ month: m, avgRank: Math.max(1, 15 - i + Math.floor(Math.random() * 3)), impressions: 800 + i * 120 + Math.floor(Math.random() * 200) }));
  res.json({ success: true, data: { trend } });
});
router.post('/projects/:id/aso/refresh', (req, res) => {
  res.json({ success: true, data: { message: 'ASO data refresh initiated' } });
});

export default router;