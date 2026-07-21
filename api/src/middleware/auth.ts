// ============================================================================
// JWT 认证中间件
// 验证 Bearer Token，提取用户信息挂载到 req.user
// ============================================================================

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config.js';
import { UnauthorizedError } from '../errors.js';

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedError('Missing authorization header');
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedError('Invalid authorization format. Expected: Bearer <token>');
    }

    const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      next(error);
      return;
    }
    if (error.name === 'TokenExpiredError') {
      next(new UnauthorizedError('Token expired'));
      return;
    }
    if (error.name === 'JsonWebTokenError') {
      next(new UnauthorizedError('Invalid token'));
      return;
    }
    next(error);
  }
}

/**
 * 可选认证：不强制要求 token，但有则解析
 */
export function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      next();
      return;
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      next();
      return;
    }

    const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    // 可选认证，忽略错误
  }
  next();
}