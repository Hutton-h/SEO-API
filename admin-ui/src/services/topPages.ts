import { apiPost } from './api';

export interface TopPageItem {
  url: string;
  keywordCount: number;
  estimatedTraffic: number;
  topKeyword: string;
  topKeywordPosition: number;
  topKeywordVolume: number;
  avgPosition: number;
}

export interface TopPagesResult {
  domain: string;
  pages: TopPageItem[];
  totalPages: number;
  analyzedAt: string;
}

export const topPagesAPI = {
  getTopPages: (data: { domain: string; locationCode?: number; limit?: number }) =>
    apiPost<TopPagesResult>('/v1/top-pages', data),
};