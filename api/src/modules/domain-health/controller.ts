import type { Request, Response, NextFunction } from 'express';
import * as domainHealthService from './service.js';
import { success, badRequest } from '../../shared/utils/response.js';

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export async function getDomainHealth(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const projectId = (req.query.projectId as string) || (req.body as any)?.projectId;

    const result = await domainHealthService.getDomainHealth(projectId);
    success(res, result);
  } catch (err) {
    badRequest(res, 'Failed to get domain health', { error: (err as Error).message });
  }
}

export default {
  getDomainHealth,
};