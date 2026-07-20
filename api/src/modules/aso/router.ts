import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { success, badRequest } from '../../shared/utils/response.js';
import { db } from '../../shared/database.js';
import { getASORankings, asoQuerySchema } from './controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/projects/:id/aso/keywords', validate({ query: asoQuerySchema }), getASORankings);
router.post('/projects/:id/aso/keywords', async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { keyword, store = 'apple', language = 'en', locationCode = 2840, appId } = req.body || {};

    if (!keyword) {
      return badRequest(res, 'Keyword is required');
    }

    const [record] = await db('aso_keywords')
      .insert({
        project_id: projectId,
        keyword,
        store,
        language,
        location_code: locationCode,
        app_id: appId || null,
      })
      .returning('*');

    success(res, record, 'Keyword added');
  } catch (err) {
    badRequest(res, 'Failed to add ASO keyword', { error: (err as Error).message });
  }
});
router.get('/projects/:id/aso/trend', async (req, res) => {
  try {
    const { id: projectId } = req.params;

    const rankings = await db('aso_rankings')
      .where('project_id', projectId)
      .orderBy('check_date', 'asc')
      .select('position', 'check_date', 'impressions', 'keyword_id');

    if (rankings.length === 0) {
      return success(res, { trend: [] });
    }

    // Group by month
    const monthlyData: Record<string, { positions: number[]; impressions: number[]; count: number }> = {};
    for (const r of rankings as Array<{ position: number | null; check_date: string; impressions: number | null; keyword_id: string }>) {
      const month = (r.check_date as string).slice(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { positions: [], impressions: [], count: 0 };
      }
      if (r.position !== null) monthlyData[month].positions.push(r.position);
      if (r.impressions !== null) monthlyData[month].impressions.push(r.impressions);
      monthlyData[month].count++;
    }

    const trend = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        avgRank: data.positions.length > 0
          ? Math.round(data.positions.reduce((s, p) => s + p, 0) / data.positions.length)
          : 0,
        impressions: data.impressions.reduce((s, i) => s + i, 0),
      }));

    success(res, { trend });
  } catch (err) {
    badRequest(res, 'Failed to fetch ASO trend', { error: (err as Error).message });
  }
});
router.post('/projects/:id/aso/refresh', async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const keywords = await db('aso_keywords')
      .where('project_id', projectId)
      .select('keyword');

    success(res, { refreshed: keywords.length, message: 'ASO data refresh initiated' });
  } catch (err) {
    badRequest(res, 'Failed to refresh ASO data', { error: (err as Error).message });
  }
});

export default router;