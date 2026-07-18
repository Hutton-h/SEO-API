import { apiGet, apiPost } from './api';

export interface LocalRanking {
  id: string;
  keyword: string;
  position: number;
  previousPosition: number;
  change: number;
  mapPack: boolean;
}

export interface GMBProfile {
  businessName: string;
  category: string;
  address: string;
  phone: string;
  rating: number;
  reviewCount: number;
  status: string;
}

export const localSEOAPI = {
  getRankings: (projectId: string, params?: { keyword?: string; locationCode?: string; languageCode?: string }) =>
    apiGet<LocalRanking[]>(`/v1/projects/${projectId}/local-seo/rankings`, params),

  addKeyword: (projectId: string, keyword: string) =>
    apiPost(`/v1/projects/${projectId}/local-seo/rankings`, { keyword }),

  getGMBProfile: (projectId: string) =>
    apiGet<GMBProfile>(`/v1/projects/${projectId}/local-seo/gmb-profile`),

  compareLocations: (projectId: string, location1: string, location2: string) =>
    apiPost(`/v1/projects/${projectId}/local-seo/compare`, { location1, location2 }),

  refreshData: (projectId: string) =>
    apiPost(`/v1/projects/${projectId}/local-seo/refresh`),
};