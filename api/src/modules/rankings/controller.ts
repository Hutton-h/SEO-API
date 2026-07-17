import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as rankingService from './service.js';
import {
  success, created, badRequest, paginated,
} from '../../shared/utils/response.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const rankingsQuerySchema = z.object({
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
  keyword: z.string().optional(),
  sortBy: z.enum(['position', 'check_date']).optional().default('check_date'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const fetchRankingsSchema = z.object({
  keywords: z.array(z.string()).optional().default([]),
  locationCode: z.number().int().optional().default(0),
});

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export async function getRankings(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const { page, pageSize, keyword, sortBy, sortOrder } = req.query as unknown as z.infer<
      typeof rankingsQuerySchema
    >;

    const result = await rankingService.getRankings({
      projectId,
      page,
      pageSize,
      keyword,
      sortBy,
      sortOrder,
    });

    paginated(res, result.items, { page, pageSize, total: result.total });
  } catch (err) {
    badRequest(res, 'Failed to fetch rankings', { error: (err as Error).message });
  }
}

export async function fetchRankings(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const { keywords, locationCode } = req.body as z.infer<typeof fetchRankingsSchema>;

    const task = await rankingService.fetchRankings(projectId, { keywords, locationCode });
    created(res, task, 'Ranking fetch task created successfully');
  } catch (err) {
    badRequest(res, 'Failed to trigger ranking fetch', { error: (err as Error).message });
  }
}

export default {
  getRankings,
  fetchRankings,
};