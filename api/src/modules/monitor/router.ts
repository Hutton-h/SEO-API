import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { success } from '../../shared/utils/response.js';
import {
  getUptimeStatus,
  checkNow,
  getUptimeLogs,
  logsQuerySchema,
} from './controller.js';

const router = Router();

router.use(authMiddleware);

// GET /v1/monitor/status
router.get('/monitor/status', getUptimeStatus);
// GET /v1/monitor/response-time
router.get('/monitor/response-time', (_req, res, _next) => {
  success(res, { avg: 245, p95: 512, p99: 890, data: [] });
});
// GET /v1/monitor/sla
router.get('/monitor/sla', (_req, res, _next) => {
  success(res, { uptime: 99.97, target: 99.9, period: '30d' });
});
// GET /v1/monitor/downtime
router.get('/monitor/downtime', (_req, res, _next) => {
  success(res, { totalDowntime: 0, incidents: [] });
});
// POST /v1/monitor/check
router.post('/monitor/check', checkNow);
// GET /v1/monitor/logs
router.get('/monitor/logs', validate({ query: logsQuerySchema }), getUptimeLogs);
// GET /v1/monitor/targets
router.get('/monitor/targets', (_req, res, _next) => {
  success(res, []);
});
// POST /v1/monitor/targets
router.post('/monitor/targets', (_req, res, _next) => {
  success(res, { id: Date.now().toString(), ..._req.body }, 'Target added');
});

export default router;