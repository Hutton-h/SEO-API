// ============================================================================
// 任务队列 (BullMQ)
// 多队列架构: 高优先级(ranking) / 标准(backlink/crawl) / 低优先级(report)
// ============================================================================

import { Queue, Worker, type Job, type QueueScheduler } from 'bullmq';
import { redis } from '../redis.js';
import logger from '../logger.js';

// ── 队列名称 ──────────────────────────────────────────────────────────────────

export const QUEUES = {
  RANKING: 'crane:ranking',
  BACKLINK: 'crane:backlink',
  CRAWL: 'crane:crawl',
  SEM: 'crane:sem',
  REPORT: 'crane:report',
  ALERT: 'crane:alert',
  NOTIFICATION: 'crane:notification',
} as const;

// 队列优先级
const QUEUE_PRIORITY: Record<string, number> = {
  [QUEUES.ALERT]: 1,
  [QUEUES.NOTIFICATION]: 1,
  [QUEUES.RANKING]: 2,
  [QUEUES.BACKLINK]: 3,
  [QUEUES.CRAWL]: 3,
  [QUEUES.SEM]: 4,
  [QUEUES.REPORT]: 5,
};

// ── 队列定义 ──────────────────────────────────────────────────────────────────

const queues = new Map<string, Queue>();

function getQueue(name: string): Queue {
  if (!queues.has(name)) {
    queues.set(
      name,
      new Queue(name, {
        connection: {
          host: redis.options.host || 'localhost',
          port: redis.options.port || 6379,
          password: (redis.options as any).password || undefined,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { age: 60 * 60 * 24 }, // 24h
          removeOnFail: { age: 60 * 60 * 24 * 7 }, // 7d
          priority: QUEUE_PRIORITY[name] ?? 5,
        },
      }),
    );
    logger.info({ queue: name, priority: QUEUE_PRIORITY[name] }, '[Queue] Created');
  }
  return queues.get(name)!;
}

// ── 注册 Worker ───────────────────────────────────────────────────────────────

const workers = new Map<string, Worker>();

function registerWorker(
  queueName: string,
  handler: (job: Job) => Promise<void>,
  concurrency: number = 1,
  id: string = 'default',
): Worker {
  // 确保队列存在
  getQueue(queueName);

  const workerKey = `${queueName}:${id}`;
  if (workers.has(workerKey)) {
    return workers.get(workerKey)!;
  }

  const worker = new Worker(
    queueName,
    async (job: Job) => {
      const startTime = Date.now();
      logger.info(
        { queue: queueName, jobId: job.id, jobName: job.name },
        `[Worker] Processing job #${job.id}`,
      );
      try {
        await handler(job);
        const duration = Date.now() - startTime;
        logger.info(
          { queue: queueName, jobId: job.id, durationMs: duration },
          `[Worker] Job #${job.id} completed in ${duration}ms`,
        );
      } catch (error: any) {
        logger.error(
          { queue: queueName, jobId: job.id, error: error?.message },
          `[Worker] Job #${job.id} failed`,
        );
        throw error;
      }
    },
    {
      connection: {
        host: redis.options.host || 'localhost',
        port: redis.options.port || 6379,
        password: (redis.options as any).password || undefined,
      },
      concurrency,
      limiter: {
        max: 100,
        duration: 60000, // 每分钟最多 100 个任务
      },
    },
  );

  worker.on('error', (err: Error) => {
    logger.error({ queue: queueName, error: err.message }, '[Worker] Error');
  });

  workers.set(workerKey, worker);
  logger.info({ queue: queueName, concurrency, id }, '[Worker] Registered');
  return worker;
}

// ── 公开 API ──────────────────────────────────────────────────────────────────

/**
 * 添加任务到队列
 */
export async function enqueue(
  queueName: string,
  jobName: string,
  data: Record<string, unknown>,
  options?: { priority?: number; delay?: number },
): Promise<Job> {
  const queue = getQueue(queueName);
  return queue.add(jobName, data, {
    priority: options?.priority,
    delay: options?.delay,
  });
}

/**
 * 批量添加任务
 */
export async function enqueueBulk(
  queueName: string,
  jobs: { name: string; data: Record<string, unknown> }[],
): Promise<void> {
  const queue = getQueue(queueName);
  await queue.addBulk(jobs.map((j) => ({ name: j.name, data: j.data })));
}

/**
 * 获取队列统计
 */
export async function getQueueStats(queueName: string): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  const queue = getQueue(queueName);
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);
  return { waiting, active, completed, failed, delayed };
}

/**
 * 获取所有队列统计
 */
export async function getAllQueueStats(): Promise<Record<string, unknown>> {
  const stats: Record<string, unknown> = {};
  for (const name of Object.values(QUEUES)) {
    stats[name] = await getQueueStats(name);
  }
  return stats;
}

/**
 * 关闭所有队列和 Worker
 */
export async function shutdown(): Promise<void> {
  for (const workerRef of workers.values()) {
    await workerRef.close();
  }
  for (const queue of queues.values()) {
    await queue.close();
  }
  logger.info('[Queue] All queues and workers shut down');
}

export { getQueue, registerWorker, getQueueStats, getAllQueueStats };