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
  options: { maxPages?: number; concurrency?: number } = {},
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

  await crawlQueue.add(
    'crawl-project',
    {
      taskId,
      projectId,
      maxPages: options.maxPages ?? 500,
      concurrency: options.concurrency ?? 5,
    },
    {
      jobId: taskId,
    },
  );

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
  options: { auditType?: string } = {},
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

  await auditQueue.add(
    'audit-project',
    {
      taskId,
      projectId,
      auditType: options.auditType ?? 'full',
    },
    {
      jobId: taskId,
    },
  );

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

export default {
  triggerCrawl,
  getCrawlStatus,
  triggerAudit,
  getAuditStatus,
  getPages,
  getIssues,
};