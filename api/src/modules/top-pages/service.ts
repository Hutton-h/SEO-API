import {
  getRankings,
  type RankingItem,
} from '../../services/dataforseo.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TopPagesResult {
  domain: string;
  pages: Array<{
    url: string;
    keywordCount: number;
    estimatedTraffic: number;
    topKeyword: string;
    topKeywordPosition: number;
    topKeywordVolume: number;
    avgPosition: number;
  }>;
  totalPages: number;
  analyzedAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_LOCATION_CODE = 2840;
const DEFAULT_LANGUAGE_CODE = 'en';
const DEFAULT_LIMIT = 50;

interface PageGroup {
  url: string;
  keywords: RankingItem[];
}

function groupKeywordsByUrl(keywords: RankingItem[]): PageGroup[] {
  const pageMap = new Map<string, RankingItem[]>();

  for (const kw of keywords) {
    const url = kw.url || '(unknown)';
    if (!pageMap.has(url)) {
      pageMap.set(url, []);
    }
    pageMap.get(url)!.push(kw);
  }

  return Array.from(pageMap.entries()).map(([url, kws]) => ({
    url,
    keywords: kws,
  }));
}

function calculatePageTraffic(keywords: RankingItem[]): number {
  const ctrByPosition: Record<number, number> = {
    1: 0.32, 2: 0.18, 3: 0.12, 4: 0.09, 5: 0.07,
    6: 0.05, 7: 0.04, 8: 0.03, 9: 0.02, 10: 0.01,
  };
  return keywords.reduce((sum, kw) => {
    const ctr = kw.position <= 10 ? (ctrByPosition[Math.floor(kw.position)] ?? 0) : 0;
    return sum + (kw.search_volume ?? 0) * ctr;
  }, 0);
}

function buildPageResult(page: PageGroup): TopPagesResult['pages'][0] {
  const sorted = [...page.keywords].sort((a, b) => a.position - b.position);
  const bestKw = sorted[0];

  const avgPosition = page.keywords.length > 0
    ? Math.round((page.keywords.reduce((sum, kw) => sum + kw.position, 0) / page.keywords.length) * 100) / 100
    : 0;

  return {
    url: page.url,
    keywordCount: page.keywords.length,
    estimatedTraffic: Math.round(calculatePageTraffic(page.keywords)),
    topKeyword: bestKw?.keyword ?? '',
    topKeywordPosition: bestKw?.position ?? 0,
    topKeywordVolume: bestKw?.search_volume ?? 0,
    avgPosition,
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function getTopPages(
  domain: string,
  locationCode: number = DEFAULT_LOCATION_CODE,
  limit: number = DEFAULT_LIMIT,
): Promise<TopPagesResult> {
  const now = new Date().toISOString();

  const rankingsResult = await getRankings(domain, locationCode, DEFAULT_LANGUAGE_CODE);

  const keywords: RankingItem[] = (rankingsResult.success && rankingsResult.data)
    ? rankingsResult.data
    : [];

  const pageGroups = groupKeywordsByUrl(keywords);

  const pages = pageGroups
    .map((page) => buildPageResult(page))
    .sort((a, b) => b.estimatedTraffic - a.estimatedTraffic)
    .slice(0, limit);

  return {
    domain,
    pages,
    totalPages: pageGroups.length,
    analyzedAt: now,
  };
}

export default {
  getTopPages,
};