import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// 统一响应工具
// ============================================================================

export interface ResponseMeta {
  requestId: string;
  timestamp: string;
  [key: string]: unknown;
}

export interface SuccessBody<T = unknown> {
  success: true;
  data: T;
  meta: ResponseMeta;
}

export interface ErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: ResponseMeta;
}

/**
 * 成功响应
 */
export function successResponse<T>(data: T, meta?: Partial<ResponseMeta>): SuccessBody<T> {
  return {
    success: true,
    data,
    meta: {
      requestId: meta?.requestId ?? uuidv4(),
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

/**
 * 错误响应
 */
export function errorResponse(
  code: string,
  message: string,
  details?: unknown,
  meta?: Partial<ResponseMeta>,
): ErrorBody {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
    meta: {
      requestId: meta?.requestId ?? uuidv4(),
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

/**
 * 分页响应
 */
export interface PaginatedData<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  meta?: Partial<ResponseMeta>,
): SuccessBody<PaginatedData<T>> {
  return successResponse(
    {
      items: data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    meta,
  );
}