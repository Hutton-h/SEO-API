// ---------------------------------------------------------------------------
// Google Trends Service
// Uses axios to call Google Trends unofficial API endpoints
// Built-in 24-hour cache to prevent rate limiting
// ---------------------------------------------------------------------------

import axios, { type AxiosInstance } from 'axios';
import config from '../config.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InterestOverTimePoint {
  date: string;
  timestamp: number;
  value: number;
}

export interface InterestOverTimeResult {
  keyword: string;
  timeframe: string;
  geo: string;
  data: InterestOverTimePoint[];
  average: number;
}

export interface InterestByRegionItem {
  region: string;
  regionName: string;
  value: number;
}

export interface InterestByRegionResult {
  keyword: string;
  timeframe: string;
  geo: string;
  data: InterestByRegionItem[];
}

export interface RelatedQueryItem {
  query: string;
  value: number;
  isRising: boolean;
}

export interface RelatedQueriesResult {
  keyword: string;
  top: RelatedQueryItem[];
  rising: RelatedQueryItem[];
}

export interface TrendingSearchItem {
  title: string;
  description: string;
  traffic: string;
  articles: Array<{
    title: string;
    url: string;
    source: string;
  }>;
}

export interface TrendingSearchesResult {
  geo: string;
  date: string;
  trends: TrendingSearchItem[];
}

export interface TrendsResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCacheKey(method: string, ...args: unknown[]): string {
  return `${method}:${JSON.stringify(args)}`;
}

function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// ---------------------------------------------------------------------------
// Axios client
// ---------------------------------------------------------------------------

const client: AxiosInstance = axios.create({
  baseURL: 'https://trends.google.com/trends',
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * 格式化时间范围参数
 * today 1-m, today 3-m, today 12-m, today 5-y, all
 */
function formatTimeframe(timeframe: string): string {
  const valid = ['today 1-m', 'today 3-m', 'today 12-m', 'today 5-y', 'all'];
  return valid.includes(timeframe) ? timeframe : 'today 12-m';
}

/**
 * 格式化地区参数
 * 空字符串 = worldwide, 如 'US', 'CN', 'GB'
 */
function formatGeo(geo: string): string {
  return geo.toUpperCase().trim();
}

// ---------------------------------------------------------------------------
// API Methods
// ---------------------------------------------------------------------------

/**
 * 获取关键词随时间变化的兴趣度
 * @param keyword - 搜索关键词
 * @param timeframe - 时间范围，默认 'today 12-m'
 * @param geo - 地区代码，默认 '' (worldwide)
 */
export async function getInterestOverTime(
  keyword: string,
  timeframe: string = 'today 12-m',
  geo: string = '',
): Promise<TrendsResult<InterestOverTimeResult>> {
  const cacheKey = getCacheKey('getInterestOverTime', keyword, timeframe, geo);
  const cached = getFromCache<InterestOverTimeResult>(cacheKey);
  if (cached) {
    return { success: true, data: cached };
  }

  try {
    const formattedTimeframe = formatTimeframe(timeframe);
    const formattedGeo = formatGeo(geo);

    // Use the unofficial Google Trends explore endpoint
    const exploreResponse = await client.get('/api/explore', {
      params: {
        hl: 'en-US',
        tz: '-480',
        req: JSON.stringify({
          comparisonItem: [
            {
              keyword,
              geo: formattedGeo || '',
              time: formattedTimeframe,
            },
          ],
          category: 0,
          property: '',
        }),
      },
    });

    // The Trends API returns a JS prelude before JSON
    const exploreText = typeof exploreResponse.data === 'string'
      ? exploreResponse.data.replace(/^\)\]\}',?\n?/, '')
      : JSON.stringify(exploreResponse.data);

    const exploreData = JSON.parse(exploreText);
    const widgets = exploreData?.widgets ?? [];

    // Find the timeline widget
    const timelineWidget = widgets.find(
      (w: Record<string, unknown>) => w.id === 'TIMESERIES',
    );

    if (!timelineWidget) {
      return {
        success: false,
        error: {
          code: 'TRENDS_NO_TIMELINE_DATA',
          message: 'No timeline data found for the given keyword',
        },
      };
    }

    const token = timelineWidget.token;
    const req = JSON.parse(timelineWidget.request ?? '{}');

    const timelineResponse = await client.get('/api/widgetdata/multiline', {
      params: {
        hl: 'en-US',
        tz: '-480',
        req: JSON.stringify({
          ...req,
          token,
        }),
      },
    });

    const timelineText = typeof timelineResponse.data === 'string'
      ? timelineResponse.data.replace(/^\)\]\}',?\n?/, '')
      : JSON.stringify(timelineResponse.data);

    const timelineData = JSON.parse(timelineText);

    const defaultData = timelineData.default ?? {};
    const timelinePoints = defaultData.timelineData ?? [];

    const points: InterestOverTimePoint[] = timelinePoints.map(
      (p: { formattedTime?: string; time?: string; value?: number[]; formattedAxisTime?: string }) => ({
        date: p.formattedTime ?? p.formattedAxisTime ?? p.time ?? '',
        timestamp: typeof p.time === 'string' ? parseInt(p.time, 10) : 0,
        value: p.value?.[0] ?? 0,
      }),
    );

    const totalValue = points.reduce((sum: number, p: InterestOverTimePoint) => sum + p.value, 0);
    const average = points.length > 0 ? totalValue / points.length : 0;

    const result: InterestOverTimeResult = {
      keyword,
      timeframe: formattedTimeframe,
      geo: formattedGeo,
      data: points,
      average,
    };

    setCache(cacheKey, result);

    return { success: true, data: result };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'TRENDS_INTEREST_OVER_TIME_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err,
      },
    };
  }
}

