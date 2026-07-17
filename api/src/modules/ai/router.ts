import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { optimizeContent, optimizeContentSchema } from './controller.js';

const router = Router();

router.use(authMiddleware);

router.post('/projects/:id/ai/optimize', validate({ body: optimizeContentSchema }), optimizeContent);

export default router;