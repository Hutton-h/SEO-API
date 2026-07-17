import type { Job } from 'bullmq';
import { db } from '../../shared/database.js';
import { dataforseo } from '../../services/dataforseo.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SEMFetchJobData {
  taskId: string;
  projectId: string;
}

// ---------------------------------------------------------------------------
// Processor
// ---------------------------------------------------------------------------

export default async function semFetchProcessor(job: Job<SEMFetchJobData>): Promise<void> {
  const { taskId, projectId } = job.data;

  console.log(`[SEMFetchProcessor] Starting SEM data fetch for project ${projectId}, task ${taskId}`);

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

    // Get keywords for the project
    const keywords = await db('keywords')
      .where('project_id', projectId)
      .select('keyword')
      .limit(30);

    const keywordList = keywords.map((k) => (k as { keyword: string }).keyword);

    // Fetch keyword metrics
    if (keywordList.length > 0) {
      try {
        const metricsResult = await dataforseo.getKeywordMetrics(keywordList, 2840, 'en');
        if (metricsResult.success && Array.isArray(metricsResult.data)) {
          const metrics = metricsResult.data as Array<{
            keyword: string;
            search_volume: number;
            cpc: number;
            competition: number;
            competition_index: number;
          }>;

          for (const m of metrics) {
            await db('sem_keyword_metrics')
              .insert({
                project_id: projectId,
                keyword: m.keyword,
                search_volume: m.search_volume ?? 0,
                cpc: m.cpc ?? 0,
                competition: m.competition ?? 0,
                competition_index: m.competition_index ?? 0,
                monthly_searches: JSON.stringify([]),
              })
              .onConflict(['project_id', 'keyword'])
              .merge({
                search_volume: m.search_volume ?? 0,
                cpc: m.cpc ?? 0,
                competition: m.competition ?? 0,
                competition_index: m.competition_index ?? 0,
              });
          }

          console.log(`[SEMFetchProcessor] Fetched ${metrics.length} keyword metrics`);
        }
      } catch (err) {
        console.warn(`[SEMFetchProcessor] Keyword metrics fetch failed:`, err);
      }
    }

    await db('tasks').where('id', taskId).update({ progress: 40 });
    await job.updateProgress(40);

    // Fetch competitor ads
    const competitors = await db('competitor_domains')
      .where('project_id', projectId)
      .select('domain');

    for (const comp of competitors) {
      const compDomain = (comp as { domain: string }).domain;

      try {
        const adsResult = await dataforseo.getCompetitorAds(compDomain, 2840);
        if (adsResult.success && Array.isArray(adsResult.data)) {
          const ads = adsResult.data as Array<{
            domain: string;
            title: string;
            description: string;
            url: string;
            rank_absolute: number;
          }>;

          for (const ad of ads) {
            if (!ad.domain || !ad.title) continue;

            await db('sem_ads').insert({
              project_id: projectId,
              competitor_domain: ad.domain,
              ad_title: ad.title,
              ad_description: ad.description ?? '',
              ad_url: ad.url ?? '',
              position: ad.rank_absolute ?? null,
              last_seen: new Date().toISOString().split('T')[0],
            });
          }
        }
      } catch (err) {
        console.warn(`[SEMFetchProcessor] Competitor ads fetch failed for ${compDomain}:`, err);
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    await db('tasks').where('id', taskId).update({ progress: 80 });
    await job.updateProgress(80);

    await db('tasks').where('id', taskId).update({
      status: 'completed',
      progress: 100,
      completed_at: db.fn.now(),
      result: JSON.stringify({
        keywordsProcessed: keywordList.length,
        competitorsProcessed: competitors.length,
        domain,
      }),
    });

    console.log(`[SEMFetchProcessor] SEM data fetch completed for project ${projectId}`);
  } catch (err) {
    console.error(`[SEMFetchProcessor] SEM data fetch failed for project ${projectId}:`, err);

    await db('tasks').where('id', taskId).update({
      status: 'failed',
      error: (err as Error).message,
      completed_at: db.fn.now(),
    });

    throw err;
  }
}