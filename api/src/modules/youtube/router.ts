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
  res.json({ success: true, data: { videos: [
    { id: '1', title: 'Crane Operation Tutorial - Complete Guide', url: 'https://youtube.com/watch?v=example1', views: 12500, likes: 342, comments: 56, publishedAt: '2026-06-15' },
    { id: '2', title: 'Top 5 Truck Cranes for Construction 2026', url: 'https://youtube.com/watch?v=example2', views: 8900, likes: 215, comments: 43, publishedAt: '2026-05-20' },
    { id: '3', title: 'How to Choose the Right Mobile Crane', url: 'https://youtube.com/watch?v=example3', views: 6700, likes: 178, comments: 29, publishedAt: '2026-07-01' },
  ] } });
});
router.post('/projects/:id/youtube/videos', (req, res) => {
  res.json({ success: true, data: { id: Date.now().toString(), ...req.body }, message: 'Video added' });
});
router.post('/projects/:id/youtube/refresh', (req, res) => {
  res.json({ success: true, data: { message: 'YouTube data refresh initiated' } });
});

export default router;