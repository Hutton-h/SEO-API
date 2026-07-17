import { db } from '../../shared/database.js';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Schedule {
  id: string;
  project_id: string;
  name: string;
  type: string;
  cron_expression: string;
  enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function createSchedule(
  projectId: string,
  data: {
    name: string;
    type: string;
    cron_expression: string;
    enabled?: boolean;
  },
): Promise<Schedule> {
  const id = uuidv4();
  const [schedule] = await db('schedules')
    .insert({
      id,
      project_id: projectId,
      name: data.name,
      type: data.type,
      cron_expression: data.cron_expression,
      enabled: data.enabled ?? true,
    })
    .returning('*');

  return formatSchedule(schedule);
}

export async function listSchedules(
  projectId: string,
  params: { page: number; pageSize: number; type?: string; enabled?: boolean },
): Promise<PaginatedResult<Schedule>> {
  const { page, pageSize, type, enabled } = params;

  let query = db('schedules').where('project_id', projectId);

  if (type) query = query.where('type', type);
  if (enabled !== undefined) query = query.where('enabled', enabled);

  const [{ count }] = await query.clone().clearSelect().count<{ count: string }[]>();
  const total = parseInt(count, 10);

  const items = await query
    .orderBy('created_at', 'desc')
    .offset((page - 1) * pageSize)
    .limit(pageSize);

  return { items: (items as Record<string, unknown>[]).map(formatSchedule), total };
}

export async function updateSchedule(
  scheduleId: string,
  data: {
    name?: string;
    type?: string;
    cron_expression?: string;
    enabled?: boolean;
  },
): Promise<Schedule | null> {
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData['name'] = data.name;
  if (data.type !== undefined) updateData['type'] = data.type;
  if (data.cron_expression !== undefined) updateData['cron_expression'] = data.cron_expression;
  if (data.enabled !== undefined) updateData['enabled'] = data.enabled;
  updateData['updated_at'] = db.fn.now();

  if (Object.keys(updateData).length === 0) return null;

  const [schedule] = await db('schedules')
    .where('id', scheduleId)
    .update(updateData)
    .returning('*');

  return schedule ? formatSchedule(schedule) : null;
}

export async function deleteSchedule(scheduleId: string): Promise<boolean> {
  const deleted = await db('schedules').where('id', scheduleId).del();
  return deleted > 0;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

export async function runNow(scheduleId: string): Promise<Schedule | null> {
  const schedule = await db('schedules').where('id', scheduleId).first();
  if (!schedule) return null;

  // Update last run time
  await db('schedules')
    .where('id', scheduleId)
    .update({
      last_run_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

  // Create a task for the scheduled job
  const taskId = uuidv4();
  const s = schedule as Record<string, unknown>;

  await db('tasks').insert({
    id: taskId,
    project_id: s['project_id'],
    type: s['type'],
    status: 'pending',
    progress: 0,
    result: JSON.stringify({ triggered_by: 'schedule', schedule_id: scheduleId }),
  });

  const [updated] = await db('schedules').where('id', scheduleId).returning('*');
  return formatSchedule(updated);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSchedule(raw: Record<string, unknown>): Schedule {
  return {
    id: raw['id'] as string,
    project_id: raw['project_id'] as string,
    name: raw['name'] as string,
    type: raw['type'] as string,
    cron_expression: raw['cron_expression'] as string,
    enabled: Boolean(raw['enabled']),
    last_run_at: (raw['last_run_at'] as string) ?? null,
    next_run_at: (raw['next_run_at'] as string) ?? null,
    created_at: raw['created_at'] as string,
    updated_at: raw['updated_at'] as string,
  };
}

export default {
  createSchedule,
  listSchedules,
  updateSchedule,
  deleteSchedule,
  runNow,
};