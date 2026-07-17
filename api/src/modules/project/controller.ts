import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as projectService from './service.js';
import {
  success, created, notFound, badRequest, paginated,
} from '../../shared/utils/response.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  domain: z.string().min(1).max(512),
  settings: z.record(z.unknown()).optional().default({}),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  domain: z.string().min(1).max(512).optional(),
  settings: z.record(z.unknown()).optional(),
});

export const listProjectsQuerySchema = z.object({
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

export async function createProject(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      badRequest(res, 'User ID is required');
      return;
    }

    const input = req.body as z.infer<typeof createProjectSchema>;
    const record = await projectService.createProject({
      name: input.name,
      domain: input.domain,
      user_id: userId,
      settings: input.settings,
    });

    created(res, record, 'Project created successfully');
  } catch (err) {
    badRequest(res, 'Failed to create project', { error: (err as Error).message });
  }
}

export async function getProjects(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      badRequest(res, 'User ID is required');
      return;
    }

    const { page, pageSize, search } = req.query as unknown as z.infer<
      typeof listProjectsQuerySchema
    >;

    const result = await projectService.getProjectsByUser({
      page,
      pageSize,
      userId,
      search,
    });

    paginated(res, result.items, { page, pageSize, total: result.total });
  } catch (err) {
    badRequest(res, 'Failed to fetch projects', { error: (err as Error).message });
  }
}

export async function getProject(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const record = await projectService.getProjectById(id);

    if (!record) {
      notFound(res, 'Project not found');
      return;
    }

    success(res, record);
  } catch (err) {
    badRequest(res, 'Failed to fetch project', { error: (err as Error).message });
  }
}

export async function updateProject(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const existing = await projectService.getProjectById(id);

    if (!existing) {
      notFound(res, 'Project not found');
      return;
    }

    const input = req.body as z.infer<typeof updateProjectSchema>;
    const record = await projectService.updateProject(id, input);

    success(res, record, 'Project updated successfully');
  } catch (err) {
    badRequest(res, 'Failed to update project', { error: (err as Error).message });
  }
}

export async function deleteProject(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const existing = await projectService.getProjectById(id);

    if (!existing) {
      notFound(res, 'Project not found');
      return;
    }

    await projectService.deleteProject(id);
    success(res, null, 'Project deleted successfully');
  } catch (err) {
    badRequest(res, 'Failed to delete project', { error: (err as Error).message });
  }
}

export default {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
};