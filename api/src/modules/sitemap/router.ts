import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { success, badRequest } from '../../shared/utils/response.js';
import { db } from '../../shared/database.js';
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

// GET /v1/projects/:id/sitemap/download (真实 XML 生成)
router.get('/projects/:id/sitemap/download', async (req, res) => {
  try {
    const { id: projectId } = req.params;

    // Get project info
    const project = await db('projects').where('id', projectId).first();
    if (!project) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
    }

    const domain = (project as { domain: string }).domain;
    const baseUrl = `https://${domain}`;

    // Get crawled pages
    const pages = await db('crawl_pages')
      .where('project_id', projectId)
      .orderBy('crawled_at', 'desc')
      .limit(1000)
      .select('url', 'last_modified', 'priority', 'change_frequency');

    const today = new Date().toISOString().slice(0, 10);

    let urls = '';
    if (pages.length > 0) {
      urls = (pages as Array<{ url: string; last_modified: string | null; priority: number | null; change_frequency: string | null }>)
        .map((p) => {
          const lastmod = p.last_modified ? p.last_modified.slice(0, 10) : today;
          const priority = p.priority ?? 0.5;
          const changefreq = p.change_frequency ?? 'weekly';
          return `  <url>\n    <loc>${p.url}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority.toFixed(1)}</priority>\n  </url>`;
        })
        .join('\n');
    } else {
      // Fallback with homepage only
      urls = `  <url>\n    <loc>${baseUrl}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>`;
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="sitemap-${domain}.xml"`);
    res.send(xml);
  } catch (err) {
    badRequest(res, 'Failed to generate sitemap download', { error: (err as Error).message });
  }
});

export default router;