import { db } from '../../shared/database.js';
import { rankingFetchQueue } from '../../shared/queue.js';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RankingRecord {
  id: string;
  project_id: string;
  keyword_id: string | null;
  position: number | null;
  previous_position: number | null;
  url: string | null;
  search_engine: string;
  location_code: number;
  language: string;
  check_date: string;
  created_at: string;
  source?: string;
}

export interface RankingListParams {
  projectId: string;
  page: number;
  pageSize: number;
  keyword?: string;
  sortBy?: 'position' | 'check_date';
  sortOrder?: 'asc' | 'desc';
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

export async function getRankings(
  params: RankingListParams,
): Promise<PaginatedResult<RankingRecord>> {
  const { projectId, page, pageSize, keyword, sortBy, sortOrder } = params;

  let query = db('rankings')
    .where('rankings.project_id', projectId)
    .leftJoin('keywords', 'rankings.keyword_id', 'keywords.id')
    .select(
      'rankings.*',
      'keywords.keyword as keyword_text',
    );

  if (keyword) {
    query = query.where('keywords.keyword', 'ilike', `%${keyword}%`);
  }

  const orderCol = sortBy === 'position' ? 'rankings.position' : 'rankings.check_date';
  const orderDir = sortOrder ?? 'desc';
  query = query.orderBy(orderCol, orderDir);

  const [{ count }] = await query.clone()
    .clearSelect()
    .clearOrder()
    .count<{ count: string }[]>();

  const total = parseInt(count, 10);

  const items = await query
    .offset((page - 1) * pageSize)
    .limit(pageSize);

  return { items: items as RankingRecord[], total };
}

export async function fetchRankings(
  projectId: string,
  options: { keywords?: string[]; locationCode?: number; includeGSC?: boolean } = {},
): Promise<TaskRecord> {
  const taskId = uuidv4();

  const [taskRecord] = await db('tasks')
    .insert({
      id: taskId,
      project_id: projectId,
      type: 'ranking-fetch',
      status: 'pending',
      progress: 0,
      result: '{}',
    })
    .returning('*');

  await rankingFetchQueue.add(
    'fetch-rankings',
    {
      taskId,
      projectId,
      keywords: options.keywords ?? [],
      locationCode: options.locationCode ?? 0,
      includeGSC: options.includeGSC ?? true,
    },
    {
      jobId: taskId,
    },
  );

  return taskRecord as TaskRecord;
}

export default {
  getRankings,
  fetchRankings,
};