import { db } from '../../shared/database.js';
import { nlp } from '../../services/nlp.js';
import openai from '../../services/openai.js';
import axios from 'axios';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContentAnalysis {
  projectId: string;
  averageScore: number;
  pagesAnalyzed: number;
  domain: string;
  qualityDistribution: {
    excellent: number;
    good: number;
    average: number;
    poor: number;
  };
  topPages: Array<{
    url: string;
    title: string;
    score: number;
    breakdown: {
      readability: number;
      keywordOptimization: number;
      structure: number;
      engagement: number;
      technicalSEO: number;
    };
  }>;
  weakestPages: Array<{
    url: string;
    title: string;
    score: number;
  }>;
}

export interface URLContentAnalysis {
  url: string;
  title: string;
  metaDescription: string;
  h1: string;
  wordCount: number;
  entities: Array<{ name: string; type: string; salience: number }>;
  qualityScore: {
    overallScore: number;
    breakdown: {
      readability: number;
      keywordOptimization: number;
      structure: number;
      engagement: number;
      technicalSEO: number;
    };
    suggestions: Array<{
      issue: string;
      recommendation: string;
      priority: 'high' | 'medium' | 'low';
    }>;
    keywordDensity: number;
    readingTime: number;
    wordCount: number;
  };
  readability: {
    score: number;
    level: string;
    fleschReadingEase: number;
    avgSentenceLength: number;
  };
}

export interface QualityScoreSummary {
  projectId: string;
  overallScore: number;
  pagesAnalyzed: number;
  breakdown: {
    readability: number;
    keywordOptimization: number;
    structure: number;
    engagement: number;
    technicalSEO: number;
  };
  topIssues: Array<{
    issue: string;
    affectedPages: number;
    priority: string;
  }>;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function getContentAnalysis(
  projectId: string,
  params: { page: number; pageSize: number },
): Promise<ContentAnalysis> {
  const project = await db('projects').where('id', projectId).first();
  if (!project) {
    throw new Error('Project not found');
  }

  const domain = (project as { domain: string }).domain;

  const pages = await db('crawl_pages')
    .where('project_id', projectId)
    .where('status_code', 200)
    .orderBy('crawled_at', 'desc')
    .limit(params.pageSize)
    .offset((params.page - 1) * params.pageSize);

  const allScores = await db('content_quality_scores')
    .where('project_id', projectId)
    .orderBy('score', 'desc');

  const scoresMap = new Map<string, number>();
  for (const s of allScores as Array<{ url: string; score: number }>) {
    scoresMap.set(s.url, s.score);
  }

  const analyzedPages = (pages as Array<{
    url: string;
    title: string;
    meta_description: string;
    h1: string;
    word_count: number;
    crawled_at: string;
  }>).map((page) => {
    const score = scoresMap.get(page.url) ?? 0;
    return {
      url: page.url,
      title: page.title ?? 'Untitled',
      score,
      breakdown: {
        readability: Math.round(score * 0.8),
        keywordOptimization: Math.round(score * 0.7),
        structure: Math.round(score * 0.85),
        engagement: Math.round(score * 0.75),
        technicalSEO: Math.round(score * 0.9),
      },
    };
  });

  const scoredPages = analyzedPages.filter((p) => p.score > 0);
  const averageScore = scoredPages.length > 0
    ? Math.round(scoredPages.reduce((sum, p) => sum + p.score, 0) / scoredPages.length)
    : 0;

  const qualityDistribution = {
    excellent: scoredPages.filter((p) => p.score >= 80).length,
    good: scoredPages.filter((p) => p.score >= 60 && p.score < 80).length,
    average: scoredPages.filter((p) => p.score >= 40 && p.score < 60).length,
    poor: scoredPages.filter((p) => p.score < 40).length,
  };

  const sortedByScore = [...scoredPages].sort((a, b) => b.score - a.score);

  return {
    projectId,
    averageScore,
    pagesAnalyzed: scoredPages.length,
    domain,
    qualityDistribution,
    topPages: sortedByScore.slice(0, 5),
    weakestPages: sortedByScore.reverse().slice(0, 5),
  };
}

export async function analyzeUrl(
  projectId: string,
  url: string,
): Promise<URLContentAnalysis> {
  // Fetch page content
  let pageContent = '';
  let title = '';
  let metaDescription = '';
  let h1 = '';

  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: { 'User-Agent': 'CraneSEO-ContentAnalyzer/1.0' },
    });
    const html = response.data as string;

    // Extract basic meta
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    title = titleMatch ? titleMatch[1].trim() : '';

    const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i)
      ?? html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["'][^>]*>/i);
    metaDescription = metaMatch ? metaMatch[1].trim() : '';

    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    h1 = h1Match ? h1Match[1].trim() : '';

    // Strip HTML tags for content analysis
    pageContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  } catch {
    // If we can't fetch, use existing data from crawl
    const page = await db('crawl_pages').where('url', url).where('project_id', projectId).first();
    if (page) {
      const p = page as Record<string, unknown>;
      title = (p['title'] as string) ?? '';
      metaDescription = (p['meta_description'] as string) ?? '';
      h1 = (p['h1'] as string) ?? '';
      pageContent = title + ' ' + metaDescription + ' ' + h1;
    }
  }

  const wordCount = pageContent.split(/\s+/).filter(Boolean).length;

  // Analyze entities via NLP
  let entities: Array<{ name: string; type: string; salience: number }> = [];
  if (pageContent.length > 20) {
    const entityResult = await nlp.analyzeEntities(pageContent.substring(0, 10000));
    if (entityResult.success && entityResult.data) {
      entities = entityResult.data.map((e) => ({
        name: e.name,
        type: e.type,
        salience: e.salience,
      }));
    }
  }

  // Analyze content quality via OpenAI
  const keyword = entities.length > 0 ? entities[0].name : 'content';
  const qualityResult = await openai.analyzeContentQuality(pageContent.substring(0, 8000), keyword);

  const qualityScore = qualityResult.success && qualityResult.data
    ? qualityResult.data
    : {
      overallScore: 0,
      breakdown: {
        readability: 0,
        keywordOptimization: 0,
        structure: 0,
        engagement: 0,
        technicalSEO: 0,
      },
      suggestions: [],
      keywordDensity: 0,
      readingTime: Math.ceil(wordCount / 200),
      wordCount,
    };

  // Store quality score
  await db('content_quality_scores')
    .insert({
      project_id: projectId,
      url,
      title,
      score: qualityScore.overallScore,
      readability_score: qualityScore.breakdown.readability,
      keyword_score: qualityScore.breakdown.keywordOptimization,
      structure_score: qualityScore.breakdown.structure,
      engagement_score: qualityScore.breakdown.engagement,
      technical_seo_score: qualityScore.breakdown.technicalSEO,
      word_count: wordCount,
      entities: JSON.stringify(entities),
    })
    .onConflict(['project_id', 'url'])
    .merge();

  return {
    url,
    title,
    metaDescription,
    h1,
    wordCount,
    entities,
    qualityScore: {
      ...qualityScore,
      readingTime: qualityScore.readingTime || Math.ceil(wordCount / 200),
      wordCount,
    },
    readability: {
      score: qualityScore.breakdown.readability,
      level: qualityScore.breakdown.readability >= 80 ? 'Easy' : qualityScore.breakdown.readability >= 60 ? 'Moderate' : 'Difficult',
      fleschReadingEase: qualityScore.breakdown.readability,
      avgSentenceLength: wordCount > 0 ? Math.round(wordCount / Math.max(1, (pageContent.match(/[.!?]+/g) || []).length)) : 0,
    },
  };
}

