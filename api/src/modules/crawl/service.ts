import { db } from '../../shared/database.js';
import { crawlQueue, auditQueue } from '../../shared/queue.js';
import type { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CrawlPageRecord {
  id: string;
  project_id: string;
  url: string;
  title: string | null;
  status_code: number | null;
  load_time_ms: number | null;
  content_length: number | null;
  meta_description: string | null;
  h1: string | null;
  h2_count: number;
  has_schema: boolean;
  schema_types: string[] | null;
  word_count: number | null;
  internal_links_count: number;
  external_links_count: number;
  images_count: number;
  images_without_alt: number;
  canonical_url: string | null;
  mobile_friendly: boolean | null;
  crawled_at: string;
}

export interface CrawlIssueRecord {
  id: string;
  project_id: string;
  page_id: string | null;
  rule_id: string;
  severity: 'critical' | 'error' | 'warning' | 'info';
  category: string;
  message: string;
  element: string | null;
  url: string | null;
  status: 'open' | 'in_progress' | 'resolved' | 'ignored';
  created_at: string;
  resolved_at: string | null;
}

export interface TaskRecord {
  id: string;
  project_id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  result: Record<string, unknown>;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface PagesListParams {
  projectId: string;
  page: number;
  pageSize: number;
  statusCode?: number;
  search?: string;
}

export interface IssuesListParams {
  projectId: string;
  page: number;
  pageSize: number;
  severity?: string;
  status?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

// ---------------------------------------------------------------------------
// Crawl Operations
// ---------------------------------------------------------------------------

export async function triggerCrawl(
  projectId: string,
  options: { url?: string; maxPages?: number; concurrency?: number } = {},
): Promise<TaskRecord> {
  const taskId = uuidv4();

  const [taskRecord] = await db('tasks')
    .insert({
      id: taskId,
      project_id: projectId,
      type: 'crawl',
      status: 'pending',
      progress: 0,
      result: '{}',
    })
    .returning('*');

  try {
    await crawlQueue.add(
      'crawl-project',
      {
        taskId,
        projectId,
        url: options.url,
        maxPages: options.maxPages ?? 500,
        concurrency: options.concurrency ?? 5,
      },
      {
        jobId: taskId,
      },
    );
  } catch (queueErr) {
    console.warn('[CrawlService] Queue add failed (Redis may be down):', queueErr);
    // Still return the task - it was created in DB
  }

  return taskRecord as TaskRecord;
}

export async function getCrawlStatus(taskId: string): Promise<TaskRecord | null> {
  const record = await db('tasks').where('id', taskId).first();
  return (record as TaskRecord) ?? null;
}

// ---------------------------------------------------------------------------
// Audit Operations
// ---------------------------------------------------------------------------

export async function triggerAudit(
  projectId: string,
  options: { url?: string; auditType?: string } = {},
): Promise<TaskRecord> {
  const taskId = uuidv4();

  const [taskRecord] = await db('tasks')
    .insert({
      id: taskId,
      project_id: projectId,
      type: 'audit',
      status: 'pending',
      progress: 0,
      result: '{}',
    })
    .returning('*');

  try {
    await auditQueue.add(
      'audit-project',
      {
        taskId,
        projectId,
        url: options.url,
        auditType: options.auditType ?? 'full',
      },
      {
        jobId: taskId,
      },
    );
  } catch (queueErr) {
    console.warn('[CrawlService] Audit queue add failed (Redis may be down):', queueErr);
    // Still return the task - it was created in DB
  }

  return taskRecord as TaskRecord;
}

export async function getAuditStatus(taskId: string): Promise<TaskRecord | null> {
  const record = await db('tasks').where('id', taskId).first();
  return (record as TaskRecord) ?? null;
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

export async function getPages(
  params: PagesListParams,
): Promise<PaginatedResult<CrawlPageRecord>> {
  const { projectId, page, pageSize, statusCode, search } = params;

  let query = db('crawl_pages')
    .where('project_id', projectId);

  if (statusCode) {
    query = query.where('status_code', statusCode);
  }
  if (search) {
    query = query.where(function () {
      this.where('url', 'ilike', `%${search}%`)
        .orWhere('title', 'ilike', `%${search}%`);
    });
  }

  const [{ count }] = await query.clone().count<{ count: string }[]>();
  const total = parseInt(count, 10);

  const items = await query
    .orderBy('crawled_at', 'desc')
    .offset((page - 1) * pageSize)
    .limit(pageSize);

  return { items: items as CrawlPageRecord[], total };
}

// ---------------------------------------------------------------------------
// Issues
// ---------------------------------------------------------------------------

export async function getIssues(
  params: IssuesListParams,
): Promise<PaginatedResult<CrawlIssueRecord>> {
  const { projectId, page, pageSize, severity, status } = params;

  let query = db('crawl_issues')
    .where('project_id', projectId);

  if (severity) {
    query = query.where('severity', severity);
  }
  if (status) {
    query = query.where('status', status);
  }

  const [{ count }] = await query.clone().count<{ count: string }[]>();
  const total = parseInt(count, 10);

  const items = await query
    .orderBy('created_at', 'desc')
    .offset((page - 1) * pageSize)
    .limit(pageSize);

  return { items: items as CrawlIssueRecord[], total };
}

// ---------------------------------------------------------------------------
// SEO Score
// ---------------------------------------------------------------------------

export interface SeoScore {
  overall: number;
  categories: {
    title: { score: number; issues: number };
    meta: { score: number; issues: number };
    headings: { score: number; issues: number };
    content: { score: number; issues: number };
    links: { score: number; issues: number };
    images: { score: number; issues: number };
    performance: { score: number; issues: number };
    mobile: { score: number; issues: number };
  };
  criticalIssues: number;
  warningIssues: number;
  infoIssues: number;
}

export async function getSeoScore(projectId: string): Promise<SeoScore> {
  const issues: CrawlIssueRecord[] = await db('crawl_issues')
    .where('project_id', projectId)
    .select('*');

  const categories: Record<string, { total: number; count: number }> = {
    title: { total: 0, count: 0 },
    meta: { total: 0, count: 0 },
    headings: { total: 0, count: 0 },
    content: { total: 0, count: 0 },
    links: { total: 0, count: 0 },
    images: { total: 0, count: 0 },
    performance: { total: 0, count: 0 },
    mobile: { total: 0, count: 0 },
  };

  let criticalIssues = 0;
  let warningIssues = 0;
  let infoIssues = 0;

  const severityWeight: Record<string, number> = {
    critical: 25,
    error: 15,
    warning: 8,
    info: 2,
  };

  for (const issue of issues) {
    const weight = severityWeight[issue.severity] ?? 2;

    switch (issue.severity) {
      case 'critical':
        criticalIssues++;
        break;
      case 'error':
        criticalIssues++;
        break;
      case 'warning':
        warningIssues++;
        break;
      case 'info':
        infoIssues++;
        break;
    }

    // Map category to our scoring categories
    const catLower = (issue.category ?? '').toLowerCase();
    let mappedCategory = 'content';

    if (catLower.includes('title') || catLower.includes('h1')) {
      mappedCategory = 'title';
    } else if (catLower.includes('meta') || catLower.includes('description') || catLower.includes('canonical')) {
      mappedCategory = 'meta';
    } else if (catLower.includes('heading') || catLower.includes('h2') || catLower.includes('h3')) {
      mappedCategory = 'headings';
    } else if (catLower.includes('link') || catLower.includes('url') || catLower.includes('anchor')) {
      mappedCategory = 'links';
    } else if (catLower.includes('image') || catLower.includes('alt') || catLower.includes('img')) {
      mappedCategory = 'images';
    } else if (catLower.includes('performance') || catLower.includes('speed') || catLower.includes('load')) {
      mappedCategory = 'performance';
    } else if (catLower.includes('mobile') || catLower.includes('responsive') || catLower.includes('viewport')) {
      mappedCategory = 'mobile';
    } else if (catLower.includes('content') || catLower.includes('word') || catLower.includes('text')) {
      mappedCategory = 'content';
    }

    if (categories[mappedCategory]) {
      categories[mappedCategory].total += weight;
      categories[mappedCategory].count++;
    }
  }

  // Calculate category scores (100 - deductions, min 0)
  const categoryScores: SeoScore['categories'] = {} as SeoScore['categories'];
  let totalScore = 0;
  let issueCount = 0;

  for (const [catName, catData] of Object.entries(categories)) {
    const score = Math.max(0, 100 - catData.total);
    categoryScores[catName as keyof SeoScore['categories']] = {
      score,
      issues: catData.count,
    };
    totalScore += score;
    issueCount += catData.count;
  }

  const overall = issueCount > 0
    ? Math.round(totalScore / Object.keys(categories).length)
    : 100;

  return {
    overall,
    categories: categoryScores,
    criticalIssues,
    warningIssues,
    infoIssues,
  };
}

// ---------------------------------------------------------------------------
// Internal Links
// ---------------------------------------------------------------------------

export interface InternalLinkItem {
  pageId: string;
  url: string;
  title: string | null;
  internalLinksCount: number;
  internalLinksInc: number;
}

export async function getInternalLinks(
  projectId: string,
  pageId?: string,
): Promise<InternalLinkItem[]> {
  let query = db('crawl_pages')
    .where('project_id', projectId)
    .where('internal_links_count', '>', 0);

  if (pageId) {
    query = query.where('id', pageId);
  }

  const pages = await query
    .orderBy('internal_links_count', 'desc')
    .select('id', 'url', 'title', 'internal_links_count');

  return (pages as Array<{
    id: string;
    url: string;
    title: string | null;
    internal_links_count: number;
  }>).map((p) => ({
    pageId: p.id,
    url: p.url,
    title: p.title,
    internalLinksCount: p.internal_links_count,
    internalLinksInc: p.internal_links_count,
  }));
}

// ---------------------------------------------------------------------------
// External Links
// ---------------------------------------------------------------------------

export interface ExternalLinkItem {
  pageId: string;
  url: string;
  title: string | null;
  externalLinksCount: number;
  externalLinksInc: number;
}

export async function getExternalLinks(
  projectId: string,
  pageId?: string,
): Promise<ExternalLinkItem[]> {
  let query = db('crawl_pages')
    .where('project_id', projectId)
    .where('external_links_count', '>', 0);

  if (pageId) {
    query = query.where('id', pageId);
  }

  const pages = await query
    .orderBy('external_links_count', 'desc')
    .select('id', 'url', 'title', 'external_links_count');

  return (pages as Array<{
    id: string;
    url: string;
    title: string | null;
    external_links_count: number;
  }>).map((p) => ({
    pageId: p.id,
    url: p.url,
    title: p.title,
    externalLinksCount: p.external_links_count,
    externalLinksInc: p.external_links_count,
  }));
}

// ---------------------------------------------------------------------------
// Image Analysis
// ---------------------------------------------------------------------------

export interface ImageAnalysisResult {
  projectId: string;
  totalImages: number;
  imagesWithoutAlt: number;
  imageIssues: Array<{
    id: string;
    pageId: string | null;
    url: string | null;
    severity: string;
    message: string;
    element: string | null;
  }>;
  pagesWithImageIssues: Array<{
    pageId: string;
    url: string;
    title: string | null;
    imagesCount: number;
    imagesWithoutAlt: number;
  }>;
}

export async function getImageAnalysis(projectId: string): Promise<ImageAnalysisResult> {
  // Get image-related issues
  const imageIssues = await db('crawl_issues')
    .where('project_id', projectId)
    .where(function () {
      this.where('category', 'ilike', '%image%')
        .orWhere('category', 'ilike', '%alt%')
        .orWhere('category', 'ilike', '%img%')
        .orWhere('rule_id', 'ilike', '%image%')
        .orWhere('rule_id', 'ilike', '%alt%')
        .orWhere('rule_id', 'ilike', '%img%');
    })
    .orderBy('severity', 'asc')
    .select('id', 'page_id', 'url', 'severity', 'message', 'element');

  // Get page-level image stats
  const pages = await db('crawl_pages')
    .where('project_id', projectId)
    .where('images_count', '>', 0)
    .orderBy('images_without_alt', 'desc')
    .select('id', 'url', 'title', 'images_count', 'images_without_alt');

  const typedPages = pages as Array<{
    id: string;
    url: string;
    title: string | null;
    images_count: number;
    images_without_alt: number;
  }>;

  const totalImages = typedPages.reduce((sum, p) => sum + (p.images_count ?? 0), 0);
  const imagesWithoutAlt = typedPages.reduce((sum, p) => sum + (p.images_without_alt ?? 0), 0);

  return {
    projectId,
    totalImages,
    imagesWithoutAlt,
    imageIssues: (imageIssues as Array<{
      id: string;
      page_id: string | null;
      url: string | null;
      severity: string;
      message: string;
      element: string | null;
    }>).map((i) => ({
      id: i.id,
      pageId: i.page_id,
      url: i.url,
      severity: i.severity,
      message: i.message,
      element: i.element,
    })),
    pagesWithImageIssues: typedPages.map((p) => ({
      pageId: p.id,
      url: p.url,
      title: p.title,
      imagesCount: p.images_count,
      imagesWithoutAlt: p.images_without_alt,
    })),
  };
}

// ---------------------------------------------------------------------------
// Structured Data Analysis
// ---------------------------------------------------------------------------

export interface StructuredDataResult {
  projectId: string;
  pagesWithSchema: number;
  totalPages: number;
  schemaTypes: Array<{ type: string; count: number }>;
  schemaIssues: Array<{
    id: string;
    pageId: string | null;
    url: string | null;
    severity: string;
    message: string;
  }>;
  pages: Array<{
    pageId: string;
    url: string;
    title: string | null;
    hasSchema: boolean;
    schemaTypes: string[] | null;
  }>;
}

export async function getStructuredData(projectId: string): Promise<StructuredDataResult> {
  // Get all pages
  const pages = await db('crawl_pages')
    .where('project_id', projectId)
    .select('id', 'url', 'title', 'has_schema', 'schema_types');

  const typedPages = pages as Array<{
    id: string;
    url: string;
    title: string | null;
    has_schema: boolean;
    schema_types: string[] | null;
  }>;

  const totalPages = typedPages.length;
  const pagesWithSchema = typedPages.filter((p) => p.has_schema).length;

  // Aggregate schema types
  const schemaTypeMap = new Map<string, number>();
  for (const page of typedPages) {
    if (page.schema_types && Array.isArray(page.schema_types)) {
      for (const stype of page.schema_types) {
        schemaTypeMap.set(stype, (schemaTypeMap.get(stype) ?? 0) + 1);
      }
    }
  }

  const schemaTypes = Array.from(schemaTypeMap.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  // Get schema-related issues
  const schemaIssues = await db('crawl_issues')
    .where('project_id', projectId)
    .where(function () {
      this.where('category', 'ilike', '%schema%')
        .orWhere('category', 'ilike', '%structured%')
        .orWhere('category', 'ilike', '%jsonld%')
        .orWhere('rule_id', 'ilike', '%schema%')
        .orWhere('rule_id', 'ilike', '%structured%')
        .orWhere('rule_id', 'ilike', '%jsonld%');
    })
    .orderBy('severity', 'asc')
    .select('id', 'page_id', 'url', 'severity', 'message');

  return {
    projectId,
    pagesWithSchema,
    totalPages,
    schemaTypes,
    schemaIssues: (schemaIssues as Array<{
      id: string;
      page_id: string | null;
      url: string | null;
      severity: string;
      message: string;
    }>).map((i) => ({
      id: i.id,
      pageId: i.page_id,
      url: i.url,
      severity: i.severity,
      message: i.message,
    })),
    pages: typedPages.map((p) => ({
      pageId: p.id,
      url: p.url,
      title: p.title,
      hasSchema: p.has_schema,
      schemaTypes: p.schema_types,
    })),
  };
}

export default {
  triggerCrawl,
  getCrawlStatus,
  triggerAudit,
  getAuditStatus,
  getPages,
  getIssues,
  getSeoScore,
  getInternalLinks,
  getExternalLinks,
  getImageAnalysis,
  getStructuredData,
};