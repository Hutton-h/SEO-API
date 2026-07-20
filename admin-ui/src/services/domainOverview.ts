import { apiGet, apiPost } from './api';

export interface DomainOverviewData {
  domain: string;
  totalKeywords: number;
  estimatedTraffic: number;
  trafficValue: number;
  rankingDistribution: { top3: number; top10: number; top50: number; top100: number };
  topKeywords: Array<{ keyword: string; position: number; searchVolume: number; url: string }>;
  domainMetrics?: { ssl: boolean; responsive: boolean; technologies: string[] };
  analyzedAt: string;
}

export interface DomainOverviewHistory {
  id: string;
  domain: string;
  totalKeywords: number;
  estimatedTraffic: number;
  analyzedAt: string;
}

export const domainOverviewAPI = {
  getDomainOverview: (data: { domain: string; locationCode?: number }) =>
    apiPost<DomainOverviewData>('/v1/domain-overview', data),

  getOverviewHistory: (params?: { page?: number; pageSize?: number }) =>
    apiGet<{ data: DomainOverviewHistory[]; total: number }>('/v1/domain-overview/history', params),
};