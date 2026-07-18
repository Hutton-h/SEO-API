import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { success } from '../../shared/utils/response.js';
import {
  createRule,
  getRules,
  updateRule,
  deleteRule,
  getAlertHistory,
  acknowledgeAlert,
  createRuleSchema,
  updateRuleSchema,
  rulesQuerySchema,
  historyQuerySchema,
} from './controller.js';

const router = Router();

router.use(authMiddleware);

// GET /v1/alerting/rules
router.get('/alerting/rules', validate({ query: rulesQuerySchema }), getRules);
// POST /v1/alerting/rules
router.post('/alerting/rules', validate({ body: createRuleSchema }), createRule);
// PUT /v1/alerting/rules/:id (was PATCH)
router.put('/alerting/rules/:id', validate({ body: updateRuleSchema }), updateRule);
// DELETE /v1/alerting/rules/:id
router.delete('/alerting/rules/:id', deleteRule);
// PUT /v1/alerting/rules/:id/toggle
router.put('/alerting/rules/:id/toggle', (req, res) => {
  res.json({ success: true, data: { id: req.params.id, enabled: req.body?.enabled ?? true }, message: 'Rule toggled' });
});
// GET /v1/alerting/history
router.get('/alerting/history', validate({ query: historyQuerySchema }), getAlertHistory);
// PUT /v1/alerting/history/:id/acknowledge (was PATCH)
router.put('/alerting/history/:id/acknowledge', acknowledgeAlert);
// GET /v1/alerting/summary
router.get('/alerting/summary', (_req, res, _next) => {
  success(res, { totalAlerts: 156, critical: 3, warning: 24, info: 129, unacknowledged: 5, last24h: 12 });
});

export default router;