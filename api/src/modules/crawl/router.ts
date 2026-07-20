import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { success, badRequest } from '../../shared/utils/response.js';
import { db } from '../../shared/database.js';
import {
  triggerCrawl,
  getCrawlStatus,
  getPages,
  getIssues,
  triggerAudit,
  getAuditStatus,
  getSeoScore,
  getInternalLinks,
  getExternalLinks,
  getImageAnalysis,
  getStructuredData,
  triggerCrawlSchema,
  triggerAuditSchema,
  pagesQuerySchema,
  issuesQuerySchema,
} from './controller.js';

const router = Router();

router.use(authMiddleware);

router.post('/projects/:id/crawl', validate({ body: triggerCrawlSchema }), triggerCrawl);
router.get('/projects/:id/crawl/:taskId', getCrawlStatus);
router.get('/projects/:id/pages', validate({ query: pagesQuerySchema }), getPages);
router.get('/projects/:id/pages/:pageId/issues', async (req, res) => {
  try {
    const { pageId } = req.params;

    const issues = await db('crawl_issues')
      .where('page_id', pageId)
      .orderBy('severity', 'asc')
      .orderBy('created_at', 'desc')
      .select('*');

    success(res, { pageId, issues });
  } catch (err) {
    badRequest(res, 'Failed to fetch page issues', { error: (err as Error).message });
  }
});
router.get('/projects/:id/issues', validate({ query: issuesQuerySchema }), getIssues);
router.post('/projects/:id/audit', validate({ body: triggerAuditSchema }), triggerAudit);
router.get('/projects/:id/audit/status/:taskId', getAuditStatus);

// SEO analysis endpoints
router.get('/projects/:id/crawl/seo-score', getSeoScore);
router.get('/projects/:id/crawl/internal-links', getInternalLinks);
router.get('/projects/:id/crawl/external-links', getExternalLinks);
router.get('/projects/:id/crawl/images', getImageAnalysis);
router.get('/projects/:id/crawl/structured-data', getStructuredData);

export default router;