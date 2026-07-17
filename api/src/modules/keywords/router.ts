import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
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
router.delete('/projects/:id/keywords/:keywordId', deleteKeyword);
router.post('/projects/:id/keywords/import-defaults', importDefaultKeywords);

export default router;