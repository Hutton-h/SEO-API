import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import {
  getROI,
  saveROI,
  getROITrend,
  saveROISchema,
  roiQuerySchema,
  trendQuerySchema,
} from './controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/projects/:id/roi', validate({ query: roiQuerySchema }), getROI);
router.post('/projects/:id/roi', validate({ body: saveROISchema }), saveROI);
router.get('/projects/:id/roi/trend', validate({ query: trendQuerySchema }), getROITrend);

export default router;