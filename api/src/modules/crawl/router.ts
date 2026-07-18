import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import {
  triggerCrawl,
  getCrawlStatus,
  getPages,
  getIssues,
  triggerAudit,
  getAuditStatus,
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
router.get('/projects/:id/pages/:pageId/issues', (req, res) => {
  res.json({ success: true, data: { pageId: req.params.pageId, issues: [] } });
});
router.get('/projects/:id/issues', validate({ query: issuesQuerySchema }), getIssues);
router.post('/projects/:id/audit', validate({ body: triggerAuditSchema }), triggerAudit);
router.get('/projects/:id/audit/status/:taskId', getAuditStatus);

export default router;