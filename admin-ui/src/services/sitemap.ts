import { apiGet, apiPost } from './api';

export interface SitemapInfo {
  id: string;
  projectId: string;
  url: string;
  lastGenerated: string | null;
  totalUrls: number;
  xmlContent: string;
  validationStatus: 'valid' | 'warning' | 'error';
  validationErrors: { type: string; message: string; line: number }[];
  validationWarnings: { type: string; message: string; line: number }[];
}

export const sitemapAPI = {
  getSitemapInfo: (projectId: string) =>
    apiGet<SitemapInfo>(`/v1/projects/${projectId}/sitemap`),

  generateSitemap: (projectId: string) =>
    apiPost<SitemapInfo>(`/v1/projects/${projectId}/sitemap/generate`, {}),

  validateSitemap: (projectId: string) =>
    apiPost<{ status: string; errors: any[]; warnings: any[] }>(`/v1/projects/${projectId}/sitemap/validate`, {}),

  downloadSitemap: (projectId: string) =>
    apiGet<{ downloadUrl: string }>(`/v1/projects/${projectId}/sitemap/download`),
};