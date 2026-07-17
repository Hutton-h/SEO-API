import { PlaywrightCrawler, type PlaywrightCrawlingContext } from 'crawlee';
import { savePage, saveIssues, type CrawlPageData, type CrawlIssueData } from './db.js';
import { runRules, checkMultipleH1, type PageData } from './rules.js';
import { runLighthouseAudit } from './lighthouse.js';
import config from './config.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CrawlOptions {
  maxConcurrency?: number;
  maxPagesPerCrawl?: number;
  respectRobotsTxt?: boolean;
  userAgent?: string;
}

export interface CrawlResult {
  pagesCrawled: number;
  pagesFailed: number;
  totalIssues: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// PlaywrightCrawler Factory
// ---------------------------------------------------------------------------

/**
 * Create and configure a PlaywrightCrawler instance.
 */
export function createCrawler(
  projectId: string,
  taskId: string,
  options: CrawlOptions = {},
): PlaywrightCrawler {
  const maxConcurrency = options.maxConcurrency ?? config.crawl.maxConcurrency;
  const userAgent = options.userAgent ?? config.crawl.userAgent;
  const respectRobotsTxt = options.respectRobotsTxt ?? config.crawl.respectRobotsTxt;

  const pagesCrawled: string[] = [];
  const pagesFailed: string[] = [];
  const allIssues: CrawlIssueData[] = [];

  const crawler = new PlaywrightCrawler({
    maxConcurrency,
    maxRequestRetries: 2,
    requestHandlerTimeoutSecs: 60,
    requestHandler: createRequestHandler(projectId, pagesCrawled, pagesFailed, allIssues),
    preNavigationHooks: [
      async ({ page }: PlaywrightCrawlingContext) => {
        // Set a reasonable viewport for mobile detection
        await page.setViewportSize({ width: 1280, height: 720 });
      },
    ],
    launchContext: {
      launchOptions: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      },
      userAgent,
    },
    // Respect robots.txt by default
    ...(respectRobotsTxt ? {} : { useSessionPool: true }),
  });

  // Store the collected data for retrieval after crawl
  (crawler as unknown as Record<string, unknown>).__crawlMeta = {
    pagesCrawled,
    pagesFailed,
    allIssues,
    projectId,
    taskId,
  };

  return crawler;
}

// ---------------------------------------------------------------------------
// Request Handler
// ---------------------------------------------------------------------------

