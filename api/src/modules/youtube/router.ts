import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { success, badRequest } from '../../shared/utils/response.js';
import { db } from '../../shared/database.js';
import { getYouTubeRankings, youtubeQuerySchema } from './controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/projects/:id/youtube/keywords', validate({ query: youtubeQuerySchema }), getYouTubeRankings);
router.post('/projects/:id/youtube/keywords', async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { keyword, language = 'en', locationCode = 2840 } = req.body || {};

    if (!keyword) {
      return badRequest(res, 'Keyword is required');
    }

    const [record] = await db('youtube_keywords')
      .insert({
        project_id: projectId,
        keyword,
        language,
        location_code: locationCode,
      })
      .returning('*');

    success(res, record, 'Keyword added');
  } catch (err) {
    badRequest(res, 'Failed to add YouTube keyword', { error: (err as Error).message });
  }
});
router.get('/projects/:id/youtube/videos', async (req, res) => {
  try {
    const { id: projectId } = req.params;

    const videos = await db('youtube_rankings')
      .where('project_id', projectId)
      .orderBy('check_date', 'desc')
      .limit(50)
      .select('video_id', 'title', 'url', 'views', 'likes', 'comments', 'published_at', 'position');

    if (videos.length === 0) {
      return success(res, { videos: [] });
    }

    const formattedVideos = (videos as Array<{
      video_id: string; title: string; url: string; views: number; likes: number; comments: number; published_at: string; position: number;
    }>).map((v) => ({
      id: v.video_id,
      title: v.title,
      url: v.url,
      views: v.views,
      likes: v.likes,
      comments: v.comments,
      publishedAt: v.published_at,
      position: v.position,
    }));

    success(res, { videos: formattedVideos });
  } catch (err) {
    badRequest(res, 'Failed to fetch YouTube videos', { error: (err as Error).message });
  }
});
router.post('/projects/:id/youtube/videos', async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { videoId, title, url } = req.body || {};

    if (!videoId) {
      return badRequest(res, 'Video ID is required');
    }

    const [record] = await db('youtube_rankings')
      .insert({
        project_id: projectId,
        video_id: videoId,
        title: title || '',
        url: url || `https://youtube.com/watch?v=${videoId}`,
      })
      .returning('*');

    success(res, record, 'Video added');
  } catch (err) {
    badRequest(res, 'Failed to add video', { error: (err as Error).message });
  }
});
router.post('/projects/:id/youtube/refresh', async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const keywords = await db('youtube_keywords')
      .where('project_id', projectId)
      .select('keyword');

    success(res, { refreshed: keywords.length, message: 'YouTube data refresh initiated' });
  } catch (err) {
    badRequest(res, 'Failed to refresh YouTube data', { error: (err as Error).message });
  }
});

export default router;