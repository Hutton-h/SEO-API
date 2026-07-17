import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as sitemapService from './service.js';
import { success, badRequest, notFound } from '../../shared/utils/response.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const generateSitemapSchema = z.object({
  includeImages: z.boolean().optional().default(false),
  includeVideos: z.boolean().optional().default(false),
  baseUrl: z.string().url().optional(),
});

export const validateSitemapSchema = z.object({
  sitemapXml: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export async function generateSitemap(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const options = req.body as z.infer<typeof generateSitemapSchema>;

    const result = await sitemapService.generateSitemap(projectId, options);
    success(res, result, 'Sitemap generated successfully');
  } catch (err) {
    badRequest(res, 'Failed to generate sitemap', { error: (err as Error).message });
  }
}

export async function getSitemap(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;

    const sitemap = await sitemapService.getSitemap(projectId);
    if (!sitemap) {
      notFound(res, 'No sitemap found for this project');
      return;
    }
    success(res, sitemap);
  } catch (err) {
    badRequest(res, 'Failed to get sitemap', { error: (err as Error).message });
  }
}

export async function validateSitemap(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const { sitemapXml } = req.body as z.infer<typeof validateSitemapSchema>;

    const result = await sitemapService.validateSitemap(projectId, sitemapXml);
    success(res, result);
  } catch (err) {
    badRequest(res, 'Failed to validate sitemap', { error: (err as Error).message });
  }
}

export default {
  generateSitemap,
  getSitemap,
  validateSitemap,
};