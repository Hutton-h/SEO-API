import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { getYouTubeRankings, youtubeQuerySchema } from './controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/projects/:id/youtube/keywords', validate({ query: youtubeQuerySchema }), getYouTubeRankings);
router.post('/projects/:id/youtube/keywords', (req, res) => {
  res.json({ success: true, data: { id: Date.now().toString(), ...req.body }, message: 'Keyword added' });
});
router.get('/projects/:id/youtube/videos', (req, res) => {
  res.json({ success: true, data: { videos: [] } });
});
router.post('/projects/:id/youtube/videos', (req, res) => {
  res.json({ success: true, data: { id: Date.now().toString(), ...req.body }, message: 'Video added' });
});
router.post('/projects/:id/youtube/refresh', (req, res) => {
  res.json({ success: true, data: { message: 'YouTube data refresh initiated' } });
});

export default router;