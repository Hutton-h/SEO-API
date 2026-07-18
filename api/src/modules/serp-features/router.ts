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
router.get('/projects/:id/serp-features/:featureKey', (req, res) => {
  res.json({ success: true, data: { featureKey: req.params.featureKey, details: {} } });
});

export default router;