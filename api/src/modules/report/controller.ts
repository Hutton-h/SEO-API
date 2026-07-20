import type { Request, Response, NextFunction } from 'express';
import * as reportService from './service.js';
import { success, badRequest, notFound } from '../../shared/utils/response.js';

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export async function getReport(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const report = await reportService.generateReport(projectId);
    success(res, report);
  } catch (err) {
    if ((err as Error).message === 'Project not found') {
      notFound(res, 'Project not found');
      return;
    }
    badRequest(res, 'Failed to generate report', (err as Error).message);
  }
}

export async function getReportPDF(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const task = await reportService.queueReportGeneration(projectId);

    success(res, {
      taskId: task.id,
      status: task.status,
      message: 'Report generation queued. PDF will be available once the task completes.',
    });
  } catch (err) {
    badRequest(res, 'Failed to queue report generation', (err as Error).message);
  }
}

export default {
  getReport,
  getReportPDF,
};