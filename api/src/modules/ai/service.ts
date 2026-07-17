import { db } from '../../shared/database.js';
import openai from '../../services/openai.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OptimizationResult {
  suggestions: Array<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    category: string;
    action: string;
  }>;
  metaDescription: {
    description: string;
    length: number;
    score: number;
  };
  targetKeyword: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function optimizeContent(
  projectId: string,
  options: {
    pageUrl?: string;
    keyword?: string;
    content?: string;
  },
): Promise<OptimizationResult> {
  const { keyword, content } = options;

  const targetKeyword = keyword ?? 'seo optimization';
  const pageContent = content ?? '';

  if (!pageContent && !options.pageUrl) {
    // Try to get content from the most recent crawled page
    const page = await db('crawl_pages')
      .where('project_id', projectId)
      .orderBy('crawled_at', 'desc')
      .first();

    if (page) {
      const contentParts: string[] = [];
      if (page.title) contentParts.push(page.title);
      if (page.meta_description) contentParts.push(page.meta_description);
      if (page.h1) contentParts.push(page.h1);
      // Combine available content
      const combinedContent = contentParts.join('\n\n');

      const [suggestionsResult, metaResult] = await Promise.all([
        openai.generateSEOSuggestions(combinedContent, targetKeyword),
        openai.generateMetaDescription(combinedContent, targetKeyword),
      ]);

      return {
        suggestions: suggestionsResult.success ? (suggestionsResult.data ?? []) : [],
        metaDescription: metaResult.success
          ? (metaResult.data ?? { description: '', length: 0, score: 0 })
          : { description: '', length: 0, score: 0 },
        targetKeyword,
        createdAt: new Date().toISOString(),
      };
    }

    // No content available
    return {
      suggestions: [],
      metaDescription: { description: '', length: 0, score: 0 },
      targetKeyword,
      createdAt: new Date().toISOString(),
    };
  }

  const [suggestionsResult, metaResult] = await Promise.all([
    openai.generateSEOSuggestions(pageContent, targetKeyword),
    openai.generateMetaDescription(pageContent, targetKeyword),
  ]);

  return {
    suggestions: suggestionsResult.success ? (suggestionsResult.data ?? []) : [],
    metaDescription: metaResult.success
      ? (metaResult.data ?? { description: '', length: 0, score: 0 })
      : { description: '', length: 0, score: 0 },
    targetKeyword,
    createdAt: new Date().toISOString(),
  };
}

export default {
  optimizeContent,
};