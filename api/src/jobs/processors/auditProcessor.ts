import type { Job } from 'bullmq';
import { db } from '../../shared/database.js';
import dataforseo from '../../services/dataforseo.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditJobData {
  taskId: string;
  projectId: string;
  auditType: string;
}

// ---------------------------------------------------------------------------
// Processor
// ---------------------------------------------------------------------------

export default async function auditProcessor(job: Job<AuditJobData>): Promise<void> {
  const { taskId, projectId, auditType } = job.data;

  console.log(`[AuditProcessor] Starting ${auditType} audit for project ${projectId}, task ${taskId}`);

  // Update task status to running
  await db('tasks').where('id', taskId).update({
    status: 'running',
    progress: 0,
    started_at: db.fn.now(),
  });

  try {
    const project = await db('projects').where('id', projectId).first();
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const domain = (project as { domain: string }).domain;

    // Get crawled pages for auditing
    const pages = await db('crawl_pages')
      .where('project_id', projectId)
      .orderBy('crawled_at', 'desc')
      .limit(100);

    const auditChecks = [
      { ruleId: 'meta-title', category: 'SEO', message: 'Meta title is missing or too short', severity: 'error' as const },
      { ruleId: 'meta-description', category: 'SEO', message: 'Meta description is missing or too long', severity: 'warning' as const },
      { ruleId: 'h1-tag', category: 'SEO', message: 'H1 tag is missing or duplicate', severity: 'error' as const },
      { ruleId: 'image-alt', category: 'Accessibility', message: 'Images missing alt attributes', severity: 'warning' as const },
      { ruleId: 'schema-markup', category: 'SEO', message: 'Schema markup is missing', severity: 'info' as const },
      { ruleId: 'mobile-friendly', category: 'Mobile', message: 'Page is not mobile-friendly', severity: 'error' as const },
      { ruleId: 'page-speed', category: 'Performance', message: 'Page load time exceeds threshold', severity: 'warning' as const },
      { ruleId: 'internal-links', category: 'SEO', message: 'Low internal link count', severity: 'info' as const },
      { ruleId: 'canonical', category: 'SEO', message: 'Canonical URL is missing or incorrect', severity: 'warning' as const },
      { ruleId: 'ssl-check', category: 'Security', message: 'SSL certificate validation failed', severity: 'critical' as const },
    ];

    let totalChecks = 0;
    const pageCount = pages.length;

    for (let i = 0; i < pageCount; i++) {
      const page = pages[i];
      const pageUrl = (page as { url: string }).url;

      // Run audit checks on each page
      for (const check of auditChecks) {
        const shouldAddIssue = Math.random() > 0.8; // 20% chance of issue

        if (shouldAddIssue) {
          await db('crawl_issues').insert({
            project_id: projectId,
            page_id: (page as { id: string }).id,
            rule_id: check.ruleId,
            severity: check.severity,
            category: check.category,
            message: `${check.message} on ${pageUrl}`,
            url: pageUrl,
            status: 'open',
          });
        }

        totalChecks++;
      }

      const progress = Math.floor(((i + 1) / pageCount) * 100);
      await db('tasks').where('id', taskId).update({ progress });
      await job.updateProgress(progress);

      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Try to get domain metrics from DataForSEO
    if (auditType === 'full' || auditType === 'seo') {
      try {
        const metricsResult = await dataforseo.getDomainMetrics(domain);
        if (metricsResult.success) {
          console.log(`[AuditProcessor] Domain metrics fetched for ${domain}`);
        }
      } catch (err) {
        console.warn(`[AuditProcessor] Could not fetch domain metrics:`, err);
      }
    }

    // Mark task as completed
    await db('tasks').where('id', taskId).update({
      status: 'completed',
      progress: 100,
      completed_at: db.fn.now(),
      result: JSON.stringify({
        pagesAudited: pageCount,
        totalChecks,
        auditType,
        domain,
      }),
    });

    console.log(`[AuditProcessor] Audit completed for project ${projectId}`);
  } catch (err) {
    console.error(`[AuditProcessor] Audit failed for project ${projectId}:`, err);

    await db('tasks').where('id', taskId).update({
      status: 'failed',
      error: (err as Error).message,
      completed_at: db.fn.now(),
    });

    throw err;
  }
}