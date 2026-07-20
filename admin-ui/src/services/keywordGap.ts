import { apiPost } from './api';

export interface KeywordGapResult {
  targetDomain: string;
  competitorDomains: string[];
  missingKeywords: Array<{
    keyword: string;
    searchVolume: number;
    cpc: number;
    competition: string;
    competitorCount: number;
    opportunityScore: number;
  }>;
  sharedKeywords: Array<{ keyword: string; competitorCount: number }>;
  totalMissing: number;
  totalShared: number;
}

export interface DomainIntersectionResult {
  domains: string[];
  commonKeywords: Array<{ keyword: string; searchVolume: number; positions: Record<string, number> }>;
  totalCommon: number;
  vennData: Array<{ domain: string; uniqueKeywords: number; sharedKeywords: number }>;
}

export const keywordGapAPI = {
  analyzeKeywordGap: (data: { targetDomain: string; competitorDomains: string[]; locationCode?: number }) =>
    apiPost<KeywordGapResult>('/v1/keyword-gap', data),

  getDomainIntersection: (data: { domains: string[]; locationCode?: number }) =>
    apiPost<DomainIntersectionResult>('/v1/keyword-gap/intersection', data),
};