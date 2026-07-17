import { db } from '../../shared/database.js';
import type { Knex } from 'knex';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProjectRecord {
  id: string;
  name: string;
  domain: string;
  user_id: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreateInput {
  name: string;
  domain: string;
  user_id: string;
  settings?: Record<string, unknown>;
}

export interface ProjectUpdateInput {
  name?: string;
  domain?: string;
  settings?: Record<string, unknown>;
}

export interface ProjectListParams {
  page: number;
  pageSize: number;
  userId: string;
  search?: string;
}

export interface ProjectListResult {
  items: ProjectRecord[];
  total: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

const TABLE = 'projects';

export async function createProject(
  input: ProjectCreateInput,
  trx?: Knex.Transaction,
): Promise<ProjectRecord> {
  const query = (trx ?? db)(TABLE);
  const [record] = await query
    .insert({
      name: input.name,
      domain: input.domain,
      user_id: input.user_id,
      settings: input.settings ? JSON.stringify(input.settings) : '{}',
    })
    .returning('*');

  return record as ProjectRecord;
}

export async function getProjectsByUser(
  params: ProjectListParams,
): Promise<ProjectListResult> {
  const { page, pageSize, userId, search } = params;

  let query = db(TABLE)
    .where('user_id', userId)
    .orderBy('created_at', 'desc');

  if (search) {
    query = query.where(function () {
      this.where('name', 'ilike', `%${search}%`)
        .orWhere('domain', 'ilike', `%${search}%`);
    });
  }

  const [{ count }] = await query.clone().count<{ count: string }[]>();
  const total = parseInt(count, 10);

  const items = await query
    .offset((page - 1) * pageSize)
    .limit(pageSize);

  return { items: items as ProjectRecord[], total };
}

export async function getProjectById(
  id: string,
  trx?: Knex.Transaction,
): Promise<ProjectRecord | null> {
  const query = (trx ?? db)(TABLE).where('id', id).first();
  const record = await query;
  return (record as ProjectRecord) ?? null;
}

export async function updateProject(
  id: string,
  input: ProjectUpdateInput,
  trx?: Knex.Transaction,
): Promise<ProjectRecord | null> {
  const query = (trx ?? db)(TABLE).where('id', id);
  const updateData: Record<string, unknown> = {
    updated_at: db.fn.now(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.domain !== undefined) updateData.domain = input.domain;
  if (input.settings !== undefined) {
    updateData.settings = JSON.stringify(input.settings);
  }

  const [record] = await query.update(updateData).returning('*');
  return (record as ProjectRecord) ?? null;
}

export async function deleteProject(
  id: string,
  trx?: Knex.Transaction,
): Promise<boolean> {
  const query = (trx ?? db)(TABLE).where('id', id);
  const deleted = await query.delete();
  return deleted > 0;
}

export async function projectBelongsToUser(
  projectId: string,
  userId: string,
): Promise<boolean> {
  const record = await db(TABLE)
    .where('id', projectId)
    .where('user_id', userId)
    .first();
  return !!record;
}

export default {
  createProject,
  getProjectsByUser,
  getProjectById,
  updateProject,
  deleteProject,
  projectBelongsToUser,
};