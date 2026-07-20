import type { Request, Response, NextFunction } from 'express';
import * as keywordGapService from './service.js';
import { success, badRequest } from '../../shared/utils/response.js';

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export async function analyzeKeywordGap(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { targetDomain, competitorDomains, locationCode } = req.body as {
      targetDomain: string;
      competitorDomains: string[];
      locationCode?: number;
    };

    if (!targetDomain || typeof targetDomain !== 'string' || targetDomain.trim().length === 0) {
      badRequest(res, 'targetDomain is required');
      return;
    }

    if (!Array.isArray(competitorDomains) || competitorDomains.length === 0) {
      badRequest(res, 'competitorDomains must be a non-empty array');
      return;
    }

    const validCompetitors = competitorDomains
      .filter((d) => typeof d === 'string' && d.trim().length > 0)
      .map((d) => d.trim());

    if (validCompetitors.length === 0) {
      badRequest(res, 'At least one valid competitor domain is required');
      return;
    }

    const result = await keywordGapService.analyzeKeywordGap(
      targetDomain.trim(),
      validCompetitors,
      locationCode,
    );

    success(res, result, 'Keyword gap analysis completed successfully');
  } catch (err) {
    badRequest(res, 'Failed to analyze keyword gap', { error: (err as Error).message });
  }
}

export async function getDomainIntersection(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { domains, locationCode } = req.body as {
      domains: string[];
      locationCode?: number;
    };

    if (!Array.isArray(domains) || domains.length < 2) {
      badRequest(res, 'domains must be an array with at least 2 items');
      return;
    }

    const validDomains = domains
      .filter((d) => typeof d === 'string' && d.trim().length > 0)
      .map((d) => d.trim());

    if (validDomains.length < 2) {
      badRequest(res, 'At least 2 valid domains are required');
      return;
    }

    const result = await keywordGapService.getIntersection(
      validDomains,
      locationCode,
    );

    success(res, result, 'Domain intersection analysis completed successfully');
  } catch (err) {
    badRequest(res, 'Failed to get domain intersection', { error: (err as Error).message });
  }
}

export default {
  analyzeKeywordGap,
  getDomainIntersection,
};