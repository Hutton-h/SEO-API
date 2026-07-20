import { db } from '../../shared/database.js';
import { backlinkRefreshQueue } from '../../shared/queue.js';
import { v4 as uuidv4 } from 'uuid';
import dataforseo from '../../services/dataforseo.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BacklinkRecord {
  id: string;
  project_id: string;
  source_url: string;
  target_url: string;
  anchor_text: string | null;
  domain_authority: number | null;
  page_authority: number | null;
  link_type: string;
  is_dofollow: boolean;
  first_seen: string | null;
  last_seen: string | null;
  created_at: string;
}

export interface BacklinkListParams {
  projectId: string;
  page: number;
  pageSize: number;
  isDofollow?: boolean;
  search?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
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

export interface ReferringDomainResult {
  items: Array<{
    domain: string;
    backlinks: number;
    firstSeen: string;
    lastSeen: string;
    domainAuthority?: number;
    isDofollow: boolean;
  }>;
  total: number;
}

export interface AnchorTextResult {
  anchors: Array<{
    text: string;
    count: number;
    percentage: number;
  }>;
  total: number;
  brandedCount: number;
  brandedPercentage: number;
}

export interface LinkGapResult {
  projectDomain: string;
  competitors: string[];
  missingSources: Array<{
    domain: string;
    domainAuthority?: number;
    backlinks: number;
    competitorsUsing: string[];
    opportunity: 'high' | 'medium' | 'low';
  }>;
  totalMissing: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function getBacklinks(
  params: BacklinkListParams,
): Promise<PaginatedResult<BacklinkRecord>> {
  try {
    const { projectId, page, pageSize, isDofollow, search } = params;

    let query = db('backlinks')
      .where('project_id', projectId);

    if (isDofollow !== undefined) {
      query = query.where('is_dofollow', isDofollow);
    }

    if (search) {
      query = query.where(function () {
        this.where('source_url', 'ilike', `%${search}%`)
          .orWhere('target_url', 'ilike', `%${search}%`)
          .orWhere('anchor_text', 'ilike', `%${search}%`);
      });
    }

    const [{ count }] = await query.clone().count<{ count: string }[]>();
    const total = parseInt(count, 10);

    const items = await query
      .orderBy('domain_authority', 'desc')
      .orderBy('created_at', 'desc')
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    return { items: items as BacklinkRecord[], total };
  } catch {
    // Table doesn't exist or other DB error - return empty
    return { items: [], total: 0 };
  }
}

export async function refreshBacklinks(
  projectId: string,
): Promise<TaskRecord> {
  try {
    const taskId = uuidv4();

    const [taskRecord] = await db('tasks')
      .insert({
        id: taskId,
        project_id: projectId,
        type: 'backlink-refresh',
        status: 'pending',
        progress: 0,
        result: '{}',
      })
      .returning('*');

    try {
      await backlinkRefreshQueue.add(
        'refresh-backlinks',
        { taskId, projectId },
        { jobId: taskId },
      );
    } catch {
      // Queue may not be available, task is still created
      console.warn(`[Backlinks] Failed to queue backlink refresh for project ${projectId}`);
    }

    return taskRecord as TaskRecord;
  } catch {
    // Table doesn't exist - return a virtual task record
    return {
      id: uuidv4(),
      project_id: projectId,
      type: 'backlink-refresh',
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

export async function getReferringDomains(
  projectId: string,
  params?: { page?: number; pageSize?: number; sort?: string },
): Promise<ReferringDomainResult> {
  try {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const sort = params?.sort ?? 'backlinks';

    // Extract domain from source_url
    const baseQuery = db('backlinks')
      .where('project_id', projectId)
      .whereNotNull('source_url');

    // Get referring domains grouped by extracted domain
    const rows = await db('backlinks')
      .where('project_id', projectId)
      .whereNotNull('source_url')
      .select(
        'source_url',
        'domain_authority',
        'is_dofollow',
        'first_seen',
        'last_seen',
      );

    // Group by domain extracted from source_url
    const domainMap = new Map<string, {
      domain: string;
      backlinks: number;
      firstSeen: string;
      lastSeen: string;
      domainAuthority: number | null;
      isDofollow: boolean;
    }>();

    for (const row of rows) {
      const record = row as {
        source_url: string;
        domain_authority: number | null;
        is_dofollow: boolean;
        first_seen: string | null;
        last_seen: string | null;
      };

      try {
        const url = new URL(record.source_url);
        const domain = url.hostname;

        if (domainMap.has(domain)) {
          const existing = domainMap.get(domain)!;
          existing.backlinks++;
          if (record.first_seen && (!existing.firstSeen || record.first_seen < existing.firstSeen)) {
            existing.firstSeen = record.first_seen;
          }
          if (record.last_seen && (!existing.lastSeen || record.last_seen > existing.lastSeen)) {
            existing.lastSeen = record.last_seen;
          }
          if (record.domain_authority !== null && (existing.domainAuthority === null || record.domain_authority > existing.domainAuthority)) {
            existing.domainAuthority = record.domain_authority;
          }
          if (!record.is_dofollow) {
            existing.isDofollow = false;
          }
        } else {
          domainMap.set(domain, {
            domain,
            backlinks: 1,
            firstSeen: record.first_seen ?? new Date().toISOString(),
            lastSeen: record.last_seen ?? new Date().toISOString(),
            domainAuthority: record.domain_authority,
            isDofollow: record.is_dofollow,
          });
        }
      } catch {
        // Skip invalid URLs
      }
    }

    let items = Array.from(domainMap.values());

    // Sort
    if (sort === 'backlinks') {
      items.sort((a, b) => b.backlinks - a.backlinks);
    } else if (sort === 'domainAuthority') {
      items.sort((a, b) => (b.domainAuthority ?? 0) - (a.domainAuthority ?? 0));
    } else if (sort === 'firstSeen') {
      items.sort((a, b) => new Date(b.firstSeen).getTime() - new Date(a.firstSeen).getTime());
    }

    const total = items.length;
    const offset = (page - 1) * pageSize;
    items = items.slice(offset, offset + pageSize);

    return {
      items: items.map((item) => ({
        ...item,
        domainAuthority: item.domainAuthority ?? undefined,
      })),
      total,
    };
  } catch {
    return { items: [], total: 0 };
  }
}

export async function getAnchorText(
  projectId: string,
): Promise<AnchorTextResult> {
  try {
    const rows = await db('backlinks')
      .where('project_id', projectId)
      .whereNotNull('anchor_text')
      .select('anchor_text');

    const anchorMap = new Map<string, number>();
    let total = 0;

    for (const row of rows) {
      const record = row as { anchor_text: string };
      const text = record.anchor_text.trim();
      if (!text) continue;

      total++;
      anchorMap.set(text, (anchorMap.get(text) ?? 0) + 1);
    }

    const anchors = Array.from(anchorMap.entries())
      .map(([text, count]) => ({
        text,
        count,
        percentage: total > 0 ? Math.round((count / total) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Determine branded anchors (containing the project domain name)
    let brandedCount = 0;
    try {
      const project = await db('projects').where('id', projectId).first();
      const domain = (project as { domain?: string } | null)?.domain ?? '';

      for (const anchor of anchors) {
        const lowerText = anchor.text.toLowerCase();
        const lowerDomain = domain.toLowerCase();
        if (lowerText.includes(lowerDomain) || lowerText.includes(domain.replace(/^www\./, ''))) {
          brandedCount += anchor.count;
        }
      }
    } catch {
      // Ignore - can't determine branded anchors
    }

    const brandedPercentage = total > 0
      ? Math.round((brandedCount / total) * 10000) / 100
      : 0;

    return {
      anchors,
      total,
      brandedCount,
      brandedPercentage,
    };
  } catch {
    return {
      anchors: [],
      total: 0,
      brandedCount: 0,
      brandedPercentage: 0,
    };
  }
}

export async function getNewBacklinks(
  projectId: string,
): Promise<BacklinkRecord[]> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const items = await db('backlinks')
      .where('project_id', projectId)
      .where('first_seen', '>=', thirtyDaysAgo.toISOString())
      .orderBy('first_seen', 'desc')
      .limit(100);

    return items as BacklinkRecord[];
  } catch {
    return [];
  }
}

export async function getLostBacklinks(
  projectId: string,
): Promise<BacklinkRecord[]> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const items = await db('backlinks')
      .where('project_id', projectId)
      .where(function () {
        this.where('last_seen', '<', thirtyDaysAgo.toISOString())
          .orWhere('status', 'lost');
      })
      .orderBy('last_seen', 'desc')
      .limit(100);

    return items as BacklinkRecord[];
  } catch {
    return [];
  }
}

export async function getLinkGap(
  projectId: string,
  competitorDomains: string[],
): Promise<LinkGapResult> {
  try {
    // Get project domain
    const project = await db('projects').where('id', projectId).first();
    const projectDomain = (project as { domain?: string } | null)?.domain ?? '';

    // Get project's existing referring domains
    const projectBacklinkRows = await db('backlinks')
      .where('project_id', projectId)
      .whereNotNull('source_url')
      .select('source_url');

    const projectDomains = new Set<string>();
    for (const row of projectBacklinkRows) {
      try {
        const url = new URL((row as { source_url: string }).source_url);
        projectDomains.add(url.hostname);
      } catch {
        // Skip invalid URLs
      }
    }

    // For each competitor, get their backlinks and find domains the project doesn't have
    const competitorDomainSet = new Map<string, Set<string>>();

    for (const competitor of competitorDomains) {
      try {
        const result = await dataforseo.getBacklinks(competitor);

        if (result.success && result.data) {
          // For each competitor, we also try to get the actual backlinks list
          const backlinksResult = await dataforseo.getBacklinksList(competitor, 100, 0);

          const domains = new Set<string>();
          if (backlinksResult.success && Array.isArray(backlinksResult.data)) {
            for (const item of backlinksResult.data) {
              const blItem = item as { domain_from?: string };
              if (blItem.domain_from) {
                domains.add(blItem.domain_from);
              }
            }
          }
          competitorDomainSet.set(competitor, domains);
        }
      } catch {
        competitorDomainSet.set(competitor, new Set<string>());
      }
    }

    // Find missing sources (domains competitors have but project doesn't)
    const missingMap = new Map<string, {
      domain: string;
      domainAuthority?: number;
      backlinks: number;
      competitorsUsing: string[];
      opportunity: 'high' | 'medium' | 'low';
    }>();

    for (const [competitor, domains] of competitorDomainSet) {
      for (const domain of domains) {
        if (!projectDomains.has(domain)) {
          if (missingMap.has(domain)) {
            const existing = missingMap.get(domain)!;
            existing.competitorsUsing.push(competitor);
            existing.backlinks++;
            // Upgrade opportunity if more competitors are using it
            if (existing.competitorsUsing.length >= 3) {
              existing.opportunity = 'high';
            } else if (existing.competitorsUsing.length >= 2) {
              existing.opportunity = 'medium';
            }
          } else {
            missingMap.set(domain, {
              domain,
              domainAuthority: undefined,
              backlinks: 1,
              competitorsUsing: [competitor],
              opportunity: 'low',
            });
          }
        }
      }
    }

    const missingSources = Array.from(missingMap.values())
      .sort((a, b) => b.competitorsUsing.length - a.competitorsUsing.length);

    return {
      projectDomain,
      competitors: competitorDomains,
      missingSources,
      totalMissing: missingSources.length,
    };
  } catch {
    return {
      projectDomain: '',
      competitors: competitorDomains,
      missingSources: [],
      totalMissing: 0,
    };
  }
}

export default {
  getBacklinks,
  refreshBacklinks,
  getReferringDomains,
  getAnchorText,
  getNewBacklinks,
  getLostBacklinks,
  getLinkGap,
};