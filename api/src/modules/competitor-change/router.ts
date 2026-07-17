import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import {
  getChanges,
  checkNow,
  changesQuerySchema,
} from './controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/projects/:id/competitor-changes', validate({ query: changesQuerySchema }), getChanges);
router.post('/projects/:id/competitor-changes/check', checkNow);

export default router;