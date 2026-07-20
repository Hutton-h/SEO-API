import { apiPost } from './api';

export interface BulkDomainItem {
  domain: string;
  totalKeywords: number;
  estimatedTraffic: number;
  backlinks: number;
  referringDomains: number;
  domainAuthority?: number;
  topKeyword: string;
  topKeywordVolume: number;
}

export interface BulkDomainResult {
  domains: BulkDomainItem[];
  analyzedAt: string;
}

export const bulkAnalysisAPI = {
  bulkAnalyzeDomains: (data: { domains: string[]; locationCode?: number }) =>
    apiPost<BulkDomainResult>('/v1/bulk-analysis/domains', data),
};