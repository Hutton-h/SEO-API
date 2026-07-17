import { db } from '../../shared/database.js';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

// ---------------------------------------------------------------------------
// Change Detection Processor
// Scheduled task: detect changes on competitor websites
// ---------------------------------------------------------------------------

export interface ChangeDetectionProcessorJob {
  taskId?: string;
  projectId?: string;
}

export async function processChangeDetection(job: ChangeDetectionProcessorJob): Promise<void> {
  console.log('[ChangeDetectionProcessor] Starting change detection...');

  try {
    // Get all active projects with competitors
    let projectQuery = db('projects')
      .distinct('projects.*')
      .join('competitor_domains', 'projects.id', 'competitor_domains.project_id');

    if (job.projectId) {
      projectQuery = projectQuery.where('projects.id', job.projectId);
    }

    const projects = await projectQuery;

    if (!projects.length) {
      console.log('[ChangeDetectionProcessor] No projects with competitors found');
      return;
    }

    let totalChanges = 0;
    let checkedCount = 0;
    let errorCount = 0;

    for (const project of projects as Array<{ id: string; domain: string }>) {
      try {
        const competitors = await db('competitor_domains')
          .where('project_id', project.id)
          .select('id', 'name', 'domain');

        for (const competitor of competitors as Array<{ id: string; name: string; domain: string }>) {
          try {
            const changes = await detectChangesForCompetitor(project.id, competitor);
            totalChanges += changes.length;
          } catch (err) {
            errorCount++;
            console.error(`[ChangeDetectionProcessor] Error checking competitor ${competitor.domain}:`, err);
          }

          // Rate limiting
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        checkedCount++;
      } catch (err) {
        errorCount++;
        console.error(`[ChangeDetectionProcessor] Error processing project ${project.id}:`, err);
      }
    }

    console.log(`[ChangeDetectionProcessor] Complete: ${checkedCount} projects checked, ${totalChanges} changes detected, ${errorCount} errors`);

    // Update task if provided
    if (job.taskId) {
      await db('tasks')
        .where('id', job.taskId)
        .update({
          status: 'completed',
          progress: 100,
          completed_at: db.fn.now(),
          result: JSON.stringify({ checkedCount, totalChanges, errorCount }),
        });
    }
  } catch (err) {
    console.error('[ChangeDetectionProcessor] Fatal error:', err);

    if (job.taskId) {
      await db('tasks')
        .where('id', job.taskId)
        .update({
          status: 'failed',
          error: err instanceof Error ? err.message : 'Unknown error',
          completed_at: db.fn.now(),
        });
    }

    throw err;
  }
}

async function detectChangesForCompetitor(
  projectId: string,
  competitor: { id: string; name: string; domain: string },
): Promise<Array<{ type: string; severity: string }>> {
  const changes: Array<{ type: string; severity: string }> = [];

  // Get previous content history entry
  const previousEntry = await db('content_history')
    .where('project_id', projectId)
    .where('competitor_id', competitor.id)
    .orderBy('checked_at', 'desc')
    .first();

  // Fetch current content
  let currentTitle = '';
  let currentMeta = '';
  let currentH1 = '';
  let currentContent = '';
  const url = `https://${competitor.domain}`;

  try {
    const response = await axios.get(url, {
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
    // If we can't fetch, skip
    return changes;
  }

  if (previousEntry) {
    const prev = previousEntry as Record<string, unknown>;
    const prevTitle = (prev['title'] as string) ?? '';
    const prevMeta = (prev['meta_description'] as string) ?? '';
    const prevH1 = (prev['h1'] as string) ?? '';
    const prevContent = (prev['content'] as string) ?? '';

    // Check title changes
    if (prevTitle && currentTitle && prevTitle !== currentTitle) {
      await saveChange(projectId, competitor, 'title', prevTitle, currentTitle, url, 'major');
      changes.push({ type: 'title', severity: 'major' });
    }

    // Check meta changes
    if (prevMeta && currentMeta && prevMeta !== currentMeta) {
      await saveChange(projectId, competitor, 'meta', prevMeta, currentMeta, url, 'major');
      changes.push({ type: 'meta', severity: 'major' });
    }

    // Check h1 changes
    if (prevH1 && currentH1 && prevH1 !== currentH1) {
      await saveChange(projectId, competitor, 'h1', prevH1, currentH1, url, 'major');
      changes.push({ type: 'h1', severity: 'major' });
    }

    // Check content structure changes
    if (prevContent && currentContent) {
      const similarity = calculateSimilarity(prevContent, currentContent);
      if (similarity < 0.7) {
        await saveChange(projectId, competitor, 'structure', null, null, url, similarity < 0.5 ? 'major' : 'minor');
        changes.push({ type: 'structure', severity: similarity < 0.5 ? 'major' : 'minor' });
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
  changeType: string,
  oldValue: string | null,
  newValue: string | null,
  url: string,
  severity: string,
): Promise<void> {
  await db('competitor_changes').insert({
    id: uuidv4(),
    project_id: projectId,
    competitor_id: competitor.id,
    competitor_name: competitor.name,
    competitor_domain: competitor.domain,
    change_type: changeType,
    old_value: oldValue,
    new_value: newValue,
    url,
    severity,
  });
}

function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));

  const intersection = new Set([...wordsA].filter((x) => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

export default {
  processChangeDetection,
};