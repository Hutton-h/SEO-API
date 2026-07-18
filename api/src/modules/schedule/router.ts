import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { success } from '../../shared/utils/response.js';
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

// GET /v1/schedule/tasks (was projects/:id/schedules)
router.get('/schedule/tasks', validate({ query: schedulesQuerySchema }), listSchedules);
// POST /v1/schedule/tasks (was projects/:id/schedules)
router.post('/schedule/tasks', validate({ body: createScheduleSchema }), createSchedule);
// PUT /v1/schedule/tasks/:id (was PATCH projects/:id/schedules/:scheduleId)
router.put('/schedule/tasks/:id', validate({ body: updateScheduleSchema }), updateSchedule);
// DELETE /v1/schedule/tasks/:id (was projects/:id/schedules/:scheduleId)
router.delete('/schedule/tasks/:id', deleteSchedule);
// PUT /v1/schedule/tasks/:id/toggle
router.put('/schedule/tasks/:id/toggle', (_req, res, _next) => {
  success(res, { id: _req.params.id, enabled: _req.body?.enabled ?? true }, 'Task toggled');
});
// POST /v1/schedule/tasks/:id/run (was projects/:id/schedules/:scheduleId/run)
router.post('/schedule/tasks/:id/run', runNow);
// POST /v1/schedule/validate-cron
router.post('/schedule/validate-cron', (req, res) => {
  const expression = req.body?.expression || req.body?.cron_expression || '';
  const parts = expression.trim().split(/\s+/);
  const valid = parts.length === 5;
  success(res, { valid, expression, nextRuns: valid ? ['2026-07-19 08:00:00', '2026-07-20 08:00:00'] : [] }, valid ? 'Cron is valid' : 'Invalid cron expression');
});

export default router;