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

export const backlinkAPI = {
  // 获取外链列表
  getBacklinks: (projectId: string, params?: {
    page?: number;
    pageSize?: number;
    type?: string;
    status?: string;
  }) => apiGet<{ data: Backlink[]; total: number }>(
    `/projects/${projectId}/backlinks`,
    params
  ),

  // 获取外链统计
  getBacklinkStats: (projectId: string) =>
    apiGet<BacklinkStats>(`/projects/${projectId}/backlinks/stats`),

  // 刷新外链数据
  refreshBacklinks: (projectId: string) =>
    apiPost<{ message: string }>(`/projects/${projectId}/backlinks/refresh`),
};