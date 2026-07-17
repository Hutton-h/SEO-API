import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { db } from '../../shared/database.js';
import { success, notFound, badRequest } from '../../shared/utils/response.js';

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

async function getTask(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { taskId } = req.params;
    const task = await db('tasks').where('id', taskId).first();

    if (!task) {
      notFound(res, 'Task not found');
      return;
    }

    success(res, task);
  } catch (err) {
    badRequest(res, 'Failed to fetch task', { error: (err as Error).message });
  }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

router.use(authMiddleware);

router.get('/tasks/:taskId', getTask);

export default router;