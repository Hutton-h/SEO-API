// ============================================================================
// 全局错误处理中间件
// ============================================================================

import type { Request, Response, NextFunction } from 'express';
import {
  AppError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  CircuitOpenError,
  UnauthorizedError,
  ForbiddenError,
} from '../errors.js';
import { errorResponse } from '../response.js';
import logger from '../logger.js';

export function errorHandlerMiddleware(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const requestId = req.requestId;

  // 确定状态码和错误码
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    if (err instanceof ValidationError) {
      errorCode = 'VALIDATION_ERROR';
    } else if (err instanceof NotFoundError) {
      errorCode = 'NOT_FOUND';
    } else if (err instanceof RateLimitError) {
      errorCode = 'RATE_LIMIT';
      res.setHeader('Retry-After', err.retryAfter);
    } else if (err instanceof CircuitOpenError) {
      errorCode = 'CIRCUIT_OPEN';
      res.setHeader('Retry-After', err.retryAfter);
    } else if (err instanceof UnauthorizedError) {
      errorCode = 'UNAUTHORIZED';
    } else if (err instanceof ForbiddenError) {
      errorCode = 'FORBIDDEN';
    }
  }

  // 记录日志
  if (statusCode >= 500) {
    logger.error({
      requestId,
      method: req.method,
      url: req.originalUrl,
      error: err.message,
      stack: err.stack?.split('\n').slice(1, 4).join('\n'),
    }, `[Error] ${err.message}`);
  } else {
    logger.warn({
      requestId,
      method: req.method,
      url: req.originalUrl,
      error: err.message,
    }, `[Error] ${statusCode} ${err.message}`);
  }

  // 发送响应
  res.status(statusCode).json(
    errorResponse(
      errorCode,
      err.message,
      err instanceof ValidationError ? err.details : undefined,
      { requestId },
    ),
  );
}