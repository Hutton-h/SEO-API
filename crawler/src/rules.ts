// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

export interface IssueRule {
  id: string;
  severity: SeverityLevel;
  category: string;
  message: string;
  check: (pageData: PageData) => IssueCheckResult | null;
}

export interface PageData {
  url: string;
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  h2Count: number;
  hasSchema: boolean;
  schemaTypes: string[];
  wordCount: number | null;
  internalLinksCount: number;
  externalLinksCount: number;
  imagesCount: number;
  imagesWithoutAlt: number;
  canonicalUrl: string | null;
  mobileFriendly: boolean | null;
  statusCode: number | null;
  loadTimeMs: number | null;
  isHttps: boolean;
  brokenInternalLinks: string[];
}

export interface IssueCheckResult {
  severity: SeverityLevel;
  category: string;
  message: string;
  element?: string;
}

export interface DetectedIssue {
  rule_id: string;
  severity: string;
  category: string;
  message: string;
  element: string | null;
  url: string;
}

// ---------------------------------------------------------------------------
// Built-in Rules
// ---------------------------------------------------------------------------

const rules: IssueRule[] = [
  {
    id: 'missing-title',
    severity: 'critical',
    category: 'SEO',
    message: '页面缺少 title 标签',
    check: (page) => {
      if (!page.title || page.title.trim().length === 0) {
        return {
          severity: 'critical',
          category: 'SEO',
          message: '页面缺少 title 标签，这会严重影响搜索引擎排名',
        };
      }
      return null;
    },
  },
  {
    id: 'missing-meta-description',
    severity: 'high',
    category: 'SEO',
    message: '页面缺少 meta description',
    check: (page) => {
      if (!page.metaDescription || page.metaDescription.trim().length === 0) {
        return {
          severity: 'high',
          category: 'SEO',
          message: '页面缺少 meta description，可能影响搜索结果中的展示效果',
        };
      }
      return null;
    },
  },
  {
    id: 'title-too-long',
    severity: 'medium',
    category: 'SEO',
    message: 'title 标签过长（超过 60 字符）',
    check: (page) => {
      if (page.title && page.title.length > 60) {
        return {
          severity: 'medium',
          category: 'SEO',
          message: `title 标签长度为 ${page.title.length} 字符，超过推荐的 60 字符上限，可能在搜索结果中被截断`,
          element: page.title,
        };
      }
      return null;
    },
  },
  {
    id: 'title-too-short',
    severity: 'low',
    category: 'SEO',
    message: 'title 标签过短（少于 10 字符）',
    check: (page) => {
      if (page.title && page.title.length < 10 && page.title.trim().length > 0) {
        return {
          severity: 'low',
          category: 'SEO',
          message: `title 标签长度仅为 ${page.title.length} 字符，建议至少 10 字符以充分描述页面内容`,
          element: page.title,
        };
      }
      return null;
    },
  },
  {
    id: 'meta-description-too-long',
    severity: 'medium',
    category: 'SEO',
    message: 'meta description 过长（超过 160 字符）',
    check: (page) => {
      if (page.metaDescription && page.metaDescription.length > 160) {
        return {
          severity: 'medium',
          category: 'SEO',
          message: `meta description 长度为 ${page.metaDescription.length} 字符，超过推荐的 160 字符上限，可能在搜索结果中被截断`,
          element: page.metaDescription.substring(0, 200),
        };
      }
      return null;
    },
  },
  {
    id: 'missing-h1',
    severity: 'high',
    category: 'SEO',
    message: '页面缺少 H1 标签',
    check: (page) => {
      if (!page.h1 || page.h1.trim().length === 0) {
        return {
          severity: 'high',
          category: 'SEO',
          message: '页面缺少 H1 标签，H1 是页面主标题，对 SEO 非常重要',
        };
      }
      return null;
    },
  },
  {
    id: 'multiple-h1',
    severity: 'low',
    category: 'SEO',
    message: '页面存在多个 H1 标签',
    check: (page) => {
      // h1 is a single string from the first H1, but we detect multiple H1 via a separate count
      // This rule is checked elsewhere in the crawler's requestHandler
      return null;
    },
  },
  {
    id: 'missing-schema',
    severity: 'high',
    category: 'Structured Data',
    message: '页面缺少结构化数据标记',
    check: (page) => {
      if (!page.hasSchema || page.schemaTypes.length === 0) {
        return {
          severity: 'high',
          category: 'Structured Data',
          message: '页面缺少结构化数据（Schema.org）标记，可能影响富文本摘要展示',
        };
      }
      return null;
    },
  },
  {
    id: 'missing-product-schema',
    severity: 'high',
    category: 'Structured Data',
    message: '产品页缺少 Product schema 标记',
    check: (page) => {
      // Only flag if the URL appears to be a product page and lacks Product schema
      const urlLower = page.url.toLowerCase();
      const isProductLike = /\/product(s)?\//.test(urlLower)
        || /\/(crane|hoist|equipment)-[a-z0-9-]+/i.test(urlLower)
        || /\/products?\//.test(urlLower);

      if (isProductLike && !page.schemaTypes.includes('Product')) {
        return {
          severity: 'high',
          category: 'Structured Data',
          message: '产品页面缺少 Product schema 标记，建议添加产品结构化数据以提升搜索展示效果（起重机行业专用检测）',
        };
      }
      return null;
    },
  },
  {
    id: 'missing-canonical',
    severity: 'high',
    category: 'SEO',
    message: '页面缺少 canonical URL',
    check: (page) => {
      if (!page.canonicalUrl) {
        return {
          severity: 'high',
          category: 'SEO',
          message: '页面缺少 canonical URL，可能导致重复内容问题',
        };
      }
      return null;
    },
  },
  {
    id: 'images-missing-alt',
    severity: 'medium',
    category: 'Accessibility',
    message: '图片缺少 alt 属性',
    check: (page) => {
      if (page.imagesWithoutAlt > 0) {
        return {
          severity: 'medium',
          category: 'Accessibility',
          message: `${page.imagesWithoutAlt}/${page.imagesCount} 张图片缺少 alt 属性，影响无障碍访问和图片 SEO`,
        };
      }
      return null;
    },
  },
  {
    id: 'low-word-count',
    severity: 'medium',
    category: 'Content',
    message: '页面内容字数不足',
    check: (page) => {
      if (page.wordCount !== null && page.wordCount < 300) {
        return {
          severity: 'medium',
          category: 'Content',
          message: `页面内容字数仅 ${page.wordCount} 字，少于推荐的 300 字，搜索引擎可能认为内容不够丰富`,
        };
      }
      return null;
    },
  },
  {
    id: 'slow-load-time',
    severity: 'high',
    category: 'Performance',
    message: '页面加载时间过长',
    check: (page) => {
      if (page.loadTimeMs !== null && page.loadTimeMs > 3000) {
        return {
          severity: 'high',
          category: 'Performance',
          message: `页面加载时间为 ${(page.loadTimeMs / 1000).toFixed(1)}s，超过 3 秒阈值，可能影响用户体验和搜索排名`,
        };
      }
      return null;
    },
  },
  {
    id: 'not-mobile-friendly',
    severity: 'high',
    category: 'Mobile',
    message: '页面未设置移动端适配',
    check: (page) => {
      if (page.mobileFriendly === false) {
        return {
          severity: 'high',
          category: 'Mobile',
          message: '页面未设置 viewport meta 标签，移动端体验不佳，可能影响移动搜索排名',
        };
      }
      return null;
    },
  },
  {
    id: 'broken-internal-link',
    severity: 'critical',
    category: 'Technical',
    message: '页面存在失效的内部链接',
    check: (page) => {
      if (page.brokenInternalLinks.length > 0) {
        return {
          severity: 'critical',
          category: 'Technical',
          message: `检测到 ${page.brokenInternalLinks.length} 个失效的内部链接（404 等），影响用户体验和爬虫抓取`,
          element: page.brokenInternalLinks.slice(0, 5).join(', '),
        };
      }
      return null;
    },
  },
  {
    id: 'missing-ssl',
    severity: 'critical',
    category: 'Security',
    message: '页面未使用 HTTPS',
    check: (page) => {
      if (!page.isHttps) {
        return {
          severity: 'critical',
          category: 'Security',
          message: '页面未使用 HTTPS 协议，存在安全隐患，且搜索引擎会降低 HTTP 页面的排名',
        };
      }
      return null;
    },
  },
  {
    id: 'too-many-external-links',
    severity: 'low',
    category: 'SEO',
    message: '页面外部链接过多',
    check: (page) => {
      if (page.externalLinksCount > 50) {
        return {
          severity: 'low',
          category: 'SEO',
          message: `页面包含 ${page.externalLinksCount} 个外部链接，过多外部链接可能稀释页面权重`,
        };
      }
      return null;
    },
  },
];

