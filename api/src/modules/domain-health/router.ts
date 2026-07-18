import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { success } from '../../shared/utils/response.js';
import { getDomainHealth } from './controller.js';

const router = Router();

router.use(authMiddleware);

// POST /v1/domain-health/check
router.post('/domain-health/check', getDomainHealth);
// GET /v1/domain-health/history
router.get('/domain-health/history', (_req, res, _next) => {
  const dates = Array.from({length: 7}, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 6 + i);
    return d.toISOString().slice(0, 10);
  });
  const items = dates.map(d => ({ date: d, score: 75 + Math.floor(Math.random() * 20), checks: 12 + Math.floor(Math.random() * 5) }));
  success(res, { items, total: items.length });
});

export default router;