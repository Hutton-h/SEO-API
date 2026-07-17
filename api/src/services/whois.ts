// ---------------------------------------------------------------------------
// WhoisJSON API Service
// Uses axios to call https://whoisjson.com/api/v1/whois
// ---------------------------------------------------------------------------

import axios, { type AxiosInstance } from 'axios';
import config from '../config.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DomainInfo {
  domain: string;
  registrar: string;
  createdDate: string;
  expiresDate: string;
  updatedDate: string;
  nameServers: string[];
  status: string[];
  registrant: {
    name: string;
    organization: string;
    email: string;
    country: string;
  };
  domainAge: number; // days
}

export interface DomainAgeResult {
  domain: string;
  ageInDays: number;
  ageInYears: number;
  createdDate: string;
  expiresDate: string;
}

export interface DomainAvailabilityResult {
  domain: string;
  available: boolean;
  premium: boolean;
  price?: string;
}

export interface WhoisResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ---------------------------------------------------------------------------
// Axios client
// ---------------------------------------------------------------------------

const client: AxiosInstance = axios.create({
  baseURL: 'https://whoisjson.com/api/v1',
  timeout: 15000,
  headers: {
    'Authorization': `Bearer ${config.whois.apiKey}`,
    'Content-Type': 'application/json',
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calculateAgeInDays(createdDate: string): number {
  const created = new Date(createdDate);
  const now = new Date();
  const diff = now.getTime() - created.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function calculateAgeInYears(createdDate: string): number {
  const days = calculateAgeInDays(createdDate);
  return Math.round((days / 365) * 10) / 10;
}

// ---------------------------------------------------------------------------
// API Methods
// ---------------------------------------------------------------------------

/**
 * 获取域名详细信息
 * 返回注册商、创建日期、过期日期、域名年龄、名称服务器等
 */
export async function getDomainInfo(
  domain: string,
): Promise<WhoisResult<DomainInfo>> {
  try {
    const response = await client.get('/whois', {
      params: {
        domain,
        format: 'json',
      },
    });

    const data = response.data as {
      domain?: {
        name?: string;
        created_date?: string;
        expires_date?: string;
        updated_date?: string;
        nameservers?: string[];
        status?: string[];
        registrar?: { name?: string };
        registrant_contacts?: Array<{
          name?: string;
          organization?: string;
          email?: string;
          country?: string;
        }>;
      };
    };

    const domainData = data.domain ?? {};
    const registrant = domainData.registrant_contacts?.[0] ?? {};
    const createdDate = domainData.created_date ?? '';

    const info: DomainInfo = {
      domain: domainData.name ?? domain,
      registrar: domainData.registrar?.name ?? 'Unknown',
      createdDate,
      expiresDate: domainData.expires_date ?? '',
      updatedDate: domainData.updated_date ?? '',
      nameServers: domainData.nameservers ?? [],
      status: domainData.status ?? [],
      registrant: {
        name: registrant.name ?? '',
        organization: registrant.organization ?? '',
        email: registrant.email ?? '',
        country: registrant.country ?? '',
      },
      domainAge: calculateAgeInDays(createdDate),
    };

    return { success: true, data: info };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'WHOIS_GET_DOMAIN_INFO_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err,
      },
    };
  }
}

/**
 * 获取域名年龄（天数）
 */
export async function getDomainAge(
  domain: string,
): Promise<WhoisResult<DomainAgeResult>> {
  try {
    const result = await getDomainInfo(domain);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error ?? {
          code: 'WHOIS_GET_DOMAIN_AGE_FAILED',
          message: 'Failed to get domain info',
        },
      };
    }

    const info = result.data;
    const ageResult: DomainAgeResult = {
      domain: info.domain,
      ageInDays: info.domainAge,
      ageInYears: calculateAgeInYears(info.createdDate),
      createdDate: info.createdDate,
      expiresDate: info.expiresDate,
    };

    return { success: true, data: ageResult };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'WHOIS_GET_DOMAIN_AGE_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err,
      },
    };
  }
}

/**
 * 检查域名是否可注册
 */
export async function checkAvailability(
  domain: string,
): Promise<WhoisResult<DomainAvailabilityResult>> {
  try {
    const response = await client.get('/whois', {
      params: {
        domain,
        format: 'json',
        check_availability: 'true',
      },
    });

    const data = response.data as {
      domain?: {
        name?: string;
        available?: boolean;
        premium?: boolean;
        price?: string;
      };
    };

    const domainData = data.domain ?? {};

    const availability: DomainAvailabilityResult = {
      domain: domainData.name ?? domain,
      available: domainData.available ?? false,
      premium: domainData.premium ?? false,
      price: domainData.price,
    };

    return { success: true, data: availability };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'WHOIS_CHECK_AVAILABILITY_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err,
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export const whois = {
  getDomainInfo,
  getDomainAge,
  checkAvailability,
};

export default whois;