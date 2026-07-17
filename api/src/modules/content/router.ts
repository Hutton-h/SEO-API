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

router.get('/projects/:id/content/analysis', validate({ query: contentAnalysisQuerySchema }), getContentAnalysis);
router.post('/projects/:id/content/analyze-url', validate({ body: analyzeUrlSchema }), analyzeUrl);
router.get('/projects/:id/content/quality-score', getQualityScore);

export default router;