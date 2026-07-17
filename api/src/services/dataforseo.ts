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
};