import { apiGet, apiPost } from './api';

export interface MonitorStatus {
  id: string;
  name: string;
  url: string;
  status: 'online' | 'offline' | 'degraded';
  responseTime: number;
  lastChecked: string;
  uptime: number;
}

export interface ResponseTimePoint {
  time: string;
  value: number;
}

export interface SLAInfo {
  daily: number;
  weekly: number;
  monthly: number;
  yearly: number;
}

export interface DowntimeRecord {
  id: string;
  serviceName: string;
  startedAt: string;
  endedAt: string;
  duration: number;
  cause: string;
}

export const monitorAPI = {
  getStatusList: () =>
    apiGet<MonitorStatus[]>('/v1/monitor/status'),

  getResponseTimeTrend: (params?: { period?: string; serviceId?: string }) =>
    apiGet<ResponseTimePoint[]>('/v1/monitor/response-time', params),

  getSLAInfo: () =>
    apiGet<SLAInfo>('/v1/monitor/sla'),

  getDowntimeRecords: (params?: { page?: number; pageSize?: number }) =>
    apiGet<{ data: DowntimeRecord[]; total: number }>('/v1/monitor/downtime', params),

  runManualCheck: (serviceId?: string) =>
    apiPost<{ success: boolean; message: string }>('/v1/monitor/check', { serviceId }),
};