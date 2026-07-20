import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as competitorService from './service.js';
import { success, created, notFound, badRequest } from '../../shared/utils/response.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const addCompetitorSchema = z.object({
  domain: z.string().min(1).max(512),
  name: z.string().min(1).max(512),
});

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export async function addCompetitor(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const { domain, name } = req.body as z.infer<typeof addCompetitorSchema>;

    const record = await competitorService.addCompetitor(projectId, domain, name);
    created(res, record, 'Competitor added successfully');
  } catch (err) {
    badRequest(res, 'Failed to add competitor', (err as Error).message);
  }
}

export async function getCompetitorOverview(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const overview = await competitorService.getCompetitorOverview(projectId);
    success(res, overview);
  } catch (err) {
    badRequest(res, 'Failed to fetch competitor overview', (err as Error).message);
  }
}

export async function getKeywordOverlap(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const competitorId = req.query.competitorId as string;

    if (!competitorId) {
      badRequest(res, 'competitorId query parameter is required');
      return;
    }

    const overlap = await competitorService.getKeywordOverlap(projectId, competitorId);
    success(res, overlap);
  } catch (err) {
    badRequest(res, 'Failed to fetch keyword overlap', (err as Error).message);
  }
}

export default {
  addCompetitor,
  getCompetitorOverview,
  getKeywordOverlap,
};