// ---------------------------------------------------------------------------
// Rules Engine
// ---------------------------------------------------------------------------

/**
 * Run all built-in rules against a page's data.
 * Returns a list of detected issues.
 */
export function runRules(url: string, pageData: PageData): DetectedIssue[] {
  const issues: DetectedIssue[] = [];

  for (const rule of rules) {
    const result = rule.check(pageData);
    if (result) {
      issues.push({
        rule_id: rule.id,
        severity: result.severity,
        category: result.category,
        message: result.message,
        element: result.element ?? null,
        url,
      });
    }
  }

  return issues;
}

/**
 * Get all registered rules.
 */
export function getRules(): IssueRule[] {
  return rules;
}

/**
 * Detect multiple H1 tags specifically.
 * This is called separately from the crawler's requestHandler since it
 * needs the actual H1 count from the DOM.
 */
export function checkMultipleH1(h1Count: number, url: string): DetectedIssue | null {
  if (h1Count > 1) {
    return {
      rule_id: 'multiple-h1',
      severity: 'low',
      category: 'SEO',
      message: `页面存在 ${h1Count} 个 H1 标签，通常建议每个页面只有一个 H1 作为主标题`,
      element: null,
      url,
    };
  }
  return null;
}

export default { runRules, getRules, checkMultipleH1 };