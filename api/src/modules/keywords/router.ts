import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { success, badRequest } from '../../shared/utils/response.js';
import { db } from '../../shared/database.js';
import * as dataforseo from '../../services/dataforseo.js';
import {
  addKeyword,
  addKeywordsBatch,
  getKeywords,
  deleteKeyword,
  importDefaultKeywords,
  addKeywordSchema,
  addKeywordsBatchSchema,
  keywordsQuerySchema,
} from './controller.js';

const router = Router();

router.use(authMiddleware);

// ---- 基础 CRUD ----
router.post('/projects/:id/keywords', validate({ body: addKeywordSchema }), addKeyword);
router.post('/projects/:id/keywords/batch', validate({ body: addKeywordsBatchSchema }), addKeywordsBatch);
router.get('/projects/:id/keywords', validate({ query: keywordsQuerySchema }), getKeywords);
router.put('/projects/:id/keywords/:keywordId', async (req, res) => {
  try {
    const { keywordId } = req.params;
    const { keyword, language, location_code, tags } = req.body;
    const updateData: Record<string, unknown> = {};
    if (keyword !== undefined) updateData.keyword = keyword;
    if (language !== undefined) updateData.language = language;
    if (location_code !== undefined) updateData.location_code = location_code;
    if (tags !== undefined) updateData.tags = JSON.stringify(tags);

    if (Object.keys(updateData).length === 0) {
      return success(res, { id: keywordId }, 'No changes to update');
    }

    const [updated] = await db('keywords').where('id', keywordId).update(updateData).returning('*');
    if (!updated) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Keyword not found' } });
    }
    success(res, updated, 'Keyword updated');
  } catch (err) {
    badRequest(res, 'Failed to update keyword', { error: (err as Error).message });
  }
});
router.delete('/projects/:id/keywords/:keywordId', deleteKeyword);
router.post('/projects/:id/keywords/import-default', importDefaultKeywords);

// ---- 关键词推荐 (DataForSEO Keyword Ideas) ----
router.post('/projects/:id/keywords/recommend', async (req, res) => {
  try {
    const { topic, count = 20, locationCode = 2840, languageCode = 'en' } = req.body || {};
    const seedKeyword = topic || 'seo';

    const result = await dataforseo.getKeywordIdeas(seedKeyword, locationCode, languageCode);

    if (!result.success || !result.data) {
      return badRequest(res, 'Failed to get keyword recommendations', result.error);
    }

    const suggestions = result.data.slice(0, count).map((item) => ({
      keyword: item.keyword,
      searchVolume: item.search_volume,
      competition: item.competition,
      cpc: item.cpc,
      difficulty: item.keyword_difficulty,
      intent: item.search_intent || 'informational',
      relevanceScore: item.relevance_score,
    }));

    success(res, { suggestions, total: suggestions.length, locationCode, languageCode });
  } catch (err) {
    badRequest(res, 'Failed to get keyword recommendations', { error: (err as Error).message });
  }
});

// ---- 关键词研究 (DataForSEO Search Volume + Related) ----
router.post('/projects/:id/keywords/research', async (req, res) => {
  try {
    const { keyword: kw, locationCode = 2840, languageCode = 'en' } = req.body || {};
    const seedKeyword = kw || 'seo';

    // Fetch search volume for the main keyword
    const volumeResult = await dataforseo.getKeywordSearchVolume([seedKeyword], locationCode, languageCode);

    // Fetch related keyword ideas
    const ideasResult = await dataforseo.getKeywordIdeas(seedKeyword, locationCode, languageCode);

    let overview = {
      searchVolume: 0,
      competition: 0,
      cpc: 0,
      difficulty: 0,
      trend: 'stable' as string,
    };

    if (volumeResult.success && volumeResult.data && volumeResult.data.length > 0) {
      const vol = volumeResult.data[0];
      overview = {
        searchVolume: vol.search_volume,
        competition: vol.competition,
        cpc: vol.cpc,
        difficulty: vol.competition_index,
        trend: vol.monthly_searches && vol.monthly_searches.length >= 2
          ? (vol.monthly_searches[vol.monthly_searches.length - 1].search_volume >
             vol.monthly_searches[vol.monthly_searches.length - 2].search_volume ? 'up' : 'down')
          : 'stable',
      };
    }

    let relatedKeywords: Array<{keyword: string; volume: number; competition: number; cpc: number; difficulty: number}> = [];
    if (ideasResult.success && ideasResult.data) {
      relatedKeywords = ideasResult.data.slice(0, 10).map((item) => ({
        keyword: item.keyword,
        volume: item.search_volume,
        competition: item.competition,
        cpc: item.cpc,
        difficulty: item.keyword_difficulty,
      }));
    }

    // Get seasonal trend from monthly searches
    const seasonalTrend = volumeResult.success && volumeResult.data && volumeResult.data[0]?.monthly_searches
      ? volumeResult.data[0].monthly_searches.map((m) => ({
          month: m.month,
          year: m.year,
          volume: m.search_volume,
        }))
      : [];

    success(res, {
      keyword: seedKeyword,
      overview,
      relatedKeywords,
      seasonalTrend,
      locationCode,
      languageCode,
    });
  } catch (err) {
    badRequest(res, 'Failed to research keyword', { error: (err as Error).message });
  }
});

// ---- 批量导入关键词 ----
router.post('/projects/:id/keywords/batch-import', validate({ body: addKeywordsBatchSchema }), addKeywordsBatch);

// ---- 批量标签 ----
router.put('/projects/:id/keywords/batch-tag', async (req, res) => {
  try {
    const { keywordIds = [], tags = [] } = req.body || {};
    if (keywordIds.length === 0) {
      return success(res, { updated: 0, tags }, 'No keywords to update');
    }

    const updated = await db('keywords')
      .whereIn('id', keywordIds)
      .update({ tags: JSON.stringify(tags) });

    success(res, { updated, tags }, 'Tags updated');
  } catch (err) {
    badRequest(res, 'Failed to update tags', { error: (err as Error).message });
  }
});

// ---- 关键词趋势 (从数据库 ranking 历史获取) ----
router.get('/projects/:id/keywords/:keywordId/trend', async (req, res) => {
  try {
    const { id: projectId, keywordId } = req.params;

    // Get keyword info
    const keyword = await db('keywords').where('id', keywordId).first();
    if (!keyword) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Keyword not found' } });
    }

    // Get ranking history for this keyword
    const rankings = await db('rankings')
      .where('project_id', projectId)
      .where('keyword_id', keywordId)
      .orderBy('check_date', 'asc')
      .select('position', 'check_date', 'search_volume');

    // Get search volume trend from keyword data
    const trend = rankings.map((r: { position: number | null; check_date: string; search_volume: number | null }) => ({
      date: r.check_date,
      position: r.position,
      searchVolume: r.search_volume,
    }));

    success(res, { keyword: (keyword as { keyword: string }).keyword, trend });
  } catch (err) {
    badRequest(res, 'Failed to get keyword trend', { error: (err as Error).message });
  }
});

// ---- 获取 DataForSEO 可用位置列表 ----
router.get('/projects/:id/locations', async (_req, res) => {
  try {
    const result = await dataforseo.getAllAvailableLocations();
    if (!result.success || !result.data) {
      return badRequest(res, 'Failed to fetch locations', result.error);
    }
    success(res, result.data);
  } catch (err) {
    badRequest(res, 'Failed to fetch locations', { error: (err as Error).message });
  }
});

export default router;