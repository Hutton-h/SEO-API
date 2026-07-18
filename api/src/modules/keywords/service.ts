import { db } from '../../shared/database.js';
import type { Knex } from 'knex';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KeywordRecord {
  id: string;
  project_id: string;
  keyword: string;
  language: string;
  location_code: number;
  search_volume: number;
  competition: number;
  cpc: number;
  is_custom: boolean;
  created_at: string;
}

export interface KeywordAddInput {
  projectId: string;
  keyword: string;
  language?: string;
  locationCode?: number;
}

export interface KeywordListParams {
  projectId: string;
  page: number;
  pageSize: number;
  search?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

const TABLE = 'keywords';

export async function addKeyword(
  input: KeywordAddInput,
  trx?: Knex.Transaction,
): Promise<KeywordRecord> {
  const query = (trx ?? db)(TABLE);

  const [record] = await query
    .insert({
      project_id: input.projectId,
      keyword: input.keyword,
      language: input.language ?? 'en',
      location_code: input.locationCode ?? 0,
      is_custom: true,
    })
    .onConflict(['project_id', 'keyword'])
    .ignore()
    .returning('*');

  // If conflict ignored, return the existing record
  if (!record) {
    const existing = await query
      .where('project_id', input.projectId)
      .where('keyword', input.keyword)
      .first();
    return existing as KeywordRecord;
  }

  return record as KeywordRecord;
}

export async function getKeywords(
  params: KeywordListParams,
): Promise<PaginatedResult<KeywordRecord>> {
  const { projectId, page, pageSize, search } = params;

  let query = db(TABLE)
    .where('project_id', projectId);

  if (search) {
    query = query.where('keyword', 'ilike', `%${search}%`);
  }

  const [{ count }] = await query.clone().count<{ count: string }[]>();
  const total = parseInt(count, 10);

  const items = await query
    .orderBy('search_volume', 'desc')
    .orderBy('keyword', 'asc')
    .offset((page - 1) * pageSize)
    .limit(pageSize);

  return { items: items as KeywordRecord[], total };
}

export async function deleteKeyword(
  keywordId: string,
  trx?: Knex.Transaction,
): Promise<boolean> {
  const query = (trx ?? db)(TABLE).where('id', keywordId);
  const deleted = await query.delete();
  return deleted > 0;
}

export async function getKeywordById(
  keywordId: string,
): Promise<KeywordRecord | null> {
  const record = await db(TABLE).where('id', keywordId).first();
  return (record as KeywordRecord) ?? null;
}

export async function importDefaultKeywords(
  projectId: string,
): Promise<{ importedCount: number }> {
  const defaultKeywords = await db(TABLE)
    .where('is_custom', false)
    .select('keyword', 'language', 'location_code');

  if (defaultKeywords.length === 0) {
    return { importedCount: 0 };
  }

  const rowsToInsert = defaultKeywords.map((kw) => ({
    project_id: projectId,
    keyword: kw.keyword,
    language: kw.language,
    location_code: kw.location_code,
    is_custom: true,
  }));

  // Use onConflict to skip duplicates
  const inserted = await db(TABLE)
    .insert(rowsToInsert)
    .onConflict(['project_id', 'keyword'])
    .ignore()
    .returning('id');

  return { importedCount: inserted.length };
}

export default {
  addKeyword,
  getKeywords,
  deleteKeyword,
  getKeywordById,
  importDefaultKeywords,
};