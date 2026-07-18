import { apiGet, apiPost } from './api';

export interface CrawlTask {
  id: string;
  projectId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  pagesCrawled: number;
  totalPages: number;
  startedAt: string;
  completedAt?: string;
  errors: number;
}

export interface PageResult {
  id: string;
  url: string;
  title: string;
  statusCode: number;
  loadTime: number;
  seoScore: number;
  issues: Issue[];
  lastCrawled: string;
}

export interface Issue {
  id: string;
  type: string;
  severity: 'critical' | 'major' | 'minor' | 'info';
  title: string;
  description: string;
  url: string;
  element?: string;
  suggestion: string;
}

export interface CrawlConfig {
  maxPages: number;
  crawlDepth: number;
  respectRobots: boolean;
  followRedirects: boolean;
  userAgent: string;
}

export interface AuditConfig {
  auditType?: 'full' | 'seo' | 'performance' | 'accessibility';
  includePSI?: boolean;
  psiUrls?: string[];
}

export interface AuditTask {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  result?: {
    seoScore: number;
    performanceScore: number;
    accessibilityScore: number;
    overallScore: number;
    pageSpeed?: {
      mobile?: { performance: number; fcp: string; lcp: string; tbt: string; cls: string; si: string };
      desktop?: { performance: number; fcp: string; lcp: string };
    };
    issues: Issue[];
  };
}

export const crawlAPI = {
  // 触发爬虫
  startCrawl: (projectId: string, config?: Partial<CrawlConfig>) =>
    apiPost<CrawlTask>(`/v1/projects/${projectId}/crawl`, config),

  // 获取爬虫任务状态
  getTaskStatus: (projectId: string, taskId: string) =>
    apiGet<CrawlTask>(`/v1/projects/${projectId}/crawl/${taskId}`),

  // 获取页面列表
  getPages: (projectId: string, params?: { page?: number; pageSize?: number; statusCode?: number; search?: string }) =>
    apiGet<{ data: PageResult[]; total: number }>(`/v1/projects/${projectId}/pages`, params),

  // 获取页面问题
  getPageIssues: (projectId: string, pageId: string) =>
    apiGet<Issue[]>(`/v1/projects/${projectId}/pages/${pageId}/issues`),

  // 获取所有问题
  getAllIssues: (projectId: string, params?: { severity?: string; source?: string; type?: string }) =>
    apiGet<Issue[]>(`/v1/projects/${projectId}/issues`, params),

  // 触发审计
  startAudit: (projectId: string, config?: AuditConfig) =>
    apiPost<AuditTask>(`/v1/projects/${projectId}/audit`, config),

  // 获取审计任务状态
  getAuditStatus: (projectId: string, taskId: string) =>
    apiGet<AuditTask>(`/v1/projects/${projectId}/audit/status/${taskId}`),
};