import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as notificationsService from './service.js';
import {
  success, badRequest, paginated,
} from '../../shared/utils/response.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const sendNotificationSchema = z.object({
  project_id: z.string().uuid(),
  type: z.string().min(1),
  channel: z.enum(['email', 'dingtalk', 'feishu', 'slack']),
  title: z.string().min(1).max(500),
  message: z.string().min(1),
  metadata: z.record(z.unknown()).optional().default({}),
});

export const testChannelSchema = z.object({
  channel: z.enum(['email', 'dingtalk', 'feishu', 'slack']),
  to: z.string().optional(),
  webhook_url: z.string().optional(),
  message: z.string().optional(),
});

export const historyQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().int().positive()),
  pageSize: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .pipe(z.number().int().min(1).max(100)),
  channel: z.string().optional(),
  status: z.enum(['pending', 'sent', 'failed']).optional(),
});

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export async function sendNotification(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const data = req.body as z.infer<typeof sendNotificationSchema>;

    const notification = await notificationsService.sendNotification(data.project_id, {
      type: data.type,
      channel: data.channel,
      title: data.title,
      message: data.message,
      metadata: data.metadata,
    });
    success(res, notification, 'Notification sent successfully');
  } catch (err) {
    badRequest(res, 'Failed to send notification', { error: (err as Error).message });
  }
}

export async function getHistory(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const projectId = (req.query.projectId as string) || (req.body as any)?.projectId;
    const { page, pageSize, channel, status } = req.query as unknown as z.infer<typeof historyQuerySchema>;

    const result = await notificationsService.getHistory(projectId, { page, pageSize, channel, status });
    paginated(res, result.items, { page, pageSize, total: result.total });
  } catch (err) {
    badRequest(res, 'Failed to fetch notification history', { error: (err as Error).message });
  }
}

export async function testChannel(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const data = req.body as z.infer<typeof testChannelSchema>;

    const result = await notificationsService.testChannel(data.channel, {
      to: data.to,
      webhook_url: data.webhook_url,
      message: data.message,
    });
    success(res, result, result.message);
  } catch (err) {
    badRequest(res, 'Failed to test notification channel', { error: (err as Error).message });
  }
}

export default {
  sendNotification,
  getHistory,
  testChannel,
};