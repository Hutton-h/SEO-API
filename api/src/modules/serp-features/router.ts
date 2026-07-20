import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { success, badRequest } from '../../shared/utils/response.js';
import { db } from '../../shared/database.js';
import * as dataforseo from '../../services/dataforseo.js';
import {
  getSerpFeatures,
  serpFeaturesQuerySchema,
} from './controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/projects/:id/serp-features', validate({ query: serpFeaturesQuerySchema }), getSerpFeatures);
router.post('/projects/:id/serp-features', async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { keyword, languageCode = 'en', locationCode = 2840 } = req.body || {};

    if (!keyword) {
      return badRequest(res, 'Keyword is required');
    }

    const [record] = await db('serp_feature_keywords')
      .insert({
        project_id: projectId,
        keyword,
        language_code: languageCode,
        location_code: locationCode,
      })
      .returning('*');

    success(res, record, 'Keyword added');
  } catch (err) {
    badRequest(res, 'Failed to add SERP features keyword', { error: (err as Error).message });
  }
});
router.get('/projects/:id/serp-features/:featureKey', async (req, res) => {
  try {
    const { id: projectId, featureKey } = req.params;
    const { keyword, locationCode = '2840', languageCode = 'en' } = req.query as Record<string, string>;

    if (!keyword) {
      return badRequest(res, 'Keyword query parameter is required');
    }

    const result = await dataforseo.getSerpFeatures(
      keyword,
      parseInt(locationCode, 10),
      languageCode,
    );

    if (!result.success || !result.data) {
      return badRequest(res, 'Failed to fetch SERP features', result.error);
    }

    const features = result.data.features;
    let featureData: unknown = null;

    switch (featureKey) {
      case 'featured_snippet':
        featureData = features.featured_snippet;
        break;
      case 'knowledge_graph':
        featureData = features.knowledge_graph;
        break;
      case 'people_also_ask':
        featureData = features.people_also_ask;
        break;
      case 'video_carousel':
        featureData = features.video_carousel;
        break;
      case 'local_pack':
        featureData = features.local_pack;
        break;
      default:
        featureData = features;
    }

    success(res, { featureKey, featureData, totalResults: result.data.total_results });
  } catch (err) {
    badRequest(res, 'Failed to fetch SERP feature details', { error: (err as Error).message });
  }
});

export default router;