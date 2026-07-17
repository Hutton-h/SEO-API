import { apiGet } from './api';

export interface SerpFeature {
  keyword: string;
  featuredSnippet: boolean;
  knowledgeGraph: boolean;
  peopleAlsoAsk: boolean;
  videoCarousel: boolean;
  localPack: boolean;
  imagePack: boolean;
  topStories: boolean;
  siteLinks: boolean;
  reviewStars: boolean;
}

export interface SerpFeatureStats {
  totalKeywords: number;
  features: {
    name: string;
    key: string;
    count: number;
    percentage: number;
  }[];
}

export const serpFeaturesAPI = {
  getFeatureStats: (projectId: string) =>
    apiGet<SerpFeatureStats>(`/v1/projects/${projectId}/serp-features`),

  getFeatureDetails: (projectId: string, featureKey: string) =>
    apiGet<{ keywords: string[]; total: number }>(`/v1/projects/${projectId}/serp-features/${featureKey}`),
};