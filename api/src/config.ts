import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

// ============================================================================
// 环境变量加载辅助
// ============================================================================

function env(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    console.error(`[Config] Missing required environment variable: ${key}`);
    process.exit(1);
  }
  return value;
}

function envInt(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) return defaultValue;
    console.error(`[Config] Missing required environment variable: ${key}`);
    process.exit(1);
  }
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    console.error(`[Config] ${key} must be an integer, got: ${value}`);
    process.exit(1);
  }
  return parsed;
}

function envBool(key: string, defaultValue: boolean = false): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
}

// ============================================================================
// 类型定义
// ============================================================================

export interface Config {
  server: { port: number; host: string; nodeEnv: string };
  db: { host: string; port: number; name: string; user: string; password: string; poolMin: number; poolMax: number };
  redis: { host: string; port: number; password: string };
  jwt: { secret: string; accessExpiry: string; refreshExpiry: string };
  dataforseo: { enabled: boolean; login: string; password: string };
  openai: { enabled: boolean; apiKey: string; baseUrl: string; model: string };
  majestic: { enabled: boolean; apiKey: string };
  google: {
    psi: { enabled: boolean; apiKey: string };
    gsc: { enabled: boolean; clientId: string; clientSecret: string; refreshToken: string };
    ga4: { enabled: boolean; propertyId: string; clientEmail: string; privateKey: string };
    indexing: { enabled: boolean; serviceAccountKey: string };
    nlp: { enabled: boolean; projectId: string; keyFile: string };
    trends: { enabled: boolean };
  };
  bing: { enabled: boolean; apiKey: string; siteUrl: string };
  valueserp: { enabled: boolean; apiKey: string };
  whoisjson: { enabled: boolean; apiKey: string };
  notification: {
    email: { enabled: boolean; smtpHost: string; smtpPort: number; smtpUser: string; smtpPassword: string; fromAddress: string };
    dingtalk: { enabled: boolean; webhookUrl: string; secret: string };
    feishu: { enabled: boolean; webhookUrl: string; secret: string };
    slack: { enabled: boolean; webhookUrl: string };
    webhook: { enabled: boolean; url: string; secret: string };
  };
  monitoring: {
    uptimeCheckInterval: number;
    alertThresholds: { cpuPercent: number; memoryPercent: number; diskPercent: number; responseTimeMs: number; errorRate: number };
  };
  crawl: { maxConcurrency: number; maxPagesPerCrawl: number; requestTimeout: number };
  app: { apiVersion: string; brandName: string; primaryColor: string; logoUrl: string };
  billing: { dataforseoCostPerCall: number; openaiCostPerToken: number; valueserpCostPerCall: number };
}

// ============================================================================
// 配置加载
// ============================================================================

