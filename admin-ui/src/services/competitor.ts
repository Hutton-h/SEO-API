import { apiGet, apiPost } from './api';

export interface Competitor {
  id: string;
  name: string;
  domain: string;
  keywords: number;
  traffic: number;
  domainAuthority: number;
  topKeywords: number;
  avgPosition: number;
  backlinks: number;
}

export interface KeywordOverlap {
  keyword: string;
  ourRank: number;
  compARank: number;
  compBRank: number;
  compCRank: number;
  compDRank: number;
}

export const competitorAPI = {
  // 获取竞品概览
  getOverview: (projectId: string) =>
    apiGet<Competitor[]>(`/v1/projects/${projectId}/competitors/overview`),

  // 获取关键词重叠矩阵
  getKeywordOverlap: (projectId: string) =>
    apiGet<KeywordOverlap[]>(`/v1/projects/${projectId}/competitors/keyword-overlap`),

  // 添加竞品
  addCompetitor: (projectId: string, data: { name: string; domain: string }) =>
    apiPost<Competitor>(`/v1/projects/${projectId}/competitors`, data),

  // 移除竞品
  removeCompetitor: (projectId: string, competitorId: string) =>
    apiPost<{ message: string }>(`/v1/projects/${projectId}/competitors/${competitorId}/remove`),
};