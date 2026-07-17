// ---------------------------------------------------------------------------
// Google Indexing API Service
// Uses googleapis package (google.auth.GoogleAuth + indexing/v3)
// ---------------------------------------------------------------------------

import { google, type indexing_v3 } from 'googleapis';
import config from '../config.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IndexingNotificationType = 'URL_UPDATED' | 'URL_DELETED';

export interface IndexingResult {
  success: boolean;
  data?: {
    url: string;
    notificationType: IndexingNotificationType;
    notifyTime: string;
    metadata?: Record<string, unknown>;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface BatchIndexingResult {
  success: boolean;
  data?: {
    results: IndexingResult[];
    total: number;
    succeeded: number;
    failed: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface UrlStatusResult {
  success: boolean;
  data?: {
    url: string;
    status: string;
    lastCrawled?: string;
    lastIndexed?: string;
    coverageState?: string;
    robotsTxtState?: string;
    sitemapState?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ---------------------------------------------------------------------------
// Auth Client
// ---------------------------------------------------------------------------

function createIndexingClient(): indexing_v3.Indexing {
  const auth = new google.auth.GoogleAuth({
    keyFile: config.indexing.serviceAccountKey,
    scopes: ['https://www.googleapis.com/auth/indexing'],
  });

  return google.indexing({
    version: 'v3',
    auth,
  });
}

// ---------------------------------------------------------------------------
// API Methods
// ---------------------------------------------------------------------------

/**
 * 推送 URL 更新通知
 */
export async function notifyUrlUpdate(url: string): Promise<IndexingResult> {
  try {
    const indexing = createIndexingClient();

    const response = await indexing.urlNotifications.publish({
      requestBody: {
        url,
        type: 'URL_UPDATED',
      },
    });

    const data = response.data;

    return {
      success: true,
      data: {
        url: url,
        notificationType: 'URL_UPDATED',
        notifyTime: data.urlNotificationMetadata?.latestUpdate?.notifyTime ?? new Date().toISOString(),
        metadata: data.urlNotificationMetadata as unknown as Record<string, unknown>,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'INDEXING_NOTIFY_UPDATE_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err,
      },
    };
  }
}

/**
 * 推送 URL 删除通知
 */
export async function notifyUrlRemoval(url: string): Promise<IndexingResult> {
  try {
    const indexing = createIndexingClient();

    const response = await indexing.urlNotifications.publish({
      requestBody: {
        url,
        type: 'URL_DELETED',
      },
    });

    const data = response.data;

    return {
      success: true,
      data: {
        url: url,
        notificationType: 'URL_DELETED',
        notifyTime: data.urlNotificationMetadata?.latestUpdate?.notifyTime ?? new Date().toISOString(),
        metadata: data.urlNotificationMetadata as unknown as Record<string, unknown>,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'INDEXING_NOTIFY_REMOVAL_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err,
      },
    };
  }
}

/**
 * 批量推送 URL 通知（每日 200 条限制）
 */
export async function batchNotify(
  urls: string[],
  type: IndexingNotificationType = 'URL_UPDATED',
): Promise<BatchIndexingResult> {
  const results: IndexingResult[] = [];
  let succeeded = 0;
  let failed = 0;

  // Respect daily quota of 200
  const urlsToProcess = urls.slice(0, 200);

  for (const url of urlsToProcess) {
    let result: IndexingResult;

    if (type === 'URL_UPDATED') {
      result = await notifyUrlUpdate(url);
    } else {
      result = await notifyUrlRemoval(url);
    }

    results.push(result);

    if (result.success) {
      succeeded++;
    } else {
      failed++;
    }

    // Rate limiting: 1 request per second to be safe
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return {
    success: true,
    data: {
      results,
      total: urls.length,
      succeeded,
      failed,
    },
  };
}

/**
 * 查询 URL 索引状态
 */
export async function getUrlStatus(url: string): Promise<UrlStatusResult> {
  try {
    const indexing = createIndexingClient();

    const response = await indexing.urlNotifications.getMetadata({
      url,
    });

    const metadata = response.data;

    return {
      success: true,
      data: {
        url,
        status: 'indexed',
        lastCrawled: metadata.latestUpdate?.notifyTime ?? undefined,
        lastIndexed: metadata.latestUpdate?.notifyTime ?? undefined,
      },
    };
  } catch (err) {
    const error = err as { code?: number; message?: string };
    // 404 means URL not submitted to Indexing API
    if (error.code === 404) {
      return {
        success: true,
        data: {
          url,
          status: 'not_submitted',
        },
      };
    }

    return {
      success: false,
      error: {
        code: 'INDEXING_GET_STATUS_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err,
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export const indexing = {
  notifyUrlUpdate,
  notifyUrlRemoval,
  batchNotify,
  getUrlStatus,
};

export default indexing;