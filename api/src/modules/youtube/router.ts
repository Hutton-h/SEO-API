import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { getYouTubeRankings, youtubeQuerySchema } from './controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/projects/:id/youtube/rankings', validate({ query: youtubeQuerySchema }), getYouTubeRankings);

export default router;