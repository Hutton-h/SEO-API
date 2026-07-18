import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { getASORankings, asoQuerySchema } from './controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/projects/:id/aso/keywords', validate({ query: asoQuerySchema }), getASORankings);
router.get('/projects/:id/aso/trend', (req, res) => {
  res.json({ success: true, data: { trend: [] } });
});
router.post('/projects/:id/aso/refresh', (req, res) => {
  res.json({ success: true, data: { message: 'ASO data refresh initiated' } });
});

export default router;