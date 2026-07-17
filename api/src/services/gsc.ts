// ---------------------------------------------------------------------------
// Google Search Console API Service
// Uses googleapis package (google.auth.OAuth2 + searchconsole/v1)
// ---------------------------------------------------------------------------

import { google, type searchconsole_v1 } from 'googleapis';
import config from '../config.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchAnalyticsRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchAnalyticsResult {
  rows: SearchAnalyticsRow[];
  responseAggregationType: string | null;
}

export interface SiteEntry {
  siteUrl: string;
  permissionLevel: string;
}

export interface GSCResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ---------------------------------------------------------------------------
// OAuth2 Client
// ---------------------------------------------------------------------------

const oauth2Client = new google.auth.OAuth2(
  config.gsc.clientId,
  config.gsc.clientSecret,
  'https://developers.google.com/oauthplayground',
);

oauth2Client.setCredentials({
  refresh_token: config.gsc.refreshToken,
});

const searchconsole = google.searchconsole({
  version: 'v1',
  auth: oauth2Client,
});

// ---------------------------------------------------------------------------
// API Methods
// ---------------------------------------------------------------------------

/**
 * 获取搜索分析数据
 * @param siteUrl - 站点 URL（如 https://example.com/ 或 sc-domain:example.com）
 * @param startDate - 开始日期 YYYY-MM-DD
 * @param endDate - 结束日期 YYYY-MM-DD
 * @param dimensions - 维度数组，可选：query, page, country, device, searchAppearance
 * @param rowLimit - 返回行数限制，默认 1000
 */
export async function getSearchAnalytics(
  siteUrl: string,
  startDate: string,
  endDate: string,
  dimensions: string[] = ['query'],
  rowLimit: number = 1000,
): Promise<GSCResult<SearchAnalyticsResult>> {
  try {
    const requestBody: searchconsole_v1.Schema$SearchAnalyticsQueryRequest = {
      startDate,
      endDate,
      dimensions,
      rowLimit,
      aggregationType: 'auto',
    };

    const response = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody,
    });

    const data = response.data;

    const rows: SearchAnalyticsRow[] = (data.rows ?? []).map((row) => ({
      keys: row.keys ?? [],
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    }));

    return {
      success: true,
      data: {
        rows,
        responseAggregationType: data.responseAggregationType ?? null,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'GSC_ANALYTICS_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err,
      },
    };
  }
}

/**
 * 列出已授权的站点
 */
export async function listSites(): Promise<GSCResult<SiteEntry[]>> {
  try {
    const response = await searchconsole.sites.list({});

    const sites: SiteEntry[] = (response.data.siteEntry ?? []).map((entry) => ({
      siteUrl: entry.siteUrl ?? '',
      permissionLevel: entry.permissionLevel ?? '',
    }));

    return { success: true, data: sites };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'GSC_LIST_SITES_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err,
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const gsc = {
  getSearchAnalytics,
  listSites,
};

export default gsc;