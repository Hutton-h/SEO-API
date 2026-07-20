import { apiPost } from './api';

export interface PageSpeedScores {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
}

export interface PageSpeedMetrics {
  lcp: { value: number; displayValue: string };
  fid: { value: number; displayValue: string };
  cls: { value: number; displayValue: string };
  tti: { value: number; displayValue: string };
  speedIndex: { value: number; displayValue: string };
}

export interface PageSpeedOpportunity {
  title: string;
  description: string;
  savings: string;
}

export interface PageSpeedResult {
  url: string;
  strategy: string;
  scores: PageSpeedScores;
  metrics: PageSpeedMetrics;
  opportunities: PageSpeedOpportunity[];
}

export const pagespeedAPI = {
  analyze: (data: { url: string; strategy?: 'mobile' | 'desktop' }) =>
    apiPost<PageSpeedResult>('/v1/pagespeed/analyze', data),

  batchAnalyze: (data: { urls: string[]; strategy?: 'mobile' | 'desktop' }) =>
    apiPost<PageSpeedResult[]>('/v1/pagespeed/batch', data),
};