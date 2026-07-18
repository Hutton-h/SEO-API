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

export interface KeywordSuggestion {
  keyword: string;
  searchVolume: number;
  competition: string;
  cpc: string;
  difficulty: number;
  intent: string;
  trend: string;
}

export interface KeywordResearch {
  keyword: string;
  overview: { searchVolume: number; competition: string; cpc: string; difficulty: number; trend: string };
  relatedKeywords: Array<{ keyword: string; volume: number; competition: number; cpc: number }>;
  questions: Array<{ question: string; volume: number }>;
  searchIntent: Record<string, number>;
  seasonalTrend: Array<{ month: number; volume: number }>;
  serpFeatures: Record<string, boolean>;
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
  getKeywords: (projectId: string, params?: { page?: number; pageSize?: number; search?: string }) =>
    apiGet<{ data: Keyword[]; total: number }>(`/v1/projects/${projectId}/keywords`, params),

  addKeyword: (projectId: string, keyword: string) =>
    apiPost<Keyword>(`/v1/projects/${projectId}/keywords`, { keyword }),

  batchAddKeywords: (projectId: string, keywords: string[]) =>
    apiPost<KeywordImportResult>(`/v1/projects/${projectId}/keywords/batch`, { keywords }),

  updateKeyword: (projectId: string, id: string, data: Partial<Keyword>) =>
    apiPut<Keyword>(`/v1/projects/${projectId}/keywords/${id}`, data),

  deleteKeyword: (projectId: string, id: string) =>
    apiDelete<void>(`/v1/projects/${projectId}/keywords/${id}`),

  getSearchVolumeTrend: (projectId: string, keywordId: string) =>
    apiGet<SearchVolumeTrend[]>(`/v1/projects/${projectId}/keywords/${keywordId}/trend`),

  importDefaultKeywords: (projectId: string) =>
    apiPost<KeywordImportResult>(`/v1/projects/${projectId}/keywords/import-default`),

  // 关键词推荐
  recommendKeywords: (projectId: string, topic: string, count?: number) =>
    apiPost<{ suggestions: KeywordSuggestion[]; total: number }>(`/v1/projects/${projectId}/keywords/recommend`, { topic, count }),

  // 关键词深度研究
  researchKeyword: (projectId: string, keyword: string) =>
    apiPost<KeywordResearch>(`/v1/projects/${projectId}/keywords/research`, { keyword }),

  // 批量导入
  batchImport: (projectId: string, keywords: string[]) =>
    apiPost<KeywordImportResult>(`/v1/projects/${projectId}/keywords/batch-import`, { keywords }),

  // 批量设置标签
  batchTag: (projectId: string, keywordIds: string[], tags: string[]) =>
    apiPut<{ updated: number; tags: string[] }>(`/v1/projects/${projectId}/keywords/batch-tag`, { keywordIds, tags }),
};