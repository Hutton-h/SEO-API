import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as competitorChangeService from './service.js';
import { success, badRequest, paginated } from '../../shared/utils/response.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const changesQuerySchema = z.object({
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
  competitorId: z.string().optional(),
  changeType: z.enum(['title', 'meta', 'h1', 'structure', 'content', 'new_page', 'removed_page']).optional(),
  days: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined)),
});

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export async function getChanges(
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
    const { page, pageSize, competitorId, changeType, days } = req.query as unknown as z.infer<typeof changesQuerySchema>;

    const result = await competitorChangeService.getChanges(projectId, {
      page,
      pageSize,
      competitorId,
      changeType,
      days,
    });
    paginated(res, result.items, { page, pageSize, total: result.total });
  } catch (err) {
    badRequest(res, 'Failed to fetch competitor changes', { error: (err as Error).message });
  }
}

export async function checkNow(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const projectId = (req.query.projectId as string) || (req.body as any)?.projectId;

    const result = await competitorChangeService.checkNow(projectId);
    success(res, result, 'Competitor change detection completed');
  } catch (err) {
    badRequest(res, 'Failed to check competitor changes', { error: (err as Error).message });
  }
}

export default {
  getChanges,
  checkNow,
};