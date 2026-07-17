// ---------------------------------------------------------------------------
// ValueSERP API Service (Alternative SERP data source)
// Uses axios to call https://api.valueserp.com/search
// ---------------------------------------------------------------------------

import axios, { type AxiosInstance } from 'axios';
import config from '../config.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ValueSERPParams {
  q: string;
  location?: string;
  gl?: string;
  hl?: string;
  google_domain?: string;
  num?: number;
  page?: number;
  output?: string;
  [key: string]: string | number | undefined;
}

export interface OrganicResult {
  position: number;
  title: string;
  link: string;
  domain: string;
  displayed_link: string;
  snippet: string;
  date?: string;
  sitelinks?: Array<{
    title: string;
    link: string;
    snippet: string;
  }>;
  rich_snippet?: Record<string, unknown>;
  cached_page_link?: string;
  related_pages_link?: string;
}

export interface AdResult {
  position: number;
  title: string;
  link: string;
  domain: string;
  displayed_link: string;
  tracking_link: string;
  snippet: string;
  sitelinks?: Array<{
    title: string;
    link: string;
  }>;
  extensions?: string[];
}

export interface SearchResult {
  search_metadata: {
    id: string;
    status: string;
    created_at: string;
    processed_at: string;
    total_time_taken: number;
    google_url: string;
    raw_html_file: string;
  };
  search_parameters: Record<string, unknown>;
  search_information: {
    total_results: number;
    time_taken_displayed: number;
    query_displayed: string;
  };
  organic_results: OrganicResult[];
  ads?: AdResult[];
  related_searches?: Array<{ query: string }>;
  pagination?: {
    current: number;
    next: string;
    other_pages: Record<string, string>;
    api_pagination: {
      next: string;
      other_pages: Record<string, string>;
    };
  };
  inline_images?: unknown[];
  inline_videos?: unknown[];
  answer_box?: Record<string, unknown>;
  knowledge_graph?: Record<string, unknown>;
  related_questions?: Array<{ question: string; answer: string; source: string }>;
  local_results?: Array<{
    position: number;
    title: string;
    link: string;
    address: string;
    phone: string;
    rating: number;
    reviews: number;
  }>;
}

export interface OrganicResultsResult {
  query: string;
  location: string;
  totalResults: number;
  results: OrganicResult[];
  pagination: SearchResult['pagination'];
}

export interface AdsResult {
  query: string;
  location: string;
  ads: AdResult[];
}

export interface ValueSERPResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ---------------------------------------------------------------------------
// Axios client
// ---------------------------------------------------------------------------

const client: AxiosInstance = axios.create({
  baseURL: 'https://api.valueserp.com',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBaseParams(): Record<string, string> {
  return {
    api_key: config.valueserp.apiKey,
    output: 'json',
  };
}

// ---------------------------------------------------------------------------
// API Methods
// ---------------------------------------------------------------------------

/**
 * 执行搜索（通用方法）
 * @param params - 搜索参数
 */
export async function search(
  params: ValueSERPParams,
): Promise<ValueSERPResult<SearchResult>> {
  try {
    const response = await client.get('/search', {
      params: {
        ...getBaseParams(),
        ...params,
      },
    });

    const data = response.data as SearchResult;

    // Check for API errors
    if ((data as unknown as { error?: string }).error) {
      return {
        success: false,
        error: {
          code: 'VALUESERP_SEARCH_FAILED',
          message: (data as unknown as { error: string }).error,
        },
      };
    }

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'VALUESERP_SEARCH_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err,
      },
    };
  }
}

/**
 * 获取有机搜索结果
 * @param query - 搜索关键词
 * @param location - 位置（如 'United States'）
 * @param page - 页码，默认 1
 */
export async function getOrganicResults(
  query: string,
  location: string = 'United States',
  page: number = 1,
): Promise<ValueSERPResult<OrganicResultsResult>> {
  try {
    const result = await search({
      q: query,
      location,
      page,
      num: 100,
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error ?? {
          code: 'VALUESERP_ORGANIC_FAILED',
          message: 'Failed to get organic results',
        },
      };
    }

    const data = result.data;

    const organicResults: OrganicResultsResult = {
      query,
      location,
      totalResults: data.search_information?.total_results ?? 0,
      results: data.organic_results ?? [],
      pagination: data.pagination,
    };

    return { success: true, data: organicResults };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'VALUESERP_ORGANIC_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err,
      },
    };
  }
}

/**
 * 获取广告结果
 * @param query - 搜索关键词
 * @param location - 位置
 */
export async function getAds(
  query: string,
  location: string = 'United States',
): Promise<ValueSERPResult<AdsResult>> {
  try {
    const result = await search({
      q: query,
      location,
      num: 100,
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error ?? {
          code: 'VALUESERP_ADS_FAILED',
          message: 'Failed to get ads',
        },
      };
    }

    const data = result.data;

    const adsResult: AdsResult = {
      query,
      location,
      ads: data.ads ?? [],
    };

    return { success: true, data: adsResult };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'VALUESERP_ADS_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err,
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export const valueserp = {
  search,
  getOrganicResults,
  getAds,
};

export default valueserp;