import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { getReport, getReportPDF } from './controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/projects/:id/report', getReport);
router.get('/projects/:id/report/pdf', getReportPDF);

export default router;