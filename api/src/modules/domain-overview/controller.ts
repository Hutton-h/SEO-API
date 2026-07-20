import type { Request, Response, NextFunction } from 'express';
import * as domainOverviewService from './service.js';
import { success, paginated, badRequest } from '../../shared/utils/response.js';

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export async function getDomainOverview(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { domain, locationCode } = req.body as { domain: string; locationCode?: number };

    if (!domain || typeof domain !== 'string' || domain.trim().length === 0) {
      badRequest(res, 'Domain is required');
      return;
    }

    const result = await domainOverviewService.getDomainOverview(
      domain.trim(),
      locationCode,
    );

    success(res, result, 'Domain overview retrieved successfully');
  } catch (err) {
    badRequest(res, 'Failed to get domain overview', { error: (err as Error).message });
  }
}

export async function getOverviewHistory(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined;

    const result = await domainOverviewService.getOverviewHistory({ page, pageSize });

    paginated(res, result.items, {
      page: page ?? 1,
      pageSize: pageSize ?? 20,
      total: result.total,
    }, 'Overview history retrieved successfully');
  } catch (err) {
    badRequest(res, 'Failed to get overview history', { error: (err as Error).message });
  }
}

export default {
  getDomainOverview,
  getOverviewHistory,
};