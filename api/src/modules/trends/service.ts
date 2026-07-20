// ---------------------------------------------------------------------------
// Google Trends Module - Service
// ---------------------------------------------------------------------------

import {
  getInterestOverTime,
  getInterestByRegion,
  getRelatedQueries as getTrendsRelatedQueries,
} from '../../services/trends.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TrendsComparisonResult {
  keywords: string[];
  timeline: Array<{ date: string; values: Record<string, number> }>;
  averages: Record<string, number>;
}

export interface RegionalInterestResult {
  keyword: string;
  regions: Array<{ geoCode: string; geoName: string; value: number }>;
}

export interface RelatedQueriesResult {
  keyword: string;
  rising: Array<{ query: string; value: number }>;
  top: Array<{ query: string; value: number }>;
}

// ---------------------------------------------------------------------------
// Service Methods
// ---------------------------------------------------------------------------

export async function compareTrends(
  keywords: string[],
  timeframe: string = 'today 12-m',
  geo: string = '',
): Promise<TrendsComparisonResult> {
  const results = await Promise.all(
    keywords.map(async (keyword) => {
      const result = await getInterestOverTime(keyword, timeframe, geo);
      return { keyword, result };
    }),
  );

  // Build a unified timeline by merging dates from all keyword results
  const dateMap = new Map<string, Record<string, number>>();
  const averages: Record<string, number> = {};

  for (const { keyword, result } of results) {
    let totalValue = 0;
    let pointCount = 0;

    for (const point of result.data?.data ?? []) {
      if (!dateMap.has(point.date)) {
        dateMap.set(point.date, {});
      }
      const entry = dateMap.get(point.date)!;
      entry[keyword] = point.value;
      totalValue += point.value;
      pointCount++;
    }

    averages[keyword] = pointCount > 0 ? totalValue / pointCount : 0;
  }

  const timeline = Array.from(dateMap.entries())
    .map(([date, values]) => ({ date, values }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { keywords, timeline, averages };
}

export async function getRegionalInterest(
  keyword: string,
  resolution: string = 'REGION',
): Promise<RegionalInterestResult> {
  // Map resolution to timeframe for the underlying trends service
  // The trends service expects timeframe, but we can pass resolution as-is
  // and let the service handle it
  const result = await getInterestByRegion(keyword, 'today 12-m', '');

  const regions = (result.data?.data ?? []).map((item) => ({
    geoCode: item.region,
    geoName: item.regionName,
    value: item.value,
  }));

  // Sort by value descending
  regions.sort((a, b) => b.value - a.value);

  return { keyword, regions };
}

export async function getKeywordRelatedQueries(
  keyword: string,
): Promise<RelatedQueriesResult> {
  const result = await getTrendsRelatedQueries(keyword);

  const rising = (result.data?.rising ?? []).map((item) => ({
    query: item.query,
    value: item.value,
  }));

  const top = (result.data?.top ?? []).map((item) => ({
    query: item.query,
    value: item.value,
  }));

  return { keyword, rising, top };
}

export default {
  compareTrends,
  getRegionalInterest,
  getKeywordRelatedQueries,
};