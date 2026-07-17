import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as roiService from './service.js';
import {
  success, badRequest, paginated,
} from '../../shared/utils/response.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const saveROISchema = z.object({
  period: z.string().min(1),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  seo_investment: z.number().min(0).optional().default(0),
  organic_traffic_value: z.number().min(0).optional().default(0),
  tool_costs: z.number().min(0).optional().default(0),
  labor_costs: z.number().min(0).optional().default(0),
  total_revenue: z.number().min(0).optional().default(0),
});

export const roiQuerySchema = z.object({
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
});

export const trendQuerySchema = z.object({
  period: z.enum(['weekly', 'monthly', 'quarterly']).optional().default('monthly'),
});

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export async function getROI(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const { page, pageSize } = req.query as unknown as z.infer<typeof roiQuerySchema>;

    const result = await roiService.getROI(projectId, { page, pageSize });
    paginated(res, result.items, { page, pageSize, total: result.total });
  } catch (err) {
    badRequest(res, 'Failed to fetch ROI metrics', { error: (err as Error).message });
  }
}

export async function saveROI(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const data = req.body as z.infer<typeof saveROISchema>;

    const roi = await roiService.saveROI(projectId, data as any);
    success(res, roi, 'ROI metrics saved successfully');
  } catch (err) {
    badRequest(res, 'Failed to save ROI metrics', { error: (err as Error).message });
  }
}

export async function getROITrend(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const { period } = req.query as unknown as z.infer<typeof trendQuerySchema>;

    const trend = await roiService.getROITrend(projectId, period);
    success(res, trend);
  } catch (err) {
    badRequest(res, 'Failed to fetch ROI trend', { error: (err as Error).message });
  }
}

export default {
  getROI,
  saveROI,
  getROITrend,
};