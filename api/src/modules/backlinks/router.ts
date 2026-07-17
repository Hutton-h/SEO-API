import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import {
  getBacklinks,
  refreshBacklinks,
  backlinksQuerySchema,
} from './controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/projects/:id/backlinks', validate({ query: backlinksQuerySchema }), getBacklinks);
router.post('/projects/:id/backlinks/refresh', refreshBacklinks);

export default router;