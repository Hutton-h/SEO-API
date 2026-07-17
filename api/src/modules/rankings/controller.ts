import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as rankingService from './service.js';
import { db } from '../../shared/database.js';
import { gsc } from '../../services/gsc.js';
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
  source: z.enum(['dataforseo', 'gsc', 'all']).optional().default('all'),
});

export const fetchRankingsSchema = z.object({
  keywords: z.array(z.string()).optional().default([]),
  locationCode: z.number().int().optional().default(0),
  includeGSC: z.boolean().optional().default(true),
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
    const { page, pageSize, keyword, sortBy, sortOrder, source } = req.query as unknown as z.infer<
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

    // If GSC is requested and available, enrich with GSC data
    if ((source === 'gsc' || source === 'all') && result.items.length > 0) {
      const project = await db('projects').where('id', projectId).first();
      if (project) {
        const domain = (project as { domain: string }).domain;
        const siteUrl = `sc-domain:${domain}`;

        try {
          // Fetch GSC search analytics for the last 30 days
          const today = new Date().toISOString().split('T')[0];
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

          const gscResult = await gsc.getSearchAnalytics(siteUrl, thirtyDaysAgo, today, ['query'], 100);

          if (gscResult.success && gscResult.data) {
            const gscData = gscResult.data;

            // Merge GSC data with rankings
            for (const item of result.items) {
              const kw = (item as Record<string, unknown>)['keyword_text'] as string;
              const gscRow = gscData.rows.find((row) => row.keys[0] === kw);
              if (gscRow) {
                (item as Record<string, unknown>)['gsc_position'] = gscRow.position;
                (item as Record<string, unknown>)['gsc_clicks'] = gscRow.clicks;
                (item as Record<string, unknown>)['gsc_impressions'] = gscRow.impressions;
                (item as Record<string, unknown>)['gsc_ctr'] = Math.round(gscRow.ctr * 10000) / 100;
              }
            }
          }
        } catch {
          // GSC fetch failed silently - use only DataForSEO data
        }
      }
    }

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
    const { keywords, locationCode, includeGSC } = req.body as z.infer<typeof fetchRankingsSchema>;

    const task = await rankingService.fetchRankings(projectId, {
      keywords,
      locationCode,
      includeGSC,
    });
    created(res, task, 'Ranking fetch task created successfully');
  } catch (err) {
    badRequest(res, 'Failed to trigger ranking fetch', { error: (err as Error).message });
  }
}

export default {
  getRankings,
  fetchRankings,
};