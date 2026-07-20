import dataforseo from '../../services/dataforseo.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BulkDomainResult {
  domains: Array<{
    domain: string;
    totalKeywords: number;
    estimatedTraffic: number;
    backlinks: number;
    referringDomains: number;
    domainAuthority?: number;
    topKeyword: string;
    topKeywordVolume: number;
  }>;
  analyzedAt: string;
}

export interface BulkDomainError {
  domain: string;
  error: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function bulkAnalyzeDomains(
  domains: string[],
  locationCode?: number,
): Promise<BulkDomainResult> {
  const effectiveLocationCode = locationCode ?? 2840;
  const results: BulkDomainResult['domains'] = [];
  const errors: BulkDomainError[] = [];

  for (const domain of domains) {
    try {
      // Fetch rankings (keyword data) and backlinks in parallel for each domain
      const [rankingsResult, backlinksResult] = await Promise.allSettled([
        dataforseo.getRankings(domain, effectiveLocationCode, 'en'),
        dataforseo.getBacklinks(domain),
      ]);

      let totalKeywords = 0;
      let estimatedTraffic = 0;
      let topKeyword = '';
      let topKeywordVolume = 0;

      if (rankingsResult.status === 'fulfilled' && rankingsResult.value.success && Array.isArray(rankingsResult.value.data)) {
        const rankings = rankingsResult.value.data as Array<{
          keyword?: string;
          position?: number;
          search_volume?: number;
          cpc?: number;
        }>;

        totalKeywords = rankings.length;

        let bestKeyword = '';
        let bestVolume = 0;

        for (const item of rankings) {
          const volume = item.search_volume ?? 0;
          const position = item.position ?? 100;

          // Estimate traffic based on position and search volume
          const ctrByPosition: Record<number, number> = {
            1: 0.32, 2: 0.18, 3: 0.11, 4: 0.08, 5: 0.06,
            6: 0.04, 7: 0.03, 8: 0.02, 9: 0.02, 10: 0.01,
          };
          const ctr = position <= 10 ? (ctrByPosition[Math.ceil(position)] ?? 0.01) : 0.005;
          estimatedTraffic += volume * ctr;

          if (volume > bestVolume) {
            bestVolume = volume;
            bestKeyword = item.keyword ?? '';
          }
        }

        topKeyword = bestKeyword;
        topKeywordVolume = bestVolume;
      }

      let backlinks = 0;
      let referringDomains = 0;
      let domainAuthority: number | undefined;

      if (backlinksResult.status === 'fulfilled' && backlinksResult.value.success && backlinksResult.value.data) {
        const backlinkData = backlinksResult.value.data as {
          backlinks?: number;
          referring_domains?: number;
          rank?: number;
        };
        backlinks = backlinkData.backlinks ?? 0;
        referringDomains = backlinkData.referring_domains ?? 0;

        // Derive domain authority from rank (inverse relationship)
        if (backlinkData.rank !== undefined) {
          domainAuthority = Math.max(1, Math.min(100, Math.round(100 - backlinkData.rank)));
        }
      }

      results.push({
        domain,
        totalKeywords,
        estimatedTraffic: Math.round(estimatedTraffic),
        backlinks,
        referringDomains,
        domainAuthority,
        topKeyword,
        topKeywordVolume,
      });
    } catch (err) {
      // Log error but continue with other domains
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[BulkAnalysis] Failed to analyze domain "${domain}":`, errorMessage);

      results.push({
        domain,
        totalKeywords: 0,
        estimatedTraffic: 0,
        backlinks: 0,
        referringDomains: 0,
        domainAuthority: undefined,
        topKeyword: '',
        topKeywordVolume: 0,
      });
    }
  }

  return {
    domains: results,
    analyzedAt: new Date().toISOString(),
  };
}

export default {
  bulkAnalyzeDomains,
};