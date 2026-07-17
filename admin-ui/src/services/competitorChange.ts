import { apiGet, apiPost } from './api';

export interface CompetitorChange {
  id: string;
  competitorName: string;
  competitorUrl: string;
  pageUrl: string;
  field: string;
  oldValue: string;
  newValue: string;
  changeType: 'added' | 'modified' | 'removed';
  detectedAt: string;
  projectId: string;
}

export interface ChangeDistribution {
  type: string;
  count: number;
}

export const competitorChangeAPI = {
  getChanges: (params?: { page?: number; pageSize?: number; projectId?: string }) =>
    apiGet<{ data: CompetitorChange[]; total: number }>('/v1/competitor-changes', params),

  runDetection: (projectId: string) =>
    apiPost<{ success: boolean; changesDetected: number; message: string }>('/v1/competitor-changes/detect', { projectId }),

  getChangeDistribution: (projectId: string) =>
    apiGet<ChangeDistribution[]>(`/v1/competitor-changes/distribution/${projectId}`),
};