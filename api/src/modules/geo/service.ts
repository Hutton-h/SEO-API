import { db } from '../../shared/database.js';
import dataforseo from '../../services/dataforseo.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GMBProfileRecord {
  id: string;
  project_id: string;
  business_name: string;
  address: string | null;
  rating: number;
  reviews_count: number;
  categories: string[] | null;
  website: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

export interface LocalRankingItem {
  keyword: string;
  rank_group: number;
  rank_absolute: number;
  title: string;
  description: string;
  url: string;
  rating?: number;
  reviews_count?: number;
  address?: string;
  phone?: string;
}

export interface LocalComparisonResult {
  location1: string;
  location2: string;
  rankings: Array<{
    keyword: string;
    location1Position: number | null;
    location2Position: number | null;
    difference: number;
  }>;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function getLocalRankings(
  projectId: string,
  options: { keyword?: string; locationCode?: number; languageCode?: string } = {},
): Promise<LocalRankingItem[]> {
  try {
    const project = await db('projects').where('id', projectId).first();
    if (!project) return [];

    const keyword = options.keyword ?? (project as { domain: string }).domain ?? '';
    const locationCode = options.locationCode ?? 2840;
    const languageCode = options.languageCode ?? 'en';

    const result = await dataforseo.getLocalPackRankings(
      keyword,
      locationCode,
      languageCode,
      1006953,
    );

    if (result.success && Array.isArray(result.data)) {
      return result.data as LocalRankingItem[];
    }

    return [];
  } catch {
    return [];
  }
}

export async function getGMBProfile(
  projectId: string,
): Promise<GMBProfileRecord | null> {
  try {
    const record = await db('gmb_profiles')
      .where('project_id', projectId)
      .first();
    return (record as GMBProfileRecord) ?? null;
  } catch {
    // Table doesn't exist
    return null;
  }
}

export async function compareLocations(
  projectId: string,
  location1: string,
  location2: string,
): Promise<LocalComparisonResult> {
  try {
    const keywords = await db('keywords')
      .where('project_id', projectId)
      .select('keyword')
      .limit(50);

    const rankings: LocalComparisonResult['rankings'] = [];

    for (const kw of keywords) {
      const [result1, result2] = await Promise.all([
        dataforseo.getLocalPackRankings(kw.keyword, 2840, 'en', parseInt(location1, 10) || 1006953),
        dataforseo.getLocalPackRankings(kw.keyword, 2840, 'en', parseInt(location2, 10) || 1006954),
      ]);

      const pos1 = result1.success && Array.isArray(result1.data) && result1.data.length > 0
        ? (result1.data[0] as LocalRankingItem).rank_absolute
        : null;

      const pos2 = result2.success && Array.isArray(result2.data) && result2.data.length > 0
        ? (result2.data[0] as LocalRankingItem).rank_absolute
        : null;

      rankings.push({
        keyword: kw.keyword,
        location1Position: pos1,
        location2Position: pos2,
        difference: pos1 !== null && pos2 !== null ? pos2 - pos1 : 0,
      });
    }

    return { location1, location2, rankings };
  } catch {
    return { location1, location2, rankings: [] };
  }
}

export default {
  getLocalRankings,
  getGMBProfile,
  compareLocations,
};