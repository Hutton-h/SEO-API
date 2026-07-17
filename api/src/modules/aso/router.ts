import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { getASORankings, asoQuerySchema } from './controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/projects/:id/aso/rankings', validate({ query: asoQuerySchema }), getASORankings);

export default router;