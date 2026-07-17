import type { Job } from 'bullmq';
import { db } from '../../shared/database.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CrawlJobData {
  taskId: string;
  projectId: string;
  maxPages: number;
  concurrency: number;
}

// ---------------------------------------------------------------------------
// Processor
// ---------------------------------------------------------------------------

export default async function crawlProcessor(job: Job<CrawlJobData>): Promise<void> {
  const { taskId, projectId, maxPages } = job.data;

  console.log(`[CrawlProcessor] Starting crawl for project ${projectId}, task ${taskId}`);

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

    // Simulate crawling process - in production this would use a real crawler service
    const pagesToCrawl = Math.min(maxPages, 50);

    for (let i = 0; i < pagesToCrawl; i++) {
      // Check if job has been cancelled
      const currentJob = await job.getState();
      if (currentJob === 'failed' || currentJob === 'unknown') {
        console.log(`[CrawlProcessor] Job ${taskId} was cancelled, stopping`);
        break;
      }

      // Simulate page crawl
      const url = `https://${domain}${i === 0 ? '/' : `/page/${i + 1}`}`;

      await db('crawl_pages').insert({
        project_id: projectId,
        url,
        title: `Page ${i + 1} - ${domain}`,
        status_code: 200,
        load_time_ms: Math.floor(Math.random() * 2000) + 100,
        content_length: Math.floor(Math.random() * 50000) + 1000,
        meta_description: `Meta description for page ${i + 1}`,
        h1: `Heading for page ${i + 1}`,
        h2_count: Math.floor(Math.random() * 5) + 1,
        has_schema: Math.random() > 0.5,
        schema_types: Math.random() > 0.5 ? ['Organization', 'WebPage'] : [],
        word_count: Math.floor(Math.random() * 2000) + 200,
        internal_links_count: Math.floor(Math.random() * 30) + 5,
        external_links_count: Math.floor(Math.random() * 10),
        images_count: Math.floor(Math.random() * 8) + 1,
        images_without_alt: Math.floor(Math.random() * 4),
        canonical_url: url,
        mobile_friendly: Math.random() > 0.2,
      });

      // Generate some sample issues
      if (Math.random() > 0.7) {
        const severities: Array<'critical' | 'error' | 'warning' | 'info'> = [
          'critical', 'error', 'warning', 'info',
        ];
        const severity = severities[Math.floor(Math.random() * severities.length)];

        await db('crawl_issues').insert({
          project_id: projectId,
          rule_id: `rule-${Math.floor(Math.random() * 20) + 1}`,
          severity,
          category: severity === 'critical' ? 'SEO' : 'Performance',
          message: `Sample issue detected on ${url}`,
          url,
          status: 'open',
        });
      }

      // Update progress
      const progress = Math.floor(((i + 1) / pagesToCrawl) * 100);
      await db('tasks').where('id', taskId).update({ progress });
      await job.updateProgress(progress);

      // Small delay to simulate real crawling
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Mark task as completed
    await db('tasks').where('id', taskId).update({
      status: 'completed',
      progress: 100,
      completed_at: db.fn.now(),
      result: JSON.stringify({
        pagesCrawled: pagesToCrawl,
        domain,
      }),
    });

    console.log(`[CrawlProcessor] Crawl completed for project ${projectId}`);
  } catch (err) {
    console.error(`[CrawlProcessor] Crawl failed for project ${projectId}:`, err);

    await db('tasks').where('id', taskId).update({
      status: 'failed',
      error: (err as Error).message,
      completed_at: db.fn.now(),
    });

    throw err;
  }
}