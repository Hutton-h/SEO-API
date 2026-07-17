import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  createProjectSchema,
  updateProjectSchema,
  listProjectsQuerySchema,
} from './controller.js';

const router = Router();

router.use(authMiddleware);

router.post('/', validate({ body: createProjectSchema }), createProject);
router.get('/', validate({ query: listProjectsQuerySchema }), getProjects);
router.get('/:id', getProject);
router.put('/:id', validate({ body: updateProjectSchema }), updateProject);
router.delete('/:id', deleteProject);

export default router;