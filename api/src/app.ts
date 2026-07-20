import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import projectRouter from './modules/project/router.js';
import crawlRouter from './modules/crawl/router.js';
import keywordsRouter from './modules/keywords/router.js';
import rankingsRouter from './modules/rankings/router.js';
import backlinksRouter from './modules/backlinks/router.js';
import semRouter from './modules/sem/router.js';
import geoRouter from './modules/geo/router.js';
import asoRouter from './modules/aso/router.js';
import youtubeRouter from './modules/youtube/router.js';
import aiRouter from './modules/ai/router.js';
import competitorRouter from './modules/competitor/router.js';
import reportRouter from './modules/report/router.js';
import tasksRouter from './modules/tasks/router.js';

// New modules
import authRouter from './modules/auth/router.js';
import alertingRouter from './modules/alerting/router.js';
import monitorRouter from './modules/monitor/router.js';
import scheduleRouter from './modules/schedule/router.js';
import whitelabelRouter from './modules/whitelabel/router.js';
import roiRouter from './modules/roi/router.js';
import notificationsRouter from './modules/notifications/router.js';
import serpFeaturesRouter from './modules/serp-features/router.js';
import sitemapRouter from './modules/sitemap/router.js';
import contentRouter from './modules/content/router.js';
import domainHealthRouter from './modules/domain-health/router.js';
import competitorChangeRouter from './modules/competitor-change/router.js';
import apiUsageRouter from './modules/api-usage/router.js';
import bulkAnalysisRouter from './modules/bulk-analysis/router.js';

// New modules (trends & pagespeed)
import trendsRouter from './modules/trends/router.js';
import pagespeedRouter from './modules/pagespeed/router.js';

// New SEO modules
import domainOverviewRouter from './modules/domain-overview/router.js';
import keywordGapRouter from './modules/keyword-gap/router.js';
import topPagesRouter from './modules/top-pages/router.js';

// ---------------------------------------------------------------------------
// Swagger / OpenAPI spec
// ---------------------------------------------------------------------------

const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Crane SEO Platform API',
    version: '1.0.0',
    description: 'REST API for the Crane SEO Platform - comprehensive SEO management for the crane industry',
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
      },
    },
  },
  security: [
    { bearerAuth: [] },
    { apiKey: [] },
  ],
  paths: {},
};

// ---------------------------------------------------------------------------
// App factory
// ---------------------------------------------------------------------------

export function createApp(): Application {
  const app = express();

  // --- Security headers ---
  app.use(helmet());

  // --- CORS ---
  app.use(cors({
    origin: process.env['CORS_ORIGIN'] ?? '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: true,
  }));

  // --- Request logging ---
  app.use(morgan(process.env['NODE_ENV'] === 'production' ? 'combined' : 'dev'));

  // --- Body parsing ---
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // --- Swagger UI ---
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api-docs.json', (_req: Request, res: Response) => {
    res.json(swaggerSpec);
  });

  // --- Health check ---
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // --- API v1 routes ---

  // Auth (no auth middleware required for login/register)
  app.use('/api/v1', authRouter);

  // Existing routes
  app.use('/api/v1/projects', projectRouter);
  app.use('/api/v1', crawlRouter);
  app.use('/api/v1', keywordsRouter);
  app.use('/api/v1', rankingsRouter);
  app.use('/api/v1', backlinksRouter);
  app.use('/api/v1', semRouter);
  app.use('/api/v1', geoRouter);
  app.use('/api/v1', asoRouter);
  app.use('/api/v1', youtubeRouter);
  app.use('/api/v1', aiRouter);
  app.use('/api/v1', competitorRouter);
  app.use('/api/v1', reportRouter);
  app.use('/api/v1', scheduleRouter);        // frontend: /v1/schedule/*
  app.use('/api/v1', alertingRouter);        // frontend: /v1/alerting/*
  app.use('/api/v1', monitorRouter);         // frontend: /v1/monitor/*
  app.use('/api/v1', whitelabelRouter);      // frontend: /v1/whitelabel/*
  app.use('/api/v1', roiRouter);             // frontend: /v1/roi/*
  app.use('/api/v1', notificationsRouter);   // frontend: /v1/notifications/*
  app.use('/api/v1', serpFeaturesRouter);
  app.use('/api/v1', sitemapRouter);
  app.use('/api/v1', contentRouter);         // frontend: /v1/content/*
  app.use('/api/v1', domainHealthRouter);    // frontend: /v1/domain-health/*
  app.use('/api/v1', competitorChangeRouter); // frontend: /v1/competitor-changes/*
  app.use('/api/v1', apiUsageRouter);        // frontend: /v1/api-usage/*
  app.use('/api/v1', bulkAnalysisRouter);    // frontend: /v1/bulk-analysis/*
  app.use('/api/v1', tasksRouter);

  // Trends & PageSpeed
  app.use('/api/v1', trendsRouter);          // frontend: /v1/trends/*
  app.use('/api/v1', pagespeedRouter);       // frontend: /v1/pagespeed/*

  // New SEO modules
  app.use('/api/v1', domainOverviewRouter);
  app.use('/api/v1', keywordGapRouter);
  app.use('/api/v1', topPagesRouter);

  // --- 404 handler ---
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${_req.method} ${_req.originalUrl} not found`,
      },
    });
  });

  // --- Global error handler ---
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[App] Unhandled error:', err);

    const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
    const message = process.env['NODE_ENV'] === 'production'
      ? 'Internal server error'
      : err.message;

    res.status(statusCode).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message,
        ...(process.env['NODE_ENV'] !== 'production' && { stack: err.stack }),
      },
    });
  });

  return app;
}

export default createApp;