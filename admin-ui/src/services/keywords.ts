import { apiGet, apiPost, apiPut, apiDelete } from './api';

export interface Keyword {
  id: string;
  keyword: string;
  searchVolume: number;
  competition: number;
  cpc: number;
  currentRank: number;
  previousRank: number;
  trend: 'up' | 'down' | 'stable';
  url?: string;
  tags?: string[];
  createdAt: string;
}

export interface SearchVolumeTrend {
  month: string;
  volume: number;
}

export interface KeywordImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export const keywordAPI = {
  // 获取关键词列表
  getKeywords: (projectId: string, params?: { page?: number; pageSize?: number }) =>
    apiGet<{ data: Keyword[]; total: number }>(`/v1/projects/${projectId}/keywords`, params),

  // 添加关键词
  addKeyword: (projectId: string, keyword: string) =>
    apiPost<Keyword>(`/v1/projects/${projectId}/keywords`, { keyword }),

  // 批量添加关键词
  batchAddKeywords: (projectId: string, keywords: string[]) =>
    apiPost<KeywordImportResult>(`/v1/projects/${projectId}/keywords/batch`, { keywords }),

  // 更新关键词
  updateKeyword: (projectId: string, id: string, data: Partial<Keyword>) =>
    apiPut<Keyword>(`/v1/projects/${projectId}/keywords/${id}`, data),

  // 删除关键词
  deleteKeyword: (projectId: string, id: string) =>
    apiDelete<void>(`/v1/projects/${projectId}/keywords/${id}`),

  // 获取搜索量趋势
  getSearchVolumeTrend: (projectId: string, keywordId: string) =>
    apiGet<SearchVolumeTrend[]>(`/v1/projects/${projectId}/keywords/${keywordId}/trend`),

  // 导入默认关键词
  importDefaultKeywords: (projectId: string) =>
    apiPost<KeywordImportResult>(`/v1/projects/${projectId}/keywords/import-default`),
};