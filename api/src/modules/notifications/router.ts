import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
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

router.post('/notifications/send', validate({ body: sendNotificationSchema }), sendNotification);
router.get('/projects/:id/notifications/history', validate({ query: historyQuerySchema }), getHistory);
router.post('/notifications/test', validate({ body: testChannelSchema }), testChannel);

export default router;