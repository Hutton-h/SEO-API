import { db } from '../../shared/database.js';
import { backlinkRefreshQueue } from '../../shared/queue.js';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BacklinkRecord {
  id: string;
  project_id: string;
  source_url: string;
  target_url: string;
  anchor_text: string | null;
  domain_authority: number | null;
  page_authority: number | null;
  link_type: string;
  is_dofollow: boolean;
  first_seen: string | null;
  last_seen: string | null;
  created_at: string;
}

export interface BacklinkListParams {
  projectId: string;
  page: number;
  pageSize: number;
  isDofollow?: boolean;
  search?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

export interface TaskRecord {
  id: string;
  project_id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  result: Record<string, unknown>;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function getBacklinks(
  params: BacklinkListParams,
): Promise<PaginatedResult<BacklinkRecord>> {
  try {
    const { projectId, page, pageSize, isDofollow, search } = params;

    let query = db('backlinks')
      .where('project_id', projectId);

    if (isDofollow !== undefined) {
      query = query.where('is_dofollow', isDofollow);
    }

    if (search) {
      query = query.where(function () {
        this.where('source_url', 'ilike', `%${search}%`)
          .orWhere('target_url', 'ilike', `%${search}%`)
          .orWhere('anchor_text', 'ilike', `%${search}%`);
      });
    }

    const [{ count }] = await query.clone().count<{ count: string }[]>();
    const total = parseInt(count, 10);

    const items = await query
      .orderBy('domain_authority', 'desc')
      .orderBy('created_at', 'desc')
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    return { items: items as BacklinkRecord[], total };
  } catch {
    // Table doesn't exist or other DB error - return empty
    return { items: [], total: 0 };
  }
}

export async function refreshBacklinks(
  projectId: string,
): Promise<TaskRecord> {
  try {
    const taskId = uuidv4();

    const [taskRecord] = await db('tasks')
      .insert({
        id: taskId,
        project_id: projectId,
        type: 'backlink-refresh',
        status: 'pending',
        progress: 0,
        result: '{}',
      })
      .returning('*');

    try {
      await backlinkRefreshQueue.add(
        'refresh-backlinks',
        { taskId, projectId },
        { jobId: taskId },
      );
    } catch {
      // Queue may not be available, task is still created
      console.warn(`[Backlinks] Failed to queue backlink refresh for project ${projectId}`);
    }

    return taskRecord as TaskRecord;
  } catch {
    // Table doesn't exist - return a virtual task record
    return {
      id: uuidv4(),
      project_id: projectId,
      type: 'backlink-refresh',
      status: 'pending' as const,
      progress: 0,
      result: {},
      error: null,
      started_at: null,
      completed_at: null,
      created_at: new Date().toISOString(),
    };
  }
}

export default {
  getBacklinks,
  refreshBacklinks,
};