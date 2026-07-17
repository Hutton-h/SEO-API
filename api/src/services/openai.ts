import OpenAI from 'openai';
import config from '../config.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OpenAIServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface SEOSuggestion {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  action: string;
}

export interface MetaDescriptionSuggestion {
  description: string;
  length: number;
  score: number;
}

export interface CompetitorAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  contentGaps: string[];
  recommendations: string[];
}

export interface ContentBrief {
  title: string;
  targetAudience: string;
  outline: Array<{
    section: string;
    keyPoints: string[];
    suggestedWordCount: number;
  }>;
  keywords: string[];
  tone: string;
  estimatedWordCount: number;
}

// ---------------------------------------------------------------------------
// OpenAI client
// ---------------------------------------------------------------------------

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
  maxRetries: 3,
  timeout: 60000,
});

const model = config.openai.model;

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function parseJSONResponse<T>(content: string | null, fallback: T): T {
  if (!content) return fallback;
  try {
    // Strip markdown code fences if present
    const cleaned = content
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// API Methods
// ---------------------------------------------------------------------------

export async function generateSEOSuggestions(
  pageContent: string,
  keyword: string,
): Promise<OpenAIServiceResult<SEOSuggestion[]>> {
  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are an expert SEO analyst. Analyze the given page content and provide actionable SEO suggestions for the target keyword. Return a JSON array of suggestion objects with keys: title, description, priority (high/medium/low), category, action.`,
        },
        {
          role: 'user',
          content: `Target keyword: ${keyword}\n\nPage content:\n${pageContent.substring(0, 8000)}\n\nProvide 5-10 SEO suggestions in JSON format.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0]?.message?.content;
    const parsed = parseJSONResponse<{ suggestions: SEOSuggestion[] }>(raw, { suggestions: [] });

    return { success: true, data: parsed.suggestions ?? [] };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'OPENAI_GENERATE_SEO_SUGGESTIONS_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
    };
  }
}

export async function generateMetaDescription(
  pageContent: string,
  keyword: string,
): Promise<OpenAIServiceResult<MetaDescriptionSuggestion>> {
  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are an expert SEO copywriter. Generate a compelling meta description for the given page content targeting the specified keyword. Return JSON with keys: description (string, 150-160 characters), length (number), score (number 1-100).`,
        },
        {
          role: 'user',
          content: `Target keyword: ${keyword}\n\nPage content:\n${pageContent.substring(0, 4000)}\n\nGenerate a meta description in JSON format.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0]?.message?.content;
    const parsed = parseJSONResponse<MetaDescriptionSuggestion>(raw, {
      description: '',
      length: 0,
      score: 0,
    });

    return { success: true, data: parsed };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'OPENAI_GENERATE_META_DESCRIPTION_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
    };
  }
}

export async function analyzeCompetitorContent(
  content: string,
  competitorContent: string,
): Promise<OpenAIServiceResult<CompetitorAnalysis>> {
  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are an expert SEO competitive analyst. Compare your content against the competitor's content and provide a detailed analysis. Return JSON with keys: strengths (string[]), weaknesses (string[]), opportunities (string[]), threats (string[]), contentGaps (string[]), recommendations (string[]).`,
        },
        {
          role: 'user',
          content: `=== YOUR CONTENT ===\n${content.substring(0, 4000)}\n\n=== COMPETITOR CONTENT ===\n${competitorContent.substring(0, 4000)}\n\nProvide a competitive analysis in JSON format.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0]?.message?.content;
    const parsed = parseJSONResponse<CompetitorAnalysis>(raw, {
      strengths: [],
      weaknesses: [],
      opportunities: [],
      threats: [],
      contentGaps: [],
      recommendations: [],
    });

    return { success: true, data: parsed };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'OPENAI_ANALYZE_COMPETITOR_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
    };
  }
}

export async function generateContentBrief(
  topic: string,
  keywords: string[],
): Promise<OpenAIServiceResult<ContentBrief>> {
  try {
    const keywordList = keywords.join(', ');

    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are an expert content strategist. Create a detailed content brief for the given topic and target keywords. Return JSON with keys: title (string), targetAudience (string), outline (array of {section, keyPoints[], suggestedWordCount}), keywords (string[]), tone (string), estimatedWordCount (number).`,
        },
        {
          role: 'user',
          content: `Topic: ${topic}\nTarget keywords: ${keywordList}\n\nCreate a content brief in JSON format.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0]?.message?.content;
    const parsed = parseJSONResponse<ContentBrief>(raw, {
      title: topic,
      targetAudience: '',
      outline: [],
      keywords,
      tone: 'professional',
      estimatedWordCount: 1500,
    });

    return { success: true, data: parsed };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'OPENAI_GENERATE_CONTENT_BRIEF_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export default {
  generateSEOSuggestions,
  generateMetaDescription,
  analyzeCompetitorContent,
  generateContentBrief,
};