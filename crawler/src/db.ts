import knex, { type Knex } from 'knex';
import config from './config.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CrawlPageData {
  id?: string;
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
  schema_types: string[];
  word_count: number | null;
  internal_links_count: number;
  external_links_count: number;
  images_count: number;
  images_without_alt: number;
  canonical_url: string | null;
  mobile_friendly: boolean | null;
  crawled_at?: string;
}

export interface CrawlIssueData {
  project_id: string;
  page_id: string | null;
  rule_id: string;
  severity: string;
  category: string;
  message: string;
  element: string | null;
  url: string | null;
  status: string;
}

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ProjectRecord {
  id: string;
  name: string;
  domain: string;
  user_id: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Knex instance
// ---------------------------------------------------------------------------

const db: Knex = knex({
  client: 'pg',
  connection: {
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.database,
  },
  pool: {
    min: 2,
    max: 10,
  },
  acquireConnectionTimeout: 10000,
});

export async function testConnection(): Promise<boolean> {
  try {
    await db.raw('SELECT 1');
    console.log('[DB] Connection established successfully');
    return true;
  } catch (error) {
    console.error('[DB] Connection failed:', error);
    return false;
  }
}

export async function closeConnection(): Promise<void> {
  await db.destroy();
  console.log('[DB] Connection closed');
}

// ---------------------------------------------------------------------------
// Crawl Pages
// ---------------------------------------------------------------------------

/**
 * Insert or update a crawl_page record.
 * Uses ON CONFLICT on (project_id, url) to upsert.
 */
export async function savePage(
  projectId: string,
  pageData: CrawlPageData,
): Promise<CrawlPageData> {
  const existing = await db('crawl_pages')
    .where({ project_id: projectId, url: pageData.url })
    .first();

  if (existing) {
    const [updated] = await db('crawl_pages')
      .where({ id: existing.id })
      .update({
        title: pageData.title,
        status_code: pageData.status_code,
        load_time_ms: pageData.load_time_ms,
        content_length: pageData.content_length,
        meta_description: pageData.meta_description,
        h1: pageData.h1,
        h2_count: pageData.h2_count,
        has_schema: pageData.has_schema,
        schema_types: pageData.schema_types,
        word_count: pageData.word_count,
        internal_links_count: pageData.internal_links_count,
        external_links_count: pageData.external_links_count,
        images_count: pageData.images_count,
        images_without_alt: pageData.images_without_alt,
        canonical_url: pageData.canonical_url,
        mobile_friendly: pageData.mobile_friendly,
        crawled_at: db.fn.now(),
      })
      .returning('*');

    return updated as CrawlPageData;
  }

  const [inserted] = await db('crawl_pages')
    .insert({
      project_id: projectId,
      url: pageData.url,
      title: pageData.title,
      status_code: pageData.status_code,
      load_time_ms: pageData.load_time_ms,
      content_length: pageData.content_length,
      meta_description: pageData.meta_description,
      h1: pageData.h1,
      h2_count: pageData.h2_count,
      has_schema: pageData.has_schema,
      schema_types: pageData.schema_types,
      word_count: pageData.word_count,
      internal_links_count: pageData.internal_links_count,
      external_links_count: pageData.external_links_count,
      images_count: pageData.images_count,
      images_without_alt: pageData.images_without_alt,
      canonical_url: pageData.canonical_url,
      mobile_friendly: pageData.mobile_friendly,
      crawled_at: db.fn.now(),
    })
    .returning('*');

  return inserted as CrawlPageData;
}

/**
 * Get a specific page by ID.
 */
export async function getPageById(pageId: string): Promise<CrawlPageData | null> {
  const record = await db('crawl_pages').where('id', pageId).first();
  return (record as CrawlPageData) ?? null;
}

// ---------------------------------------------------------------------------
// Crawl Issues
// ---------------------------------------------------------------------------

/**
 * Batch insert crawl issues.
 * Deletes existing issues for the same project (by rule_id, url) before inserting.
 */
export async function saveIssues(
  projectId: string,
  issues: CrawlIssueData[],
): Promise<void> {
  if (issues.length === 0) return;

  // Delete existing issues for the same project to avoid duplicates
  // We match by project_id and rule_id to allow re-crawling to refresh issues
  const ruleIds = [...new Set(issues.map((i) => i.rule_id))];
  await db('crawl_issues')
    .where('project_id', projectId)
    .whereIn('rule_id', ruleIds)
    .del();

  // Insert in batches of 50 to avoid overwhelming the DB
  const batchSize = 50;
  for (let i = 0; i < issues.length; i += batchSize) {
    const batch = issues.slice(i, i + batchSize);
    await db('crawl_issues').insert(batch);
  }
}

/**
 * Get all issues for a project.
 */
export async function getProjectIssues(
  projectId: string,
): Promise<CrawlIssueData[]> {
  const records = await db('crawl_issues')
    .where('project_id', projectId)
    .orderBy('severity', 'asc')
    .orderBy('created_at', 'desc');

  return records as CrawlIssueData[];
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

/**
 * Update task status with optional progress, result, and error.
 */
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  progress?: number,
  result?: Record<string, unknown>,
  error?: string,
): Promise<void> {
  const updateData: Record<string, unknown> = { status };

  if (progress !== undefined) {
    updateData.progress = progress;
  }

  if (result !== undefined) {
    updateData.result = JSON.stringify(result);
  }

  if (error !== undefined) {
    updateData.error = error;
  }

  if (status === 'running' && progress === undefined) {
    updateData.started_at = db.fn.now();
  }

  if (status === 'completed' || status === 'failed') {
    updateData.completed_at = db.fn.now();
  }

  await db('tasks').where('id', taskId).update(updateData);
}

/**
 * Get a task by ID.
 */
export async function getTaskById(taskId: string): Promise<Record<string, unknown> | null> {
  const record = await db('tasks').where('id', taskId).first();
  return record ?? null;
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

/**
 * Get all pages for a project.
 */
export async function getProjectPages(
  projectId: string,
): Promise<CrawlPageData[]> {
  const records = await db('crawl_pages')
    .where('project_id', projectId)
    .orderBy('crawled_at', 'desc');

  return records as CrawlPageData[];
}

/**
 * Get project information by ID.
 */
export async function getProjectById(
  projectId: string,
): Promise<ProjectRecord | null> {
  const record = await db('projects').where('id', projectId).first();
  return (record as ProjectRecord) ?? null;
}

export { db };
export default db;