import { apiGet, apiPost } from './api';

export interface ROIData {
  id: string;
  month: string;
  seoCost: number;
  apiCost: number;
  toolCost: number;
  estimatedTrafficValue: number;
  conversionValue: number;
  roi: number;
  roiPercent: number;
}

export interface ROIInput {
  month: string;
  seoCost: number;
  estimatedTrafficValue: number;
  conversionValue: number;
}

export interface ROISummary {
  totalCost: number;
  totalValue: number;
  overallROI: number;
  averageMonthlyROI: number;
  bestMonth: string;
  worstMonth: string;
  apiCostBreakdown: { service: string; cost: number }[];
}

export const roiAPI = {
  getROIData: (params?: { year?: number }) =>
    apiGet<ROIData[]>('/v1/roi/data', params),

  getROISummary: () =>
    apiGet<ROISummary>('/v1/roi/summary'),

  addROIEntry: (data: ROIInput) =>
    apiPost<ROIData>('/v1/roi/entry', data),

  getApiCostSummary: () =>
    apiGet<{ service: string; cost: number; calls: number }[]>('/v1/roi/api-costs'),
};