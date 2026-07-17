import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import type { Flags, RunnerResult } from 'lighthouse';
import { saveIssues, type CrawlIssueData } from './db.js';
import config from './config.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LighthouseScores {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
}

export interface LighthouseMetrics {
  fcp: number | null;       // First Contentful Paint (ms)
  lcp: number | null;       // Largest Contentful Paint (ms)
  tbt: number | null;       // Total Blocking Time (ms)
  cls: number | null;       // Cumulative Layout Shift
  si: number | null;        // Speed Index (ms)
}

export interface LighthouseResult {
  url: string;
  scores: LighthouseScores;
  metrics: LighthouseMetrics;
  issues: CrawlIssueData[];
}

// ---------------------------------------------------------------------------
// Lighthouse Audit
// ---------------------------------------------------------------------------

/**
 * Run a Lighthouse audit for a single URL.
 */
export async function runLighthouseAudit(
  url: string,
  projectId: string,
  pageId?: string,
): Promise<LighthouseResult> {
  let chrome: chromeLauncher.LaunchedChrome | undefined;

  try {
    // Launch Chrome
    chrome = await chromeLauncher.launch({
      chromeFlags: [
        '--headless',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
      ],
    });

    const lighthouseFlags: Flags = {
      port: chrome.port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: config.lighthouse.categories,
      maxWaitForFcp: 30000,
      maxWaitForLoad: 60000,
      formFactor: config.lighthouse.mobileEmulation ? 'mobile' : 'desktop',
      screenEmulation: config.lighthouse.mobileEmulation
        ? {
            mobile: true,
            width: 375,
            height: 812,
            deviceScaleFactor: 2,
            disabled: false,
          }
        : {
            mobile: false,
            width: 1350,
            height: 940,
            deviceScaleFactor: 1,
            disabled: false,
          },
    };

    const runnerResult: RunnerResult | undefined = await lighthouse(url, lighthouseFlags);

    if (!runnerResult || !runnerResult.lhr) {
      throw new Error('Lighthouse did not return a valid result');
    }

    const lhr = runnerResult.lhr;

    // Extract scores
    const scores: LighthouseScores = {
      performance: Math.round((lhr.categories.performance?.score ?? 0) * 100),
      accessibility: Math.round((lhr.categories.accessibility?.score ?? 0) * 100),
      bestPractices: Math.round((lhr.categories['best-practices']?.score ?? 0) * 100),
      seo: Math.round((lhr.categories.seo?.score ?? 0) * 100),
    };

    // Extract specific metrics
    const metrics: LighthouseMetrics = {
      fcp: extractNumericAudit(lhr, 'first-contentful-paint'),
      lcp: extractNumericAudit(lhr, 'largest-contentful-paint'),
      tbt: extractNumericAudit(lhr, 'total-blocking-time'),
      cls: extractNumericAudit(lhr, 'cumulative-layout-shift'),
      si: extractNumericAudit(lhr, 'speed-index'),
    };

    // Generate issues from Lighthouse audit results
    const issues = generateLighthouseIssues(projectId, pageId, url, scores, metrics);

    // Save issues to database
    if (issues.length > 0) {
      await saveIssues(projectId, issues);
    }

    return {
      url,
      scores,
      metrics,
      issues,
    };
  } finally {
    if (chrome) {
      try {
        await chrome.kill();
      } catch {
        // Ignore kill errors
      }
    }
  }
}

/**
 * Run Lighthouse audits for multiple URLs.
 */
