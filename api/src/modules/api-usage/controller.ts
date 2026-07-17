import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as apiUsageService from './service.js';
import { success, badRequest } from '../../shared/utils/response.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const summaryQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  projectId: z.string().optional(),
});

export const dailyQuerySchema = z.object({
  days: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 30)),
  projectId: z.string().optional(),
  service: z.string().optional(),
});

export const serviceQuerySchema = z.object({
  days: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 30)),
  projectId: z.string().optional(),
});

export const costQuerySchema = z.object({
  days: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 30)),
  projectId: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export async function getSummary(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { startDate, endDate, projectId } = req.query as unknown as z.infer<typeof summaryQuerySchema>;

    const result = await apiUsageService.getSummary({ startDate, endDate, projectId });
    success(res, result);
  } catch (err) {
    badRequest(res, 'Failed to get API usage summary', { error: (err as Error).message });
  }
}

export async function getDailyUsage(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { days, projectId, service } = req.query as unknown as z.infer<typeof dailyQuerySchema>;

    const result = await apiUsageService.getDailyUsage({ days, projectId, service });
    success(res, result);
  } catch (err) {
    badRequest(res, 'Failed to get daily usage', { error: (err as Error).message });
  }
}

export async function getByService(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { days, projectId } = req.query as unknown as z.infer<typeof serviceQuerySchema>;

    const result = await apiUsageService.getByService({ days, projectId });
    success(res, result);
  } catch (err) {
    badRequest(res, 'Failed to get usage by service', { error: (err as Error).message });
  }
}

export async function getCostBreakdown(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { days, projectId } = req.query as unknown as z.infer<typeof costQuerySchema>;

    const result = await apiUsageService.getCostBreakdown({ days, projectId });
    success(res, result);
  } catch (err) {
    badRequest(res, 'Failed to get cost breakdown', { error: (err as Error).message });
  }
}

export default {
  getSummary,
  getDailyUsage,
  getByService,
  getCostBreakdown,
};