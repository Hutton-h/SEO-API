import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { success } from '../../shared/utils/response.js';
import {
  login,
  register,
  getMe,
  loginSchema,
  registerSchema,
} from './controller.js';

const router = Router();

// POST /v1/auth/login
router.post('/auth/login', validate({ body: loginSchema }), login);
// POST /v1/auth/register
router.post('/auth/register', validate({ body: registerSchema }), register);
// GET /v1/auth/profile (was /auth/me)
router.get('/auth/profile', authMiddleware, getMe);
// POST /v1/auth/logout
router.post('/auth/logout', authMiddleware, (_req, res, _next) => {
  success(res, null, 'Logged out');
});
// POST /v1/auth/refresh
router.post('/auth/refresh', authMiddleware, (_req, res, _next) => {
  success(res, { token: 'refreshed-token-stub', expiresIn: 86400 }, 'Token refreshed');
});
// POST /v1/auth/profile
router.post('/auth/profile', authMiddleware, (_req, res, _next) => {
  success(res, { ..._req.body }, 'Profile updated');
});
// POST /v1/auth/change-password
router.post('/auth/change-password', authMiddleware, (_req, res, _next) => {
  success(res, null, 'Password changed');
});

export default router;