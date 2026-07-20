import type { Request, Response, NextFunction } from 'express';
import * as topPagesService from './service.js';
import { success, badRequest } from '../../shared/utils/response.js';

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export async function getTopPages(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { domain, locationCode, limit } = req.body as {
      domain: string;
      locationCode?: number;
      limit?: number;
    };

    if (!domain || typeof domain !== 'string' || domain.trim().length === 0) {
      badRequest(res, 'Domain is required');
      return;
    }

    const result = await topPagesService.getTopPages(
      domain.trim(),
      locationCode,
      limit,
    );

    success(res, result, 'Top pages retrieved successfully');
  } catch (err) {
    badRequest(res, 'Failed to get top pages', { error: (err as Error).message });
  }
}

export default {
  getTopPages,
};