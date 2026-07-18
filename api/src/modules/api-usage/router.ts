import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { success } from '../../shared/utils/response.js';
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

// GET /v1/api-usage/stats (was summary)
router.get('/api-usage/stats', validate({ query: summaryQuerySchema }), getSummary);
// GET /v1/api-usage/daily
router.get('/api-usage/daily', validate({ query: dailyQuerySchema }), getDailyUsage);
// GET /v1/api-usage/breakdown (was by-service)
router.get('/api-usage/breakdown', validate({ query: serviceQuerySchema }), getByService);
// GET /v1/api-usage/cost
router.get('/api-usage/cost', validate({ query: costQuerySchema }), getCostBreakdown);
// GET /v1/api-usage/alert-config
router.get('/api-usage/alert-config', (_req, res, _next) => {
  success(res, { enabled: false, threshold: 100, email: '' });
});
// PUT /v1/api-usage/alert-config
router.put('/api-usage/alert-config', (_req, res, _next) => {
  success(res, { ..._req.body }, 'Alert config updated');
});

export default router;