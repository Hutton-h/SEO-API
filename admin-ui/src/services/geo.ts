import { apiGet, apiPost } from './api';

export interface GMBProfile {
  businessName: string;
  category: string;
  address: string;
  phone: string;
  rating: number;
  reviewCount: number;
  status: string;
}

export interface LocalRanking {
  id: string;
  keyword: string;
  position: number;
  previousPosition: number;
  change: number;
  mapPack: boolean;
}

export const geoAPI = {
  // 获取 GMB 档案
  getGMBProfile: (projectId: string) =>
    apiGet<GMBProfile>(`/v1/projects/${projectId}/local-seo/gmb-profile`),

  // 获取本地排名
  getLocalRankings: (projectId: string, params?: { location?: string }) =>
    apiGet<LocalRanking[]>(`/v1/projects/${projectId}/local-seo/rankings`, params),

  // 添加本地关键词
  addLocalKeyword: (projectId: string, keyword: string) =>
    apiPost<LocalRanking>(`/v1/projects/${projectId}/local-seo/rankings`, { keyword }),

  // 刷新本地 SEO 数据
  refreshLocalSEO: (projectId: string) =>
    apiPost<{ message: string }>(`/v1/projects/${projectId}/local-seo/refresh`),
};