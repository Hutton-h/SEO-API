import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { success, badRequest } from '../../shared/utils/response.js';
import { db } from '../../shared/database.js';
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
// PUT /v1/alerting/rules/:id
router.put('/alerting/rules/:id', validate({ body: updateRuleSchema }), updateRule);
// DELETE /v1/alerting/rules/:id
router.delete('/alerting/rules/:id', deleteRule);

// PUT /v1/alerting/rules/:id/toggle (调用 service 更新 enabled 状态)
router.put('/alerting/rules/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const enabled = req.body?.enabled ?? true;
    const { updateRule: updateAlertRule } = await import('./service.js');
    const updated = await updateAlertRule(id, { enabled });
    if (!updated) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Rule not found' } });
    }
    success(res, updated, 'Rule toggled');
  } catch (err) {
    badRequest(res, 'Failed to toggle rule', { error: (err as Error).message });
  }
});

// GET /v1/alerting/history
router.get('/alerting/history', validate({ query: historyQuerySchema }), getAlertHistory);
// PUT /v1/alerting/history/:id/acknowledge
router.put('/alerting/history/:id/acknowledge', acknowledgeAlert);

// GET /v1/alerting/summary (真实数据库查询)
router.get('/alerting/summary', async (req, res) => {
  try {
    const projectId = (req.query.projectId as string) || (req.body as any)?.projectId;

    let query = db('alert_history');
    if (projectId) {
      query = query.where('project_id', projectId);
    }

    const [totalResult] = await query.clone().count<{ count: string }[]>('* as count');
    const [criticalResult] = await query.clone().where('severity', 'critical').count<{ count: string }[]>('* as count');
    const [warningResult] = await query.clone().where('severity', 'warning').count<{ count: string }[]>('* as count');
    const [infoResult] = await query.clone().where('severity', 'info').count<{ count: string }[]>('* as count');
    const [unackResult] = await query.clone().where('acknowledged', false).count<{ count: string }[]>('* as count');
    const [last24hResult] = await query.clone()
      .where('created_at', '>=', db.raw("NOW() - INTERVAL '24 hours'"))
      .count<{ count: string }[]>('* as count');

    success(res, {
      totalAlerts: parseInt(totalResult?.count ?? '0', 10),
      critical: parseInt(criticalResult?.count ?? '0', 10),
      warning: parseInt(warningResult?.count ?? '0', 10),
      info: parseInt(infoResult?.count ?? '0', 10),
      unacknowledged: parseInt(unackResult?.count ?? '0', 10),
      last24h: parseInt(last24hResult?.count ?? '0', 10),
    });
  } catch (err) {
    badRequest(res, 'Failed to fetch alert summary', { error: (err as Error).message });
  }
});

export default router;