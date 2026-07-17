import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import {
  getUptimeStatus,
  checkNow,
  getUptimeLogs,
  logsQuerySchema,
} from './controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/projects/:id/monitor/status', getUptimeStatus);
router.post('/projects/:id/monitor/check', checkNow);
router.get('/projects/:id/monitor/logs', validate({ query: logsQuerySchema }), getUptimeLogs);

export default router;