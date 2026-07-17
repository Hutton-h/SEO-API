import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { getDomainHealth } from './controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/projects/:id/domain-health', getDomainHealth);

export default router;