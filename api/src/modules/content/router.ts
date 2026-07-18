import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import {
  getContentAnalysis,
  analyzeUrl,
  getQualityScore,
  contentAnalysisQuerySchema,
  analyzeUrlSchema,
} from './controller.js';

const router = Router();

router.use(authMiddleware);

// POST /v1/content/analyze (was projects/:id/content/analyze-url)
router.post('/content/analyze', validate({ body: analyzeUrlSchema }), analyzeUrl);
// GET /v1/content/history (was projects/:id/content/analysis)
router.get('/content/history', validate({ query: contentAnalysisQuerySchema }), getContentAnalysis);
// GET /v1/content/quality-score (was projects/:id/content/quality-score)
router.get('/content/quality-score', getQualityScore);

export default router;