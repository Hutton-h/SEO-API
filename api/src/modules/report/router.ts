import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { success, badRequest } from '../../shared/utils/response.js';
import { getReport, getReportPDF } from './controller.js';
import * as reportService from './service.js';

const router = Router();

router.use(authMiddleware);

router.get('/projects/:id/report', getReport);
router.get('/projects/:id/report/export/pdf', getReportPDF);
router.post('/projects/:id/report/generate', async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const task = await reportService.queueReportGeneration(projectId);
    success(res, {
      taskId: task.id,
      status: task.status,
      message: 'Report generation queued',
    });
  } catch (err) {
    badRequest(res, 'Failed to start report generation', { error: (err as Error).message });
  }
});

export default router;