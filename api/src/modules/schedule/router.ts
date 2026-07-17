import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import {
  createSchedule,
  listSchedules,
  updateSchedule,
  deleteSchedule,
  runNow,
  createScheduleSchema,
  updateScheduleSchema,
  schedulesQuerySchema,
} from './controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/projects/:id/schedules', validate({ query: schedulesQuerySchema }), listSchedules);
router.post('/projects/:id/schedules', validate({ body: createScheduleSchema }), createSchedule);
router.patch('/projects/:id/schedules/:scheduleId', validate({ body: updateScheduleSchema }), updateSchedule);
router.delete('/projects/:id/schedules/:scheduleId', deleteSchedule);
router.post('/projects/:id/schedules/:scheduleId/run', runNow);

export default router;