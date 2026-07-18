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
router.get('/competitor-changes/distribution/:id', (_req, res, _next) => {
  success(res, { id: _req.params.id, distribution: [] });
});

export default router;