export async function getQualityScore(projectId: string): Promise<QualityScoreSummary> {
  if (!projectId) {
    throw new Error('projectId is required');
  }

  try {
    const scores = await db('content_quality_scores')
      .where('project_id', projectId)
      .select('score', 'readability_score', 'keyword_score', 'structure_score', 'engagement_score', 'technical_seo_score');

    const scored = scores as Array<{
      score: number;
      readability_score: number;
      keyword_score: number;
      structure_score: number;
      engagement_score: number;
      technical_seo_score: number;
    }>;

    const pagesAnalyzed = scored.length;
    const overallScore = pagesAnalyzed > 0
      ? Math.round(scored.reduce((sum, s) => sum + s.score, 0) / pagesAnalyzed)
      : 0;

    const breakdown = {
      readability: pagesAnalyzed > 0
        ? Math.round(scored.reduce((sum, s) => sum + s.readability_score, 0) / pagesAnalyzed)
        : 0,
      keywordOptimization: pagesAnalyzed > 0
        ? Math.round(scored.reduce((sum, s) => sum + s.keyword_score, 0) / pagesAnalyzed)
        : 0,
      structure: pagesAnalyzed > 0
        ? Math.round(scored.reduce((sum, s) => sum + s.structure_score, 0) / pagesAnalyzed)
        : 0,
      engagement: pagesAnalyzed > 0
        ? Math.round(scored.reduce((sum, s) => sum + s.engagement_score, 0) / pagesAnalyzed)
        : 0,
      technicalSEO: pagesAnalyzed > 0
        ? Math.round(scored.reduce((sum, s) => sum + s.technical_seo_score, 0) / pagesAnalyzed)
        : 0,
    };

    // Identify top issues
    const topIssues = [
      {
        issue: 'Low readability score',
        affectedPages: scored.filter((s) => s.readability_score < 60).length,
        priority: 'high',
      },
      {
        issue: 'Poor keyword optimization',
        affectedPages: scored.filter((s) => s.keyword_score < 60).length,
        priority: 'high',
      },
      {
        issue: 'Weak content structure',
        affectedPages: scored.filter((s) => s.structure_score < 60).length,
        priority: 'medium',
      },
      {
        issue: 'Low engagement score',
        affectedPages: scored.filter((s) => s.engagement_score < 60).length,
        priority: 'medium',
      },
      {
        issue: 'Technical SEO issues',
        affectedPages: scored.filter((s) => s.technical_seo_score < 60).length,
        priority: 'high',
      },
    ].filter((issue) => issue.affectedPages > 0);

    return {
      projectId,
      overallScore,
      pagesAnalyzed,
      breakdown,
      topIssues,
    };
  } catch (err) {
    if ((err as Error).message === 'projectId is required') {
      throw err;
    }
    // Table may not exist - return empty summary
    return {
      projectId,
      overallScore: 0,
      pagesAnalyzed: 0,
      breakdown: {
        readability: 0,
        keywordOptimization: 0,
        structure: 0,
        engagement: 0,
        technicalSEO: 0,
      },
      topIssues: [],
    };
  }
}

export default {
  getContentAnalysis,
  analyzeUrl,
  getQualityScore,
};