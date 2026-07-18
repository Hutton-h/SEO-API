import api, { apiGet, apiPost } from './api';

export interface ReportData {
  id: string;
  projectId: string;
  generatedAt: string;
  seoHealthScore: number;
  overview: {
    totalKeywords: number;
    totalPages: number;
    totalBacklinks: number;
    averageRank: number;
    organicTraffic: number;
    organicTrafficChange: number;
  };
  modules: {
    name: string;
    score: number;
    total: number;
    issues: number;
    status: 'good' | 'warning' | 'critical';
  }[];
  topKeywords: {
    keyword: string;
    position: number;
    change: number;
    searchVolume: number;
  }[];
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    impact: string;
  }[];
}

export const reportAPI = {
  // 获取报告
  getReport: (projectId: string) =>
    apiGet<ReportData>(`/v1/projects/${projectId}/report`),

  // 生成报告
  generateReport: (projectId: string) =>
    apiPost<ReportData>(`/v1/projects/${projectId}/report/generate`),

  // 导出 PDF
  exportPDF: (projectId: string) =>
    api.get(`/v1/projects/${projectId}/report/export/pdf`, { responseType: 'blob' }),
};