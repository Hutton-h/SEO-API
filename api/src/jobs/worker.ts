import { Worker, type Job, type ConnectionOptions } from 'bullmq';
import redis from './shared/redis.js';
import { config } from './config.js';
import crawlProcessor from './jobs/processors/crawlProcessor.js';
import auditProcessor from './jobs/processors/auditProcessor.js';
import rankingFetchProcessor from './jobs/processors/rankingFetchProcessor.js';
import backlinkRefreshProcessor from './jobs/processors/backlinkRefreshProcessor.js';
import semFetchProcessor from './jobs/processors/semFetchProcessor.js';
import reportProcessor from './jobs/processors/reportProcessor.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JobData {
  taskId: string;
  projectId: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Connection config
// ---------------------------------------------------------------------------

const connection: ConnectionOptions = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password || undefined,
  maxRetriesPerRequest: null,
};

// ---------------------------------------------------------------------------
// Processor registry
// ---------------------------------------------------------------------------

const processors: Record<string, (job: Job<JobData>) => Promise<void>> = {
  crawl: crawlProcessor,
  audit: auditProcessor,
  'ranking-fetch': rankingFetchProcessor,
  'backlink-refresh': backlinkRefreshProcessor,
  'sem-fetch': semFetchProcessor,
  report: reportProcessor,
};

// ---------------------------------------------------------------------------
// Worker factory
// ---------------------------------------------------------------------------

function createWorker(
  queueName: string,
  processor: (job: Job<JobData>) => Promise<void>,
  concurrency: number = 5,
): Worker<JobData> {
  const worker = new Worker<JobData>(queueName, processor, {
    connection,
    concurrency,
    autorun: true,
    removeOnComplete: {
      age: 3600 * 24,
    },
    removeOnFail: {
      age: 3600 * 24 * 7,
    },
  });

  worker.on('completed', (job: Job<JobData>) => {
    console.log(`[Worker][${queueName}] Job ${job.id} completed`);
  });

  worker.on('failed', (job: Job<JobData> | undefined, err: Error) => {
    console.error(`[Worker][${queueName}] Job ${job?.id ?? 'unknown'} failed:`, err.message);
  });

  worker.on('error', (err: Error) => {
    console.error(`[Worker][${queueName}] Worker error:`, err.message);
  });

  return worker;
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

const workers: Worker<JobData>[] = [];

function startWorkers(): void {
  console.log('[Worker] Starting all queue workers...');

  const concurrencyMap: Record<string, number> = {
    crawl: config.crawl.maxConcurrency,
    audit: 3,
    'ranking-fetch': 5,
    'backlink-refresh': 3,
    'sem-fetch': 3,
    report: 2,
  };

  for (const [queueName, processor] of Object.entries(processors)) {
    const concurrency = concurrencyMap[queueName] ?? 3;
    const worker = createWorker(queueName, processor, concurrency);
    workers.push(worker);
    console.log(`[Worker] Registered worker for queue "${queueName}" (concurrency: ${concurrency})`);
  }

  console.log(`[Worker] ${workers.length} workers started successfully`);
}

async function shutdownWorkers(): Promise<void> {
  console.log('[Worker] Shutting down all workers...');
  await Promise.all(workers.map((w) => w.close()));
  console.log('[Worker] All workers shut down');
}

// ---------------------------------------------------------------------------
// Signal handlers
// ---------------------------------------------------------------------------

process.on('SIGTERM', async () => {
  console.log('[Worker] Received SIGTERM');
  await shutdownWorkers();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Worker] Received SIGINT');
  await shutdownWorkers();
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Worker] Unhandled rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Worker] Uncaught exception:', err);
  process.exit(1);
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

startWorkers();

export default {
  workers,
  startWorkers,
  shutdownWorkers,
};