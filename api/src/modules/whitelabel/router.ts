import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import {
  getBranding,
  updateBranding,
  updateBrandingSchema,
} from './controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/projects/:id/branding', getBranding);
router.put('/projects/:id/branding', validate({ body: updateBrandingSchema }), updateBranding);

export default router;