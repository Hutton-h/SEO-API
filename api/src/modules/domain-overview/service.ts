import { db } from '../../shared/database.js';
import {
  getRankings,
  getDomainMetrics,
  type RankingItem,
  type DomainMetrics,
} from '../../services/dataforseo.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DomainOverview {
  domain: string;
  totalKeywords: number;
  estimatedTraffic: number;
  trafficValue: number;
  rankingDistribution: {
    top3: number;
    top10: number;
    top50: number;
    top100: number;
  };
  topKeywords: Array<{
    keyword: string;
    position: number;
    searchVolume: number;
    url: string;
  }>;
  domainMetrics?: {
    ssl: boolean;
    responsive: boolean;
    technologies: string[];
  };
  analyzedAt: string;
}

export interface DomainOverviewRecord {
  id: string;
  user_id: string;
  domain: string;
  total_keywords: number;
  estimated_traffic: number;
  traffic_value: number;
  ranking_distribution: Record<string, number>;
  top_keywords: unknown;
  domain_metrics: unknown;
  analyzed_at: string;
  created_at: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_LOCATION_CODE = 2840;
const DEFAULT_LANGUAGE_CODE = 'en';

function calculateEstimatedTraffic(keywords: RankingItem[]): number {
  const ctrByPosition: Record<number, number> = {
    1: 0.32, 2: 0.18, 3: 0.12, 4: 0.09, 5: 0.07,
    6: 0.05, 7: 0.04, 8: 0.03, 9: 0.02, 10: 0.01,
  };
  return keywords.reduce((sum, kw) => {
    const ctr = kw.position <= 10 ? (ctrByPosition[Math.floor(kw.position)] ?? 0) : 0;
    return sum + (kw.search_volume ?? 0) * ctr;
  }, 0);
}

function calculateTrafficValue(keywords: RankingItem[], estimatedTraffic: number): number {
  if (keywords.length === 0) return 0;
  const avgCpc = keywords.reduce((sum, kw) => sum + (kw.cpc ?? 0), 0) / keywords.length;
  return Math.round(estimatedTraffic * avgCpc * 100) / 100;
}

function calculateRankingDistribution(keywords: RankingItem[]): DomainOverview['rankingDistribution'] {
  return {
    top3: keywords.filter((k) => k.position <= 3).length,
    top10: keywords.filter((k) => k.position <= 10).length,
    top50: keywords.filter((k) => k.position <= 50).length,
    top100: keywords.filter((k) => k.position <= 100).length,
  };
}

function extractTopKeywords(keywords: RankingItem[], limit: number = 20): DomainOverview['topKeywords'] {
  return [...keywords]
    .sort((a, b) => a.position - b.position)
    .slice(0, limit)
    .map((kw) => ({
      keyword: kw.keyword,
      position: kw.position,
      searchVolume: kw.search_volume ?? 0,
      url: kw.url,
    }));
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function getDomainOverview(
  domain: string,
  locationCode: number = DEFAULT_LOCATION_CODE,
): Promise<DomainOverview> {
  const now = new Date().toISOString();

  const [rankingsResult, metricsResult] = await Promise.all([
    getRankings(domain, locationCode, DEFAULT_LANGUAGE_CODE),
    getDomainMetrics(domain),
  ]);

  const keywords: RankingItem[] = (rankingsResult.success && rankingsResult.data)
    ? rankingsResult.data
    : [];

  const totalKeywords = keywords.length;
  const estimatedTraffic = calculateEstimatedTraffic(keywords);
  const trafficValue = calculateTrafficValue(keywords, estimatedTraffic);
  const rankingDistribution = calculateRankingDistribution(keywords);
  const topKeywords = extractTopKeywords(keywords);

  let domainMetrics: DomainOverview['domainMetrics'] | undefined;
  if (metricsResult.success && metricsResult.data) {
    const metrics = metricsResult.data as DomainMetrics & { technologies?: Record<string, string> };
    const techs = metrics.technologies ?? {};
    domainMetrics = {
      ssl: metrics.ssl_valid ?? false,
      responsive: metrics.responsive ?? false,
      technologies: Object.keys(techs),
    };
  }

  return {
    domain,
    totalKeywords,
    estimatedTraffic: Math.round(estimatedTraffic),
    trafficValue,
    rankingDistribution,
    topKeywords,
    domainMetrics,
    analyzedAt: now,
  };
}

export async function getOverviewHistory(
  params: { page?: number; pageSize?: number } = {},
): Promise<PaginatedResult<DomainOverviewRecord>> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const [{ count }] = await db('domain_overviews')
    .count<{ count: string }[]>();

  const total = parseInt(count, 10);

  const items = await db('domain_overviews')
    .orderBy('analyzed_at', 'desc')
    .limit(pageSize)
    .offset(offset)
    .select('*');

  return {
    items: items as DomainOverviewRecord[],
    total,
  };
}

export default {
  getDomainOverview,
  getOverviewHistory,
};