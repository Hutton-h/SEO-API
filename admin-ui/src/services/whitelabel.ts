import { apiGet, apiPut, apiPost } from './api';

export interface WhiteLabelConfig {
  id: string;
  brandName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  customDomain: string;
  faviconUrl: string;
  footerText: string;
  enabled: boolean;
  updatedAt: string;
}

export const whitelabelAPI = {
  getConfig: () =>
    apiGet<WhiteLabelConfig>('/v1/whitelabel/config'),

  updateConfig: (data: Partial<WhiteLabelConfig>) =>
    apiPut<WhiteLabelConfig>('/v1/whitelabel/config', data),

  uploadLogo: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiPost<{ url: string }>('/v1/whitelabel/upload-logo', formData);
  },

  verifyDomain: (domain: string) =>
    apiPost<{ valid: boolean; dnsConfigured: boolean; sslConfigured: boolean }>('/v1/whitelabel/verify-domain', { domain }),
};