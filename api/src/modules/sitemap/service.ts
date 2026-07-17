import { db } from '../../shared/database.js';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SitemapEntry {
  url: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  images?: Array<{ loc: string; caption?: string; title?: string }>;
  videos?: Array<{ title: string; description: string; thumbnail_loc: string; content_loc: string }>;
}

export interface SitemapGenerationResult {
  id: string;
  projectId: string;
  urlCount: number;
  sitemapXml: string;
  sizeBytes: number;
  generatedAt: string;
}

export interface SitemapValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  urlCount: number;
  schemaVersion: string;
}

// ---------------------------------------------------------------------------
// Generate Sitemap
// ---------------------------------------------------------------------------

export async function generateSitemap(
  projectId: string,
  options: {
    includeImages?: boolean;
    includeVideos?: boolean;
    baseUrl?: string;
  } = {},
): Promise<SitemapGenerationResult> {
  const project = await db('projects').where('id', projectId).first();
  if (!project) {
    throw new Error('Project not found');
  }

  const domain = (project as { domain: string }).domain;
  const baseUrl = options.baseUrl ?? `https://${domain}`;

  // Get all pages from crawl_pages
  const pages = await db('crawl_pages')
    .where('project_id', projectId)
    .where('status_code', 200)
    .select('url', 'title', 'crawled_at')
    .orderBy('crawled_at', 'desc')
    .limit(5000);

  const entries: SitemapEntry[] = (pages as Array<{
    url: string;
    title: string;
    crawled_at: string;
  }>).map((page) => {
    const entry: SitemapEntry = {
      url: page.url.startsWith('http') ? page.url : `${baseUrl}${page.url.startsWith('/') ? '' : '/'}${page.url}`,
      lastmod: page.crawled_at ? new Date(page.crawled_at).toISOString().split('T')[0] : undefined,
      changefreq: 'weekly',
      priority: 0.5,
    };

    return entry;
  });

  // Try to generate XML using the sitemap npm package
  let sitemapXml = '';
  try {
    const SitemapStream = (await import('sitemap')).SitemapStream;
    const { streamToPromise } = await import('sitemap');
    const { createGzip } = await import('zlib');

    const smStream = new SitemapStream({ hostname: baseUrl });

    for (const entry of entries) {
      smStream.write({
        url: entry.url,
        lastmod: entry.lastmod,
        changefreq: entry.changefreq,
        priority: entry.priority,
        img: entry.images,
        video: entry.videos,
      });
    }

    smStream.end();

    const sitemapBuffer = await streamToPromise(smStream);
    sitemapXml = sitemapBuffer.toString();
  } catch {
    // Fallback: manually generate XML
    sitemapXml = generateXMLSitemap(baseUrl, entries);
  }

  const id = uuidv4();
  const sizeBytes = Buffer.byteLength(sitemapXml, 'utf8');

  // Store the generated sitemap
  await db('sitemaps').insert({
    id,
    project_id: projectId,
    url_count: entries.length,
    sitemap_xml: sitemapXml,
    size_bytes: sizeBytes,
  });

  return {
    id,
    projectId,
    urlCount: entries.length,
    sitemapXml,
    sizeBytes,
    generatedAt: new Date().toISOString(),
  };
}

export async function getSitemap(projectId: string): Promise<SitemapGenerationResult | null> {
  const sitemap = await db('sitemaps')
    .where('project_id', projectId)
    .orderBy('created_at', 'desc')
    .first();

  if (!sitemap) return null;

  const s = sitemap as Record<string, unknown>;
  return {
    id: s['id'] as string,
    projectId,
    urlCount: s['url_count'] as number,
    sitemapXml: s['sitemap_xml'] as string,
    sizeBytes: s['size_bytes'] as number,
    generatedAt: s['created_at'] as string,
  };
}

export async function validateSitemap(
  projectId: string,
  sitemapXml?: string,
): Promise<SitemapValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  let xml = sitemapXml;
  if (!xml) {
    const existing = await getSitemap(projectId);
    if (!existing) {
      return {
        isValid: false,
        errors: ['No sitemap found for this project'],
        warnings: [],
        urlCount: 0,
        schemaVersion: '1.0',
      };
    }
    xml = existing.sitemapXml;
  }

  // Validate XML structure
  if (!xml.includes('<?xml')) {
    errors.push('Missing XML declaration');
  }

  if (!xml.includes('<urlset')) {
    errors.push('Missing <urlset> root element');
  }

  if (!xml.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')) {
    warnings.push('Missing or incorrect sitemap namespace');
  }

  // Count URLs
  const urlMatches = xml.match(/<url>/g);
  const urlCount = urlMatches ? urlMatches.length : 0;

  // Check URL count limits
  if (urlCount > 50000) {
    errors.push(`Sitemap exceeds 50,000 URL limit (${urlCount} URLs)`);
  }

  if (urlCount === 0) {
    warnings.push('Sitemap contains no URLs');
  }

  // Check for invalid URLs
  const urlRegex = /<loc>(.*?)<\/loc>/g;
  let match;
  const urls: string[] = [];
  while ((match = urlRegex.exec(xml)) !== null) {
    urls.push(match[1]);
    try {
      new URL(match[1]);
    } catch {
      errors.push(`Invalid URL found: ${match[1]}`);
    }
  }

  // Check for duplicate URLs
  const uniqueUrls = new Set(urls);
  if (uniqueUrls.size < urls.length) {
    warnings.push(`Found ${urls.length - uniqueUrls.size} duplicate URLs`);
  }

  // Check size
  const sizeBytes = Buffer.byteLength(xml, 'utf8');
  if (sizeBytes > 50 * 1024 * 1024) {
    errors.push(`Sitemap exceeds 50MB size limit (${(sizeBytes / (1024 * 1024)).toFixed(2)}MB)`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    urlCount,
    schemaVersion: '1.0',
  };
}

// ---------------------------------------------------------------------------
// Manual XML Generation (fallback)
// ---------------------------------------------------------------------------

function generateXMLSitemap(baseUrl: string, entries: SitemapEntry[]): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"\n';
  xml += '        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n';

  for (const entry of entries) {
    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(entry.url)}</loc>\n`;
    if (entry.lastmod) {
      xml += `    <lastmod>${entry.lastmod}</lastmod>\n`;
    }
    if (entry.changefreq) {
      xml += `    <changefreq>${entry.changefreq}</changefreq>\n`;
    }
    if (entry.priority !== undefined) {
      xml += `    <priority>${entry.priority.toFixed(1)}</priority>\n`;
    }
    xml += '  </url>\n';
  }

  xml += '</urlset>';
  return xml;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default {
  generateSitemap,
  getSitemap,
  validateSitemap,
};