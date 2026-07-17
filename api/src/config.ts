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

function envFloat(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  const parsed = parseFloat(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number, got: ${value}`);
  }
  return parsed;
}

// 从 DATABASE_URL 解析连接参数，作为独立 env 变量的回退
function parseDatabaseUrl(): { host: string; port: number; user: string; password: string; database: string } {
  const url = process.env['DATABASE_URL'];
  if (!url) return { host: '', port: 0, user: '', password: '', database: '' };
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: parseInt(u.port, 10) || 5432,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ''),
    };
  } catch {
    return { host: '', port: 0, user: '', password: '', database: '' };
  }
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
    baseUrl: string;
    model: string;
  };
  gsc: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
  };
  pagespeed: {
    apiKey: string;
  };
  ga4: {
    propertyId: string;
    clientEmail: string;
    privateKey: string;
  };
  indexing: {
    serviceAccountKey: string;
  };
  nlp: {
    projectId: string;
    keyFile: string;
  };
  bing: {
    apiKey: string;
    siteUrl: string;
  };
  trends: {
    // No API key required, uses unofficial endpoint
  };
  whois: {
    apiKey: string;
  };
  valueserp: {
    apiKey: string;
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
  monitoring: {
    uptimeCheckInterval: number;
    alertThresholds: {
      cpuPercent: number;
      memoryPercent: number;
      diskPercent: number;
      responseTimeMs: number;
      errorRate: number;
    };
  };
  notification: {
    email: {
      enabled: boolean;
      smtpHost: string;
      smtpPort: number;
      smtpUser: string;
      smtpPassword: string;
      fromAddress: string;
    };
    dingtalk: {
      enabled: boolean;
      webhookUrl: string;
      secret: string;
    };
    feishu: {
      enabled: boolean;
      webhookUrl: string;
      secret: string;
    };
    slack: {
      enabled: boolean;
      webhookUrl: string;
    };
    webhook: {
      enabled: boolean;
      url: string;
      secret: string;
    };
  };
  billing: {
    dataforseoCostPerCall: number;
    openaiCostPerToken: number;
    valueserpCostPerCall: number;
  };
}

function loadConfig(): Config {
  const dbUrl = parseDatabaseUrl();
  return {
    port: envInt('API_PORT', 8080),
    host: env('API_HOST', '0.0.0.0'),
    nodeEnv: env('NODE_ENV', 'development'),

    database: {
      host: env('DB_HOST', dbUrl.host || 'localhost'),
      port: envInt('DB_PORT', dbUrl.port || 5432),
      user: env('DB_USER', dbUrl.user || 'postgres'),
      password: env('DB_PASSWORD', dbUrl.password || 'postgres'),
      database: env('DB_NAME', dbUrl.database || 'crane_seo'),
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
      baseUrl: env('OPENAI_BASE_URL', ''),
      model: env('OPENAI_MODEL', 'gpt-4o-mini'),
    },

    // Google Search Console
    gsc: {
      clientId: env('GSC_CLIENT_ID', ''),
      clientSecret: env('GSC_CLIENT_SECRET', ''),
      refreshToken: env('GSC_REFRESH_TOKEN', ''),
    },

    // Google PageSpeed Insights
    pagespeed: {
      apiKey: env('PAGESPEED_API_KEY', ''),
    },

    // Google Analytics 4
    ga4: {
      propertyId: env('GA4_PROPERTY_ID', ''),
      clientEmail: env('GA4_CLIENT_EMAIL', ''),
      privateKey: env('GA4_PRIVATE_KEY', ''),
    },

    // Google Indexing API
    indexing: {
      serviceAccountKey: env('INDEXING_SERVICE_ACCOUNT_KEY', ''),
    },

    // Google Cloud Natural Language API
    nlp: {
      projectId: env('GCP_PROJECT_ID', ''),
      keyFile: env('GCP_KEY_FILE', ''),
    },

    // Bing Webmaster Tools
    bing: {
      apiKey: env('BING_API_KEY', ''),
      siteUrl: env('BING_SITE_URL', ''),
    },

    // Google Trends (no API key required)
    trends: {},

    // WhoisJSON API
    whois: {
      apiKey: env('WHOIS_API_KEY', ''),
    },

    // ValueSERP API
    valueserp: {
      apiKey: env('VALUESERP_API_KEY', ''),
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

    // Monitoring
    monitoring: {
      uptimeCheckInterval: envInt('MONITORING_UPTIME_CHECK_INTERVAL', 300),
      alertThresholds: {
        cpuPercent: envFloat('MONITORING_ALERT_CPU_PERCENT', 90),
        memoryPercent: envFloat('MONITORING_ALERT_MEMORY_PERCENT', 90),
        diskPercent: envFloat('MONITORING_ALERT_DISK_PERCENT', 85),
        responseTimeMs: envInt('MONITORING_ALERT_RESPONSE_TIME_MS', 5000),
        errorRate: envFloat('MONITORING_ALERT_ERROR_RATE', 5),
      },
    },

    // Notification
    notification: {
      email: {
        enabled: env('NOTIFICATION_EMAIL_ENABLED', 'false') === 'true',
        smtpHost: env('NOTIFICATION_EMAIL_SMTP_HOST', 'smtp.gmail.com'),
        smtpPort: envInt('NOTIFICATION_EMAIL_SMTP_PORT', 587),
        smtpUser: env('NOTIFICATION_EMAIL_SMTP_USER', ''),
        smtpPassword: env('NOTIFICATION_EMAIL_SMTP_PASSWORD', ''),
        fromAddress: env('NOTIFICATION_EMAIL_FROM', 'noreply@craneseo.com'),
      },
      dingtalk: {
        enabled: env('NOTIFICATION_DINGTALK_ENABLED', 'false') === 'true',
        webhookUrl: env('NOTIFICATION_DINGTALK_WEBHOOK_URL', ''),
        secret: env('NOTIFICATION_DINGTALK_SECRET', ''),
      },
      feishu: {
        enabled: env('NOTIFICATION_FEISHU_ENABLED', 'false') === 'true',
        webhookUrl: env('NOTIFICATION_FEISHU_WEBHOOK_URL', ''),
        secret: env('NOTIFICATION_FEISHU_SECRET', ''),
      },
      slack: {
        enabled: env('NOTIFICATION_SLACK_ENABLED', 'false') === 'true',
        webhookUrl: env('NOTIFICATION_SLACK_WEBHOOK_URL', ''),
      },
      webhook: {
        enabled: env('NOTIFICATION_WEBHOOK_ENABLED', 'false') === 'true',
        url: env('NOTIFICATION_WEBHOOK_URL', ''),
        secret: env('NOTIFICATION_WEBHOOK_SECRET', ''),
      },
    },

    // Billing
    billing: {
      dataforseoCostPerCall: envFloat('BILLING_DATAFORSEO_COST_PER_CALL', 0.05),
      openaiCostPerToken: envFloat('BILLING_OPENAI_COST_PER_TOKEN', 0.00000015),
      valueserpCostPerCall: envFloat('BILLING_VALUESERP_COST_PER_CALL', 0.005),
    },
  };
}

export const config: Config = loadConfig();

export default config;