/**
 * 获取关键词按地域分布的兴趣度
 */
export async function getInterestByRegion(
  keyword: string,
  timeframe: string = 'today 12-m',
  geo: string = '',
): Promise<TrendsResult<InterestByRegionResult>> {
  const cacheKey = getCacheKey('getInterestByRegion', keyword, timeframe, geo);
  const cached = getFromCache<InterestByRegionResult>(cacheKey);
  if (cached) {
    return { success: true, data: cached };
  }

  try {
    const formattedTimeframe = formatTimeframe(timeframe);
    const formattedGeo = formatGeo(geo);

    const exploreResponse = await client.get('/api/explore', {
      params: {
        hl: 'en-US',
        tz: '-480',
        req: JSON.stringify({
          comparisonItem: [
            {
              keyword,
              geo: formattedGeo || '',
              time: formattedTimeframe,
            },
          ],
          category: 0,
          property: '',
        }),
      },
    });

    const exploreText = typeof exploreResponse.data === 'string'
      ? exploreResponse.data.replace(/^\)\]\}',?\n?/, '')
      : JSON.stringify(exploreResponse.data);

    const exploreData = JSON.parse(exploreText);
    const widgets = exploreData?.widgets ?? [];

    const geoWidget = widgets.find(
      (w: Record<string, unknown>) => w.id === 'GEO_MAP',
    );

    if (!geoWidget) {
      return {
        success: false,
        error: {
          code: 'TRENDS_NO_GEO_DATA',
          message: 'No geographic data found for the given keyword',
        },
      };
    }

    const token = geoWidget.token;
    const req = JSON.parse(geoWidget.request ?? '{}');

    const geoResponse = await client.get('/api/widgetdata/comparedgeo', {
      params: {
        hl: 'en-US',
        tz: '-480',
        req: JSON.stringify({
          ...req,
          token,
        }),
      },
    });

    const geoText = typeof geoResponse.data === 'string'
      ? geoResponse.data.replace(/^\)\]\}',?\n?/, '')
      : JSON.stringify(geoResponse.data);

    const geoData = JSON.parse(geoText);

    const defaultData = geoData.default ?? {};
    const geoMapData = defaultData.geoMapData ?? [];

    const regions: InterestByRegionItem[] = geoMapData.map(
      (item: { geoCode?: string; geoName?: string; value?: number[] }) => ({
        region: item.geoCode ?? '',
        regionName: item.geoName ?? '',
        value: item.value?.[0] ?? 0,
      }),
    );

    const result: InterestByRegionResult = {
      keyword,
      timeframe: formattedTimeframe,
      geo: formattedGeo,
      data: regions,
    };

    setCache(cacheKey, result);

    return { success: true, data: result };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'TRENDS_INTEREST_BY_REGION_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err,
      },
    };
  }
}

/**
 * 获取相关搜索词
 */
