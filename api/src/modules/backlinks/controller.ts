import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as backlinkService from './service.js';
import {
  success, created, badRequest, paginated,
} from '../../shared/utils/response.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const backlinksQuerySchema = z.object({
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
  isDofollow: z
    .string()
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
  search: z.string().optional(),
});

export const referringDomainsQuerySchema = z.object({
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
  sort: z.string().optional().default('backlinks'),
});

export const linkGapBodySchema = z.object({
  competitorDomains: z
    .array(z.string().min(1, 'Competitor domain cannot be empty'))
    .min(1, 'At least one competitor domain is required')
    .max(20, 'Maximum 20 competitor domains allowed'),
});

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export async function getBacklinks(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const { page, pageSize, isDofollow, search } = req.query as unknown as z.infer<
      typeof backlinksQuerySchema
    >;

    const result = await backlinkService.getBacklinks({
      projectId,
      page,
      pageSize,
      isDofollow,
      search,
    });

    paginated(res, result.items, { page, pageSize, total: result.total });
  } catch (err) {
    badRequest(res, 'Failed to fetch backlinks', { error: (err as Error).message });
  }
}

export async function refreshBacklinks(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const task = await backlinkService.refreshBacklinks(projectId);
    created(res, task, 'Backlink refresh task created successfully');
  } catch (err) {
    badRequest(res, 'Failed to trigger backlink refresh', { error: (err as Error).message });
  }
}

export async function getReferringDomains(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const { page, pageSize, sort } = req.query as unknown as z.infer<
      typeof referringDomainsQuerySchema
    >;

    const result = await backlinkService.getReferringDomains(projectId, {
      page,
      pageSize,
      sort,
    });

    paginated(res, result.items, { page, pageSize, total: result.total });
  } catch (err) {
    badRequest(res, 'Failed to fetch referring domains', { error: (err as Error).message });
  }
}

export async function getAnchorText(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const result = await backlinkService.getAnchorText(projectId);
    success(res, result);
  } catch (err) {
    badRequest(res, 'Failed to fetch anchor text analysis', { error: (err as Error).message });
  }
}

export async function getNewBacklinks(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const result = await backlinkService.getNewBacklinks(projectId);
    success(res, result);
  } catch (err) {
    badRequest(res, 'Failed to fetch new backlinks', { error: (err as Error).message });
  }
}

export async function getLostBacklinks(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const result = await backlinkService.getLostBacklinks(projectId);
    success(res, result);
  } catch (err) {
    badRequest(res, 'Failed to fetch lost backlinks', { error: (err as Error).message });
  }
}

export async function getLinkGap(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const { competitorDomains } = req.body as z.infer<typeof linkGapBodySchema>;

    const result = await backlinkService.getLinkGap(projectId, competitorDomains);
    success(res, result, 'Link gap analysis completed');
  } catch (err) {
    badRequest(res, 'Failed to perform link gap analysis', { error: (err as Error).message });
  }
}

export default {
  getBacklinks,
  refreshBacklinks,
  getReferringDomains,
  getAnchorText,
  getNewBacklinks,
  getLostBacklinks,
  getLinkGap,
};