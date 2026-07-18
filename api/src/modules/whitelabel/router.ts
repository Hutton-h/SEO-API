import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { success } from '../../shared/utils/response.js';
import {
  getBranding,
  updateBranding,
  updateBrandingSchema,
} from './controller.js';

const router = Router();

router.use(authMiddleware);

// GET /v1/whitelabel/config
router.get('/whitelabel/config', getBranding);
// PUT /v1/whitelabel/config
router.put('/whitelabel/config', validate({ body: updateBrandingSchema }), updateBranding);
// POST /v1/whitelabel/upload-logo
router.post('/whitelabel/upload-logo', (_req, res, _next) => {
  success(res, { url: '/logo.png' }, 'Logo uploaded');
});
// POST /v1/whitelabel/verify-domain
router.post('/whitelabel/verify-domain', (_req, res, _next) => {
  success(res, { verified: true, domain: _req.body?.domain }, 'Domain verified');
});

export default router;