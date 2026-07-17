import { db } from '../../shared/database.js';
import { reportQueue } from '../../shared/queue.js';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ComprehensiveReport {
  projectId: string;
  projectName: string;
  domain: string;
  generatedAt: string;
  summary: {
    totalPages: number;
    totalIssues: number;
    criticalIssues: number;
    totalKeywords: number;
    avgRankingPosition: number | null;
    totalBacklinks: number;
    totalCompetitors: number;
  };
  crawl: {
    pages: number;
    issues: number;
    criticalIssues: number;
    errorIssues: number;
    warningIssues: number;
    infoIssues: number;
  };
  keywords: {
    total: number;
    topKeywords: Array<{ keyword: string; searchVolume: number }>;
  };
  rankings: {
    averagePosition: number | null;
    top10Count: number;
    top3Count: number;
    recentRankings: Array<{
      keyword: string;
      position: number | null;
      previousPosition: number | null;
      checkDate: string;
    }>;
  };
  backlinks: {
    total: number;
    dofollowCount: number;
    averageDomainAuthority: number | null;
  };
  competitors: {
    count: number;
    list: Array<{ name: string; domain: string }>;
  };
  seoHealth: {
    score: number;
    issues: Array<{
      category: string;
      severity: string;
      count: number;
    }>;
  };
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

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function generateReport(
  projectId: string,
): Promise<ComprehensiveReport> {
  const project = await db('projects').where('id', projectId).first();
  if (!project) {
    throw new Error('Project not found');
  }

  const projectName = (project as { name: string }).name;
  const domain = (project as { domain: string }).domain;

  // Crawl data
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

  const [{ count: errorIssues }] = await db('crawl_issues')
    .where('project_id', projectId)
    .where('severity', 'error')
    .count<{ count: string }[]>();

  const [{ count: warningIssues }] = await db('crawl_issues')
    .where('project_id', projectId)
    .where('severity', 'warning')
    .count<{ count: string }[]>();

  const [{ count: infoIssues }] = await db('crawl_issues')
    .where('project_id', projectId)
    .where('severity', 'info')
    .count<{ count: string }[]>();

  // Keywords
  const [{ count: totalKeywords }] = await db('keywords')
    .where('project_id', projectId)
    .count<{ count: string }[]>();

  const topKeywords = await db('keywords')
    .where('project_id', projectId)
    .orderBy('search_volume', 'desc')
    .limit(5)
    .select('keyword', 'search_volume');

  // Rankings
  const avgRankingResult = await db('rankings')
    .where('project_id', projectId)
    .whereNotNull('position')
    .avg('position as avg_position')
    .first();

  const avgPosition = avgRankingResult
    ? Math.round((avgRankingResult as unknown as { avg_position: string }).avg_position as unknown as number)
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

  const recentRankings = await db('rankings')
    .where('project_id', projectId)
    .leftJoin('keywords', 'rankings.keyword_id', 'keywords.id')
    .select(
      'keywords.keyword',
      'rankings.position',
      'rankings.previous_position',
      'rankings.check_date',
    )
    .orderBy('rankings.check_date', 'desc')
    .limit(10);

  // Backlinks
  const [{ count: totalBacklinks }] = await db('backlinks')
    .where('project_id', projectId)
    .count<{ count: string }[]>();

  const [{ count: dofollowCount }] = await db('backlinks')
    .where('project_id', projectId)
    .where('is_dofollow', true)
    .count<{ count: string }[]>();

  const avgDA = await db('backlinks')
    .where('project_id', projectId)
    .whereNotNull('domain_authority')
    .avg('domain_authority as avg_da')
    .first();

  const avgDomainAuthority = avgDA
    ? Math.round((avgDA as unknown as { avg_da: string }).avg_da as unknown as number)
    : null;

  // Competitors
  const competitors = await db('competitor_domains')
    .where('project_id', projectId)
    .select('name', 'domain');

  // Issue categories
  const issueCategories = await db('crawl_issues')
    .where('project_id', projectId)
    .select('category', 'severity')
    .count('* as count')
    .groupBy('category', 'severity')
    .orderBy('count', 'desc')
    .limit(10);

  // SEO Health Score
  const totalIssueCount = parseInt(totalIssues, 10);
  const criticalCount = parseInt(criticalIssues, 10);
  const errorCount = parseInt(errorIssues, 10);

  let healthScore = 100;
  healthScore -= criticalCount * 5;
  healthScore -= errorCount * 2;
  healthScore = Math.max(0, Math.min(100, healthScore));

  const report: ComprehensiveReport = {
    projectId,
    projectName,
    domain,
    generatedAt: new Date().toISOString(),
    summary: {
      totalPages: parseInt(totalPages, 10),
      totalIssues: totalIssueCount,
      criticalIssues: criticalCount,
      totalKeywords: parseInt(totalKeywords, 10),
      avgRankingPosition: avgPosition,
      totalBacklinks: parseInt(totalBacklinks, 10),
      totalCompetitors: competitors.length,
    },
    crawl: {
      pages: parseInt(totalPages, 10),
      issues: totalIssueCount,
      criticalIssues: criticalCount,
      errorIssues: parseInt(errorIssues, 10),
      warningIssues: parseInt(warningIssues, 10),
      infoIssues: parseInt(infoIssues, 10),
    },
    keywords: {
      total: parseInt(totalKeywords, 10),
      topKeywords: topKeywords as Array<{ keyword: string; searchVolume: number }>,
    },
    rankings: {
      averagePosition: avgPosition,
      top10Count: parseInt(top10Count, 10),
      top3Count: parseInt(top3Count, 10),
      recentRankings: recentRankings as Array<{
        keyword: string;
        position: number | null;
        previousPosition: number | null;
        checkDate: string;
      }>,
    },
    backlinks: {
      total: parseInt(totalBacklinks, 10),
      dofollowCount: parseInt(dofollowCount, 10),
      averageDomainAuthority: avgDomainAuthority,
    },
    competitors: {
      count: competitors.length,
      list: competitors as Array<{ name: string; domain: string }>,
    },
    seoHealth: {
      score: healthScore,
      issues: (issueCategories as Array<{
        category: string;
        severity: string;
        count: string;
      }>).map((i) => ({
        category: i.category,
        severity: i.severity,
        count: parseInt(i.count, 10),
      })),
    },
  };

  return report;
}

export async function queueReportGeneration(
  projectId: string,
): Promise<TaskRecord> {
  const taskId = uuidv4();

  const [taskRecord] = await db('tasks')
    .insert({
      id: taskId,
      project_id: projectId,
      type: 'report',
      status: 'pending',
      progress: 0,
      result: '{}',
    })
    .returning('*');

  await reportQueue.add(
    'generate-report',
    {
      taskId,
      projectId,
    },
    {
      jobId: taskId,
    },
  );

  return taskRecord as TaskRecord;
}

export default {
  generateReport,
  queueReportGeneration,
};