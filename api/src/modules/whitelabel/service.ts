import { db } from '../../shared/database.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Branding {
  id: string;
  project_id: string;
  brand_name: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  custom_domain: string | null;
  favicon_url: string | null;
  custom_css: string | null;
  custom_js: string | null;
  email_template: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function getBranding(projectId: string): Promise<Branding | null> {
  const branding = await db('project_branding')
    .where('project_id', projectId)
    .first();

  return branding ? formatBranding(branding) : null;
}

export async function updateBranding(
  projectId: string,
  data: {
    brand_name?: string;
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
    custom_domain?: string;
    favicon_url?: string;
    custom_css?: string;
    custom_js?: string;
    email_template?: string;
  },
): Promise<Branding> {
  const existing = await db('project_branding').where('project_id', projectId).first();

  if (existing) {
    const updateData: Record<string, unknown> = {};
    if (data.brand_name !== undefined) updateData['brand_name'] = data.brand_name;
    if (data.logo_url !== undefined) updateData['logo_url'] = data.logo_url;
    if (data.primary_color !== undefined) updateData['primary_color'] = data.primary_color;
    if (data.secondary_color !== undefined) updateData['secondary_color'] = data.secondary_color;
    if (data.custom_domain !== undefined) updateData['custom_domain'] = data.custom_domain;
    if (data.favicon_url !== undefined) updateData['favicon_url'] = data.favicon_url;
    if (data.custom_css !== undefined) updateData['custom_css'] = data.custom_css;
    if (data.custom_js !== undefined) updateData['custom_js'] = data.custom_js;
    if (data.email_template !== undefined) updateData['email_template'] = data.email_template;
    updateData['updated_at'] = db.fn.now();

    const [updated] = await db('project_branding')
      .where('project_id', projectId)
      .update(updateData)
      .returning('*');

    return formatBranding(updated);
  }

  // Create new
  const { v4: uuidv4 } = await import('uuid');
  const id = uuidv4();

  const [created] = await db('project_branding')
    .insert({
      id,
      project_id: projectId,
      brand_name: data.brand_name ?? 'Crane SEO',
      logo_url: data.logo_url ?? '/logo.png',
      primary_color: data.primary_color ?? '#2563eb',
      secondary_color: data.secondary_color ?? '#1e40af',
      custom_domain: data.custom_domain ?? null,
      favicon_url: data.favicon_url ?? null,
      custom_css: data.custom_css ?? null,
      custom_js: data.custom_js ?? null,
      email_template: data.email_template ?? null,
    })
    .returning('*');

  return formatBranding(created);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBranding(raw: Record<string, unknown>): Branding {
  return {
    id: raw['id'] as string,
    project_id: raw['project_id'] as string,
    brand_name: raw['brand_name'] as string,
    logo_url: raw['logo_url'] as string,
    primary_color: raw['primary_color'] as string,
    secondary_color: raw['secondary_color'] as string,
    custom_domain: (raw['custom_domain'] as string) ?? null,
    favicon_url: (raw['favicon_url'] as string) ?? null,
    custom_css: (raw['custom_css'] as string) ?? null,
    custom_js: (raw['custom_js'] as string) ?? null,
    email_template: (raw['email_template'] as string) ?? null,
    created_at: raw['created_at'] as string,
    updated_at: raw['updated_at'] as string,
  };
}

export default {
  getBranding,
  updateBranding,
};