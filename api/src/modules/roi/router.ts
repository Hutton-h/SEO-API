import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { success } from '../../shared/utils/response.js';
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

// GET /v1/roi/data (was projects/:id/roi)
router.get('/roi/data', validate({ query: roiQuerySchema }), getROI);
// GET /v1/roi/summary (was projects/:id/roi/trend)
router.get('/roi/summary', validate({ query: trendQuerySchema }), getROITrend);
// POST /v1/roi/entry (was projects/:id/roi)
router.post('/roi/entry', validate({ body: saveROISchema }), saveROI);
// GET /v1/roi/api-costs
router.get('/roi/api-costs', (_req, res, _next) => {
  success(res, { total: 45.32, breakdown: [
    { service: 'DataForSEO', cost: 18.50, calls: 1240 },
    { service: 'ValueSERP', cost: 12.00, calls: 850 },
    { service: 'Google PageSpeed', cost: 0, calls: 320 },
    { service: 'WhoisXML', cost: 8.82, calls: 180 },
    { service: 'OpenAI', cost: 6.00, calls: 95 },
  ] });
});

export default router;