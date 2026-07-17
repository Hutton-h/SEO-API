import { db } from '../../shared/database.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ASORankingRecord {
  id: string;
  project_id: string;
  app_name: string;
  app_id: string;
  store: 'apple' | 'google_play';
  keyword: string;
  position: number | null;
  rating: number;
  reviews_count: number;
  check_date: string;
  created_at: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function getASORankings(
  projectId: string,
  options: { page?: number; pageSize?: number; store?: string; keyword?: string } = {},
): Promise<PaginatedResult<ASORankingRecord>> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;

  let query = db('aso_rankings')
    .where('project_id', projectId)
    .orderBy('check_date', 'desc')
    .orderBy('position', 'asc');

  if (options.store) {
    query = query.where('store', options.store);
  }
  if (options.keyword) {
    query = query.where('keyword', 'ilike', `%${options.keyword}%`);
  }

  const [{ count }] = await query.clone().count<{ count: string }[]>();
  const total = parseInt(count, 10);

  const items = await query
    .offset((page - 1) * pageSize)
    .limit(pageSize);

  return { items: items as ASORankingRecord[], total };
}

export default {
  getASORankings,
};