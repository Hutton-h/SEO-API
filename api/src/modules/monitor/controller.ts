import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as monitorService from './service.js';
import {
  success, badRequest, paginated,
} from '../../shared/utils/response.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const logsQuerySchema = z.object({
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
  isUp: z.string().optional().transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
});

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export async function getUptimeStatus(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;

    const status = await monitorService.getUptimeStatus(projectId);
    success(res, status);
  } catch (err) {
    badRequest(res, 'Failed to get uptime status', { error: (err as Error).message });
  }
}

export async function checkNow(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;

    const result = await monitorService.checkNow(projectId);
    success(res, result, 'Uptime check completed');
  } catch (err) {
    badRequest(res, 'Failed to perform uptime check', { error: (err as Error).message });
  }
}

export async function getUptimeLogs(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const { page, pageSize, isUp } = req.query as unknown as z.infer<typeof logsQuerySchema>;

    const result = await monitorService.getUptimeLogs(projectId, { page, pageSize, isUp });
    paginated(res, result.items, { page, pageSize, total: result.total });
  } catch (err) {
    badRequest(res, 'Failed to fetch uptime logs', { error: (err as Error).message });
  }
}

export default {
  getUptimeStatus,
  checkNow,
  getUptimeLogs,
};