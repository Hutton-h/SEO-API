import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import config from '../config.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MajesticResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface BacklinkDataItem {
  domain: string;
  trustFlow: number;
  citationFlow: number;
  backlinks: number;
  referringDomains: number;
  referringIPs: number;
  referringSubnets: number;
}

export interface TrustFlowData {
  domain: string;
  trustFlow: number;
  topicalTrustFlow_Topic_0?: string;
  topicalTrustFlow_Value_0?: number;
  topicalTrustFlow_Topic_1?: string;
  topicalTrustFlow_Value_1?: number;
  topicalTrustFlow_Topic_2?: string;
  topicalTrustFlow_Value_2?: number;
}

export interface CitationFlowData {
  domain: string;
  citationFlow: number;
}

export interface TopicalTrustFlowItem {
  topic: string;
  value: number;
}

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

const client: AxiosInstance = axios.create({
  baseURL: config.majestic.baseUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.majestic.apiKey}`,
  },
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function handleSuccess<T>(data: T): MajesticResult<T> {
  return { success: true, data };
}

function handleError(err: unknown): MajesticResult<never> {
  if (axios.isAxiosError(err)) {
    return {
      success: false,
      error: {
        code: 'MAJESTIC_REQUEST_FAILED',
        message: err.message,
        details: {
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data,
        },
      },
    };
  }
  return {
    success: false,
    error: {
      code: 'MAJESTIC_UNKNOWN_ERROR',
      message: err instanceof Error ? err.message : 'Unknown error',
    },
  };
}

// ---------------------------------------------------------------------------
// API Methods
// ---------------------------------------------------------------------------

export async function getBacklinkData(
  domain: string,
  limit: number = 100,
): Promise<MajesticResult<BacklinkDataItem>> {
  try {
    const response: AxiosResponse = await client.get('/json', {
      params: {
        app_api_key: config.majestic.apiKey,
        cmd: 'GetIndexItemInfo',
        items: 1,
        item0: domain,
        datasource: 'fresh',
      },
    });

    const raw = (response.data as Record<string, unknown>)?.['DataTables'] as Record<string, unknown> | undefined;
    const rows = raw?.['Results'] as Record<string, unknown> | undefined;
    const dataRow = (rows?.['Data'] as unknown[])?.[0] as Record<string, unknown> | undefined ?? {};

    const data: BacklinkDataItem = {
      domain,
      trustFlow: (dataRow['TrustFlow'] as number) ?? 0,
      citationFlow: (dataRow['CitationFlow'] as number) ?? 0,
      backlinks: (dataRow['ExtBackLinks'] as number) ?? 0,
      referringDomains: (dataRow['RefDomains'] as number) ?? 0,
      referringIPs: (dataRow['RefIPs'] as number) ?? 0,
      referringSubnets: (dataRow['RefSubNets'] as number) ?? 0,
    };

    return handleSuccess(data);
  } catch (err) {
    return handleError(err);
  }
}

export async function getTrustFlow(
  domain: string,
): Promise<MajesticResult<TrustFlowData>> {
  try {
    const response: AxiosResponse = await client.get('/json', {
      params: {
        app_api_key: config.majestic.apiKey,
        cmd: 'GetIndexItemInfo',
        items: 1,
        item0: domain,
        datasource: 'fresh',
      },
    });

    const raw = (response.data as Record<string, unknown>)?.['DataTables'] as Record<string, unknown> | undefined;
    const rows = raw?.['Results'] as Record<string, unknown> | undefined;
    const dataRow = (rows?.['Data'] as unknown[])?.[0] as Record<string, unknown> | undefined ?? {};

    const data: TrustFlowData = {
      domain,
      trustFlow: (dataRow['TrustFlow'] as number) ?? 0,
      topicalTrustFlow_Topic_0: dataRow['TopicalTrustFlow_Topic_0'] as string | undefined,
      topicalTrustFlow_Value_0: dataRow['TopicalTrustFlow_Value_0'] as number | undefined,
      topicalTrustFlow_Topic_1: dataRow['TopicalTrustFlow_Topic_1'] as string | undefined,
      topicalTrustFlow_Value_1: dataRow['TopicalTrustFlow_Value_1'] as number | undefined,
      topicalTrustFlow_Topic_2: dataRow['TopicalTrustFlow_Topic_2'] as string | undefined,
      topicalTrustFlow_Value_2: dataRow['TopicalTrustFlow_Value_2'] as number | undefined,
    };

    return handleSuccess(data);
  } catch (err) {
    return handleError(err);
  }
}

export async function getCitationFlow(
  domain: string,
): Promise<MajesticResult<CitationFlowData>> {
  try {
    const response: AxiosResponse = await client.get('/json', {
      params: {
        app_api_key: config.majestic.apiKey,
        cmd: 'GetIndexItemInfo',
        items: 1,
        item0: domain,
        datasource: 'fresh',
      },
    });

    const raw = (response.data as Record<string, unknown>)?.['DataTables'] as Record<string, unknown> | undefined;
    const rows = raw?.['Results'] as Record<string, unknown> | undefined;
    const dataRow = (rows?.['Data'] as unknown[])?.[0] as Record<string, unknown> | undefined ?? {};

    const data: CitationFlowData = {
      domain,
      citationFlow: (dataRow['CitationFlow'] as number) ?? 0,
    };

    return handleSuccess(data);
  } catch (err) {
    return handleError(err);
  }
}

export async function getTopicalTrustFlow(
  domain: string,
): Promise<MajesticResult<TopicalTrustFlowItem[]>> {
  try {
    const response: AxiosResponse = await client.get('/json', {
      params: {
        app_api_key: config.majestic.apiKey,
        cmd: 'GetIndexItemInfo',
        items: 1,
        item0: domain,
        datasource: 'fresh',
      },
    });

    const raw = (response.data as Record<string, unknown>)?.['DataTables'] as Record<string, unknown> | undefined;
    const rows = raw?.['Results'] as Record<string, unknown> | undefined;
    const dataRow = (rows?.['Data'] as unknown[])?.[0] as Record<string, unknown> | undefined ?? {};

    const topics: TopicalTrustFlowItem[] = [];

    for (let i = 0; i < 3; i++) {
      const topic = dataRow[`TopicalTrustFlow_Topic_${i}`] as string | undefined;
      const value = dataRow[`TopicalTrustFlow_Value_${i}`] as number | undefined;
      if (topic && value !== undefined) {
        topics.push({ topic, value });
      }
    }

    return handleSuccess(topics);
  } catch (err) {
    return handleError(err);
  }
}

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export default {
  getBacklinkData,
  getTrustFlow,
  getCitationFlow,
  getTopicalTrustFlow,
};