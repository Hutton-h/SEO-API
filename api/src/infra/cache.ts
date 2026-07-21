// ============================================================================
// 双层缓存：L1 内存 LRU + L2 Redis
// ============================================================================

import { redis } from '../redis.js';

// ── L1 内存 LRU 缓存 ──────────────────────────────────────────────────────────

interface L1Entry {
  value: unknown;
  expiresAt: number;
}

class L1Cache {
  private store = new Map<string, L1Entry>();
  private maxSize: number;
  private ttlMs: number;

  // 命中率统计
  private hits = 0;
  private misses = 0;

  constructor(maxSize: number = 2000, ttlMs: number = 30000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  get(key: string): unknown | null {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return null;
    }
    this.hits++;
    // LRU: 移到末尾
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: unknown): void {
    // 驱逐最旧的条目
    if (this.store.size >= this.maxSize) {
      const oldest = this.store.keys().next().value;
      if (oldest) this.store.delete(oldest);
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  del(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  get size(): number {
    return this.store.size;
  }

  get hitRate(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : this.hits / total;
  }
}

// ── 动态 TTL 映射 ─────────────────────────────────────────────────────────────

const CATEGORY_TTL: Record<string, number> = {
  serp: 3600,           // 1 小时
  keyword_volume: 86400, // 24 小时
  whois: 604800,         // 7 天
  backlinks: 7200,       // 2 小时
  domain_overview: 43200, // 12 小时
  rankings: 1800,        // 30 分钟
  crawl: 86400,           // 24 小时
  default: 3600,         // 1 小时
};

// ── 双层缓存 ──────────────────────────────────────────────────────────────────

class Cache {
  private l1 = new L1Cache(2000, 30000);
  private l2Hits = 0;
  private l2Misses = 0;

  /**
   * 获取缓存值。先查 L1 → miss 则查 L2 → miss 返回 null → 命中回填 L1
   */
  async get<T>(key: string, category: string = 'default'): Promise<T | null> {
    // L1 查询
    const l1Value = this.l1.get(key);
    if (l1Value !== null) {
      return l1Value as T;
    }

    // L2 查询
    try {
      const raw = await redis.get(`cache:${key}`);
      if (raw) {
        this.l2Hits++;
        const parsed = JSON.parse(raw) as T;
        this.l1.set(key, parsed); // 回填 L1
        return parsed;
      }
      this.l2Misses++;
      return null;
    } catch (error) {
      console.warn(`[Cache] Redis error on get('${key}'):`, error);
      return null;
    }
  }

  /**
   * 写入缓存。同时写 L1 和 L2
   */
  async set<T>(key: string, value: T, category: string = 'default'): Promise<void> {
    // L1
    this.l1.set(key, value);

    // L2
    const ttl = CATEGORY_TTL[category] ?? CATEGORY_TTL.default;
    try {
      await redis.set(`cache:${key}`, JSON.stringify(value), 'EX', ttl);
    } catch (error) {
      console.warn(`[Cache] Redis error on set('${key}'):`, error);
    }
  }

  /**
   * 删除缓存。同时删 L1 和 L2
   */
  async del(key: string): Promise<void> {
    this.l1.del(key);
    try {
      await redis.del(`cache:${key}`);
    } catch (error) {
      console.warn(`[Cache] Redis error on del('${key}'):`, error);
    }
  }

  /**
   * 清除匹配的缓存
   */
  async clear(pattern?: string): Promise<void> {
    this.l1.clear();
    if (pattern) {
      try {
        const keys = await redis.keys(`cache:${pattern}`);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } catch (error) {
        console.warn(`[Cache] Redis error on clear('${pattern}'):`, error);
      }
    }
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    const totalL2 = this.l2Hits + this.l2Misses;
    return {
      l1Size: this.l1.size,
      l1HitRate: Math.round(this.l1.hitRate * 10000) / 100,
      l2HitRate: totalL2 === 0 ? 0 : Math.round((this.l2Hits / totalL2) * 10000) / 100,
    };
  }
}

export const cache = new Cache();
export default cache;