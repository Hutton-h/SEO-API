import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as bulkAnalysisService from './service.js';
import { success, badRequest } from '../../shared/utils/response.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const bulkAnalyzeDomainsSchema = z.object({
  domains: z
    .array(z.string().min(1, 'Domain cannot be empty'))
    .min(1, 'At least one domain is required')
    .max(100, 'Maximum 100 domains allowed'),
  locationCode: z.number().int().positive().optional(),
});

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export async function bulkAnalyzeDomains(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { domains, locationCode } = req.body as z.infer<typeof bulkAnalyzeDomainsSchema>;

    const result = await bulkAnalysisService.bulkAnalyzeDomains(domains, locationCode);
    success(res, result, `Analyzed ${result.domains.length} domains successfully`);
  } catch (err) {
    badRequest(res, 'Failed to analyze domains', { error: (err as Error).message });
  }
}

export default {
  bulkAnalyzeDomains,
};