function loadConfig(): Config {
  return {
    server: {
      port: envInt('API_PORT', 48080),
      host: env('API_HOST', '0.0.0.0'),
      nodeEnv: env('NODE_ENV', 'development'),
    },

    db: {
      host: env('DB_HOST', 'localhost'),
      port: envInt('DB_PORT', 5432),
      name: env('DB_NAME', 'crane_seo'),
      user: env('DB_USER', 'crane_user'),
      password: env('DB_PASSWORD', 'crane_password'),
      poolMin: envInt('DB_POOL_MIN', 2),
      poolMax: envInt('DB_POOL_MAX', 20),
    },

    redis: {
      host: env('REDIS_HOST', 'localhost'),
      port: envInt('REDIS_PORT', 6379),
      password: env('REDIS_PASSWORD', ''),
    },

    jwt: {
      secret: env('JWT_SECRET', 'crane-seo-jwt-secret-change-in-production'),
      accessExpiry: env('JWT_ACCESS_EXPIRY', '7d'),
      refreshExpiry: env('JWT_REFRESH_EXPIRY', '30d'),
    },

    dataforseo: {
      enabled: envBool('DATAFORSEO_ENABLED', true),
      login: env('DATAFORSEO_EMAIL', ''),
      password: env('DATAFORSEO_API_KEY', ''),
    },

    openai: {
      enabled: envBool('OPENAI_ENABLED', false),
      apiKey: env('OPENAI_API_KEY', ''),
      baseUrl: env('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
      model: env('OPENAI_MODEL', 'gpt-4o-mini'),
    },

    majestic: {
      enabled: envBool('MAJESTIC_ENABLED', false),
      apiKey: env('MAJESTIC_API_KEY', ''),
    },

    google: {
      psi: {
        enabled: envBool('GOOGLE_PSI_ENABLED', false),
        apiKey: env('PAGESPEED_API_KEY', ''),
      },
      gsc: {
        enabled: envBool('GOOGLE_GSC_ENABLED', false),
        clientId: env('GSC_CLIENT_ID', ''),
        clientSecret: env('GSC_CLIENT_SECRET', ''),
        refreshToken: env('GSC_REFRESH_TOKEN', ''),
      },
      ga4: {
        enabled: envBool('GOOGLE_GA4_ENABLED', false),
        propertyId: env('GA4_PROPERTY_ID', ''),
        clientEmail: env('GA4_CLIENT_EMAIL', ''),
        privateKey: env('GA4_PRIVATE_KEY', ''),
      },
      indexing: {
        enabled: envBool('GOOGLE_INDEXING_ENABLED', false),
        serviceAccountKey: env('INDEXING_SERVICE_ACCOUNT_KEY', ''),
      },
      nlp: {
        enabled: envBool('GOOGLE_NLP_ENABLED', false),
        projectId: env('GCP_PROJECT_ID', ''),
        keyFile: env('GCP_KEY_FILE', ''),
      },
      trends: {
        enabled: envBool('GOOGLE_TRENDS_ENABLED', false),
      },
    },

    bing: {
      enabled: envBool('BING_ENABLED', false),
      apiKey: env('BING_API_KEY', ''),
      siteUrl: env('BING_SITE_URL', ''),
    },

    valueserp: {
      enabled: envBool('VALUESERP_ENABLED', false),
      apiKey: env('VALUESERP_API_KEY', ''),
    },

    whoisjson: {
      enabled: envBool('WHOISJSON_ENABLED', false),
      apiKey: env('WHOIS_API_KEY', ''),
    },

    notification: {
      email: {
        enabled: envBool('NOTIFICATION_EMAIL_ENABLED', false),
        smtpHost: env('NOTIFICATION_EMAIL_SMTP_HOST', 'smtp.gmail.com'),
        smtpPort: envInt('NOTIFICATION_EMAIL_SMTP_PORT', 587),
        smtpUser: env('NOTIFICATION_EMAIL_SMTP_USER', ''),
        smtpPassword: env('NOTIFICATION_EMAIL_SMTP_PASSWORD', ''),
        fromAddress: env('NOTIFICATION_EMAIL_FROM', 'noreply@craneseo.com'),
      },
      dingtalk: {
        enabled: envBool('NOTIFICATION_DINGTALK_ENABLED', false),
        webhookUrl: env('NOTIFICATION_DINGTALK_WEBHOOK_URL', ''),
        secret: env('NOTIFICATION_DINGTALK_SECRET', ''),
      },
      feishu: {
        enabled: envBool('NOTIFICATION_FEISHU_ENABLED', false),
        webhookUrl: env('NOTIFICATION_FEISHU_WEBHOOK_URL', ''),
        secret: env('NOTIFICATION_FEISHU_SECRET', ''),
      },
      slack: {
        enabled: envBool('NOTIFICATION_SLACK_ENABLED', false),
        webhookUrl: env('NOTIFICATION_SLACK_WEBHOOK_URL', ''),
      },
      webhook: {
        enabled: envBool('NOTIFICATION_WEBHOOK_ENABLED', false),
        url: env('NOTIFICATION_WEBHOOK_URL', ''),
        secret: env('NOTIFICATION_WEBHOOK_SECRET', ''),
      },
    },

    monitoring: {
      uptimeCheckInterval: envInt('MONITORING_UPTIME_CHECK_INTERVAL', 300),
      alertThresholds: {
        cpuPercent: parseFloat(env('MONITORING_ALERT_CPU_PERCENT', '90')),
        memoryPercent: parseFloat(env('MONITORING_ALERT_MEMORY_PERCENT', '90')),
        diskPercent: parseFloat(env('MONITORING_ALERT_DISK_PERCENT', '85')),
        responseTimeMs: envInt('MONITORING_ALERT_RESPONSE_TIME_MS', 5000),
        errorRate: parseFloat(env('MONITORING_ALERT_ERROR_RATE', '5')),
      },
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

    billing: {
      dataforseoCostPerCall: parseFloat(env('BILLING_DATAFORSEO_COST_PER_CALL', '0.05')),
      openaiCostPerToken: parseFloat(env('BILLING_OPENAI_COST_PER_TOKEN', '0.00000015')),
      valueserpCostPerCall: parseFloat(env('BILLING_VALUESERP_COST_PER_CALL', '0.005')),
    },
  };
}

export const config: Config = loadConfig();
export default config;