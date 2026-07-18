import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as contentService from './service.js';
import { success, badRequest } from '../../shared/utils/response.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const contentAnalysisQuerySchema = z.object({
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
});

export const analyzeUrlSchema = z.object({
  url: z.string().url(),
});

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export async function getContentAnalysis(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const projectId = (req.query.projectId as string) || (req.body as any)?.projectId;
    const { page, pageSize } = req.query as unknown as z.infer<typeof contentAnalysisQuerySchema>;

    const result = await contentService.getContentAnalysis(projectId, { page, pageSize });
    success(res, result);
  } catch (err) {
    badRequest(res, 'Failed to get content analysis', { error: (err as Error).message });
  }
}

export async function analyzeUrl(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const projectId = (req.query.projectId as string) || (req.body as any)?.projectId;
    const { url } = req.body as z.infer<typeof analyzeUrlSchema>;

    const result = await contentService.analyzeUrl(projectId, url);
    success(res, result, 'URL analysis completed successfully');
  } catch (err) {
    badRequest(res, 'Failed to analyze URL', { error: (err as Error).message });
  }
}

export async function getQualityScore(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const projectId = (req.query.projectId as string) || (req.body as any)?.projectId;

    const result = await contentService.getQualityScore(projectId);
    success(res, result);
  } catch (err) {
    badRequest(res, 'Failed to get quality score', { error: (err as Error).message });
  }
}

export default {
  getContentAnalysis,
  analyzeUrl,
  getQualityScore,
};