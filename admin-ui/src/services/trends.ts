import { apiPost } from './api';

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

export const trendsAPI = {
  compareTrends: (data: { keywords: string[]; timeframe?: string; geo?: string }) =>
    apiPost<TrendsComparisonResult>('/v1/trends/compare', data),

  getInterestByRegion: (data: { keyword: string; resolution?: string }) =>
    apiPost<RegionalInterestResult>('/v1/trends/interest-by-region', data),

  getRelatedQueries: (data: { keyword: string }) =>
    apiPost<RelatedQueriesResult>('/v1/trends/related-queries', data),
};