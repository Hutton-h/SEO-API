// ---------------------------------------------------------------------------
// Google PageSpeed Insights API Service
// Uses axios to call https://www.googleapis.com/pagespeedonline/v5/runPagespeed
// ---------------------------------------------------------------------------

import axios, { type AxiosInstance } from 'axios';
import config from '../config.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CrUXData {
  first_contentful_paint?: {
    percentile: number;
    fast: number;
    average: number;
    slow: number;
  };
  largest_contentful_paint?: {
    percentile: number;
    fast: number;
    average: number;
    slow: number;
  };
  cumulative_layout_shift?: {
    percentile: number;
    fast: number;
    average: number;
    slow: number;
  };
  interaction_to_next_paint?: {
    percentile: number;
    fast: number;
    average: number;
    slow: number;
  };
  time_to_first_byte?: {
    percentile: number;
    fast: number;
    average: number;
    slow: number;
  };
}

export interface PageSpeedScore {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
}

export interface PageSpeedResult {
  url: string;
  strategy: string;
  scores: PageSpeedScore;
  crux: CrUXData;
  labData?: {
    fcp: number;
    lcp: number;
    tbt: number;
    cls: number;
    si: number;
  };
  opportunities: Array<{
    title: string;
    description: string;
    savings: number;
  }>;
}

export interface PageSpeedBatchResult {
  results: PageSpeedResult[];
  errors: Array<{ url: string; error: string }>;
}

export interface PageSpeedServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ---------------------------------------------------------------------------
// Rate Limiter
// ---------------------------------------------------------------------------

class RateLimiter {
  private lastRequestTime = 0;
  private minInterval: number;

  constructor(requestsPerSecond: number) {
    this.minInterval = 1000 / requestsPerSecond;
  }

  async wait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minInterval) {
      await new Promise((resolve) => setTimeout(resolve, this.minInterval - elapsed));
    }
    this.lastRequestTime = Date.now();
  }
}

const rateLimiter = new RateLimiter(2); // 2 requests per second

// ---------------------------------------------------------------------------
// Axios client
// ---------------------------------------------------------------------------

const client: AxiosInstance = axios.create({
  baseURL: 'https://www.googleapis.com/pagespeedonline/v5',
  timeout: 30000,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractCrUXData(raw: Record<string, unknown>): CrUXData {
  const crux: CrUXData = {};
  const loadingExperience = raw as {
    metrics?: Record<string, { percentile?: number; distributions?: Array<{ min: number; max: number; proportion: number }> }>;
  };

  if (!loadingExperience.metrics) return crux;

  const getDistribution = (metric: string) => {
    const m = loadingExperience.metrics?.[metric];
    if (!m?.distributions) return undefined;
    return {
      percentile: m.percentile ?? 0,
      fast: m.distributions[0]?.proportion ?? 0,
      average: m.distributions[1]?.proportion ?? 0,
      slow: m.distributions[2]?.proportion ?? 0,
    };
  };

  const fcp = getDistribution('FIRST_CONTENTFUL_PAINT_MS');
  if (fcp) crux.first_contentful_paint = fcp;

  const lcp = getDistribution('LARGEST_CONTENTFUL_PAINT_MS');
  if (lcp) crux.largest_contentful_paint = lcp;

  const cls = getDistribution('CUMULATIVE_LAYOUT_SHIFT_SCORE');
  if (cls) crux.cumulative_layout_shift = cls;

  const inp = getDistribution('INTERACTION_TO_NEXT_PAINT');
  if (inp) crux.interaction_to_next_paint = inp;

  const ttfb = getDistribution('EXPERIMENTAL_TIME_TO_FIRST_BYTE');
  if (ttfb) crux.time_to_first_byte = ttfb;

  return crux;
}

function extractLabData(raw: Record<string, unknown>): PageSpeedResult['labData'] | undefined {
  const audits = (raw.audits ?? {}) as Record<string, { numericValue?: number }>;
  return {
    fcp: audits['first-contentful-paint']?.numericValue ?? 0,
    lcp: audits['largest-contentful-paint']?.numericValue ?? 0,
    tbt: audits['total-blocking-time']?.numericValue ?? 0,
    cls: audits['cumulative-layout-shift']?.numericValue ?? 0,
    si: audits['speed-index']?.numericValue ?? 0,
  };
}

// ---------------------------------------------------------------------------
// API Methods
// ---------------------------------------------------------------------------

/**
 * 分析单个 URL 的 PageSpeed 性能
 */
export async function analyze(
  url: string,
  strategy: 'mobile' | 'desktop' = 'mobile',
): Promise<PageSpeedServiceResult<PageSpeedResult>> {
  try {
    await rateLimiter.wait();

    const response = await client.get('/runPagespeed', {
      params: {
        url,
        strategy,
        key: config.pagespeed.apiKey,
        category: ['performance', 'accessibility', 'best-practices', 'seo'],
      },
    });

    const data = response.data as {
      lighthouseResult?: {
        categories?: Record<string, { score?: number }>;
        audits?: Record<string, unknown>;
      };
      loadingExperience?: Record<string, unknown>;
    };

    const categories = data.lighthouseResult?.categories ?? {};

    const scores: PageSpeedScore = {
      performance: Math.round((categories.performance?.score ?? 0) * 100),
      accessibility: Math.round((categories.accessibility?.score ?? 0) * 100),
      bestPractices: Math.round((categories['best-practices']?.score ?? 0) * 100),
      seo: Math.round((categories.seo?.score ?? 0) * 100),
    };

    const crux = extractCrUXData(data.loadingExperience ?? {});
    const labData = extractLabData(data.lighthouseResult?.audits ?? {});

    const opportunities: PageSpeedResult['opportunities'] = [];
    // Extract opportunities from audits if available
    const auditData = (data.lighthouseResult?.audits ?? {}) as Record<string, { title?: string; description?: string; numericValue?: number; details?: { overallSavingsMs?: number } }>;
    for (const [key, audit] of Object.entries(auditData)) {
      if (typeof audit !== 'object' || audit === null) continue;
      if (audit.numericValue !== undefined && audit.numericValue > 0 && audit.title) {
        opportunities.push({
          title: audit.title,
          description: audit.description ?? '',
          savings: audit.details?.overallSavingsMs ?? audit.numericValue,
        });
      }
    }

    return {
      success: true,
      data: {
        url,
        strategy,
        scores,
        crux,
        labData,
        opportunities,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'PAGESPEED_ANALYZE_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err,
      },
    };
  }
}

/**
 * 批量分析多个 URL
 */
export async function batchAnalyze(
  urls: string[],
  strategy: 'mobile' | 'desktop' = 'mobile',
): Promise<PageSpeedServiceResult<PageSpeedBatchResult>> {
  const results: PageSpeedResult[] = [];
  const errors: Array<{ url: string; error: string }> = [];

  for (const url of urls) {
    const result = await analyze(url, strategy);
    if (result.success && result.data) {
      results.push(result.data);
    } else {
      errors.push({
        url,
        error: result.error?.message ?? 'Unknown error',
      });
    }
  }

  return {
    success: true,
    data: { results, errors },
  };
}

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export const pagespeed = {
  analyze,
  batchAnalyze,
};

export default pagespeed;