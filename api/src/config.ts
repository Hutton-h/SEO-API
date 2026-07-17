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

export interface Config {
  port: number;
  host: string;
  nodeEnv: string;
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
  dataforseo: {
    email: string;
    apiKey: string;
    baseUrl: string;
  };
  majestic: {
    apiKey: string;
    baseUrl: string;
  };
  openai: {
    apiKey: string;
    model: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  crawl: {
    maxConcurrency: number;
    maxPagesPerCrawl: number;
    requestTimeout: number;
  };
  app: {
    apiVersion: string;
    brandName: string;
    primaryColor: string;
    logoUrl: string;
  };
}

function loadConfig(): Config {
  return {
    port: envInt('PORT', 3000),
    host: env('HOST', '0.0.0.0'),
    nodeEnv: env('NODE_ENV', 'development'),

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

    dataforseo: {
      email: env('DATAFORSEO_EMAIL'),
      apiKey: env('DATAFORSEO_API_KEY'),
      baseUrl: 'https://api.dataforseo.com',
    },

    majestic: {
      apiKey: env('MAJESTIC_API_KEY', ''),
      baseUrl: env('MAJESTIC_BASE_URL', 'https://api.majestic.com/api'),
    },

    openai: {
      apiKey: env('OPENAI_API_KEY', ''),
      model: env('OPENAI_MODEL', 'gpt-4o'),
    },

    jwt: {
      secret: env('JWT_SECRET', 'crane-seo-jwt-secret-change-in-production'),
      expiresIn: env('JWT_EXPIRES_IN', '7d'),
    },

    crawl: {
      maxConcurrency: envInt('CRAWL_MAX_CONCURRENCY', 5),
      maxPagesPerCrawl: envInt('CRAWL_MAX_PAGES_PER_CRAWL', 500),
      requestTimeout: envInt('CRAWL_REQUEST_TIMEOUT', 30000),
    },

    app: {
      apiVersion: env('APP_API_VERSION', 'v1'),
      brandName: env('APP_BRAND_NAME', 'Crane SEO'),
      primaryColor: env('APP_PRIMARY_COLOR', '#2563eb'),
      logoUrl: env('APP_LOGO_URL', '/logo.png'),
    },
  };
}

export const config: Config = loadConfig();

export default config;