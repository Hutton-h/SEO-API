import { Redis } from 'ioredis';
import config from './config.js';

// ============================================================================
// Redis 连接
// ============================================================================

const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password || undefined,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy(times: number): number | void {
    if (times > 10) {
      console.error('[Redis] Max retry attempts reached, giving up');
      return;
    }
    // 指数退避: 200ms, 400ms, 800ms, 1600ms, 3200ms, 5000ms (max)
    const delay = Math.min(Math.pow(2, times) * 100, 5000);
    console.warn(`[Redis] Retry attempt ${times}, waiting ${delay}ms`);
    return delay;
  },
  lazyConnect: false,
});

redis.on('error', (err: Error) => {
  console.error('[Redis] Connection error:', err.message);
});

redis.on('connect', () => {
  console.log('[Redis] Connected successfully');
});

redis.on('ready', () => {
  console.log('[Redis] Ready to accept commands');
});

// ============================================================================
// 连接测试
// ============================================================================

export async function testConnection(): Promise<boolean> {
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