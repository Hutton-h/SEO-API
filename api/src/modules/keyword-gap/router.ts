import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { analyzeKeywordGap, getDomainIntersection } from './controller.js';

const router = Router();

router.use(authMiddleware);

// POST /v1/keyword-gap
router.post('/keyword-gap', analyzeKeywordGap);

// POST /v1/keyword-gap/intersection
router.post('/keyword-gap/intersection', getDomainIntersection);

export default router;