export async function getRelatedQueries(
  keyword: string,
): Promise<TrendsResult<RelatedQueriesResult>> {
  const cacheKey = getCacheKey('getRelatedQueries', keyword);
  const cached = getFromCache<RelatedQueriesResult>(cacheKey);
  if (cached) {
    return { success: true, data: cached };
  }

  try {
    const exploreResponse = await client.get('/api/explore', {
      params: {
        hl: 'en-US',
        tz: '-480',
        req: JSON.stringify({
          comparisonItem: [
            {
              keyword,
              geo: '',
              time: 'today 12-m',
            },
          ],
          category: 0,
          property: '',
        }),
      },
    });

    const exploreText = typeof exploreResponse.data === 'string'
      ? exploreResponse.data.replace(/^\)\]\}',?\n?/, '')
      : JSON.stringify(exploreResponse.data);

    const exploreData = JSON.parse(exploreText);
    const widgets = exploreData?.widgets ?? [];

    const relatedWidget = widgets.find(
      (w: Record<string, unknown>) => w.id === 'RELATED_QUERIES',
    );

    if (!relatedWidget) {
      return {
        success: false,
        error: {
          code: 'TRENDS_NO_RELATED_QUERIES',
          message: 'No related queries found for the given keyword',
        },
      };
    }

    const token = relatedWidget.token;
    const req = JSON.parse(relatedWidget.request ?? '{}');

    const relatedResponse = await client.get('/api/widgetdata/relatedsearches', {
      params: {
        hl: 'en-US',
        tz: '-480',
        req: JSON.stringify({
          ...req,
          token,
        }),
      },
    });

    const relatedText = typeof relatedResponse.data === 'string'
      ? relatedResponse.data.replace(/^\)\]\}',?\n?/, '')
      : JSON.stringify(relatedResponse.data);

    const relatedData = JSON.parse(relatedText);

    const defaultData = relatedData.default ?? {};
    const rankedList = defaultData.rankedList ?? [];
    const topList = defaultData.rankedKeyword ?? [];

    const extractQueries = (
      items: Array<{ query?: string; value?: number; rising?: boolean }>,
    ): RelatedQueryItem[] => {
      return items.map((item) => ({
        query: item.query ?? '',
        value: item.value ?? 0,
        isRising: item.rising ?? false,
      }));
    };

    const result: RelatedQueriesResult = {
      keyword,
      top: extractQueries(topList),
      rising: extractQueries(rankedList),
    };

    setCache(cacheKey, result);

    return { success: true, data: result };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'TRENDS_RELATED_QUERIES_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err,
      },
    };
  }
}

/**
 * 获取热门搜索趋势
 * @param geo - 地区代码，默认 'US'
 */
export async function getTrendingSearches(
  geo: string = 'US',
): Promise<TrendsResult<TrendingSearchesResult>> {
  const cacheKey = getCacheKey('getTrendingSearches', geo);
  const cached = getFromCache<TrendingSearchesResult>(cacheKey);
  if (cached) {
    return { success: true, data: cached };
  }

  try {
    const formattedGeo = formatGeo(geo);

    const response = await client.get('/api/dailytrends', {
      params: {
        hl: 'en-US',
        tz: '-480',
        geo: formattedGeo,
        ns: 15,
      },
    });

    const responseText = typeof response.data === 'string'
      ? response.data.replace(/^\)\]\}',?\n?/, '')
      : JSON.stringify(response.data);

    const trendsData = JSON.parse(responseText);

    const defaultData = trendsData.default ?? {};
    const trendingSearchesDays = defaultData.trendingSearchesDays ?? [];

    const allTrends: TrendingSearchItem[] = [];

    for (const day of trendingSearchesDays) {
      const searches = day.trendingSearches ?? [];
      for (const search of searches) {
        const articles = (search.articles ?? []).map(
          (a: { title?: string; url?: string; source?: string }) => ({
            title: a.title ?? '',
            url: a.url ?? '',
            source: a.source ?? '',
          }),
        );

        allTrends.push({
          title: search.title?.query ?? '',
          description: search.title?.exploreLink ?? '',
          traffic: search.formattedTraffic ?? '',
          articles,
        });
      }
    }

    const result: TrendingSearchesResult = {
      geo: formattedGeo,
      date: new Date().toISOString().split('T')[0],
      trends: allTrends,
    };

    setCache(cacheKey, result);

    return { success: true, data: result };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'TRENDS_TRENDING_SEARCHES_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err,
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export const trends = {
  getInterestOverTime,
  getInterestByRegion,
  getRelatedQueries,
  getTrendingSearches,
};

export default trends;