import { Queue, type QueueOptions, type JobsOptions } from 'bullmq';
import redis from './redis.js';

const defaultQueueOptions: QueueOptions = {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 3600 * 24,
    },
    removeOnFail: {
      age: 3600 * 24 * 7,
    },
  },
};

export const crawlQueue = new Queue('crawl', defaultQueueOptions);

export const auditQueue = new Queue('audit', defaultQueueOptions);

export const rankingFetchQueue = new Queue('ranking-fetch', defaultQueueOptions);

export const backlinkRefreshQueue = new Queue('backlink-refresh', defaultQueueOptions);

export const semFetchQueue = new Queue('sem-fetch', defaultQueueOptions);

export const reportQueue = new Queue('report', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    attempts: 2,
  },
});

const queueRegistry = new Map<string, Queue>([
  ['crawl', crawlQueue],
  ['audit', auditQueue],
  ['ranking-fetch', rankingFetchQueue],
  ['backlink-refresh', backlinkRefreshQueue],
  ['sem-fetch', semFetchQueue],
  ['report', reportQueue],
]);

export function getQueue(name: string): Queue | undefined {
  return queueRegistry.get(name);
}

export function getAllQueues(): Queue[] {
  return Array.from(queueRegistry.values());
}

export async function closeAllQueues(): Promise<void> {
  const queues = getAllQueues();
  await Promise.all(queues.map((q) => q.close()));
  console.log('[Queue] All queues closed');
}

export async function pauseAllQueues(): Promise<void> {
  const queues = getAllQueues();
  await Promise.all(queues.map((q) => q.pause()));
  console.log('[Queue] All queues paused');
}

export async function resumeAllQueues(): Promise<void> {
  const queues = getAllQueues();
  await Promise.all(queues.map((q) => q.resume()));
  console.log('[Queue] All queues resumed');
}

export async function drainAllQueues(): Promise<void> {
  const queues = getAllQueues();
  await Promise.all(queues.map((q) => q.drain()));
  console.log('[Queue] All queues drained');
}

export default {
  crawlQueue,
  auditQueue,
  rankingFetchQueue,
  backlinkRefreshQueue,
  semFetchQueue,
  reportQueue,
  getQueue,
  getAllQueues,
  closeAllQueues,
  pauseAllQueues,
  resumeAllQueues,
  drainAllQueues,
};