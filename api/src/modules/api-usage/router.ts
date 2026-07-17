import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import {
  getSummary,
  getDailyUsage,
  getByService,
  getCostBreakdown,
  summaryQuerySchema,
  dailyQuerySchema,
  serviceQuerySchema,
  costQuerySchema,
} from './controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/api-usage/summary', validate({ query: summaryQuerySchema }), getSummary);
router.get('/api-usage/daily', validate({ query: dailyQuerySchema }), getDailyUsage);
router.get('/api-usage/by-service', validate({ query: serviceQuerySchema }), getByService);
router.get('/api-usage/cost', validate({ query: costQuerySchema }), getCostBreakdown);

export default router;