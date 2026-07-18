import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { getReport, getReportPDF } from './controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/projects/:id/report', getReport);
router.get('/projects/:id/report/export/pdf', getReportPDF);
router.post('/projects/:id/report/generate', (req, res) => {
  res.json({ success: true, data: { taskId: 'report-' + Date.now(), status: 'processing', estimatedTime: 30 }, message: 'Report generation started' });
});

export default router;