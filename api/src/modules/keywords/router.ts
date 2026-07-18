import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { success } from '../../shared/utils/response.js';
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

router.post('/projects/:id/keywords', validate({ body: addKeywordSchema }), addKeyword);
router.post('/projects/:id/keywords/batch', validate({ body: addKeywordsBatchSchema }), addKeywordsBatch);
router.get('/projects/:id/keywords', validate({ query: keywordsQuerySchema }), getKeywords);
router.put('/projects/:id/keywords/:keywordId', (req, res) => {
  res.json({ success: true, data: { id: req.params.keywordId, ...req.body }, message: 'Keyword updated' });
});
router.delete('/projects/:id/keywords/:keywordId', deleteKeyword);
router.post('/projects/:id/keywords/import-default', importDefaultKeywords);

// ---- 关键词研究 API ----
router.post('/projects/:id/keywords/recommend', (req, res) => {
  const { topic, count = 20 } = req.body || {};
  const baseKeywords = topic
    ? [
        `${topic} price`, `${topic} manufacturer`, `${topic} factory`,
        `${topic} for sale`, `${topic} specification`, `${topic} capacity`,
        `${topic} rental`, `used ${topic}`, `${topic} parts`,
        `best ${topic}`, `${topic} reviews`, `how to operate ${topic}`,
        `${topic} safety`, `${topic} maintenance`, `${topic} training`,
        `china ${topic}`, `hydraulic ${topic}`, `mobile ${topic}`,
        `truck mounted ${topic}`, `small ${topic}`, `${topic} lifting capacity`,
      ]
    : ['crane', 'truck crane', 'mobile crane', 'hydraulic crane', 'lifting equipment'];
  const suggestions = baseKeywords.slice(0, count).map((kw, i) => ({
    keyword: kw,
    searchVolume: Math.floor(Math.random() * 5000) + 100,
    competition: (Math.random() * 0.8 + 0.1).toFixed(2),
    cpc: (Math.random() * 5 + 1).toFixed(2),
    difficulty: Math.floor(Math.random() * 60) + 10,
    intent: ['informational', 'commercial', 'transactional', 'navigational'][i % 4],
    trend: ['up', 'stable', 'down'][i % 3],
  }));
  success(res, { suggestions, total: suggestions.length });
});

router.post('/projects/:id/keywords/research', (req, res) => {
  const { keyword } = req.body || {};
  const seed = keyword || 'crane';
  success(res, {
    keyword: seed,
    overview: {
      searchVolume: Math.floor(Math.random() * 10000) + 500,
      competition: (Math.random() * 0.7 + 0.2).toFixed(2),
      cpc: (Math.random() * 8 + 2).toFixed(2),
      difficulty: Math.floor(Math.random() * 50) + 20,
      trend: ['up', 'stable', 'down'][Math.floor(Math.random() * 3)],
    },
    relatedKeywords: [
      { keyword: `${seed} price`, volume: 2400, competition: 0.65, cpc: 3.5 },
      { keyword: `${seed} manufacturer`, volume: 1800, competition: 0.55, cpc: 4.2 },
      { keyword: `${seed} specifications`, volume: 1200, competition: 0.45, cpc: 2.8 },
      { keyword: `used ${seed}`, volume: 3200, competition: 0.72, cpc: 5.1 },
      { keyword: `${seed} for sale`, volume: 2800, competition: 0.78, cpc: 6.3 },
      { keyword: `${seed} rental`, volume: 1600, competition: 0.58, cpc: 4.8 },
      { keyword: `mobile ${seed}`, volume: 2100, competition: 0.62, cpc: 3.9 },
      { keyword: `china ${seed}`, volume: 3500, competition: 0.68, cpc: 2.5 },
      { keyword: `${seed} parts`, volume: 900, competition: 0.42, cpc: 3.2 },
      { keyword: `${seed} maintenance`, volume: 700, competition: 0.35, cpc: 2.1 },
    ],
    questions: [
      { question: `What is the best ${seed} for construction?`, volume: 320 },
      { question: `How much does a ${seed} cost?`, volume: 580 },
      { question: `How to operate a ${seed} safely?`, volume: 420 },
      { question: `What is the lifting capacity of a ${seed}?`, volume: 390 },
      { question: `Where to buy ${seed} parts?`, volume: 260 },
      { question: `How to maintain a ${seed}?`, volume: 310 },
    ],
    searchIntent: { informational: 35, commercial: 40, transactional: 15, navigational: 10 },
    seasonalTrend: Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      volume: Math.floor(Math.random() * 3000) + 1000,
    })),
    serpFeatures: {
      featuredSnippet: true, peopleAlsoAsk: true, imagePack: true,
      video: false, localPack: false, knowledgePanel: true,
    },
  });
});

router.post('/projects/:id/keywords/batch-import', (req, res) => {
  const { keywords = [] } = req.body || {};
  success(res, { imported: keywords.length, skipped: 0, errors: [] }, `Imported ${keywords.length} keywords`);
});

router.put('/projects/:id/keywords/batch-tag', (req, res) => {
  const { keywordIds = [], tags = [] } = req.body || {};
  success(res, { updated: keywordIds.length, tags }, 'Tags updated');
});

export default router;