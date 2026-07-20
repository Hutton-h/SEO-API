import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { getDomainOverview, getOverviewHistory } from './controller.js';

const router = Router();

router.use(authMiddleware);

// POST /v1/domain-overview
router.post('/domain-overview', getDomainOverview);

// GET /v1/domain-overview/history
router.get('/domain-overview/history', getOverviewHistory);

export default router;