import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as crawlService from './service.js';
import { db } from '../../shared/database.js';
import { pagespeed } from '../../services/pagespeed.js';
import {
  success, created, notFound, badRequest, paginated,
} from '../../shared/utils/response.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const triggerCrawlSchema = z.object({
  url: z.string().url().optional(),
  maxPages: z.number().int().positive().max(1000).optional().default(500),
  concurrency: z.number().int().min(1).max(20).optional().default(5),
});

export const triggerAuditSchema = z.object({
  url: z.string().url().optional(),
  auditType: z.enum(['full', 'seo', 'performance', 'accessibility']).optional().default('full'),
  includePSI: z.boolean().optional().default(true),
  psiUrls: z.array(z.string().url()).optional(),
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
  source: z.enum(['crawl', 'lighthouse', 'psi', 'all']).optional().default('all'),
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
    const { url, maxPages, concurrency } = req.body as z.infer<typeof triggerCrawlSchema>;

    const task = await crawlService.triggerCrawl(projectId, { url, maxPages, concurrency });
    created(res, task, 'Crawl task created successfully');
  } catch (err) {
    console.error('[CrawlController] triggerCrawl error:', err);
    const msg = (err as Error)?.message || String(err);
    badRequest(res, `Failed to trigger crawl: ${msg}`);
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
    console.error('[CrawlController] getCrawlStatus error:', err);
    badRequest(res, 'Failed to get crawl status');
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
    console.error('[CrawlController] getPages error:', err);
    badRequest(res, 'Failed to fetch pages');
  }
}

export async function getIssues(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const { page, pageSize, severity, status, source } = req.query as unknown as z.infer<
      typeof issuesQuerySchema
    >;

    const result = await crawlService.getIssues({
      projectId,
      page,
      pageSize,
      severity,
      status,
    });

    // If Lighthouse/PSI sources are requested, also fetch from those tables
    if (source === 'lighthouse' || source === 'psi' || source === 'all') {
      try {
        const psiIssues = await db('psi_issues')
          .where('project_id', projectId)
          .select('*');

        // Convert PSI issues to crawl_issues format
        const psiFormatted = (psiIssues as Array<Record<string, unknown>>).map((psi) => ({
          id: psi['id'],
          project_id: psi['project_id'],
          rule_id: `psi-${psi['rule_id'] ?? 'perf'}`,
          severity: psi['severity'] ?? 'warning',
          category: 'Performance',
          message: psi['message'] ?? 'PSI issue',
          url: psi['url'] ?? '',
          status: 'open',
          source: 'psi',
          page_id: null,
          element: null,
          resolved_at: null,
          created_at: psi['created_at'],
        }));

        if (source !== 'psi') {
          result.items = [...result.items, ...psiFormatted] as any;
        }

        if (source === 'psi') {
          result.items = psiFormatted as any;
          result.total = psiFormatted.length;
        }
      } catch {
        // psi_issues table may not exist yet, skip PSI data
      }
    }

    paginated(res, result.items, { page, pageSize, total: result.total });
  } catch (err) {
    console.error('[CrawlController] getIssues error:', err);
    badRequest(res, 'Failed to fetch issues');
  }
}

