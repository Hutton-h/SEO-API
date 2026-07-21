// ============================================================================
// Crane SEO Platform — 错误类体系
// ============================================================================

/**
 * 基础应用错误
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * 参数校验错误 (422)
 */
export class ValidationError extends AppError {
  public readonly details: unknown[];

  constructor(message: string = 'Validation failed', details: unknown[] = []) {
    super(message, 422);
    this.name = 'ValidationError';
    this.details = details;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 资源未找到 (404)
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * 限流错误 (429)
 */
export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(message: string = 'Too many requests', retryAfter: number = 60) {
    super(message, 429);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * 熔断器打开 (503)
 */
export class CircuitOpenError extends AppError {
  public readonly provider: string;
  public readonly retryAfter: number;

  constructor(provider: string, retryAfter: number = 60) {
    super(`Circuit breaker open for provider: ${provider}`, 503);
    this.name = 'CircuitOpenError';
    this.provider = provider;
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, CircuitOpenError.prototype);
  }
}

/**
 * 未授权 (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * 禁止访问 (403)
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * 提供商未实现 (501)
 */
export class NotImplementedError extends AppError {
  public readonly provider: string;
  public readonly method: string;

  constructor(provider: string, method: string) {
    super(`${provider} does not implement ${method}`, 501);
    this.name = 'NotImplementedError';
    this.provider = provider;
    this.method = method;
    Object.setPrototypeOf(this, NotImplementedError.prototype);
  }
}