function createRequestHandler(
  projectId: string,
  pagesCrawled: string[],
  pagesFailed: string[],
  allIssues: CrawlIssueData[],
) {
  return async ({ request, page, response, log }: PlaywrightCrawlingContext) => {
    const url = request.loadedUrl ?? request.url;
    const startTime = Date.now();

    log.info(`[Crawler] Processing: ${url}`);

    try {
      // Wait for the page to be fully loaded
      await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {
        log.warning(`[Crawler] Network idle timeout for ${url}, continuing anyway`);
      });

      const loadTimeMs = Date.now() - startTime;
      const statusCode = response?.status() ?? null;

      // -----------------------------------------------------------------------
      // Extract page data
      // -----------------------------------------------------------------------

      const pageData = await page.evaluate(() => {
        // Title
        const title = document.title || null;

        // Meta description
        const metaDescriptionEl = document.querySelector('meta[name="description"]');
        const metaDescription = metaDescriptionEl?.getAttribute('content') ?? null;

        // H1 tags
        const h1Elements = document.querySelectorAll('h1');
        const h1 = h1Elements.length > 0 ? h1Elements[0].textContent?.trim() ?? null : null;
        const h1Count = h1Elements.length;

        // H2 count
        const h2Count = document.querySelectorAll('h2').length;

        // Schema detection (JSON-LD)
        const schemaScripts = document.querySelectorAll('script[type="application/ld+json"]');
        const schemaTypes: string[] = [];
        schemaScripts.forEach((script) => {
          try {
            const data = JSON.parse(script.textContent || '{}');
            if (data['@type']) {
              const types = Array.isArray(data['@type']) ? data['@type'] : [data['@type']];
              schemaTypes.push(...types);
            }
            // Handle @graph
            if (data['@graph'] && Array.isArray(data['@graph'])) {
              for (const item of data['@graph']) {
                if (item['@type']) {
                  const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
                  schemaTypes.push(...types);
                }
              }
            }
          } catch {
            // Ignore parse errors
          }
        });

        // Microdata detection
        const microdataItems = document.querySelectorAll('[itemscope]');
        microdataItems.forEach((el) => {
          const type = el.getAttribute('itemtype');
          if (type) {
            // Extract the type name from the URL (e.g., "http://schema.org/Product" -> "Product")
            const match = type.match(/\/([^/]+)$/);
            if (match && !schemaTypes.includes(match[1])) {
              schemaTypes.push(match[1]);
            }
          }
        });

        const hasSchema = schemaTypes.length > 0;

        // Word count (approximate, from visible text)
        const bodyText = document.body.innerText || '';
        const wordCount = bodyText.trim().split(/\s+/).filter(Boolean).length;

        // Links
        const allLinks = document.querySelectorAll('a[href]');
        let internalLinksCount = 0;
        let externalLinksCount = 0;
        const currentHostname = window.location.hostname;

        allLinks.forEach((link) => {
          const href = link.getAttribute('href');
          if (!href) return;
          try {
            const linkUrl = new URL(href, window.location.origin);
            if (linkUrl.hostname === currentHostname || linkUrl.hostname === '') {
              internalLinksCount++;
            } else {
              externalLinksCount++;
            }
          } catch {
            // Relative URLs count as internal
            if (href.startsWith('/') || href.startsWith('#') || href.startsWith('.')) {
              internalLinksCount++;
            } else {
              externalLinksCount++;
            }
          }
        });

        // Images
        const images = document.querySelectorAll('img');
        const imagesCount = images.length;
        let imagesWithoutAlt = 0;
        images.forEach((img) => {
          if (!img.getAttribute('alt') || img.getAttribute('alt')?.trim() === '') {
            imagesWithoutAlt++;
          }
        });

        // Canonical URL
        const canonicalEl = document.querySelector('link[rel="canonical"]');
        const canonicalUrl = canonicalEl?.getAttribute('href') ?? null;

        // Mobile friendly (viewport meta)
        const viewportMeta = document.querySelector('meta[name="viewport"]');
        const mobileFriendly = viewportMeta !== null;

        // Content length
        const contentLength = document.documentElement.outerHTML.length;

        return {
          title,
          metaDescription,
          h1,
          h1Count,
          h2Count,
          schemaTypes,
          hasSchema,
          wordCount,
          internalLinksCount,
          externalLinksCount,
          imagesCount,
          imagesWithoutAlt,
          canonicalUrl,
          mobileFriendly,
          contentLength,
        };
      });

      // -----------------------------------------------------------------------
      // Save page data to database
      // -----------------------------------------------------------------------

      const savedPage = await savePage(projectId, {
        project_id: projectId,
        url,
        title: pageData.title,
        status_code: statusCode,
        load_time_ms: loadTimeMs,
        content_length: pageData.contentLength,
        meta_description: pageData.metaDescription,
        h1: pageData.h1,
        h2_count: pageData.h2Count,
        has_schema: pageData.hasSchema,
        schema_types: pageData.schemaTypes,
        word_count: pageData.wordCount,
        internal_links_count: pageData.internalLinksCount,
        external_links_count: pageData.externalLinksCount,
        images_count: pageData.imagesCount,
        images_without_alt: pageData.imagesWithoutAlt,
        canonical_url: pageData.canonicalUrl,
        mobile_friendly: pageData.mobileFriendly,
      });

      // -----------------------------------------------------------------------
      // Run rules engine
      // -----------------------------------------------------------------------

      const rulesInput: PageData = {
        url,
        title: pageData.title,
        metaDescription: pageData.metaDescription,
        h1: pageData.h1,
        h2Count: pageData.h2Count,
        hasSchema: pageData.hasSchema,
        schemaTypes: pageData.schemaTypes,
        wordCount: pageData.wordCount,
        internalLinksCount: pageData.internalLinksCount,
        externalLinksCount: pageData.externalLinksCount,
        imagesCount: pageData.imagesCount,
        imagesWithoutAlt: pageData.imagesWithoutAlt,
        canonicalUrl: pageData.canonicalUrl,
        mobileFriendly: pageData.mobileFriendly,
        statusCode,
        loadTimeMs,
        isHttps: url.startsWith('https://'),
        brokenInternalLinks: [],
      };

      const detectedIssues = runRules(url, rulesInput);

      // Check for multiple H1 separately
      const multipleH1Issue = checkMultipleH1(pageData.h1Count, url);
      if (multipleH1Issue) {
        detectedIssues.push(multipleH1Issue);
      }

      // Convert to CrawlIssueData format
      const pageId = savedPage.id ?? null;
      const issueRecords: CrawlIssueData[] = detectedIssues.map((issue) => ({
        project_id: projectId,
        page_id: pageId,
        rule_id: issue.rule_id,
        severity: issue.severity,
        category: issue.category,
        message: issue.message,
        element: issue.element,
        url: issue.url,
        status: 'open',
      }));

      if (issueRecords.length > 0) {
        allIssues.push(...issueRecords);
      }

      pagesCrawled.push(url);
      log.info(`[Crawler] Completed: ${url} (${loadTimeMs}ms, ${issueRecords.length} issues)`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      log.error(`[Crawler] Failed to crawl ${url}: ${errorMessage}`);
      pagesFailed.push(url);

      // Still record the page with error status
      await savePage(projectId, {
        project_id: projectId,
        url,
        title: null,
        status_code: 0,
        load_time_ms: Date.now() - startTime,
        content_length: null,
        meta_description: null,
        h1: null,
        h2_count: 0,
        has_schema: false,
        schema_types: [],
        word_count: null,
        internal_links_count: 0,
        external_links_count: 0,
        images_count: 0,
        images_without_alt: 0,
        canonical_url: null,
        mobile_friendly: null,
      }).catch(() => {
        // Ignore save errors for failed pages
      });
    }
  };
}

// ---------------------------------------------------------------------------
// Run Crawl
// ---------------------------------------------------------------------------

/**
 * Run a crawl operation for a list of URLs.
 */
export async function runCrawl(
  projectId: string,
  taskId: string,
  urls: string[],
  options: CrawlOptions = {},
): Promise<CrawlResult> {
  const crawler = createCrawler(projectId, taskId, options);

  const meta = (crawler as unknown as Record<string, unknown>).__crawlMeta as {
    pagesCrawled: string[];
    pagesFailed: string[];
    allIssues: CrawlIssueData[];
    projectId: string;
    taskId: string;
  };

  // Start the crawl
  await crawler.run(urls);

  // Save all accumulated issues to the database
  if (meta.allIssues.length > 0) {
    await saveIssues(meta.projectId, meta.allIssues);
  }

  return {
    pagesCrawled: meta.pagesCrawled.length,
    pagesFailed: meta.pagesFailed.length,
    totalIssues: meta.allIssues.length,
    errors: meta.pagesFailed.map((url) => `Failed to crawl: ${url}`),
  };
}

export default { createCrawler, runCrawl };