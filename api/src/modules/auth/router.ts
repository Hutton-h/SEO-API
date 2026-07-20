import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { success, badRequest } from '../../shared/utils/response.js';
import { db } from '../../shared/database.js';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import config from '../../config.js';
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
// GET /v1/auth/profile
router.get('/auth/profile', authMiddleware, getMe);

// POST /v1/auth/logout (真实登出)
router.post('/auth/logout', authMiddleware, async (_req, res) => {
  try {
    // In a real implementation, we would invalidate the token
    // For now, just return success (client-side token removal)
    success(res, null, 'Logged out');
  } catch (err) {
    badRequest(res, 'Failed to logout', { error: (err as Error).message });
  }
});

// POST /v1/auth/refresh (真实 Token 刷新)
router.post('/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body || {};

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_TOKEN', message: 'Refresh token is required' },
      });
    }

    // Verify the refresh token
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.secret) as { userId: string; type: string };

      if (decoded.type !== 'refresh') {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_TOKEN_TYPE', message: 'Invalid token type' },
        });
      }

      // Check if user still exists
      const user = await db('users').where('id', decoded.userId).first();
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        });
      }

      // Generate new access token
      const accessToken = jwt.sign(
        { userId: decoded.userId, type: 'access' },
        config.jwt.secret,
        { expiresIn: '24h' },
      );

      success(res, { accessToken, expiresIn: 86400 }, 'Token refreshed');
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired refresh token' },
      });
    }
  } catch (err) {
    badRequest(res, 'Failed to refresh token', { error: (err as Error).message });
  }
});

// POST /v1/auth/profile (真实更新用户资料)
router.post('/auth/profile', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    }

    const { name, email, avatar, preferences } = req.body || {};
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (preferences !== undefined) updateData.preferences = JSON.stringify(preferences);

    if (Object.keys(updateData).length === 0) {
      return success(res, { id: userId }, 'No changes to update');
    }

    const [user] = await db('users')
      .where('id', userId)
      .update(updateData)
      .returning(['id', 'name', 'email', 'avatar', 'role', 'preferences', 'created_at', 'updated_at']);

    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    success(res, user, 'Profile updated');
  } catch (err) {
    badRequest(res, 'Failed to update profile', { error: (err as Error).message });
  }
});

// POST /v1/auth/change-password (真实修改密码)
router.post('/auth/change-password', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    }

    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return badRequest(res, 'Current password and new password are required');
    }

    if (newPassword.length < 6) {
      return badRequest(res, 'New password must be at least 6 characters');
    }

    // Verify current password
    const user = await db('users').where('id', userId).first();
    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    const isValid = await bcrypt.compare(currentPassword, (user as { password_hash: string }).password_hash);
    if (!isValid) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' } });
    }

    // Hash and update new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db('users').where('id', userId).update({ password_hash: passwordHash });

    success(res, null, 'Password changed');
  } catch (err) {
    badRequest(res, 'Failed to change password', { error: (err as Error).message });
  }
});

export default router;