import { db } from '../../shared/database.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface YouTubeRankingRecord {
  id: string;
  project_id: string;
  video_id: string;
  title: string | null;
  channel: string | null;
  keyword: string;
  position: number | null;
  views: number;
  likes: number;
  published_at: string | null;
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

export async function getYouTubeRankings(
  projectId: string,
  options: { page?: number; pageSize?: number; keyword?: string } = {},
): Promise<PaginatedResult<YouTubeRankingRecord>> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;

  let query = db('youtube_rankings')
    .where('project_id', projectId);

  if (options.keyword) {
    query = query.where('keyword', 'ilike', `%${options.keyword}%`);
  }

  const [{ count }] = await query.clone().count<{ count: string }[]>();
  const total = parseInt(count, 10);

  const items = await query
    .orderBy('check_date', 'desc')
    .orderBy('position', 'asc')
    .offset((page - 1) * pageSize)
    .limit(pageSize);

  return { items: items as YouTubeRankingRecord[], total };
}

export default {
  getYouTubeRankings,
};