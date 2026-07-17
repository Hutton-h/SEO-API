import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as crawlService from './service.js';
import {
  success, created, notFound, badRequest, paginated,
} from '../../shared/utils/response.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const triggerCrawlSchema = z.object({
  maxPages: z.number().int().positive().max(1000).optional().default(500),
  concurrency: z.number().int().min(1).max(20).optional().default(5),
});

export const triggerAuditSchema = z.object({
  auditType: z.enum(['full', 'seo', 'performance', 'accessibility']).optional().default('full'),
});

export const pagesQuerySchema = z.object({
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
  statusCode: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined)),
  search: z.string().optional(),
});

export const issuesQuerySchema = z.object({
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
  severity: z.enum(['critical', 'error', 'warning', 'info']).optional(),
  status: z.enum(['open', 'in_progress', 'resolved', 'ignored']).optional(),
});

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export async function triggerCrawl(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const { maxPages, concurrency } = req.body as z.infer<typeof triggerCrawlSchema>;

    const task = await crawlService.triggerCrawl(projectId, { maxPages, concurrency });
    created(res, task, 'Crawl task created successfully');
  } catch (err) {
    badRequest(res, 'Failed to trigger crawl', { error: (err as Error).message });
  }
}

export async function getCrawlStatus(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { taskId } = req.params;
    const task = await crawlService.getCrawlStatus(taskId);

    if (!task) {
      notFound(res, 'Crawl task not found');
      return;
    }

    success(res, task);
  } catch (err) {
    badRequest(res, 'Failed to get crawl status', { error: (err as Error).message });
  }
}

export async function getPages(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const { page, pageSize, statusCode, search } = req.query as unknown as z.infer<
      typeof pagesQuerySchema
    >;

    const result = await crawlService.getPages({
      projectId,
      page,
      pageSize,
      statusCode,
      search,
    });

    paginated(res, result.items, { page, pageSize, total: result.total });
  } catch (err) {
    badRequest(res, 'Failed to fetch pages', { error: (err as Error).message });
  }
}

export async function getIssues(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const { page, pageSize, severity, status } = req.query as unknown as z.infer<
      typeof issuesQuerySchema
    >;

    const result = await crawlService.getIssues({
      projectId,
      page,
      pageSize,
      severity,
      status,
    });

    paginated(res, result.items, { page, pageSize, total: result.total });
  } catch (err) {
    badRequest(res, 'Failed to fetch issues', { error: (err as Error).message });
  }
}

export async function triggerAudit(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const { auditType } = req.body as z.infer<typeof triggerAuditSchema>;

    const task = await crawlService.triggerAudit(projectId, { auditType });
    created(res, task, 'Audit task created successfully');
  } catch (err) {
    badRequest(res, 'Failed to trigger audit', { error: (err as Error).message });
  }
}

export async function getAuditStatus(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { taskId } = req.params;
    const task = await crawlService.getAuditStatus(taskId);

    if (!task) {
      notFound(res, 'Audit task not found');
      return;
    }

    success(res, task);
  } catch (err) {
    badRequest(res, 'Failed to get audit status', { error: (err as Error).message });
  }
}

export default {
  triggerCrawl,
  getCrawlStatus,
  getPages,
  getIssues,
  triggerAudit,
  getAuditStatus,
};