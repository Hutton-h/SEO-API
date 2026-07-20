import {
  getContentGapAnalysis,
  getDomainIntersection as getDfseoDomainIntersection,
  type ContentGapResult,
  type DomainIntersectionResult as DfseoDomainIntersectionResult,
} from '../../services/dataforseo.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KeywordGapResult {
  targetDomain: string;
  competitorDomains: string[];
  missingKeywords: Array<{
    keyword: string;
    searchVolume: number;
    cpc: number;
    competition: string;
    competitorCount: number;
    opportunityScore: number;
  }>;
  sharedKeywords: Array<{
    keyword: string;
    competitorCount: number;
  }>;
  totalMissing: number;
  totalShared: number;
}

export interface DomainIntersectionResult {
  domains: string[];
  commonKeywords: Array<{
    keyword: string;
    searchVolume: number;
    positions: Record<string, number>;
  }>;
  totalCommon: number;
  vennData: Array<{
    domain: string;
    uniqueKeywords: number;
    sharedKeywords: number;
  }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_LOCATION_CODE = 2840;

function competitionLabel(competition: number): string {
  if (competition >= 0.8) return 'high';
  if (competition >= 0.4) return 'medium';
  return 'low';
}

function competitionWeight(competition: number): number {
  if (competition >= 0.8) return 0.3;
  if (competition >= 0.4) return 0.6;
  return 1.0;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function analyzeKeywordGap(
  targetDomain: string,
  competitorDomains: string[],
  locationCode: number = DEFAULT_LOCATION_CODE,
): Promise<KeywordGapResult> {
  const gapResult = await getContentGapAnalysis(targetDomain, competitorDomains);

  const missingKeywords: KeywordGapResult['missingKeywords'] = [];
  const sharedKeywords: KeywordGapResult['sharedKeywords'] = [];

  if (gapResult.success && gapResult.data) {
    const data = gapResult.data as ContentGapResult;

    for (const gap of data.gaps) {
      const competitorCount = Object.keys(gap.competitor_rankings).length;
      const compWeight = competitionWeight(gap.competition);
      const opportunityScore = Math.round(
        (gap.search_volume || 0) * compWeight * competitorCount,
      );

      missingKeywords.push({
        keyword: gap.keyword,
        searchVolume: gap.search_volume ?? 0,
        cpc: 0,
        competition: competitionLabel(gap.competition),
        competitorCount,
        opportunityScore,
      });
    }

    // Sort by opportunity score descending
    missingKeywords.sort((a, b) => b.opportunityScore - a.opportunityScore);
  }

  return {
    targetDomain,
    competitorDomains,
    missingKeywords,
    sharedKeywords,
    totalMissing: missingKeywords.length,
    totalShared: sharedKeywords.length,
  };
}

export async function getIntersection(
  domains: string[],
  locationCode: number = DEFAULT_LOCATION_CODE,
): Promise<DomainIntersectionResult> {
  if (domains.length < 2) {
    return {
      domains,
      commonKeywords: [],
      totalCommon: 0,
      vennData: domains.map((d) => ({ domain: d, uniqueKeywords: 0, sharedKeywords: 0 })),
    };
  }

  const targetDomain = domains[0];
  const competitors = domains.slice(1);

  const intersectionResult = await getDfseoDomainIntersection(targetDomain, competitors);

  const commonKeywords: DomainIntersectionResult['commonKeywords'] = [];
  const allKeywordDomains = new Map<string, Set<string>>();

  if (intersectionResult.success && intersectionResult.data) {
    const data = intersectionResult.data as DfseoDomainIntersectionResult;

    for (const item of data.shared_keywords) {
      commonKeywords.push({
        keyword: item.keyword,
        searchVolume: item.search_volume ?? 0,
        positions: item.competitor_positions,
      });

      for (const domain of Object.keys(item.competitor_positions)) {
        if (!allKeywordDomains.has(domain)) {
          allKeywordDomains.set(domain, new Set());
        }
        allKeywordDomains.get(domain)!.add(item.keyword);
      }
    }
  }

  // Build venn data
  const sharedKeywordSet = new Set(commonKeywords.map((k) => k.keyword));
  const vennData: DomainIntersectionResult['vennData'] = domains.map((domain) => {
    const domainKeywords = allKeywordDomains.get(domain) ?? new Set<string>();
    const sharedCount = [...domainKeywords].filter((kw) => sharedKeywordSet.has(kw)).length;
    const uniqueCount = domainKeywords.size - sharedCount;
    return {
      domain,
      uniqueKeywords: uniqueCount,
      sharedKeywords: sharedCount,
    };
  });

  return {
    domains,
    commonKeywords,
    totalCommon: commonKeywords.length,
    vennData,
  };
}

export default {
  analyzeKeywordGap,
  getIntersection,
};