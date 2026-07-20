// ---------------------------------------------------------------------------
// Google Trends Module - Controller
// ---------------------------------------------------------------------------

import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as trendsService from './service.js';
import {
  success, badRequest, serverError,
} from '../../shared/utils/response.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const compareTrendsSchema = z.object({
  keywords: z.array(z.string().min(1)).min(1).max(5),
  timeframe: z.string().optional().default('today 12-m'),
  geo: z.string().optional().default(''),
});

export const interestByRegionSchema = z.object({
  keyword: z.string().min(1),
  resolution: z.string().optional().default('REGION'),
});

export const relatedQueriesSchema = z.object({
  keyword: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export async function compareTrends(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { keywords, timeframe, geo } = req.body as z.infer<typeof compareTrendsSchema>;

    const result = await trendsService.compareTrends(keywords, timeframe, geo);
    success(res, result, 'Trends comparison completed successfully');
  } catch (err) {
    console.error('[TrendsController] compareTrends error:', err);
    const msg = (err as Error)?.message || String(err);
    serverError(res, `Failed to compare trends: ${msg}`);
  }
}

export async function getInterestByRegion(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { keyword, resolution } = req.body as z.infer<typeof interestByRegionSchema>;

    const result = await trendsService.getRegionalInterest(keyword, resolution);
    success(res, result, 'Regional interest data retrieved successfully');
  } catch (err) {
    console.error('[TrendsController] getInterestByRegion error:', err);
    const msg = (err as Error)?.message || String(err);
    serverError(res, `Failed to get regional interest: ${msg}`);
  }
}

export async function getRelatedQueries(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { keyword } = req.body as z.infer<typeof relatedQueriesSchema>;

    const result = await trendsService.getKeywordRelatedQueries(keyword);
    success(res, result, 'Related queries retrieved successfully');
  } catch (err) {
    console.error('[TrendsController] getRelatedQueries error:', err);
    const msg = (err as Error)?.message || String(err);
    serverError(res, `Failed to get related queries: ${msg}`);
  }
}

export default {
  compareTrends,
  getInterestByRegion,
  getRelatedQueries,
};