import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as keywordService from './service.js';
import {
  success, created, notFound, badRequest, paginated,
} from '../../shared/utils/response.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const addKeywordSchema = z.object({
  keyword: z.string().min(1).max(1024),
  language: z.string().max(10).optional().default('en'),
  locationCode: z.number().int().optional().default(0),
});

export const addKeywordsBatchSchema = z.object({
  keywords: z.array(z.string().min(1).max(1024)).min(1).max(100),
  language: z.string().max(10).optional().default('en'),
  locationCode: z.number().int().optional().default(0),
});

export const keywordsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().int().positive()),
  pageSize: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .pipe(z.number().int().min(1).max(100)),
  search: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export async function addKeyword(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const { keyword, language, locationCode } = req.body as z.infer<typeof addKeywordSchema>;

    const record = await keywordService.addKeyword({
      projectId,
      keyword,
      language,
      locationCode,
    });

    created(res, record, 'Keyword added successfully');
  } catch (err) {
    badRequest(res, 'Failed to add keyword', { error: (err as Error).message });
  }
}

export async function addKeywordsBatch(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const { keywords, language, locationCode } = req.body as z.infer<typeof addKeywordsBatchSchema>;

    const results = await Promise.all(
      keywords.map((keyword) =>
        keywordService.addKeyword({
          projectId,
          keyword,
          language,
          locationCode,
        }),
      ),
    );

    created(res, results, `${results.length} keywords added successfully`);
  } catch (err) {
    badRequest(res, 'Failed to add keywords', { error: (err as Error).message });
  }
}

export async function getKeywords(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const { page, pageSize, search } = req.query as unknown as z.infer<
      typeof keywordsQuerySchema
    >;

    const result = await keywordService.getKeywords({
      projectId,
      page,
      pageSize,
      search,
    });

    paginated(res, result.items, { page, pageSize, total: result.total });
  } catch (err) {
    badRequest(res, 'Failed to fetch keywords', { error: (err as Error).message });
  }
}

export async function deleteKeyword(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { keywordId } = req.params;
    const existing = await keywordService.getKeywordById(keywordId);

    if (!existing) {
      notFound(res, 'Keyword not found');
      return;
    }

    await keywordService.deleteKeyword(keywordId);
    success(res, null, 'Keyword deleted successfully');
  } catch (err) {
    badRequest(res, 'Failed to delete keyword', { error: (err as Error).message });
  }
}

export async function importDefaultKeywords(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const result = await keywordService.importDefaultKeywords(projectId);

    success(res, result, `Imported ${result.importedCount} default keywords`);
  } catch (err) {
    badRequest(res, 'Failed to import default keywords', { error: (err as Error).message });
  }
}

export default {
  addKeyword,
  addKeywordsBatch,
  getKeywords,
  deleteKeyword,
  importDefaultKeywords,
};