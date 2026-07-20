import { db } from '../../shared/database.js';
import { whois } from '../../services/whois.js';
import { pagespeed } from '../../services/pagespeed.js';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DomainHealthReport {
  projectId: string;
  domain: string;
  overallScore: number;
  whois: {
    domainAge: number;
    expiresInDays: number;
    sslValid: boolean;
    sslExpiresInDays: number | null;
    registrar: string;
    nameServers: string[];
  };
  performance: {
    performanceScore: number;
    accessibilityScore: number;
    bestPracticesScore: number;
    seoScore: number;
    lcp: number;
    fcp: number;
    tbt: number;
    cls: number;
    si: number;
  };
  categories: {
    domain: { score: number; issues: string[] };
    ssl: { score: number; issues: string[] };
    performance: { score: number; issues: string[] };
    seo: { score: number; issues: string[] };
    accessibility: { score: number; issues: string[] };
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function getDomainHealth(projectId: string): Promise<DomainHealthReport> {
  let project: Record<string, unknown> | null = null;
  try {
    project = await db('projects').where('id', projectId).first() as Record<string, unknown> | null;
  } catch {
    // Table doesn't exist
  }

  if (!project) {
    // Return empty/default report instead of throwing
    return makeEmptyReport(projectId, 'unknown');
  }

  const domain = (project as { domain: string }).domain;

  // WHOIS info
  let whoisInfo = {
    domainAge: 0,
    expiresInDays: 0,
    sslValid: false,
    sslExpiresInDays: null as number | null,
    registrar: 'Unknown',
    nameServers: [] as string[],
  };

  try {
    const whoisResult = await whois.getDomainInfo(domain);
    if (whoisResult.success && whoisResult.data) {
      const info = whoisResult.data;
      const expiresDate = new Date(info.expiresDate);
      const now = new Date();
      const expiresInDays = Math.floor((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      whoisInfo = {
        domainAge: info.domainAge,
        expiresInDays: expiresInDays > 0 ? expiresInDays : 0,
        sslValid: false,
        sslExpiresInDays: null,
        registrar: info.registrar,
        nameServers: info.nameServers,
      };
    }
  } catch {
    // WHOIS lookup failed, use defaults
  }

  // Check SSL certificate validity
  try {
    const { default: https } = await import('https');
    const sslInfo = await checkSSLValidity(domain);
    whoisInfo.sslValid = sslInfo.valid;
    whoisInfo.sslExpiresInDays = sslInfo.expiresInDays;
  } catch {
    whoisInfo.sslValid = false;
  }

  // PageSpeed Insights
  let perfScore = 0;
  let accessibilityScore = 0;
  let bestPracticesScore = 0;
  let seoScore = 0;
  let lcp = 0, fcp = 0, tbt = 0, cls = 0, si = 0;

  try {
    const psiResult = await pagespeed.analyze(`https://${domain}`, 'mobile');
    if (psiResult.success && psiResult.data) {
      perfScore = psiResult.data.scores.performance;
      accessibilityScore = psiResult.data.scores.accessibility;
      bestPracticesScore = psiResult.data.scores.bestPractices;
      seoScore = psiResult.data.scores.seo;
      lcp = psiResult.data.labData?.lcp ?? 0;
      fcp = psiResult.data.labData?.fcp ?? 0;
      tbt = psiResult.data.labData?.tbt ?? 0;
      cls = psiResult.data.labData?.cls ?? 0;
      si = psiResult.data.labData?.si ?? 0;
    }
  } catch {
    // PSI failed, use defaults
  }

  // Calculate category scores
  const domainScore = calculateDomainScore(whoisInfo.domainAge, whoisInfo.expiresInDays);
  const sslScore = calculateSSLScore(whoisInfo.sslValid, whoisInfo.sslExpiresInDays);
  const perfCategoryScore = perfScore;
  const seoCategoryScore = seoScore;
  const accessibilityCategoryScore = accessibilityScore;

  // Overall health score
  const overallScore = Math.round(
    (domainScore * 0.15) + (sslScore * 0.15) + (perfScore * 0.35) + (seoScore * 0.2) + (accessibilityScore * 0.15),
  );

  // Category issues
  const domainIssues: string[] = [];
  if (whoisInfo.domainAge < 365) domainIssues.push('Domain is less than 1 year old');
  if (whoisInfo.expiresInDays < 30) domainIssues.push('Domain expires in less than 30 days');
  if (whoisInfo.expiresInDays <= 0 && whoisInfo.expiresInDays !== 0) domainIssues.push('Domain has expired');

  const sslIssues: string[] = [];
  if (!whoisInfo.sslValid) sslIssues.push('SSL certificate is invalid or not found');
  if (whoisInfo.sslExpiresInDays !== null && whoisInfo.sslExpiresInDays < 30 && whoisInfo.sslExpiresInDays > 0) {
    sslIssues.push(`SSL certificate expires in ${whoisInfo.sslExpiresInDays} days`);
  }

  const perfIssues: string[] = [];
  if (perfScore < 50) perfIssues.push('Performance score is very low');
  else if (perfScore < 75) perfIssues.push('Performance score could be improved');
  if (lcp > 2500) perfIssues.push('LCP exceeds 2.5s (poor)');
  if (cls > 0.1) perfIssues.push('CLS exceeds 0.1 (needs improvement)');

  const seoIssues: string[] = [];
  if (seoScore < 80) seoIssues.push('SEO score needs improvement');
  if (seoScore < 50) seoIssues.push('SEO score is critical');

  const accessibilityIssues: string[] = [];
  if (accessibilityScore < 70) accessibilityIssues.push('Accessibility score needs improvement');
  if (accessibilityScore < 50) accessibilityIssues.push('Accessibility score is critical');

  // Store health check result (gracefully handle missing table)
  try {
    await db('domain_health_checks').insert({
      id: uuidv4(),
      project_id: projectId,
      domain,
      overall_score: overallScore,
      domain_score: domainScore,
      ssl_score: sslScore,
      performance_score: perfScore,
      seo_score: seoScore,
      accessibility_score: accessibilityScore,
      details: JSON.stringify({
        whois: whoisInfo,
        performance: { lcp, fcp, tbt, cls, si },
      }),
    });
  } catch {
    // Table doesn't exist, skip storing
  }

  return {
    projectId,
    domain,
    overallScore,
    whois: whoisInfo,
    performance: {
      performanceScore: perfScore,
      accessibilityScore,
      bestPracticesScore,
      seoScore,
      lcp, fcp, tbt, cls, si,
    },
    categories: {
      domain: { score: domainScore, issues: domainIssues },
      ssl: { score: sslScore, issues: sslIssues },
      performance: { score: perfCategoryScore, issues: perfIssues },
      seo: { score: seoCategoryScore, issues: seoIssues },
      accessibility: { score: accessibilityCategoryScore, issues: accessibilityIssues },
    },
  };
}

function makeEmptyReport(projectId: string, domain: string): DomainHealthReport {
  return {
    projectId,
    domain,
    overallScore: 0,
    whois: { domainAge: 0, expiresInDays: 0, sslValid: false, sslExpiresInDays: null, registrar: 'Unknown', nameServers: [] },
    performance: { performanceScore: 0, accessibilityScore: 0, bestPracticesScore: 0, seoScore: 0, lcp: 0, fcp: 0, tbt: 0, cls: 0, si: 0 },
    categories: {
      domain: { score: 0, issues: [] },
      ssl: { score: 0, issues: [] },
      performance: { score: 0, issues: [] },
      seo: { score: 0, issues: [] },
      accessibility: { score: 0, issues: [] },
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calculateDomainScore(ageInDays: number, expiresInDays: number): number {
  let score = 50;
  if (ageInDays > 365 * 3) score += 30;
  else if (ageInDays > 365) score += 15;
  if (expiresInDays > 365) score += 20;
  else if (expiresInDays > 90) score += 10;
  return Math.min(100, Math.max(0, score));
}

function calculateSSLScore(valid: boolean, expiresInDays: number | null): number {
  if (!valid) return 0;
  let score = 60;
  if (expiresInDays !== null) {
    if (expiresInDays > 365) score += 40;
    else if (expiresInDays > 90) score += 30;
    else if (expiresInDays > 30) score += 15;
    else score += 5;
  }
  return Math.min(100, score);
}

async function checkSSLValidity(domain: string): Promise<{ valid: boolean; expiresInDays: number | null }> {
  return new Promise((resolve) => {
    const { default: https } = require('https');
    const req = https.get(
      `https://${domain}`,
      { timeout: 10000, servername: domain },
      (res: import('http').IncomingMessage & { socket: { getPeerCertificate: (detailed?: boolean) => { valid_to?: string } } }) => {
        const cert = (res.socket as { getPeerCertificate: (detailed?: boolean) => { valid_to?: string } }).getPeerCertificate(true);
        if (cert && cert.valid_to) {
          const expiresDate = new Date(cert.valid_to);
          const now = new Date();
          const expiresInDays = Math.floor((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          resolve({ valid: expiresInDays > 0, expiresInDays });
        } else {
          resolve({ valid: false, expiresInDays: null });
        }
      },
    );
    req.on('error', () => resolve({ valid: false, expiresInDays: null }));
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({ valid: false, expiresInDays: null });
    });
  });
}

export default {
  getDomainHealth,
};