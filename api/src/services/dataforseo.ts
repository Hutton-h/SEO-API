import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import config from '../config.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DataForSEORequest {
  task_id?: string;
  url?: string;
}

export interface DataForSEOResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface SearchVolumeItem {
  keyword: string;
  location_code: number;
  language_code: string;
  search_volume: number;
  cpc: number;
  competition: number;
  competition_index: number;
  monthly_searches: Array<{
    year: number;
    month: number;
    search_volume: number;
  }>;
}

export interface KeywordIdeaItem {
  keyword: string;
  location_code: number;
  language_code: string;
  search_volume: number;
  cpc: number;
  competition: number;
  competition_index: number;
  keyword_difficulty: number;
  search_intent: string;
  relevance_score: number;
}

export interface SERPItem {
  type: string;
  rank_group: number;
  rank_absolute: number;
  domain: string;
  title: string;
  description: string;
  url: string;
  breadcrumb?: string;
  highlighted?: string[];
  extra?: Record<string, unknown>;
}

export interface SERPResult {
  keyword: string;
  location_code: number;
  language_code: string;
  check_url?: string;
  items_count: number;
  items: SERPItem[];
  se_results_count?: number;
}

export interface RankingItem {
  keyword: string;
  position: number;
  url: string;
  search_volume: number;
  cpc: number;
  competition: number;
  monthly_searches?: unknown[];
}

export interface BacklinkSummary {
  domain: string;
  rank: number;
  backlinks: number;
  referring_domains: number;
  referring_pages: number;
  referring_ips: number;
  referring_subnets: number;
}

export interface BacklinkItem {
  type: string;
  domain_from: string;
  url_from: string;
  url_to: string;
  domain_to: string;
  page_from_rank?: number;
  page_from_external_links?: number;
  backlink_spam_score?: number;
  first_seen?: string;
  lost_date?: string | null;
  attributes?: string[];
  dofollow?: boolean;
  is_new?: boolean;
  is_lost?: boolean;
}

export interface CompetitorAdsItem {
  type: string;
  rank_group: number;
  rank_absolute: number;
  domain: string;
  title: string;
  description: string;
  url: string;
  breadcrumb?: string;
}

export interface KeywordMetricsItem {
  keyword: string;
  search_volume: number;
  cpc: number;
  competition: number;
  competition_index: number;
  keyword_difficulty: number;
  search_intent: string;
}

export interface DomainMetrics {
  domain: string;
  cms?: string;
  technologies?: Record<string, string>;
  ssl_valid?: boolean;
  responsive?: boolean;
  meta?: Record<string, string>;
  speed_score?: number;
}

export interface BulkKeywordDifficultyItem {
  keyword: string;
  keyword_difficulty: number;
  competition: number;
  competition_index: number;
}

export interface LocalPackRankingItem {
  keyword: string;
  rank_group: number;
  rank_absolute: number;
  title: string;
  description: string;
  url: string;
  rating?: number;
  reviews_count?: number;
  address?: string;
  phone?: string;
}

export interface LocationItem {
  location_code: number;
  location_name: string;
  language_code: string;
  language_name: string;
  country_iso_code: string;
}

export interface TaskReadyResult {
  tasks_ready?: Array<{
    id: string;
    endpoint: string;
    status: string;
  }>;
}

// ---------------------------------------------------------------------------
// New Enhanced Types
// ---------------------------------------------------------------------------

export interface SerpFeatureItem {
  type: string;
  title: string;
  description?: string;
  url?: string;
  domain?: string;
  rating?: number;
  reviews_count?: number;
  items?: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
}

export interface SerpFeaturesResult {
  keyword: string;
  location_code: number;
  language_code: string;
  features: {
    featured_snippet: SerpFeatureItem | null;
    knowledge_graph: SerpFeatureItem | null;
    people_also_ask: SerpFeatureItem[];
    video_carousel: SerpFeatureItem[];
    local_pack: SerpFeatureItem[];
  };
  total_results: number;
}

export interface ContentAnalysisItem {
  url: string;
  duplicate_content: {
    detected: boolean;
    duplicate_pages: string[];
    similarity_score: number;
  };
  readability: {
    score: number;
    level: string;
    flesch_reading_ease: number;
    avg_sentence_length: number;
  };
  internal_linking: {
    total_internal_links: number;
    broken_internal_links: number;
    orphan_pages: number;
    link_depth: number;
  };
  word_count: number;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
}

