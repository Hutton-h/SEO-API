import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import {
  getSerpFeatures,
  serpFeaturesQuerySchema,
} from './controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/projects/:id/serp-features', validate({ query: serpFeaturesQuerySchema }), getSerpFeatures);

export default router;