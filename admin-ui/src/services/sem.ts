import { apiGet, apiPost } from './api';

export interface SEMKeyword {
  id: string;
  keyword: string;
  searchVolume: number;
  competition: 'low' | 'medium' | 'high';
  cpc: number;
  qualityScore: number;
  impressions: number;
  clicks: number;
  ctr: number;
  avgPosition: number;
  cost: number;
  conversions: number;
  conversionRate: number;
}

export interface CompetitorAd {
  id: string;
  competitor: string;
  headline: string;
  description: string;
  displayUrl: string;
  finalUrl: string;
  extensions: string[];
  lastSeen: string;
}

export interface Opportunity {
  id: string;
  keyword: string;
  searchVolume: number;
  competition: 'low' | 'medium' | 'high';
  cpc: number;
  opportunityScore: number;
  recommendation: string;
}

export const semAPI = {
  // 获取 SEM 关键词指标
  getSEMKeywords: (projectId: string, params?: { page?: number; pageSize?: number }) =>
    apiGet<{ data: SEMKeyword[]; total: number }>(
      `/v1/projects/${projectId}/sem/keywords`,
      params
    ),

  // 添加 SEM 关键词
  addSEMKeyword: (projectId: string, keyword: string) =>
    apiPost<SEMKeyword>(`/v1/projects/${projectId}/sem/keywords`, { keyword }),

  // 获取竞品广告
  getCompetitorAds: (projectId: string) =>
    apiGet<CompetitorAd[]>(`/v1/projects/${projectId}/sem/competitor-ads`),

  // 获取机会分析
  getOpportunities: (projectId: string) =>
    apiGet<Opportunity[]>(`/v1/projects/${projectId}/sem/opportunities`),

  // 刷新 SEM 数据
  refreshSEMData: (projectId: string) =>
    apiPost<{ message: string }>(`/v1/projects/${projectId}/sem/refresh`),
};