import { apiGet, apiPost, apiPut, apiDelete } from './api';

export interface ScheduledTask {
  id: string;
  name: string;
  type: 'crawler' | 'ranking' | 'backlink' | 'weekly_report' | 'competitor_check' | 'downtime_check';
  typeLabel: string;
  cronExpression: string;
  status: 'active' | 'paused' | 'error';
  lastRunAt: string | null;
  lastRunStatus: 'success' | 'failed' | null;
  nextRunAt: string | null;
  projectId: string;
  projectName: string;
  createdAt: string;
}

export const scheduleAPI = {
  getTasks: (params?: { page?: number; pageSize?: number; projectId?: string }) =>
    apiGet<{ data: ScheduledTask[]; total: number }>('/v1/schedule/tasks', params),

  createTask: (data: Omit<ScheduledTask, 'id' | 'createdAt' | 'lastRunAt' | 'lastRunStatus' | 'nextRunAt'>) =>
    apiPost<ScheduledTask>('/v1/schedule/tasks', data),

  updateTask: (id: string, data: Partial<ScheduledTask>) =>
    apiPut<ScheduledTask>(`/v1/schedule/tasks/${id}`, data),

  deleteTask: (id: string) =>
    apiDelete<void>(`/v1/schedule/tasks/${id}`),

  toggleTask: (id: string, enabled: boolean) =>
    apiPut<ScheduledTask>(`/v1/schedule/tasks/${id}/toggle`, { enabled }),

  runTaskNow: (id: string) =>
    apiPost<{ success: boolean; message: string }>(`/v1/schedule/tasks/${id}/run`, {}),

  validateCron: (expression: string) =>
    apiPost<{ valid: boolean; description: string; nextRuns: string[] }>('/v1/schedule/validate-cron', { expression }),
};