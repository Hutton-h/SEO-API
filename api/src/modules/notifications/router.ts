import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { success, paginated } from '../../shared/utils/response.js';
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

// --- Channels CRUD (stubs) ---
// GET /v1/notifications/channels
router.get('/notifications/channels', (_req, res, _next) => {
  success(res, [
    { id: '1', type: 'email', enabled: true, config: {} },
    { id: '2', type: 'webhook', enabled: false, config: {} },
  ]);
});
// POST /v1/notifications/channels
router.post('/notifications/channels', (_req, res, _next) => {
  success(res, { id: 'new', ..._req.body }, 'Channel created');
});
// PUT /v1/notifications/channels/:id
router.put('/notifications/channels/:id', (_req, res, _next) => {
  success(res, { id: _req.params.id, ..._req.body }, 'Channel updated');
});
// DELETE /v1/notifications/channels/:id
router.delete('/notifications/channels/:id', (_req, res, _next) => {
  success(res, null, 'Channel deleted');
});
// PUT /v1/notifications/channels/:id/toggle
router.put('/notifications/channels/:id/toggle', (_req, res, _next) => {
  success(res, { id: _req.params.id, enabled: _req.body?.enabled ?? true }, 'Channel toggled');
});
// POST /v1/notifications/channels/:id/test
router.post('/notifications/channels/:id/test', validate({ body: testChannelSchema }), testChannel);

// --- Records ---
// GET /v1/notifications/records
router.get('/notifications/records', validate({ query: historyQuerySchema }), getHistory);

// POST /v1/notifications/send
router.post('/notifications/send', validate({ body: sendNotificationSchema }), sendNotification);

export default router;