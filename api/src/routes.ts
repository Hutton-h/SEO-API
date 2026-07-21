// ============================================================================
// 路由注册器
// 集中管理所有模块路由注册
// ============================================================================

import type { Application } from 'express';
import { authMiddleware } from '../middleware/auth.js';

// ── 模块路由导入 ──────────────────────────────────────────────────────────────

// 各个模块路由将在后续模块中逐步迁移
// 此处仅构建基础注册框架

// 临时: 导入现有模块路由（后续逐步替换为新的模块路由）
import authRouter from '../modules/auth/router.js';
import projectRouter from '../modules/project/router.js';
import crawlRouter from '../modules/crawl/router.js';
import keywordsRouter from '../modules/keywords/router.js';
import rankingsRouter from '../modules/rankings/router.js';
import backlinksRouter from '../modules/backlinks/router.js';
import semRouter from '../modules/sem/router.js';
import geoRouter from '../modules/geo/router.js';
import asoRouter from '../modules/aso/router.js';
import youtubeRouter from '../modules/youtube/router.js';
import aiRouter from '../modules/ai/router.js';
import competitorRouter from '../modules/competitor/router.js';
import reportRouter from '../modules/report/router.js';
import scheduleRouter from '../modules/schedule/router.js';
import alertingRouter from '../modules/alerting/router.js';
import monitorRouter from '../modules/monitor/router.js';
import whitelabelRouter from '../modules/whitelabel/router.js';
import roiRouter from '../modules/roi/router.js';
import notificationsRouter from '../modules/notifications/router.js';
import serpFeaturesRouter from '../modules/serp-features/router.js';
import sitemapRouter from '../modules/sitemap/router.js';
import contentRouter from '../modules/content/router.js';
import domainHealthRouter from '../modules/domain-health/router.js';
import competitorChangeRouter from '../modules/competitor-change/router.js';
import apiUsageRouter from '../modules/api-usage/router.js';
import bulkAnalysisRouter from '../modules/bulk-analysis/router.js';
import tasksRouter from '../modules/tasks/router.js';
import trendsRouter from '../modules/trends/router.js';
import pagespeedRouter from '../modules/pagespeed/router.js';
import domainOverviewRouter from '../modules/domain-overview/router.js';
import keywordGapRouter from '../modules/keyword-gap/router.js';
import topPagesRouter from '../modules/top-pages/router.js';

export function registerRoutes(app: Application): void {
  const api = '/api/v1';

  // 无需认证
  app.use(api, authRouter);

  // 需要认证的路由
  app.use(api, authMiddleware, projectRouter);
  app.use(api, authMiddleware, crawlRouter);
  app.use(api, authMiddleware, keywordsRouter);
  app.use(api, authMiddleware, rankingsRouter);
  app.use(api, authMiddleware, backlinksRouter);
  app.use(api, authMiddleware, semRouter);
  app.use(api, authMiddleware, geoRouter);
  app.use(api, authMiddleware, asoRouter);
  app.use(api, authMiddleware, youtubeRouter);
  app.use(api, authMiddleware, aiRouter);
  app.use(api, authMiddleware, competitorRouter);
  app.use(api, authMiddleware, reportRouter);
  app.use(api, authMiddleware, scheduleRouter);
  app.use(api, authMiddleware, alertingRouter);
  app.use(api, authMiddleware, monitorRouter);
  app.use(api, authMiddleware, whitelabelRouter);
  app.use(api, authMiddleware, roiRouter);
  app.use(api, authMiddleware, notificationsRouter);
  app.use(api, authMiddleware, serpFeaturesRouter);
  app.use(api, authMiddleware, sitemapRouter);
  app.use(api, authMiddleware, contentRouter);
  app.use(api, authMiddleware, domainHealthRouter);
  app.use(api, authMiddleware, competitorChangeRouter);
  app.use(api, authMiddleware, apiUsageRouter);
  app.use(api, authMiddleware, bulkAnalysisRouter);
  app.use(api, authMiddleware, tasksRouter);
  app.use(api, authMiddleware, trendsRouter);
  app.use(api, authMiddleware, pagespeedRouter);
  app.use(api, authMiddleware, domainOverviewRouter);
  app.use(api, authMiddleware, keywordGapRouter);
  app.use(api, authMiddleware, topPagesRouter);
}