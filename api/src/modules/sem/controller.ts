import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as semService from './service.js';
import {
  success, badRequest, paginated,
} from '../../shared/utils/response.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const semQuerySchema = z.object({
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
  competitorDomain: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export async function getKeywordMetrics(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const { page, pageSize } = req.query as unknown as z.infer<typeof semQuerySchema>;

    const result = await semService.getKeywordMetrics(projectId, { page, pageSize });
    paginated(res, result.items, { page, pageSize, total: result.total });
  } catch (err) {
    badRequest(res, 'Failed to fetch SEM keyword metrics', { error: (err as Error).message });
  }
}

export async function getCompetitorAds(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const { page, pageSize, competitorDomain } = req.query as unknown as z.infer<
      typeof semQuerySchema
    >;

    const result = await semService.getCompetitorAds(projectId, {
      page,
      pageSize,
      competitorDomain,
    });
    paginated(res, result.items, { page, pageSize, total: result.total });
  } catch (err) {
    badRequest(res, 'Failed to fetch competitor ads', { error: (err as Error).message });
  }
}

export async function getOpportunities(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const result = await semService.getOpportunities(projectId);
    success(res, result);
  } catch (err) {
    badRequest(res, 'Failed to fetch SEM opportunities', { error: (err as Error).message });
  }
}

export default {
  getKeywordMetrics,
  getCompetitorAds,
  getOpportunities,
};