// ---------------------------------------------------------------------------
// Google Cloud Natural Language API Service
// Uses @google-cloud/language package
// ---------------------------------------------------------------------------

import { LanguageServiceClient } from '@google-cloud/language';
import config from '../config.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Entity {
  name: string;
  type: string;
  salience: number;
  metadata: Record<string, string>;
  mentions: Array<{
    text: string;
    type: string;
  }>;
  wikipediaUrl?: string;
}

export interface SentimentResult {
  score: number;
  magnitude: number;
  sentences: Array<{
    text: string;
    score: number;
    magnitude: number;
  }>;
}

export interface ClassificationResult {
  categories: Array<{
    name: string;
    confidence: number;
  }>;
}

export interface Token {
  text: string;
  partOfSpeech: {
    tag: string;
    aspect: string;
    case: string;
    form: string;
    gender: string;
    mood: string;
    number: string;
    person: string;
    proper: string;
    reciprocity: string;
    tense: string;
    voice: string;
  };
  lemma: string;
  dependencyEdge: {
    headTokenIndex: number;
    label: string;
  };
}

export interface SyntaxResult {
  tokens: Token[];
  language: string;
  sentences: Array<{
    text: string;
    beginOffset: number;
  }>;
}

export interface NLPResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

let client: LanguageServiceClient | null = null;

function getClient(): LanguageServiceClient {
  if (!client) {
    client = new LanguageServiceClient({
      projectId: config.nlp.projectId,
      keyFilename: config.nlp.keyFile,
    });
  }
  return client;
}

// ---------------------------------------------------------------------------
// API Methods
// ---------------------------------------------------------------------------

/**
 * 实体识别 - 识别文本中的实体（名称/类型/重要性/维基链接）
 */
export async function analyzeEntities(
  text: string,
): Promise<NLPResult<Entity[]>> {
  try {
    const nlpClient = getClient();
    const document = {
      content: text,
      type: 'PLAIN_TEXT' as const,
    };

    const [result] = await nlpClient.analyzeEntities({ document });

    const entities: Entity[] = (result.entities ?? []).map((entity) => {
      const metadata: Record<string, string> = {};
      for (const [key, value] of Object.entries(entity.metadata ?? {})) {
        metadata[key] = String(value);
      }

      const mentions: Entity['mentions'] = (entity.mentions ?? []).map((m) => ({
        text: m.text?.content ?? '',
        type: String(m.type ?? 'UNKNOWN'),
      }));

      const entityResult: Entity = {
        name: entity.name ?? '',
        type: String(entity.type ?? 'UNKNOWN'),
        salience: entity.salience ?? 0,
        metadata,
        mentions,
      };

      if (metadata.wikipedia_url) {
        entityResult.wikipediaUrl = metadata.wikipedia_url;
      }

      return entityResult;
    });

    return { success: true, data: entities };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'NLP_ANALYZE_ENTITIES_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err,
      },
    };
  }
}

/**
 * 情感分析 - 返回 score 和 magnitude
 */
export async function analyzeSentiment(
  text: string,
): Promise<NLPResult<SentimentResult>> {
  try {
    const nlpClient = getClient();
    const document = {
      content: text,
      type: 'PLAIN_TEXT' as const,
    };

    const [result] = await nlpClient.analyzeSentiment({ document });

    const sentiment: SentimentResult = {
      score: result.documentSentiment?.score ?? 0,
      magnitude: result.documentSentiment?.magnitude ?? 0,
      sentences: (result.sentences ?? []).map((s) => ({
        text: s.text?.content ?? '',
        score: s.sentiment?.score ?? 0,
        magnitude: s.sentiment?.magnitude ?? 0,
      })),
    };

    return { success: true, data: sentiment };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'NLP_ANALYZE_SENTIMENT_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err,
      },
    };
  }
}

/**
 * 内容分类 - 将文本分类到预定义的类别
 */
export async function classifyContent(
  text: string,
): Promise<NLPResult<ClassificationResult>> {
  try {
    const nlpClient = getClient();
    const document = {
      content: text,
      type: 'PLAIN_TEXT' as const,
    };

    const [result] = await nlpClient.classifyText({ document });

    const categories: ClassificationResult['categories'] = (result.categories ?? []).map((c) => ({
      name: c.name ?? '',
      confidence: c.confidence ?? 0,
    }));

    return { success: true, data: { categories } };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'NLP_CLASSIFY_CONTENT_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err,
      },
    };
  }
}

/**
 * 语法分析 - 分析句子结构、词性标注、依存关系
 */
export async function analyzeSyntax(
  text: string,
): Promise<NLPResult<SyntaxResult>> {
  try {
    const nlpClient = getClient();
    const document = {
      content: text,
      type: 'PLAIN_TEXT' as const,
    };

    const [result] = await nlpClient.analyzeSyntax({ document });

    const tokens: Token[] = (result.tokens ?? []).map((t) => ({
      text: t.text?.content ?? '',
      partOfSpeech: {
        tag: String(t.partOfSpeech?.tag ?? 'UNKNOWN'),
        aspect: String(t.partOfSpeech?.aspect ?? 'UNKNOWN'),
        case: String(t.partOfSpeech?.case ?? 'UNKNOWN'),
        form: String(t.partOfSpeech?.form ?? 'UNKNOWN'),
        gender: String(t.partOfSpeech?.gender ?? 'UNKNOWN'),
        mood: String(t.partOfSpeech?.mood ?? 'UNKNOWN'),
        number: String(t.partOfSpeech?.number ?? 'UNKNOWN'),
        person: String(t.partOfSpeech?.person ?? 'UNKNOWN'),
        proper: String(t.partOfSpeech?.proper ?? 'UNKNOWN'),
        reciprocity: String(t.partOfSpeech?.reciprocity ?? 'UNKNOWN'),
        tense: String(t.partOfSpeech?.tense ?? 'UNKNOWN'),
        voice: String(t.partOfSpeech?.voice ?? 'UNKNOWN'),
      },
      lemma: t.lemma ?? '',
      dependencyEdge: {
        headTokenIndex: t.dependencyEdge?.headTokenIndex ?? 0,
        label: String(t.dependencyEdge?.label ?? 'UNKNOWN'),
      },
    }));

    const sentences: SyntaxResult['sentences'] = (result.sentences ?? []).map((s) => ({
      text: s.text?.content ?? '',
      beginOffset: s.text?.beginOffset ?? 0,
    }));

    return {
      success: true,
      data: {
        tokens,
        language: result.language ?? 'en',
        sentences,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'NLP_ANALYZE_SYNTAX_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err,
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export const nlp = {
  analyzeEntities,
  analyzeSentiment,
  classifyContent,
  analyzeSyntax,
};

export default nlp;