import { apiPost } from './api';

export interface AIOptimizationRequest {
  url?: string;
  content?: string;
  category?: string;
}

export interface AIOptimizationRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  impact: string;
  effort: string;
  estimatedTrafficIncrease: string;
  steps: string[];
}

export interface AIOptimizationResponse {
  recommendations: AIOptimizationRecommendation[];
  summary?: {
    total: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
    confidence: number;
  };
}

export const aiAPI = {
  optimize: (projectId: string, data: AIOptimizationRequest) =>
    apiPost<AIOptimizationResponse>(`/projects/${projectId}/ai/optimize`, data),
};