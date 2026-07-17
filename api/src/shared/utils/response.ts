import type { Response } from 'express';

export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface PaginatedData<T = unknown> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginatedResponse<T = unknown> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function success<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200,
): Response<SuccessResponse<T>> {
  const body: SuccessResponse<T> = { success: true, data };
  if (message) {
    body.message = message;
  }
  return res.status(statusCode).json(body);
}

export function paginated<T>(
  res: Response,
  data: T[],
  pagination: { page: number; pageSize: number; total: number },
  message?: string,
): Response<PaginatedResponse<T>> {
  const totalPages = Math.ceil(pagination.total / pagination.pageSize);
  const body: PaginatedResponse<T> = {
    success: true,
    data,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: pagination.total,
      totalPages,
    },
  };
  if (message) {
    body.message = message;
  }
  return res.status(200).json(body);
}

export function error(
  res: Response,
  code: string,
  message: string,
  statusCode: number = 400,
  details?: unknown,
): Response<ErrorResponse> {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  });
}

export function created<T>(
  res: Response,
  data: T,
  message?: string,
): Response<SuccessResponse<T>> {
  return success(res, data, message, 201);
}

export function noContent(res: Response): Response<void> {
  return res.status(204).send();
}

export function notFound(res: Response, message: string = 'Resource not found'): Response<ErrorResponse> {
  return error(res, 'NOT_FOUND', message, 404);
}

export function unauthorized(res: Response, message: string = 'Unauthorized'): Response<ErrorResponse> {
  return error(res, 'UNAUTHORIZED', message, 401);
}

export function forbidden(res: Response, message: string = 'Forbidden'): Response<ErrorResponse> {
  return error(res, 'FORBIDDEN', message, 403);
}

export function badRequest(res: Response, message: string = 'Bad request', details?: unknown): Response<ErrorResponse> {
  return error(res, 'BAD_REQUEST', message, 400, details);
}

export function serverError(res: Response, message: string = 'Internal server error'): Response<ErrorResponse> {
  return error(res, 'INTERNAL_ERROR', message, 500);
}

export default {
  success,
  paginated,
  error,
  created,
  noContent,
  notFound,
  unauthorized,
  forbidden,
  badRequest,
  serverError,
};