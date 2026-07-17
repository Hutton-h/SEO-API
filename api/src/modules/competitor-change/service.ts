import { db } from '../../shared/database.js';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CompetitorChange {
  id: string;
  project_id: string;
  competitor_id: string;
  competitor_name: string;
  competitor_domain: string;
  change_type: 'title' | 'meta' | 'h1' | 'structure' | 'content' | 'new_page' | 'removed_page';
  old_value: string | null;
  new_value: string | null;
  url: string;
  severity: 'major' | 'minor' | 'info';
  detected_at: string;
}

export interface CompetitorChangeReport {
  projectId: string;
  totalChanges: number;
  changesByType: Record<string, number>;
  changesByCompetitor: Record<string, number>;
  recentChanges: CompetitorChange[];
  lastCheckedAt: string | null;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function getChanges(
  projectId: string,
  params: {
    page: number;
    pageSize: number;
    competitorId?: string;
    changeType?: string;
    days?: number;
  },
): Promise<PaginatedResult<CompetitorChange>> {
  const { page, pageSize, competitorId, changeType, days } = params;

  let query = db('competitor_changes').where('project_id', projectId);

  if (competitorId) query = query.where('competitor_id', competitorId);
  if (changeType) query = query.where('change_type', changeType);
  if (days) {
    query = query.where('detected_at', '>=', db.raw(`NOW() - INTERVAL '${days} days'`));
  }

  const [{ count }] = await query.clone().clearSelect().count<{ count: string }[]>();
  const total = parseInt(count, 10);

  const items = await query
    .orderBy('detected_at', 'desc')
    .offset((page - 1) * pageSize)
    .limit(pageSize);

  return { items: (items as Record<string, unknown>[]).map(formatChange), total };
}

export async function checkNow(projectId: string): Promise<CompetitorChangeReport> {
  const project = await db('projects').where('id', projectId).first();
  if (!project) {
    throw new Error('Project not found');
  }

  const competitors = await db('competitor_domains')
    .where('project_id', projectId)
    .select('id', 'name', 'domain');

  const allChanges: CompetitorChange[] = [];

  for (const competitor of competitors as Array<{ id: string; name: string; domain: string }>) {
    const changes = await detectChanges(projectId, competitor);
    allChanges.push(...changes);
  }

  // Build report
  const changesByType: Record<string, number> = {};
  const changesByCompetitor: Record<string, number> = {};

  for (const change of allChanges) {
    changesByType[change.change_type] = (changesByType[change.change_type] ?? 0) + 1;
    changesByCompetitor[change.competitor_name] = (changesByCompetitor[change.competitor_name] ?? 0) + 1;
  }

  return {
    projectId,
    totalChanges: allChanges.length,
    changesByType,
    changesByCompetitor,
    recentChanges: allChanges.slice(0, 20),
    lastCheckedAt: new Date().toISOString(),
  };
}

async function detectChanges(
  projectId: string,
  competitor: { id: string; name: string; domain: string },
): Promise<CompetitorChange[]> {
  const changes: CompetitorChange[] = [];

  // Get previous content history entries
  const previousEntries = await db('content_history')
    .where('project_id', projectId)
    .where('competitor_id', competitor.id)
    .orderBy('checked_at', 'desc')
    .limit(1);

  // Fetch current content
  let currentContent = '';
  let currentTitle = '';
  let currentMeta = '';
  let currentH1 = '';

  try {
    const response = await axios.get(`https://${competitor.domain}`, {
      timeout: 15000,
      headers: { 'User-Agent': 'CraneSEO-ChangeDetector/1.0' },
    });
    const html = response.data as string;

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    currentTitle = titleMatch ? titleMatch[1].trim() : '';

    const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i)
      ?? html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["'][^>]*>/i);
    currentMeta = metaMatch ? metaMatch[1].trim() : '';

    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    currentH1 = h1Match ? h1Match[1].trim() : '';

    currentContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  } catch {
    // If we can't fetch, return empty changes
    return changes;
  }

  const url = `https://${competitor.domain}`;

  if (previousEntries.length > 0) {
    const prev = previousEntries[0] as Record<string, unknown>;
    const prevTitle = (prev['title'] as string) ?? '';
    const prevMeta = (prev['meta_description'] as string) ?? '';
    const prevH1 = (prev['h1'] as string) ?? '';
    const prevContent = (prev['content'] as string) ?? '';

    // Check title changes
    if (prevTitle && currentTitle && prevTitle !== currentTitle) {
      const change = await saveChange(projectId, competitor, 'title', prevTitle, currentTitle, url, 'major');
      changes.push(change);
    }

    // Check meta changes
    if (prevMeta && currentMeta && prevMeta !== currentMeta) {
      const change = await saveChange(projectId, competitor, 'meta', prevMeta, currentMeta, url, 'major');
      changes.push(change);
    }

    // Check h1 changes
    if (prevH1 && currentH1 && prevH1 !== currentH1) {
      const change = await saveChange(projectId, competitor, 'h1', prevH1, currentH1, url, 'major');
      changes.push(change);
    }

    // Check content structure changes
    if (prevContent && currentContent) {
      const similarity = calculateSimilarity(prevContent, currentContent);
      if (similarity < 0.7) {
        const change = await saveChange(projectId, competitor, 'structure', null, null, url, similarity < 0.5 ? 'major' : 'minor');
        changes.push(change);
      }
    }
  }

  // Store current content for future comparison
  await db('content_history').insert({
    id: uuidv4(),
    project_id: projectId,
    competitor_id: competitor.id,
    url,
    title: currentTitle,
    meta_description: currentMeta,
    h1: currentH1,
    content: currentContent.substring(0, 50000),
  });

  return changes;
}

async function saveChange(
  projectId: string,
  competitor: { id: string; name: string; domain: string },
  changeType: CompetitorChange['change_type'],
  oldValue: string | null,
  newValue: string | null,
  url: string,
  severity: 'major' | 'minor' | 'info' = 'info',
): Promise<CompetitorChange> {
  const id = uuidv4();
  const [change] = await db('competitor_changes')
    .insert({
      id,
      project_id: projectId,
      competitor_id: competitor.id,
      competitor_name: competitor.name,
      competitor_domain: competitor.domain,
      change_type: changeType,
      old_value: oldValue,
      new_value: newValue,
      url,
      severity,
    })
    .returning('*');

  return formatChange(change);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));

  const intersection = new Set([...wordsA].filter((x) => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);

  return intersection.size / union.size;
}

function formatChange(raw: Record<string, unknown>): CompetitorChange {
  return {
    id: raw['id'] as string,
    project_id: raw['project_id'] as string,
    competitor_id: raw['competitor_id'] as string,
    competitor_name: raw['competitor_name'] as string,
    competitor_domain: raw['competitor_domain'] as string,
    change_type: raw['change_type'] as CompetitorChange['change_type'],
    old_value: (raw['old_value'] as string) ?? null,
    new_value: (raw['new_value'] as string) ?? null,
    url: raw['url'] as string,
    severity: raw['severity'] as CompetitorChange['severity'],
    detected_at: raw['detected_at'] as string,
  };
}

export default {
  getChanges,
  checkNow,
};