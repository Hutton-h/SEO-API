import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { success, badRequest } from '../../shared/utils/response.js';
import { db } from '../../shared/database.js';
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

// GET /v1/schedule/tasks
router.get('/schedule/tasks', validate({ query: schedulesQuerySchema }), listSchedules);
// POST /v1/schedule/tasks
router.post('/schedule/tasks', validate({ body: createScheduleSchema }), createSchedule);
// PUT /v1/schedule/tasks/:id
router.put('/schedule/tasks/:id', validate({ body: updateScheduleSchema }), updateSchedule);
// DELETE /v1/schedule/tasks/:id
router.delete('/schedule/tasks/:id', deleteSchedule);
// PUT /v1/schedule/tasks/:id/toggle
router.put('/schedule/tasks/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const enabled = req.body?.enabled ?? true;

    const [task] = await db('scheduled_tasks')
      .where('id', id)
      .update({ enabled })
      .returning('*');

    if (!task) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });
    }

    success(res, task, 'Task toggled');
  } catch (err) {
    badRequest(res, 'Failed to toggle task', { error: (err as Error).message });
  }
});
// POST /v1/schedule/tasks/:id/run
router.post('/schedule/tasks/:id/run', runNow);
// POST /v1/schedule/validate-cron
router.post('/schedule/validate-cron', (req, res) => {
  try {
    const expression = (req.body?.expression || req.body?.cron_expression || '').trim();
    const parts = expression.split(/\s+/);

    if (parts.length !== 5) {
      return success(res, { valid: false, expression, nextRuns: [] }, 'Invalid cron expression: must have 5 fields');
    }

    // Validate each field
    const fieldNames = ['minute', 'hour', 'day-of-month', 'month', 'day-of-week'];
    const fieldRanges: [number, number][] = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 7]];

    for (let i = 0; i < 5; i++) {
      const field = parts[i];
      // Allow *, */N, N, N-M, N,M values
      const validPattern = /^(\*|\*\/\d+|\d+(-\d+)?(,\d+(-\d+)?)*)$/;
      if (!validPattern.test(field)) {
        return success(res, { valid: false, expression, nextRuns: [] }, `Invalid cron field: ${fieldNames[i]}="${field}"`);
      }
    }

    // Parse and calculate next 5 runs
    const now = new Date();
    const nextRuns: string[] = [];
    let current = new Date(now);

    // Simple heuristic: generate next 5 daily runs at the specified hour/minute
    const minute = parts[0] === '*' ? 0 : parseInt(parts[0].split(',')[0], 10);
    const hour = parts[1] === '*' ? 0 : parseInt(parts[1].split(',')[0], 10);

    for (let i = 0; i < 5; i++) {
      current = new Date(current);
      current.setHours(hour, minute, 0, 0);
      if (current <= now) {
        current.setDate(current.getDate() + 1);
      }
      nextRuns.push(current.toISOString().replace('T', ' ').slice(0, 19));
      current.setDate(current.getDate() + 1);
    }

    success(res, { valid: true, expression, nextRuns }, 'Cron expression is valid');
  } catch (err) {
    badRequest(res, 'Failed to validate cron expression', { error: (err as Error).message });
  }
});

export default router;