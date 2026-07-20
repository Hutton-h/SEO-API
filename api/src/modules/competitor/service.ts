import { db } from '../../shared/database.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CompetitorDomainRecord {
  id: string;
  project_id: string;
  domain: string;
  name: string;
  is_preset: boolean;
  created_at: string;
}

export interface CompetitorTrafficRecord {
  id: string;
  project_id: string;
  competitor_id: string;
  total_visits: number;
  organic_traffic: number;
  paid_traffic: number;
  top_keywords: unknown;
  traffic_sources: unknown;
  check_date: string;
  created_at: string;
}

export interface CompetitorOverview {
  competitor: CompetitorDomainRecord;
  latestTraffic: CompetitorTrafficRecord | null;
  keywordCount: number;
  backlinkCount: number;
}

export interface KeywordOverlapResult {
  keyword: string;
  yourPosition: number | null;
  competitorPosition: number | null;
  overlap: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function addCompetitor(
  projectId: string,
  domain: string,
  name: string,
): Promise<CompetitorDomainRecord> {
  const [record] = await db('competitor_domains')
    .insert({
      project_id: projectId,
      domain,
      name,
      is_preset: false,
    })
    .onConflict(['project_id', 'domain'])
    .ignore()
    .returning('*');

  if (!record) {
    const existing = await db('competitor_domains')
      .where('project_id', projectId)
      .where('domain', domain)
      .first();
    return existing as CompetitorDomainRecord;
  }

  return record as CompetitorDomainRecord;
}

export async function getCompetitorOverview(
  projectId: string,
): Promise<CompetitorOverview[]> {
  const competitors = await db('competitor_domains')
    .where('project_id', projectId)
    .orderBy('name', 'asc');

  const overviews: CompetitorOverview[] = [];

  for (const comp of competitors) {
    const latestTraffic = await db('competitor_traffic')
      .where('competitor_id', comp.id)
      .orderBy('check_date', 'desc')
      .first();

    const [{ count: keywordCount }] = await db('keywords')
      .where('project_id', projectId)
      .count<{ count: string }[]>();

    const [{ count: backlinkCount }] = await db('backlinks')
      .where('project_id', projectId)
      .count<{ count: string }[]>();

    overviews.push({
      competitor: comp as CompetitorDomainRecord,
      latestTraffic: (latestTraffic as CompetitorTrafficRecord) ?? null,
      keywordCount: parseInt(keywordCount, 10),
      backlinkCount: parseInt(backlinkCount, 10),
    });
  }

  return overviews;
}

export async function getKeywordOverlap(
  projectId: string,
  competitorId: string,
): Promise<KeywordOverlapResult[]> {
  try {
    const projectKeywords = await db('keywords')
      .where('project_id', projectId)
      .select('keyword', 'id');

    const competitorKeywords = await db('keywords')
      .where('project_id', projectId)
      .select('keyword');

    const competitorKeywordSet = new Set(
      competitorKeywords.map((k) => k.keyword.toLowerCase()),
    );

    const results: KeywordOverlapResult[] = [];

    for (const kw of projectKeywords) {
      let latestRanking: { position: number | null } | null = null;
      try {
        const ranking = await db('rankings')
          .where('keyword_id', kw.id)
          .orderBy('check_date', 'desc')
          .first();
        latestRanking = ranking as { position: number | null } | null;
      } catch {
        // Rankings table may not exist
      }

      const isOverlapping = competitorKeywordSet.has(kw.keyword.toLowerCase());

      results.push({
        keyword: kw.keyword,
        yourPosition: latestRanking ? latestRanking.position : null,
        competitorPosition: isOverlapping ? (latestRanking ? latestRanking.position : null) : null,
        overlap: isOverlapping,
      });
    }

    return results;
  } catch (err) {
    // Keywords table may not exist - return empty results
    if ((err as Error).message?.includes('does not exist') || (err as Error).message?.includes('relation')) {
      return [];
    }
    throw err;
  }
}

export default {
  addCompetitor,
  getCompetitorOverview,
  getKeywordOverlap,
};