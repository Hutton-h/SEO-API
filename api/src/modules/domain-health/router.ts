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
  success(res, { items: [], total: 0 });
});

export default router;