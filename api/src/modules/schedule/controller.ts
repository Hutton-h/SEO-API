import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as scheduleService from './service.js';
import {
  success, created, notFound, badRequest, paginated,
} from '../../shared/utils/response.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const createScheduleSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.string().min(1),
  cron_expression: z.string().min(1),
  enabled: z.boolean().optional().default(true),
});

export const updateScheduleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.string().min(1).optional(),
  cron_expression: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
});

export const schedulesQuerySchema = z.object({
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

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export async function createSchedule(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const data = req.body as z.infer<typeof createScheduleSchema>;

    const schedule = await scheduleService.createSchedule(projectId, data);
    created(res, schedule, 'Schedule created successfully');
  } catch (err) {
    badRequest(res, 'Failed to create schedule', { error: (err as Error).message });
  }
}

export async function listSchedules(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const { page, pageSize, type, enabled } = req.query as unknown as z.infer<typeof schedulesQuerySchema>;

    const result = await scheduleService.listSchedules(projectId, { page, pageSize, type, enabled });
    paginated(res, result.items, { page, pageSize, total: result.total });
  } catch (err) {
    badRequest(res, 'Failed to fetch schedules', { error: (err as Error).message });
  }
}

export async function updateSchedule(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: scheduleId } = req.params;
    const data = req.body as z.infer<typeof updateScheduleSchema>;

    const schedule = await scheduleService.updateSchedule(scheduleId, data);
    if (!schedule) {
      notFound(res, 'Schedule not found');
      return;
    }
    success(res, schedule, 'Schedule updated successfully');
  } catch (err) {
    badRequest(res, 'Failed to update schedule', { error: (err as Error).message });
  }
}

export async function deleteSchedule(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: scheduleId } = req.params;

    const deleted = await scheduleService.deleteSchedule(scheduleId);
    if (!deleted) {
      notFound(res, 'Schedule not found');
      return;
    }
    success(res, null, 'Schedule deleted successfully');
  } catch (err) {
    badRequest(res, 'Failed to delete schedule', { error: (err as Error).message });
  }
}

export async function runNow(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: scheduleId } = req.params;

    const schedule = await scheduleService.runNow(scheduleId);
    if (!schedule) {
      notFound(res, 'Schedule not found');
      return;
    }
    success(res, schedule, 'Schedule triggered successfully');
  } catch (err) {
    badRequest(res, 'Failed to trigger schedule', { error: (err as Error).message });
  }
}

export default {
  createSchedule,
  listSchedules,
  updateSchedule,
  deleteSchedule,
  runNow,
};