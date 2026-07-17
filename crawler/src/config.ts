import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

function env(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function envInt(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid integer, got: ${value}`);
  }
  return parsed;
}

export interface CrawlerConfig {
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
  redis: {
    host: string;
    port: number;
    password: string;
  };
  crawl: {
    maxConcurrency: number;
    maxPagesPerCrawl: number;
    requestTimeout: number;
    maxRequestsPerMinute: number;
    userAgent: string;
    respectRobotsTxt: boolean;
  };
  lighthouse: {
    categories: string[];
    mobileEmulation: boolean;
    timeout: number;
  };
  logLevel: string;
}

function loadConfig(): CrawlerConfig {
  return {
    database: {
      host: env('DB_HOST', 'localhost'),
      port: envInt('DB_PORT', 5432),
      user: env('DB_USER', 'postgres'),
      password: env('DB_PASSWORD', 'postgres'),
      database: env('DB_NAME', 'crane_seo'),
    },
    redis: {
      host: env('REDIS_HOST', 'localhost'),
      port: envInt('REDIS_PORT', 6379),
      password: env('REDIS_PASSWORD', ''),
    },
    crawl: {
      maxConcurrency: envInt('CRAWLER_CONCURRENCY', 5),
      maxPagesPerCrawl: envInt('CRAWLER_MAX_REQUESTS_PER_MINUTE', 60),
      requestTimeout: envInt('CRAWLER_REQUEST_TIMEOUT', 30000),
      maxRequestsPerMinute: envInt('CRAWLER_MAX_REQUESTS_PER_MINUTE', 60),
      userAgent: env(
        'CRAWLER_USER_AGENT',
        'Mozilla/5.0 (compatible; CraneSEOBot/1.0; +https://crane-seo.com/bot)',
      ),
      respectRobotsTxt: env('CRAWLER_RESPECT_ROBOTS_TXT', 'true') === 'true',
    },
    lighthouse: {
      categories: ['performance', 'accessibility', 'best-practices', 'seo'],
      mobileEmulation: true,
      timeout: 120000,
    },
    logLevel: env('LOG_LEVEL', 'info'),
  };
}

export const config: CrawlerConfig = loadConfig();

export default config;