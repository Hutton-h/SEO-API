import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as alertingService from './service.js';
import {
  success, created, notFound, badRequest, paginated,
} from '../../shared/utils/response.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const createRuleSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['ranking_drop', 'traffic_drop', 'backlink_loss', 'crawl_error', 'downtime']),
  condition: z.object({
    metric: z.string(),
    operator: z.enum(['gt', 'lt', 'gte', 'lte', 'eq']),
    threshold: z.number(),
    window_minutes: z.number().int().positive().optional().default(1440),
  }),
  channels: z.array(z.string()).optional().default(['email']),
  enabled: z.boolean().optional().default(true),
});

export const updateRuleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.enum(['ranking_drop', 'traffic_drop', 'backlink_loss', 'crawl_error', 'downtime']).optional(),
  condition: z.object({
    metric: z.string(),
    operator: z.enum(['gt', 'lt', 'gte', 'lte', 'eq']),
    threshold: z.number(),
    window_minutes: z.number().int().positive().optional().default(1440),
  }).optional(),
  channels: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
});

export const rulesQuerySchema = z.object({
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
  type: z.string().optional(),
  enabled: z.string().optional().transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
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
  type: z.string().optional(),
  severity: z.enum(['critical', 'warning', 'info']).optional(),
  acknowledged: z.string().optional().transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
});

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export async function createRule(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const projectId = (req.query.projectId as string) || (req.body as any)?.projectId;
    const data = req.body as z.infer<typeof createRuleSchema>;

    const rule = await alertingService.createRule(projectId, data as any);
    created(res, rule, 'Alert rule created successfully');
  } catch (err) {
    badRequest(res, 'Failed to create alert rule', { error: (err as Error).message });
  }
}

export async function getRules(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const projectId = (req.query.projectId as string) || (req.body as any)?.projectId;
    if (!projectId) {
      paginated(res, [], { page: 1, pageSize: 20, total: 0 });
      return;
    }
    const { page, pageSize, type, enabled } = req.query as unknown as z.infer<typeof rulesQuerySchema>;

    const result = await alertingService.getRules(projectId, { page, pageSize, type, enabled });
    paginated(res, result.items, { page, pageSize, total: result.total });
  } catch (err) {
    badRequest(res, 'Failed to fetch alert rules', { error: (err as Error).message });
  }
}

export async function updateRule(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: ruleId } = req.params;
    const data = req.body as z.infer<typeof updateRuleSchema>;

    const rule = await alertingService.updateRule(ruleId, data as any);
    if (!rule) {
      notFound(res, 'Alert rule not found');
      return;
    }
    success(res, rule, 'Alert rule updated successfully');
  } catch (err) {
    badRequest(res, 'Failed to update alert rule', { error: (err as Error).message });
  }
}

export async function deleteRule(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: ruleId } = req.params;

    const deleted = await alertingService.deleteRule(ruleId);
    if (!deleted) {
      notFound(res, 'Alert rule not found');
      return;
    }
    success(res, null, 'Alert rule deleted successfully');
  } catch (err) {
    badRequest(res, 'Failed to delete alert rule', { error: (err as Error).message });
  }
}

export async function getAlertHistory(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const projectId = (req.query.projectId as string) || (req.body as any)?.projectId;
    if (!projectId) {
      paginated(res, [], { page: 1, pageSize: 20, total: 0 });
      return;
    }
    const { page, pageSize, type, severity, acknowledged } = req.query as unknown as z.infer<typeof historyQuerySchema>;

    const result = await alertingService.getAlertHistory(projectId, {
      page,
      pageSize,
      type,
      severity,
      acknowledged,
    });
    paginated(res, result.items, { page, pageSize, total: result.total });
  } catch (err) {
    badRequest(res, 'Failed to fetch alert history', { error: (err as Error).message });
  }
}

export async function acknowledgeAlert(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: alertId } = req.params;
    const userId = req.user?.userId ?? 'system';

    const alert = await alertingService.acknowledgeAlert(alertId, userId);
    if (!alert) {
      notFound(res, 'Alert not found');
      return;
    }
    success(res, alert, 'Alert acknowledged successfully');
  } catch (err) {
    badRequest(res, 'Failed to acknowledge alert', { error: (err as Error).message });
  }
}

export default {
  createRule,
  getRules,
  updateRule,
  deleteRule,
  getAlertHistory,
  acknowledgeAlert,
};