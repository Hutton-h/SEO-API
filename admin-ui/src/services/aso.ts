import { apiGet, apiPost } from './api';

export interface ASOKeyword {
  id: string;
  keyword: string;
  appStore: { position: number; change: number };
  googlePlay: { position: number; change: number };
  searchVolume: number;
  difficulty: 'low' | 'medium' | 'high';
}

export interface ASOTrend {
  date: string;
  appStore: number;
  googlePlay: number;
}

export const asoAPI = {
  // 获取 ASO 关键词排名
  getASOKeywords: (projectId: string) =>
    apiGet<ASOKeyword[]>(`/v1/projects/${projectId}/aso/keywords`),

  // 添加 ASO 关键词
  addASOKeyword: (projectId: string, keyword: string) =>
    apiPost<ASOKeyword>(`/v1/projects/${projectId}/aso/keywords`, { keyword }),

  // 获取排名趋势
  getASOTrend: (projectId: string) =>
    apiGet<ASOTrend[]>(`/v1/projects/${projectId}/aso/trend`),

  // 刷新 ASO 数据
  refreshASOData: (projectId: string) =>
    apiPost<{ message: string }>(`/v1/projects/${projectId}/aso/refresh`),
};