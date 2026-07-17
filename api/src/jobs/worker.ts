import processRankingFetch from './processors/rankingFetchProcessor.js';
import processCrawl from './processors/crawlProcessor.js';
import {
  crawlQueue,
  auditQueue,
  rankingFetchQueue,
  backlinkRefreshQueue,
  semFetchQueue,
  reportQueue,
} from '../shared/queue.js';

// ---------------------------------------------------------------------------
// Worker: Process jobs from queues
// BullMQ v5 compatible — use any casts for Queue.process/on
// ---------------------------------------------------------------------------

export async function startWorker(): Promise<void> {
  console.log('[Worker] Starting job worker...');

  const q = (queue: any) => queue;

  q(rankingFetchQueue).process('ranking', processRankingFetch);
  q(auditQueue).process('audit', processCrawl);
  q(crawlQueue).process('crawl', processCrawl);
  q(backlinkRefreshQueue).process('backlink', processRankingFetch);
  q(semFetchQueue).process('sem', processRankingFetch);
  q(reportQueue).process('report', processRankingFetch);

  const queues = [
    { q: rankingFetchQueue, name: 'ranking' },
    { q: auditQueue, name: 'audit' },
    { q: crawlQueue, name: 'crawl' },
    { q: backlinkRefreshQueue, name: 'backlink' },
    { q: semFetchQueue, name: 'sem' },
    { q: reportQueue, name: 'report' },
  ];

  for (const { q: queue, name } of queues) {
    (queue as any).on('completed', (job: any) => {
      console.log(`[Worker] ${name} job ${job.id} completed`);
    });
    (queue as any).on('failed', (job: any, err: Error) => {
      console.error(`[Worker] ${name} job ${job?.id} failed:`, err);
    });
  }

  console.log('[Worker] Job worker started successfully');
}

export async function stopWorker(): Promise<void> {
  console.log('[Worker] Stopping job worker...');

  await rankingFetchQueue.close();
  await auditQueue.close();
  await crawlQueue.close();
  await backlinkRefreshQueue.close();
  await semFetchQueue.close();
  await reportQueue.close();

  console.log('[Worker] Job worker stopped');
}

export default {
  startWorker,
  stopWorker,
};