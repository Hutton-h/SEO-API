import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { getTopPages } from './controller.js';

const router = Router();

router.use(authMiddleware);

// POST /v1/top-pages
router.post('/top-pages', getTopPages);

export default router;