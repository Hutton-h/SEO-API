import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as backlinkService from './service.js';
import {
  success, created, badRequest, paginated,
} from '../../shared/utils/response.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const backlinksQuerySchema = z.object({
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
  isDofollow: z
    .string()
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
  search: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export async function getBacklinks(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const { page, pageSize, isDofollow, search } = req.query as unknown as z.infer<
      typeof backlinksQuerySchema
    >;

    const result = await backlinkService.getBacklinks({
      projectId,
      page,
      pageSize,
      isDofollow,
      search,
    });

    paginated(res, result.items, { page, pageSize, total: result.total });
  } catch (err) {
    badRequest(res, 'Failed to fetch backlinks', { error: (err as Error).message });
  }
}

export async function refreshBacklinks(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const task = await backlinkService.refreshBacklinks(projectId);
    created(res, task, 'Backlink refresh task created successfully');
  } catch (err) {
    badRequest(res, 'Failed to trigger backlink refresh', { error: (err as Error).message });
  }
}

export default {
  getBacklinks,
  refreshBacklinks,
};