export async function runLighthouseBatch(
  urls: string[],
  projectId: string,
  pageIdMap: Map<string, string>,
): Promise<LighthouseResult[]> {
  const results: LighthouseResult[] = [];

  for (const url of urls) {
    const pageId = pageIdMap.get(url);

    const result = await runLighthouseAudit(url, projectId, pageId);
    results.push(result);

    console.log(
      `[Lighthouse] ${url}: Perf=${result.scores.performance}, A11y=${result.scores.accessibility}, BP=${result.scores.bestPractices}, SEO=${result.scores.seo}`,
    );
  }

  return results;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractNumericAudit(
  lhr: RunnerResult['lhr'],
  auditId: string,
): number | null {
  const audit = lhr.audits[auditId];
  if (!audit) return null;

  const value = audit.numericValue;
  return value !== undefined && value !== null ? Math.round(value * 100) / 100 : null;
}

function generateLighthouseIssues(
  projectId: string,
  pageId: string | undefined,
  url: string,
  scores: LighthouseScores,
  metrics: LighthouseMetrics,
): CrawlIssueData[] {
  const issues: CrawlIssueData[] = [];

  // Performance issues
  if (scores.performance < 50) {
    issues.push({
      project_id: projectId,
      page_id: pageId ?? null,
      rule_id: 'lighthouse-performance-critical',
      severity: 'critical',
      category: 'Performance',
      message: `Lighthouse 性能评分为 ${scores.performance}/100，需要立即优化`,
      element: null,
      url,
      status: 'open',
    });
  } else if (scores.performance < 90) {
    issues.push({
      project_id: projectId,
      page_id: pageId ?? null,
      rule_id: 'lighthouse-performance-warning',
      severity: 'medium',
      category: 'Performance',
      message: `Lighthouse 性能评分为 ${scores.performance}/100，建议优化以达到 90+ 分`,
      element: null,
      url,
      status: 'open',
    });
  }

  // Accessibility issues
  if (scores.accessibility < 50) {
    issues.push({
      project_id: projectId,
      page_id: pageId ?? null,
      rule_id: 'lighthouse-accessibility-critical',
      severity: 'critical',
      category: 'Accessibility',
      message: `Lighthouse 无障碍评分为 ${scores.accessibility}/100，存在严重无障碍问题`,
      element: null,
      url,
      status: 'open',
    });
  } else if (scores.accessibility < 90) {
    issues.push({
      project_id: projectId,
      page_id: pageId ?? null,
      rule_id: 'lighthouse-accessibility-warning',
      severity: 'medium',
      category: 'Accessibility',
      message: `Lighthouse 无障碍评分为 ${scores.accessibility}/100，建议修复以提高无障碍性`,
      element: null,
      url,
      status: 'open',
    });
  }

  // Best Practices issues
  if (scores.bestPractices < 50) {
    issues.push({
      project_id: projectId,
      page_id: pageId ?? null,
      rule_id: 'lighthouse-best-practices-critical',
      severity: 'critical',
      category: 'Best Practices',
      message: `Lighthouse 最佳实践评分为 ${scores.bestPractices}/100，存在严重问题`,
      element: null,
      url,
      status: 'open',
    });
  } else if (scores.bestPractices < 80) {
    issues.push({
      project_id: projectId,
      page_id: pageId ?? null,
      rule_id: 'lighthouse-best-practices-warning',
      severity: 'high',
      category: 'Best Practices',
      message: `Lighthouse 最佳实践评分为 ${scores.bestPractices}/100，建议改进`,
      element: null,
      url,
      status: 'open',
    });
  }

  // SEO issues
  if (scores.seo < 50) {
    issues.push({
      project_id: projectId,
      page_id: pageId ?? null,
      rule_id: 'lighthouse-seo-critical',
      severity: 'critical',
      category: 'SEO',
      message: `Lighthouse SEO 评分为 ${scores.seo}/100，存在严重 SEO 问题`,
      element: null,
      url,
      status: 'open',
    });
  } else if (scores.seo < 80) {
    issues.push({
      project_id: projectId,
      page_id: pageId ?? null,
      rule_id: 'lighthouse-seo-warning',
      severity: 'high',
      category: 'SEO',
      message: `Lighthouse SEO 评分为 ${scores.seo}/100，建议优化以提高搜索引擎友好度`,
      element: null,
      url,
      status: 'open',
    });
  }

  // Core Web Vitals thresholds
  if (metrics.lcp !== null && metrics.lcp > 2500) {
    issues.push({
      project_id: projectId,
      page_id: pageId ?? null,
      rule_id: 'lighthouse-lcp-poor',
      severity: 'high',
      category: 'Performance',
      message: `LCP (Largest Contentful Paint) 为 ${metrics.lcp}ms，超过 2500ms，需要优化`,
      element: null,
      url,
      status: 'open',
    });
  }

  if (metrics.cls !== null && metrics.cls > 0.1) {
    issues.push({
      project_id: projectId,
      page_id: pageId ?? null,
      rule_id: 'lighthouse-cls-poor',
      severity: 'high',
      category: 'Performance',
      message: `CLS (Cumulative Layout Shift) 为 ${metrics.cls}，超过 0.1 阈值，存在布局偏移问题`,
      element: null,
      url,
      status: 'open',
    });
  }

  if (metrics.tbt !== null && metrics.tbt > 200) {
    issues.push({
      project_id: projectId,
      page_id: pageId ?? null,
      rule_id: 'lighthouse-tbt-poor',
      severity: 'medium',
      category: 'Performance',
      message: `TBT (Total Blocking Time) 为 ${metrics.tbt}ms，超过 200ms，主线程阻塞时间过长`,
      element: null,
      url,
      status: 'open',
    });
  }

  return issues;
}

export default { runLighthouseAudit, runLighthouseBatch };