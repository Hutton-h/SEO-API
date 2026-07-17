import { Worker, type Job } from 'bullmq';
import { Redis } from 'ioredis';
import config from './config.js';
import { testConnection, closeConnection, updateTaskStatus, getProjectById } from './db.js';
import { runCrawl } from './crawler.js';
import { runLighthouseBatch } from './lighthouse.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CrawlJobData {
  taskId: string;
  projectId: string;
  maxPages?: number;
  concurrency?: number;
  urls?: string[];
}

// ---------------------------------------------------------------------------
// Redis Connection
// ---------------------------------------------------------------------------

const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  retryStrategy(times: number): number | void {
    if (times > 10) {
      console.error('[Redis] Max retry attempts reached, giving up');
      return;
    }
    const delay = Math.min(times * 200, 5000);
    console.warn(`[Redis] Retry attempt ${times}, waiting ${delay}ms`);
    return delay;
  },
});

redis.on('connect', () => {
  console.log('[Redis] Connected successfully');
});

redis.on('error', (err: Error) => {
  console.error('[Redis] Connection error:', err.message);
});

// ---------------------------------------------------------------------------
// BullMQ Worker
// ---------------------------------------------------------------------------

const crawlWorker = new Worker<CrawlJobData>(
  'crawl',
  async (job: Job<CrawlJobData>) => {
    const { taskId, projectId, maxPages, concurrency, urls: jobUrls } = job.data;

    console.log(`[Worker] Starting crawl job: taskId=${taskId}, projectId=${projectId}`);

    // Update task to running
    await updateTaskStatus(taskId, 'running', 0);

    try {
      // Get project info
      const project = await getProjectById(projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      const domain = project.domain;

      // Determine URLs to crawl
      let urls: string[];
      if (jobUrls && jobUrls.length > 0) {
        urls = jobUrls;
      } else {
        // Default: crawl the domain root and common pages
        urls = buildDefaultUrls(domain);
      }

      const maxPagesLimit = maxPages ?? config.crawl.maxPagesPerCrawl;
      const crawlUrls = urls.slice(0, maxPagesLimit);

      console.log(`[Worker] Crawling ${crawlUrls.length} URLs for domain: ${domain}`);

      // Update progress
      await updateTaskStatus(taskId, 'running', 10);
      await job.updateProgress(10);

      // Run the crawl
      const crawlResult = await runCrawl(projectId, taskId, crawlUrls, {
        maxConcurrency: concurrency ?? config.crawl.maxConcurrency,
        maxPagesPerCrawl: maxPagesLimit,
      });

      console.log(
        `[Worker] Crawl completed: ${crawlResult.pagesCrawled} pages, ${crawlResult.pagesFailed} failed, ${crawlResult.totalIssues} issues`,
      );

      // Update progress
      await updateTaskStatus(taskId, 'running', 70);
      await job.updateProgress(70);

      // Build page ID map for Lighthouse
      const { getProjectPages } = await import('./db.js');
      const pages = await getProjectPages(projectId);
      const pageIdMap = new Map<string, string>();
      for (const page of pages) {
        if (page.url) {
          pageIdMap.set(page.url, page.id ?? '');
        }
      }

      // Run Lighthouse audits on successfully crawled pages
      if (crawlResult.pagesCrawled > 0) {
        console.log(`[Worker] Running Lighthouse audits on ${crawlResult.pagesCrawled} pages...`);

        await updateTaskStatus(taskId, 'running', 75);
        await job.updateProgress(75);

        try {
          await runLighthouseBatch(crawlUrls.slice(0, crawlResult.pagesCrawled), projectId, pageIdMap);
          console.log('[Worker] Lighthouse audits completed');
        } catch (lighthouseErr) {
          console.error('[Worker] Lighthouse audit error (non-fatal):', lighthouseErr);
        }
      }

      // Mark task as completed
      await updateTaskStatus(taskId, 'completed', 100, {
        pagesCrawled: crawlResult.pagesCrawled,
        pagesFailed: crawlResult.pagesFailed,
        totalIssues: crawlResult.totalIssues,
        domain,
        errors: crawlResult.errors,
      });

      console.log(`[Worker] Job completed: taskId=${taskId}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[Worker] Job failed: taskId=${taskId}, error=${errorMessage}`);

      await updateTaskStatus(taskId, 'failed', 0, undefined, errorMessage);
      throw err;
    }
  },
  {
    connection: redis,
    concurrency: 1, // Process one job at a time (each job may spawn multiple crawler instances)
    limiter: {
      max: 1,
      duration: 1000,
    },
  },
);

// ---------------------------------------------------------------------------
// Worker Events
// ---------------------------------------------------------------------------

crawlWorker.on('completed', (job: Job) => {
  console.log(`[Worker] Job ${job.id} completed`);
});

crawlWorker.on('failed', (job: Job | undefined, err: Error) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});

crawlWorker.on('error', (err: Error) => {
  console.error('[Worker] Worker error:', err.message);
});

crawlWorker.on('drained', () => {
  console.log('[Worker] Queue drained');
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a default set of URLs to crawl for a domain.
 */
function buildDefaultUrls(domain: string): string[] {
  // Ensure the domain has a protocol
  const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;

  // Common pages to crawl
  const commonPaths = [
    '/',
    '/products',
    '/about',
    '/contact',
    '/services',
    '/blog',
    '/faq',
    '/sitemap',
  ];

  return commonPaths.map((path) => {
    const url = new URL(path, baseUrl);
    return url.toString();
  });
}

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

async function start(): Promise<void> {
  console.log('========================================');
  console.log('  Crane SEO - Crawler Service');
  console.log('========================================');
  console.log(`  Max Concurrency: ${config.crawl.maxConcurrency}`);
  console.log(`  Max Pages/Crawl: ${config.crawl.maxPagesPerCrawl}`);
  console.log('========================================');

  // Test database connection
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('[Startup] Database connection failed, exiting...');
    process.exit(1);
  }

  // Test Redis connection
  try {
    const pong = await redis.ping();
    if (pong !== 'PONG') {
      throw new Error('Redis ping failed');
    }
    console.log('[Startup] Redis connection established');
  } catch (err) {
    console.error('[Startup] Redis connection failed:', err);
    process.exit(1);
  }

  console.log('[Startup] Crawler worker is ready, waiting for jobs...');
}

// ---------------------------------------------------------------------------
// Graceful Shutdown
// ---------------------------------------------------------------------------

async function shutdown(signal: string): Promise<void> {
  console.log(`[Shutdown] Received ${signal}, shutting down gracefully...`);

  try {
    await crawlWorker.close();
    console.log('[Shutdown] Worker closed');
  } catch (err) {
    console.error('[Shutdown] Error closing worker:', err);
  }

  try {
    await redis.quit();
    console.log('[Shutdown] Redis connection closed');
  } catch (err) {
    console.error('[Shutdown] Error closing Redis:', err);
  }

  try {
    await closeConnection();
    console.log('[Shutdown] Database connection closed');
  } catch (err) {
    console.error('[Shutdown] Error closing database:', err);
  }

  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ---------------------------------------------------------------------------
// Entry Point
// ---------------------------------------------------------------------------

start().catch((err) => {
  console.error('[Startup] Fatal error:', err);
  process.exit(1);
});

export default crawlWorker;