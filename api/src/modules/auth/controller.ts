import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from './service.js';
import { success, badRequest, unauthorized } from '../../shared/utils/response.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(100),
  name: z.string().min(1).max(100),
});

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export async function login(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const data = req.body as z.infer<typeof loginSchema>;

    const result = await authService.login(data);
    success(res, result, 'Login successful');
  } catch (err) {
    const message = (err as Error).message;
    if (message === 'Invalid email or password') {
      unauthorized(res, message);
      return;
    }
    badRequest(res, 'Login failed', { error: message });
  }
}

export async function register(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const data = req.body as z.infer<typeof registerSchema>;

    const result = await authService.register(data);
    success(res, result, 'Registration successful');
  } catch (err) {
    badRequest(res, 'Registration failed', { error: (err as Error).message });
  }
}

export async function getMe(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      unauthorized(res, 'Authentication required');
      return;
    }

    const user = await authService.getMe(userId);
    if (!user) {
      unauthorized(res, 'User not found');
      return;
    }
    success(res, user);
  } catch (err) {
    badRequest(res, 'Failed to get user profile', { error: (err as Error).message });
  }
}

export default {
  login,
  register,
  getMe,
};