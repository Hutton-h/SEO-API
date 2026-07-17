import type { Job } from 'bullmq';
import { db } from '../../shared/database.js';
import { dataforseo } from '../../services/dataforseo.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RankingFetchJobData {
  taskId: string;
  projectId: string;
  keywords: string[];
  locationCode: number;
}

// ---------------------------------------------------------------------------
// Processor
// ---------------------------------------------------------------------------

export default async function rankingFetchProcessor(job: Job<RankingFetchJobData>): Promise<void> {
  const { taskId, projectId, keywords: requestedKeywords, locationCode } = job.data;

  console.log(`[RankingFetchProcessor] Starting ranking fetch for project ${projectId}, task ${taskId}`);

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
    let keywords: Array<{ id: string; keyword: string }>;
    if (requestedKeywords.length > 0) {
      keywords = requestedKeywords.map((kw) => ({ id: '', keyword: kw }));
    } else {
      keywords = await db('keywords')
        .where('project_id', projectId)
        .select('id', 'keyword')
        .limit(50);
    }

    if (keywords.length === 0) {
      console.log(`[RankingFetchProcessor] No keywords found for project ${projectId}`);
      await db('tasks').where('id', taskId).update({
        status: 'completed',
        progress: 100,
        completed_at: db.fn.now(),
        result: JSON.stringify({ keywordsChecked: 0 }),
      });
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    for (let i = 0; i < keywords.length; i++) {
      const kw = keywords[i];

      try {
        // Fetch SERP data from DataForSEO
        const serpResult = await dataforseo.getSERP(kw.keyword, locationCode || 2840, 'en', 20);

        let position: number | null = null;
        let url: string | null = null;

        if (serpResult.success && serpResult.data) {
          const serpData = serpResult.data as {
            items?: Array<{ domain: string; url: string; rank_absolute: number }>;
          };
          if (serpData.items) {
            const foundItem = serpData.items.find(
              (item) => item.domain === domain || item.url.includes(domain),
            );
            if (foundItem) {
              position = foundItem.rank_absolute;
              url = foundItem.url;
            }
          }
        }

        // Get previous position
        const previousRanking = await db('rankings')
          .where('keyword_id', kw.id || null)
          .where('project_id', projectId)
          .orderBy('check_date', 'desc')
          .first();

        const previousPosition = previousRanking
          ? (previousRanking as { position: number | null }).position
          : null;

        // Insert new ranking
        await db('rankings').insert({
          project_id: projectId,
          keyword_id: kw.id || null,
          position,
          previous_position: previousPosition,
          url,
          search_engine: 'google',
          location_code: locationCode || 2840,
          language: 'en',
          check_date: today,
        });
      } catch (err) {
        console.warn(`[RankingFetchProcessor] Failed to fetch ranking for "${kw.keyword}":`, err);
      }

      // Update progress
      const progress = Math.floor(((i + 1) / keywords.length) * 100);
      await db('tasks').where('id', taskId).update({ progress });
      await job.updateProgress(progress);

      // Rate limiting delay
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    await db('tasks').where('id', taskId).update({
      status: 'completed',
      progress: 100,
      completed_at: db.fn.now(),
      result: JSON.stringify({
        keywordsChecked: keywords.length,
        domain,
        checkDate: today,
      }),
    });

    console.log(`[RankingFetchProcessor] Ranking fetch completed for project ${projectId}`);
  } catch (err) {
    console.error(`[RankingFetchProcessor] Ranking fetch failed for project ${projectId}:`, err);

    await db('tasks').where('id', taskId).update({
      status: 'failed',
      error: (err as Error).message,
      completed_at: db.fn.now(),
    });

    throw err;
  }
}