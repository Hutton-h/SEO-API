import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import {
  login,
  register,
  getMe,
  loginSchema,
  registerSchema,
} from './controller.js';

const router = Router();

router.post('/auth/login', validate({ body: loginSchema }), login);
router.post('/auth/register', validate({ body: registerSchema }), register);
router.get('/auth/me', authMiddleware, getMe);

export default router;