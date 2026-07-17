import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import {
  generateSitemap,
  getSitemap,
  validateSitemap,
  generateSitemapSchema,
  validateSitemapSchema,
} from './controller.js';

const router = Router();

router.use(authMiddleware);

router.post('/projects/:id/sitemap/generate', validate({ body: generateSitemapSchema }), generateSitemap);
router.get('/projects/:id/sitemap', getSitemap);
router.post('/projects/:id/sitemap/validate', validate({ body: validateSitemapSchema }), validateSitemap);

export default router;