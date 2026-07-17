// ---------------------------------------------------------------------------
// OpenAI Service - Upgraded to GPT-4o-mini
// Provides content generation, analysis, and quality scoring
// ---------------------------------------------------------------------------

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

export interface ContentQualityScore {
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
}

export interface FAQSchema {
  mainEntity: Array<{
    '@type': string;
    name: string;
    acceptedAnswer: {
      '@type': string;
      text: string;
    };
  }>;
}

export interface RewrittenContent {
  original: string;
  rewritten: string;
  tone: string;
  changes: string[];
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

// ---------------------------------------------------------------------------
// OpenAI client
// ---------------------------------------------------------------------------

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
  maxRetries: 3,
  timeout: 60000,
});

const model = 'gpt-4o-mini';

// ---------------------------------------------------------------------------
// Token usage tracking
// ---------------------------------------------------------------------------

let totalTokenUsage: TokenUsage = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
  estimatedCost: 0,
};

function trackTokenUsage(usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }): void {
  totalTokenUsage.promptTokens += usage.prompt_tokens;
  totalTokenUsage.completionTokens += usage.completion_tokens;
  totalTokenUsage.totalTokens += usage.total_tokens;
  totalTokenUsage.estimatedCost += usage.total_tokens * config.billing.openaiCostPerToken;
}

export function getTokenUsage(): TokenUsage {
  return { ...totalTokenUsage };
}

export function resetTokenUsage(): void {
  totalTokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    estimatedCost: 0,
  };
}

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

    trackTokenUsage({
      prompt_tokens: response.usage?.prompt_tokens ?? 0,
      completion_tokens: response.usage?.completion_tokens ?? 0,
      total_tokens: response.usage?.total_tokens ?? 0,
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

    trackTokenUsage({
      prompt_tokens: response.usage?.prompt_tokens ?? 0,
      completion_tokens: response.usage?.completion_tokens ?? 0,
      total_tokens: response.usage?.total_tokens ?? 0,
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

    trackTokenUsage({
      prompt_tokens: response.usage?.prompt_tokens ?? 0,
      completion_tokens: response.usage?.completion_tokens ?? 0,
      total_tokens: response.usage?.total_tokens ?? 0,
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

/**
 * 生成内容大纲
 * @param topic - 主题
 * @param keywords - 目标关键词
 * @param targetAudience - 目标受众
 */
export async function generateContentBrief(
  topic: string,
  keywords: string[],
  targetAudience: string = 'general',
): Promise<OpenAIServiceResult<ContentBrief>> {
  try {
    const keywordList = keywords.join(', ');

    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are an expert content strategist. Create a detailed content brief for the given topic, target keywords, and target audience. Return JSON with keys: title (string), targetAudience (string), outline (array of {section, keyPoints[], suggestedWordCount}), keywords (string[]), tone (string), estimatedWordCount (number).`,
        },
        {
          role: 'user',
          content: `Topic: ${topic}\nTarget keywords: ${keywordList}\nTarget audience: ${targetAudience}\n\nCreate a content brief in JSON format.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    trackTokenUsage({
      prompt_tokens: response.usage?.prompt_tokens ?? 0,
      completion_tokens: response.usage?.completion_tokens ?? 0,
      total_tokens: response.usage?.total_tokens ?? 0,
    });

    const raw = response.choices[0]?.message?.content;
    const parsed = parseJSONResponse<ContentBrief>(raw, {
      title: topic,
      targetAudience,
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

/**
 * 内容质量评分（0-100）
 * @param content - 待评分内容
 * @param keyword - 目标关键词
 */
export async function analyzeContentQuality(
  content: string,
  keyword: string,
): Promise<OpenAIServiceResult<ContentQualityScore>> {
  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are an expert SEO content analyst. Score the content quality for the given keyword on a scale of 0-100. Return JSON with keys: overallScore (number 0-100), breakdown ({readability, keywordOptimization, structure, engagement, technicalSEO} each 0-100), suggestions (array of {issue, recommendation, priority}), keywordDensity (number percentage), readingTime (number minutes), wordCount (number).`,
        },
        {
          role: 'user',
          content: `Target keyword: ${keyword}\n\nContent:\n${content.substring(0, 8000)}\n\nProvide a content quality analysis in JSON format.`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    trackTokenUsage({
      prompt_tokens: response.usage?.prompt_tokens ?? 0,
      completion_tokens: response.usage?.completion_tokens ?? 0,
      total_tokens: response.usage?.total_tokens ?? 0,
    });

    const raw = response.choices[0]?.message?.content;
    const parsed = parseJSONResponse<ContentQualityScore>(raw, {
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
      readingTime: 0,
      wordCount: 0,
    });

    return { success: true, data: parsed };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'OPENAI_ANALYZE_CONTENT_QUALITY_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
    };
  }
}

/**
 * 生成 FAQ Schema
 * @param keyword - 目标关键词
 */
export async function generateFAQ(
  keyword: string,
): Promise<OpenAIServiceResult<FAQSchema>> {
  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are an expert SEO specialist. Generate a comprehensive FAQ JSON-LD schema for the given keyword. Return JSON with a "mainEntity" array containing question-answer objects with @type, name, and acceptedAnswer {@type, text}. Include 5-8 relevant questions.`,
        },
        {
          role: 'user',
          content: `Keyword: ${keyword}\n\nGenerate FAQ schema in JSON format.`,
        },
      ],
      temperature: 0.5,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    trackTokenUsage({
      prompt_tokens: response.usage?.prompt_tokens ?? 0,
      completion_tokens: response.usage?.completion_tokens ?? 0,
      total_tokens: response.usage?.total_tokens ?? 0,
    });

    const raw = response.choices[0]?.message?.content;
    const parsed = parseJSONResponse<FAQSchema>(raw, {
      mainEntity: [],
    });

    return { success: true, data: parsed };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'OPENAI_GENERATE_FAQ_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
    };
  }
}

/**
 * 改写内容
 * @param content - 原始内容
 * @param tone - 目标语气：professional, casual, persuasive, informative, technical
 */
export async function rewriteContent(
  content: string,
  tone: string = 'professional',
): Promise<OpenAIServiceResult<RewrittenContent>> {
  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are an expert content writer. Rewrite the given content in a ${tone} tone while preserving the original meaning and key information. Return JSON with keys: rewritten (string), changes (string[] describing what was changed).`,
        },
        {
          role: 'user',
          content: `Original content:\n${content.substring(0, 8000)}\n\nRewrite this content in a ${tone} tone. Return JSON format.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    });

    trackTokenUsage({
      prompt_tokens: response.usage?.prompt_tokens ?? 0,
      completion_tokens: response.usage?.completion_tokens ?? 0,
      total_tokens: response.usage?.total_tokens ?? 0,
    });

    const raw = response.choices[0]?.message?.content;
    const parsed = parseJSONResponse<{ rewritten: string; changes: string[] }>(raw, {
      rewritten: content,
      changes: [],
    });

    return {
      success: true,
      data: {
        original: content,
        rewritten: parsed.rewritten,
        tone,
        changes: parsed.changes,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'OPENAI_REWRITE_CONTENT_FAILED',
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
  analyzeContentQuality,
  generateFAQ,
  rewriteContent,
  getTokenUsage,
  resetTokenUsage,
};