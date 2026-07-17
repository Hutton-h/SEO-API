import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as aiService from './service.js';
import { success, badRequest } from '../../shared/utils/response.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const optimizeContentSchema = z.object({
  pageUrl: z.string().url().optional(),
  keyword: z.string().min(1).optional(),
  content: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export async function optimizeContent(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const { pageUrl, keyword, content } = req.body as z.infer<typeof optimizeContentSchema>;

    const result = await aiService.optimizeContent(projectId, {
      pageUrl,
      keyword,
      content,
    });

    success(res, result, 'AI optimization completed');
  } catch (err) {
    badRequest(res, 'Failed to optimize content', { error: (err as Error).message });
  }
}

export default {
  optimizeContent,
};