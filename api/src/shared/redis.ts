import { Redis } from 'ioredis';
import config from '../config.js';

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
  lazyConnect: false,
});

redis.on('connect', () => {
  console.log('[Redis] Connected successfully');
});

redis.on('error', (err: Error) => {
  console.error('[Redis] Connection error:', err.message);
});

redis.on('ready', () => {
  console.log('[Redis] Ready to accept commands');
});

redis.on('close', () => {
  console.warn('[Redis] Connection closed');
});

export async function testRedisConnection(): Promise<boolean> {
  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch (error) {
    console.error('[Redis] Ping failed:', error);
    return false;
  }
}

export { redis };
export default redis;