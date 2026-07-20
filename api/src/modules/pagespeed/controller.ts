// ---------------------------------------------------------------------------
// PageSpeed Module - Controller
// ---------------------------------------------------------------------------

import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as pagespeedService from './service.js';
import {
  success, badRequest, serverError,
} from '../../shared/utils/response.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const analyzeSchema = z.object({
  url: z.string().url('Invalid URL format'),
  strategy: z.enum(['mobile', 'desktop']).optional().default('mobile'),
});

export const batchAnalyzeSchema = z.object({
  urls: z.array(z.string().url('Invalid URL format')).min(1).max(10),
  strategy: z.enum(['mobile', 'desktop']).optional().default('mobile'),
});

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export async function analyzePageSpeed(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { url, strategy } = req.body as z.infer<typeof analyzeSchema>;

    const result = await pagespeedService.analyzePageSpeed(url, strategy);
    success(res, result, 'PageSpeed analysis completed successfully');
  } catch (err) {
    console.error('[PageSpeedController] analyzePageSpeed error:', err);
    const msg = (err as Error)?.message || String(err);
    serverError(res, `Failed to analyze page speed: ${msg}`);
  }
}

export async function batchAnalyze(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { urls, strategy } = req.body as z.infer<typeof batchAnalyzeSchema>;

    const results = await pagespeedService.batchAnalyze(urls, strategy);
    success(res, results, 'Batch PageSpeed analysis completed successfully');
  } catch (err) {
    console.error('[PageSpeedController] batchAnalyze error:', err);
    const msg = (err as Error)?.message || String(err);
    serverError(res, `Failed to run batch analysis: ${msg}`);
  }
}

export default {
  analyzePageSpeed,
  batchAnalyze,
};