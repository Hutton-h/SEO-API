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
    gscData?: {
      totalClicks: number;
      totalImpressions: number;
      avgCTR: number;
      avgPosition: number;
    };
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
  // New module data
  performance?: {
    score: number;
    lcp: number;
    fcp: number;
    tbt: number;
    cls: number;
    psiScore: number;
  };
  alerts?: {
    activeAlerts: number;
    recentAlerts: Array<{
      type: string;
      severity: string;
      message: string;
      createdAt: string;
    }>;
  };
  roi?: {
    latestRoiPercent: number;
    monthlyTrend: Array<{
      period: string;
      roiPercent: number;
      investment: number;
      revenue: number;
    }>;
  };
  contentQuality?: {
    averageScore: number;
    pagesAnalyzed: number;
    topIssues: Array<{
      issue: string;
      affectedPages: number;
    }>;
  };
  uptime?: {
    isUp: boolean;
    uptimePercent: number;
    averageResponseTime: number;
  };
  competitorChanges?: {
    totalChanges: number;
    recentChanges: Array<{
      competitorName: string;
      changeType: string;
      severity: string;
      detectedAt: string;
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
  let totalPages = '0';
  let totalIssues = '0';
  let criticalIssues = '0';
  let errorIssues = '0';
  let warningIssues = '0';
  let infoIssues = '0';
  try {
    const [pagesResult] = await db('crawl_pages')
      .where('project_id', projectId)
      .count<{ count: string }[]>();
    totalPages = pagesResult?.count ?? '0';

    const [issuesResult] = await db('crawl_issues')
      .where('project_id', projectId)
      .count<{ count: string }[]>();
    totalIssues = issuesResult?.count ?? '0';

    const [criticalResult] = await db('crawl_issues')
      .where('project_id', projectId)
      .where('severity', 'critical')
      .count<{ count: string }[]>();
    criticalIssues = criticalResult?.count ?? '0';

    const [errorResult] = await db('crawl_issues')
      .where('project_id', projectId)
      .where('severity', 'error')
      .count<{ count: string }[]>();
    errorIssues = errorResult?.count ?? '0';

    const [warningResult] = await db('crawl_issues')
      .where('project_id', projectId)
      .where('severity', 'warning')
      .count<{ count: string }[]>();
    warningIssues = warningResult?.count ?? '0';

    const [infoResult] = await db('crawl_issues')
      .where('project_id', projectId)
      .where('severity', 'info')
      .count<{ count: string }[]>();
    infoIssues = infoResult?.count ?? '0';
  } catch {
    // Crawl tables may not exist - use defaults
  }

  // Keywords
  let totalKeywords = '0';
  let topKeywords: Array<{ keyword: string; search_volume: number }> = [];
  try {
    const [kwResult] = await db('keywords')
      .where('project_id', projectId)
      .count<{ count: string }[]>();
    totalKeywords = kwResult?.count ?? '0';

    topKeywords = await db('keywords')
      .where('project_id', projectId)
      .orderBy('search_volume', 'desc')
      .limit(5)
      .select('keyword', 'search_volume');
  } catch {
    // Keywords table may not exist - use defaults
  }

  // Rankings
  let avgPosition: number | null = null;
  let top10Count = '0';
  let top3Count = '0';
  let recentRankings: Array<{
    keyword: string;
    position: number | null;
    previous_position: number | null;
    check_date: string;
  }> = [];
  try {
    const avgRankingResult = await db('rankings')
      .where('project_id', projectId)
      .whereNotNull('position')
      .avg('position as avg_position')
      .first();

    avgPosition = avgRankingResult
      ? Math.round((avgRankingResult as unknown as { avg_position: string }).avg_position as unknown as number)
      : null;

    const [t10Result] = await db('rankings')
      .where('project_id', projectId)
      .where('position', '<=', 10)
      .whereNotNull('position')
      .count<{ count: string }[]>();
    top10Count = t10Result?.count ?? '0';

    const [t3Result] = await db('rankings')
      .where('project_id', projectId)
      .where('position', '<=', 3)
      .whereNotNull('position')
      .count<{ count: string }[]>();
    top3Count = t3Result?.count ?? '0';

    recentRankings = await db('rankings')
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
  } catch {
    // Rankings table may not exist - use defaults
  }

  // Backlinks
  let totalBacklinks = '0';
  let dofollowCount = '0';
  let avgDomainAuthority: number | null = null;
  try {
    const [blResult] = await db('backlinks')
      .where('project_id', projectId)
      .count<{ count: string }[]>();
    totalBacklinks = blResult?.count ?? '0';

    const [dfResult] = await db('backlinks')
      .where('project_id', projectId)
      .where('is_dofollow', true)
      .count<{ count: string }[]>();
    dofollowCount = dfResult?.count ?? '0';

    const avgDA = await db('backlinks')
      .where('project_id', projectId)
      .whereNotNull('domain_authority')
      .avg('domain_authority as avg_da')
      .first();

    avgDomainAuthority = avgDA
      ? Math.round((avgDA as unknown as { avg_da: string }).avg_da as unknown as number)
      : null;
  } catch {
    // Backlinks table may not exist - use defaults
  }

  // Competitors
  let competitors: Array<{ name: string; domain: string }> = [];
  try {
    competitors = await db('competitor_domains')
      .where('project_id', projectId)
      .select('name', 'domain');
  } catch {
    // Competitor domains table may not exist - use defaults
  }

  // Issue categories
  let issueCategories: Array<{ category: string; severity: string; count: string }> = [];
  try {
    issueCategories = await db('crawl_issues')
      .where('project_id', projectId)
      .select('category', 'severity')
      .count('* as count')
      .groupBy('category', 'severity')
      .orderBy('count', 'desc')
      .limit(10);
  } catch {
    // Crawl issues categories may not be available - use defaults
  }

  // SEO Health Score
  const totalIssueCount = parseInt(totalIssues, 10);
  const criticalCount = parseInt(criticalIssues, 10);
  const errorCount = parseInt(errorIssues, 10);

  let healthScore = 100;
  healthScore -= criticalCount * 5;
  healthScore -= errorCount * 2;
  healthScore = Math.max(0, Math.min(100, healthScore));

  // --- NEW: GSC Rankings Data ---
  let gscData: ComprehensiveReport['rankings']['gscData'] = undefined;
  try {
    const siteUrl = `sc-domain:${domain}`;
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const gscResult = await db('gsc_analytics')
      .where('project_id', projectId)
      .orderBy('date', 'desc')
      .limit(30);

    if (gscResult.length > 0) {
      const gscRows = gscResult as Array<{
        clicks: number;
        impressions: number;
        ctr: number;
        position: number;
      }>;
      const totalClicks = gscRows.reduce((sum, r) => sum + (r.clicks ?? 0), 0);
      const totalImpressions = gscRows.reduce((sum, r) => sum + (r.impressions ?? 0), 0);
      const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const avgPosition = gscRows.length > 0
        ? gscRows.reduce((sum, r) => sum + (r.position ?? 0), 0) / gscRows.length
        : 0;

      gscData = {
        totalClicks,
        totalImpressions,
        avgCTR: Math.round(avgCTR * 100) / 100,
        avgPosition: Math.round(avgPosition * 10) / 10,
      };
    }
  } catch {
    // GSC data not available
  }

  // --- NEW: Performance (PSI) ---
  let performanceData: ComprehensiveReport['performance'] = undefined;
  try {
    const psiScore = await db('psi_issues')
      .where('project_id', projectId)
      .avg('score as avg_score')
      .first();

    performanceData = {
      score: psiScore ? Math.round((psiScore as unknown as { avg_score: string }).avg_score as unknown as number) : 0,
      lcp: 0,
      fcp: 0,
      tbt: 0,
      cls: 0,
      psiScore: psiScore ? Math.round((psiScore as unknown as { avg_score: string }).avg_score as unknown as number) : 0,
    };
  } catch {
    // Performance data not available
  }

  // --- NEW: Alerts ---
  let alertsData: ComprehensiveReport['alerts'] = undefined;
  try {
    const activeAlerts = await db('alert_history')
      .where('project_id', projectId)
      .where('acknowledged', false)
      .count<{ count: string }[]>('* as count');

    const recentAlerts = await db('alert_history')
      .where('project_id', projectId)
      .orderBy('created_at', 'desc')
      .limit(5)
      .select('type', 'severity', 'message', 'created_at');

    alertsData = {
      activeAlerts: parseInt(activeAlerts[0]?.count ?? '0', 10),
      recentAlerts: (recentAlerts as Array<{
        type: string;
        severity: string;
        message: string;
        created_at: string;
      }>).map((a) => ({
        type: a.type,
        severity: a.severity,
        message: a.message,
        createdAt: a.created_at,
      })),
    };
  } catch {
    // Alerts data not available
  }

  // --- NEW: ROI ---
  let roiData: ComprehensiveReport['roi'] = undefined;
  try {
    const latestRoi = await db('roi_metrics')
      .where('project_id', projectId)
      .orderBy('start_date', 'desc')
      .first();

    const monthlyTrend = await db('roi_metrics')
      .where('project_id', projectId)
      .orderBy('start_date', 'asc')
      .limit(12)
      .select('period', 'roi_percent', 'seo_investment', 'total_revenue');

    roiData = {
      latestRoiPercent: latestRoi ? (latestRoi as { roi_percent: number }).roi_percent : 0,
      monthlyTrend: (monthlyTrend as Array<{
        period: string;
        roi_percent: number;
        seo_investment: number;
        total_revenue: number;
      }>).map((r) => ({
        period: r.period,
        roiPercent: r.roi_percent,
        investment: r.seo_investment,
        revenue: r.total_revenue,
      })),
    };
  } catch {
    // ROI data not available
  }

  // --- NEW: Content Quality ---
  let contentQualityData: ComprehensiveReport['contentQuality'] = undefined;
  try {
    const avgScore = await db('content_quality_scores')
      .where('project_id', projectId)
      .avg('score as avg_score')
      .first();

    const pagesAnalyzed = await db('content_quality_scores')
      .where('project_id', projectId)
      .count<{ count: string }[]>('* as count');

    contentQualityData = {
      averageScore: avgScore ? Math.round((avgScore as unknown as { avg_score: string }).avg_score as unknown as number) : 0,
      pagesAnalyzed: parseInt(pagesAnalyzed[0]?.count ?? '0', 10),
      topIssues: [],
    };
  } catch {
    // Content quality data not available
  }

  // --- NEW: Uptime ---
  let uptimeData: ComprehensiveReport['uptime'] = undefined;
  try {
    const lastCheck = await db('uptime_logs')
      .where('project_id', projectId)
      .orderBy('checked_at', 'desc')
      .first();

    const upChecks = await db('uptime_logs')
      .where('project_id', projectId)
      .where('checked_at', '>=', db.raw("NOW() - INTERVAL '30 days'"))
      .where('is_up', true)
      .count<{ count: string }[]>('* as count');

    const totalChecks = await db('uptime_logs')
      .where('project_id', projectId)
      .where('checked_at', '>=', db.raw("NOW() - INTERVAL '30 days'"))
      .count<{ count: string }[]>('* as count');

    const totalUp = parseInt(upChecks[0]?.count ?? '0', 10);
    const totalAll = parseInt(totalChecks[0]?.count ?? '0', 10);

    const avgResponseTime = await db('uptime_logs')
      .where('project_id', projectId)
      .where('checked_at', '>=', db.raw("NOW() - INTERVAL '30 days'"))
      .avg('response_time_ms as avg_rt')
      .first();

    uptimeData = {
      isUp: lastCheck ? (lastCheck as { is_up: boolean }).is_up : true,
      uptimePercent: totalAll > 0 ? Math.round((totalUp / totalAll) * 10000) / 100 : 100,
      averageResponseTime: avgResponseTime
        ? Math.round((avgResponseTime as unknown as { avg_rt: string }).avg_rt as unknown as number)
        : 0,
    };
  } catch {
    // Uptime data not available
  }

  // --- NEW: Competitor Changes ---
  let competitorChangesData: ComprehensiveReport['competitorChanges'] = undefined;
  try {
    const totalChanges = await db('competitor_changes')
      .where('project_id', projectId)
      .where('detected_at', '>=', db.raw("NOW() - INTERVAL '7 days'"))
      .count<{ count: string }[]>('* as count');

    const recentChanges = await db('competitor_changes')
      .where('project_id', projectId)
      .orderBy('detected_at', 'desc')
      .limit(5)
      .select('competitor_name', 'change_type', 'severity', 'detected_at');

    competitorChangesData = {
      totalChanges: parseInt(totalChanges[0]?.count ?? '0', 10),
      recentChanges: (recentChanges as Array<{
        competitor_name: string;
        change_type: string;
        severity: string;
        detected_at: string;
      }>).map((c) => ({
        competitorName: c.competitor_name,
        changeType: c.change_type,
        severity: c.severity,
        detectedAt: c.detected_at,
      })),
    };
  } catch {
    // Competitor changes data not available
  }

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
      topKeywords: topKeywords.map((k) => ({ keyword: k.keyword, searchVolume: k.search_volume })),
    },
    rankings: {
      averagePosition: avgPosition,
      top10Count: parseInt(top10Count, 10),
      top3Count: parseInt(top3Count, 10),
      recentRankings: recentRankings.map((r) => ({
        keyword: r.keyword as string,
        position: r.position as number | null,
        previousPosition: r.previous_position as number | null,
        checkDate: r.check_date as string,
      })),
      gscData,
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
    performance: performanceData,
    alerts: alertsData,
    roi: roiData,
    contentQuality: contentQualityData,
    uptime: uptimeData,
    competitorChanges: competitorChangesData,
  };

  return report;
}

export async function queueReportGeneration(
  projectId: string,
): Promise<TaskRecord> {
  const taskId = uuidv4();

  try {
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

    try {
      await reportQueue.add(
        'generate-report',
        { taskId, projectId },
        { jobId: taskId },
      );
    } catch {
      // Queue may not be available
      console.warn(`[Report] Failed to queue report generation for project ${projectId}`);
    }

    return taskRecord as TaskRecord;
  } catch {
    // Table doesn't exist - return a virtual task
    return {
      id: taskId,
      project_id: projectId,
      type: 'report',
      status: 'pending' as const,
      progress: 0,
      result: {},
      error: null,
      started_at: null,
      completed_at: null,
      created_at: new Date().toISOString(),
    };
  }
}

export default {
  generateReport,
  queueReportGeneration,
};