import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as serpFeaturesService from './service.js';
import { success, badRequest } from '../../shared/utils/response.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const serpFeaturesQuerySchema = z.object({
  keyword: z.string().optional(),
  locationCode: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined)),
  languageCode: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export async function getSerpFeatures(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const { keyword, locationCode, languageCode } = req.query as unknown as z.infer<typeof serpFeaturesQuerySchema>;

    const result = await serpFeaturesService.getSerpFeatures(projectId, {
      keyword,
      locationCode,
      languageCode,
    });
    success(res, result);
  } catch (err) {
    badRequest(res, 'Failed to fetch SERP features', { error: (err as Error).message });
  }
}

export default {
  getSerpFeatures,
};