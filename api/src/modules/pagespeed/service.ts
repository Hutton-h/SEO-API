// ---------------------------------------------------------------------------
// PageSpeed Module - Service
// ---------------------------------------------------------------------------

import { pagespeed as pagespeedService } from '../../services/pagespeed.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PageSpeedResult {
  url: string;
  strategy: string;
  scores: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  metrics: {
    lcp: { value: number; displayValue: string };
    fid: { value: number; displayValue: string };
    cls: { value: number; displayValue: string };
    tti: { value: number; displayValue: string };
    speedIndex: { value: number; displayValue: string };
  };
  opportunities: Array<{ title: string; description: string; savings: string }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMillis(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function formatSavings(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)} s`;
  return `${(ms / 60000).toFixed(1)} min`;
}

// ---------------------------------------------------------------------------
// Service Methods
// ---------------------------------------------------------------------------

export async function analyzePageSpeed(
  url: string,
  strategy: 'mobile' | 'desktop' = 'mobile',
): Promise<PageSpeedResult> {
  const result = await pagespeedService.analyze(url, strategy);

  if (!result.success || !result.data) {
    throw new Error(
      result.error?.message ?? 'Failed to analyze page speed',
    );
  }

  const { data } = result;

  const metrics = {
    lcp: {
      value: data.labData?.lcp ?? 0,
      displayValue: formatMillis(data.labData?.lcp ?? 0),
    },
    fid: {
      value: data.labData?.tbt ?? 0,
      displayValue: formatMillis(data.labData?.tbt ?? 0),
    },
    cls: {
      value: data.labData?.cls ?? 0,
      displayValue: (data.labData?.cls ?? 0).toFixed(3),
    },
    tti: {
      value: data.labData?.tbt ?? 0,
      displayValue: formatMillis(data.labData?.tbt ?? 0),
    },
    speedIndex: {
      value: data.labData?.si ?? 0,
      displayValue: formatMillis(data.labData?.si ?? 0),
    },
  };

  const opportunities = data.opportunities.map((opp) => ({
    title: opp.title,
    description: opp.description,
    savings: formatSavings(opp.savings),
  }));

  return {
    url: data.url,
    strategy: data.strategy,
    scores: {
      performance: data.scores.performance,
      accessibility: data.scores.accessibility,
      bestPractices: data.scores.bestPractices,
      seo: data.scores.seo,
    },
    metrics,
    opportunities,
  };
}

export async function batchAnalyze(
  urls: string[],
  strategy: 'mobile' | 'desktop' = 'mobile',
): Promise<PageSpeedResult[]> {
  const results: PageSpeedResult[] = [];

  for (const url of urls) {
    try {
      const result = await analyzePageSpeed(url, strategy);
      results.push(result);
    } catch (err) {
      // Push a minimal error result so the batch does not fail entirely
      results.push({
        url,
        strategy,
        scores: {
          performance: 0,
          accessibility: 0,
          bestPractices: 0,
          seo: 0,
        },
        metrics: {
          lcp: { value: 0, displayValue: 'N/A' },
          fid: { value: 0, displayValue: 'N/A' },
          cls: { value: 0, displayValue: 'N/A' },
          tti: { value: 0, displayValue: 'N/A' },
          speedIndex: { value: 0, displayValue: 'N/A' },
        },
        opportunities: [],
      });
    }
  }

  return results;
}

export default {
  analyzePageSpeed,
  batchAnalyze,
};