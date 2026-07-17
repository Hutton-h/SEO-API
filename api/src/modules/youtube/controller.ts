import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as youtubeService from './service.js';
import { badRequest, paginated } from '../../shared/utils/response.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const youtubeQuerySchema = z.object({
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
});

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export async function getYouTubeRankings(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const { page, pageSize, keyword } = req.query as unknown as z.infer<
      typeof youtubeQuerySchema
    >;

    const result = await youtubeService.getYouTubeRankings(projectId, {
      page,
      pageSize,
      keyword,
    });

    paginated(res, result.items, { page, pageSize, total: result.total });
  } catch (err) {
    badRequest(res, 'Failed to fetch YouTube rankings', { error: (err as Error).message });
  }
}

export default {
  getYouTubeRankings,
};