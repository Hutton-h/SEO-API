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
  const hours = Array.from({length: 24}, (_, i) => ({ hour: i, avg: 180 + Math.floor(Math.random() * 120), p95: 350 + Math.floor(Math.random() * 200) }));
  success(res, { avg: 245, p95: 512, p99: 890, hourly: hours });
});
// GET /v1/monitor/sla
router.get('/monitor/sla', (_req, res, _next) => {
  success(res, { uptimePercent: 99.97, totalChecks: 86400, failedChecks: 26, last30Days: [99.98, 99.95, 99.99, 99.96, 100, 99.94, 99.97, 99.99, 99.93, 99.98, 100, 99.96, 99.97, 99.95, 99.99, 99.98, 99.97, 100, 99.96, 99.94, 99.98, 99.99, 99.97, 99.95, 99.99, 99.98, 99.96, 99.97, 99.99, 100] });
});
// GET /v1/monitor/downtime
router.get('/monitor/downtime', (_req, res, _next) => {
  success(res, { totalDowntime: 12, incidents: [
    { id: '1', start: '2026-07-15T03:12:00Z', end: '2026-07-15T03:15:00Z', duration: 180, reason: 'DNS resolution timeout' },
  ] });
});
// POST /v1/monitor/check
router.post('/monitor/check', checkNow);
// GET /v1/monitor/logs
router.get('/monitor/logs', validate({ query: logsQuerySchema }), getUptimeLogs);
// GET /v1/monitor/targets
router.get('/monitor/targets', (_req, res, _next) => {
  success(res, [
    { id: '1', url: 'https://example.com', name: 'Main Website', type: 'https', status: 'up', lastCheck: new Date().toISOString(), responseTime: 234 },
    { id: '2', url: 'https://example.com/api', name: 'API Endpoint', type: 'https', status: 'up', lastCheck: new Date().toISOString(), responseTime: 89 },
  ]);
});
// POST /v1/monitor/targets
router.post('/monitor/targets', (_req, res, _next) => {
  success(res, { id: Date.now().toString(), ..._req.body }, 'Target added');
});

export default router;