export interface BusinessListingItem {
  title: string;
  description: string;
  address: string;
  phone: string;
  rating: number;
  reviews_count: number;
  url: string;
  categories: string[];
  place_id: string;
  cid: string;
  latitude: number;
  longitude: number;
}

export interface DomainIntersectionResult {
  target_domain: string;
  competitors: string[];
  shared_keywords: Array<{
    keyword: string;
    target_position: number;
    competitor_positions: Record<string, number>;
    search_volume: number;
    competition: number;
  }>;
  total_shared: number;
}

export interface ContentGapItem {
  keyword: string;
  competitor_rankings: Record<string, number>;
  search_volume: number;
  competition: number;
  opportunity_score: number;
}

export interface ContentGapResult {
  domain: string;
  competitors: string[];
  gaps: ContentGapItem[];
  total_gaps: number;
}

// ---------------------------------------------------------------------------
// Call tracking
// ---------------------------------------------------------------------------

interface CallStats {
  totalCalls: number;
  totalCost: number;
  callsByEndpoint: Record<string, number>;
}

const callStats: CallStats = {
  totalCalls: 0,
  totalCost: 0,
  callsByEndpoint: {},
};

const COST_PER_CALL = config.billing.dataforseoCostPerCall;

function trackCall(endpoint: string): void {
  callStats.totalCalls++;
  callStats.totalCost += COST_PER_CALL;
  callStats.callsByEndpoint[endpoint] = (callStats.callsByEndpoint[endpoint] ?? 0) + 1;
}

export function getCallStats(): CallStats {
  return { ...callStats, callsByEndpoint: { ...callStats.callsByEndpoint } };
}

export function getEstimatedCost(): number {
  return callStats.totalCost;
}

export function resetCallStats(): void {
  callStats.totalCalls = 0;
  callStats.totalCost = 0;
  callStats.callsByEndpoint = {};
}

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

const credentials = Buffer.from(
  `${config.dataforseo.email}:${config.dataforseo.apiKey}`,
).toString('base64');

