import { db } from '../../shared/database.js';
import dataforseo from '../../services/dataforseo.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SemAdRecord {
  id: string;
  project_id: string;
  competitor_domain: string;
  ad_title: string | null;
  ad_description: string | null;
  ad_url: string | null;
  keyword_targeted: string | null;
  position: number | null;
  last_seen: string | null;
  created_at: string;
}

export interface SemKeywordMetricRecord {
  id: string;
  project_id: string;
  keyword: string;
  search_volume: number;
  cpc: number;
  competition: number;
  competition_index: number;
  monthly_searches: unknown;
  created_at: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function getKeywordMetrics(
  projectId: string,
  options: { page?: number; pageSize?: number } = {},
): Promise<PaginatedResult<SemKeywordMetricRecord>> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;

  const query = db('sem_keyword_metrics')
    .where('project_id', projectId)
    .orderBy('search_volume', 'desc');

  const [{ count }] = await query.clone().count<{ count: string }[]>();
  const total = parseInt(count, 10);

  const items = await query
    .offset((page - 1) * pageSize)
    .limit(pageSize);

  return { items: items as SemKeywordMetricRecord[], total };
}

export async function getCompetitorAds(
  projectId: string,
  options: { page?: number; pageSize?: number; competitorDomain?: string } = {},
): Promise<PaginatedResult<SemAdRecord>> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;

  let query = db('sem_ads')
    .where('project_id', projectId)
    .orderBy('last_seen', 'desc');

  if (options.competitorDomain) {
    query = query.where('competitor_domain', options.competitorDomain);
  }

  const [{ count }] = await query.clone().count<{ count: string }[]>();
  const total = parseInt(count, 10);

  const items = await query
    .offset((page - 1) * pageSize)
    .limit(pageSize);

  return { items: items as SemAdRecord[], total };
}

export async function getOpportunities(
  projectId: string,
): Promise<{
  highVolumeKeywords: SemKeywordMetricRecord[];
  competitorAds: SemAdRecord[];
  recommendations: Array<{ keyword: string; opportunity: string; estimatedCPC: number }>;
}> {
  const [highVolumeKeywords, competitorAds] = await Promise.all([
    db('sem_keyword_metrics')
      .where('project_id', projectId)
      .orderBy('search_volume', 'desc')
      .limit(20),
    db('sem_ads')
      .where('project_id', projectId)
      .orderBy('last_seen', 'desc')
      .limit(20),
  ]);

  // Generate recommendations
  const recommendations = (highVolumeKeywords as SemKeywordMetricRecord[]).slice(0, 10).map((kw) => ({
    keyword: kw.keyword,
    opportunity: `High search volume (${kw.search_volume}) with moderate competition - consider targeting with optimized ads`,
    estimatedCPC: kw.cpc,
  }));

  return {
    highVolumeKeywords: highVolumeKeywords as SemKeywordMetricRecord[],
    competitorAds: competitorAds as SemAdRecord[],
    recommendations,
  };
}

export async function fetchCompetitorAdsFromDataForSEO(
  domain: string,
  locationCode: number = 2840,
): Promise<unknown> {
  const result = await dataforseo.getCompetitorAds(domain, locationCode);
  return result;
}

export default {
  getKeywordMetrics,
  getCompetitorAds,
  getOpportunities,
  fetchCompetitorAdsFromDataForSEO,
};