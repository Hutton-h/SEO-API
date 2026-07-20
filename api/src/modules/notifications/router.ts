import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { success, badRequest } from '../../shared/utils/response.js';
import { db } from '../../shared/database.js';
import {
  sendNotification,
  getHistory,
  testChannel,
  sendNotificationSchema,
  testChannelSchema,
  historyQuerySchema,
} from './controller.js';

const router = Router();

router.use(authMiddleware);

// --- Channels CRUD (真实数据库操作) ---
// GET /v1/notifications/channels
router.get('/notifications/channels', async (req, res) => {
  try {
    const projectId = (req.query.projectId as string) || (req.body as any)?.projectId;
    let query = db('notification_channels');
    if (projectId) {
      query = query.where('project_id', projectId);
    }
    const channels = await query.orderBy('created_at', 'desc');
    success(res, channels);
  } catch (err) {
    badRequest(res, 'Failed to fetch channels', { error: (err as Error).message });
  }
});
// POST /v1/notifications/channels
router.post('/notifications/channels', async (req, res) => {
  try {
    const projectId = (req.query.projectId as string) || (req.body as any)?.projectId || req.body?.project_id;
    const { type, enabled = true, config = {} } = req.body || {};

    if (!type) {
      return badRequest(res, 'Channel type is required');
    }

    const [channel] = await db('notification_channels')
      .insert({
        project_id: projectId,
        type,
        enabled,
        config: JSON.stringify(config),
      })
      .returning('*');

    success(res, channel, 'Channel created');
  } catch (err) {
    badRequest(res, 'Failed to create channel', { error: (err as Error).message });
  }
});
// PUT /v1/notifications/channels/:id
router.put('/notifications/channels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData: Record<string, unknown> = {};

    if (req.body.type !== undefined) updateData.type = req.body.type;
    if (req.body.enabled !== undefined) updateData.enabled = req.body.enabled;
    if (req.body.config !== undefined) updateData.config = JSON.stringify(req.body.config);

    if (Object.keys(updateData).length === 0) {
      return success(res, { id }, 'No changes to update');
    }

    const [channel] = await db('notification_channels')
      .where('id', id)
      .update(updateData)
      .returning('*');

    if (!channel) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Channel not found' } });
    }

    success(res, channel, 'Channel updated');
  } catch (err) {
    badRequest(res, 'Failed to update channel', { error: (err as Error).message });
  }
});
// DELETE /v1/notifications/channels/:id
router.delete('/notifications/channels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db('notification_channels').where('id', id).delete();
    if (!deleted) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Channel not found' } });
    }
    success(res, null, 'Channel deleted');
  } catch (err) {
    badRequest(res, 'Failed to delete channel', { error: (err as Error).message });
  }
});
// PUT /v1/notifications/channels/:id/toggle
router.put('/notifications/channels/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const enabled = req.body?.enabled ?? true;

    const [channel] = await db('notification_channels')
      .where('id', id)
      .update({ enabled })
      .returning('*');

    if (!channel) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Channel not found' } });
    }

    success(res, channel, 'Channel toggled');
  } catch (err) {
    badRequest(res, 'Failed to toggle channel', { error: (err as Error).message });
  }
});
// POST /v1/notifications/channels/:id/test
router.post('/notifications/channels/:id/test', validate({ body: testChannelSchema }), testChannel);

// --- Records ---
// GET /v1/notifications/records
router.get('/notifications/records', validate({ query: historyQuerySchema }), getHistory);

// POST /v1/notifications/send
router.post('/notifications/send', validate({ body: sendNotificationSchema }), sendNotification);

export default router;