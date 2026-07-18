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

router.get('/projects/:id/sitemap/download', (req, res) => {
  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Content-Disposition', `attachment; filename="sitemap-${req.params.id}.xml"`);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/</loc><lastmod>2026-07-15</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>https://example.com/products</loc><lastmod>2026-07-14</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>
</urlset>`;
  res.send(xml);
});

export default router;