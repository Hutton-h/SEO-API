import { dataforseo } from '../../services/dataforseo.js';
import { db } from '../../shared/database.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SerpFeatureAnalysis {
  projectId: string;
  keyword: string;
  locationCode: number;
  languageCode: string;
  features: {
    featured_snippet: {
      appears: boolean;
      owned: boolean;
      domain: string | null;
      title: string | null;
    };
    knowledge_graph: {
      appears: boolean;
      title: string | null;
    };
    people_also_ask: {
      appears: boolean;
      count: number;
      items: Array<{ question: string; url: string }>;
    };
    video_carousel: {
      appears: boolean;
      count: number;
      items: Array<{ title: string; url: string }>;
    };
    local_pack: {
      appears: boolean;
      count: number;
      items: Array<{ name: string; rating: number | null }>;
    };
  };
  occurrenceRates: {
    featured_snippet: number;
    knowledge_graph: number;
    people_also_ask: number;
    video_carousel: number;
    local_pack: number;
  };
}

export interface SerpFeatureSummary {
  projectId: string;
  keywordsAnalyzed: number;
  totalFeatures: number;
  occurrenceRates: {
    featured_snippet: number;
    knowledge_graph: number;
    people_also_ask: number;
    video_carousel: number;
    local_pack: number;
  };
  details: SerpFeatureAnalysis[];
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function getSerpFeatures(
  projectId: string,
  params: {
    keyword?: string;
    locationCode?: number;
    languageCode?: string;
  },
): Promise<SerpFeatureSummary> {
  const project = await db('projects').where('id', projectId).first();
  if (!project) {
    throw new Error('Project not found');
  }

  const locationCode = params.locationCode ?? 2840;
  const languageCode = params.languageCode ?? 'en';

  // Get keywords for the project
  let keywords: Array<{ id: string; keyword: string }>;
  if (params.keyword) {
    keywords = [{ id: '', keyword: params.keyword }];
  } else {
    keywords = await db('keywords')
      .where('project_id', projectId)
      .select('id', 'keyword')
      .limit(10);
  }

  if (keywords.length === 0) {
    return {
      projectId,
      keywordsAnalyzed: 0,
      totalFeatures: 0,
      occurrenceRates: {
        featured_snippet: 0,
        knowledge_graph: 0,
        people_also_ask: 0,
        video_carousel: 0,
        local_pack: 0,
      },
      details: [],
    };
  }

  const details: SerpFeatureAnalysis[] = [];
  let totalFeaturedSnippet = 0;
  let totalKnowledgeGraph = 0;
  let totalPeopleAlsoAsk = 0;
  let totalVideoCarousel = 0;
  let totalLocalPack = 0;

  for (const kw of keywords) {
    const result = await dataforseo.getSerpFeatures(kw.keyword, locationCode, languageCode);

    if (result.success && result.data) {
      const features = result.data.features;

      const featuredSnippetAppears = features.featured_snippet !== null;
      const knowledgeGraphAppears = features.knowledge_graph !== null;
      const peopleAlsoAskAppears = features.people_also_ask.length > 0;
      const videoCarouselAppears = features.video_carousel.length > 0;
      const localPackAppears = features.local_pack.length > 0;

      if (featuredSnippetAppears) totalFeaturedSnippet++;
      if (knowledgeGraphAppears) totalKnowledgeGraph++;
      if (peopleAlsoAskAppears) totalPeopleAlsoAsk++;
      if (videoCarouselAppears) totalVideoCarousel++;
      if (localPackAppears) totalLocalPack++;

      details.push({
        projectId,
        keyword: kw.keyword,
        locationCode,
        languageCode,
        features: {
          featured_snippet: {
            appears: featuredSnippetAppears,
            owned: features.featured_snippet?.domain === (project as { domain: string }).domain,
            domain: features.featured_snippet?.domain ?? null,
            title: features.featured_snippet?.title ?? null,
          },
          knowledge_graph: {
            appears: knowledgeGraphAppears,
            title: features.knowledge_graph?.title ?? null,
          },
          people_also_ask: {
            appears: peopleAlsoAskAppears,
            count: features.people_also_ask.length,
            items: features.people_also_ask.map((paa) => ({
              question: paa.title,
              url: paa.url ?? '',
            })),
          },
          video_carousel: {
            appears: videoCarouselAppears,
            count: features.video_carousel.length,
            items: features.video_carousel.map((v) => ({ title: v.title, url: v.url ?? '' })),
          },
          local_pack: {
            appears: localPackAppears,
            count: features.local_pack.length,
            items: features.local_pack.map((lp) => ({
              name: lp.title,
              rating: lp.rating ?? null,
            })),
          },
        },
        occurrenceRates: {
          featured_snippet: featuredSnippetAppears ? 100 : 0,
          knowledge_graph: knowledgeGraphAppears ? 100 : 0,
          people_also_ask: peopleAlsoAskAppears ? 100 : 0,
          video_carousel: videoCarouselAppears ? 100 : 0,
          local_pack: localPackAppears ? 100 : 0,
        },
      });
    }

    // Rate limit
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  const total = keywords.length;

  return {
    projectId,
    keywordsAnalyzed: total,
    totalFeatures: totalFeaturedSnippet + totalKnowledgeGraph + totalPeopleAlsoAsk + totalVideoCarousel + totalLocalPack,
    occurrenceRates: {
      featured_snippet: total > 0 ? Math.round((totalFeaturedSnippet / total) * 10000) / 100 : 0,
      knowledge_graph: total > 0 ? Math.round((totalKnowledgeGraph / total) * 10000) / 100 : 0,
      people_also_ask: total > 0 ? Math.round((totalPeopleAlsoAsk / total) * 10000) / 100 : 0,
      video_carousel: total > 0 ? Math.round((totalVideoCarousel / total) * 10000) / 100 : 0,
      local_pack: total > 0 ? Math.round((totalLocalPack / total) * 10000) / 100 : 0,
    },
    details,
  };
}

export default {
  getSerpFeatures,
};