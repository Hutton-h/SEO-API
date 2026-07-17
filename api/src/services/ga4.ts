// ---------------------------------------------------------------------------
// Google Analytics Data API (GA4) Service
// Uses googleapis package (google.auth.GoogleAuth + analyticsdata/v1beta)
// ---------------------------------------------------------------------------

import { google, type analyticsdata_v1beta } from 'googleapis';
import config from '../config.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TrafficStats {
  sessions: number;
  users: number;
  pageviews: number;
  bounceRate: number;
  avgSessionDuration: number;
}

export interface TrafficSourceItem {
  source: string;
  sessions: number;
  users: number;
  pageviews: number;
  bounceRate: number;
  conversionRate: number;
}

export interface TopPageItem {
  url: string;
  pageTitle: string;
  pageviews: number;
  sessions: number;
  avgTimeOnPage: number;
  bounceRate: number;
}

export interface ConversionItem {
  eventName: string;
  count: number;
  conversionRate: number;
}

export interface GA4Result<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ---------------------------------------------------------------------------
// Auth Client (Service Account via GoogleAuth)
// ---------------------------------------------------------------------------

async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: config.ga4.clientEmail,
      private_key: config.ga4.privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  });
  return auth.getClient();
}

async function getAnalyticsDataClient() {
  const auth = await getAuthClient();
  return google.analyticsdata({
    version: 'v1beta',
    auth: auth as any,
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildDateRange(startDate: string, endDate: string): analyticsdata_v1beta.Schema$DateRange {
  return { startDate, endDate };
}

function getMetricValue(row: analyticsdata_v1beta.Schema$Row, index: number): number {
  const value = row.metricValues?.[index]?.value;
  return value ? parseFloat(value) : 0;
}

function getDimensionValue(row: analyticsdata_v1beta.Schema$Row, index: number): string {
  return row.dimensionValues?.[index]?.value ?? '';
}

/**
 * 向 GA4 发送请求
 */
async function runReport(
  dimensions: analyticsdata_v1beta.Schema$Dimension[],
  metrics: analyticsdata_v1beta.Schema$Metric[],
  startDate: string,
  endDate: string,
  propertyId: string,
  options?: {
    orderBys?: analyticsdata_v1beta.Schema$OrderBy[];
    limit?: number;
    dimensionFilter?: analyticsdata_v1beta.Schema$FilterExpression;
  },
): Promise<analyticsdata_v1beta.Schema$RunReportResponse> {
  const analyticsData = await getAnalyticsDataClient();

  const request: any = {
    property: `properties/${propertyId}`,
    dateRanges: [buildDateRange(startDate, endDate)],
    dimensions,
    metrics,
    orderBys: options?.orderBys,
    limit: options?.limit,
    dimensionFilter: options?.dimensionFilter,
  };

  const response = await analyticsData.properties.runReport({
    property: `properties/${propertyId}`,
    requestBody: request,
  });

  return response.data;
}

// ---------------------------------------------------------------------------
// API Methods
// ---------------------------------------------------------------------------

/**
 * 获取流量统计
 */
export async function getTrafficStats(
  propertyId: string,
  startDate: string,
  endDate: string,
): Promise<GA4Result<TrafficStats>> {
  try {
    const dimensions: analyticsdata_v1beta.Schema$Dimension[] = [];
    const metrics: analyticsdata_v1beta.Schema$Metric[] = [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'screenPageViews' },
      { name: 'bounceRate' },
      { name: 'averageSessionDuration' },
    ];

    const data = await runReport(dimensions, metrics, startDate, endDate, propertyId);

    const row = data.rows?.[0];
    const result: TrafficStats = {
      sessions: row ? getMetricValue(row, 0) : 0,
      users: row ? getMetricValue(row, 1) : 0,
      pageviews: row ? getMetricValue(row, 2) : 0,
      bounceRate: row ? getMetricValue(row, 3) : 0,
      avgSessionDuration: row ? getMetricValue(row, 4) : 0,
    };

    return { success: true, data: result };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'GA4_TRAFFIC_STATS_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err,
      },
    };
  }
}

