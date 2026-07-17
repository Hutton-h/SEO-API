import { apiGet, apiPost } from './api';

export interface RankingRecord {
  id: string;
  keywordId: string;
  keyword: string;
  url: string;
  position: number;
  previousPosition: number;
  change: number;
  searchEngine: 'google' | 'bing' | 'baidu';
  device: 'desktop' | 'mobile';
  location: string;
  checkedAt: string;
}

export interface RankingHistory {
  date: string;
  position: number;
  keyword: string;
}

export interface RankingSummary {
  totalKeywords: number;
  top3: number;
  top10: number;
  top50: number;
  improved: number;
  declined: number;
  unchanged: number;
}

export const rankingAPI = {
  // 获取排名列表
  getRankings: (projectId: string, params?: {
    page?: number;
    pageSize?: number;
    searchEngine?: string;
    device?: string;
  }) => apiGet<{ data: RankingRecord[]; total: number }>(
    `/projects/${projectId}/rankings`,
    params
  ),

  // 获取排名历史
  getRankingHistory: (projectId: string, keywordId: string, days?: number) =>
    apiGet<RankingHistory[]>(`/projects/${projectId}/rankings/${keywordId}/history`, { days }),

  // 获取排名概览
  getRankingSummary: (projectId: string) =>
    apiGet<RankingSummary>(`/projects/${projectId}/rankings/summary`),

  // 刷新排名
  refreshRankings: (projectId: string) =>
    apiPost<{ message: string }>(`/projects/${projectId}/rankings/refresh`),
};