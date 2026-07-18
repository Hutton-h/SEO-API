import { apiGet, apiPost } from './api';

export interface DomainHealthData {
  id: string;
  domain: string;
  overallScore: number;
  domainInfo: {
    registrar: string;
    creationDate: string;
    expirationDate: string;
    domainAge: number;
    nameservers: string[];
  };
  sslStatus: {
    valid: boolean;
    issuer: string;
    validFrom: string;
    validTo: string;
    daysRemaining: number;
    status: 'valid' | 'expiring' | 'expired';
  };
  pageSpeed: {
    desktop: { score: number; fcp: number; lcp: number; cls: number; tbt: number };
    mobile: { score: number; fcp: number; lcp: number; cls: number; tbt: number };
  };
  issues: { title: string; description: string; severity: 'critical' | 'warning' | 'info' }[];
  checkedAt: string;
}

export const domainHealthAPI = {
  checkDomain: (domain: string, projectId?: string) =>
    apiPost<DomainHealthData>('/v1/domain-health/check', { domain, projectId }),

  getHealthHistory: (domain: string, projectId?: string) =>
    apiGet<DomainHealthData[]>('/v1/domain-health/history', { domain, projectId }),
};