// ---------------------------------------------------------------------------
// PageSpeed Module - Router
// ---------------------------------------------------------------------------

import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import {
  analyzePageSpeed,
  batchAnalyze,
  analyzeSchema,
  batchAnalyzeSchema,
} from './controller.js';

const router = Router();

router.use(authMiddleware);

router.post('/pagespeed/analyze', validate({ body: analyzeSchema }), analyzePageSpeed);
router.post('/pagespeed/batch', validate({ body: batchAnalyzeSchema }), batchAnalyze);

export default router;