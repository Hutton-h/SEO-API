import { apiGet, apiPost } from './api';

export interface ContentAnalysisResult {
  id: string;
  url: string;
  qualityScore: number;
  readabilityScore: number;
  keywordDensity: { keyword: string; density: number; count: number }[];
  entityCoverage: { name: string; type: string; importance: number }[];
  structureScore: number;
  sentiment: { positive: number; negative: number; neutral: number };
  suggestions: { title: string; description: string; priority: 'high' | 'medium' | 'low' }[];
  analyzedAt: string;
}

export const contentAPI = {
  analyzeUrl: (url: string, projectId?: string) =>
    apiPost<ContentAnalysisResult>('/v1/content/analyze', { url, projectId }),

  getAnalysisHistory: (params?: { page?: number; pageSize?: number; projectId?: string }) =>
    apiGet<{ data: ContentAnalysisResult[]; total: number }>('/v1/content/history', params),
};