import type { Job } from 'bullmq';
import { db } from '../../shared/database.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReportJobData {
  taskId: string;
  projectId: string;
}

// ---------------------------------------------------------------------------
// Processor
// ---------------------------------------------------------------------------

export default async function reportProcessor(job: Job<ReportJobData>): Promise<void> {
  const { taskId, projectId } = job.data;

  console.log(`[ReportProcessor] Starting report generation for project ${projectId}, task ${taskId}`);

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

    // Gather all data for the comprehensive report
    await db('tasks').where('id', taskId).update({ progress: 10 });
    await job.updateProgress(10);

    // Crawl stats
    const [{ count: totalPages }] = await db('crawl_pages')
      .where('project_id', projectId)
      .count<{ count: string }[]>();

    const [{ count: totalIssues }] = await db('crawl_issues')
      .where('project_id', projectId)
      .count<{ count: string }[]>();

    const [{ count: criticalIssues }] = await db('crawl_issues')
      .where('project_id', projectId)
      .where('severity', 'critical')
      .count<{ count: string }[]>();

    await db('tasks').where('id', taskId).update({ progress: 30 });
    await job.updateProgress(30);

    // Keyword stats
    const [{ count: totalKeywords }] = await db('keywords')
      .where('project_id', projectId)
      .count<{ count: string }[]>();

    const topKeywords = await db('keywords')
      .where('project_id', projectId)
      .orderBy('search_volume', 'desc')
      .limit(10)
      .select('keyword', 'search_volume');

    await db('tasks').where('id', taskId).update({ progress: 50 });
    await job.updateProgress(50);

    // Ranking stats
    const avgRankResult = await db('rankings')
      .where('project_id', projectId)
      .whereNotNull('position')
      .avg('position as avg_position')
      .first();

    const avgPosition = avgRankResult
      ? Math.round((avgRankResult as unknown as { avg_position: string }).avg_position as unknown as number)
      : null;

    const [{ count: top10Count }] = await db('rankings')
      .where('project_id', projectId)
      .where('position', '<=', 10)
      .whereNotNull('position')
      .count<{ count: string }[]>();

    const [{ count: top3Count }] = await db('rankings')
      .where('project_id', projectId)
      .where('position', '<=', 3)
      .whereNotNull('position')
      .count<{ count: string }[]>();

    await db('tasks').where('id', taskId).update({ progress: 70 });
    await job.updateProgress(70);

    // Backlink stats
    const [{ count: totalBacklinks }] = await db('backlinks')
      .where('project_id', projectId)
      .count<{ count: string }[]>();

    const [{ count: dofollowCount }] = await db('backlinks')
      .where('project_id', projectId)
      .where('is_dofollow', true)
      .count<{ count: string }[]>();

    // Competitor stats
    const competitors = await db('competitor_domains')
      .where('project_id', projectId)
      .select('name', 'domain');

    await db('tasks').where('id', taskId).update({ progress: 85 });
    await job.updateProgress(85);

    // SEO health score
    const criticalCount = parseInt(criticalIssues, 10);
    const issueCount = parseInt(totalIssues, 10);
    let healthScore = 100;
    healthScore -= criticalCount * 5;
    healthScore -= Math.floor((issueCount - criticalCount) * 0.5);
    healthScore = Math.max(0, Math.min(100, healthScore));

    // Build the report
    const report = {
      projectId,
      projectName: (project as { name: string }).name,
      domain: (project as { domain: string }).domain,
      generatedAt: new Date().toISOString(),
      summary: {
        totalPages: parseInt(totalPages, 10),
        totalIssues: issueCount,
        criticalIssues: criticalCount,
        totalKeywords: parseInt(totalKeywords, 10),
        avgRankingPosition: avgPosition,
        totalBacklinks: parseInt(totalBacklinks, 10),
        top10Keywords: parseInt(top10Count, 10),
        top3Keywords: parseInt(top3Count, 10),
        dofollowBacklinks: parseInt(dofollowCount, 10),
        totalCompetitors: competitors.length,
        seoHealthScore: healthScore,
      },
      topKeywords: topKeywords as Array<{ keyword: string; searchVolume: number }>,
      competitors: competitors as Array<{ name: string; domain: string }>,
    };

    await db('tasks').where('id', taskId).update({
      status: 'completed',
      progress: 100,
      completed_at: db.fn.now(),
      result: JSON.stringify(report),
    });

    console.log(`[ReportProcessor] Report generation completed for project ${projectId}`);
  } catch (err) {
    console.error(`[ReportProcessor] Report generation failed for project ${projectId}:`, err);

    await db('tasks').where('id', taskId).update({
      status: 'failed',
      error: (err as Error).message,
      completed_at: db.fn.now(),
    });

    throw err;
  }
}