import { rankingFetchQueue, auditQueue, crawlQueue, reportQueue } from '../shared/queue.js';
import { processRankingFetch } from './processors/rankingFetchProcessor.js';
import { processCrawl } from './processors/crawlProcessor.js';
import { processUptimeCheck } from './processors/uptimeProcessor.js';
import { processChangeDetection } from './processors/changeDetectionProcessor.js';

// ---------------------------------------------------------------------------
// Worker: Process jobs from queues
// ---------------------------------------------------------------------------

export async function startWorker(): Promise<void> {
  console.log('[Worker] Starting job worker...');

  // --- Ranking Fetch Queue ---
  rankingFetchQueue.process('fetch-rankings', async (job) => {
    console.log(`[Worker] Processing ranking fetch job: ${job.id}`);
    await processRankingFetch(job.data);
  });

  // --- Audit Queue ---
  auditQueue.process('run-audit', async (job) => {
    console.log(`[Worker] Processing audit job: ${job.id}`);
    // Audit processing is handled by the crawl service
    const { taskId } = job.data;
    console.log(`[Worker] Audit task ${taskId} queued`);
  });

  // --- Crawl Queue ---
  crawlQueue.process('run-crawl', async (job) => {
    console.log(`[Worker] Processing crawl job: ${job.id}`);
    await processCrawl(job.data);
  });

  // --- Report Queue ---
  reportQueue.process('generate-report', async (job) => {
    console.log(`[Worker] Processing report generation job: ${job.id}`);
    // Report generation is handled by the report service
    const { taskId, projectId } = job.data;
    console.log(`[Worker] Report task ${taskId} for project ${projectId} queued`);
  });

  // --- Uptime Check Queue ---
  rankingFetchQueue.process('uptime-check', async (job) => {
    console.log(`[Worker] Processing uptime check job: ${job.id}`);
    await processUptimeCheck(job.data);
  });

  // --- Change Detection Queue ---
  rankingFetchQueue.process('change-detection', async (job) => {
    console.log(`[Worker] Processing change detection job: ${job.id}`);
    await processChangeDetection(job.data);
  });

  // --- Queue event handlers ---
  rankingFetchQueue.on('completed', (job) => {
    console.log(`[Worker] Ranking fetch job ${job.id} completed`);
  });

  rankingFetchQueue.on('failed', (job, err) => {
    console.error(`[Worker] Ranking fetch job ${job?.id} failed:`, err);
  });

  auditQueue.on('completed', (job) => {
    console.log(`[Worker] Audit job ${job.id} completed`);
  });

  auditQueue.on('failed', (job, err) => {
    console.error(`[Worker] Audit job ${job?.id} failed:`, err);
  });

  crawlQueue.on('completed', (job) => {
    console.log(`[Worker] Crawl job ${job.id} completed`);
  });

  crawlQueue.on('failed', (job, err) => {
    console.error(`[Worker] Crawl job ${job?.id} failed:`, err);
  });

  console.log('[Worker] Job worker started successfully');
}

export async function stopWorker(): Promise<void> {
  console.log('[Worker] Stopping job worker...');

  await rankingFetchQueue.close();
  await auditQueue.close();
  await crawlQueue.close();
  await reportQueue.close();

  console.log('[Worker] Job worker stopped');
}

export default {
  startWorker,
  stopWorker,
};