/**
 * 获取按渠道分组的流量来源
 */
export async function getTrafficSources(
  propertyId: string,
  startDate: string,
  endDate: string,
): Promise<GA4Result<TrafficSourceItem[]>> {
  try {
    const dimensions: analyticsdata_v1beta.Schema$Dimension[] = [
      { name: 'sessionSource' },
    ];
    const metrics: analyticsdata_v1beta.Schema$Metric[] = [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'screenPageViews' },
      { name: 'bounceRate' },
      { name: 'sessionConversionRate' },
    ];

    const orderBys: analyticsdata_v1beta.Schema$OrderBy[] = [
      {
        metric: { metricName: 'sessions' },
        desc: true,
      },
    ];

    const data = await runReport(
      dimensions,
      metrics,
      startDate,
      endDate,
      propertyId,
      { orderBys, limit: 50 },
    );

    const sources: TrafficSourceItem[] = (data.rows ?? []).map((row) => ({
      source: getDimensionValue(row, 0),
      sessions: getMetricValue(row, 0),
      users: getMetricValue(row, 1),
      pageviews: getMetricValue(row, 2),
      bounceRate: getMetricValue(row, 3),
      conversionRate: getMetricValue(row, 4),
    }));

    return { success: true, data: sources };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'GA4_TRAFFIC_SOURCES_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err,
      },
    };
  }
}

/**
 * 获取热门页面
 */
export async function getTopPages(
  propertyId: string,
  startDate: string,
  endDate: string,
  limit: number = 20,
): Promise<GA4Result<TopPageItem[]>> {
  try {
    const dimensions: analyticsdata_v1beta.Schema$Dimension[] = [
      { name: 'pagePath' },
      { name: 'pageTitle' },
    ];
    const metrics: analyticsdata_v1beta.Schema$Metric[] = [
      { name: 'screenPageViews' },
      { name: 'sessions' },
      { name: 'averageSessionDuration' },
      { name: 'bounceRate' },
    ];

    const orderBys: analyticsdata_v1beta.Schema$OrderBy[] = [
      {
        metric: { metricName: 'screenPageViews' },
        desc: true,
      },
    ];

    const data = await runReport(
      dimensions,
      metrics,
      startDate,
      endDate,
      propertyId,
      { orderBys, limit },
    );

    const pages: TopPageItem[] = (data.rows ?? []).map((row) => ({
      url: getDimensionValue(row, 0),
      pageTitle: getDimensionValue(row, 1),
      pageviews: getMetricValue(row, 0),
      sessions: getMetricValue(row, 1),
      avgTimeOnPage: getMetricValue(row, 2),
      bounceRate: getMetricValue(row, 3),
    }));

    return { success: true, data: pages };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'GA4_TOP_PAGES_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err,
      },
    };
  }
}

/**
 * 获取转化事件
 */
export async function getConversions(
  propertyId: string,
  startDate: string,
  endDate: string,
): Promise<GA4Result<ConversionItem[]>> {
  try {
    const dimensions: analyticsdata_v1beta.Schema$Dimension[] = [
      { name: 'eventName' },
    ];
    const metrics: analyticsdata_v1beta.Schema$Metric[] = [
      { name: 'eventCount' },
      { name: 'sessionConversionRate' },
    ];

    const orderBys: analyticsdata_v1beta.Schema$OrderBy[] = [
      {
        metric: { metricName: 'eventCount' },
        desc: true,
      },
    ];

    const data = await runReport(
      dimensions,
      metrics,
      startDate,
      endDate,
      propertyId,
      { orderBys, limit: 50 },
    );

    const conversions: ConversionItem[] = (data.rows ?? []).map((row) => ({
      eventName: getDimensionValue(row, 0),
      count: getMetricValue(row, 0),
      conversionRate: getMetricValue(row, 1),
    }));

    return { success: true, data: conversions };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'GA4_CONVERSIONS_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err,
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export const ga4 = {
  getTrafficStats,
  getTrafficSources,
  getTopPages,
  getConversions,
};

export default ga4;