import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
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

router.get('/projects/:id/alerting/rules', validate({ query: rulesQuerySchema }), getRules);
router.post('/projects/:id/alerting/rules', validate({ body: createRuleSchema }), createRule);
router.patch('/projects/:id/alerting/rules/:ruleId', validate({ body: updateRuleSchema }), updateRule);
router.delete('/projects/:id/alerting/rules/:ruleId', deleteRule);
router.get('/projects/:id/alerting/history', validate({ query: historyQuerySchema }), getAlertHistory);
router.patch('/projects/:id/alerting/history/:alertId/acknowledge', acknowledgeAlert);

export default router;