import { apiGet, apiPut } from './api';

export interface ApiUsageStats {
  totalCalls: number;
  totalCost: number;
  dailyAvgCalls: number;
  estimatedMonthlyCost: number;
  lastMonthCost: number;
  costChange: number;
}

export interface ServiceUsage {
  service: string;
  calls: number;
  cost: number;
  unitPrice: number;
  percentage: number;
}

export interface DailyUsage {
  date: string;
  calls: number;
  cost: number;
}

export interface UsageAlert {
  threshold: number;
  enabled: boolean;
  notifyChannels: string[];
}

export const apiUsageAPI = {
  getStats: () =>
    apiGet<ApiUsageStats>('/v1/api-usage/stats'),

  getServiceBreakdown: (params?: { month?: string }) =>
    apiGet<ServiceUsage[]>('/v1/api-usage/breakdown', params),

  getDailyUsage: (params?: { month?: string }) =>
    apiGet<DailyUsage[]>('/v1/api-usage/daily', params),

  getUsageAlert: () =>
    apiGet<UsageAlert>('/v1/api-usage/alert-config'),

  updateUsageAlert: (data: Partial<UsageAlert>) =>
    apiPut<UsageAlert>('/v1/api-usage/alert-config', data),
};