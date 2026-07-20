import { apiGet, apiPost } from './api';

export interface Backlink {
  id: string;
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  type: 'dofollow' | 'nofollow';
  domainAuthority: number;
  pageAuthority: number;
  spamScore: number;
  firstSeen: string;
  lastSeen: string;
  status: 'active' | 'lost';
}

export interface BacklinkStats {
  totalBacklinks: number;
  referringDomains: number;
  dofollowCount: number;
  nofollowCount: number;
  avgDomainAuthority: number;
  avgPageAuthority: number;
  newBacklinks: number;
  lostBacklinks: number;
}

export interface ReferringDomain {
  domain: string;
  backlinks: number;
  firstSeen: string;
  lastSeen: string;
  domainAuthority?: number;
  isDofollow: boolean;
}

export interface AnchorTextItem {
  text: string;
  count: number;
  percentage: number;
}

export interface AnchorTextResult {
  anchors: AnchorTextItem[];
  total: number;
  brandedCount: number;
  brandedPercentage: number;
}

export interface LinkGapItem {
  domain: string;
  domainAuthority?: number;
  backlinks: number;
  competitorsUsing: string[];
  opportunity: 'high' | 'medium' | 'low';
}

export interface LinkGapResult {
  projectDomain: string;
  competitors: string[];
  missingSources: LinkGapItem[];
  totalMissing: number;
}

export const backlinkAPI = {
  // 获取外链列表
  getBacklinks: (projectId: string, params?: {
    page?: number;
    pageSize?: number;
    type?: string;
    status?: string;
  }) => apiGet<{ data: Backlink[]; total: number }>(
    `/v1/projects/${projectId}/backlinks`,
    params
  ),

  // 获取外链统计
  getBacklinkStats: (projectId: string) =>
    apiGet<BacklinkStats>(`/v1/projects/${projectId}/backlinks/stats`),

  // 刷新外链数据
  refreshBacklinks: (projectId: string) =>
    apiPost<{ message: string }>(`/v1/projects/${projectId}/backlinks/refresh`),

  // 获取引荐域名
  getReferringDomains: (projectId: string, params?: { page?: number; pageSize?: number; sort?: string }) =>
    apiGet<{ data: ReferringDomain[]; total: number }>(`/v1/projects/${projectId}/backlinks/referring-domains`, params),

  // 获取锚文本
  getAnchorText: (projectId: string) =>
    apiGet<AnchorTextResult>(`/v1/projects/${projectId}/backlinks/anchor-text`),

  // 获取新增外链
  getNewBacklinks: (projectId: string) =>
    apiGet<Backlink[]>(`/v1/projects/${projectId}/backlinks/new`),

  // 获取丢失外链
  getLostBacklinks: (projectId: string) =>
    apiGet<Backlink[]>(`/v1/projects/${projectId}/backlinks/lost`),

  // 获取外链差距分析
  getLinkGap: (projectId: string, competitorDomains: string[]) =>
    apiPost<LinkGapResult>(`/v1/projects/${projectId}/backlinks/link-gap`, { competitorDomains }),
};