export async function triggerAudit(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const { url, auditType, includePSI, psiUrls } = req.body as z.infer<typeof triggerAuditSchema>;

    const task = await crawlService.triggerAudit(projectId, { url, auditType });
    const taskId = task.id;

    // If PageSpeed Insights is requested, run batch analysis
    if (includePSI) {
      try {
        const project = await db('projects').where('id', projectId).first();
        if (project) {
          const domain = (project as { domain: string }).domain;

          // Determine URLs to analyze
          // Priority: user-provided URL > psiUrls list > crawled pages > domain root
          let urls: string[] = [];
          if (url) {
            urls = [url];
          } else if (psiUrls && psiUrls.length > 0) {
            urls = psiUrls;
          } else {
            // Get top pages from crawl_pages
            const pages = await db('crawl_pages')
              .where('project_id', projectId)
              .where('status_code', 200)
              .select('url')
              .limit(5);

            urls = (pages as Array<{ url: string }>).map((p) => p.url);
            if (urls.length === 0) {
              urls = [`https://${domain}`];
            }
          }

          // Run PSI batch analysis
          const psiResult = await pagespeed.batchAnalyze(urls, 'mobile');

          if (psiResult.success && psiResult.data) {
            // Store PSI results as issues
            for (const result of psiResult.data.results) {
              const { v4: uuidv4 } = await import('uuid');

              if (result.scores.performance < 50) {
                await db('psi_issues').insert({
                  id: uuidv4(),
                  project_id: projectId,
                  url: result.url,
                  rule_id: 'psi-performance',
                  severity: 'critical',
                  category: 'Performance',
                  message: `Performance score is ${result.scores.performance}/100`,
                  metrics: JSON.stringify({
                    scores: result.scores,
                    labData: result.labData,
                  }),
                });
              }

              if (result.scores.accessibility < 70) {
                await db('psi_issues').insert({
                  id: uuidv4(),
                  project_id: projectId,
                  url: result.url,
                  rule_id: 'psi-accessibility',
                  severity: 'warning',
                  category: 'Accessibility',
                  message: `Accessibility score is ${result.scores.accessibility}/100`,
                  metrics: JSON.stringify({ accessibilityScore: result.scores.accessibility }),
                });
              }

              if (result.scores.seo < 80) {
                await db('psi_issues').insert({
                  id: uuidv4(),
                  project_id: projectId,
                  url: result.url,
                  rule_id: 'psi-seo',
                  severity: 'warning',
                  category: 'SEO',
                  message: `SEO score is ${result.scores.seo}/100`,
                  metrics: JSON.stringify({ seoScore: result.scores.seo }),
                });
              }

              // Store opportunities as issues
              for (const opp of result.opportunities.slice(0, 5)) {
                await db('psi_issues').insert({
                  id: uuidv4(),
                  project_id: projectId,
                  url: result.url,
                  rule_id: `psi-opp-${opp.title.substring(0, 30)}`,
                  severity: 'warning',
                  category: 'Performance',
                  message: `${opp.title}: ${opp.description}`,
                  metrics: JSON.stringify({ savings: opp.savings }),
                });
              }
            }
          }
        }
      } catch (psiErr) {
        console.warn('[CrawlController] PSI batch analysis failed:', psiErr);
        // PSI failure should not block the audit task
      }
    }

    created(res, task, `Audit task created successfully${includePSI ? ' (with PSI analysis)' : ''}`);
  } catch (err) {
    console.error('[CrawlController] triggerAudit error:', err);
    const msg = (err as Error)?.message || String(err);
    badRequest(res, `Failed to trigger audit: ${msg}`);
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
    console.error('[CrawlController] getAuditStatus error:', err);
    badRequest(res, 'Failed to get audit status');
  }
}

// ---------------------------------------------------------------------------
// SEO Score
// ---------------------------------------------------------------------------

export async function getSeoScore(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;

    const score = await crawlService.getSeoScore(projectId);
    success(res, score, 'SEO score calculated successfully');
  } catch (err) {
    console.error('[CrawlController] getSeoScore error:', err);
    const msg = (err as Error)?.message || String(err);
    badRequest(res, `Failed to calculate SEO score: ${msg}`);
  }
}

// ---------------------------------------------------------------------------
// Internal Links
// ---------------------------------------------------------------------------

export async function getInternalLinks(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const pageId = req.query['pageId'] as string | undefined;

    const links = await crawlService.getInternalLinks(projectId, pageId);
    success(res, links, 'Internal links retrieved successfully');
  } catch (err) {
    console.error('[CrawlController] getInternalLinks error:', err);
    const msg = (err as Error)?.message || String(err);
    badRequest(res, `Failed to get internal links: ${msg}`);
  }
}

// ---------------------------------------------------------------------------
// External Links
// ---------------------------------------------------------------------------

export async function getExternalLinks(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const pageId = req.query['pageId'] as string | undefined;

    const links = await crawlService.getExternalLinks(projectId, pageId);
    success(res, links, 'External links retrieved successfully');
  } catch (err) {
    console.error('[CrawlController] getExternalLinks error:', err);
    const msg = (err as Error)?.message || String(err);
    badRequest(res, `Failed to get external links: ${msg}`);
  }
}

// ---------------------------------------------------------------------------
// Image Analysis
// ---------------------------------------------------------------------------

export async function getImageAnalysis(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;

    const analysis = await crawlService.getImageAnalysis(projectId);
    success(res, analysis, 'Image SEO analysis completed successfully');
  } catch (err) {
    console.error('[CrawlController] getImageAnalysis error:', err);
    const msg = (err as Error)?.message || String(err);
    badRequest(res, `Failed to get image analysis: ${msg}`);
  }
}

// ---------------------------------------------------------------------------
// Structured Data
// ---------------------------------------------------------------------------

export async function getStructuredData(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;

    const data = await crawlService.getStructuredData(projectId);
    success(res, data, 'Structured data analysis completed successfully');
  } catch (err) {
    console.error('[CrawlController] getStructuredData error:', err);
    const msg = (err as Error)?.message || String(err);
    badRequest(res, `Failed to get structured data: ${msg}`);
  }
}

export default {
  triggerCrawl,
  getCrawlStatus,
  getPages,
  getIssues,
  triggerAudit,
  getAuditStatus,
  getSeoScore,
  getInternalLinks,
  getExternalLinks,
  getImageAnalysis,
  getStructuredData,
};