import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { success } from '../../shared/utils/response.js';
import {
  getChanges,
  checkNow,
  changesQuerySchema,
} from './controller.js';

const router = Router();

router.use(authMiddleware);

// GET /v1/competitor-changes (was projects/:id/competitor-changes)
router.get('/competitor-changes', validate({ query: changesQuerySchema }), getChanges);
// POST /v1/competitor-changes/detect (was projects/:id/competitor-changes/check)
router.post('/competitor-changes/detect', checkNow);
// GET /v1/competitor-changes/distribution/:id
router.get('/competitor-changes/distribution/:changeId', (_req, res, _next) => {
  success(res, { distribution: [
    { type: 'keyword_gain', count: 12, percentage: 30 },
    { type: 'keyword_loss', count: 5, percentage: 12.5 },
    { type: 'ranking_improve', count: 15, percentage: 37.5 },
    { type: 'ranking_decline', count: 8, percentage: 20 },
  ] });
});

export default router;