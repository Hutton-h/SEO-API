import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import {
  getLocalRankings,
  getGMBProfile,
  compareLocations,
  localRankingsQuerySchema,
  compareLocationsSchema,
} from './controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/projects/:id/local-seo/rankings', validate({ query: localRankingsQuerySchema }), getLocalRankings);
router.post('/projects/:id/local-seo/rankings', (req, res) => {
  res.json({ success: true, data: { id: Date.now().toString(), ...req.body }, message: 'Keyword added' });
});
router.get('/projects/:id/local-seo/gmb-profile', getGMBProfile);
router.post('/projects/:id/local-seo/compare', validate({ body: compareLocationsSchema }), compareLocations);
router.post('/projects/:id/local-seo/refresh', (req, res) => {
  res.json({ success: true, data: { message: 'Local SEO data refresh initiated' } });
});

export default router;