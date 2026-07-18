import { apiGet, apiPost, apiPut, apiDelete } from './api';

export interface AlertRule {
  id: string;
  name: string;
  type: 'ranking_drop' | 'traffic_drop' | 'backlink_loss' | 'crawl_error' | 'downtime';
  typeLabel: string;
  threshold: number;
  channel: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AlertHistory {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'critical' | 'warning' | 'info';
  severityColor: string;
  message: string;
  projectName: string;
  acknowledged: boolean;
  createdAt: string;
}

export const alertingAPI = {
  getAlertRules: (params?: { page?: number; pageSize?: number; projectId?: string }) =>
    apiGet<{ data: AlertRule[]; total: number }>('/v1/alerting/rules', params),

  createAlertRule: (data: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>) =>
    apiPost<AlertRule>('/v1/alerting/rules', data),

  updateAlertRule: (id: string, data: Partial<AlertRule>) =>
    apiPut<AlertRule>(`/v1/alerting/rules/${id}`, data),

  deleteAlertRule: (id: string) =>
    apiDelete<void>(`/v1/alerting/rules/${id}`),

  toggleAlertRule: (id: string, enabled: boolean) =>
    apiPut<AlertRule>(`/v1/alerting/rules/${id}/toggle`, { enabled }),

  getAlertHistory: (params?: { page?: number; pageSize?: number; projectId?: string }) =>
    apiGet<{ data: AlertHistory[]; total: number }>('/v1/alerting/history', params),

  acknowledgeAlert: (id: string) =>
    apiPut<AlertHistory>(`/v1/alerting/history/${id}/acknowledge`, {}),

  getAlertSummary: () =>
    apiGet<{ unacknowledged: number; critical: number; warning: number; total: number }>('/v1/alerting/summary'),
};