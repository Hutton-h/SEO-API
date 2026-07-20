import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import {
  bulkAnalyzeDomains,
  bulkAnalyzeDomainsSchema,
} from './controller.js';

const router = Router();

router.use(authMiddleware);

router.post(
  '/bulk-analysis/domains',
  validate({ body: bulkAnalyzeDomainsSchema }),
  bulkAnalyzeDomains,
);

export default router;