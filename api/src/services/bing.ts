// ---------------------------------------------------------------------------
// Bing Webmaster Tools API Service
// Uses axios + API Key authentication
// ---------------------------------------------------------------------------

import axios, { type AxiosInstance } from 'axios';
import config from '../config.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BingSite {
  siteUrl: string;
  siteName: string;
  siteId: string;
  createdDate: string;
  verified: boolean;
  roles: string[];
}

export interface BingSearchAnalyticsRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface BingSearchAnalyticsResult {
  rows: BingSearchAnalyticsRow[];
  totalRows: number;
}

export interface BingBacklinkItem {
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  firstSeen: string;
  lastSeen: string;
  dofollow: boolean;
}

export interface BingBacklinksResult {
  backlinks: BingBacklinkItem[];
  totalCount: number;
}

export interface BingCrawlIssue {
  url: string;
  issueType: string;
  issueDescription: string;
  severity: string;
  detectedDate: string;
  resolvedDate: string | null;
}

export interface BingKeywordStat {
  keyword: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
}

export interface BingResult<T = unknown> {
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
  baseURL: 'https://ssl.bing.com/webmaster/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAuthParams(): Record<string, string> {
  return {
    apikey: config.bing.apiKey,
  };
}

/**
 * 格式化日期范围参数
 */
function formatDateRange(startDate: string, endDate: string) {
  // Bing API expects dates in format without dashes in some endpoints
  return {
    startDate,
    endDate,
  };
}

// ---------------------------------------------------------------------------
// API Methods
// ---------------------------------------------------------------------------

/**
 * 获取已授权的站点列表
 */
export async function getSiteList(): Promise<BingResult<BingSite[]>> {
  try {
    const response = await client.get('/api/GetSiteList', {
      params: getAuthParams(),
    });

    const data = response.data as {
      d?: {
        results?: Array<{
          SiteUrl?: string;
          SiteName?: string;
          SiteId?: string;
          CreatedDate?: string;
          Verified?: boolean;
          Roles?: string[];
        }>;
      };
    };

    const sites: BingSite[] = (data.d?.results ?? []).map((item) => ({
      siteUrl: item.SiteUrl ?? '',
      siteName: item.SiteName ?? '',
      siteId: item.SiteId ?? '',
      createdDate: item.CreatedDate ?? '',
      verified: item.Verified ?? false,
      roles: item.Roles ?? [],
    }));

    return { success: true, data: sites };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'BING_GET_SITE_LIST_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err,
      },
    };
  }
}

/**
 * 获取搜索分析数据（查询、点击、展示、CTR、排名）
 */
export async function getSearchAnalytics(
  siteUrl: string,
  startDate: string,
  endDate: string,
): Promise<BingResult<BingSearchAnalyticsResult>> {
  try {
    const response = await client.get('/api/GetQueryStats', {
      params: {
        ...getAuthParams(),
        siteUrl,
        ...formatDateRange(startDate, endDate),
      },
    });

    const data = response.data as {
      d?: {
        results?: Array<{
          Query?: string;
          Clicks?: number;
          Impressions?: number;
          CTR?: number;
          Position?: number;
        }>;
        TotalRows?: number;
      };
    };

    const rows: BingSearchAnalyticsRow[] = (data.d?.results ?? []).map((item) => ({
      query: item.Query ?? '',
      clicks: item.Clicks ?? 0,
      impressions: item.Impressions ?? 0,
      ctr: item.CTR ?? 0,
      position: item.Position ?? 0,
    }));

    return {
      success: true,
      data: {
        rows,
        totalRows: data.d?.TotalRows ?? rows.length,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'BING_GET_SEARCH_ANALYTICS_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err,
      },
    };
  }
}

/**
 * 获取外链数据
 */
export async function getBacklinks(
  siteUrl: string,
): Promise<BingResult<BingBacklinksResult>> {
  try {
    const response = await client.get('/api/GetBacklinks', {
      params: {
        ...getAuthParams(),
        siteUrl,
      },
    });

    const data = response.data as {
      d?: {
        results?: Array<{
          SourceUrl?: string;
          TargetUrl?: string;
          AnchorText?: string;
          FirstSeen?: string;
          LastSeen?: string;
          Dofollow?: boolean;
        }>;
        TotalCount?: number;
      };
    };

    const backlinks: BingBacklinkItem[] = (data.d?.results ?? []).map((item) => ({
      sourceUrl: item.SourceUrl ?? '',
      targetUrl: item.TargetUrl ?? '',
      anchorText: item.AnchorText ?? '',
      firstSeen: item.FirstSeen ?? '',
      lastSeen: item.LastSeen ?? '',
      dofollow: item.Dofollow ?? true,
    }));

    return {
      success: true,
      data: {
        backlinks,
        totalCount: data.d?.TotalCount ?? backlinks.length,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'BING_GET_BACKLINKS_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err,
      },
    };
  }
}

/**
 * 获取爬虫错误/问题
 */
export async function getCrawlIssues(
  siteUrl: string,
): Promise<BingResult<BingCrawlIssue[]>> {
  try {
    const response = await client.get('/api/GetCrawlIssues', {
      params: {
        ...getAuthParams(),
        siteUrl,
      },
    });

    const data = response.data as {
      d?: {
        results?: Array<{
          URL?: string;
          IssueType?: string;
          IssueDescription?: string;
          Severity?: string;
          DetectedDate?: string;
          ResolvedDate?: string | null;
        }>;
      };
    };

    const issues: BingCrawlIssue[] = (data.d?.results ?? []).map((item) => ({
      url: item.URL ?? '',
      issueType: item.IssueType ?? '',
      issueDescription: item.IssueDescription ?? '',
      severity: item.Severity ?? 'info',
      detectedDate: item.DetectedDate ?? '',
      resolvedDate: item.ResolvedDate ?? null,
    }));

    return { success: true, data: issues };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'BING_GET_CRAWL_ISSUES_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err,
      },
    };
  }
}

/**
 * 获取关键词统计
 */
export async function getKeywordStats(
  siteUrl: string,
): Promise<BingResult<BingKeywordStat[]>> {
  try {
    const response = await client.get('/api/GetKeywordStats', {
      params: {
        ...getAuthParams(),
        siteUrl,
      },
    });

    const data = response.data as {
      d?: {
        results?: Array<{
          Keyword?: string;
          Impressions?: number;
          Clicks?: number;
          CTR?: number;
          Position?: number;
        }>;
      };
    };

    const stats: BingKeywordStat[] = (data.d?.results ?? []).map((item) => ({
      keyword: item.Keyword ?? '',
      impressions: item.Impressions ?? 0,
      clicks: item.Clicks ?? 0,
      ctr: item.CTR ?? 0,
      position: item.Position ?? 0,
    }));

    return { success: true, data: stats };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'BING_GET_KEYWORD_STATS_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err,
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export const bing = {
  getSiteList,
  getSearchAnalytics,
  getBacklinks,
  getCrawlIssues,
  getKeywordStats,
};

export default bing;