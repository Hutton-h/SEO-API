import type { Job } from 'bullmq';
import { db } from '../../shared/database.js';
import dataforseo from '../../services/dataforseo.js';
import majestic from '../../services/majestic.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BacklinkRefreshJobData {
  taskId: string;
  projectId: string;
}

// ---------------------------------------------------------------------------
// Processor
// ---------------------------------------------------------------------------

export default async function backlinkRefreshProcessor(job: Job<BacklinkRefreshJobData>): Promise<void> {
  const { taskId, projectId } = job.data;

  console.log(`[BacklinkRefreshProcessor] Starting backlink refresh for project ${projectId}, task ${taskId}`);

  await db('tasks').where('id', taskId).update({
    status: 'running',
    progress: 0,
    started_at: db.fn.now(),
  });

  try {
    const project = await db('projects').where('id', projectId).first();
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const domain = (project as { domain: string }).domain;

    let backlinksFetched = 0;
    let domainAuthorityAvg = 0;

    // Fetch backlink data from DataForSEO
    try {
      const backlinkResult = await dataforseo.getBacklinks(domain);
      if (backlinkResult.success && backlinkResult.data) {
        const data = backlinkResult.data as {
          backlinks?: number;
          referring_domains?: number;
        };
        console.log(`[BacklinkRefreshProcessor] Backlink summary for ${domain}:`, data);
      }
    } catch (err) {
      console.warn(`[BacklinkRefreshProcessor] DataForSEO backlink fetch failed:`, err);
    }

    // Fetch backlink list from DataForSEO
    try {
      const backlinkListResult = await dataforseo.getBacklinksList(domain, 50);
      if (backlinkListResult.success && Array.isArray(backlinkListResult.data)) {
        const backlinks = backlinkListResult.data as Array<{
          domain_from: string;
          url_from: string;
          url_to: string;
          page_from_rank?: number;
          dofollow?: boolean;
          first_seen?: string;
          backlink_spam_score?: number;
        }>;

        for (const bl of backlinks) {
          if (!bl.domain_from || !bl.url_from) continue;

          await db('backlinks')
            .insert({
              project_id: projectId,
              source_url: bl.url_from,
              target_url: bl.url_to || `https://${domain}`,
              anchor_text: bl.domain_from,
              domain_authority: bl.page_from_rank ?? null,
              page_authority: bl.page_from_rank ?? null,
              link_type: 'external',
              is_dofollow: bl.dofollow ?? true,
              first_seen: bl.first_seen ?? new Date().toISOString().split('T')[0],
              last_seen: new Date().toISOString().split('T')[0],
            })
            .onConflict(['project_id', 'source_url', 'target_url'])
            .ignore();
        }

        backlinksFetched = backlinks.length;

        const totalDA = backlinks.reduce((sum, bl) => sum + (bl.page_from_rank ?? 0), 0);
        domainAuthorityAvg = backlinks.length > 0 ? Math.round(totalDA / backlinks.length) : 0;

        await db('tasks').where('id', taskId).update({ progress: 50 });
        await job.updateProgress(50);
      }
    } catch (err) {
      console.warn(`[BacklinkRefreshProcessor] DataForSEO backlink list fetch failed:`, err);
    }

    // Fetch trust flow data from Majestic
    try {
      const majesticResult = await majestic.getBacklinkData(domain);
      if (majesticResult.success && majesticResult.data) {
        const data = majesticResult.data as {
          trustFlow: number;
          citationFlow: number;
          backlinks: number;
        };
        console.log(`[BacklinkRefreshProcessor] Majestic data for ${domain}:`, data);
      }
    } catch (err) {
      console.warn(`[BacklinkRefreshProcessor] Majestic fetch failed:`, err);
    }

    await db('tasks').where('id', taskId).update({ progress: 80 });
    await job.updateProgress(80);

    await new Promise((resolve) => setTimeout(resolve, 200));

    await db('tasks').where('id', taskId).update({
      status: 'completed',
      progress: 100,
      completed_at: db.fn.now(),
      result: JSON.stringify({
        backlinksFetched,
        averageDomainAuthority: domainAuthorityAvg,
        domain,
      }),
    });

    console.log(`[BacklinkRefreshProcessor] Backlink refresh completed for project ${projectId}`);
  } catch (err) {
    console.error(`[BacklinkRefreshProcessor] Backlink refresh failed for project ${projectId}:`, err);

    await db('tasks').where('id', taskId).update({
      status: 'failed',
      error: (err as Error).message,
      completed_at: db.fn.now(),
    });

    throw err;
  }
}