const client: AxiosInstance = axios.create({
  baseURL: config.dataforseo.baseUrl,
  timeout: 60000,
  headers: {
    Authorization: `Basic ${credentials}`,
    'Content-Type': 'application/json',
  },
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function post<T>(endpoint: string, data: unknown[]): Promise<DataForSEOResult<T>> {
  trackCall(endpoint);
  try {
    const response: AxiosResponse = await client.post(endpoint, data);

    const responseData = response.data as {
      status_code?: number;
      status_message?: string;
      tasks?: Array<{
        id?: string;
        result?: unknown[];
      }>;
    };

    if (responseData.status_code === 20000) {
      return {
        success: true,
        data: (responseData.tasks?.[0]?.result?.[0] ?? null) as T,
      };
    }

    if (responseData.status_code === 20100) {
      return {
        success: true,
        data: {
          task_id: responseData.tasks?.[0]?.id,
          status: 'pending',
        } as unknown as T,
      };
    }

    return {
      success: false,
      error: {
        code: `DFSEO_${responseData.status_code ?? 'UNKNOWN'}`,
        message: responseData.status_message ?? 'Unknown DataForSEO error',
        details: responseData,
      },
    };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      return {
        success: false,
        error: {
          code: 'DFSEO_REQUEST_FAILED',
          message: err.message,
          details: {
            status: err.response?.status,
            statusText: err.response?.statusText,
            data: err.response?.data,
          },
        },
      };
    }
    return {
      success: false,
      error: {
        code: 'DFSEO_UNKNOWN_ERROR',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
    };
  }
}

async function get<T>(endpoint: string): Promise<DataForSEOResult<T>> {
  trackCall(endpoint);
  try {
    const response: AxiosResponse = await client.get(endpoint);
    return {
      success: true,
      data: response.data as T,
    };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      return {
        success: false,
        error: {
          code: 'DFSEO_REQUEST_FAILED',
          message: err.message,
          details: {
            status: err.response?.status,
            statusText: err.response?.statusText,
            data: err.response?.data,
          },
        },
      };
    }
    return {
      success: false,
      error: {
        code: 'DFSEO_UNKNOWN_ERROR',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Search Volume
// ---------------------------------------------------------------------------

export async function getKeywordSearchVolume(
  keywords: string[],
  locationCode: number,
  languageCode: string,
): Promise<DataForSEOResult<SearchVolumeItem[]>> {
  const payload = keywords.map((kw) => ({
    keyword: kw,
    location_code: locationCode,
    language_code: languageCode,
  }));

  return post<SearchVolumeItem[]>('/v3/keywords_data/google/search_volume/live', payload);
}

// ---------------------------------------------------------------------------
// Keyword Ideas
// ---------------------------------------------------------------------------

export async function getKeywordIdeas(
  keyword: string,
  locationCode: number,
  languageCode: string,
): Promise<DataForSEOResult<KeywordIdeaItem[]>> {
  const payload = [
    {
      keyword,
      location_code: locationCode,
      language_code: languageCode,
      limit: 100,
    },
  ];

  return post<KeywordIdeaItem[]>('/v3/keywords_data/google/keywords_for_keywords/live', payload);
}

// ---------------------------------------------------------------------------
// SERP (Search Engine Results Page)
// ---------------------------------------------------------------------------

export async function getSERP(
  keyword: string,
  locationCode: number,
  languageCode: string,
  depth: number = 100,
): Promise<DataForSEOResult<SERPResult>> {
  const payload = [
    {
      keyword,
      location_code: locationCode,
      language_code: languageCode,
      depth,
      os: 'windows',
      se_domain: 'google.com',
    },
  ];

  return post<SERPResult>('/v3/serp/google/organic/live/advanced', payload);
}

// ---------------------------------------------------------------------------
// Rankings
// ---------------------------------------------------------------------------

export async function getRankings(
  domain: string,
  locationCode: number,
  languageCode: string,
): Promise<DataForSEOResult<RankingItem[]>> {
  const payload = [
    {
      target: domain,
      location_code: locationCode,
      language_code: languageCode,
    },
  ];

  return post<RankingItem[]>('/v3/serp/google/organic/live/advanced', payload);
}

// ---------------------------------------------------------------------------
// Backlinks
// ---------------------------------------------------------------------------

export async function getBacklinks(
  domain: string,
): Promise<DataForSEOResult<BacklinkSummary>> {
  const payload = [
    {
      target: domain,
      include_subdomains: true,
      internal_list_limit: 10,
    },
  ];

  return post<BacklinkSummary>('/v3/backlinks/summary/live', payload);
}

export async function getBacklinksList(
  domain: string,
  limit: number = 100,
  offset: number = 0,
): Promise<DataForSEOResult<BacklinkItem[]>> {
  const payload = [
    {
      target: domain,
      limit,
      offset,
      include_subdomains: true,
      mode: 'as_is',
      filters: [['dofollow', '=', true]],
      order_by: ['page_from_rank,desc'],
    },
  ];

  return post<BacklinkItem[]>('/v3/backlinks/backlinks/live', payload);
}

// ---------------------------------------------------------------------------
// Competitor Ads
// ---------------------------------------------------------------------------

export async function getCompetitorAds(
  domain: string,
  locationCode: number,
): Promise<DataForSEOResult<CompetitorAdsItem[]>> {
  const payload = [
    {
      keyword: domain,
      location_code: locationCode,
      language_code: 'en',
      depth: 100,
    },
  ];

  return post<CompetitorAdsItem[]>('/v3/serp/google/ads_search/live', payload);
}

// ---------------------------------------------------------------------------
// Keyword Metrics (batch)
// ---------------------------------------------------------------------------

export async function getKeywordMetrics(
  keywords: string[],
  locationCode: number,
  languageCode: string,
): Promise<DataForSEOResult<KeywordMetricsItem[]>> {
  const payload = keywords.map((kw) => ({
    keyword: kw,
    location_code: locationCode,
    language_code: languageCode,
  }));

  return post<KeywordMetricsItem[]>('/v3/keywords_data/google/search_volume/live', payload);
}

// ---------------------------------------------------------------------------
// Domain Metrics / Technologies
// ---------------------------------------------------------------------------

export async function getDomainMetrics(
  domain: string,
): Promise<DataForSEOResult<DomainMetrics>> {
  const payload = [
    {
      target: domain,
    },
  ];

  return post<DomainMetrics>(
    '/v3/domain_analytics/technologies/domain_analytics/live',
    payload,
  );
}

// ---------------------------------------------------------------------------
// Bulk Keyword Difficulty
// ---------------------------------------------------------------------------

export async function getBulkKeywordDifficulty(
  keywords: string[],
): Promise<DataForSEOResult<BulkKeywordDifficultyItem[]>> {
  const payload = keywords.map((kw) => ({
    keyword: kw,
    location_code: 2840, // United States
    language_code: 'en',
  }));

  return post<BulkKeywordDifficultyItem[]>(
    '/v3/keywords_data/google/search_volume/live',
    payload,
  );
}

// ---------------------------------------------------------------------------
// Local Pack Rankings
// ---------------------------------------------------------------------------

export async function getLocalPackRankings(
  keyword: string,
  locationCode: number,
  languageCode: string,
  localLocationCode: number,
): Promise<DataForSEOResult<LocalPackRankingItem[]>> {
  const payload = [
    {
      keyword,
      location_code: locationCode,
      language_code: languageCode,
      local_location_code: localLocationCode,
      depth: 20,
    },
  ];

  return post<LocalPackRankingItem[]>('/v3/serp/google/organic/live/advanced', payload);
}

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

export async function getAllAvailableLocations(): Promise<DataForSEOResult<LocationItem[]>> {
  return get<LocationItem[]>('/v3/serp/google/locations');
}

// ---------------------------------------------------------------------------
// Task Status
// ---------------------------------------------------------------------------

export async function getTasksReady(): Promise<DataForSEOResult<TaskReadyResult>> {
  return get<TaskReadyResult>('/v3/tasks_ready');
}

export async function getTaskResult(
  taskId: string,
): Promise<DataForSEOResult<unknown>> {
  return get<unknown>(`/v3/tasks_ready/${taskId}`);
}

// ---------------------------------------------------------------------------
// NEW: SERP Features
// ---------------------------------------------------------------------------

/**
 * 提取 SERP 特性（featured_snippet, knowledge_graph, people_also_ask,
 * video_carousel, local_pack）
 */
export async function getSerpFeatures(
  keyword: string,
  locationCode: number,
  languageCode: string,
): Promise<DataForSEOResult<SerpFeaturesResult>> {
  const payload = [
    {
      keyword,
      location_code: locationCode,
      language_code: languageCode,
      depth: 100,
      os: 'windows',
      se_domain: 'google.com',
    },
  ];

  const rawResult = await post<SERPResult>('/v3/serp/google/organic/live/advanced', payload);

  if (!rawResult.success || !rawResult.data) {
    return {
      success: false,
      error: rawResult.error ?? {
        code: 'DFSEO_SERP_FEATURES_FAILED',
        message: 'Failed to get SERP data',
      },
    };
  }

  const serpData = rawResult.data;
  const items = (serpData as unknown as { items?: Array<Record<string, unknown>> }).items ?? [];

  const features: SerpFeaturesResult['features'] = {
    featured_snippet: null,
    knowledge_graph: null,
    people_also_ask: [],
    video_carousel: [],
    local_pack: [],
  };

  for (const item of items) {
    const itemType = (item.type as string) ?? '';

    switch (itemType) {
      case 'featured_snippet':
        features.featured_snippet = {
          type: 'featured_snippet',
          title: (item.title as string) ?? '',
          description: (item.description as string) ?? '',
          url: (item.url as string) ?? '',
          domain: (item.domain as string) ?? '',
        };
        break;

      case 'knowledge_graph':
        features.knowledge_graph = {
          type: 'knowledge_graph',
          title: (item.title as string) ?? '',
          description: (item.description as string) ?? '',
          url: (item.url as string) ?? '',
        };
        break;

      case 'people_also_ask': {
        const paaItems = (item.items as Array<{ title?: string; url?: string; snippet?: string }>) ?? [];
        features.people_also_ask = paaItems.map((paa) => ({
          type: 'people_also_ask',
          title: paa.title ?? '',
          url: paa.url ?? '',
          snippet: paa.snippet ?? '',
        }));
        break;
      }

      case 'video':
        features.video_carousel.push({
          type: 'video',
          title: (item.title as string) ?? '',
          url: (item.url as string) ?? '',
          description: (item.description as string) ?? '',
        });
        break;

      case 'local_pack': {
        const localItems = (item.items as Array<{
          title?: string;
          description?: string;
          url?: string;
          rating?: { value?: number };
          reviews_count?: number;
        }>) ?? [];
        features.local_pack = localItems.map((local) => ({
          type: 'local_pack',
          title: local.title ?? '',
          description: local.description ?? '',
          url: local.url ?? '',
          rating: local.rating?.value,
          reviews_count: local.reviews_count,
        }));
        break;
      }
    }
  }

  return {
    success: true,
    data: {
      keyword,
      location_code: locationCode,
      language_code: languageCode,
      features,
      total_results: serpData.se_results_count ?? 0,
    },
  };
}

// ---------------------------------------------------------------------------
// NEW: Content Analysis
// ---------------------------------------------------------------------------

/**
 * 内容分析（重复内容检测/可读性/内链结构）
 */
export async function getContentAnalysis(
  url: string,
): Promise<DataForSEOResult<ContentAnalysisItem>> {
  const payload = [
    {
      target: url,
      max_crawl_pages: 10,
      load_resources: false,
      enable_javascript: false,
    },
  ];

  const rawResult = await post<Record<string, unknown>>(
    '/v3/on_page/page/live',
    payload,
  );

  if (!rawResult.success || !rawResult.data) {
    return {
      success: false,
      error: rawResult.error ?? {
        code: 'DFSEO_CONTENT_ANALYSIS_FAILED',
        message: 'Failed to get content analysis',
      },
    };
  }

  const data = rawResult.data;
  const pageData = (data as Record<string, unknown>) ?? {};
  const checks = (pageData.checks as Record<string, unknown>) ?? {};
  const meta = (pageData.meta as Record<string, unknown>) ?? {};

  const result: ContentAnalysisItem = {
    url,
    duplicate_content: {
      detected: (checks.duplicate_content as boolean) ?? false,
      duplicate_pages: (checks.duplicate_pages as string[]) ?? [],
      similarity_score: (checks.similarity_score as number) ?? 0,
    },
    readability: {
      score: (checks.readability_score as number) ?? 0,
      level: (checks.readability_level as string) ?? 'unknown',
      flesch_reading_ease: (checks.flesch_reading_ease as number) ?? 0,
      avg_sentence_length: (checks.avg_sentence_length as number) ?? 0,
    },
    internal_linking: {
      total_internal_links: (checks.total_internal_links as number) ?? 0,
      broken_internal_links: (checks.broken_internal_links as number) ?? 0,
      orphan_pages: (checks.orphan_pages as number) ?? 0,
      link_depth: (checks.link_depth as number) ?? 0,
    },
    word_count: ((meta.content as any)?.word_count as number) ?? 0,
    headings: {
      h1: ((meta.content as any)?.h1 as string[]) ?? [],
      h2: ((meta.content as any)?.h2 as string[]) ?? [],
      h3: ((meta.content as any)?.h3 as string[]) ?? [],
    },
  };

  return { success: true, data: result };
}

// ---------------------------------------------------------------------------
// NEW: Business Listings (Google Maps)
// ---------------------------------------------------------------------------

/**
 * 获取 Google Maps 商业列表
 */
export async function getBusinessListings(
  keyword: string,
  locationCode: number,
): Promise<DataForSEOResult<BusinessListingItem[]>> {
  const payload = [
    {
      keyword,
      location_code: locationCode,
      language_code: 'en',
      depth: 100,
      os: 'windows',
      se_domain: 'google.com',
    },
  ];

  const rawResult = await post<SERPResult>(
    '/v3/serp/google/maps/live/advanced',
    payload,
  );

  if (!rawResult.success || !rawResult.data) {
    return {
      success: false,
      error: rawResult.error ?? {
        code: 'DFSEO_BUSINESS_LISTINGS_FAILED',
        message: 'Failed to get business listings',
      },
    };
  }

  const serpData = rawResult.data;
  const items = (serpData as unknown as { items?: Array<Record<string, unknown>> }).items ?? [];

  const listings: BusinessListingItem[] = items.map((item) => ({
    title: (item.title as string) ?? '',
    description: (item.description as string) ?? '',
    address: (item.address as string) ?? '',
    phone: (item.phone as string) ?? '',
    rating: (item.rating as number) ?? 0,
    reviews_count: (item.reviews_count as number) ?? 0,
    url: (item.url as string) ?? '',
    categories: (item.categories as string[]) ?? [],
    place_id: (item.place_id as string) ?? '',
    cid: (item.cid as string) ?? '',
    latitude: (item.latitude as number) ?? 0,
    longitude: (item.longitude as number) ?? 0,
  }));

  return { success: true, data: listings };
}

// ---------------------------------------------------------------------------
// NEW: Domain Intersection
// ---------------------------------------------------------------------------

/**
 * 域名关键词交集分析
 */
export async function getDomainIntersection(
  targetDomain: string,
  competitors: string[],
): Promise<DataForSEOResult<DomainIntersectionResult>> {
  try {
    const allDomains = [targetDomain, ...competitors];
    const sharedKeywords: DomainIntersectionResult['shared_keywords'] = [];

    // Fetch rankings for each domain
    for (const domain of allDomains) {
      const keywordsPayload = [
        {
          target: domain,
          location_code: 2840,
          language_code: 'en',
        },
      ];

      const rankResult = await post<{ items?: Array<{ keyword?: string; rank_absolute?: number }> }>(
        '/v3/serp/google/organic/live/advanced',
        keywordsPayload,
      );

      if (!rankResult.success || !rankResult.data) continue;

      const rankItems = (rankResult.data as unknown as { items?: Array<Record<string, unknown>> }).items ?? [];

      for (const item of rankItems) {
        const kw = (item.keyword as string) ?? '';
        const position = (item.rank_absolute as number) ?? 0;

        const existing = sharedKeywords.find((k) => k.keyword === kw);
        if (existing) {
          existing.competitor_positions[domain] = position;
        } else {
          const entry: DomainIntersectionResult['shared_keywords'][0] = {
            keyword: kw,
            target_position: domain === targetDomain ? position : 0,
            competitor_positions: { [domain]: position },
            search_volume: 0,
            competition: 0,
          };
          if (domain === targetDomain) {
            entry.target_position = position;
          }
          sharedKeywords.push(entry);
        }
      }
    }

    // Filter to shared keywords only
    const shared = sharedKeywords.filter(
      (k) => Object.keys(k.competitor_positions).length > 1,
    );

    return {
      success: true,
      data: {
        target_domain: targetDomain,
        competitors,
        shared_keywords: shared,
        total_shared: shared.length,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'DFSEO_DOMAIN_INTERSECTION_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
    };
  }
}

// ---------------------------------------------------------------------------
// NEW: Content Gap Analysis
// ---------------------------------------------------------------------------

/**
 * 内容空缺分析 - 找出竞品有排名但目标域名没有的关键词
 */
export async function getContentGapAnalysis(
  domain: string,
  competitors: string[],
): Promise<DataForSEOResult<ContentGapResult>> {
  try {
    const gaps: ContentGapItem[] = [];
    const competitorKeywords = new Map<string, Record<string, number>>();

    // Get keywords from competitor rankings
    for (const competitor of competitors) {
      const rankResult = await getRankings(competitor, 2840, 'en');

      if (!rankResult.success || !rankResult.data) continue;

      for (const item of rankResult.data) {
        const kw = item.keyword;
        const pos = item.position;

        if (!competitorKeywords.has(kw)) {
          competitorKeywords.set(kw, {});
        }
        const entry = competitorKeywords.get(kw)!;
        entry[competitor] = pos;
      }
    }

    // Get target domain keywords
    const targetRankResult = await getRankings(domain, 2840, 'en');
    const targetKeywords = new Set<string>();

    if (targetRankResult.success && targetRankResult.data) {
      for (const item of targetRankResult.data) {
        targetKeywords.add(item.keyword);
      }
    }

    // Find gaps: keywords competitors rank for but target doesn't
    for (const [kw, competitorPositions] of competitorKeywords) {
      if (!targetKeywords.has(kw)) {
        // Calculate opportunity score
        const avgPosition =
          Object.values(competitorPositions).reduce((sum, p) => sum + p, 0) /
          Object.values(competitorPositions).length;
        const opportunityScore = Math.max(0, 100 - avgPosition * 5);

        gaps.push({
          keyword: kw,
          competitor_rankings: competitorPositions,
          search_volume: 0,
          competition: 0,
          opportunity_score: Math.round(opportunityScore),
        });
      }
    }

    // Sort by opportunity score
    gaps.sort((a, b) => b.opportunity_score - a.opportunity_score);

    return {
      success: true,
      data: {
        domain,
        competitors,
        gaps,
        total_gaps: gaps.length,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'DFSEO_CONTENT_GAP_ANALYSIS_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export default {
  getKeywordSearchVolume,
  getKeywordIdeas,
  getSERP,
  getRankings,
  getBacklinks,
  getBacklinksList,
  getCompetitorAds,
  getKeywordMetrics,
  getDomainMetrics,
  getBulkKeywordDifficulty,
  getLocalPackRankings,
  getAllAvailableLocations,
  getTasksReady,
  getTaskResult,
  // New methods
  getSerpFeatures,
  getContentAnalysis,
  getBusinessListings,
  getDomainIntersection,
  getContentGapAnalysis,
  // Tracking
  getCallStats,
  getEstimatedCost,
  resetCallStats,
};